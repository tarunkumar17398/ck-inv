import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Download, Eye, Loader2, AlertTriangle, Save, FolderOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import jsPDF from "jspdf";

interface SubcategoryImage {
  id: string;
  image_url: string;
  label: string;
  sort_order: number;
}

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
  images: SubcategoryImage[];
  selectedImageId: string | null;
}

interface SavedCatalog {
  id: string;
  name: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 6;

const PanchalohaCatalog = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [multiplier, setMultiplier] = useState("2.0");
  const [showPrices, setShowPrices] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [variantFilter, setVariantFilter] = useState("all");
  const isMobile = useIsMobile();
  const [isTablet, setIsTablet] = useState(false);

  // Save/Load state
  const [savedCatalogs, setSavedCatalogs] = useState<SavedCatalog[]>([]);
  const [currentCatalogId, setCurrentCatalogId] = useState<string | null>(null);
  const [currentCatalogName, setCurrentCatalogName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadSavedCatalogs();
  }, []);

  const loadSavedCatalogs = async () => {
    const { data } = await supabase
      .from("saved_catalogs")
      .select("*")
      .order("updated_at", { ascending: false });
    setSavedCatalogs((data as SavedCatalog[]) || []);
  };

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

    const { data: allImages } = await supabase
      .from("subcategory_images")
      .select("*")
      .in("subcategory_id", subcategoryIds)
      .order("sort_order");

    const imagesBySubcat: Record<string, SubcategoryImage[]> = {};
    (allImages || []).forEach((img: any) => {
      if (!imagesBySubcat[img.subcategory_id]) imagesBySubcat[img.subcategory_id] = [];
      imagesBySubcat[img.subcategory_id].push(img);
    });

    const availCounts = allPieces.reduce((acc, p) => {
      if (p.status === "available") acc[p.subcategory_id] = (acc[p.subcategory_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mult = parseFloat(multiplier) || 1;
    setItems(subcats.map(s => {
      const cost = s.default_price ?? 0;
      const availCount = availCounts[s.id] || 0;
      const images = imagesBySubcat[s.id] || [];
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
        images,
        selectedImageId: images.length > 0 ? images[0].id : null,
      };
    }));

    setLoading(false);
  };

  // Build settings object from current state
  const buildSettings = () => ({
    multiplier,
    showPrices,
    variantFilter,
    items: items.map(i => ({
      id: i.id,
      enabled: i.enabled,
      costPrice: i.costPrice,
      sellPrice: i.sellPrice,
      height: i.height,
      selectedImageId: i.selectedImageId,
    })),
  });

  // Apply saved settings to current items
  const applySettings = (settings: any) => {
    setMultiplier(settings.multiplier || "2.0");
    setShowPrices(settings.showPrices ?? true);
    setVariantFilter(settings.variantFilter || "all");

    if (settings.items && Array.isArray(settings.items)) {
      const settingsMap: Record<string, any> = {};
      settings.items.forEach((s: any) => { settingsMap[s.id] = s; });

      setItems(prev => prev.map(item => {
        const saved = settingsMap[item.id];
        if (!saved) return item;
        return {
          ...item,
          enabled: saved.enabled ?? item.enabled,
          costPrice: saved.costPrice ?? item.costPrice,
          sellPrice: saved.sellPrice ?? item.sellPrice,
          height: saved.height ?? item.height,
          selectedImageId: saved.selectedImageId ?? item.selectedImageId,
        };
      }));
    }
  };

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) {
      toast({ title: "Please enter a name", variant: "destructive" });
      return;
    }
    setSaving(true);
    const settings = buildSettings();

    if (currentCatalogId) {
      // Update existing
      const { error } = await supabase
        .from("saved_catalogs")
        .update({ name, settings: settings as any, updated_at: new Date().toISOString() })
        .eq("id", currentCatalogId);
      if (error) {
        toast({ title: "Failed to save", variant: "destructive" });
      } else {
        setCurrentCatalogName(name);
        toast({ title: "Catalog updated!" });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("saved_catalogs")
        .insert({ name, settings: settings as any })
        .select()
        .single();
      if (error) {
        toast({ title: "Failed to save", variant: "destructive" });
      } else {
        setCurrentCatalogId(data.id);
        setCurrentCatalogName(name);
        toast({ title: "Catalog saved!" });
      }
    }

    setSaving(false);
    setShowSaveDialog(false);
    loadSavedCatalogs();
  };

  const handleLoad = async (catalog: SavedCatalog) => {
    setCurrentCatalogId(catalog.id);
    setCurrentCatalogName(catalog.name);
    applySettings(catalog.settings);
    setShowLoadDialog(false);
    toast({ title: `Loaded: ${catalog.name}` });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("saved_catalogs").delete().eq("id", id);
    if (!error) {
      if (currentCatalogId === id) {
        setCurrentCatalogId(null);
        setCurrentCatalogName("");
      }
      toast({ title: "Catalog deleted" });
      loadSavedCatalogs();
    }
  };

  const handleNewCatalog = () => {
    setCurrentCatalogId(null);
    setCurrentCatalogName("");
    loadData();
    toast({ title: "Starting fresh catalog" });
  };

  const openSaveDialog = () => {
    setSaveName(currentCatalogName || "");
    setShowSaveDialog(true);
  };

  const getSelectedImageUrl = (item: CatalogItem): string | null => {
    if (item.images.length === 0) return item.image_url;
    const selected = item.images.find(img => img.id === item.selectedImageId);
    return selected?.image_url || item.images[0]?.image_url || item.image_url;
  };

  const toggleItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item && !item.enabled && item.available_count === 0) {
      toast({ title: "Cannot include item with no stock", variant: "destructive" });
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  };

  const selectImage = (itemId: string, imageId: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, selectedImageId: imageId } : i));
  };

  const updateCostPrice = (id: string, value: string) => {
    const mult = parseFloat(multiplier) || 1;
    const cost = parseFloat(value) || 0;
    setItems(prev => prev.map(i => i.id === id ? { ...i, costPrice: value, sellPrice: cost ? String(Math.round(cost * mult)) : "" } : i));
  };

  const updateSellPrice = (id: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, sellPrice: value } : i));
  };

  const updateHeight = (id: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, height: value || null } : i));
  };

  const applyMultiplier = () => {
    const mult = parseFloat(multiplier) || 1;
    setItems(prev => prev.map(i => {
      const cost = parseFloat(i.costPrice) || 0;
      return { ...i, sellPrice: cost ? String(Math.round(cost * mult)) : "" };
    }));
  };

  const allVariantLabels = Array.from(new Set(items.flatMap(i => i.images.map(img => img.label)))).sort();

  const applyVariantFilter = (label: string) => {
    setVariantFilter(label);
    if (label !== "all") {
      setItems(prev => prev.map(i => {
        const matchImg = i.images.find(img => img.label === label);
        if (matchImg) {
          return { ...i, selectedImageId: matchImg.id };
        }
        return i;
      }));
    }
  };

  const filteredItems = variantFilter === "all" 
    ? items 
    : items.filter(i => i.images.some(img => img.label === variantFilter));

  const enabledItems = filteredItems.filter(i => i.enabled);

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
        const imgUrl = getSelectedImageUrl(item);
        if (imgUrl) {
          imageCache[item.id] = await loadImageAsBase64(imgUrl);
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
                    const imgUrl = getSelectedImageUrl(item);
                    return (
                      <div key={item.id} style={{ border: '2.5px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                        {imgUrl ? (
                          <div style={{ aspectRatio: '2/3', overflow: 'hidden' }}>
                            <img src={imgUrl} alt={item.subcategory_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/panchaloha-subcategories")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLoadDialog(true)}>
              <FolderOpen className="w-4 h-4 mr-1" /> Load
            </Button>
            <Button variant="outline" size="sm" onClick={openSaveDialog}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewCatalog}>
              New
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Create Catalog</h1>
          {currentCatalogName && (
            <Badge variant="secondary" className="text-sm">{currentCatalogName}</Badge>
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-6 mb-4 p-3 sm:p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Multiplier</Label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="w-20"
            />
            <Button variant="outline" size="sm" onClick={applyMultiplier}>Apply</Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={showPrices} onCheckedChange={setShowPrices} />
            <Label className="text-sm">Show Prices</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Variant</Label>
            <Select value={variantFilter} onValueChange={applyVariantFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {allVariantLabels.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowPreview(true)} disabled={enabledItems.length === 0} className="w-full sm:w-auto">
            <Eye className="w-4 h-4 mr-2" />
            Preview ({enabledItems.length} items)
          </Button>
        </div>

        {/* Mobile/Tablet card layout */}
        {(isMobile || isTablet) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 bg-card ${!item.enabled ? "opacity-50" : ""} ${item.available_count === 0 ? "border-destructive bg-destructive/5" : ""}`}
              >
                <div className="flex gap-3">
                  <div className="flex items-start pt-1">
                    <Checkbox checked={item.enabled} onCheckedChange={() => toggleItem(item.id)} disabled={item.available_count === 0} />
                  </div>
                  {(() => {
                    const imgUrl = getSelectedImageUrl(item);
                    return imgUrl ? (
                      <img src={imgUrl} alt="" className="w-14 h-14 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground shrink-0">—</div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm break-words">{item.subcategory_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.available_count} {item.height ? `• ${item.height}` : ""}</p>
                    {item.available_count === 0 ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-1 flex items-center gap-0.5 w-fit">
                        <AlertTriangle className="w-2.5 h-2.5" /> No Stock
                      </Badge>
                    ) : item.available_count < 5 ? (
                      <Badge className="text-[10px] px-1.5 py-0 mt-1 flex items-center gap-0.5 w-fit bg-orange-500 text-white border-orange-500">
                        <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pl-7">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Height</Label>
                    <Input value={item.height || ""} onChange={(e) => updateHeight(item.id, e.target.value)} className="h-8 text-sm" placeholder="—" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Cost ₹</Label>
                    <Input type="number" min="0" value={item.costPrice} onChange={(e) => updateCostPrice(item.id, e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Sell ₹</Label>
                    <Input type="number" min="0" value={item.sellPrice} onChange={(e) => updateSellPrice(item.id, e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                {item.images.length > 1 && (
                  <div className="mt-2 pl-7">
                    <Label className="text-[11px] text-muted-foreground">Image Variant</Label>
                    <Select value={item.selectedImageId || ""} onValueChange={(val) => selectImage(item.id, val)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {item.images.map(img => (
                          <SelectItem key={img.id} value={img.id}>{img.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Desktop table layout */
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Include</TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name (Available Qty)</TableHead>
                  <TableHead>Height</TableHead>
                  <TableHead className="w-40">Image Variant</TableHead>
                  <TableHead className="w-32">Cost Price (₹)</TableHead>
                  <TableHead className="w-32">Selling Price (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const imgUrl = getSelectedImageUrl(item);
                  return (
                    <TableRow key={item.id} className={`${!item.enabled ? "opacity-50" : ""} ${item.available_count === 0 ? "bg-destructive/10" : ""}`}>
                      <TableCell>
                        <Checkbox checked={item.enabled} onCheckedChange={() => toggleItem(item.id)} disabled={item.available_count === 0} />
                      </TableCell>
                      <TableCell>
                        {imgUrl ? (
                          <img src={imgUrl} alt="" className="w-12 h-12 object-cover rounded" />
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
                      <TableCell>
                        <Input value={item.height || ""} onChange={(e) => updateHeight(item.id, e.target.value)} className="w-24" placeholder="—" />
                      </TableCell>
                      <TableCell>
                        {item.images.length > 1 ? (
                          <Select value={item.selectedImageId || ""} onValueChange={(val) => selectImage(item.id, val)}>
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {item.images.map(img => (
                                <SelectItem key={img.id} value={img.id}>{img.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">{item.images[0]?.label || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={item.costPrice} onChange={(e) => updateCostPrice(item.id, e.target.value)} className="w-28" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={item.sellPrice} onChange={(e) => updateSellPrice(item.id, e.target.value)} className="w-28" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentCatalogId ? "Update Catalog" : "Save Catalog"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Catalog Name (internal)</Label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g. Green Variant - April 2026" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {currentCatalogId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Load Saved Catalog</DialogTitle>
          </DialogHeader>
          {savedCatalogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No saved catalogs yet</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {savedCatalogs.map(c => (
                <div key={c.id} className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer ${c.id === currentCatalogId ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex-1" onClick={() => handleLoad(c)}>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PanchalohaCatalog;
