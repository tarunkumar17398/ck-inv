import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Printer, Tags } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { sortByPriceOrItemCode, type ItemSortOption } from "@/lib/itemSorting";
import { formatPriceLabel, formatSizeWithInches } from "@/lib/utils";

interface Category { id: string; name: string; prefix: string }
interface StickerItem {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  price: number | null;
  size: string | null;
  category_id: string;
  price_revised_at: string | null;
  rate_label_printed_at: string | null;
}
interface RateLabel { left: StickerItem; right: StickerItem | null }
type PrintMode = "pending" | "all";
const PAGE_SIZE = 1000;

const RateStickerPrint = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [mode, setMode] = useState<PrintMode>("pending");
  const [items, setItems] = useState<StickerItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ItemSortOption>("price-desc");
  const [cutLine, setCutLine] = useState(true);
  const [printBatch, setPrintBatch] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markConfirmOpen, setMarkConfirmOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadCategories = async () => {
      const { data, error } = await supabase.from("categories").select("id, name, prefix").order("name");
      if (!alive) return;
      if (error) { toast({ title: "Could not load categories", description: error.message, variant: "destructive" }); return; }
      const loaded = data || [];
      setCategories(loaded);
      const brass = loaded.find((category) => category.prefix.toUpperCase() === "BR");
      if (brass) setCategoryId(brass.id);
    };
    void loadCategories();
    return () => { alive = false; };
  }, [toast]);

  useEffect(() => {
    if (!categoryId) { setItems([]); return; }
    let alive = true;
    const loadItems = async () => {
      setLoading(true);
      const all: StickerItem[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase.from("items")
          .select("id, item_code, item_name, particulars, price, size, category_id, price_revised_at, rate_label_printed_at")
          .eq("category_id", categoryId).eq("status", "in_stock").order("item_code")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) {
          if (alive) toast({ title: "Could not load stickers", description: error.message, variant: "destructive" });
          break;
        }
        if (!data?.length) break;
        all.push(...data);
        if (data.length < PAGE_SIZE) break;
        page += 1;
      }
      if (alive) {
        setItems(all);
        setSelectedIds(new Set());
        setPrintBatch([]);
        setLoading(false);
      }
    };
    void loadItems();
    return () => { alive = false; };
  }, [categoryId, toast]);

  const availableItems = useMemo(() => items.filter((item) => {
    if (mode === "pending") {
      if (!item.price_revised_at) return false;
      const printedAt = item.rate_label_printed_at;
      if (printedAt && Date.parse(printedAt) >= Date.parse(item.price_revised_at)) return false;
    }
    return true;
  }), [items, mode]);
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return availableItems;
    return availableItems.filter((item) => item.item_code.toLowerCase().includes(term) || item.item_name.toLowerCase().includes(term) || (item.particulars || "").toLowerCase().includes(term));
  }, [availableItems, search]);
  const sortedFilteredItems = useMemo(() => sortByPriceOrItemCode(filteredItems, sort, (item) => ({ item_code: item.item_code, price: item.price })), [filteredItems, sort]);
  const selectedItems = useMemo(() => availableItems.filter((item) => selectedIds.has(item.id)).sort((a, b) => a.item_code.localeCompare(b.item_code)), [availableItems, selectedIds]);
  const labels: RateLabel[] = useMemo(() => {
    const result: RateLabel[] = [];
    for (let index = 0; index < printBatch.length; index += 2) {
      result.push({ left: printBatch[index]!, right: printBatch[index + 1] || null });
    }
    return result;
  }, [printBatch]);

  const toggleItem = (id: string, checked: boolean) => setSelectedIds((current) => {
    const next = new Set(current);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });

  const selectNext50 = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredItems.filter((item) => !next.has(item.id)).slice(0, 50).forEach((item) => next.add(item.id));
      return next;
    });
  };
  const selectAll = () => setSelectedIds((current) => new Set([...current, ...filteredItems.map((item) => item.id)]));
  const clearSelection = () => setSelectedIds(new Set());

  const generate = () => {
    if (!selectedItems.length) {
      toast({ title: "Select items first", description: "Choose at least one in-stock item to make rate stickers." });
      return;
    }
    setPrintBatch(selectedItems);
  };

  const markPrinted = async () => {
    if (!printBatch.length) return;
    setMarking(true);
    setMarkConfirmOpen(false);
    const ids = printBatch.map((item) => item.id);
    const timestamp = new Date().toISOString();
    let successIds: string[] = [];
    const failures: string[] = [];
    for (let offset = 0; offset < ids.length; offset += 200) {
      const chunk = ids.slice(offset, offset + 200);
      const { error } = await supabase.from("items").update({ rate_label_printed_at: timestamp }).in("id", chunk);
      if (error) failures.push(error.message);
      else successIds = [...successIds, ...chunk];
    }
    const successSet = new Set(successIds);
    setItems((current) => current.map((item) => successSet.has(item.id) ? { ...item, rate_label_printed_at: timestamp } : item));
    setSelectedIds((current) => new Set([...current].filter((id) => !successSet.has(id))));
    setPrintBatch([]);
    setMarking(false);
    toast({
      title: `Marked ${successIds.length} of ${ids.length} items as printed`,
      description: failures.length ? failures[0] : "The pending sticker list has been refreshed.",
      variant: failures.length ? "destructive" : "default",
    });
  };

  const renderHalf = (item: StickerItem | null, side: "left" | "right") => (
    <div className={`rate-label-half rate-label-${side}`}>
      {item && <>
        <span className="rate-label-mark">O</span>
        <span className="rate-label-code">S.No: {item.item_code}</span>
        <span className="rate-label-particulars">{item.particulars || item.item_name}</span>
        <span className="rate-label-price">{item.price === null ? "" : formatPriceLabel(item.price)}</span>
        <span className="rate-label-size">{formatSizeWithInches(item.size) || ""}</span>
      </>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card print:hidden">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3"><Link to="/dashboard"><Button variant="outline" size="icon" aria-label="Back to dashboard"><ArrowLeft className="h-4 w-4" /></Button></Link><div><h1 className="text-xl font-semibold">Rate Stickers</h1><p className="text-sm text-muted-foreground">Two replacement price labels per print</p></div></div>
          <Link to="/rate-revision"><Button variant="outline"><Tags className="mr-2 h-4 w-4" />Rate Revision</Button></Link>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6 print:hidden">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Mode</Label><Select value={mode} onValueChange={(value) => { setMode(value as PrintMode); setSelectedIds(new Set()); setPrintBatch([]); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Price changed, sticker pending</SelectItem><SelectItem value="all">All in-stock items</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Category</Label><Select value={categoryId} onValueChange={(value) => { setCategoryId(value); setPrintBatch([]); }}><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name} ({category.prefix})</SelectItem>)}</SelectContent></Select></div>
        </section>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="w-full sm:w-72" placeholder="Search code or name" aria-label="Search code or name" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select value={sort} onValueChange={(value) => setSort(value as ItemSortOption)}><SelectTrigger className="w-full sm:w-52" aria-label="Sort inventory"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="price-desc">Price: high to low</SelectItem><SelectItem value="price-asc">Price: low to high</SelectItem><SelectItem value="item-code">Item code</SelectItem></SelectContent></Select>
          <Button variant="outline" onClick={selectNext50}>+50</Button><Button variant="outline" onClick={selectAll}>All</Button><Button variant="outline" onClick={clearSelection}>Clear</Button>
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected / {filteredItems.length} available</span>
          <Button className="sm:ml-auto" onClick={generate}><Tags className="mr-2 h-4 w-4" />Generate</Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!printBatch.length}><Printer className="mr-2 h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={() => setMarkConfirmOpen(true)} disabled={!printBatch.length || marking}><Check className="mr-2 h-4 w-4" />Mark printed</Button>
        </div>
        <div className="flex items-center gap-2"><Checkbox id="cut-line" checked={cutLine} onCheckedChange={(checked) => setCutLine(checked === true)} /><Label htmlFor="cut-line">Cut line at middle</Label></div>

        <section className="overflow-hidden rounded-md border bg-card">
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full min-w-[680px] text-sm"><thead className="sticky top-0 bg-muted"><tr className="border-b text-left"><th className="w-10 px-3 py-3" aria-label="Select item" /><th className="px-3 py-3">Code</th><th className="px-3 py-3">Particulars</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Revised</th><th className="px-3 py-3">Sticker status</th></tr></thead>
              <tbody>{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading items…</td></tr> : sortedFilteredItems.map((item) => {
                const pending = item.price_revised_at && (!item.rate_label_printed_at || Date.parse(item.rate_label_printed_at) < Date.parse(item.price_revised_at));
                return <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-2"><Checkbox aria-label={`Select ${item.item_code}`} checked={selectedIds.has(item.id)} onCheckedChange={(checked) => toggleItem(item.id, checked === true)} /></td><td className="whitespace-nowrap px-3 py-2 font-medium">{item.item_code}</td><td className="max-w-72 px-3 py-2"><div className="truncate" title={item.particulars || item.item_name}>{item.particulars || item.item_name}</div></td><td className="whitespace-nowrap px-3 py-2">{item.price === null ? "—" : `₹${item.price.toLocaleString("en-IN")}`}</td><td className="whitespace-nowrap px-3 py-2">{item.price_revised_at ? new Date(item.price_revised_at).toLocaleDateString("en-GB") : "—"}</td><td className="px-3 py-2 text-muted-foreground">{pending ? "Sticker pending" : item.price_revised_at ? "Printed" : "Not revised"}</td></tr>;
              })}{!loading && filteredItems.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No items in this list.</td></tr>}</tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3 text-sm text-muted-foreground">{sortedFilteredItems.length.toLocaleString()} items in this list</div>
        </section>

        {printBatch.length > 0 && <section className="space-y-3">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Print preview</h2><p className="text-sm text-muted-foreground">{printBatch.length} products · {labels.length} labels</p></div></div>
          <div className="space-y-3 overflow-x-auto pb-3">{labels.slice(0, 6).map((label, index) => <div key={`${label.left.id}-${label.right?.id || "blank"}-${index}`} className="rate-label-preview">
            {renderHalf(label.left, "left")}{renderHalf(label.right, "right")}{cutLine && <span className="rate-label-cut" aria-hidden="true" />}
          </div>)}</div>
          {labels.length > 6 && <p className="text-sm text-muted-foreground">Showing first 6 of {labels.length} labels</p>}
        </section>}
      </main>

      <div className="rate-print-layout" aria-hidden="true">{labels.map((label, index) => <div key={`${label.left.id}-${label.right?.id || "blank"}-${index}`} className="rate-print-label">
        {renderHalf(label.left, "left")}{renderHalf(label.right, "right")}{cutLine && <span className="rate-label-cut" />}
      </div>)}</div>

      <style>{`
        .rate-label-preview {
          position: relative;
          width: 110mm;
          height: 28mm;
          box-sizing: border-box;
          overflow: hidden;
          border: 1px solid hsl(var(--border));
          background: white;
          color: black;
          font-family: Calibri, Arial, sans-serif;
          flex: 0 0 auto;
        }
        .rate-print-layout { display: none; }
        .rate-label-half { position: absolute; top: 0; width: 55mm; height: 28mm; overflow: hidden; color: black; }
        .rate-label-left { left: 0; }
        .rate-label-right { left: 55mm; }
        .rate-label-mark, .rate-label-code, .rate-label-particulars, .rate-label-price, .rate-label-size { position: absolute; display: block; font-weight: 400; white-space: normal; }
        .rate-label-mark { left: 6.9mm; top: 6mm; font-size: 11pt; }
        .rate-label-code { left: 12mm; top: -1mm; font-size: 11pt; white-space: nowrap; }
        .rate-label-particulars { left: 11mm; top: 4mm; width: 44mm; max-height: 9mm; overflow: hidden; overflow-wrap: anywhere; line-height: 1.2; font-size: 9pt; }
        .rate-label-price { left: 12mm; top: 12mm; font-size: 11pt; white-space: nowrap; }
        .rate-label-size { left: 38mm; top: 12mm; font-size: 11pt; white-space: nowrap; }
        .rate-label-cut { position: absolute; z-index: 2; left: 55mm; top: 0; height: 28mm; border-left: 0.2mm dashed black; }
        @media print {
          @page { size: 110mm 28mm; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; }
          .rate-print-layout, .rate-print-layout * { visibility: visible !important; }
          .rate-print-layout { position: static !important; display: block !important; }
          .rate-print-label { position: relative; width: 110mm !important; height: 28mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; page-break-after: always !important; page-break-inside: avoid !important; background: white !important; color: black !important; font-family: Calibri, Arial, sans-serif !important; }
          .rate-print-label:last-child { page-break-after: auto !important; }
          .rate-label-half { position: absolute !important; top: 0 !important; width: 55mm !important; height: 28mm !important; overflow: hidden !important; }
          .rate-label-left { left: 0 !important; }
          .rate-label-right { left: 55mm !important; }
          .rate-label-mark { left: 6.9mm !important; top: 6mm !important; font-size: 11pt !important; }
          .rate-label-code { left: 12mm !important; top: -1mm !important; font-size: 11pt !important; }
          .rate-label-particulars { left: 11mm !important; top: 4mm !important; width: 44mm !important; max-height: 9mm !important; font-size: 9pt !important; line-height: 1.2 !important; }
          .rate-label-price { left: 12mm !important; top: 12mm !important; font-size: 11pt !important; }
          .rate-label-size { left: 38mm !important; top: 12mm !important; font-size: 11pt !important; }
          .rate-label-cut { left: 55mm !important; top: 0 !important; height: 28mm !important; }
        }
      `}</style>

      <AlertDialog open={markConfirmOpen} onOpenChange={setMarkConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Mark {printBatch.length} items as printed?</AlertDialogTitle><AlertDialogDescription>This marks the current print batch complete, so it will no longer appear in the pending-sticker list unless its price changes again.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void markPrinted(); }}>Mark printed</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};

export default RateStickerPrint;