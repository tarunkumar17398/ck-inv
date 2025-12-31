import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Printer, Search, X } from "lucide-react";
import { toast } from "sonner";
import { formatPriceLabel, formatWeightLabel, formatSizeWithInches } from "@/lib/utils";
// @ts-ignore
import bwipjs from "bwip-js";

interface Category {
  id: string;
  name: string;
  prefix: string;
}

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  price: number | null;
  size: string | null;
  weight: string | null;
  category_id: string;
}

interface BarcodeLabel {
  itemCode: string;
  particulars: string;
  price: string;
  size: string;
  weight: string;
  barcodeValue: string;
}

const BarcodePrint = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<BarcodeLabel[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchItems();
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = items.filter(item =>
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.particulars && item.particulars.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchTerm, items]);

  useEffect(() => {
    // Generate barcodes when labels change
    if (labels.length > 0) {
      setTimeout(() => {
        generateBarcodes();
      }, 100);
    }
  }, [labels]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to fetch categories");
      return;
    }
    setCategories(data || []);
  };

  const fetchItems = async () => {
    setLoading(true);
    const allItems: Item[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("items")
        .select("id, item_code, item_name, particulars, price, size, weight, category_id")
        .eq("category_id", selectedCategory)
        .eq("status", "in_stock")
        .order("item_code")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        toast.error("Failed to fetch items");
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        allItems.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    setItems(allItems);
    setFilteredItems(allItems);
    setSelectedItems(new Set());
    setLoading(false);
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const generateLabels = () => {
    const selectedItemsList = items.filter(item => selectedItems.has(item.id));
    
    const labelData: BarcodeLabel[] = selectedItemsList.map(item => ({
      itemCode: item.item_code,
      particulars: item.particulars || item.item_name,
      price: item.price ? formatPriceLabel(item.price) : "",
      size: formatSizeWithInches(item.size) || "",
      weight: item.weight ? formatWeightLabel(parseFloat(item.weight)) : "",
      barcodeValue: item.item_code,
    }));

    setLabels(labelData);
  };

  const generateBarcodes = () => {
    labels.forEach((label, index) => {
      // Generate preview barcode
      const canvas = document.getElementById(`barcode-${index}`) as HTMLCanvasElement;
      if (canvas) {
        try {
          bwipjs.toCanvas(canvas, {
            bcid: "code128",
            text: label.barcodeValue,
            scale: 2,
            height: 12,
            includetext: true,
            textxalign: "center",
            textsize: 8,
          });
        } catch (e) {
          console.error("Barcode generation error:", e);
        }
      }
      
      // Generate print barcode
      const printCanvas = document.getElementById(`barcode-print-${index}`) as HTMLCanvasElement;
      if (printCanvas) {
        try {
          bwipjs.toCanvas(printCanvas, {
            bcid: "code128",
            text: label.barcodeValue,
            scale: 2,
            height: 12,
            includetext: true,
            textxalign: "center",
            textsize: 8,
          });
        } catch (e) {
          console.error("Print barcode generation error:", e);
        }
      }
    });
  };

  const handlePrint = () => {
    // Generate print barcodes before printing
    labels.forEach((label, index) => {
      const printCanvas = document.getElementById(`barcode-print-${index}`) as HTMLCanvasElement;
      if (printCanvas) {
        try {
          bwipjs.toCanvas(printCanvas, {
            bcid: "code128",
            text: label.barcodeValue,
            scale: 2,
            height: 12,
            includetext: true,
            textxalign: "center",
            textsize: 8,
          });
        } catch (e) {
          console.error("Print barcode generation error:", e);
        }
      }
    });
    
    // Small delay to ensure barcodes are rendered
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Screen Header - Hidden when printing */}
      <header className="bg-card border-b border-border p-4 print:hidden">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Barcode Label Printing</h1>
          </div>
          <div className="flex items-center gap-2">
            {labels.length > 0 && (
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Labels ({labels.length})
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selection Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Select Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name} ({category.prefix})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {selectedItems.size} of {filteredItems.length} items selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center text-muted-foreground">Loading items...</div>
                    ) : filteredItems.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No items found</div>
                    ) : (
                      <div className="divide-y">
                        {filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleItem(item.id)}
                          >
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.item_code}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {item.particulars || item.item_name}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              {item.price && <div>₹{item.price}</div>}
                              {item.size && <div className="text-muted-foreground">{item.size}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={generateLabels}
                    disabled={selectedItems.size === 0}
                    className="w-full"
                  >
                    Generate Labels ({selectedItems.size})
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Label Preview</span>
                {labels.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setLabels([])}>
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {labels.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  Select items and generate labels to see preview
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {labels.slice(0, 5).map((label, index) => (
                    <div
                      key={index}
                      className="border border-foreground bg-white text-black p-2 rounded"
                      style={{ width: "110mm", height: "28mm", position: "relative", fontFamily: "Calibri, Arial, sans-serif" }}
                    >
                      {/* O */}
                      <div style={{ position: "absolute", left: "1.9mm", top: "8mm", fontSize: "11pt" }}>
                        O
                      </div>
                      {/* S.No */}
                      <div style={{ position: "absolute", left: "7mm", top: "0.8mm", fontSize: "11pt" }}>
                        S.No: {label.itemCode}
                      </div>
                      {/* Particulars */}
                      <div style={{ position: "absolute", left: "6mm", top: "6mm", fontSize: "9pt", width: "44mm", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {label.particulars}
                      </div>
                      {/* Price */}
                      <div style={{ position: "absolute", left: "7mm", top: "14mm", fontSize: "11pt" }}>
                        {label.price}
                      </div>
                      {/* Size */}
                      <div style={{ position: "absolute", left: "33mm", top: "14mm", fontSize: "11pt" }}>
                        {label.size}
                      </div>
                      {/* Barcode */}
                      <div style={{ position: "absolute", left: "57mm", top: "0mm", width: "38mm", height: "16mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <canvas id={`barcode-${index}`} style={{ maxWidth: "100%", maxHeight: "100%" }}></canvas>
                      </div>
                      {/* Weight */}
                      <div style={{ position: "absolute", left: "57mm", top: "15mm", fontSize: "11pt", width: "38mm", textAlign: "center" }}>
                        {label.weight}
                      </div>
                    </div>
                  ))}
                  {labels.length > 5 && (
                    <div className="text-center text-muted-foreground">
                      ... and {labels.length - 5} more labels
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Print Layout - Rendered offscreen for barcode generation, visible when printing */}
      <div ref={printRef} className="print-layout" style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {labels.map((label, index) => (
          <div
            key={index}
            className="label-page"
            style={{
              width: "110mm",
              height: "28mm",
              position: "relative",
              boxSizing: "border-box",
              background: "#fff",
              border: "1px solid #000",
              fontFamily: "Calibri, Arial, sans-serif",
              pageBreakAfter: "always",
              pageBreakInside: "avoid",
            }}
          >
            {/* O */}
            <div style={{ position: "absolute", left: "1.9048mm", top: "8.0423mm", fontSize: "11pt", fontWeight: 400 }}>
              O
            </div>
            {/* S.No */}
            <div style={{ position: "absolute", left: "6.9841mm", top: "0.8466mm", fontSize: "11pt", fontWeight: 400 }}>
              S.No: {label.itemCode}
            </div>
            {/* Particulars */}
            <div style={{ position: "absolute", left: "5.9259mm", top: "5.9259mm", width: "44.0212mm", fontSize: "9pt", fontWeight: 400, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "clip" }}>
              {label.particulars}
            </div>
            {/* Price */}
            <div style={{ position: "absolute", left: "6.9841mm", top: "13.9683mm", fontSize: "11pt", fontWeight: 400 }}>
              {label.price}
            </div>
            {/* Size */}
            <div style={{ position: "absolute", left: "32.9277mm", top: "13.9683mm", fontSize: "11pt", fontWeight: 400 }}>
              {label.size}
            </div>
            {/* Barcode */}
            <div style={{ position: "absolute", left: "56.9665mm", top: "0mm", width: "38.0423mm", height: "16.0847mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <canvas id={`barcode-print-${index}`} style={{ maxWidth: "100%", maxHeight: "100%" }}></canvas>
            </div>
            {/* Weight */}
            <div style={{ position: "absolute", left: "56.9312mm", top: "15.0265mm", width: "38.0423mm", fontSize: "11pt", fontWeight: 400, textAlign: "center" }}>
              {label.weight}
            </div>
          </div>
        ))}
      </div>

      {/* Print Styles */}
      <style>{`
        @media screen {
          .print-layout {
            position: absolute !important;
            left: -9999px !important;
            top: 0 !important;
          }
        }
        
        @media print {
          @page {
            size: 110mm 28mm;
            margin: 0;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background: white !important;
          }
          
          header, main, nav, footer, .min-h-screen > header, .min-h-screen > main {
            display: none !important;
          }
          
          .print-layout {
            position: static !important;
            left: auto !important;
            top: auto !important;
            display: block !important;
          }
          
          .label-page {
            width: 110mm !important;
            height: 28mm !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            position: relative !important;
            background: white !important;
            border: 1px solid #000 !important;
          }
          
          .label-page:last-child {
            page-break-after: auto !important;
          }
          
          .label-page * {
            margin: 0;
            padding: 0;
          }
          
          .label-page canvas {
            display: block !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          
          .label-page div {
            position: absolute !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BarcodePrint;
