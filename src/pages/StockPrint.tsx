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
    <div className="min-h-screen bg-white text-black">
      {/* Action buttons - hidden during print */}
      <header className="border-b bg-white shadow-sm print:hidden">
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
      <main className="container mx-auto px-6 py-8 print:px-0 print:py-4">
        {categoryGroups.map((group, index) => (
          <div key={group.category} className="mb-12 print:mb-6 print:page-break-after-always">
            {/* Category Name Header */}
            <h1 className="text-xl font-bold mb-4 print:text-lg print:mb-3 text-center uppercase">{group.category}</h1>

            {/* Items Table with Borders */}
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="border border-black">
                  <th className="text-left py-2 px-3 font-semibold text-sm border border-black">Item Code</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm border border-black">Particulars</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm border border-black">Size</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm border border-black">Weight</th>
                  <th className="text-center py-2 px-3 font-semibold text-sm border border-black w-12">✓</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm border border-black">DOS</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border border-black ${item.status === 'sold' ? 'text-gray-400 line-through' : ''}`}
                  >
                    <td className="py-2 px-3 text-sm font-bold border border-black">{item.item_code}</td>
                    <td className="py-2 px-3 text-sm border border-black">{item.item_name}</td>
                    <td className="py-2 px-3 text-sm font-bold border border-black">{item.size || ""}</td>
                    <td className="py-2 px-3 text-sm border border-black">{item.weight || ""}</td>
                    <td className="py-2 px-3 text-center border border-black">
                      <div className="inline-block w-4 h-4 border border-black"></div>
                    </td>
                    <td className="py-2 px-3 text-sm border border-black">
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
            margin: 15mm 10mm;
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
          
          .print\\:mb-3 {
            margin-bottom: 0.75rem !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .print\\:py-4 {
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1.125rem !important;
            line-height: 1.75rem !important;
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
        }
      `}</style>
    </div>
  );
};

export default StockPrint;
