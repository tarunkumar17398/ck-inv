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
        description: "Please paste your Excel data",
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

        // Expected format: Category, Item Name, Particulars, Size, Weight, Color Code, Price
        const [category, itemName, particulars, size, weight, colorCode, price] = cells.map(c => c.trim());

        if (!category || !itemName) continue;

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
        const { data: counter } = await supabase
          .from("item_code_counters")
          .select("*")
          .eq("category_id", categoryData.id)
          .single();

        if (!counter) continue;

        const itemCode = `${categoryData.prefix}${counter.current_letter || ""}${counter.current_number}`;

        // Update counter
        let newNumber = counter.current_number + 1;
        let newLetter = counter.current_letter;

        if (newNumber > 999) {
          newNumber = 1;
          if (!newLetter) {
            newLetter = "A";
          } else {
            newLetter = String.fromCharCode(newLetter.charCodeAt(0) + 1);
          }
        }

        await supabase
          .from("item_code_counters")
          .update({
            current_number: newNumber,
            current_letter: newLetter,
          })
          .eq("id", counter.id);

        items.push({
          item_code: itemCode,
          category_id: categoryData.id,
          item_name: itemName,
          particulars: particulars || null,
          size: size || null,
          weight: weight || null,
          color_code: colorCode || null,
          price: price ? parseFloat(price) : null,
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
            <CardTitle>Paste Excel Data</CardTitle>
            <CardDescription>
              Copy your data from Excel and paste it below. Each row should contain:
              <br />
              <strong>Category, Item Name, Particulars, Size, Weight (in grams), Color Code, Price</strong>
              <br />
              Columns can be separated by tabs or commas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Category	Item Name	Particulars	Size	Weight(g)	Color Code	Price
Brass	Bowl	Decorative	Large	500	BR01	1200
Iron	Lamp	Vintage	Medium	300	IR02	800"
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
            <CardTitle>Example Format</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              <code>
{`Category	Item Name	Particulars	Size	Weight(g)	Color Code	Price
Brass	Decorative Bowl	Hand-crafted	Large	500	BR01	1200
Iron	Wall Lamp	Vintage Style	Medium	300	IR02	800
Wood	Photo Frame	Rustic	8x10	200	WD03	450`}
              </code>
            </pre>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BulkImport;
