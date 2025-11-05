import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, DollarSign, Package, ShoppingCart, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface SalesData {
  month: string;
  sales: number;
  items_sold: number;
  revenue: number;
}

interface CategorySales {
  name: string;
  total_sales: number;
  items_sold: number;
  revenue: number;
}

interface MetricCard {
  title: string;
  value: string;
  change?: string;
  icon: any;
  description: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

const Reports = () => {
  const [monthlyData, setMonthlyData] = useState<SalesData[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySales[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [dateRange, setDateRange] = useState("6months");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }
    loadCategories();
    loadReportData();
  }, [navigate, dateRange, selectedCategory]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const loadReportData = async () => {
    setLoading(true);
    
    const monthsToLoad = dateRange === "3months" ? 3 : dateRange === "6months" ? 6 : 12;
    const monthsData: SalesData[] = [];
    
    // Generate monthly sales data
    for (let i = monthsToLoad - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);
      
      let query = supabase
        .from("items")
        .select("sold_price, category_id")
        .eq("status", "sold")
        .gte("sold_date", startDate.toISOString())
        .lte("sold_date", endDate.toISOString());
      
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }
      
      const { data: soldItems } = await query;
      
      const revenue = soldItems?.reduce((sum, item) => sum + (item.sold_price || 0), 0) || 0;
      
      monthsData.push({
        month: format(date, "MMM yyyy"),
        sales: soldItems?.length || 0,
        items_sold: soldItems?.length || 0,
        revenue: revenue,
      });
    }
    
    setMonthlyData(monthsData);
    
    // Load category-wise sales
    const { data: allCategories } = await supabase.from("categories").select("*");
    const categorySales: CategorySales[] = [];
    
    for (const cat of allCategories || []) {
      const { data: soldItems } = await supabase
        .from("items")
        .select("sold_price")
        .eq("status", "sold")
        .eq("category_id", cat.id);
      
      const revenue = soldItems?.reduce((sum, item) => sum + (item.sold_price || 0), 0) || 0;
      
      categorySales.push({
        name: cat.name,
        total_sales: soldItems?.length || 0,
        items_sold: soldItems?.length || 0,
        revenue: revenue,
      });
    }
    
    setCategoryData(categorySales.filter(c => c.total_sales > 0));
    
    // Calculate key metrics
    await calculateMetrics(monthsData);
    
    setLoading(false);
  };

  const calculateMetrics = async (monthsData: SalesData[]) => {
    const currentMonth = monthsData[monthsData.length - 1];
    const previousMonth = monthsData[monthsData.length - 2];
    
    // Total revenue
    const totalRevenue = monthsData.reduce((sum, m) => sum + m.revenue, 0);
    const revenueChange = previousMonth 
      ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1)
      : "0";
    
    // Total items sold
    const totalItemsSold = monthsData.reduce((sum, m) => sum + m.items_sold, 0);
    const itemsChange = previousMonth 
      ? ((currentMonth.items_sold - previousMonth.items_sold) / previousMonth.items_sold * 100).toFixed(1)
      : "0";
    
    // Average sale price
    const avgSalePrice = totalItemsSold > 0 ? (totalRevenue / totalItemsSold).toFixed(0) : "0";
    
    // Current stock count
    const { count: stockCount } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_stock");
    
    // Stock value
    const { data: stockItems } = await supabase
      .from("items")
      .select("price")
      .eq("status", "in_stock");
    
    const stockValue = stockItems?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
    
    setMetrics([
      {
        title: "Total Revenue",
        value: `₹${totalRevenue.toLocaleString("en-IN")}`,
        change: `${revenueChange}% vs last month`,
        icon: DollarSign,
        description: `Last ${dateRange === "3months" ? "3" : dateRange === "6months" ? "6" : "12"} months`,
      },
      {
        title: "Items Sold",
        value: totalItemsSold.toString(),
        change: `${itemsChange}% vs last month`,
        icon: ShoppingCart,
        description: "Total units sold",
      },
      {
        title: "Average Sale Price",
        value: `₹${avgSalePrice}`,
        icon: TrendingUp,
        description: "Per item average",
      },
      {
        title: "Current Stock",
        value: stockCount?.toString() || "0",
        icon: Package,
        description: `Worth ₹${stockValue.toLocaleString("en-IN")}`,
      },
    ]);
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Business Reports</h1>
            <p className="text-muted-foreground">Sales analytics and performance metrics</p>
          </div>
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading reports...</div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {metric.title}
                      </CardTitle>
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metric.value}</div>
                      {metric.change && (
                        <p className="text-xs text-muted-foreground mt-1">{metric.change}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Monthly Sales Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trend</CardTitle>
                  <CardDescription>Revenue generated each month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Revenue (₹)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Sales Volume</CardTitle>
                  <CardDescription>Number of items sold each month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="items_sold" fill="#82ca9d" name="Items Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Category Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Revenue distribution across categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ₹${entry.revenue}`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>Detailed breakdown by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryData.map((cat, index) => (
                      <div key={index} className="flex items-center justify-between pb-3 border-b">
                        <div>
                          <p className="font-semibold">{cat.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cat.items_sold} items sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">₹{cat.revenue.toLocaleString("en-IN")}</p>
                          <p className="text-sm text-muted-foreground">
                            Avg: ₹{(cat.revenue / cat.items_sold).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {categoryData.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No sales data available for selected filters
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Reports;
