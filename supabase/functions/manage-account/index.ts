// Supabase Edge Function: manage-account
// Creates, deletes, and resets passwords for login accounts (trainer/client)
// on behalf of an authenticated admin/trainer, using the service role key
// server-side only.
//
// Deploy with:
//   supabase functions deploy manage-account
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are all
// provided automatically inside every Edge Function - no `supabase secrets
// set` step is needed (the CLI will actually refuse env names starting with
// SUPABASE_, since those three are reserved/auto-injected).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYNTHETIC_DOMAIN = 'clientdb.local'
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,40}$/

const CYRILLIC_TO_LATIN = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht',
  ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
}

function transliterate(text) {
  return (text || '')
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9.-]/g, '')
}

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_DOMAIN}`
}

// Builds "first.last" from the client's name and appends a number if that
// exact username is already taken, e.g. "ivan.petrov", "ivan.petrov2", ...
async function generateUniqueUsername(adminClient, firstName, lastName) {
  const first = transliterate(firstName)
  const last = transliterate(lastName)
  const base = [first, last].filter(Boolean).join('.') || 'client'

  let candidate = base
  for (let suffix = 2; suffix <= 50; suffix++) {
    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('username', candidate)
      .maybeSingle()
    if (!existing) return candidate
    candidate = `${base}${suffix}`
  }
  throw new Error('Could not generate a unique username')
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Is `caller` allowed to manage `targetUserId` (any of: is caller themself,
// caller is admin, or caller created targetUserId directly/transitively)?
async function canManage(adminClient, callerRole, callerId, targetUserId) {
  if (callerRole === 'admin' || targetUserId === callerId) return true
  const { data: isAncestor } = await adminClient.rpc('is_ancestor_of', {
    ancestor: callerId,
    target: targetUserId,
  })
  return !!isAncestor
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('Authorization') || ''

    // Client scoped to the CALLER's own JWT - used only to verify identity/role.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: authError,
    } = await callerClient.auth.getUser()

    if (authError || !caller) return json({ error: 'Not authenticated' }, 401)

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['admin', 'trainer'].includes(callerProfile.role)) {
      return json({ error: 'Not allowed' }, 403)
    }

    // Privileged client - only ever used server-side, never sent to the browser.
    const adminClient = createClient(supabaseUrl, serviceKey)

    const body = await req.json()

    if (body.action === 'delete') {
      const { user_id } = body
      if (!user_id) return json({ error: 'Missing user_id' }, 400)

      const allowed = await canManage(adminClient, callerProfile.role, caller.id, user_id)
      if (!allowed) return json({ error: 'Not allowed to delete this account' }, 403)

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
      if (deleteError) throw deleteError

      return json({ ok: true })
    }

    if (body.action === 'reset_password') {
      const { user_id, new_password } = body
      if (!user_id || !new_password) return json({ error: 'Missing fields' }, 400)
      if (new_password.length < 6) {
        return json({ error: 'Password must be at least 6 characters' }, 400)
      }

      const allowed = await canManage(adminClient, callerProfile.role, caller.id, user_id)
      if (!allowed) return json({ error: 'Not allowed to change this password' }, 403)

      const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      })
      if (updateError) throw updateError

      return json({ ok: true })
    }

    if (body.action === 'change_role') {
      const { user_id, new_role } = body
      if (!user_id || !new_role) return json({ error: 'Missing fields' }, 400)
      if (!['trainer', 'client'].includes(new_role)) {
        return json({ error: 'Can only switch between trainer and client' }, 400)
      }

      const allowed = await canManage(adminClient, callerProfile.role, caller.id, user_id)
      if (!allowed) return json({ error: 'Not allowed to change this account' }, 403)

      const { data: target, error: targetError } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single()
      if (targetError) throw targetError
      if (target.role === 'admin') {
        return json({ error: 'Cannot change the role of an admin account' }, 403)
      }
      if (target.role === new_role) {
        return json({ ok: true }) // no-op
      }

      if (new_role === 'client') {
        // This account was a trainer: hand its clients over to ITS OWN
        // trainer/creator, then make sure the account itself has exactly
        // one linked client record (its own), owned by that same creator.
        const newOwner = target.created_by || caller.id

        const { error: reassignError } = await adminClient
          .from('clients')
          .update({ owner_id: newOwner })
          .eq('owner_id', user_id)
        if (reassignError) throw reassignError

        const { data: existingOwnClient } = await adminClient
          .from('clients')
          .select('id')
          .eq('user_id', user_id)
          .maybeSingle()

        if (!existingOwnClient) {
          const { error: createClientError } = await adminClient.from('clients').insert({
            full_name: target.full_name || target.username,
            owner_id: newOwner,
            user_id: user_id,
          })
          if (createClientError) throw createClientError
        }
      } else {
        // new_role === 'trainer': this account was a client - its own client
        // record (data + history) is left exactly as-is, still linked, so
        // the roster can show a "Trainer" note on it and nothing is lost.
      }

      const { error: roleError } = await adminClient
        .from('profiles')
        .update({ role: new_role })
        .eq('id', user_id)
      if (roleError) throw roleError

      return json({ ok: true })
    }

    // action === 'create' (default)
    const { username, password, full_name, role, first_name, last_name } = body

    if (!password || !role) {
      return json({ error: 'Missing required fields' }, 400)
    }
    if (!['trainer', 'client', 'admin'].includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }
    if (callerProfile.role === 'trainer' && role === 'admin') {
      return json({ error: 'Trainers cannot create admin accounts' }, 403)
    }

    let finalUsername
    let clientFullName

    if (role === 'client') {
      if (!first_name || !last_name) {
        return json({ error: 'Missing first_name/last_name' }, 400)
      }
      finalUsername = await generateUniqueUsername(adminClient, first_name, last_name)
      clientFullName = `${first_name.trim()} ${last_name.trim()}`.trim()
    } else {
      if (!username) return json({ error: 'Missing username' }, 400)
      if (!USERNAME_PATTERN.test(username.trim())) {
        return json(
          { error: 'Username must be 3-40 characters: letters, digits, dot, underscore, hyphen' },
          400
        )
      }
      finalUsername = username.trim()
    }

    const email = usernameToEmail(finalUsername)

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) throw createError

    const newUserId = created.user.id

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: newUserId,
      role,
      full_name: full_name || clientFullName || null,
      username: finalUsername,
      email,
      created_by: caller.id,
    })
    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId)
      throw profileError
    }

    let newClientId = null
    if (role === 'client') {
      const { data: clientRow, error: clientError } = await adminClient
        .from('clients')
        .insert({
          full_name: clientFullName,
          owner_id: caller.id,
          user_id: newUserId,
        })
        .select()
        .single()
      if (clientError) throw clientError
      newClientId = clientRow.id
    }

    return json({ ok: true, user_id: newUserId, client_id: newClientId, username: finalUsername })
  } catch (err) {
    return json({ error: err.message || 'Unexpected error' }, 400)
  }
})
