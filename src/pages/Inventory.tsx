import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Printer, Filter, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatPriceLabel, formatWeightLabel } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  size: string | null;
  weight: string | null;
  color_code: string | null;
  price: number | null;
  cost_price: number | null;
  category_id: string;
  categories: { name: string; prefix: string };
}

interface Category {
  id: string;
  name: string;
  prefix: string;
}

const Inventory = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editFormData, setEditFormData] = useState({
    item_name: "",
    size: "",
    weight: "",
    price: "",
    cost_price: "",
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }

    const initialSearch = searchParams.get("search");
    const initialCategory = searchParams.get("category");
    
    if (initialSearch) setSearchQuery(initialSearch);
    if (initialCategory) setCategoryFilter(initialCategory);

    loadCategories();
    loadItems();
  }, [navigate, searchParams]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const loadItems = async () => {
    let query = supabase
      .from("items")
      .select("*, categories(name, prefix)")
      .eq("status", "in_stock")
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error loading items",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems(data || []);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categories.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Handle category ID filter (from dashboard links and dropdown)
    const matchesCategory =
      categoryFilter === "all" || 
      item.category_id === categoryFilter;

    // Advanced search filters
    const matchesName = !nameSearch || 
      item.item_name.toLowerCase().includes(nameSearch.toLowerCase());
    
    const itemWeight = item.weight ? parseFloat(item.weight) : 0;
    const matchesMinWeight = !minWeight || itemWeight >= parseFloat(minWeight);
    const matchesMaxWeight = !maxWeight || itemWeight <= parseFloat(maxWeight);
    
    const itemSize = item.size ? parseFloat(item.size) : 0;
    const matchesMinSize = !minSize || itemSize >= parseFloat(minSize);
    const matchesMaxSize = !maxSize || itemSize <= parseFloat(maxSize);

    return matchesSearch && matchesCategory && matchesName && 
           matchesMinWeight && matchesMaxWeight && matchesMinSize && matchesMaxSize;
  });

  const clearAdvancedSearch = () => {
    setNameSearch("");
    setMinWeight("");
    setMaxWeight("");
    setMinSize("");
    setMaxSize("");
  };

  const handleEditClick = (item: Item) => {
    setEditingItem(item);
    setEditFormData({
      item_name: item.item_name || "",
      size: item.size || "",
      weight: item.weight || "",
      price: item.price?.toString() || "",
      cost_price: item.cost_price?.toString() || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    const { error } = await supabase
      .from("items")
      .update({
        item_name: editFormData.item_name,
        particulars: editFormData.item_name, // Keep particulars in sync with item_name
        size: editFormData.size || null,
        weight: editFormData.weight || null,
        price: editFormData.price ? parseFloat(editFormData.price) : null,
        cost_price: editFormData.cost_price ? parseFloat(editFormData.cost_price) : null,
      })
      .eq("id", editingItem.id);

    if (error) {
      toast({
        title: "Error updating item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item updated",
      description: "Item details have been updated successfully",
    });

    setEditDialogOpen(false);
    setEditingItem(null);
    loadItems(); // Refresh the list
  };

  const handlePrintLabel = (item: Item) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const priceLabel = item.price ? formatPriceLabel(item.price) : '-';
    const weightLabel = item.weight ? formatWeightLabel(item.weight) : '-';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label - ${item.item_code}</title>
        <style>
          @page { size: 110mm 28mm; margin: 0; }
          body {
            margin: 0;
            padding: 2mm;
            font-family: Arial, sans-serif;
            width: 110mm;
            height: 28mm;
            box-sizing: border-box;
          }
          .label-container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            grid-template-rows: repeat(3, 1fr);
            gap: 1mm;
            height: 100%;
            font-size: 9pt;
          }
          .cell {
            border: 1px solid #000;
            padding: 1.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .label {
            font-weight: bold;
            margin-right: 2mm;
          }
          .particulars-cell {
            grid-column: 1 / -1;
          }
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="cell">
            <span class="label">Sno:</span>
            <span>${item.item_code.slice(-3)}</span>
          </div>
          <div class="cell">
            <span class="label">Item Code:</span>
            <span>${item.item_code}</span>
          </div>
          <div class="cell">
            <span class="label">Barcode:</span>
            <span>${item.item_code}</span>
          </div>
          
          <div class="cell particulars-cell">
            <span class="label">Particulars:</span>
            <span>${item.particulars || '-'}</span>
          </div>
          
          <div class="cell">
            <span class="label">Price:</span>
            <span>${priceLabel}</span>
          </div>
          <div class="cell">
            <span class="label">Size:</span>
            <span>${item.size || '-'}</span>
          </div>
          <div class="cell">
            <span class="label">Weight:</span>
            <span>${weightLabel}</span>
          </div>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
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

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Inventory - In Stock</h1>

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by code, name, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={advancedSearchOpen} onOpenChange={setAdvancedSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Search
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Advanced Search Filters</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Item Name</Label>
                    <Input
                      placeholder="Search by name..."
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Weight (g)</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minWeight}
                        onChange={(e) => setMinWeight(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Max Weight (g)</Label>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxWeight}
                        onChange={(e) => setMaxWeight(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Size</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minSize}
                        onChange={(e) => setMinSize(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Max Size</Label>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxSize}
                        onChange={(e) => setMaxSize(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={clearAdvancedSearch}
                    >
                      Clear Filters
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => setAdvancedSearchOpen(false)}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {(nameSearch || minWeight || maxWeight || minSize || maxSize) && (
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="text-muted-foreground">Active filters:</span>
              {nameSearch && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Name: {nameSearch}
                </span>
              )}
              {minWeight && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Min Weight: {minWeight}g
                </span>
              )}
              {maxWeight && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Max Weight: {maxWeight}g
                </span>
              )}
              {minSize && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Min Size: {minSize}
                </span>
              )}
              {maxSize && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                  Max Size: {maxSize}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAdvancedSearch}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Weight (g)</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold">{item.item_code}</TableCell>
                  <TableCell>{item.categories.name}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.size || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.weight || "-"}</TableCell>
                  <TableCell>{item.cost_price ? `₹${item.cost_price}` : "-"}</TableCell>
                  <TableCell>{item.price ? `₹${item.price}` : "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintLabel(item)}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No items found matching your criteria
            </div>
          )}
        </div>

        {/* Edit Item Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Item Details</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4">
                <div>
                  <Label>Item Code</Label>
                  <Input
                    value={editingItem.item_code}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Input
                    value={editingItem.categories.name}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label>Item Name *</Label>
                  <Textarea
                    value={editFormData.item_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, item_name: e.target.value })
                    }
                    placeholder="Enter item name"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Size</Label>
                  <Input
                    value={editFormData.size}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, size: e.target.value })
                    }
                    placeholder='e.g., 6", 10"x8"'
                  />
                </div>

                <div>
                  <Label>Weight (g)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.weight}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, weight: e.target.value })
                    }
                    placeholder="Enter weight in grams"
                  />
                </div>

                <div>
                  <Label>Cost Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.cost_price}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, cost_price: e.target.value })
                    }
                    placeholder="Enter cost price"
                  />
                </div>

                <div>
                  <Label>Selling Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.price}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, price: e.target.value })
                    }
                    placeholder="Enter selling price"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleEditSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Inventory;