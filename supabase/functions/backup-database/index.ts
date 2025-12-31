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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Check for scheduled job (cron) - uses service role for authentication
    const authHeader = req.headers.get('authorization');
    const isScheduledJob = authHeader === `Bearer ${supabaseAnonKey}`;
    
    let userEmail = 'scheduled-backup';
    
    if (isScheduledJob) {
      console.log('Running as scheduled backup job');
    } else {
      // Manual trigger - verify JWT token and check admin role
      if (!authHeader) {
        console.error('No authorization header provided');
        return new Response(
          JSON.stringify({ error: 'Unauthorized - No authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      
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
      const supabaseAdminCheck = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: roleData, error: roleError } = await supabaseAdminCheck
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
      userEmail = user.email || 'unknown';
      console.log('Starting database backup by admin:', user.id);
    }

    console.log('Starting database backup, triggered by:', userEmail);

    // Create admin client for all operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all data using service role (bypasses RLS for backup)
    const [itemsRes, categoriesRes, countersRes, subcategoriesRes, piecesRes] = await Promise.all([
      supabaseAdmin.from('items').select('*'),
      supabaseAdmin.from('categories').select('*'),
      supabaseAdmin.from('item_code_counters').select('*'),
      supabaseAdmin.from('subcategories').select('*'),
      supabaseAdmin.from('item_pieces').select('*'),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (countersRes.error) throw countersRes.error;
    if (subcategoriesRes.error) throw subcategoriesRes.error;
    if (piecesRes.error) throw piecesRes.error;

    const backupData = {
      timestamp: new Date().toISOString(),
      created_by: userEmail,
      items: itemsRes.data,
      categories: categoriesRes.data,
      item_code_counters: countersRes.data,
      subcategories: subcategoriesRes.data,
      item_pieces: piecesRes.data,
    };

    const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);

    // Upload to Cloud Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    console.log(`Backup created: ${fileName} by ${userEmail}`);

    // Clean up old backups (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: files } = await supabaseAdmin.storage.from('backups').list();
    
    if (files) {
      for (const file of files) {
        const fileDate = new Date(file.created_at);
        if (fileDate < thirtyDaysAgo) {
          await supabaseAdmin.storage.from('backups').remove([file.name]);
          console.log(`Deleted old backup: ${file.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backup failed:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
