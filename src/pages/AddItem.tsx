import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPriceLabel, formatWeightLabel, formatSizeWithInches } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  prefix: string;
}

interface Subcategory {
  id: string;
  subcategory_name: string;
  default_price: number | null;
}

const AddItem = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [size, setSize] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [rfidEpc, setRfidEpc] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedItemCode, setGeneratedItemCode] = useState("");
  const [selectedCategoryPrefix, setSelectedCategoryPrefix] = useState("");
  
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  
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
    
    // Find category
    const category = categories.find(cat => cat.id === categoryId);
    setSelectedCategoryName(category?.name || "");
    setSelectedCategoryPrefix(category?.prefix || "");
    
    // Clear item name when changing category
    setItemName("");
    
    // If Panchaloha Idols, load subcategories
    if (category?.name === "Panchaloha Idols") {
      loadSubcategories(categoryId);
      setSelectedSubcategory("");
    } else {
      setSubcategories([]);
      setSelectedSubcategory("");
    }
    
    // Generate preview item code using the counter
    if (categoryId && category) {
      try {
        // Fetch the current counter value
        const { data: counter, error: fetchError } = await supabase
          .from('item_code_counters')
          .select('current_number, current_letter')
          .eq('category_id', categoryId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        const prefix = category.prefix;
        let nextCode = "";

        if (counter) {
          const { current_number, current_letter } = counter;
          
          if (current_letter) {
            // Has letter series (e.g., CKBRA001)
            nextCode = `CK${prefix}${current_letter}${String(current_number).padStart(3, '0')}`;
          } else {
            // No letter series (e.g., CKBR0001)
            nextCode = `CK${prefix}${String(current_number).padStart(4, '0')}`;
          }
        } else {
          // No counter found, start with 0001
          nextCode = `CK${prefix}0001`;
        }

        setGeneratedItemCode(nextCode);
      } catch (error) {
        console.error('Error generating item code:', error);
        toast({
          title: "Error",
          description: "Failed to generate item code",
          variant: "destructive",
        });
        setGeneratedItemCode("");
      }
    } else {
      setGeneratedItemCode("");
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    const { data, error } = await supabase
      .from("subcategories")
      .select("*")
      .eq("category_id", categoryId)
      .order("subcategory_name");

    if (error) {
      toast({
        title: "Error loading subcategories",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSubcategories(data || []);
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      toast({
        title: "Missing field",
        description: "Please enter a subcategory name",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("subcategories")
      .insert({
        category_id: selectedCategory,
        subcategory_name: newSubcategoryName.trim(),
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error adding subcategory",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Subcategory added",
      description: `${newSubcategoryName} added successfully`,
    });

    setNewSubcategoryName("");
    setShowAddSubcategory(false);
    loadSubcategories(selectedCategory);
    setSelectedSubcategory(data.id);
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

    // Check if Panchaloha Idols - require subcategory
    if (selectedCategoryName === "Panchaloha Idols") {
      if (!selectedSubcategory) {
        toast({
          title: "Missing subcategory",
          description: "Please select a subcategory for Panchaloha Idols",
          variant: "destructive",
        });
        return;
      }

      // For Panchaloha Idols, create piece
      setLoading(true);
      try {
        // Generate piece code
        const { data: codeData, error: codeError } = await supabase
          .rpc("generate_next_item_code", { p_category_id: selectedCategory });

        if (codeError) throw codeError;

        const pieceCode = codeData;

        // Insert piece with cost_price
        const { error: insertError } = await supabase.from("item_pieces").insert({
          subcategory_id: selectedSubcategory,
          piece_code: pieceCode,
          status: "available",
          cost_price: costPrice ? parseFloat(costPrice) : null,
          notes: `${itemName}${size ? ` - Size: ${size}` : ""}${weight ? ` - Weight: ${weight}g` : ""}`,
        });

        if (insertError) throw insertError;

        toast({
          title: "Piece added successfully",
          description: `Piece code: ${pieceCode}`,
        });

        navigate("/panchaloha-subcategories");
      } catch (error: any) {
        toast({
          title: "Error adding piece",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // For regular items
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
        size: formatSizeWithInches(size),
        weight: weight || null,
        color_code: null,
        price: price ? parseFloat(price) : null,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        rfid_epc: rfidEpc || null,
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

              {selectedCategoryName === "Panchaloha Idols" && (
                <div>
                  <Label>Subcategory *</Label>
                  <div className="flex gap-2">
                    <Popover open={subcategoryOpen} onOpenChange={setSubcategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={subcategoryOpen}
                          className="flex-1 justify-between"
                        >
                          {selectedSubcategory
                            ? subcategories.find((s) => s.id === selectedSubcategory)?.subcategory_name
                            : "Search subcategory..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search subcategory..." />
                          <CommandList>
                            <CommandEmpty>No subcategory found.</CommandEmpty>
                            <CommandGroup>
                              {subcategories.map((subcategory) => (
                                <CommandItem
                                  key={subcategory.id}
                                  value={subcategory.subcategory_name}
                                  onSelect={() => {
                                    setSelectedSubcategory(subcategory.id);
                                    setItemName(subcategory.subcategory_name);
                                    if (subcategory.default_price) {
                                      setCostPrice(subcategory.default_price.toString());
                                    }
                                    setSubcategoryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedSubcategory === subcategory.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {subcategory.subcategory_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Dialog open={showAddSubcategory} onOpenChange={setShowAddSubcategory}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Subcategory</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Subcategory Name</Label>
                            <Input
                              value={newSubcategoryName}
                              onChange={(e) => setNewSubcategoryName(e.target.value)}
                              placeholder="e.g., Nataraja, Lakshmi"
                            />
                          </div>
                          <Button onClick={handleAddSubcategory} className="w-full">
                            Add Subcategory
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the design/model type for this piece
                  </p>
                </div>
              )}

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
                  placeholder={selectedCategoryName === "Panchaloha Idols" ? "Enter design details" : "Enter item name"}
                  required
                />
                {selectedCategoryName === "Panchaloha Idols" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter details like color, special features, etc.
                  </p>
                )}
              </div>

              {selectedCategoryName !== "Panchaloha Idols" && (
                <div>
                  <Label>RFID EPC</Label>
                  <Input
                    value={rfidEpc}
                    onChange={(e) => setRfidEpc(e.target.value)}
                    placeholder="e.g., A7B700000000000000023303"
                  />
                </div>
              )}

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
                <Label>Cost Price {selectedCategoryName !== "Panchaloha Idols" && "*"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder={selectedCategoryPrefix === "BR" ? "Auto-calculated from weight" : "Enter cost price"}
                  required={selectedCategoryName !== "Panchaloha Idols" && selectedCategoryPrefix !== "BR"}
                />
                {selectedCategoryPrefix === "BR" && weight && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated: Weight × 1 = ₹{costPrice} (editable)
                  </p>
                )}
              </div>

              {selectedCategoryName !== "Panchaloha Idols" && (
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
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : selectedCategoryName === "Panchaloha Idols" ? "Add Piece" : "Add Item"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AddItem;