import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Package,
  LogOut,
  Search,
  Upload,
  BarChart3,
  DollarSign,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  TrendingUp,
  FileCheck,
  Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatSizeWithInches } from "@/lib/utils";
import { format } from "date-fns";

interface CategoryStats {
  id: string;
  name: string;
  prefix: string;
  stock_count: number;
}

const Dashboard = () => {
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [salesDate, setSalesDate] = useState<Date>(new Date());
  const [itemCode, setItemCode] = useState("");
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [loading, setLoading] = useState(false);
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
    const { data: categoriesData, error: catError } = await supabase.from("categories").select("*").order("name");

    if (catError) {
      toast({
        title: "Error loading categories",
        description: catError.message,
        variant: "destructive",
      });
      return;
    }

    // Get stock count for each category
    const statsPromises = categoriesData.map(async (cat) => {
      let count = 0;
      
      // Special handling for Panchaloha Idols - count pieces
      if (cat.name === "Panchaloha Idols") {
        // Get all subcategories for this category
        const { data: subcats } = await supabase
          .from("subcategories")
          .select("id")
          .eq("category_id", cat.id);

        if (subcats && subcats.length > 0) {
          const subcatIds = subcats.map(s => s.id);
          const { count: pieceCount } = await supabase
            .from("item_pieces")
            .select("*", { count: "exact", head: true })
            .in("subcategory_id", subcatIds)
            .eq("status", "available");
          
          count = pieceCount || 0;
        }
      } else {
        // Regular items count
        const { count: itemCount } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("category_id", cat.id)
          .eq("status", "in_stock");
        
        count = itemCount || 0;
      }

      return {
        ...cat,
        stock_count: count,
      };
    });

    const stats = await Promise.all(statsPromises);
    setCategories(stats);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_logged_in");
    navigate("/");
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/inventory?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate("/inventory");
    }
  };

  const handleFetchItemDetails = async () => {
    if (!itemCode.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*, categories(name, prefix)")
      .eq("item_code", itemCode.trim().toUpperCase())
      .eq("status", "in_stock")
      .maybeSingle();

    setLoading(false);

    if (error) {
      toast({
        title: "Error fetching item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (!data) {
      toast({
        title: "Item not found",
        description: "No in-stock item found with this code",
        variant: "destructive",
      });
      setItemDetails(null);
      return;
    }

    setItemDetails(data);
    setSoldPrice(data.price?.toString() || "");
  };

  const handleSalesEntry = async () => {
    if (!itemDetails) {
      toast({
        title: "No item selected",
        description: "Please enter a valid item code first",
        variant: "destructive",
      });
      return;
    }

    if (!soldPrice) {
      toast({
        title: "Missing price",
        description: "Please enter the sold price",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("items")
      .update({
        status: "sold",
        sold_price: parseFloat(soldPrice),
        sold_date: salesDate.toISOString(),
      })
      .eq("id", itemDetails.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error recording sale",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sale recorded",
      description: `${itemDetails.item_code} marked as sold`,
    });

    // Reset form but keep dialog open
    setItemCode("");
    setItemDetails(null);
    setSoldPrice("");
    setSalesDate(new Date());
    loadCategories(); // Refresh stats
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CK</h1>
              <p className="text-xs text-muted-foreground">Inventory Dashboard</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by code, name, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={handleSearch} variant="secondary">
            Search
          </Button>
          <Button onClick={() => navigate("/add-item")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
          <Button onClick={() => navigate("/data-importer")} variant="secondary">
            <Database className="w-4 h-4 mr-2" />
            Import CSV Data
          </Button>
          <Button onClick={() => setSalesDialogOpen(true)} variant="default">
            <DollarSign className="w-4 h-4 mr-2" />
            Sales Entry
          </Button>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-foreground">Category Stock Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Card
                key={cat.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  // Special handling for Panchaloha Idols
                  if (cat.name === "Panchaloha Idols") {
                    navigate("/panchaloha-subcategories");
                  } else {
                    navigate(`/inventory?category=${cat.id}`);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{cat.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">CK{cat.prefix}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{cat.stock_count}</div>
                  <p className="text-sm text-muted-foreground mt-1">items in stock</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/inventory")}>
            <Package className="w-6 h-6 mr-2" />
            View All Inventory
          </Button>
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/sold-items")}>
            Sold Items History
          </Button>
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/categories")}>
            Manage Categories
          </Button>
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/reports")}>
            <BarChart3 className="w-6 h-6 mr-2" />
            Business Reports
          </Button>
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/export-data")}>
            <FileSpreadsheet className="w-6 h-6 mr-2" />
            Export to Access
          </Button>
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/stock-analysis")}>
            <TrendingUp className="w-6 h-6 mr-2" />
            Stock Analysis
          </Button>
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/stock-print")}>
            <FileCheck className="w-6 h-6 mr-2" />
            Stock Print
          </Button>
          <Button variant="outline" className="h-24 text-lg" onClick={() => navigate("/backup-restore")}>
            <Database className="w-6 h-6 mr-2" />
            Backup & Restore
          </Button>
        </div>
      </main>

      <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sales Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !salesDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {salesDate ? format(salesDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={salesDate}
                    onSelect={(date) => {
                      if (date) {
                        setSalesDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Item Code</Label>
              <div className="flex gap-2">
                <Input
                  value={itemCode}
                  onChange={(e) => {
                    setItemCode(e.target.value.toUpperCase());
                    setItemDetails(null);
                  }}
                  placeholder="Enter item code"
                  onKeyDown={(e) => e.key === "Enter" && handleFetchItemDetails()}
                />
                <Button onClick={handleFetchItemDetails} disabled={loading || !itemCode.trim()} variant="secondary">
                  Fetch
                </Button>
              </div>
            </div>

            {itemDetails && (
              <>
                <div className="bg-muted p-3 rounded-md space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">Name:</span> {itemDetails.item_name}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Category:</span> {itemDetails.categories.name}
                  </p>
                  {itemDetails.size && (
                    <p className="text-sm">
                      <span className="font-semibold">Size:</span> {formatSizeWithInches(itemDetails.size) || "-"}
                    </p>
                  )}
                  {itemDetails.weight && (
                    <p className="text-sm">
                      <span className="font-semibold">Weight:</span> {itemDetails.weight}g
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-semibold">Original Price:</span> ₹{itemDetails.price || "-"}
                  </p>
                </div>

                <div>
                  <Label>Sold Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    placeholder="Enter sold price"
                  />
                </div>

                <Button onClick={handleSalesEntry} className="w-full" disabled={loading || !soldPrice}>
                  {loading ? "Recording..." : "Record Sale"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
