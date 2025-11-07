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

    // Fetch items with category prefixes BR, IR, TP, WD
    const { data: items, error } = await supabaseClient
      .from('items')
      .select(`
        item_code,
        particulars,
        size,
        weight,
        rfid_epc,
        categories (prefix)
      `)
      .in('categories.prefix', ['BR', 'IR', 'TP', 'WD'])
      .eq('status', 'in_stock')
      .order('created_at', { ascending: false });

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

    // Format data for RFID scanner
    const formattedData = items.map(item => ({
      'ITEM CODE': item.item_code || '',
      'PARTICULARS': item.particulars || '',
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
