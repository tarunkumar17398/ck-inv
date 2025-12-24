import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface Category {
  id: string;
  name: string;
  prefix: string;
}

interface CategoryGroup {
  category: string;
  prefix: string;
  items: Item[];
}

const StockPrint = () => {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showSoldItems, setShowSoldItems] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && selectedCategory === "all") {
      // Set Brass as default category
      const brassCategory = categories.find(cat => cat.prefix === "BR");
      if (brassCategory) {
        setSelectedCategory(brassCategory.id);
      }
    }
  }, [categories]);

  useEffect(() => {
    if (selectedCategory && selectedCategory !== "all") {
      loadStockData();
    }
  }, [selectedCategory, showSoldItems]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCategories(data || []);
  };

  const loadStockData = async () => {
    if (selectedCategory === "all") return;
    
    setLoading(true);

    // Fetch all items using pagination to bypass 1000 row limit
    let allItems: Item[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from("items")
        .select("*, categories(name, prefix)")
        .eq("category_id", selectedCategory);
      
      // Only show in-stock items if sold items are hidden
      if (!showSoldItems) {
        query = query.eq("status", "in_stock");
      }
      
      const { data: items, error } = await query
        .order("item_code")
        .range(from, from + pageSize - 1);

      if (error) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (items && items.length > 0) {
        allItems = [...allItems, ...items];
        from += pageSize;
        hasMore = items.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Group by category
    const grouped = new Map<string, CategoryGroup>();

    allItems.forEach((item) => {
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

  const handleRecycle = () => {
    // Hide sold items from view (they remain in database)
    setShowSoldItems(false);
    
    toast({
      title: "Sold items hidden",
      description: "Sold items are now hidden from the Stock Print view",
    });
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex gap-2">
              {showSoldItems ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Recycle Stock
                    </Button>
                  </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hide Sold Items?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will hide all sold items from the Stock Print view. Sold items will remain in the database for history and business analysis.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRecycle}>
                      Yes, Hide Sold Items
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowSoldItems(true)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Show Sold Items
                </Button>
              )}
              <Button variant="default" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Category:</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64 bg-background">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Printable content */}
      <main className="container mx-auto px-6 py-8 print:px-0 print:py-4">
        {categoryGroups.map((group, index) => (
          <div key={group.category} className="mb-12 print:mb-6 print:page-break-after-always">
            {/* Category Name Header */}
            <h1 className="text-xl font-bold mb-4 print:text-lg print:mb-3 text-center uppercase">{group.category}</h1>

            {/* Items Table with Borders - Compact for print */}
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="border border-black">
                  <th className="text-center py-1 px-1 font-bold border border-black w-[15%]">Item Code</th>
                  <th className="text-center py-1 px-1 font-bold border border-black w-[35%]">Particulars</th>
                  <th className="text-center py-1 px-1 font-bold border border-black w-[12%]">Size</th>
                  <th className="text-center py-1 px-1 font-bold border border-black w-[12%]">Weight</th>
                  <th className="text-center py-1 px-1 font-bold border border-black w-[8%]">✓</th>
                  <th className="text-center py-1 px-1 font-bold border border-black w-[13%]">DOS</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border border-black ${item.status === 'sold' ? 'text-gray-400 line-through' : ''}`}
                  >
                    <td className="py-0.5 px-1 font-bold text-center border border-black">{item.item_code}</td>
                    <td className="py-0.5 px-1 border border-black truncate max-w-0">{item.item_name}</td>
                    <td className="py-0.5 px-1 font-bold text-center border border-black">{item.size || ""}</td>
                    <td className="py-0.5 px-1 text-center border border-black">{item.weight || ""}</td>
                    <td className="py-0.5 px-1 text-center border border-black">
                      <div className="inline-block w-3 h-3 border border-black"></div>
                    </td>
                    <td className="py-0.5 px-1 text-center border border-black">
                      {item.sold_date 
                        ? new Date(item.sold_date).toLocaleDateString("en-GB")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </main>

      {/* Print styles - Optimized for 40-45 items per page */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm 8mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 9pt !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:page-break-after-always {
            page-break-after: always;
          }
          
          .print\\:mb-3 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1rem !important;
          }
          
          .print\\:px-0 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .print\\:py-4 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1rem !important;
            line-height: 1.25rem !important;
          }
          
          table {
            page-break-inside: auto;
            font-size: 8pt !important;
          }
          
          th, td {
            padding: 2px 4px !important;
            line-height: 1.2 !important;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
            height: auto !important;
          }
          
          thead {
            display: table-header-group;
          }
          
          h1 {
            margin-bottom: 4px !important;
            font-size: 12pt !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StockPrint;
