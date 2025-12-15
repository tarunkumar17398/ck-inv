import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, DollarSign, Package, ShoppingCart, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

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
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadReportData();
  }, [dateRange, selectedCategory, customStartDate, customEndDate]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const loadReportData = async () => {
    setLoading(true);
    
    let startDate: Date;
    let endDate: Date;
    
    // Handle custom date range
    if (dateRange === "custom" && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const monthsToLoad = dateRange === "3months" ? 3 : dateRange === "6months" ? 6 : 12;
      startDate = subMonths(new Date(), monthsToLoad - 1);
      endDate = new Date();
    }
    
    const monthsData: SalesData[] = [];
    
    // Get Panchaloha Idols category ID
    const { data: piCategory } = await supabase
      .from("categories")
      .select("id")
      .eq("name", "Panchaloha Idols")
      .single();
    const piCategoryId = piCategory?.id;
    
    // Generate monthly sales data
    if (dateRange === "custom" && customStartDate && customEndDate) {
      // For custom range, query once and group by month
      let itemsQuery = supabase
        .from("items")
        .select("sold_price, sold_date, category_id")
        .eq("status", "sold")
        .gte("sold_date", customStartDate.toISOString())
        .lte("sold_date", customEndDate.toISOString());
      
      if (selectedCategory !== "all") {
        itemsQuery = itemsQuery.eq("category_id", selectedCategory);
      }
      
      const { data: soldItems } = await itemsQuery;
      
      // Also fetch from item_pieces if Panchaloha is selected or all categories
      let soldPieces: any[] = [];
      if (selectedCategory === "all" || selectedCategory === piCategoryId) {
        const { data: pieces } = await supabase
          .from("item_pieces")
          .select("cost_price, date_sold")
          .eq("status", "sold")
          .gte("date_sold", customStartDate.toISOString())
          .lte("date_sold", customEndDate.toISOString());
        soldPieces = pieces || [];
      }
      
      // Group by month
      const monthsMap = new Map<string, { revenue: number; count: number }>();
      
      soldItems?.forEach((item) => {
        const month = format(new Date(item.sold_date!), "MMM yyyy");
        const existing = monthsMap.get(month) || { revenue: 0, count: 0 };
        monthsMap.set(month, {
          revenue: existing.revenue + (item.sold_price || 0),
          count: existing.count + 1,
        });
      });
      
      // Add Panchaloha pieces to the same map
      soldPieces.forEach((piece) => {
        const month = format(new Date(piece.date_sold!), "MMM yyyy");
        const existing = monthsMap.get(month) || { revenue: 0, count: 0 };
        monthsMap.set(month, {
          revenue: existing.revenue + (piece.cost_price || 0), // Using cost_price as sold_price for pieces
          count: existing.count + 1,
        });
      });
      
      monthsMap.forEach((value, month) => {
        monthsData.push({
          month,
          sales: value.count,
          items_sold: value.count,
          revenue: value.revenue,
        });
      });
    } else {
      // Original monthly logic for predefined ranges
      const monthsToLoad = dateRange === "3months" ? 3 : dateRange === "6months" ? 6 : 12;
      
      for (let i = monthsToLoad - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        let itemsQuery = supabase
          .from("items")
          .select("sold_price, category_id")
          .eq("status", "sold")
          .gte("sold_date", monthStart.toISOString())
          .lte("sold_date", monthEnd.toISOString());
        
        if (selectedCategory !== "all") {
          itemsQuery = itemsQuery.eq("category_id", selectedCategory);
        }
        
        const { data: soldItems } = await itemsQuery;
        
        // Also fetch from item_pieces if Panchaloha is selected or all categories
        let soldPieces: any[] = [];
        if (selectedCategory === "all" || selectedCategory === piCategoryId) {
          const { data: pieces } = await supabase
            .from("item_pieces")
            .select("cost_price")
            .eq("status", "sold")
            .gte("date_sold", monthStart.toISOString())
            .lte("date_sold", monthEnd.toISOString());
          soldPieces = pieces || [];
        }
        
        const itemsRevenue = soldItems?.reduce((sum, item) => sum + (item.sold_price || 0), 0) || 0;
        const piecesRevenue = soldPieces.reduce((sum, piece) => sum + (piece.cost_price || 0), 0);
        const revenue = itemsRevenue + piecesRevenue;
        const totalCount = (soldItems?.length || 0) + soldPieces.length;
        
        monthsData.push({
          month: format(date, "MMM yyyy"),
          sales: totalCount,
          items_sold: totalCount,
          revenue: revenue,
        });
      }
    }
    
    setMonthlyData(monthsData);
    
    // Load category-wise sales
    const { data: allCategories } = await supabase.from("categories").select("*");
    const categorySales: CategorySales[] = [];
    
    for (const cat of allCategories || []) {
      if (cat.name === "Panchaloha Idols") {
        // Fetch from item_pieces for Panchaloha Idols
        const { data: soldPieces } = await supabase
          .from("item_pieces")
          .select("cost_price")
          .eq("status", "sold");
        
        const revenue = soldPieces?.reduce((sum, piece) => sum + (piece.cost_price || 0), 0) || 0;
        
        categorySales.push({
          name: cat.name,
          total_sales: soldPieces?.length || 0,
          items_sold: soldPieces?.length || 0,
          revenue: revenue,
        });
      } else {
        // Fetch from items for other categories
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
    }
    
    setCategoryData(categorySales.filter(c => c.total_sales > 0));
    
    // Calculate key metrics
    await calculateMetrics(monthsData, piCategoryId);
    
    setLoading(false);
  };

  const calculateMetrics = async (monthsData: SalesData[], piCategoryId?: string) => {
    const currentMonth = monthsData[monthsData.length - 1];
    const previousMonth = monthsData[monthsData.length - 2];
    
    // Total revenue
    const totalRevenue = monthsData.reduce((sum, m) => sum + m.revenue, 0);
    const revenueChange = previousMonth && previousMonth.revenue > 0
      ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1)
      : "0";
    
    // Total items sold
    const totalItemsSold = monthsData.reduce((sum, m) => sum + m.items_sold, 0);
    const itemsChange = previousMonth && previousMonth.items_sold > 0
      ? ((currentMonth.items_sold - previousMonth.items_sold) / previousMonth.items_sold * 100).toFixed(1)
      : "0";
    
    // Average sale price
    const avgSalePrice = totalItemsSold > 0 ? (totalRevenue / totalItemsSold).toFixed(0) : "0";
    
    // Current stock count (items + pieces)
    const { count: itemsStockCount } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_stock");
    
    const { count: piecesStockCount } = await supabase
      .from("item_pieces")
      .select("*", { count: "exact", head: true })
      .eq("status", "available");
    
    const stockCount = (itemsStockCount || 0) + (piecesStockCount || 0);
    
    // Total stock value (based on cost prices from items + pieces)
    const { data: stockItems } = await supabase
      .from("items")
      .select("cost_price")
      .eq("status", "in_stock");
    
    const { data: stockPieces } = await supabase
      .from("item_pieces")
      .select("cost_price")
      .eq("status", "available");
    
    const itemsStockValue = stockItems?.reduce((sum, item) => sum + (item.cost_price || 0), 0) || 0;
    const piecesStockValue = stockPieces?.reduce((sum, piece) => sum + (piece.cost_price || 0), 0) || 0;
    const stockValue = itemsStockValue + piecesStockValue;

    // Items sold this month (items + pieces)
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);

    const { count: itemsSoldThisMonth } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("status", "sold")
      .gte("sold_date", startOfThisMonth.toISOString());
    
    const { count: piecesSoldThisMonth } = await supabase
      .from("item_pieces")
      .select("*", { count: "exact", head: true })
      .eq("status", "sold")
      .gte("date_sold", startOfThisMonth.toISOString());
    
    const soldThisMonth = (itemsSoldThisMonth || 0) + (piecesSoldThisMonth || 0);
    
    setMetrics([
      {
        title: "Total Stock Value",
        value: `₹${stockValue.toLocaleString("en-IN")}`,
        icon: Package,
        description: "Based on cost prices",
      },
      {
        title: "Total Items in Stock",
        value: stockCount.toString(),
        icon: Package,
        description: "Available for sale",
      },
      {
        title: "Sold This Month",
        value: soldThisMonth.toString(),
        icon: ShoppingCart,
        description: format(new Date(), "MMMM yyyy"),
      },
      {
        title: "Total Revenue",
        value: `₹${totalRevenue.toLocaleString("en-IN")}`,
        change: `${revenueChange}% vs last month`,
        icon: DollarSign,
        description: `Last ${dateRange === "3months" ? "3" : dateRange === "6months" ? "6" : "12"} months`,
      },
      {
        title: "Items Sold (Period)",
        value: totalItemsSold.toString(),
        change: `${itemsChange}% vs last month`,
        icon: ShoppingCart,
        description: "Total units sold in period",
      },
      {
        title: "Average Sale Price",
        value: `₹${avgSalePrice}`,
        icon: TrendingUp,
        description: "Per item average",
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
          <CalendarIcon className="w-8 h-8 text-muted-foreground" />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
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

          {dateRange === "custom" && (
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading reports...</div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
