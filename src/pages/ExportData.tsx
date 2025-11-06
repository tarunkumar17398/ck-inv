import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Copy, Filter } from "lucide-react";
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

    const { data, error } = await supabase
      .from("items")
      .select("*, categories(name, prefix)")
      .eq("status", "in_stock")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading items",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems(data || []);
  };

  const copyTableToClipboard = () => {
    const headers = ["ITEM CODE", "PARTICULARS", "SIZE", "Weight1", "Weight", "Sno", "Barcode", "Price", "O"];
    const rows = items.map(item => [
      item.item_code,
      item.particulars || "",
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Export Data for Access</h1>
            <p className="text-muted-foreground">Copy formatted data to paste into your Access database</p>
          </div>
          <Button onClick={copyTableToClipboard}>
            <Copy className="w-4 h-4 mr-2" />
            Copy All Data
          </Button>
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
                <TableHead className="font-bold">PARTICULARS</TableHead>
                <TableHead className="font-bold">SIZE</TableHead>
                <TableHead className="font-bold">Weight1</TableHead>
                <TableHead className="font-bold">Weight</TableHead>
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
                  <TableCell>{item.particulars || ""}</TableCell>
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

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Click "Copy All Data" to copy the entire table, or select specific rows and use Ctrl+C (Cmd+C on Mac) to copy them.
            The data is formatted with tabs and can be pasted directly into Excel or Access.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ExportData;
