import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, AlertTriangle, Search, Download, Filter, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Subcategory {
  id: string;
  subcategory_name: string;
  created_at: string;
  piece_count?: number;
  available_count?: number;
  default_price?: number | null;
}

const SubcategoryManagement = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [panchalohaCategory, setPanchalohaCategory] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [priceUpdates, setPriceUpdates] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPanchalohaCategory();
  }, []);

  const loadPanchalohaCategory = async () => {
    // Find Panchaloha Idols category
    const { data: category, error } = await supabase
      .from("categories")
      .select("*")
      .eq("name", "Panchaloha Idols")
      .maybeSingle();

    if (error) {
      toast({
        title: "Error loading category",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Category not found",
        description: "Panchaloha Idols category not found",
        variant: "destructive",
      });
      return;
    }

    setPanchalohaCategory(category);
    loadSubcategories(category.id);
  };

  const loadSubcategories = async (categoryId: string) => {
    const { data: subcats, error } = await supabase
      .from("subcategories")
      .select("*")
      .eq("category_id", categoryId)
      .order("subcategory_name");

    if (error) {
      toast({
        title: "Error loading subcategories",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (!subcats || subcats.length === 0) {
      setSubcategories([]);
      return;
    }

    // Fetch ALL pieces using pagination to avoid 1000-row limit
    const subcategoryIds = subcats.map(s => s.id);
    let allPieces: { subcategory_id: string; status: string }[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: piecesError } = await supabase
        .from("item_pieces")
        .select("subcategory_id, status")
        .in("subcategory_id", subcategoryIds)
        .range(from, from + pageSize - 1);

      if (piecesError) {
        toast({
          title: "Error loading piece counts",
          description: piecesError.message,
          variant: "destructive",
        });
        setSubcategories(subcats.map(s => ({ ...s, piece_count: 0, available_count: 0 })));
        return;
      }

      allPieces = allPieces.concat(batch || []);
      hasMore = (batch?.length || 0) === pageSize;
      from += pageSize;
    }

    // Count pieces in memory
    const pieceCounts = allPieces.reduce((acc, piece) => {
      if (!acc[piece.subcategory_id]) {
        acc[piece.subcategory_id] = { total: 0, available: 0 };
      }
      acc[piece.subcategory_id].total++;
      if (piece.status === "available") {
        acc[piece.subcategory_id].available++;
      }
      return acc;
    }, {} as Record<string, { total: number; available: number }>);

    // Attach counts to subcategories
    const subcatsWithCounts = subcats.map(subcat => ({
      ...subcat,
      piece_count: pieceCounts[subcat.id]?.total || 0,
      available_count: pieceCounts[subcat.id]?.available || 0,
      default_price: subcat.default_price ?? null,
    }));

    setSubcategories(subcatsWithCounts);
  };

  const handleAddSubcategory = async () => {
    if (!subcategoryName.trim()) {
      toast({
        title: "Missing field",
        description: "Please enter a subcategory name",
        variant: "destructive",
      });
      return;
    }

    if (!panchalohaCategory) return;

    setLoading(true);

    const { error } = await supabase.from("subcategories").insert({
      category_id: panchalohaCategory.id,
      subcategory_name: subcategoryName.trim(),
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error adding subcategory",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Subcategory added",
      description: `${subcategoryName} added successfully`,
    });

    setSubcategoryName("");
    setShowAddDialog(false);
    loadSubcategories(panchalohaCategory.id);
  };

  const handleEditSubcategory = async () => {
    if (!editSubcategoryName.trim()) {
      toast({
        title: "Missing field",
        description: "Please enter a subcategory name",
        variant: "destructive",
      });
      return;
    }

    if (!editingSubcategory) return;

    setLoading(true);

    const { error } = await supabase
      .from("subcategories")
      .update({ subcategory_name: editSubcategoryName.trim() })
      .eq("id", editingSubcategory.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error updating subcategory",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Subcategory updated",
      description: `Updated to ${editSubcategoryName}`,
    });

    setShowEditDialog(false);
    setEditingSubcategory(null);
    setEditSubcategoryName("");
    if (panchalohaCategory) {
      loadSubcategories(panchalohaCategory.id);
    }
  };

  const handleDeleteSubcategory = async (subcatId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated pieces.`)) {
      return;
    }

    const { error } = await supabase.from("subcategories").delete().eq("id", subcatId);

    if (error) {
      toast({
        title: "Error deleting subcategory",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Subcategory deleted",
      description: `${name} deleted successfully`,
    });

    if (panchalohaCategory) {
      loadSubcategories(panchalohaCategory.id);
    }
  };

  const openEditDialog = (subcat: Subcategory) => {
    setEditingSubcategory(subcat);
    setEditSubcategoryName(subcat.subcategory_name);
    setShowEditDialog(true);
  };

  const handleViewPieces = (subcategoryId: string, subcategoryName: string) => {
    navigate(`/panchaloha-pieces?subcategory=${subcategoryId}&name=${encodeURIComponent(subcategoryName)}`);
  };

  const handleDownloadList = () => {
    const filtered = subcategories.filter((s) =>
      s.subcategory_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const csvRows = ["S.No,Subcategory Name,Available Qty"];
    filtered.forEach((s, i) => {
      csvRows.push(`${i + 1},"${s.subcategory_name}",${s.available_count || 0}`);
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Panchaloha_Stock_List.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPriceDialog = () => {
    const initial: Record<string, string> = {};
    subcategories.forEach((s) => {
      initial[s.id] = s.default_price != null ? String(s.default_price) : "";
    });
    setPriceUpdates(initial);
    setShowPriceDialog(true);
  };

  const handleSavePrices = async () => {
    setSavingPrices(true);
    let updatedCount = 0;

    for (const subcat of subcategories) {
      const newPriceStr = priceUpdates[subcat.id];
      const newPrice = newPriceStr ? parseFloat(newPriceStr) : null;
      const oldPrice = subcat.default_price ?? null;

      if (newPrice === oldPrice) continue;
      if (newPriceStr === "" && oldPrice === null) continue;

      // Update subcategory default_price
      const { error: subError } = await supabase
        .from("subcategories")
        .update({ default_price: newPrice })
        .eq("id", subcat.id);

      if (subError) {
        toast({ title: "Error updating price", description: `${subcat.subcategory_name}: ${subError.message}`, variant: "destructive" });
        continue;
      }

      // Bulk update all pieces' cost_price
      const { error: piecesError } = await supabase
        .from("item_pieces")
        .update({ cost_price: newPrice })
        .eq("subcategory_id", subcat.id);

      if (piecesError) {
        toast({ title: "Error updating pieces", description: `${subcat.subcategory_name}: ${piecesError.message}`, variant: "destructive" });
        continue;
      }

      updatedCount++;
    }

    setSavingPrices(false);
    setShowPriceDialog(false);

    if (updatedCount > 0) {
      toast({ title: "Prices updated", description: `${updatedCount} subcategory price(s) updated successfully` });
      if (panchalohaCategory) loadSubcategories(panchalohaCategory.id);
    } else {
      toast({ title: "No changes", description: "No prices were changed" });
    }
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Panchaloha Idols - Subcategories
          </h1>
          <div className="flex gap-2">
            <Button
              variant={showLowStockOnly ? "destructive" : "outline"}
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showLowStockOnly ? "Show All" : "Low Stock"}
            </Button>
            <Button variant="outline" onClick={handleDownloadList}>
              <Download className="w-4 h-4 mr-2" />
              Download List
            </Button>
            <Button variant="outline" onClick={openPriceDialog}>
              <IndianRupee className="w-4 h-4 mr-2" />
              Price Update
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subcategory
                </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subcategory</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Subcategory Name *</Label>
                  <Input
                    placeholder="e.g., Nataraja, Lakshmi, Hanuman"
                    value={subcategoryName}
                    onChange={(e) => setSubcategoryName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddSubcategory}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Adding..." : "Add Subcategory"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subcategory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Subcategory Name *</Label>
                <Input
                  placeholder="Enter subcategory name"
                  value={editSubcategoryName}
                  onChange={(e) => setEditSubcategoryName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleEditSubcategory}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Updating..." : "Update Subcategory"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search subcategories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subcategories
            .filter((subcat) =>
              subcat.subcategory_name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .filter((subcat) => !showLowStockOnly || (subcat.available_count || 0) < 5)
            .map((subcat) => (
            <Card key={subcat.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start gap-2">
                  <span>{subcat.subcategory_name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(subcat)}
                    >
                      <Edit className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubcategory(subcat.id, subcat.subcategory_name)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-6">
                    {(subcat.available_count || 0) < 5 && (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1 w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Available: <span className="font-bold text-lg text-green-600">{subcat.available_count}</span>
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleViewPieces(subcat.id, subcat.subcategory_name)}
                  >
                    View Pieces
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {subcategories.filter((subcat) =>
          subcat.subcategory_name.toLowerCase().includes(searchQuery.toLowerCase())
        ).filter((subcat) => !showLowStockOnly || (subcat.available_count || 0) < 5).length === 0 && (
          <Card className="p-8 text-center col-span-full">
            <p className="text-muted-foreground">
              {searchQuery ? `No subcategories found matching "${searchQuery}"` : showLowStockOnly ? "No low stock subcategories found." : "No subcategories found. Add your first subcategory to get started."}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SubcategoryManagement;
