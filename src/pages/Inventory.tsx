import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, Pencil, Trash2, Printer, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { formatPriceLabel, formatWeightLabel, formatSizeWithInches, cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import bwipjs from "bwip-js";

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
  const [isInitialized, setIsInitialized] = useState(false);
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
  
  // Print queue state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [printQueueOpen, setPrintQueueOpen] = useState(false);
  const [printQueue, setPrintQueue] = useState<Item[]>([]);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const initialSearch = searchParams.get("search");
    const initialCategory = searchParams.get("category");
    
    if (initialSearch) setSearchQuery(initialSearch);
    if (initialCategory) setCategoryFilter(initialCategory);

    loadCategories();
    setIsInitialized(true);
  }, [searchParams]);

  // Reload items when category filter, search, or sort order changes (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      loadItems(true);
    }
  }, [categoryFilter, searchQuery, sortOrder, isInitialized]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const loadItems = async (isInitialLoad = false) => {
    const loadingState = isInitialLoad ? setLoading : setLoadingMore;
    loadingState(true);
    
    const from = isInitialLoad ? 0 : items.length;
    const to = from + 999; // Load 1000 items at a time
    
    console.log('Loading items with filters:', { categoryFilter, searchQuery, sortOrder, isInitialLoad });
    
    // Build query with filters
    let query = supabase
      .from("items")
      .select("*, categories(name, prefix)", { count: 'exact' })
      .eq("status", "in_stock");
    
    // Apply category filter - MUST check for "all" string
    if (categoryFilter && categoryFilter !== "all") {
      console.log('Applying category filter:', categoryFilter);
      query = query.eq("category_id", categoryFilter);
    } else {
      console.log('No category filter applied (showing all)');
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

  // Print queue functions
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const addToPrintQueue = () => {
    const itemsToAdd = filteredItems.filter(item => selectedItems.has(item.id));
    setPrintQueue(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const newItems = itemsToAdd.filter(item => !existingIds.has(item.id));
      return [...prev, ...newItems];
    });
    setSelectedItems(new Set());
    setPrintQueueOpen(true);
    toast({
      title: "Added to print queue",
      description: `${itemsToAdd.length} item(s) added to print queue`,
    });
  };

  const removeFromPrintQueue = (itemId: string) => {
    setPrintQueue(prev => prev.filter(item => item.id !== itemId));
  };

  const clearPrintQueue = () => {
    setPrintQueue([]);
  };

  const printAllLabels = () => {
    if (printQueue.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Pop-up blocked",
        description: "Please allow pop-ups to print labels",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels</title>
        <style>
          @page {
            size: 55mm 30mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
          }
          .label {
            width: 55mm;
            height: 30mm;
            position: relative;
            page-break-after: always;
            overflow: hidden;
          }
          .label:last-child {
            page-break-after: avoid;
          }
          .barcode-container {
            position: absolute;
            left: 2mm;
            top: 8mm;
            width: 10mm;
            height: 18mm;
          }
          .barcode-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .particulars {
            position: absolute;
            left: 11mm;
            top: 4mm;
            width: 44mm;
            max-height: 9mm;
            font-size: 9pt;
            font-weight: 400;
            line-height: 1.2;
            overflow: hidden;
            white-space: normal;
            overflow-wrap: anywhere;
            color: #000;
          }
          .weight-size {
            position: absolute;
            left: 11mm;
            top: 13mm;
            width: 44mm;
            font-size: 8pt;
            overflow: hidden;
            white-space: nowrap;
          }
          .weight-size-line {
            display: flex;
            gap: 2mm;
          }
          .weight-label, .size-label {
            font-weight: 700;
            color: #000;
          }
          .weight-value, .size-value {
            font-weight: 400;
            color: #000;
          }
          .code-price {
            position: absolute;
            left: 11mm;
            top: 21mm;
            width: 44mm;
            display: flex;
            justify-content: space-between;
          }
          .item-code {
            font-size: 9pt;
            font-weight: 700;
            color: #000;
          }
          .price {
            font-size: 9pt;
            font-weight: 700;
            color: #000;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
    `);

    // Generate barcodes for each item
    printQueue.forEach((item) => {
      const canvas = document.createElement("canvas");
      try {
        bwipjs.toCanvas(canvas, {
          bcid: "code128",
          text: item.item_code,
          scale: 3,
          height: 20,
          includetext: false,
          rotate: "L",
        });
        const barcodeDataUrl = canvas.toDataURL("image/png");

        printWindow.document.write(`
          <div class="label">
            <div class="barcode-container">
              <img src="${barcodeDataUrl}" alt="Barcode" />
            </div>
            <div class="particulars">${item.item_name || ""}</div>
            <div class="weight-size">
              <div class="weight-size-line">
                <span><span class="weight-label">Wt:</span> <span class="weight-value">${item.weight ? parseFloat(item.weight).toLocaleString() + "g" : "-"}</span></span>
                <span><span class="size-label">Size:</span> <span class="size-value">${item.size || "-"}</span></span>
              </div>
            </div>
            <div class="code-price">
              <span class="item-code">${item.item_code}</span>
              <span class="price">${item.price ? "₹" + item.price : ""}</span>
            </div>
          </div>
        `);
      } catch (e) {
        console.error("Error generating barcode for", item.item_code, e);
      }
    });

    printWindow.document.write(`</body></html>`);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast({
      title: "Print initiated",
      description: `Printing ${printQueue.length} label(s)`,
    });
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Weight (g)</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>Price Ratio</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                <TableRow key={item.id} className={cn(selectedItems.has(item.id) && "bg-primary/5")}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      aria-label={`Select ${item.item_code}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{item.item_code}</TableCell>
                  <TableCell>{item.categories.name}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.size || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.weight || "-"}</TableCell>
                  <TableCell>{item.cost_price ? `₹${item.cost_price}` : "-"}</TableCell>
                  <TableCell>{item.price ? `₹${item.price}` : "-"}</TableCell>
                  <TableCell>
                    {(() => {
                      const weight = parseFloat(item.weight || "0");
                      const price = parseFloat(item.price?.toString() || "0");
                      if (weight > 0 && price > 0) {
                        const ratio = (price / weight).toFixed(2);
                        const isLow = parseFloat(ratio) < 3;
                        return (
                          <span className={cn(
                            "px-2 py-1 rounded font-semibold",
                            isLow && "bg-red-500 text-white"
                          )}>
                            {ratio}
                          </span>
                        );
                      }
                      return "-";
                    })()}
                  </TableCell>
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

        {/* Floating Selection Bar */}
        {selectedItems.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50">
            <span className="font-medium">{selectedItems.size} item(s) selected</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={addToPrintQueue}
            >
              <Printer className="w-4 h-4 mr-2" />
              Add to Print Queue
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setSelectedItems(new Set())}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Print Queue Dialog */}
        <Dialog open={printQueueOpen} onOpenChange={setPrintQueueOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Print Queue ({printQueue.length} labels)
              </DialogTitle>
            </DialogHeader>
            {printQueue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items in print queue
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {printQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="font-mono font-semibold">{item.item_code}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {item.item_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.weight ? `${parseFloat(item.weight).toLocaleString()}g` : ""} 
                          {item.weight && item.price ? " • " : ""}
                          {item.price ? `₹${item.price}` : ""}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromPrintQueue(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={clearPrintQueue}
                disabled={printQueue.length === 0}
              >
                Clear All
              </Button>
              <Button
                onClick={printAllLabels}
                disabled={printQueue.length === 0}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print All Labels
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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