// Supabase Edge Function: manage-account
// Creates or deletes login accounts (trainer/client) on behalf of an
// authenticated admin/trainer, using the service role key server-side only.
//
// Deploy with:
//   supabase functions deploy manage-account
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
//
// SUPABASE_URL and SUPABASE_ANON_KEY are already available automatically
// inside every Edge Function - you only need to set the service role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
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

      const isSelf = user_id === caller.id
      let allowed = callerProfile.role === 'admin' || isSelf
      if (!allowed) {
        const { data: isAncestor } = await adminClient.rpc('is_ancestor_of', {
          ancestor: caller.id,
          target: user_id,
        })
        allowed = !!isAncestor
      }
      if (!allowed) return json({ error: 'Not allowed to delete this account' }, 403)

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
      if (deleteError) throw deleteError

      return json({ ok: true })
    }

    // action === 'create' (default)
    const { email, password, full_name, role, client_full_name } = body

    if (!email || !password || !role) {
      return json({ error: 'Missing required fields' }, 400)
    }
    if (!['trainer', 'client', 'admin'].includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }
    if (callerProfile.role === 'trainer' && role === 'admin') {
      return json({ error: 'Trainers cannot create admin accounts' }, 403)
    }

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
          full_name: client_full_name || full_name || email,
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
