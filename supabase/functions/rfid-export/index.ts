import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, get category IDs for BR, IR, TP, WD prefixes
    const { data: categories, error: catError } = await supabaseClient
      .from('categories')
      .select('id')
      .in('prefix', ['BR', 'IR', 'TP', 'WD']);

    if (catError) {
      console.error('Category fetch error:', catError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch categories' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const categoryIds = categories.map(cat => cat.id);

    // Fetch all items from these categories in batches (supports up to 5000+ items)
    let allItems: any[] = [];
    let from = 0;
    const batchSize = 5000; // Increased to handle larger inventory efficiently
    
    while (true) {
      const { data: items, error } = await supabaseClient
        .from('items')
        .select('item_code, item_name, size, weight, rfid_epc')
        .in('category_id', categoryIds)
        .eq('status', 'in_stock')
        .order('created_at', { ascending: false })
        .limit(5000)
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch items' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!items || items.length === 0) {
        break;
      }

      allItems = allItems.concat(items);
      
      // If we got fewer items than batch size, we've reached the end
      if (items.length < batchSize) {
        break;
      }

      from += batchSize;
    }

    // Format data for RFID scanner
    const formattedData = allItems.map(item => ({
      'ITEM CODE': item.item_code || '',
      'PARTICULARS': item.item_name || '',
      'SIZE': item.size || '',
      'Weight': item.weight || '',
      'RFID-EPC': item.rfid_epc || ''
    }));

    console.log(`Exported ${formattedData.length} items for RFID scanner`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: formattedData.length,
        data: formattedData 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in rfid-export function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
