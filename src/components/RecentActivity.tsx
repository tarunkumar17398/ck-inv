import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface RecentItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  date: string;
  price?: number;
}

export function RecentActivity() {
  const [recentlyAdded, setRecentlyAdded] = useState<RecentItem[]>([]);
  const [recentlySold, setRecentlySold] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    setLoading(true);
    try {
      // Load recently added items
      const { data: addedItems } = await supabase
        .from("items")
        .select("id, item_code, item_name, created_at, categories(name)")
        .order("created_at", { ascending: false })
        .limit(10);

      // Load recently added pieces
      const { data: addedPieces } = await supabase
        .from("item_pieces")
        .select("id, piece_code, created_at, subcategories(subcategory_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      // Combine and sort by date
      const combinedAdded: RecentItem[] = [
        ...(addedItems || []).map((item: any) => ({
          id: item.id,
          code: item.item_code,
          name: item.item_name,
          category: item.categories?.name,
          date: item.created_at,
        })),
        ...(addedPieces || []).map((piece: any) => ({
          id: piece.id,
          code: piece.piece_code,
          name: piece.subcategories?.subcategory_name || "Piece",
          category: "Panchaloha",
          date: piece.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      setRecentlyAdded(combinedAdded);

      // Load recently sold items
      const { data: soldItems } = await supabase
        .from("items")
        .select("id, item_code, item_name, sold_date, sold_price")
        .eq("status", "sold")
        .not("sold_date", "is", null)
        .order("sold_date", { ascending: false })
        .limit(10);

      // Load recently sold pieces
      const { data: soldPieces } = await supabase
        .from("item_pieces")
        .select("id, piece_code, date_sold, cost_price, subcategories(subcategory_name)")
        .eq("status", "sold")
        .not("date_sold", "is", null)
        .order("date_sold", { ascending: false })
        .limit(5);

      const combinedSold: RecentItem[] = [
        ...(soldItems || []).map((item: any) => ({
          id: item.id,
          code: item.item_code,
          name: item.item_name,
          date: item.sold_date,
          price: item.sold_price,
        })),
        ...(soldPieces || []).map((piece: any) => ({
          id: piece.id,
          code: piece.piece_code,
          name: piece.subcategories?.subcategory_name || "Piece",
          date: piece.date_sold,
          price: piece.cost_price,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      setRecentlySold(combinedSold);
    } catch (error) {
      console.error("Error loading recent activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const ItemRow = ({ item, showPrice = false }: { item: RecentItem; showPrice?: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{item.code}</span>
          {item.category && (
            <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground hidden sm:inline">
              {item.category}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.name}</p>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        {showPrice && item.price && (
          <p className="font-semibold text-sm">₹{item.price.toLocaleString()}</p>
        )}
        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(item.date)}
        </p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="added" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="added" className="text-sm">
              <Package className="w-4 h-4 mr-1.5" />
              Added
            </TabsTrigger>
            <TabsTrigger value="sold" className="text-sm">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Sold
            </TabsTrigger>
          </TabsList>

          <TabsContent value="added" className="m-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : recentlyAdded.length > 0 ? (
              <div className="space-y-0 max-h-[300px] overflow-y-auto">
                {recentlyAdded.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No recent items added
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3"
              onClick={() => navigate("/inventory")}
            >
              View All Inventory
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </TabsContent>

          <TabsContent value="sold" className="m-0">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : recentlySold.length > 0 ? (
              <div className="space-y-0 max-h-[300px] overflow-y-auto">
                {recentlySold.map((item) => (
                  <ItemRow key={item.id} item={item} showPrice />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No recent sales recorded
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3"
              onClick={() => navigate("/sold-items")}
            >
              View All Sold Items
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
