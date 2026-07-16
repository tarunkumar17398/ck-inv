import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bluetooth, BluetoothOff, X, Radio, AlertCircle, CheckCircle2, Printer, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useH102 } from "@/hooks/useH102";
import { cleanSizeDisplay, formatPriceLabel, formatWeightLabel, formatSizeWithInches } from "@/lib/utils";
import bwipjs from "bwip-js";
import type { RenderOptions } from "bwip-js";

const bwipjsLib = bwipjs as typeof bwipjs & {
  toSVG: (opts: RenderOptions) => string;
};
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ItemRow {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  size: string | null;
  cost_price: number | null;
  price: number | null;
  weight: string | null;
  rfid_epc: string | null;
}

const QuickTag = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemRow[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<ItemRow | null>(null);
  const [epc, setEpc] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastTagged, setLastTagged] = useState<{ code: string; name: string } | null>(null);
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [edits, setEdits] = useState<{
    item_name?: string;
    size?: string;
    cost_price?: string;
    price?: string;
  }>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingEdits, setSavingEdits] = useState(false);
  const [printData, setPrintData] = useState<{
    itemCode: string;
    particulars: string;
    price: string;
    size: string;
    weight: string;
    barcodeSvg: string;
  } | null>(null);
  type UntaggedItem = { id: string; item_code: string; item_name: string; size: string | null };
  type CategoryStat = { id: string; name: string; total: number; tagged: number; untagged: number; items: UntaggedItem[] };
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [untaggedLoading, setUntaggedLoading] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const itemInputRef = useRef<HTMLInputElement>(null);
  const epcInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<any>(null);

  const { supported, connected, power, battery, scanning, connect, disconnect, scanOnce } = useH102({
    onTag: (tag) => {
      setEpc(tag);
    },
    onError: (msg) => toast.error(msg),
  });

  const isChromeDesktop = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android/i.test(ua);
    const isChrome = /Chrome/i.test(ua) && !/Edg\/|OPR\//i.test(ua);
    return isChrome && !isMobile && supported;
  }, [supported]);

  // Search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, item_code, item_name, particulars, size, cost_price, price, weight, rfid_epc")
        .ilike("item_code", `%${query}%`)
        .eq("status", "in_stock")
        .limit(8);
      if (error) {
        toast.error(error.message);
        return;
      }
      setResults((data as ItemRow[]) || []);
      setShowDropdown(true);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  const fetchUntagged = useCallback(async () => {
    setUntaggedLoading(true);
    const PAGE_SIZE = 1000;
    let page = 0;
    const allItems: any[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("items")
        .select("id, item_code, item_name, size, category_id, categories(name)")
        .eq("status", "in_stock")
        .is("rfid_epc", null)
        .order("item_code", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) {
        toast.error(error.message);
        break;
      }
      if (!data || data.length === 0) break;
      allItems.push(...data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    setUntaggedLoading(false);
    const grouped: Record<string, { id: string; item_code: string; item_name: string; size: string | null }[]> = {};
    for (const row of allItems) {
      const cat = row.categories?.name || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ id: row.id, item_code: row.item_code, item_name: row.item_name, size: row.size });
    }
    setUntagged(grouped);
  }, []);

  useEffect(() => {
    fetchUntagged();
  }, [fetchUntagged]);

  const loadItemByCode = async (code: string) => {
    setQuery(code);
    const { data, error } = await supabase
      .from("items")
      .select("id, item_code, item_name, particulars, size, cost_price, price, weight, rfid_epc")
      .eq("item_code", code)
      .eq("status", "in_stock")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) handleSelect(data as ItemRow);
  };

  const handleSelect = (item: ItemRow) => {
    setSelected(item);
    setQuery(item.item_code);
    setShowDropdown(false);
    setResults([]);
    setEdits({});
    setEditingField(null);
    setTimeout(() => epcInputRef.current?.focus(), 50);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setEdits({});
    setEditingField(null);
    setTimeout(() => itemInputRef.current?.focus(), 50);
  };

  const doSave = useCallback(async () => {
    if (!selected || !epc.trim()) return;
    setSaving(true);
    const cleanEpc = epc.trim().toUpperCase();
    const { error } = await supabase
      .from("items")
      .update({ rfid_epc: cleanEpc })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`✓ ${selected.item_code} tagged successfully`);
    setSessionCount((c) => c + 1);
    setLastTagged({ code: selected.item_code, name: selected.item_name });
    setSelected(null);
    setQuery("");
    setEpc("");
    setResults([]);
    setEdits({});
    setEditingField(null);
    setTimeout(() => itemInputRef.current?.focus(), 50);
    fetchUntagged();
  }, [selected, epc, fetchUntagged]);

  const hasEdits = Object.keys(edits).length > 0;

  const saveEdits = async () => {
    if (!selected || !hasEdits) return;
    const payload: Record<string, any> = {};
    if (edits.item_name !== undefined) payload.item_name = edits.item_name.trim();
    if (edits.size !== undefined) payload.size = edits.size.trim() || null;
    if (edits.cost_price !== undefined) {
      const n = parseFloat(edits.cost_price);
      payload.cost_price = isNaN(n) ? null : n;
    }
    if (edits.price !== undefined) {
      const n = parseFloat(edits.price);
      payload.price = isNaN(n) ? null : n;
    }
    setSavingEdits(true);
    const { error } = await supabase.from("items").update(payload).eq("id", selected.id);
    setSavingEdits(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected({ ...selected, ...payload } as ItemRow);
    setEdits({});
    setEditingField(null);
    toast.success("Item updated");
  };

  const handleSaveClick = () => {
    if (!selected || !epc.trim()) return;
    if (selected.rfid_epc && selected.rfid_epc.toUpperCase() !== epc.trim().toUpperCase()) {
      setOverwriteOpen(true);
      return;
    }
    doSave();
  };

  const canSave = !!selected && !!epc.trim() && !saving;

  const printLabel = useCallback(() => {
    if (!selected) return;
    let barcodeSvg = "";
    try {
      barcodeSvg = bwipjsLib.toSVG({
        bcid: "code128",
        text: selected.item_code,
        height: 12,
        includetext: true,
        textxalign: "center",
        textsize: 10,
      });
    } catch (e) {
      console.error("SVG barcode generation error:", e);
    }
    setPrintData({
      itemCode: selected.item_code,
      particulars: selected.particulars || selected.item_name,
      price: selected.price ? formatPriceLabel(selected.price) : "",
      size: formatSizeWithInches(selected.size) || "",
      weight: selected.weight ? formatWeightLabel(parseFloat(selected.weight)) : "",
      barcodeSvg,
    });
    setTimeout(() => window.print(), 100);
  }, [selected]);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 print:hidden">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Quick Tag</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bulk RFID tagging with Chafon H102
            </p>
          </div>
        </div>

        {!isChromeDesktop && (
          <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/50 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
            <span>
              Web Bluetooth requires Chrome on desktop. You can still search and manually enter EPCs.
            </span>
          </div>
        )}

        {/* BLE Bar */}
        <Card>
          <CardContent className="flex items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {connected ? (
                <>
                  <span className="relative flex h-3 w-3 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="font-medium text-sm sm:text-base truncate">
                    H102 Connected · {power} dBm
                    {battery !== null && (
                      <>
                        {" · 🔋 "}
                        <span
                          className={
                            battery > 50
                              ? "text-green-600 dark:text-green-400"
                              : battery >= 20
                              ? "text-orange-500"
                              : "text-red-500"
                          }
                        >
                          {battery}%
                        </span>
                      </>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <BluetoothOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm sm:text-base text-muted-foreground truncate">
                    H102 Not Connected
                  </span>
                </>
              )}
            </div>
            {connected ? (
              <button
                onClick={disconnect}
                className="text-xs sm:text-sm text-primary hover:underline flex-shrink-0"
              >
                Disconnect
              </button>
            ) : (
              <Button
                size="sm"
                onClick={connect}
                disabled={!supported}
                className="flex-shrink-0"
              >
                <Bluetooth className="w-4 h-4 mr-1" />
                Connect
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tag an Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item code */}
              <div className="relative">
                <Label htmlFor="item-code">Item Code</Label>
                <div className="relative mt-1">
                  <Input
                    id="item-code"
                    ref={itemInputRef}
                    autoComplete="off"
                    placeholder="Type item code..."
                    value={query}
                    disabled={!!selected}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && results.length > 0 && setShowDropdown(true)}
                  />
                  {(query || selected) && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showDropdown && results.length > 0 && !selected && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-y-auto">
                    {results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelect(r)}
                        className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-sm">
                            {r.item_code}
                          </span>
                          <span className="text-sm text-muted-foreground truncate">
                            · {r.item_name}
                          </span>
                          {r.size && (
                            <span className="text-xs text-muted-foreground">
                              · {cleanSizeDisplay(r.size)}
                            </span>
                          )}
                          {r.rfid_epc && (
                            <Badge variant="secondary" className="text-[10px]">
                              tagged
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* EPC */}
              <div>
                <Label htmlFor="epc">RFID EPC</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="epc"
                    ref={epcInputRef}
                    className="font-mono"
                    placeholder="Scan tag with H102..."
                    value={epc}
                    onChange={(e) => setEpc(e.target.value.toUpperCase())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={scanOnce}
                    disabled={!connected || scanning}
                  >
                    <Radio className={`w-4 h-4 mr-1 ${scanning ? "animate-pulse" : ""}`} />
                    {scanning ? "Scanning..." : "Scan"}
                  </Button>
                </div>
              </div>
            </div>

            {selected && (() => {
              const nameVal = edits.item_name ?? selected.item_name ?? "";
              const sizeVal = edits.size ?? selected.size ?? "";
              const costVal = edits.cost_price ?? (selected.cost_price?.toString() ?? "");
              const priceVal = edits.price ?? (selected.price?.toString() ?? "");

              const renderField = (
                key: "item_name" | "size" | "cost_price" | "price",
                label: string,
                value: string,
                displayValue: string,
                inputType: "text" | "number" = "text",
                className = "",
              ) => (
                <div className={className}>
                  <div className="text-xs text-muted-foreground">{label}</div>
                  {editingField === key ? (
                    <Input
                      autoFocus
                      type={inputType}
                      value={value}
                      onChange={(e) =>
                        setEdits((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      onBlur={() => setEditingField(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          e.preventDefault();
                          setEditingField(null);
                        }
                      }}
                      className="h-7 text-sm mt-0.5"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingField(key)}
                      className="text-left w-full truncate hover:bg-background/60 rounded px-1 -mx-1 py-0.5 cursor-text"
                      title="Click to edit"
                    >
                      {displayValue || <span className="text-muted-foreground italic">—</span>}
                    </button>
                  )}
                </div>
              );

              return (
                <Card className="bg-muted/30 border-primary/30">
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Item Code</div>
                        <div className="font-mono font-semibold">{selected.item_code}</div>
                      </div>
                      {renderField("item_name", "Name", nameVal, nameVal, "text", "col-span-2 sm:col-span-2")}
                      {renderField("size", "Size", sizeVal, cleanSizeDisplay(sizeVal), "text")}
                      {renderField("cost_price", "Cost Price", costVal, costVal || "-", "number")}
                      {renderField("price", "Selling Price", priceVal, priceVal || "-", "number")}
                      <div className="col-span-2 sm:col-span-5">
                        <div className="text-xs text-muted-foreground">Current EPC</div>
                        <div className="font-mono text-xs break-all">
                          {selected.rfid_epc || (
                            <span className="text-muted-foreground italic">Not tagged</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {hasEdits && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={saveEdits}
                          disabled={savingEdits}
                        >
                          {savingEdits ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            <div className="flex gap-2">
              <Button
                className="flex-1 h-12"
                disabled={!canSave}
                onClick={handleSaveClick}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save EPC to Item"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12"
                disabled={!selected}
                onClick={printLabel}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Label
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Session stats */}
        <Card>
          <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default">{sessionCount}</Badge>
              <span>Tagged this session</span>
            </div>
            {lastTagged && (
              <div className="text-muted-foreground truncate flex-1">
                Last: <span className="font-mono">{lastTagged.code}</span> · {lastTagged.name}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSessionCount(0);
                setLastTagged(null);
              }}
              className="text-xs text-primary hover:underline sm:ml-auto text-left"
            >
              Reset Session
            </button>
          </CardContent>
        </Card>

        {/* Missing RFID Tags */}
        {(() => {
          const categoryNames = Object.keys(untagged).sort();
          const totalItems = categoryNames.reduce((sum, c) => sum + untagged[c].length, 0);
          return (
            <Card className="bg-muted/40 border-muted">
              <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Untagged Items</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalItems} items missing RFID tags across {categoryNames.length} categories
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={fetchUntagged}
                  disabled={untaggedLoading}
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${untaggedLoading ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              {categoryNames.length > 0 && (
                <CardContent className="pt-0 pb-3 space-y-1">
                  {categoryNames.map((cat) => {
                    const items = untagged[cat];
                    const expanded = !!expandedCats[cat];
                    return (
                      <div key={cat} className="border rounded-md bg-background/60">
                        <button
                          type="button"
                          onClick={() => setExpandedCats((p) => ({ ...p, [cat]: !p[cat] }))}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/40 rounded-md"
                        >
                          <span className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span className="font-medium">{cat}</span>
                            <span className="text-muted-foreground text-xs">· {items.length} items</span>
                          </span>
                          <span className="text-xs text-primary">{expanded ? "Hide" : "Show"}</span>
                        </button>
                        {expanded && (
                          <div className="border-t max-h-64 overflow-y-auto divide-y">
                            {items.map((it) => (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() => loadItemByCode(it.item_code)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2"
                              >
                                <span className="font-mono font-semibold">{it.item_code}</span>
                                <span className="text-muted-foreground truncate">· {it.item_name}</span>
                                {it.size && (
                                  <span className="text-muted-foreground">· {cleanSizeDisplay(it.size)}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })()}
      </div>


      <AlertDialog open={overwriteOpen} onOpenChange={setOverwriteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite existing EPC?</AlertDialogTitle>
            <AlertDialogDescription>
              This item already has EPC{" "}
              <span className="font-mono break-all">{selected?.rfid_epc}</span>. Replace it with the
              new scan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOverwriteOpen(false);
                doSave();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden print layout — copied from BarcodePrint */}
      <div className="print-layout" style={{ position: "absolute", left: "-9999px", top: 0 }}>
        {printData && (
          <div
            className="label-page"
            style={{
              width: "110mm",
              height: "28mm",
              position: "relative",
              boxSizing: "border-box",
              background: "hsl(0 0% 100%)",
              border: "none",
              fontFamily: "Calibri, Arial, sans-serif",
              pageBreakAfter: "always",
              pageBreakInside: "avoid",
              overflow: "hidden",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            <div style={{ position: "absolute", left: "6.9mm", top: "6mm", fontSize: "11pt", color: "hsl(0 0% 0%)" }}>O</div>
            <div style={{ position: "absolute", left: "12mm", top: "-1mm", fontSize: "11pt", color: "hsl(0 0% 0%)" }}>
              S.No: {printData.itemCode}
            </div>
            <div
              style={{
                position: "absolute",
                left: "11mm",
                top: "4mm",
                width: "44mm",
                maxHeight: "9mm",
                fontSize: "9pt",
                lineHeight: 1.2,
                overflow: "hidden",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                color: "hsl(0 0% 0%)",
              }}
            >
              {printData.particulars}
            </div>
            <div style={{ position: "absolute", left: "12mm", top: "12mm", fontSize: "11pt", color: "hsl(0 0% 0%)" }}>
              {printData.price}
            </div>
            <div style={{ position: "absolute", left: "38mm", top: "12mm", fontSize: "11pt", color: "hsl(0 0% 0%)" }}>
              {printData.size}
            </div>
            <div
              style={{
                position: "absolute",
                left: "62mm",
                top: "-1mm",
                width: "38mm",
                height: "16mm",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              dangerouslySetInnerHTML={{ __html: printData.barcodeSvg || "" }}
            />
            <div
              style={{
                position: "absolute",
                left: "62mm",
                top: "13mm",
                width: "38mm",
                fontSize: "11pt",
                textAlign: "center",
                color: "hsl(0 0% 0%)",
              }}
            >
              {printData.weight}
            </div>
          </div>
        )}
      </div>

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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: hsl(0 0% 100%) !important;
            font-family: Calibri, Arial, sans-serif !important;
            -webkit-text-size-adjust: 100% !important;
            -webkit-font-smoothing: antialiased !important;
            text-rendering: geometricPrecision !important;
          }
          .min-h-screen {
            min-height: 0 !important;
            padding: 0 !important;
            background: hsl(0 0% 100%) !important;
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
            background: hsl(0 0% 100%) !important;
            border: none !important;
            overflow: hidden !important;
            font-family: Calibri, Arial, sans-serif !important;
            color: hsl(0 0% 0%) !important;
          }
          .label-page:last-child {
            page-break-after: auto !important;
          }
          .label-page svg {
            max-width: 100% !important;
            max-height: 100% !important;
            shape-rendering: crispEdges !important;
          }
          .label-page div {
            color: hsl(0 0% 0%) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QuickTag;
