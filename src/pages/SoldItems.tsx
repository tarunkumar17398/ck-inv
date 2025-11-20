import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SoldItem {
  id: string;
  item_code: string;
  item_name: string;
  particulars: string | null;
  size: string | null;
  weight: string | null;
  sold_price: number | null;
  sold_date: string | null;
  categories: { name: string; prefix: string };
}

const SoldItems = () => {
  const [items, setItems] = useState<SoldItem[]>([]);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }
    loadSoldItems();
  }, [navigate]);

  const loadSoldItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*, categories(name, prefix)")
      .eq("status", "sold")
      .order("sold_date", { ascending: false });

    if (error) {
      toast({
        title: "Error loading sold items",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems(data || []);
  };

  const updateSoldDate = async (itemId: string, newDate: Date) => {
    const { error } = await supabase
      .from("items")
      .update({ sold_date: newDate.toISOString() })
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Error updating date",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Date updated",
      description: "Sold date has been updated successfully",
    });

    setEditingDateId(null);
    loadSoldItems();
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
        <h1 className="text-3xl font-bold text-foreground mb-6">Sold Items History</h1>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Sold Price</TableHead>
                <TableHead>Sold Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold">{item.item_code}</TableCell>
                  <TableCell>{item.categories.name}</TableCell>
                  <TableCell>{item.particulars || "-"}</TableCell>
                  <TableCell>{item.size || "-"}</TableCell>
                  <TableCell>{item.weight ? `${item.weight}g` : "-"}</TableCell>
                  <TableCell className="font-semibold">
                    {item.sold_price ? `₹${item.sold_price}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Popover open={editingDateId === item.id} onOpenChange={(open) => setEditingDateId(open ? item.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            "justify-start text-left font-normal p-2 h-auto",
                            !item.sold_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {item.sold_date
                            ? format(new Date(item.sold_date), "MMM dd, yyyy")
                            : "Set date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={item.sold_date ? new Date(item.sold_date) : undefined}
                          onSelect={(date) => date && updateSoldDate(item.id, date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No sold items yet
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SoldItems;