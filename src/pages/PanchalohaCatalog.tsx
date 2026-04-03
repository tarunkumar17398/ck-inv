import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface CatalogItem {
  id: string;
  subcategory_name: string;
  image_url: string | null;
  height: string | null;
  default_price: number | null;
  available_count: number;
  enabled: boolean;
  costPrice: string;
}

const PanchalohaCatalog = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [multiplier, setMultiplier] = useState("2.0");
  const [showPrices, setShowPrices] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("name", "Panchaloha Idols")
      .maybeSingle();

    if (!category) {
      toast({ title: "Category not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: subcats } = await supabase
      .from("subcategories")
      .select("*")
      .eq("category_id", category.id)
      .order("subcategory_name");

    if (!subcats || subcats.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Fetch piece counts
    const subcategoryIds = subcats.map(s => s.id);
    let allPieces: { subcategory_id: string; status: string }[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch } = await supabase
        .from("item_pieces")
        .select("subcategory_id, status")
        .in("subcategory_id", subcategoryIds)
        .range(from, from + pageSize - 1);

      allPieces = allPieces.concat(batch || []);
      hasMore = (batch?.length || 0) === pageSize;
      from += pageSize;
    }

    const availCounts = allPieces.reduce((acc, p) => {
      if (p.status === "available") acc[p.subcategory_id] = (acc[p.subcategory_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setItems(subcats.map(s => ({
      id: s.id,
      subcategory_name: s.subcategory_name,
      image_url: (s as any).image_url ?? null,
      height: (s as any).height ?? null,
      default_price: s.default_price ?? null,
      available_count: availCounts[s.id] || 0,
      enabled: true,
      costPrice: s.default_price != null ? String(s.default_price) : "",
    })));

    setLoading(false);
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  };

  const updateCostPrice = (id: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, costPrice: value } : i));
  };

  const mult = parseFloat(multiplier) || 1;
  const enabledItems = items.filter(i => i.enabled);

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading catalog data...</p>
      </div>
    );
  }

  if (showPreview) {
    return (
      <>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #catalog-print, #catalog-print * { visibility: visible; }
            #catalog-print { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>
        <div className="p-4 print:hidden">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Config
          </Button>
          <Button className="ml-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
        <div id="catalog-print" className="p-8">
          <h1 className="text-2xl font-bold text-center mb-8">Panchaloha Idols - Product Catalog</h1>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {enabledItems.map(item => {
              const cost = parseFloat(item.costPrice) || 0;
              const sellPrice = Math.round(cost * mult);
              return (
                <div key={item.id} className="border rounded-lg p-4 text-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.subcategory_name} className="w-full h-48 object-cover rounded mb-3" />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded mb-3 flex items-center justify-center text-muted-foreground text-sm">
                      No Image
                    </div>
                  )}
                  <h3 className="font-semibold text-lg">{item.subcategory_name}</h3>
                  {item.height && <p className="text-sm text-muted-foreground">Height: {item.height}</p>}
                  {showPrices && cost > 0 && (
                    <p className="text-lg font-bold mt-2 text-primary">₹{sellPrice.toLocaleString("en-IN")}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/panchaloha-subcategories")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subcategories
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Create Catalog</h1>

        <div className="flex flex-wrap items-center gap-6 mb-6 p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2">
            <Label>Multiplier</Label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">x</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showPrices} onCheckedChange={setShowPrices} />
            <Label>Show Prices in Catalog</Label>
          </div>
          <Button onClick={handlePrint} disabled={enabledItems.length === 0}>
            <Printer className="w-4 h-4 mr-2" />
            Generate Catalog ({enabledItems.length} items)
          </Button>
        </div>

        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Include</TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name (Available Qty)</TableHead>
                <TableHead>Height</TableHead>
                <TableHead className="w-32">Cost Price (₹)</TableHead>
                <TableHead className="w-32">Selling Price (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const cost = parseFloat(item.costPrice) || 0;
                const sellPrice = Math.round(cost * mult);
                return (
                  <TableRow key={item.id} className={!item.enabled ? "opacity-50" : ""}>
                    <TableCell>
                      <Checkbox checked={item.enabled} onCheckedChange={() => toggleItem(item.id)} />
                    </TableCell>
                    <TableCell>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.subcategory_name} <span className="text-muted-foreground">({item.available_count})</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.height || "—"}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => updateCostPrice(item.id, e.target.value)}
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="font-semibold">
                      {cost > 0 ? `₹${sellPrice.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default PanchalohaCatalog;
