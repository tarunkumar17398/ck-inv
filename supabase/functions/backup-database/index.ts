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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting database backup...');

    // Fetch all data
    const [itemsRes, categoriesRes, countersRes] = await Promise.all([
      supabase.from('items').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('item_code_counters').select('*'),
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (countersRes.error) throw countersRes.error;

    const backupData = {
      timestamp: new Date().toISOString(),
      items: itemsRes.data,
      categories: categoriesRes.data,
      item_code_counters: countersRes.data,
    };

    const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    console.log(`Backup created: ${fileName}`);

    // Clean up old backups (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: files } = await supabase.storage.from('backups').list();
    
    if (files) {
      for (const file of files) {
        const fileDate = new Date(file.created_at);
        if (fileDate < thirtyDaysAgo) {
          await supabase.storage.from('backups').remove([file.name]);
          console.log(`Deleted old backup: ${file.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, fileName }),
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
