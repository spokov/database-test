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

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_DOMAIN}`
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

    // action === 'create' (default)
    const { username, password, full_name, role, client_full_name } = body

    if (!username || !password || !role) {
      return json({ error: 'Missing required fields' }, 400)
    }
    if (!USERNAME_PATTERN.test(username.trim())) {
      return json(
        { error: 'Username must be 3-40 characters: letters, digits, dot, underscore, hyphen' },
        400
      )
    }
    if (!['trainer', 'client', 'admin'].includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }
    if (callerProfile.role === 'trainer' && role === 'admin') {
      return json({ error: 'Trainers cannot create admin accounts' }, 403)
    }

    const email = usernameToEmail(username)

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
      full_name: full_name || null,
      username: username.trim(),
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
          full_name: client_full_name || full_name || username,
          owner_id: caller.id,
          user_id: newUserId,
        })
        .select()
        .single()
      if (clientError) throw clientError
      newClientId = clientRow.id
    }

    return json({ ok: true, user_id: newUserId, client_id: newClientId })
  } catch (err) {
    return json({ error: err.message || 'Unexpected error' }, 400)
  }
})
