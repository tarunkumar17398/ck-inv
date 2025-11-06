import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  size: string | null;
  weight: string | null;
  status: string;
  sold_date: string | null;
  category_id: string;
  categories: { name: string; prefix: string };
}

interface CategoryGroup {
  category: string;
  prefix: string;
  items: Item[];
}

const StockPrint = () => {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }
    loadStockData();
  }, [navigate]);

  const loadStockData = async () => {
    setLoading(true);

    // Get all items (both in-stock and sold)
    const { data: items, error } = await supabase
      .from("items")
      .select("*, categories(name, prefix)")
      .order("item_code");

    if (error) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Group by category
    const grouped = new Map<string, CategoryGroup>();

    items?.forEach((item) => {
      const categoryKey = item.categories.name;
      
      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, {
          category: item.categories.name,
          prefix: item.categories.prefix,
          items: [],
        });
      }

      grouped.get(categoryKey)?.items.push(item);
    });

    setCategoryGroups(Array.from(grouped.values()));
    setLoading(false);
  };

  const handleRecycle = async () => {
    // Delete all sold items
    const { error } = await supabase
      .from("items")
      .delete()
      .eq("status", "sold");

    if (error) {
      toast({
        title: "Error recycling",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Recycled successfully",
      description: "All sold items have been removed",
    });

    loadStockData(); // Reload data
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Action buttons - hidden during print */}
      <header className="border-b bg-card shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recycle Stock
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all sold items from the database. 
                    This action cannot be undone. Make sure you have taken a backup if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRecycle}>
                    Yes, Recycle
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="default" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

      {/* Printable content */}
      <main className="container mx-auto px-4 py-8 print:px-0 print:py-0">
        {categoryGroups.map((group, index) => (
          <div key={group.category} className="mb-12 print:mb-0 print:page-break-after-always">
            {/* Category Header */}
            <div className="mb-4 print:mb-2">
              <h1 className="text-3xl font-bold print:text-2xl">{group.prefix}</h1>
              <p className="text-sm text-muted-foreground print:text-xs">
                {group.category} - Total Items: {group.items.length}
              </p>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse text-sm print:text-xs">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left py-2 px-2 font-bold">Item Code</th>
                  <th className="text-left py-2 px-2 font-bold">Particulars</th>
                  <th className="text-left py-2 px-2 font-bold">Size</th>
                  <th className="text-left py-2 px-2 font-bold">Weight</th>
                  <th className="text-center py-2 px-2 font-bold w-12">✓</th>
                  <th className="text-left py-2 px-2 font-bold">DOS</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border-b ${item.status === 'sold' ? 'text-muted-foreground line-through' : ''}`}
                  >
                    <td className="py-1.5 px-2">{item.item_code}</td>
                    <td className="py-1.5 px-2">{item.item_name}</td>
                    <td className="py-1.5 px-2">{item.size || ""}</td>
                    <td className="py-1.5 px-2">{item.weight || ""}</td>
                    <td className="py-1.5 px-2 text-center">
                      <div className="inline-block w-4 h-4 border border-foreground"></div>
                    </td>
                    <td className="py-1.5 px-2">
                      {item.sold_date 
                        ? new Date(item.sold_date).toLocaleDateString('en-GB')
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </main>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:page-break-after-always {
            page-break-after: always;
          }
          
          .print\\:mb-0 {
            margin-bottom: 0 !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .print\\:py-0 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          
          .print\\:text-2xl {
            font-size: 1.5rem !important;
            line-height: 2rem !important;
          }
          
          .print\\:text-xs {
            font-size: 0.75rem !important;
            line-height: 1rem !important;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
};

export default StockPrint;
