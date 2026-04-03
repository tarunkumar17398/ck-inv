import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";

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

const ITEMS_PER_PAGE = 6; // 3 cols x 2 rows per A4 page

const PanchalohaCatalog = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [multiplier, setMultiplier] = useState("2.0");
  const [showPrices, setShowPrices] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
      image_url: s.image_url ?? null,
      height: s.height ?? null,
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

  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    if (enabledItems.length === 0) return;
    setGenerating(true);

    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const margin = 10;
      const usableW = pageW - margin * 2;
      const gap = 5;
      const cols = 3;
      const cardW = (usableW - gap * (cols - 1)) / cols; // ~56.67mm
      const imgH = cardW * 1.5; // 2:3 ratio
      const detailH = 18;
      const cardH = imgH + detailH;
      const rows = 2;
      const titleH = 14;

      // Pre-load all images
      const imageCache: Record<string, string | null> = {};
      for (const item of enabledItems) {
        if (item.image_url) {
          imageCache[item.id] = await loadImageAsBase64(item.image_url);
        }
      }

      const totalPages = Math.ceil(enabledItems.length / ITEMS_PER_PAGE);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const pageItems = enabledItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

        // Title
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 26, 26);
        pdf.text("Panchaloha Idols - Product Catalog", pageW / 2, margin + 8, { align: "center" });

        const startY = margin + titleH;

        for (let idx = 0; idx < pageItems.length; idx++) {
          const item = pageItems[idx];
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = margin + col * (cardW + gap);
          const y = startY + row * (cardH + gap);

          // Card border
          pdf.setDrawColor(51, 51, 51);
          pdf.setLineWidth(0.7);
          pdf.roundedRect(x, y, cardW, cardH, 2, 2);

          // Image area
          const imgData = imageCache[item.id];
          if (imgData) {
            // Clip image inside rounded rect top area
            pdf.addImage(imgData, "JPEG", x + 0.5, y + 0.5, cardW - 1, imgH - 1);
          } else {
            pdf.setFillColor(229, 229, 229);
            pdf.rect(x + 0.5, y + 0.5, cardW - 1, imgH - 1, "F");
            pdf.setFontSize(9);
            pdf.setTextColor(153, 153, 153);
            pdf.setFont("helvetica", "normal");
            pdf.text("No Image", x + cardW / 2, y + imgH / 2, { align: "center" });
          }

          // Detail area background
          pdf.setFillColor(245, 240, 235);
          pdf.rect(x + 0.35, y + imgH, cardW - 0.7, detailH - 0.35, "F");

          // Bottom border line for detail area (part of card border)
          // Already handled by roundedRect

          // Name
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(26, 26, 26);
          const nameText = item.subcategory_name;
          pdf.text(nameText, x + cardW / 2, y + imgH + 5, { align: "center", maxWidth: cardW - 4 });

          // Height
          if (item.height) {
            pdf.setFontSize(7.5);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(85, 85, 85);
            pdf.text(`Height: ${item.height}`, x + cardW / 2, y + imgH + 9.5, { align: "center" });
          }

          // Price
          const cost = parseFloat(item.costPrice) || 0;
          if (showPrices && cost > 0) {
            const sellPrice = Math.round(cost * mult);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(180, 83, 9);
            const priceY = item.height ? y + imgH + 14.5 : y + imgH + 12;
            pdf.text(`Rs.${sellPrice.toLocaleString("en-IN")}`, x + cardW / 2, priceY, { align: "center" });
          }
        }

        // Page number
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${page + 1} of ${totalPages}`, pageW / 2, pageH - 5, { align: "center" });
      }

      pdf.save("Panchaloha_Catalog.pdf");
      toast({ title: "PDF downloaded successfully!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading catalog data...</p>
      </div>
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
          <Button onClick={handleDownloadPDF} disabled={enabledItems.length === 0 || generating}>
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download PDF ({enabledItems.length} items)</>
            )}
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
