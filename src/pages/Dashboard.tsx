import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, LogOut, Search, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CategoryStats {
  id: string;
  name: string;
  prefix: string;
  stock_count: number;
}

const Dashboard = () => {
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
    const { data: categoriesData, error: catError } = await supabase
      .from("categories")
      .select("*")
      .order("name");

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
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("category_id", cat.id)
        .eq("status", "in_stock");

      return {
        ...cat,
        stock_count: count || 0,
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CraftKey</h1>
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
          <p className="text-muted-foreground">Manage your art & handicraft inventory</p>
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
          <Button onClick={() => navigate("/bulk-import")} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-foreground">Category Stock Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Card
                key={cat.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/inventory?category=${cat.id}`)}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-24 text-lg"
            onClick={() => navigate("/inventory")}
          >
            <Package className="w-6 h-6 mr-2" />
            View All Inventory
          </Button>
          <Button
            variant="outline"
            className="h-24 text-lg"
            onClick={() => navigate("/sold-items")}
          >
            Sold Items History
          </Button>
          <Button
            variant="outline"
            className="h-24 text-lg"
            onClick={() => navigate("/categories")}
          >
            Manage Categories
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;