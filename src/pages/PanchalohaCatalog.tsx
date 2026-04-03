import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Download, Eye, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  sellPrice: string;
}

const ITEMS_PER_PAGE = 6;

const PanchalohaCatalog = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [multiplier, setMultiplier] = useState("2.0");
  const [showPrices, setShowPrices] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
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

    const mult = parseFloat(multiplier) || 1;
    setItems(subcats.map(s => {
      const cost = s.default_price ?? 0;
      const availCount = availCounts[s.id] || 0;
      return {
        id: s.id,
        subcategory_name: s.subcategory_name,
        image_url: s.image_url ?? null,
        height: s.height ?? null,
        default_price: s.default_price ?? null,
        available_count: availCount,
        enabled: availCount > 0,
        costPrice: cost ? String(cost) : "",
        sellPrice: cost ? String(Math.round(cost * mult)) : "",
      };
    }));

    setLoading(false);
  };

  const toggleItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item && !item.enabled && item.available_count === 0) {
      toast({ title: "Cannot include item with no stock", variant: "destructive" });
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  };

  const updateCostPrice = (id: string, value: string) => {
    const mult = parseFloat(multiplier) || 1;
    const cost = parseFloat(value) || 0;
    setItems(prev => prev.map(i => i.id === id ? { ...i, costPrice: value, sellPrice: cost ? String(Math.round(cost * mult)) : "" } : i));
  };

  const updateSellPrice = (id: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, sellPrice: value } : i));
  };

  const applyMultiplier = () => {
    const mult = parseFloat(multiplier) || 1;
    setItems(prev => prev.map(i => {
      const cost = parseFloat(i.costPrice) || 0;
      return { ...i, sellPrice: cost ? String(Math.round(cost * mult)) : "" };
    }));
  };

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
      const cardW = (usableW - gap * (cols - 1)) / cols;
      const imgH = cardW * 1.5;
      const detailH = 18;
      const cardH = imgH + detailH;
      const titleH = 14;

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

          pdf.setDrawColor(51, 51, 51);
          pdf.setLineWidth(0.7);
          pdf.roundedRect(x, y, cardW, cardH, 2, 2);

          const imgData = imageCache[item.id];
          if (imgData) {
            pdf.addImage(imgData, "JPEG", x + 0.5, y + 0.5, cardW - 1, imgH - 1);
          } else {
            pdf.setFillColor(229, 229, 229);
            pdf.rect(x + 0.5, y + 0.5, cardW - 1, imgH - 1, "F");
            pdf.setFontSize(9);
            pdf.setTextColor(153, 153, 153);
            pdf.setFont("helvetica", "normal");
            pdf.text("No Image", x + cardW / 2, y + imgH / 2, { align: "center" });
          }

          pdf.setFillColor(245, 240, 235);
          pdf.rect(x + 0.35, y + imgH, cardW - 0.7, detailH - 0.35, "F");

          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(26, 26, 26);
          pdf.text(item.subcategory_name, x + cardW / 2, y + imgH + 5, { align: "center", maxWidth: cardW - 4 });

          if (item.height) {
            pdf.setFontSize(7.5);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(85, 85, 85);
            pdf.text(`Height: ${item.height}`, x + cardW / 2, y + imgH + 9.5, { align: "center" });
          }

          const sell = parseFloat(item.sellPrice) || 0;
          if (showPrices && sell > 0) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(180, 83, 9);
            const priceY = item.height ? y + imgH + 14.5 : y + imgH + 12;
            pdf.text(`Rs.${sell.toLocaleString("en-IN")}`, x + cardW / 2, priceY, { align: "center" });
          }
        }

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

  // Preview mode
  if (showPreview) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="sticky top-0 z-10 bg-card border-b p-4 flex gap-2 items-center shadow-sm">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Config
          </Button>
          <Button onClick={handleDownloadPDF} disabled={generating}>
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download PDF</>
            )}
          </Button>
        </div>
        <div className="py-8 flex flex-col items-center gap-8">
          {Array.from({ length: Math.ceil(enabledItems.length / ITEMS_PER_PAGE) }).map((_, pageIdx) => {
            const pageItems = enabledItems.slice(pageIdx * ITEMS_PER_PAGE, (pageIdx + 1) * ITEMS_PER_PAGE);
            return (
              <div
                key={pageIdx}
                className="bg-white shadow-lg"
                style={{ width: '210mm', minHeight: '297mm', padding: '10mm', boxSizing: 'border-box', position: 'relative' }}
              >
                <h1 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '12px', color: '#1a1a1a' }}>
                  Panchaloha Idols - Product Catalog
                </h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5mm' }}>
                  {pageItems.map(item => {
                    const sell = parseFloat(item.sellPrice) || 0;
                    return (
                      <div key={item.id} style={{ border: '2.5px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                        {item.image_url ? (
                          <div style={{ aspectRatio: '2/3', overflow: 'hidden' }}>
                            <img src={item.image_url} alt={item.subcategory_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ aspectRatio: '2/3', background: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '12px' }}>
                            No Image
                          </div>
                        )}
                        <div style={{ background: '#f5f0eb', padding: '8px 6px', textAlign: 'center' }}>
                          <h3 style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a1a', marginBottom: '2px' }}>{item.subcategory_name}</h3>
                          {item.height && <p style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>Height: {item.height}</p>}
                          {showPrices && sell > 0 && (
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>₹{sell.toLocaleString("en-IN")}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ position: 'absolute', bottom: '5mm', left: 0, right: 0, textAlign: 'center', fontSize: '10px', color: '#999' }}>
                  Page {pageIdx + 1} of {Math.ceil(enabledItems.length / ITEMS_PER_PAGE)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Config mode
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
            <Button variant="outline" size="sm" onClick={applyMultiplier}>Apply</Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showPrices} onCheckedChange={setShowPrices} />
            <Label>Show Prices</Label>
          </div>
          <Button onClick={() => setShowPreview(true)} disabled={enabledItems.length === 0}>
            <Eye className="w-4 h-4 mr-2" />
            Preview Catalog ({enabledItems.length} items)
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
              {items.map(item => (
                <TableRow key={item.id} className={`${!item.enabled ? "opacity-50" : ""} ${item.available_count === 0 ? "bg-destructive/10" : ""}`}>
                  <TableCell>
                    <Checkbox checked={item.enabled} onCheckedChange={() => toggleItem(item.id)} disabled={item.available_count === 0} />
                  </TableCell>
                  <TableCell>
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-0.5">
                      <span>{item.subcategory_name} <span className="text-muted-foreground">({item.available_count})</span></span>
                      {item.available_count === 0 ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 w-fit">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          No Stock
                        </Badge>
                      ) : item.available_count < 5 ? (
                        <Badge className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 w-fit bg-orange-500 text-white border-orange-500">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Low Stock
                        </Badge>
                      ) : null}
                    </div>
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
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={item.sellPrice}
                      onChange={(e) => updateSellPrice(item.id, e.target.value)}
                      className="w-28"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default PanchalohaCatalog;
