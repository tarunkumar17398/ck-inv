import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Copy, Filter, Download, Database, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPriceLabel, formatWeightLabel, formatSizeWithInches } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, [filter]);

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

    // Helper to parse size and weight from notes
    const parseNotes = (notes: string | null) => {
      if (!notes) return { size: null, weight: null };
      const sizeMatch = notes.match(/Size:\s*([^-,]+)/i);
      const weightMatch = notes.match(/Weight:\s*(\d+(?:\.\d+)?)\s*g/i);
      return {
        size: sizeMatch ? formatSizeWithInches(sizeMatch[1].trim()) : null,
        weight: weightMatch ? weightMatch[1].trim() : null
      };
    };

    // Transform pieces to match Item interface
    const transformedPieces = pieces?.map((piece: any) => {
      const { size, weight } = parseNotes(piece.notes);
      return {
        id: piece.id,
        item_code: piece.piece_code,
        item_name: piece.subcategories?.subcategory_name || "",
        particulars: piece.notes,
        size,
        weight,
        color_code: null,
        price: piece.cost_price,
        created_at: piece.date_added,
        categories: piece.subcategories?.categories || { name: "Panchaloha Idols", prefix: "PI" }
      };
    }) || [];

    // Combine and sort by created_at (latest first)
    const combined = [...(regularItems || []), ...transformedPieces].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setItems(combined);
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const downloadFilteredAsCSV = () => {
    const filteredItems = items.filter(item => item.item_code.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filteredItems.length === 0) {
      toast({
        title: "No data to download",
        description: "No items match the current filter",
        variant: "destructive",
      });
      return;
    }

    const headers = ["ITEM CODE", "ITEM NAME", "SIZE", "Weight (g)", "Weight (CKBR)", "Sno", "Barcode", "Price", "O"];
    const rows = filteredItems.map(item => [
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

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_data_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV downloaded",
      description: `${filteredItems.length} items exported to CSV`,
    });
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

  const copySelectedToClipboard = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to copy",
        variant: "destructive",
      });
      return;
    }

    const selectedItemsData = items.filter(item => selectedItems.has(item.id));
    const rows = selectedItemsData.map(item => [
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

    const tsv = rows.map(row => row.join("\t")).join("\n");

    navigator.clipboard.writeText(tsv).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${selectedItems.size} items copied without headers`,
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Please try again",
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

    // Helper to parse size and weight from notes
    const parseNotesForBackup = (notes: string | null) => {
      if (!notes) return { size: "", weight: "" };
      const sizeMatch = notes.match(/Size:\s*([^-,]+)/i);
      const weightMatch = notes.match(/Weight:\s*(\d+(?:\.\d+)?)\s*g/i);
      return {
        size: sizeMatch ? formatSizeWithInches(sizeMatch[1].trim()) || "" : "",
        weight: weightMatch ? weightMatch[1].trim() : ""
      };
    };

    // Transform pieces to match export format
    const transformedPieces = allPieces?.map((piece: any) => {
      const { size, weight } = parseNotesForBackup(piece.notes);
      return {
        item_code: piece.piece_code,
        item_name: piece.subcategories?.subcategory_name || "",
        category: piece.subcategories?.categories?.name || "Panchaloha Idols",
        size,
        weight,
        cost_price: piece.cost_price || "",
        selling_price: "",
        sold_price: "",
        status: piece.status,
        created_at: piece.date_added,
        sold_date: piece.date_sold || ""
      };
    }) || [];

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
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBackupAllData} variant="default">
              <Database className="w-4 h-4 mr-2" />
              Backup All Data
            </Button>
            <Button onClick={downloadFilteredAsCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button onClick={copySelectedToClipboard} variant="secondary" disabled={selectedItems.size === 0}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Selected ({selectedItems.size})
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
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by item code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {items.filter(item => item.item_code.toLowerCase().includes(searchQuery.toLowerCase())).length} items found
          </span>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-auto">
          <Table>
            <TableHeader className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>
              <TableRow className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>
                <TableHead className="w-12 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    className="cursor-pointer w-4 h-4"
                  />
                </TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>ITEM CODE</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>ITEM NAME</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>SIZE</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>Weight1</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>Weight (CKBR format)</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>Sno</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>Barcode</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>Price</TableHead>
                <TableHead className="font-bold select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}>O</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items
                .filter(item => item.item_code.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                <TableRow key={item.id} className="font-mono text-sm">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="cursor-pointer w-4 h-4"
                    />
                  </TableCell>
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
          {items.filter(item => item.item_code.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? `No items found matching "${searchQuery}"` : "No items found for the selected time period"}
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
