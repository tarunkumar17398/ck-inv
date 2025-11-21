import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar as CalendarIcon, Pencil, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatSizeWithInches, cleanSizeDisplay } from "@/lib/utils";

interface SoldItem {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  size: string | null;
  weight: string | null;
  sold_price: number | null;
  sold_date: string | null;
  categories: { name: string; prefix: string; id: string };
}

const SoldItems = () => {
  const [items, setItems] = useState<SoldItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<SoldItem | null>(null);
  const [editForm, setEditForm] = useState({
    particulars: "",
    size: "",
    weight: "",
    sold_price: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }
    loadSoldItems();
    loadCategories();
  }, [navigate]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    setCategories(data || []);
  };

  const loadSoldItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*, categories(id, name, prefix)")
      .eq("status", "sold")
      .order("sold_date", { ascending: false });

    if (error) {
      toast({
        title: "Error loading sold items",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems(data || []);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        searchQuery === "" ||
        item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.particulars?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = 
        selectedCategory === "all" || 
        item.categories.id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const updateSoldDate = async (itemId: string, newDate: Date) => {
    const { error } = await supabase
      .from("items")
      .update({ sold_date: newDate.toISOString() })
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Error updating date",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Date updated",
      description: "Sold date has been updated successfully",
    });

    setEditingDateId(null);
    loadSoldItems();
  };

  const openEditDialog = (item: SoldItem) => {
    setEditingItem(item);
    setEditForm({
      particulars: item.particulars || "",
      size: item.size || "",
      weight: item.weight || "",
      sold_price: item.sold_price?.toString() || "",
    });
  };

  const closeEditDialog = () => {
    setEditingItem(null);
    setEditForm({
      particulars: "",
      size: "",
      weight: "",
      sold_price: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    // Validate sold price
    const soldPrice = parseFloat(editForm.sold_price);
    if (editForm.sold_price && (isNaN(soldPrice) || soldPrice < 0)) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid positive number for sold price",
        variant: "destructive",
      });
      return;
    }

    // Validate weight
    const weight = editForm.weight.trim();
    if (weight && isNaN(parseFloat(weight))) {
      toast({
        title: "Invalid Weight",
        description: "Please enter a valid number for weight",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("items")
      .update({
        particulars: editForm.particulars.trim() || null,
        size: formatSizeWithInches(editForm.size),
        weight: weight || null,
        sold_price: editForm.sold_price ? soldPrice : null,
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

    closeEditDialog();
    loadSoldItems();
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
        <h1 className="text-3xl font-bold text-foreground mb-6">Sold Items History</h1>

        {/* Search and Filter Section */}
        <div className="bg-card rounded-lg border shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item code or particulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredItems.length} of {items.length} sold items
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Sold Price</TableHead>
                <TableHead>Sold Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold">{item.item_code}</TableCell>
                  <TableCell>{item.categories.name}</TableCell>
                  <TableCell>{item.particulars || "-"}</TableCell>
                  <TableCell>{cleanSizeDisplay(item.size)}</TableCell>
                  <TableCell>{item.weight ? `${parseFloat(item.weight).toLocaleString()}g` : "-"}</TableCell>
                  <TableCell className="font-semibold">
                    {item.sold_price ? `₹${item.sold_price}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Popover open={editingDateId === item.id} onOpenChange={(open) => setEditingDateId(open ? item.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "justify-start text-left font-normal p-2 h-auto",
                            !item.sold_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {item.sold_date
                            ? format(new Date(item.sold_date), "MMM dd, yyyy")
                            : "Set date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={item.sold_date ? new Date(item.sold_date) : undefined}
                          onSelect={(date) => date && updateSoldDate(item.id, date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No sold items yet
            </div>
          )}
          {items.length > 0 && filteredItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No items match your search criteria
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={closeEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Sold Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-particulars">Particulars</Label>
                <Input
                  id="edit-particulars"
                  value={editForm.particulars}
                  onChange={(e) => setEditForm({ ...editForm, particulars: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-size">Size</Label>
                <Input
                  id="edit-size"
                  value={editForm.size}
                  onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-weight">Weight (g)</Label>
                <Input
                  id="edit-weight"
                  type="text"
                  value={editForm.weight}
                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                  placeholder="e.g., 100"
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sold-price">Sold Price (₹)</Label>
                <Input
                  id="edit-sold-price"
                  type="number"
                  value={editForm.sold_price}
                  onChange={(e) => setEditForm({ ...editForm, sold_price: e.target.value })}
                  placeholder="e.g., 5000"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SoldItems;