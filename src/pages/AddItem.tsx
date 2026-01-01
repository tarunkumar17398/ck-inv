import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Check, ChevronsUpDown, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPriceLabel, formatWeightLabel, formatSizeWithInches } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import bwipjs from "bwip-js";
import type { RenderOptions } from "bwip-js";

// Type for bwip-js SVG generation
const bwipjsLib = bwipjs as typeof bwipjs & { 
  toSVG: (opts: RenderOptions) => string 
};

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
  const [quantity, setQuantity] = useState(1);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPrefix, setNewCategoryPrefix] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [printAfterAdd, setPrintAfterAdd] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

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

  const formatBackendError = (err: any) => {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;

    const msg = err?.message || err?.error_description || err?.details || err?.hint;
    const code = err?.code ? ` (${err.code})` : "";

    if (msg) return `${msg}${code}`;

    try {
      return `${JSON.stringify(err)}${code}`;
    } catch {
      return `Unknown error${code}`;
    }
  };

  // Function to regenerate the item code preview without clearing the form
  // IMPORTANT: Use the backend generator so we don't need read access to items/item_pieces (RLS-safe).
  const regenerateItemCode = async (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (!categoryId || !category) {
      setGeneratedItemCode("");
      return;
    }

    try {
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_next_item_code", { p_category_id: categoryId });

      if (codeError) throw codeError;

      setGeneratedItemCode(codeData || "");
    } catch (error: any) {
      const message = formatBackendError(error);
      console.error("Error generating item code preview:", { message, error });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setGeneratedItemCode("");
    }
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
    
    // Generate preview item code
    await regenerateItemCode(categoryId);
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

  const printBarcode = (itemCode: string, itemNameToPrint: string, priceToPrint: string, weightToPrint: string, sizeToPrint: string = ""): Promise<void> => {
    return new Promise((resolve) => {
      // Create a temporary print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast({
          title: "Print blocked",
          description: "Please allow popups to print barcodes",
          variant: "destructive",
        });
        resolve();
        return;
      }

      // Generate barcode SVG
      let barcodeSvg = '';
      try {
        barcodeSvg = bwipjsLib.toSVG({
          bcid: 'code128',
          text: itemCode,
          height: 12,
          includetext: true,
          textxalign: 'center',
          textsize: 10,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }

      const formattedWeight = weightToPrint ? formatWeightLabel(parseFloat(weightToPrint)) : '';
      const formattedPrice = priceToPrint ? formatPriceLabel(parseFloat(priceToPrint)) : '';
      const formattedSize = sizeToPrint ? formatSizeWithInches(sizeToPrint) : '';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Barcode - ${itemCode}</title>
          <style>
            @page {
              size: 110mm 28mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              font-family: Calibri, Arial, sans-serif !important;
              -webkit-font-smoothing: antialiased !important;
              text-rendering: geometricPrecision !important;
            }
            .label-page {
              width: 110mm;
              height: 28mm;
              position: relative;
              background: white;
              page-break-after: always;
              page-break-inside: avoid;
              overflow: hidden;
              font-family: Calibri, Arial, sans-serif;
              color: black;
            }
            .logo {
              position: absolute;
              left: 6.9mm;
              top: 6mm;
              font-size: 11pt;
              font-weight: 400;
              color: black;
            }
            .item-code-top {
              position: absolute;
              left: 12mm;
              top: -1mm;
              font-size: 11pt;
              font-weight: 400;
              color: black;
            }
            .particulars {
              position: absolute;
              left: 11mm;
              top: 4mm;
              width: 48mm;
              max-height: 9mm;
              font-size: 8pt;
              font-weight: 400;
              line-height: 1.2;
              overflow: hidden;
              white-space: normal;
              word-wrap: break-word;
              color: black;
            }
            .price {
              position: absolute;
              left: 12mm;
              top: 12mm;
              font-size: 11pt;
              font-weight: 400;
              color: black;
            }
            .size {
              position: absolute;
              left: 38mm;
              top: 12mm;
              font-size: 11pt;
              font-weight: 400;
              color: black;
            }
            .barcode-container {
              position: absolute;
              left: 62mm;
              top: -1mm;
              width: 38mm;
              height: 16mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .barcode-container svg {
              max-width: 100%;
              max-height: 100%;
              shape-rendering: crispEdges;
            }
            .weight {
              position: absolute;
              left: 62mm;
              top: 13mm;
              width: 38mm;
              font-size: 11pt;
              font-weight: 400;
              text-align: center;
              color: black;
            }
          </style>
        </head>
        <body>
          <div class="label-page">
            <span class="logo">O</span>
            <span class="item-code-top">S.No: ${itemCode}</span>
            <span class="particulars">${itemNameToPrint}</span>
            <span class="price">${formattedPrice}</span>
            <span class="size">${formattedSize}</span>
            <div class="barcode-container">${barcodeSvg}</div>
            <span class="weight">${formattedWeight}</span>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      
      // Track if we've already resolved
      let resolved = false;
      
      // Wait for content to load then print
      printWindow.onload = () => {
        if (resolved) return;
        resolved = true;
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        resolve();
      };
      
      // Fallback timeout in case onload doesn't fire
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        try {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        } catch (e) {
          console.error('Print fallback error:', e);
        }
        resolve();
      }, 2000);
    });
  };

  const handleSubmit = async (e: React.FormEvent, shouldPrint: boolean = false) => {
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

      // For Panchaloha Idols, create pieces (supports bulk quantity)
      setLoading(true);
      try {
        const pieceCodes: string[] = [];

        // Loop through quantity and create each piece
        for (let i = 0; i < quantity; i++) {
          // Generate unique piece code for each piece
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
          pieceCodes.push(pieceCode);
        }

        toast({
          title: "Success",
          description: quantity === 1 
            ? `Piece code: ${pieceCodes[0]}`
            : `${quantity} pieces added: ${pieceCodes[0]} to ${pieceCodes[pieceCodes.length - 1]}`,
        });

        // Print barcode if requested (only for single piece) - await to ensure print completes before regenerating code
        if (shouldPrint && quantity === 1) {
          const subcategoryName = subcategories.find(s => s.id === selectedSubcategory)?.subcategory_name || '';
          await printBarcode(pieceCodes[0], subcategoryName, costPrice, weight, size);
        }

        // Clear form and stay on page for adding next item
        setItemName("");
        setSize("");
        setWeight("");
        setCostPrice("");
        setSelectedSubcategory("");
        setQuantity(1);
        
        // Regenerate item code preview for next item
        await regenerateItemCode(selectedCategory);
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

      // Print barcode if requested - await to ensure print completes before regenerating code
      if (shouldPrint) {
        await printBarcode(itemCode, itemName, price, weight, size);
      }

      // Clear form and stay on page for adding next item
      setItemName("");
      setSize("");
      setWeight("");
      setPrice("");
      setCostPrice("");
      setRfidEpc("");
      
      // Regenerate item code preview for next item
      await regenerateItemCode(selectedCategory);
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

              {selectedCategoryName === "Panchaloha Idols" && (
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    placeholder="Enter quantity"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of identical pieces to create with sequential item codes
                  </p>
                </div>
              )}

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

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Adding..." : selectedCategoryName === "Panchaloha Idols" ? "Add Piece" : "Add Item"}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary"
                  className="flex-1"
                  disabled={loading || (selectedCategoryName === "Panchaloha Idols" && quantity > 1)}
                  onClick={(e) => handleSubmit(e as any, true)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {loading ? "Adding..." : "Add & Print"}
                </Button>
              </div>
              {selectedCategoryName === "Panchaloha Idols" && quantity > 1 && (
                <p className="text-xs text-muted-foreground text-center">
                  Add & Print is only available when adding a single piece
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AddItem;