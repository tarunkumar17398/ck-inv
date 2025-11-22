import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, AlertTriangle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Subcategory {
  id: string;
  subcategory_name: string;
  created_at: string;
  piece_count?: number;
  available_count?: number;
}

const SubcategoryManagement = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [panchalohaCategory, setPanchalohaCategory] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionStorage.getItem("admin_logged_in")) {
      navigate("/");
      return;
    }
    loadPanchalohaCategory();
  }, [navigate]);

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

    // Fetch all pieces for all subcategories in a single query
    const subcategoryIds = subcats.map(s => s.id);
    const { data: allPieces, error: piecesError } = await supabase
      .from("item_pieces")
      .select("subcategory_id, status")
      .in("subcategory_id", subcategoryIds);

    if (piecesError) {
      toast({
        title: "Error loading piece counts",
        description: piecesError.message,
        variant: "destructive",
      });
      setSubcategories(subcats.map(s => ({ ...s, piece_count: 0, available_count: 0 })));
      return;
    }

    // Count pieces in memory
    const pieceCounts = (allPieces || []).reduce((acc, piece) => {
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

  const handleViewPieces = (subcategoryId: string, subcategoryName: string) => {
    navigate(`/panchaloha-pieces?subcategory=${subcategoryId}&name=${encodeURIComponent(subcategoryName)}`);
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
            .map((subcat) => (
            <Card key={subcat.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{subcat.subcategory_name}</span>
                    {(subcat.piece_count || 0) < 5 && (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSubcategory(subcat.id, subcat.subcategory_name)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Total Pieces: <span className="font-semibold text-foreground">{subcat.piece_count}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Available: <span className="font-semibold text-green-600">{subcat.available_count}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sold: <span className="font-semibold text-red-600">{(subcat.piece_count || 0) - (subcat.available_count || 0)}</span>
                  </p>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
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
        ).length === 0 && (
          <Card className="p-8 text-center col-span-full">
            <p className="text-muted-foreground">
              {searchQuery ? `No subcategories found matching "${searchQuery}"` : "No subcategories found. Add your first subcategory to get started."}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SubcategoryManagement;
