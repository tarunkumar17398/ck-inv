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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Restoring backup: ${fileName}`);

    // Download backup file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('backups')
      .download(fileName);

    if (downloadError) throw downloadError;

    const backupContent = await fileData.text();
    const backupData = JSON.parse(backupContent);

    // Clear existing data (in reverse order of dependencies)
    await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('item_code_counters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Existing data cleared');

    // Restore data (in order of dependencies)
    if (backupData.categories?.length) {
      const { error: catError } = await supabase.from('categories').insert(backupData.categories);
      if (catError) throw catError;
      console.log(`Restored ${backupData.categories.length} categories`);
    }

    if (backupData.item_code_counters?.length) {
      const { error: counterError } = await supabase.from('item_code_counters').insert(backupData.item_code_counters);
      if (counterError) throw counterError;
      console.log(`Restored ${backupData.item_code_counters.length} counters`);
    }

    if (backupData.items?.length) {
      const { error: itemsError } = await supabase.from('items').insert(backupData.items);
      if (itemsError) throw itemsError;
      console.log(`Restored ${backupData.items.length} items`);
    }

    console.log('Restore completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        restored: {
          items: backupData.items?.length || 0,
          categories: backupData.categories?.length || 0,
          counters: backupData.item_code_counters?.length || 0,
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
