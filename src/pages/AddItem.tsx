import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPriceLabel, formatWeightLabel } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  prefix: string;
}

const AddItem = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [size, setSize] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedItemCode, setGeneratedItemCode] = useState("");
  const [selectedCategoryPrefix, setSelectedCategoryPrefix] = useState("");
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPrefix, setNewCategoryPrefix] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }
    loadCategories();
  }, [navigate]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCategories(data || []);
  };

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    // Find category prefix for BR auto-calculation
    const category = categories.find(cat => cat.id === categoryId);
    setSelectedCategoryPrefix(category?.prefix || "");
    
    // Generate preview item code when category is selected
    if (categoryId) {
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_next_item_code", { p_category_id: categoryId });

      if (codeError) {
        console.error("Error generating item code:", codeError);
        setGeneratedItemCode("");
        return;
      }

      // Show the next available code (the one that will be used)
      setGeneratedItemCode(codeData);
    } else {
      setGeneratedItemCode("");
    }
  };

  const handleWeightChange = (value: string) => {
    setWeight(value);
    
    // Auto-calculate cost price for BR category
    if (selectedCategoryPrefix === "BR" && value) {
      const weightNum = parseFloat(value);
      if (!isNaN(weightNum)) {
        setCostPrice((weightNum * 1).toString());
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryPrefix) {
      toast({
        title: "Missing fields",
        description: "Please provide both name and prefix",
        variant: "destructive",
      });
      return;
    }

    const { data: newCat, error: catError } = await supabase
      .from("categories")
      .insert({ name: newCategoryName, prefix: newCategoryPrefix.toUpperCase() })
      .select()
      .single();

    if (catError) {
      toast({
        title: "Error adding category",
        description: catError.message,
        variant: "destructive",
      });
      return;
    }

    // Initialize counter for new category
    await supabase
      .from("item_code_counters")
      .insert({ category_id: newCat.id, current_number: 1, current_letter: null });

    toast({
      title: "Category added",
      description: `${newCategoryName} (CK${newCategoryPrefix}) created successfully`,
    });

    setNewCategoryName("");
    setNewCategoryPrefix("");
    setShowAddCategory(false);
    loadCategories();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory || !itemName) {
      toast({
        title: "Missing required fields",
        description: "Please select category and enter item name",
        variant: "destructive",
      });
      return;
    }

    if (!costPrice) {
      toast({
        title: "Missing cost price",
        description: "Please enter the cost price",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate item code (use the one we already generated)
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_next_item_code", { p_category_id: selectedCategory });

      if (codeError) throw codeError;

      const itemCode = codeData;

      // Insert item - using item_name for both name and particulars
      const { error: insertError } = await supabase.from("items").insert({
        item_code: itemCode,
        category_id: selectedCategory,
        item_name: itemName,
        particulars: itemName, // Same as item name
        size: size || null,
        weight: weight || null,
        color_code: null,
        price: price ? parseFloat(price) : null,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        status: "in_stock",
      });

      if (insertError) throw insertError;

      toast({
        title: "Item added successfully",
        description: `Item code: ${itemCode}`,
      });

      navigate("/inventory");
    } catch (error: any) {
      toast({
        title: "Error adding item",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Add New Item</h1>

        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Category *</Label>
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} (CK{cat.prefix})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Category Name</Label>
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Brass"
                          />
                        </div>
                        <div>
                          <Label>Prefix (2 letters)</Label>
                          <Input
                            value={newCategoryPrefix}
                            onChange={(e) => setNewCategoryPrefix(e.target.value.toUpperCase().slice(0, 2))}
                            placeholder="e.g., BR"
                            maxLength={2}
                          />
                        </div>
                        <Button onClick={handleAddCategory} className="w-full">
                          Add Category
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {generatedItemCode && (
                <div className="bg-muted p-4 rounded-lg">
                  <Label>Generated Item Code</Label>
                  <p className="text-2xl font-bold font-mono text-primary mt-2">
                    {generatedItemCode}
                  </p>
                </div>
              )}

              <div>
                <Label>Item Name *</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Size</Label>
                  <Input
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g., 10cm"
                  />
                </div>
                <div>
                  <Label>Weight (in grams)</Label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    placeholder="e.g., 500"
                  />
                  {weight && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Label: {formatWeightLabel(weight)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Cost Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder={selectedCategoryPrefix === "BR" ? "Auto-calculated from weight" : "Enter cost price"}
                  required
                />
                {selectedCategoryPrefix === "BR" && weight && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated: Weight × 1 = ₹{costPrice} (editable)
                  </p>
                )}
              </div>

              <div>
                <Label>Selling Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
                {price && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Label: {formatPriceLabel(price)}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Item"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AddItem;