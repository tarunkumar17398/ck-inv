import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { formatPriceLabel, formatWeightLabel, formatSizeWithInches } from "@/lib/utils";
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
  rfid_epc: string | null;
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
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
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
    rfid_epc: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
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
  }, [navigate, searchParams]);

  // Reload items when category filter, search, or sort order changes
  useEffect(() => {
    loadItems(true);
  }, [categoryFilter, searchQuery, sortOrder]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const loadItems = async (isInitialLoad = false) => {
    const loadingState = isInitialLoad ? setLoading : setLoadingMore;
    loadingState(true);
    
    const from = isInitialLoad ? 0 : items.length;
    const to = from + 999; // Load 1000 items at a time
    
    // Build query with filters
    let query = supabase
      .from("items")
      .select("*, categories(name, prefix)", { count: 'exact' })
      .eq("status", "in_stock");
    
    // Apply category filter
    if (categoryFilter !== "all") {
      query = query.eq("category_id", categoryFilter);
    }
    
    // Apply search filter ONLY if searchQuery is not empty
    if (searchQuery && searchQuery.trim()) {
      // Search in item_code, item_name only (not in joined table)
      query = query.or(
        `item_code.ilike.%${searchQuery.trim()}%,item_name.ilike.%${searchQuery.trim()}%`
      );
    }
    
    // Apply sort order - CRITICAL: Sort in database before pagination
    query = query.order("item_code", { ascending: sortOrder === "oldest" });
    
    // Apply pagination
    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Load items error:", error);
      toast({
        title: "Error loading items",
        description: error.message,
        variant: "destructive",
      });
      loadingState(false);
      return;
    }

    const newItems = data || [];
    setTotalCount(count || 0);
    
    if (isInitialLoad) {
      setItems(newItems);
    } else {
      setItems([...items, ...newItems]);
    }
    
    // Check if there are more items to load
    setHasMore((from + newItems.length) < (count || 0));
    
    console.log(`Loaded ${newItems.length} items. Total loaded: ${isInitialLoad ? newItems.length : items.length + newItems.length} of ${count || 0}`);
    loadingState(false);
  };

  const filteredItems = items.filter((item) => {
    // Advanced search filters (client-side only, after DB results)
    const matchesName = !nameSearch || 
      item.item_name.toLowerCase().includes(nameSearch.toLowerCase());
    
    const itemWeight = item.weight ? parseFloat(item.weight) : 0;
    const matchesMinWeight = !minWeight || itemWeight >= parseFloat(minWeight);
    const matchesMaxWeight = !maxWeight || itemWeight <= parseFloat(maxWeight);
    
    const itemSize = item.size ? parseFloat(item.size) : 0;
    const matchesMinSize = !minSize || itemSize >= parseFloat(minSize);
    const matchesMaxSize = !maxSize || itemSize <= parseFloat(maxSize);

    return matchesName && matchesMinWeight && matchesMaxWeight && matchesMinSize && matchesMaxSize;
  });
  // No client-side sorting needed - database already sorts by item_code

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
      rfid_epc: item.rfid_epc || "",
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
        size: formatSizeWithInches(editFormData.size),
        weight: editFormData.weight || null,
        price: editFormData.price ? parseFloat(editFormData.price) : null,
        cost_price: editFormData.cost_price ? parseFloat(editFormData.cost_price) : null,
        rfid_epc: editFormData.rfid_epc || null,
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
    loadItems(true); // Reload from beginning
  };

  const handleDeleteItem = async (itemId: string, itemCode: string) => {
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Error deleting item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item deleted",
      description: `${itemCode} has been deleted successfully`,
    });

    loadItems(true); // Reload from beginning
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Inventory - In Stock</h1>
          {!loading && totalCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {items.length} of {totalCount} items
              {categoryFilter !== "all" && categories.find(c => c.id === categoryFilter) && 
                ` (${categories.find(c => c.id === categoryFilter)?.name})`
              }
            </div>
          )}
        </div>

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
            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "newest" | "oldest")}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading inventory...</p>
              </div>
            </div>
          ) : (
            <>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete <strong>{item.item_code}</strong> - {item.item_name}?
                              <br />
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteItem(item.id, item.item_code)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredItems.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  No items found matching your criteria
                </div>
              )}
              
              {/* Load More Button */}
              {hasMore && filteredItems.length > 0 && !loading && (
                <div className="p-4 border-t text-center">
                  <Button
                    onClick={() => loadItems(false)}
                    disabled={loadingMore}
                    variant="outline"
                    className="min-w-[200px]"
                  >
                    {loadingMore ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      `Load More (${totalCount - items.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </>
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

                <div>
                  <Label>RFID EPC</Label>
                  <Input
                    value={editFormData.rfid_epc}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, rfid_epc: e.target.value })
                    }
                    placeholder="e.g., A7B700000000000000023303"
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