import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller is an administrator
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const callerId = claimsData.claims.sub;

    // Check admin role
    const { data: roleCheck } = await callerClient.rpc('has_role', { _user_id: callerId, _role: 'administrator' });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Solo los administradores pueden crear usuarios' }), { status: 403, headers: corsHeaders });
    }

    // Parse request body
    const { email, password, username, role } = await req.json();
    if (!email || !password || !username || !role) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos: email, password, username, role' }), { status: 400, headers: corsHeaders });
    }

    if (!['administrator', 'data_entry'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Rol inválido' }), { status: 400, headers: corsHeaders });
    }

    // Use service role client to create user via admin API
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
    }

    // The trigger handle_new_user_profile will create user_profiles and user_roles entries.
    // But if the role from metadata doesn't match, we ensure it here.
    // Insert into user_roles explicitly as a safety net
    const { error: roleError } = await adminClient
      .from('user_roles')
      .upsert({ user_id: newUser.user.id, role }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Error setting user role:', roleError);
    }

    return new Response(JSON.stringify({ data: newUser, error: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
