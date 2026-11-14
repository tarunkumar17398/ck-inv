import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, IndianRupee, RotateCcw, Tags } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { applyManualPrice, calculateRevisedPrice, DEFAULT_RATE_REVISION_SETTINGS, type RateRevisionSettings } from "@/lib/rateRevision";
import { formatPriceLabel } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  prefix: string;
}

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  weight: string | null;
  price: number | null;
  old_price: number | null;
  category_id: string;
  status: string;
}

type FilterMode = "To revise" | "Skipped" | "All";
const SETTINGS_KEY = "ck-rate-revision-settings";
const PAGE_SIZE = 1000;

function readSettings(): RateRevisionSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_RATE_REVISION_SETTINGS;
    const parsed = JSON.parse(saved) as Partial<RateRevisionSettings>;
    const allowedSteps = [10, 50, 100, 200] as const;
    return {
      ratePerKg: Number.isFinite(parsed.ratePerKg) ? Number(parsed.ratePerKg) : DEFAULT_RATE_REVISION_SETTINGS.ratePerKg,
      markup: Number.isFinite(parsed.markup) ? Number(parsed.markup) : DEFAULT_RATE_REVISION_SETTINGS.markup,
      oldRateThreshold: Number.isFinite(parsed.oldRateThreshold) ? Number(parsed.oldRateThreshold) : DEFAULT_RATE_REVISION_SETTINGS.oldRateThreshold,
      maxIncreasePct: Number.isFinite(parsed.maxIncreasePct) ? Number(parsed.maxIncreasePct) : DEFAULT_RATE_REVISION_SETTINGS.maxIncreasePct,
      roundTo: allowedSteps.includes(parsed.roundTo as 10 | 50 | 100 | 200)
        ? parsed.roundTo as RateRevisionSettings["roundTo"]
        : DEFAULT_RATE_REVISION_SETTINGS.roundTo,
    };
  } catch {
    return DEFAULT_RATE_REVISION_SETTINGS;
  }
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function csvCell(value: string | number | null): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const RateRevision = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<RateRevisionSettings>(readSettings);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [committedManualPrices, setCommittedManualPrices] = useState<Record<string, string>>({});
  const [overrideWarnings, setOverrideWarnings] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("To revise");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadCategories = async () => {
      const { data, error } = await supabase.from("categories").select("id, name, prefix").order("name");
      if (!alive) return;
      if (error) {
        toast({ title: "Could not load categories", description: error.message, variant: "destructive" });
        return;
      }
      const loaded = data || [];
      setCategories(loaded);
      const brass = loaded.find((category) => category.prefix.toUpperCase() === "BR");
      if (brass) setCategoryId(brass.id);
    };
    void loadCategories();
    return () => { alive = false; };
  }, [toast]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!categoryId) return;
    let alive = true;
    const fetchItems = async () => {
      setLoading(true);
      const allItems: InventoryItem[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("items")
          .select("id, item_code, item_name, particulars, weight, price, old_price, category_id, status")
          .eq("category_id", categoryId)
          .eq("status", "in_stock")
          .order("item_code")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) {
          if (alive) toast({ title: "Could not load inventory", description: error.message, variant: "destructive" });
          break;
        }
        if (!data?.length) break;
        allItems.push(...data);
        if (data.length < PAGE_SIZE) break;
        page += 1;
      }
      if (alive) {
        setItems(allItems);
        setSelectedIds(new Set());
        setOverrides({});
        setCommittedManualPrices({});
        setOverrideWarnings({});
        setLoading(false);
      }
    };
    void fetchItems();
    return () => { alive = false; };
  }, [categoryId, toast]);

  const rows = useMemo(() => items.map((item) => {
    const calc = calculateRevisedPrice(item, settings);
    const warning = overrideWarnings[item.id];
    const result = warning
      ? { ...calc, newPrice: null, note: warning, skipReason: warning }
      : applyManualPrice(calc, item.price, committedManualPrices[item.id] || "");
    return { item, calc, result, warning };
  }), [items, settings, committedManualPrices, overrideWarnings]);

  const readyRows = rows.filter(({ result }) => result.newPrice !== null);
  const skippedRows = rows.filter(({ result }) => result.newPrice === null);
  const totalBefore = readyRows.reduce((total, { item }) => total + (item.price || 0), 0);
  const totalAfter = readyRows.reduce((total, { result }) => total + (result.newPrice || 0), 0);
  const averageIncrease = readyRows.length
    ? (() => {
        const pricedRows = readyRows.filter(({ item }) => (item.price || 0) > 0);
        return pricedRows.length
          ? pricedRows.reduce((total, { item, result }) => total + (((result.newPrice || 0) - (item.price || 0)) / (item.price || 0)) * 100, 0) / pricedRows.length
          : 0;
      })()
    : 0;
  const cappedCount = rows.filter(({ result }) => result.capped).length;
  const applicableSelectedCount = readyRows.filter(({ item }) => selectedIds.has(item.id)).length;
  const query = search.trim().toLowerCase();
  const visibleRows = rows.filter(({ item, calc }) => {
    const matchesMode = filter === "All" || (filter === "To revise" ? calc.newPrice !== null : calc.newPrice === null);
    const matchesSearch = !query || item.item_code.toLowerCase().includes(query) || item.item_name.toLowerCase().includes(query) || (item.particulars || "").toLowerCase().includes(query);
    return matchesMode && matchesSearch;
  });

  const changeNumber = (key: Exclude<keyof RateRevisionSettings, "roundTo">, value: string) => {
    setSettings((current) => ({ ...current, [key]: value === "" ? 0 : Number(value) }));
  };

  const commitManualPrice = (item: InventoryItem, draftValue: string) => {
    const manualValue = draftValue.replace(/\D/g, "");
    if (!manualValue) {
      setOverrides((current) => {
        const updated = { ...current };
        delete updated[item.id];
        return updated;
      });
      setCommittedManualPrices((current) => {
        const updated = { ...current };
        delete updated[item.id];
        return updated;
      });
      setOverrideWarnings((current) => {
        const updated = { ...current };
        delete updated[item.id];
        return updated;
      });
      return;
    }

    const validation = applyManualPrice(calculateRevisedPrice(item, settings), item.price, manualValue);
    const warning = validation.skipReason === "Minimum price is ₹100" || validation.skipReason === "Price cannot decrease"
      ? validation.skipReason
      : null;
    if (warning) {
      setCommittedManualPrices((current) => {
        const updated = { ...current };
        delete updated[item.id];
        return updated;
      });
      setOverrideWarnings((current) => ({ ...current, [item.id]: warning }));
      return;
    }

    setCommittedManualPrices((current) => ({ ...current, [item.id]: manualValue }));
    setOverrideWarnings((current) => {
      const updated = { ...current };
      delete updated[item.id];
      return updated;
    });
  };

  const toggleItem = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const updated = new Set(current);
      if (checked) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  const selectVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const updated = new Set(current);
      visibleRows.forEach(({ item, result }) => {
        if (checked && result.newPrice !== null) updated.add(item.id);
        else if (!checked) updated.delete(item.id);
      });
      return updated;
    });
  };

  const downloadCsv = () => {
    const header = ["Item Code", "Particulars", "Weight (kg)", "Old Price", "Old ₹/kg", "New Price", "Price Code", "Note"];
    const contents = [header, ...rows.map(({ item, result }) => [
      item.item_code,
      item.particulars || item.item_name,
      result.weightKg?.toFixed(3) ?? "",
      item.price ?? "",
      result.currentPerKg?.toFixed(2) ?? "",
      result.newPrice ?? "",
      result.newPrice === null ? "" : formatPriceLabel(result.newPrice),
      result.note,
    ])].map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rate-revision-preview.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applySelected = async () => {
    const selectedRows = readyRows.filter(({ item }) => selectedIds.has(item.id));
    if (!selectedRows.length) return;
    const revisionTime = new Date().toISOString();
    setProgress({ done: 0, total: selectedRows.length });
    setConfirmOpen(false);
    let completed = 0;
    const failedCodes: string[] = [];
    for (let offset = 0; offset < selectedRows.length; offset += 20) {
      const batch = selectedRows.slice(offset, offset + 20);
      const outcomes = await Promise.all(batch.map(async ({ item, result }) => {
        const { error } = await supabase.from("items").update({
          old_price: item.price,
          price: result.newPrice,
          price_revised_at: revisionTime,
        }).eq("id", item.id);
        return { item, result, error };
      }));
      outcomes.forEach(({ item, error }) => {
        if (error) failedCodes.push(item.item_code);
        else completed += 1;
      });
      setProgress({ done: offset + batch.length, total: selectedRows.length });
    }
    const succeeded = new Set(selectedRows.filter(({ item }) => !failedCodes.includes(item.item_code)).map(({ item }) => item.id));
    if (succeeded.size) {
      setItems((current) => current.map((item) => {
        if (!succeeded.has(item.id)) return item;
        return { ...item, old_price: item.price, price: rows.find((row) => row.item.id === item.id)?.result.newPrice ?? item.price };
      }));
      setSelectedIds((current) => new Set([...current].filter((id) => !succeeded.has(id))));
    }
    setProgress(null);
    toast({
      title: `Updated ${completed} of ${selectedRows.length} prices`,
      description: failedCodes.length ? `Could not update: ${failedCodes.slice(0, 8).join(", ")}${failedCodes.length > 8 ? "…" : ""}` : "The new rates are saved.",
      variant: failedCodes.length ? "destructive" : "default",
    });
  };

  const undoLatest = async () => {
    setUndoLoading(true);
    setUndoConfirmOpen(false);
    const revised: Array<{ id: string; price_revised_at: string; old_price: number | null }> = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase.from("items").select("id, price_revised_at, old_price")
        .not("price_revised_at", "is", null).order("price_revised_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) {
        toast({ title: "Could not find the latest revision", description: error.message, variant: "destructive" });
        setUndoLoading(false);
        return;
      }
      if (!data?.length) break;
      revised.push(...data as Array<{ id: string; price_revised_at: string; old_price: number | null }>);
      if (data.length < PAGE_SIZE) break;
      page += 1;
    }
    if (!revised.length) {
      toast({ title: "No revised prices to undo" });
      setUndoLoading(false);
      return;
    }
    const latestTimestamp = revised[0]?.price_revised_at;
    const latestBatch = revised.filter((item) => item.price_revised_at === latestTimestamp);
    let restored = 0;
    const failed: string[] = [];
    for (let offset = 0; offset < latestBatch.length; offset += 20) {
      const outcomes = await Promise.all(latestBatch.slice(offset, offset + 20).map(async (item) => {
        const { error } = await supabase.from("items").update({ price: item.old_price, old_price: null, price_revised_at: null }).eq("id", item.id);
        return { item, error };
      }));
      for (const outcome of outcomes) {
        if (outcome.error) failed.push(outcome.item.id);
        else restored += 1;
      }
    }
    if (restored) {
      const restoredIds = new Set(latestBatch.filter((item) => !failed.includes(item.id)).map((item) => item.id));
      setItems((current) => current.map((item) => {
        if (!restoredIds.has(item.id)) return item;
        const before = latestBatch.find((entry) => entry.id === item.id);
        return before ? { ...item, price: before.old_price, old_price: null } : item;
      }));
    }
    toast({
      title: `Restored ${restored} of ${latestBatch.length} prices`,
      description: failed.length ? "Some items could not be restored." : "The latest revision batch was undone.",
      variant: failed.length ? "destructive" : "default",
    });
    setUndoLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="outline" size="icon" aria-label="Back to dashboard"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div><h1 className="text-xl font-semibold">Rate Revision</h1><p className="text-sm text-muted-foreground">Review old-rate stock before changing prices</p></div>
          </div>
          <Link to="/rate-sticker-print"><Button variant="outline"><Tags className="mr-2 h-4 w-4" />Rate Stickers</Button></Link>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Rate revision settings">
          <div className="space-y-2"><Label>Category</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name} ({category.prefix})</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="rate-per-kg">Rate per kg (₹)</Label><Input id="rate-per-kg" type="number" min="0" value={settings.ratePerKg} onChange={(event) => changeNumber("ratePerKg", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="rate-markup">Markup</Label><Input id="rate-markup" type="number" min="0" step="0.1" value={settings.markup} onChange={(event) => changeNumber("markup", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="old-threshold">Old-rate threshold (₹/kg)</Label><Input id="old-threshold" type="number" min="0" value={settings.oldRateThreshold} onChange={(event) => changeNumber("oldRateThreshold", event.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="increase-cap">Max increase (%)</Label><Input id="increase-cap" type="number" min="0" value={settings.maxIncreasePct} onChange={(event) => changeNumber("maxIncreasePct", event.target.value)} /></div>
            <div className="space-y-2"><Label>Round to (₹)</Label><Select value={String(settings.roundTo)} onValueChange={(value) => setSettings((current) => ({ ...current, roundTo: Number(value) as RateRevisionSettings["roundTo"] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[10, 50, 100, 200].map((step) => <SelectItem key={step} value={String(step)}>₹{step}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </section>
        <p className="text-sm text-muted-foreground">Formula: weight in kg × rate per kg × markup. Prices only increase; items already above the threshold are skipped. Settings are saved on this device.</p>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Revision summary">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Items to revise</p><p className="mt-1 text-2xl font-semibold">{readyRows.length.toLocaleString()}</p><p className="text-xs text-muted-foreground">selected: {selectedIds.size.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Stock value</p><p className="mt-1 font-semibold">{currency(totalBefore)} <span className="text-muted-foreground">→</span> {currency(totalAfter)}</p><p className="text-xs text-muted-foreground">Before → after, for eligible items</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Average increase</p><p className="mt-1 text-2xl font-semibold">{averageIncrease.toFixed(1)}%</p><p className="text-xs text-muted-foreground">eligible items</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Capped / skipped</p><p className="mt-1 text-2xl font-semibold">{cappedCount.toLocaleString()} <span className="text-muted-foreground">/ {skippedRows.length.toLocaleString()}</span></p><p className="text-xs text-muted-foreground">At cap / not eligible</p></CardContent></Card>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          {(["To revise", "Skipped", "All"] as const).map((mode) => <Button key={mode} variant={filter === mode ? "default" : "outline"} onClick={() => setFilter(mode)}>{mode}</Button>)}
          <Input className="w-full sm:ml-auto sm:w-72" placeholder="Search code or name" aria-label="Search code or name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button variant="outline" onClick={downloadCsv}><Download className="mr-2 h-4 w-4" />Preview CSV</Button>
          <Button variant="outline" disabled={undoLoading} onClick={() => setUndoConfirmOpen(true)}><RotateCcw className="mr-2 h-4 w-4" />Undo last</Button>
          <Button disabled={!applicableSelectedCount || !!progress} onClick={() => setConfirmOpen(true)}><IndianRupee className="mr-2 h-4 w-4" />Apply {applicableSelectedCount} prices</Button>
        </div>
        {progress && <div className="space-y-2" role="status"><div className="flex justify-between text-sm"><span>Saving revised prices</span><span>{progress.done} / {progress.total}</span></div><Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} /></div>}

        <div className="overflow-hidden rounded-md border bg-card">
          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted"><tr className="border-b text-left">
                <th className="w-10 px-3 py-3"><Checkbox aria-label="Select all visible items" checked={visibleRows.length > 0 && visibleRows.filter(({ result }) => result.newPrice !== null).every(({ item }) => selectedIds.has(item.id))} onCheckedChange={(checked) => selectVisible(checked === true)} /></th>
                <th className="px-3 py-3">Code</th><th className="px-3 py-3">Particulars</th><th className="px-3 py-3">Weight (kg)</th><th className="px-3 py-3">Old price</th><th className="px-3 py-3">Old ₹/kg</th><th className="px-3 py-3">New price</th><th className="px-3 py-3">Price code</th><th className="px-3 py-3">Note</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td className="px-4 py-12 text-center text-muted-foreground" colSpan={9}>Loading stock…</td></tr> : visibleRows.map(({ item, result }) => <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2"><Checkbox aria-label={`Select ${item.item_code}`} checked={selectedIds.has(item.id)} disabled={result.newPrice === null} onCheckedChange={(checked) => toggleItem(item.id, checked === true)} /></td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{item.item_code}</td>
                  <td className="max-w-64 px-3 py-2"><div className="truncate" title={item.particulars || item.item_name}>{item.particulars || item.item_name}</div></td>
                  <td className="whitespace-nowrap px-3 py-2">{result.weightKg === null ? "—" : `${result.weightKg.toFixed(3)} kg`}</td>
                  <td className="whitespace-nowrap px-3 py-2">{item.price === null ? "—" : currency(item.price)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{result.currentPerKg === null ? "—" : currency(result.currentPerKg)}</td>
                  <td className="w-36 px-3 py-2"><Input aria-label={`New price for ${item.item_code}`} type="text" inputMode="numeric" value={overrides[item.id] ?? committedManualPrices[item.id] ?? ""} placeholder={calc.newPrice === null ? "—" : String(calc.newPrice)} onChange={(event) => setOverrides((current) => ({ ...current, [item.id]: event.target.value.replace(/\D/g, "") }))} onBlur={(event) => commitManualPrice(item, event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitManualPrice(item, event.currentTarget.value); event.currentTarget.blur(); } }} /></td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono">{result.newPrice === null ? "—" : formatPriceLabel(result.newPrice)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${warning ? "text-destructive" : "text-muted-foreground"}`}>{warning || result.note}</td>
                </tr>)}
                {!loading && visibleRows.length === 0 && <tr><td className="px-4 py-12 text-center text-muted-foreground" colSpan={9}>No items match this view.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">Showing {visibleRows.length.toLocaleString()} of {items.length.toLocaleString()} in-stock items</div>
        </div>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply {readyRows.filter(({ item }) => selectedIds.has(item.id)).length} new prices?</AlertDialogTitle><AlertDialogDescription>This saves each current price for undo and applies the selected new prices together. Barcode values do not change.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void applySelected(); }}>Apply prices</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={undoConfirmOpen} onOpenChange={setUndoConfirmOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Undo the latest rate revision?</AlertDialogTitle><AlertDialogDescription>Items from the most recent batch will return to their previous prices.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void undoLatest(); }}>Undo latest batch</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RateRevision;