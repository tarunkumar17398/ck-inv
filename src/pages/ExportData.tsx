import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Copy, Filter, Download, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPriceLabel, formatWeightLabel } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  size: string | null;
  weight: string | null;
  color_code: string | null;
  price: number | null;
  created_at: string;
  categories: { name: string; prefix: string };
}

const ExportData = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("today");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }
    loadItems();
  }, [navigate, filter]);

  const loadItems = async () => {
    const now = new Date();
    let startDate: Date;

    switch (filter) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    // Fetch regular items
    const { data: regularItems, error: itemsError } = await supabase
      .from("items")
      .select("*, categories(name, prefix)")
      .eq("status", "in_stock")
      .gte("created_at", startDate.toISOString());

    if (itemsError) {
      toast({
        title: "Error loading items",
        description: itemsError.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch Panchaloha pieces
    const { data: pieces, error: piecesError } = await supabase
      .from("item_pieces")
      .select("*, subcategories(subcategory_name, categories(name, prefix))")
      .gte("date_added", startDate.toISOString());

    if (piecesError) {
      toast({
        title: "Error loading pieces",
        description: piecesError.message,
        variant: "destructive",
      });
      return;
    }

    // Transform pieces to match Item interface
    const transformedPieces = pieces?.map((piece: any) => ({
      id: piece.id,
      item_code: piece.piece_code,
      item_name: piece.subcategories?.subcategory_name || "",
      particulars: piece.notes,
      size: null,
      weight: null,
      color_code: null,
      price: piece.cost_price,
      created_at: piece.date_added,
      categories: piece.subcategories?.categories || { name: "Panchaloha Idols", prefix: "PI" }
    })) || [];

    // Combine and sort by created_at (latest first)
    const combined = [...(regularItems || []), ...transformedPieces].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setItems(combined);
  };

  const copyTableToClipboard = () => {
    const headers = ["ITEM CODE", "ITEM NAME", "SIZE", "Weight (g)", "Weight (CKBR)", "Sno", "Barcode", "Price", "O"];
    const rows = items.map(item => [
      item.item_code,
      item.item_name || "",
      item.size || "",
      item.weight || "",
      item.weight ? formatWeightLabel(item.weight) : "",
      `S.No:`,
      item.item_code,
      item.price ? formatPriceLabel(item.price) : "",
      "O"
    ]);

    const tsv = [
      headers.join("\t"),
      ...rows.map(row => row.join("\t"))
    ].join("\n");

    navigator.clipboard.writeText(tsv).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Data copied in Excel/Access format",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Please try selecting and copying manually",
        variant: "destructive",
      });
    });
  };

  const handleBackupAllData = async () => {
    // Fetch all items (both in-stock and sold)
    const { data: allItems, error: itemsError } = await supabase
      .from("items")
      .select("*, categories(name, prefix)");

    if (itemsError) {
      toast({
        title: "Error fetching items",
        description: itemsError.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch all Panchaloha pieces
    const { data: allPieces, error: piecesError } = await supabase
      .from("item_pieces")
      .select("*, subcategories(subcategory_name, categories(name, prefix))");

    if (piecesError) {
      toast({
        title: "Error fetching pieces",
        description: piecesError.message,
        variant: "destructive",
      });
      return;
    }

    // Transform pieces to match export format
    const transformedPieces = allPieces?.map((piece: any) => ({
      item_code: piece.piece_code,
      item_name: piece.subcategories?.subcategory_name || "",
      category: piece.subcategories?.categories?.name || "Panchaloha Idols",
      size: "",
      weight: "",
      cost_price: piece.cost_price || "",
      selling_price: "",
      sold_price: "",
      status: piece.status,
      created_at: piece.date_added,
      sold_date: piece.date_sold || ""
    })) || [];

    // Transform regular items
    const transformedItems = allItems?.map(item => ({
      item_code: item.item_code,
      item_name: item.item_name,
      category: item.categories?.name || "",
      size: item.size || "",
      weight: item.weight || "",
      cost_price: item.cost_price || "",
      selling_price: item.price || "",
      sold_price: item.sold_price || "",
      status: item.status,
      created_at: item.created_at,
      sold_date: item.sold_date || ""
    })) || [];

    // Combine and sort by created_at (latest first)
    const combined = [...transformedItems, ...transformedPieces].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Create CSV content
    const headers = ["Item Code", "Item Name", "Category", "Size", "Weight", "Cost Price", "Selling Price", "Sold Price", "Status", "Created Date", "Sold Date"];
    const rows = combined.map(item => [
      item.item_code,
      item.item_name,
      item.category,
      item.size,
      item.weight,
      item.cost_price,
      item.selling_price,
      item.sold_price,
      item.status,
      format(new Date(item.created_at), "yyyy-MM-dd"),
      item.sold_date ? format(new Date(item.sold_date), "yyyy-MM-dd") : ""
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_backup_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Backup created",
      description: `Exported ${allItems?.length} items to CSV`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Export & Backup Data</h1>
            <p className="text-muted-foreground">Copy formatted data or create complete backups</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleBackupAllData} variant="default">
              <Database className="w-4 h-4 mr-2" />
              Backup All Data
            </Button>
            <Button onClick={copyTableToClipboard} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Displayed Data
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {items.length} items found
          </span>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">ITEM CODE</TableHead>
                <TableHead className="font-bold">ITEM NAME</TableHead>
                <TableHead className="font-bold">SIZE</TableHead>
                <TableHead className="font-bold">Weight1</TableHead>
                <TableHead className="font-bold">Weight (CKBR format)</TableHead>
                <TableHead className="font-bold">Sno</TableHead>
                <TableHead className="font-bold">Barcode</TableHead>
                <TableHead className="font-bold">Price</TableHead>
                <TableHead className="font-bold">O</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="font-mono text-sm">
                  <TableCell className="font-semibold">{item.item_code}</TableCell>
                  <TableCell>{item.item_name || ""}</TableCell>
                  <TableCell>{item.size || ""}</TableCell>
                  <TableCell>{item.weight || ""}</TableCell>
                  <TableCell>{item.weight ? formatWeightLabel(item.weight) : ""}</TableCell>
                  <TableCell>S.No:</TableCell>
                  <TableCell>{item.item_code}</TableCell>
                  <TableCell>{item.price ? formatPriceLabel(item.price) : ""}</TableCell>
                  <TableCell>O</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No items found for the selected time period
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>Copy Displayed Data:</strong> Click to copy the filtered items shown below in Excel/Access format. You can paste directly into spreadsheets.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Backup All Data:</strong> Downloads a complete CSV backup of ALL items (both in-stock and sold) with full details including cost prices and profit margins. Use this before recycling stock or for record keeping.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ExportData;
