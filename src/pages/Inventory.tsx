import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Printer, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  size: string | null;
  weight: string | null;
  color_code: string | null;
  price: number | null;
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
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [soldPrice, setSoldPrice] = useState("");
  
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

    const matchesCategory =
      categoryFilter === "all" || item.categories.name === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleSellClick = (item: Item) => {
    setSelectedItem(item);
    setSoldPrice(item.price?.toString() || "");
    setSellDialogOpen(true);
  };

  const handleSell = async () => {
    if (!selectedItem) return;

    const { error } = await supabase
      .from("items")
      .update({
        status: "sold",
        sold_price: soldPrice ? parseFloat(soldPrice) : null,
        sold_date: new Date().toISOString(),
      })
      .eq("id", selectedItem.id);

    if (error) {
      toast({
        title: "Error selling item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item marked as sold",
      description: `${selectedItem.item_code} has been sold`,
    });

    setSellDialogOpen(false);
    loadItems();
  };

  const handlePrintLabel = (item: Item) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label - ${item.item_code}</title>
        <style>
          @page { size: 110mm 28mm; margin: 0; }
          body {
            margin: 0;
            padding: 4mm;
            font-family: Arial, sans-serif;
            width: 110mm;
            height: 28mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header { display: flex; justify-content: space-between; align-items: flex-start; }
          .item-code { font-size: 16px; font-weight: bold; }
          .category-prefix { font-size: 12px; color: #666; }
          .item-name { font-size: 14px; font-weight: 600; margin: 2mm 0; }
          .details { font-size: 10px; color: #444; }
          .barcode-container { text-align: center; margin-top: 2mm; }
          .barcode { font-family: 'Libre Barcode 128', cursive; font-size: 48px; letter-spacing: 0; }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="header">
          <div>
            <div class="item-code">${item.item_code}</div>
            <div class="category-prefix">CK${item.categories.prefix}</div>
          </div>
        </div>
        <div class="item-name">${item.item_name}</div>
        <div class="details">
          ${item.particulars || ""} ${item.size ? "• " + item.size : ""}
        </div>
        <div class="barcode-container">
          <div class="barcode">${item.item_code}</div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold">{item.item_code}</TableCell>
                  <TableCell>{item.categories.name}</TableCell>
                  <TableCell>{item.item_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.particulars || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{item.size || "-"}</TableCell>
                  <TableCell>{item.price ? `₹${item.price}` : "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintLabel(item)}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSellClick(item)}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Sell
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
      </main>

      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Item Code</Label>
              <Input value={selectedItem?.item_code || ""} disabled />
            </div>
            <div>
              <Label>Item Name</Label>
              <Input value={selectedItem?.item_name || ""} disabled />
            </div>
            <div>
              <Label>Sold Price</Label>
              <Input
                type="number"
                step="0.01"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="Enter sold price"
              />
            </div>
            <Button onClick={handleSell} className="w-full">
              Mark as Sold
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;