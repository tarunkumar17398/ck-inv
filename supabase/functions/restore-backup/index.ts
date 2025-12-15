import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName } = await req.json();
    
    if (!fileName) {
      throw new Error('fileName is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify JWT token and check admin role
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create client with anon key to verify the user's JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid token:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role using service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('User is not an admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting database restore from ${fileName} by admin: ${user.id}`);

    // Download backup file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('backups')
      .download(fileName);

    if (downloadError) throw downloadError;

    const backupContent = await fileData.text();
    const backupData = JSON.parse(backupContent);

    // Clear existing data (in reverse order of dependencies)
    console.log('Clearing existing data...');
    await supabaseAdmin.from('item_pieces').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('item_code_counters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('subcategories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Existing data cleared');

    // Restore data (in order of dependencies)
    if (backupData.categories?.length) {
      const { error: catError } = await supabaseAdmin.from('categories').insert(backupData.categories);
      if (catError) throw catError;
      console.log(`Restored ${backupData.categories.length} categories`);
    }

    if (backupData.subcategories?.length) {
      const { error: subcatError } = await supabaseAdmin.from('subcategories').insert(backupData.subcategories);
      if (subcatError) throw subcatError;
      console.log(`Restored ${backupData.subcategories.length} subcategories`);
    }

    if (backupData.item_code_counters?.length) {
      const { error: counterError } = await supabaseAdmin.from('item_code_counters').insert(backupData.item_code_counters);
      if (counterError) throw counterError;
      console.log(`Restored ${backupData.item_code_counters.length} counters`);
    }

    if (backupData.items?.length) {
      const { error: itemsError } = await supabaseAdmin.from('items').insert(backupData.items);
      if (itemsError) throw itemsError;
      console.log(`Restored ${backupData.items.length} items`);
    }

    if (backupData.item_pieces?.length) {
      const { error: piecesError } = await supabaseAdmin.from('item_pieces').insert(backupData.item_pieces);
      if (piecesError) throw piecesError;
      console.log(`Restored ${backupData.item_pieces.length} pieces`);
    }

    console.log(`Restore completed successfully by ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        restored: {
          items: backupData.items?.length || 0,
          categories: backupData.categories?.length || 0,
          counters: backupData.item_code_counters?.length || 0,
          subcategories: backupData.subcategories?.length || 0,
          pieces: backupData.item_pieces?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Restore failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
