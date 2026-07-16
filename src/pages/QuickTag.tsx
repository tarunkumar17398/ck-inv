import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bluetooth, BluetoothOff, X, Radio, AlertCircle, CheckCircle2, Printer } from "lucide-react";
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
  const [printData, setPrintData] = useState<{
    itemCode: string;
    particulars: string;
    price: string;
    size: string;
    weight: string;
    barcodeSvg: string;
  } | null>(null);

  const itemInputRef = useRef<HTMLInputElement>(null);
  const epcInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<any>(null);

  const { supported, connected, power, scanning, connect, disconnect, scanOnce } = useH102({
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

  const handleSelect = (item: ItemRow) => {
    setSelected(item);
    setQuery(item.item_code);
    setShowDropdown(false);
    setResults([]);
    setTimeout(() => epcInputRef.current?.focus(), 50);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
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
    setTimeout(() => itemInputRef.current?.focus(), 50);
  }, [selected, epc]);

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
      <div className="max-w-4xl mx-auto space-y-4">
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

            {selected && (
              <Card className="bg-muted/30 border-primary/30">
                <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Item Code</div>
                    <div className="font-mono font-semibold">{selected.item_code}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="truncate">{selected.item_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Size</div>
                    <div>{cleanSizeDisplay(selected.size)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Cost Price</div>
                    <div>{selected.cost_price ?? "-"}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <div className="text-xs text-muted-foreground">Current EPC</div>
                    <div className="font-mono text-xs break-all">
                      {selected.rfid_epc || (
                        <span className="text-muted-foreground italic">Not tagged</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
          body > *:not(.print-layout) {
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
