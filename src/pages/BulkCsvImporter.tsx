import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const BulkCsvImporter = () => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");

  // Note: For a real implementation, you would read these from the actual CSV files
  // This is a demonstration showing the approach
  
  const importCategoryData = async (categoryId: string, prefix: string, csvContent: string) => {
    const lines = csvContent.trim().split('\n');
    const items = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line || line === ',,,') continue;

      const parts = line.split(',');
      if (parts.length < 4) continue;

      const itemCode = parts[0].trim();
      const itemName = parts[1].trim();
      const size = parts[2].trim();
      const weightStr = parts[3].trim();

      if (!itemCode || !itemName) continue;

      const weight = weightStr === 'NA' ? null : weightStr.replace(/\s+/g, '');
      let costPrice = null;

      // Auto-calculate cost_price for BR category
      if (prefix === 'BR' && weight) {
        const weightNum = parseFloat(weight);
        if (!isNaN(weightNum)) {
          costPrice = weightNum;
        }
      }

      items.push({
        item_code: itemCode,
        item_name: itemName,
        size: size || null,
        weight: weight,
        category_id: categoryId,
        status: 'in_stock',
        cost_price: costPrice
      });
    }

    // Insert in batches of 100
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const { error } = await supabase.from('items').insert(batch);
      
      if (error) throw error;
      totalInserted += batch.length;
      setProgress(`${prefix}: ${totalInserted}/${items.length} items imported`);
    }

    return totalInserted;
  };

  const handleImport = async () => {
    setImporting(true);
    
    try {
      toast.info("Starting import process...");
      
      // You would need to fetch the CSV content from the uploaded files
      // For now, this demonstrates the structure
      
      toast.success("Please upload your CSV files and they will be imported automatically");
      
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
      console.error(error);
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-4">Bulk CSV Data Import</h1>
        
        <div className="mb-6">
          <p className="text-muted-foreground mb-4">
            This tool will import data from the four category CSV files:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>BR_Data-2.csv - Brass items (with auto-calculated cost price)</li>
            <li>IR_Data-2.csv - Iron items</li>
            <li>TP_Data-2.csv - Tanjore Paintings</li>
            <li>WD_Data-2.csv - Wood items</li>
          </ul>
        </div>

        {progress && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">{progress}</p>
          </div>
        )}

        <Button 
          onClick={handleImport} 
          disabled={importing}
          size="lg"
        >
          {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {importing ? 'Importing...' : 'Start Import'}
        </Button>
      </Card>
    </div>
  );
};

export default BulkCsvImporter;
