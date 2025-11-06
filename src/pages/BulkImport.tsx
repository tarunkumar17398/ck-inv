import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BulkImport = () => {
  const [pastedData, setPastedData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const processData = async () => {
    if (!pastedData.trim()) {
      toast({
        title: "No data provided",
        description: "Please paste your data",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Split by new lines
      const rows = pastedData.trim().split("\n");
      const items = [];

      for (const row of rows) {
        // Split by tab (Excel default) or comma
        const cells = row.split("\t").length > 1 ? row.split("\t") : row.split(",");
        
        if (cells.length < 3) continue; // Skip invalid rows

        // Parse CSV format: Category, PARTICULARS, SIZE, Weight
        // Expected format: Category, PARTICULARS, SIZE, Weight (in grams)
        const [category, particulars, size, weight] = cells.map(c => c.trim());

        if (!category || !particulars) continue;

        // Find category
        const { data: categories } = await supabase
          .from("categories")
          .select("*")
          .ilike("name", category)
          .limit(1);

        if (!categories || categories.length === 0) {
          toast({
            title: "Category not found",
            description: `Category "${category}" doesn't exist. Please create it first.`,
            variant: "destructive",
          });
          continue;
        }

        const categoryData = categories[0];

        // Generate item code
        const { data: codeData, error: codeError } = await supabase
          .rpc("generate_next_item_code", { p_category_id: categoryData.id });

        if (codeError) {
          console.error("Error generating item code:", codeError);
          continue;
        }

        const itemCode = codeData;

        items.push({
          item_code: itemCode,
          category_id: categoryData.id,
          item_name: particulars,
          particulars: particulars, // Store same value in both fields
          size: size || null,
          weight: weight && weight.toLowerCase() !== 'na' ? weight : null,
          color_code: null,
          price: null,
          status: "in_stock",
        });
      }

      if (items.length === 0) {
        toast({
          title: "No valid items",
          description: "No valid items found to import",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Insert all items
      const { error } = await supabase.from("items").insert(items);

      if (error) {
        toast({
          title: "Import failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import successful",
          description: `${items.length} items imported successfully`,
        });
        navigate("/inventory");
      }
    } catch (error: any) {
      toast({
        title: "Error processing data",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Bulk Import Items</h1>

        <Card>
          <CardHeader>
            <CardTitle>Paste Your Inventory Data</CardTitle>
            <CardDescription>
              Copy your data from Excel/CSV and paste it below. Each row should contain:
              <br />
              <strong>Category, PARTICULARS, SIZE, Weight (in grams)</strong>
              <br />
              Note: Weight can be "NA" if not applicable. Columns can be separated by tabs or commas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Category	PARTICULARS	SIZE	Weight
Brass	GANESH STANDING (S.W)	6&quot;	1700
Wood	BUDDHA SITTING	8&quot;	850
Iron	PEACOCK CLOCK	15&quot;	NA"
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex gap-4">
              <Button
                onClick={processData}
                disabled={isProcessing}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Import Items"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPastedData("")}
                disabled={isProcessing}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Example Format (From Your Data)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              <code>
{`Category	PARTICULARS	SIZE	Weight
Brass	FISH CHOWKI (GREEN)	6"	6100
Brass	LAKSHMI SITTING	8.5"	2600
Iron	MUSICIAN CLOCK PEN STAND	15"	NA
Wood	GANESHA WITH ARCH	17.5"	3000
Terracotta	GAJA LAKSHMI	15"x12"	NA`}
              </code>
            </pre>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Tip: Copy directly from your existing CSV files (BR_Data.csv, IR_Data.csv, etc.)
              <br />
              Make sure Category names match exactly: Brass, Iron, Wood, Terracotta, or Gift Items
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BulkImport;
