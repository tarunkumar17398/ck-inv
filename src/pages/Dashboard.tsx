import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Package,
  LogOut,
  BarChart3,
  DollarSign,
  Calendar as CalendarIcon,
  TrendingUp,
  FileCheck,
  Database,
  Barcode,
  Menu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatSizeWithInches } from "@/lib/utils";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { GlobalSearch } from "@/components/GlobalSearch";
import { RecentActivity } from "@/components/RecentActivity";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryStats {
  id: string;
  name: string;
  prefix: string;
  stock_count: number;
}

const Dashboard = () => {
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [salesDate, setSalesDate] = useState<Date>(new Date());
  const [itemCode, setItemCode] = useState("");
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [soldPrice, setSoldPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadCategories();
  }, []);

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

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const QuickLinks = () => (
    <>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/inventory")}>
        <Package className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">View All Inventory</span>
      </Button>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/sold-items")}>
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">Sold Items History</span>
      </Button>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/categories")}>
        <Package className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">Manage Categories</span>
      </Button>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/reports")}>
        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">Business Reports</span>
      </Button>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/barcode-print")}>
        <Barcode className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">Barcode Printer</span>
      </Button>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/stock-analysis")}>
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">Stock Analysis</span>
      </Button>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/stock-print")}>
        <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">Stock Print</span>
      </Button>
      <Button variant="outline" className="h-16 sm:h-24 text-sm sm:text-lg justify-start sm:justify-center px-4" onClick={() => navigate("/backup-restore")}>
        <Database className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
        <span className="truncate">Backup & Restore</span>
      </Button>
    </>
  );

  const handleFetchItemDetails = async () => {
    if (!itemCode.trim()) return;

    setLoading(true);
    const code = itemCode.trim().toUpperCase();
    
    // First, try to find in regular items table
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("*, categories(name, prefix)")
      .eq("item_code", code)
      .eq("status", "in_stock")
      .maybeSingle();

    if (itemError) {
      setLoading(false);
      toast({
        title: "Error fetching item",
        description: itemError.message,
        variant: "destructive",
      });
      return;
    }

    if (itemData) {
      setLoading(false);
      setItemDetails({ ...itemData, isPiece: false });
      setSoldPrice(itemData.price?.toString() || "");
      return;
    }

    // If not found in items, check Panchaloha pieces (item_pieces table)
    const { data: pieceData, error: pieceError } = await supabase
      .from("item_pieces")
      .select("*, subcategories(subcategory_name, category_id, categories(name, prefix))")
      .eq("piece_code", code)
      .eq("status", "available")
      .maybeSingle();

    setLoading(false);

    if (pieceError) {
      toast({
        title: "Error fetching item",
        description: pieceError.message,
        variant: "destructive",
      });
      return;
    }

    if (!pieceData) {
      toast({
        title: "Item not found",
        description: "No in-stock item found with this code",
        variant: "destructive",
      });
      setItemDetails(null);
      return;
    }

    // Map piece data to a consistent format
    setItemDetails({
      id: pieceData.id,
      item_code: pieceData.piece_code,
      item_name: pieceData.subcategories?.subcategory_name || "Panchaloha Item",
      categories: pieceData.subcategories?.categories,
      size: null,
      weight: null,
      price: pieceData.cost_price,
      notes: pieceData.notes,
      isPiece: true,
    });
    setSoldPrice(pieceData.cost_price?.toString() || "");
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
    let error;

    if (itemDetails.isPiece) {
      // Update item_pieces table for Panchaloha items
      const { error: pieceError } = await supabase
        .from("item_pieces")
        .update({
          status: "sold",
          date_sold: salesDate.toISOString(),
        })
        .eq("id", itemDetails.id);
      error = pieceError;
    } else {
      // Update items table for regular items
      const { error: itemError } = await supabase
        .from("items")
        .update({
          status: "sold",
          sold_price: parseFloat(soldPrice),
          sold_date: salesDate.toISOString(),
        })
        .eq("id", itemDetails.id);
      error = itemError;
    }

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

    // Reset form but keep dialog open for batch entry
    setItemCode("");
    setItemDetails(null);
    setSoldPrice("");
    // salesDate is intentionally NOT reset - keeps previous date for batch entry
    loadCategories(); // Refresh stats
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground">CK</h1>
              <p className="text-xs text-muted-foreground">Inventory Dashboard</p>
            </div>
          </div>
          
          {/* Desktop search */}
          <div className="hidden md:block flex-1 max-w-md">
            <GlobalSearch />
          </div>
          
          <div className="flex items-center gap-2">
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="py-4">
                    <h3 className="font-semibold mb-4">Quick Links</h3>
                    <div className="space-y-2">
                      <QuickLinks />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="sm:hidden">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Mobile search - sticky below header */}
        <div className="md:hidden px-4 pb-3">
          <GlobalSearch />
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        </div>

        {/* Action buttons - responsive grid */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Button onClick={() => navigate("/add-item")} className="h-12 sm:h-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
          <Button onClick={() => setSalesDialogOpen(true)} variant="default" className="h-12 sm:h-auto">
            <DollarSign className="w-4 h-4 mr-2" />
            Sales Entry
          </Button>
          <Button onClick={() => navigate("/data-importer")} variant="secondary" className="h-12 sm:h-auto col-span-2 sm:col-span-1">
            <Database className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Category Stock Overview - takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-foreground">Category Stock Overview</h3>
            
            {/* Mobile: Horizontal scroll, Desktop: Grid */}
            {isMobile ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-4">
                  {categories.map((cat) => (
                    <Card
                      key={cat.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow flex-shrink-0 w-40"
                      onClick={() => {
                        if (cat.name === "Panchaloha Idols") {
                          navigate("/panchaloha-subcategories");
                        } else {
                          navigate(`/inventory?category=${cat.id}`);
                        }
                      }}
                    >
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm line-clamp-1">{cat.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">CK{cat.prefix}</p>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-primary">{cat.stock_count}</div>
                        <p className="text-xs text-muted-foreground mt-1">in stock</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <Card
                    key={cat.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
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
            )}
          </div>

          {/* Recent Activity Widget */}
          <div className="lg:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* Quick Links - Hidden on mobile (shown in sheet menu) */}
        {!isMobile && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Quick Links</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickLinks />
            </div>
          </div>
        )}
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
