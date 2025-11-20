import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect } from "react";

const BulkImport = () => {
  const [pastedData, setPastedData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [isSalesProcessing, setIsSalesProcessing] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!selectedCategory) {
      toast({
        title: "Category required",
        description: "Please select a category first",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      await processFileData(text);
    };
    
    reader.readAsText(uploadedFile);
  };

  const processFileData = async (csvText: string) => {
    if (!selectedCategory) {
      toast({
        title: "Category required",
        description: "Please select a category first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Find category first
      const { data: categoryData } = await supabase
        .from("categories")
        .select("*")
        .eq("id", selectedCategory)
        .single();

      if (!categoryData) {
        toast({
          title: "Category not found",
          description: "Selected category doesn't exist",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // If replace mode is enabled, delete all existing items from this category
      if (replaceMode) {
        const { error: deleteError } = await supabase
          .from("items")
          .delete()
          .eq("category_id", selectedCategory);

        if (deleteError) {
          toast({
            title: "Delete failed",
            description: deleteError.message,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        toast({
          title: "Existing items cleared",
          description: `All items from ${categoryData.name} category have been removed`,
        });
      }

      const rows = csvText.trim().split("\n");
      const dataRows = rows.slice(1);
      const items = [];

      for (const row of dataRows) {
        if (!row.trim()) continue;

        // Split by comma, handling quoted values
        const cells = row.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (cells.length < 2) continue; // Need at least item code and particulars

        // CSV format: ITEM CODE (ignore), PARTICULARS, SIZE, Weight
        const [, particulars, size, weight] = cells;

        if (!particulars) continue;

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
          particulars: particulars,
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
        setFile(null);
        setSelectedCategory("");
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

  const handleSalesFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setSalesFile(uploadedFile);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      await processSalesData(text);
    };
    
    reader.readAsText(uploadedFile);
  };

  const processSalesData = async (csvText: string) => {
    setIsSalesProcessing(true);

    try {
      // Step 1: Delete all old sold items
      console.log("Deleting all old sold items...");
      const { error: deleteError } = await supabase
        .from("items")
        .delete()
        .eq("status", "sold");

      if (deleteError) {
        console.error("Error deleting old sold items:", deleteError);
        throw deleteError;
      }
      console.log("✓ Old sold items deleted");

      // Pre-load all categories for faster lookup
      const { data: allCategories } = await supabase
        .from("categories")
        .select("id, prefix");
      
      const categoryMap = new Map(allCategories?.map(c => [c.prefix, c.id]) || []);
      console.log(`Loaded ${categoryMap.size} categories`);

      const rows = csvText.trim().split("\n");
      const dataRows = rows.slice(1); // Skip header
      
      console.log(`Processing ${dataRows.length} rows...`);
      
      let skippedCount = 0;
      const skipReasons: string[] = [];
      const itemsToInsert: any[] = [];

      // Step 2: Parse CSV and prepare items for bulk insert
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row.trim()) {
          skippedCount++;
          continue;
        }

        // Parse CSV: ITEM CODE, PARTICULARS, SIZE, Weight, Cost Price, Selling Price, Date
        const cells = row.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (cells.length < 7) {
          skippedCount++;
          skipReasons.push(`Row ${i + 1}: ${cells.length} columns (need 7)`);
          continue;
        }

        const [itemCode, particulars, size, weight, costPrice, sellingPrice, dateStr] = cells;
        
        if (!itemCode || !particulars || !sellingPrice) {
          skippedCount++;
          skipReasons.push(`Row ${i + 1}: Missing required data`);
          continue;
        }

        // Extract category prefix - take first 2 letters after CK
        // This handles CKBR, CKBRA, CKBRB, CKBRC all as BR
        const prefixMatch = itemCode.match(/^CK([A-Z]{2})/i);
        if (!prefixMatch) {
          skippedCount++;
          skipReasons.push(`Row ${i + 1}: Invalid item code format: ${itemCode}`);
          continue;
        }
        
        const categoryPrefix = prefixMatch[1].toUpperCase();

        // Fast category lookup from pre-loaded map
        const categoryId = categoryMap.get(categoryPrefix);
        if (!categoryId) {
          skippedCount++;
          skipReasons.push(`Row ${i + 1}: Category not found for prefix: ${categoryPrefix}`);
          continue;
        }

        // Parse date - expecting DD-MM-YYYY format (e.g., 17-11-2025)
        let soldDate = new Date();
        if (dateStr && dateStr.trim()) {
          const parts = dateStr.trim().split(/[\/\-\.]/);
          
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const parsedDate = new Date(year, month, day, 12, 0, 0);
            
            if (!isNaN(parsedDate.getTime())) {
              soldDate = parsedDate;
            }
          }
        }

        // Prepare item for bulk insert
        itemsToInsert.push({
          item_code: itemCode.toUpperCase(),
          category_id: categoryId,
          item_name: particulars,
          particulars: particulars,
          size: size || null,
          weight: weight && weight.toLowerCase() !== 'na' ? weight : null,
          cost_price: costPrice && costPrice.toLowerCase() !== 'na' ? parseFloat(costPrice) : null,
          status: "sold",
          sold_price: parseFloat(sellingPrice),
          sold_date: soldDate.toISOString()
        });

        // Log progress every 50 items
        if ((i + 1) % 50 === 0) {
          console.log(`Processed ${i + 1}/${dataRows.length} rows...`);
        }
      }

      console.log(`Parsed ${itemsToInsert.length} items for insertion`);

      // Step 3: Bulk insert all items
      let successCount = 0;
      if (itemsToInsert.length > 0) {
        console.log(`Inserting ${itemsToInsert.length} sold items...`);
        const { data, error: insertError } = await supabase
          .from("items")
          .insert(itemsToInsert)
          .select();

        if (insertError) {
          console.error("Error inserting items:", insertError);
          toast({
            title: "Insert Error",
            description: insertError.message,
            variant: "destructive",
          });
          throw insertError;
        }
        
        successCount = data?.length || itemsToInsert.length;
        console.log(`✓ Successfully inserted ${successCount} items`);
      }

      const message = `✅ ${successCount} sold items imported. ${skippedCount > 0 ? `⚠️ ${skippedCount} skipped.` : ''}`;
      
      console.log('=== SALES IMPORT SUMMARY ===');
      console.log(message);
      if (skipReasons.length > 0) {
        console.log('\n=== SKIP REASONS (First 20) ===');
        skipReasons.slice(0, 20).forEach((reason, i) => console.log(`${i + 1}. ${reason}`));
        if (skipReasons.length > 20) {
          console.log(`... and ${skipReasons.length - 20} more`);
        }
      }

      toast({
        title: "Sales Import Complete",
        description: message,
      });

    } catch (error: any) {
      console.error("Sales import error:", error);
      toast({
        title: "Error processing sales data",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsSalesProcessing(false);
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

        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">Upload CSV File</TabsTrigger>
            <TabsTrigger value="paste">Paste Data</TabsTrigger>
            <TabsTrigger value="sales">Import Sales</TabsTrigger>
          </TabsList>

          {/* CSV File Upload Tab */}
          <TabsContent value="file">
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File by Category</CardTitle>
                <CardDescription>
                  Upload your CSV file (BR_Data.csv, IR_Data.csv, etc.) and select the category.
                  <br />
                  Expected format: <strong>ITEM CODE, PARTICULARS, SIZE, Weight</strong>
                  <br />
                  Note: ITEM CODE from CSV will be ignored; new codes will be generated automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Category *</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category for this file" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} (CK{cat.prefix})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="replaceMode"
                    checked={replaceMode}
                    onChange={(e) => setReplaceMode(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="replaceMode" className="text-sm cursor-pointer">
                    Replace existing items (delete all items from selected category before importing)
                  </Label>
                </div>

                <div>
                  <Label>Upload CSV File</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      disabled={!selectedCategory || isProcessing}
                      className="flex-1"
                    />
                    {file && (
                      <span className="text-sm text-muted-foreground">
                        {file.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {!selectedCategory && "Please select a category first"}
                  </p>
                </div>

                {isProcessing && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Processing your file...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>File Format Example</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>
{`ITEM CODE,PARTICULARS,SIZE,Weight
CKBR0005,FISH CHOWKI (GREEN),6", 6.1
CKBR0008,STAND WITH BELLS,15", 4.9
CKBR0014,LAKSHMI SITTING,8.5", 2.6`}
                  </code>
                </pre>
                <p className="text-xs text-muted-foreground mt-3">
                  💡 This matches your existing BR_Data.csv, IR_Data.csv, WD_Data.csv, and TP_Data.csv format
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paste Data Tab */}
          <TabsContent value="paste">
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
          </TabsContent>

          {/* Sales Import Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Import Sales Data</CardTitle>
                <CardDescription>
                  Upload a CSV file with historical sales data. Items will be created as sold records for analysis.
                  <br />
                  <strong>Required format:</strong> ITEM CODE, PARTICULARS, SIZE, Weight, Cost Price, Selling Price, Date
                  <br />
                  If an item code already exists in inventory, it will be updated. Otherwise, a new sold record will be created.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Upload Sales CSV File</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleSalesFileUpload}
                      disabled={isSalesProcessing}
                      className="flex-1"
                    />
                    {salesFile && (
                      <span className="text-sm text-muted-foreground">
                        {salesFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    CSV must include: ITEM CODE, PARTICULARS, SIZE, Weight, Cost Price, Selling Price, Date
                  </p>
                </div>

                {isSalesProcessing && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Processing sales data...</p>
                  </div>
                )}

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">How it works:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Category is automatically detected from item code prefix (BR, IR, TP, WD)</li>
                    <li>If item code exists in inventory and is "in_stock", it will be marked as sold</li>
                    <li>If item code doesn't exist, a new sold record will be created for historical data</li>
                    <li>Perfect for importing historical sales when migrating from Excel</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BulkImport;
