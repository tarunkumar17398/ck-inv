import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

const DataImporter = () => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const navigate = useNavigate();

  const importAllData = async () => {
    setImporting(true);
    
    try {
      const categoryFiles = [
        { prefix: 'BR', id: '2006bb15-22e3-492f-8108-e0e9ba4f1a92', file: '/data/BR_Data-2.csv' },
        { prefix: 'IR', id: '77ff585b-a570-4f12-93e1-5b1914936e8c', file: '/data/IR_Data-2.csv' },
        { prefix: 'TP', id: 'fe1a6ab1-9505-4505-a392-882744bd6d71', file: '/data/TP_Data-2.csv' },
        { prefix: 'WD', id: '4f639740-da14-4b53-ab91-0bc4f1e8010f', file: '/data/WD_Data-2.csv' }
      ];

      for (const category of categoryFiles) {
        setProgress(`Loading ${category.prefix} data...`);
        
        const response = await fetch(category.file);
        const csvText = await response.text();
        const rows = csvText.trim().split("\n");
        const dataRows = rows.slice(1); // Skip header
        
        const items = [];

        for (const row of dataRows) {
          if (!row.trim() || row === ',,,') continue;

          const cells = row.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
          if (cells.length < 2) continue;

          const [itemCode, itemName, size, weightStr] = cells;
          if (!itemCode || !itemName) continue;

          const weight = weightStr === 'NA' ? null : weightStr.replace(/\s+/g, '');
          let costPrice = null;

          // Auto-calculate cost_price for BR category
          if (category.prefix === 'BR' && weight) {
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
            category_id: category.id,
            status: 'in_stock',
            cost_price: costPrice
          });
        }

        // Insert in batches
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          setProgress(`${category.prefix}: Importing ${inserted}/${items.length}...`);
          
          const { error } = await supabase.from('items').insert(batch);
          
          if (error) {
            console.error(`Error inserting ${category.prefix} batch:`, error);
            toast.error(`Error importing ${category.prefix}: ${error.message}`);
            continue;
          }
          
          inserted += batch.length;
        }

        toast.success(`${category.prefix}: Imported ${inserted} items`);
      }

      toast.success("All category data has been imported successfully!");
      setTimeout(() => navigate("/dashboard"), 2000);
      
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
      setProgress("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent/20 to-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <Upload className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Import All Data</h1>
              <p className="text-muted-foreground mt-2">
                Import existing inventory data for all four categories (BR, IR, TP, WD)
              </p>
            </div>
          </div>

          {progress && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="font-medium text-lg">{progress}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">What will be imported:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>BR (Brass) - All brass items with auto-calculated cost prices</li>
                <li>IR (Iron) - All iron decorative items</li>
                <li>TP (Tanjore Paintings) - All painting items</li>
                <li>WD (Wood) - All wooden craft items</li>
              </ul>
            </div>

            <Button
              onClick={importAllData}
              disabled={importing}
              size="lg"
              className="w-full"
            >
              {importing ? 'Importing Data...' : 'Start Import (Click Once)'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DataImporter;
