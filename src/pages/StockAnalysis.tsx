import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  size: string | null;
  weight: string | null;
  price: number | null;
  category_id: string;
  status: string;
  categories: { name: string; prefix: string };
}

interface Category {
  id: string;
  name: string;
  prefix: string;
}

interface CategoryStats {
  category: string;
  items: number;
  totalWeight: number;
  avgWeight: number;
}

interface PanchalohaStats {
  totalPieces: number;
  availablePieces: number;
  soldPieces: number;
  totalValue: number;
}

const StockAnalysis = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("in_stock");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [drilldownData, setDrilldownData] = useState<{
    category: string;
    items: Item[];
  } | null>(null);
  const [bucketDetails, setBucketDetails] = useState<{
    type: string;
    min: number;
    max: number;
    items: Item[];
  } | null>(null);
  const [panchalohaStats, setPanchalohaStats] = useState<PanchalohaStats | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadItems();
    loadPanchalohaStats();
  }, [statusFilter]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };

  const loadItems = async () => {
    try {
      let allItems: Item[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("items")
          .select("*, categories(name, prefix)")
          .eq("status", statusFilter)
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) {
          toast({
            title: "Error loading items",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allItems = [...allItems, ...data];
          from += batchSize;
          
          if (data.length < batchSize) {
            hasMore = false;
          }
        }
      }

      setItems(allItems);
      toast({
        title: "Analysis Updated",
        description: `Loaded ${allItems.length} items for analysis`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadPanchalohaStats = async () => {
    try {
      // Get all Panchaloha pieces
      const { data: pieces, error } = await supabase
        .from("item_pieces")
        .select("status, cost_price");

      if (error) {
        console.error("Error loading Panchaloha stats:", error);
        return;
      }

      if (!pieces) {
        setPanchalohaStats(null);
        return;
      }

      const available = pieces.filter(p => p.status === "available");
      const sold = pieces.filter(p => p.status === "sold");
      const totalValue = available.reduce((sum, p) => sum + (p.cost_price || 0), 0);

      setPanchalohaStats({
        totalPieces: pieces.length,
        availablePieces: available.length,
        soldPieces: sold.length,
        totalValue,
      });
    } catch (error: any) {
      console.error("Error loading Panchaloha stats:", error);
    }
  };

  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(item => item.category_id === selectedCategory);

  // Analysis calculations
  const totalItems = filteredItems.length;
  const weights = filteredItems.map(i => parseFloat(i.weight || "0")).filter(w => w > 0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const avgWeight = weights.length ? totalWeight / weights.length : 0;
  const missingSize = filteredItems.filter(i => !i.size || !i.size.trim()).length;

  // Weight distribution buckets (in grams)
  const weightBuckets = [
    { label: "0-1000g", min: 0, max: 1000 },
    { label: "1000-2000g", min: 1000, max: 2000 },
    { label: "2000-5000g", min: 2000, max: 5000 },
    { label: "5000-10000g", min: 5000, max: 10000 },
    { label: "10000-20000g", min: 10000, max: 20000 },
    { label: "20000-30000g", min: 20000, max: 30000 },
    { label: "30000-40000g", min: 30000, max: 40000 },
    { label: "40000+g", min: 40000, max: Infinity },
  ];

  const weightDistribution = weightBuckets.map(bucket => ({
    name: bucket.label,
    count: weights.filter(w => w >= bucket.min && w < bucket.max).length,
    min: bucket.min,
    max: bucket.max,
  }));

  // Categorize by item type (based on item_name)
  const itemTypes = [
    "Ganesh", "Lakshmi", "Saraswathi", "Nataraja", "Vishnu",
    "Krishna", "Parvathi", "Cow with Calf", "Balaji", "Buddha",
    "Hanuman", "Murugan", "Pavaivillaku"
  ];

  const categoryStats: CategoryStats[] = [];
  const categorizedItems = new Map<string, Item[]>();

  // Initialize maps
  itemTypes.forEach(type => categorizedItems.set(type, []));
  categorizedItems.set("Other", []);

  // Categorize items
  filteredItems.forEach(item => {
    const name = (item.item_name || "").toLowerCase();
    let matched = false;
    
    for (const type of itemTypes) {
      if (name.includes(type.toLowerCase())) {
        categorizedItems.get(type)?.push(item);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      categorizedItems.get("Other")?.push(item);
    }
  });

  // Calculate stats for each category
  categorizedItems.forEach((items, category) => {
    if (items.length > 0) {
      const catWeights = items.map(i => parseFloat(i.weight || "0")).filter(w => w > 0);
      const catTotal = catWeights.reduce((a, b) => a + b, 0);
      categoryStats.push({
        category,
        items: items.length,
        totalWeight: catTotal,
        avgWeight: catWeights.length ? catTotal / catWeights.length : 0,
      });
    }
  });

  categoryStats.sort((a, b) => b.items - a.items);

  const handleCategoryClick = (category: string) => {
    const items = categorizedItems.get(category) || [];
    setDrilldownData({ category, items });
    setBucketDetails(null);
  };

  const handleBucketClick = (type: string, min: number, max: number) => {
    if (!drilldownData) return;

    let matches: Item[] = [];
    if (type === "weight") {
      matches = drilldownData.items.filter(item => {
        const w = parseFloat(item.weight || "0");
        return w >= min && w < max;
      });
    } else {
      matches = drilldownData.items.filter(item => {
        const h = parseHeight(item.size || "");
        return h >= min && h < max;
      });
    }

    setBucketDetails({ type, min, max, items: matches });
  };

  const parseHeight = (sizeStr: string): number => {
    if (!sizeStr) return 0;
    const s = sizeStr.toLowerCase().replace(/cm|inch|in\.|inches|mm|kgs?|kg|"|"|′|'/g, '');
    let m = s.match(/h(?:eight)?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
    if (m) return parseFloat(m[1]);
    m = s.match(/(\d+(?:\.\d+)?)\s*[x×]/i);
    if (m) return parseFloat(m[1]);
    m = s.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  };

  const getDrilldownWeightDistribution = () => {
    if (!drilldownData) return [];
    const buckets = [
      { label: "10-1000g", min: 10, max: 1000 },
      { label: "1000-2000g", min: 1000, max: 2000 },
      { label: "2000-3000g", min: 2000, max: 3000 },
      { label: "3000-4000g", min: 3000, max: 4000 },
      { label: "4000-5000g", min: 4000, max: 5000 },
      { label: "5000-7000g", min: 5000, max: 7000 },
      { label: "7000-10000g", min: 7000, max: 10000 },
      { label: "10000-12000g", min: 10000, max: 12000 },
      { label: "12000-15000g", min: 12000, max: 15000 },
      { label: "15000-17000g", min: 15000, max: 17000 },
      { label: "17000-20000g", min: 17000, max: 20000 },
      { label: "20000-25000g", min: 20000, max: 25000 },
      { label: "25000+g", min: 25000, max: Infinity },
    ];

    const weights = drilldownData.items.map(i => parseFloat(i.weight || "0"));
    return buckets.map(b => ({
      bucket: b.label,
      count: weights.filter(w => w >= b.min && w < b.max).length,
      min: b.min,
      max: b.max,
    }));
  };

  const getDrilldownHeightDistribution = () => {
    if (!drilldownData) return [];
    const buckets = [
      { label: "1-3in", min: 1, max: 3 },
      { label: "3-5in", min: 3, max: 5 },
      { label: "5-6in", min: 5, max: 6 },
      { label: "6-8in", min: 6, max: 8 },
      { label: "8-10in", min: 8, max: 10 },
      { label: "10-12in", min: 10, max: 12 },
      { label: "12-15in", min: 12, max: 15 },
      { label: "15-18in", min: 15, max: 18 },
      { label: "18-22in", min: 18, max: 22 },
      { label: "22-25in", min: 22, max: 25 },
      { label: "25-30in", min: 25, max: 30 },
      { label: "30-36in", min: 30, max: 36 },
      { label: "36+in", min: 36, max: Infinity },
    ];

    const heights = drilldownData.items.map(i => parseHeight(i.size || "")).filter(h => h > 0);
    return buckets.map(b => ({
      bucket: b.label,
      count: heights.filter(h => h >= b.min && h < b.max).length,
      min: b.min,
      max: b.max,
    }));
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
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Stock Analysis</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_stock">In Stock Items</SelectItem>
              <SelectItem value="sold">Sold Items</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select category" />
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

          <Button onClick={() => setShowAnalysis(!showAnalysis)} variant="default">
            {showAnalysis ? "Hide Analysis" : "Show Analysis"}
          </Button>

          <Button onClick={() => { setDrilldownData(null); setBucketDetails(null); }} variant="outline">
            Reset
          </Button>
        </div>

        {showAnalysis && (
          <div className="space-y-6">
            {/* Panchaloha Idols Stats - only show when Panchaloha category is selected */}
            {panchalohaStats && categories.find(c => c.id === selectedCategory)?.name === "Panchaloha Idols" && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">Panchaloha Idols</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pieces</p>
                      <p className="text-xl font-bold">{panchalohaStats.totalPieces}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-xl font-bold text-green-600">{panchalohaStats.availablePieces}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sold</p>
                      <p className="text-xl font-bold text-orange-600">{panchalohaStats.soldPieces}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stock Value</p>
                      <p className="text-xl font-bold text-primary">₹{panchalohaStats.totalValue.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Weight</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalWeight.toFixed(2)} g</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Weight</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgWeight.toFixed(2)} g</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Missing Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{missingSize.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Weight Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weight Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weightDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle>Item Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total Weight</TableHead>
                        <TableHead>Avg Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryStats.map((stat) => (
                        <TableRow
                          key={stat.category}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => handleCategoryClick(stat.category)}
                        >
                          <TableCell className="font-medium">{stat.category}</TableCell>
                          <TableCell>{stat.items}</TableCell>
                          <TableCell>{stat.totalWeight.toFixed(2)} g</TableCell>
                          <TableCell>{stat.avgWeight.toFixed(2)} g</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Drilldown Section */}
            {drilldownData && (
              <Card>
                <CardHeader>
                  <CardTitle>{drilldownData.category} — Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weight Distribution */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead colSpan={2}>Weight Distribution</TableHead>
                          </TableRow>
                          <TableRow>
                            <TableHead>Bucket</TableHead>
                            <TableHead>Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getDrilldownWeightDistribution().map((row) => (
                            <TableRow
                              key={row.bucket}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => handleBucketClick("weight", row.min, row.max)}
                            >
                              <TableCell>{row.bucket}</TableCell>
                              <TableCell>{row.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Height Distribution */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead colSpan={2}>Height Distribution</TableHead>
                          </TableRow>
                          <TableRow>
                            <TableHead>Bucket</TableHead>
                            <TableHead>Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getDrilldownHeightDistribution().map((row) => (
                            <TableRow
                              key={row.bucket}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => handleBucketClick("height", row.min, row.max)}
                            >
                              <TableCell>{row.bucket}</TableCell>
                              <TableCell>{row.count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Bucket Details */}
                  {bucketDetails && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bucketDetails.items.length > 0 ? (
                            bucketDetails.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-mono">{item.item_code}</TableCell>
                                <TableCell>{item.item_name}</TableCell>
                                <TableCell>{item.size || "-"}</TableCell>
                                <TableCell>{item.weight || "-"}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No items in this bucket
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!showAnalysis && (
          <div className="text-center py-12 text-muted-foreground">
            Click "Show Analysis" to view stock analysis
          </div>
        )}
      </main>
    </div>
  );
};

export default StockAnalysis;
