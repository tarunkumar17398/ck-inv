import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, AlertTriangle, Search, Download, Filter, IndianRupee, Camera, BookOpen } from "lucide-react";
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
  image_url?: string | null;
  height?: string | null;
}

const SubcategoryManagement = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [panchalohaCategory, setPanchalohaCategory] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategoryHeight, setSubcategoryHeight] = useState("");
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState("");
  const [editSubcategoryHeight, setEditSubcategoryHeight] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [priceUpdates, setPriceUpdates] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPanchalohaCategory();
  }, []);

  const loadPanchalohaCategory = async () => {
    const { data: category, error } = await supabase
      .from("categories")
      .select("*")
      .eq("name", "Panchaloha Idols")
      .maybeSingle();

    if (error) {
      toast({ title: "Error loading category", description: error.message, variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Category not found", description: "Panchaloha Idols category not found", variant: "destructive" });
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
      toast({ title: "Error loading subcategories", description: error.message, variant: "destructive" });
      return;
    }

    if (!subcats || subcats.length === 0) {
      setSubcategories([]);
      return;
    }

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
        toast({ title: "Error loading piece counts", description: piecesError.message, variant: "destructive" });
        setSubcategories(subcats.map(s => ({ ...s, piece_count: 0, available_count: 0 })));
        return;
      }

      allPieces = allPieces.concat(batch || []);
      hasMore = (batch?.length || 0) === pageSize;
      from += pageSize;
    }

    const pieceCounts = allPieces.reduce((acc, piece) => {
      if (!acc[piece.subcategory_id]) acc[piece.subcategory_id] = { total: 0, available: 0 };
      acc[piece.subcategory_id].total++;
      if (piece.status === "available") acc[piece.subcategory_id].available++;
      return acc;
    }, {} as Record<string, { total: number; available: number }>);

    const subcatsWithCounts = subcats.map(subcat => ({
      ...subcat,
      piece_count: pieceCounts[subcat.id]?.total || 0,
      available_count: pieceCounts[subcat.id]?.available || 0,
      default_price: subcat.default_price ?? null,
      image_url: subcat.image_url ?? null,
      height: subcat.height ?? null,
    }));

    setSubcategories(subcatsWithCounts);
  };

  const handleImageUpload = async (file: File, subcatId: string) => {
    setUploadingId(subcatId);
    const ext = file.name.split('.').pop();
    const filePath = `${subcatId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("subcategory-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingId(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("subcategory-images").getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;
    const { error: updateError } = await supabase
      .from("subcategories")
      .update({ image_url: imageUrl })
      .eq("id", subcatId);

    setUploadingId(null);

    if (updateError) {
      toast({ title: "Error saving image URL", description: updateError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Image uploaded", description: "Photo updated successfully" });
    if (panchalohaCategory) loadSubcategories(panchalohaCategory.id);
  };

  const triggerImageUpload = (subcatId: string) => {
    uploadTargetId.current = subcatId;
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetId.current) {
      handleImageUpload(file, uploadTargetId.current);
    }
    e.target.value = "";
  };

  const handleAddSubcategory = async () => {
    if (!subcategoryName.trim()) {
      toast({ title: "Missing field", description: "Please enter a subcategory name", variant: "destructive" });
      return;
    }
    if (!panchalohaCategory) return;
    setLoading(true);

    const { error } = await supabase.from("subcategories").insert({
      category_id: panchalohaCategory.id,
      subcategory_name: subcategoryName.trim(),
      height: subcategoryHeight.trim() || null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Error adding subcategory", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Subcategory added", description: `${subcategoryName} added successfully` });
    setSubcategoryName("");
    setSubcategoryHeight("");
    setShowAddDialog(false);
    loadSubcategories(panchalohaCategory.id);
  };

  const handleEditSubcategory = async () => {
    if (!editSubcategoryName.trim()) {
      toast({ title: "Missing field", description: "Please enter a subcategory name", variant: "destructive" });
      return;
    }
    if (!editingSubcategory) return;
    setLoading(true);

    const { error } = await supabase
      .from("subcategories")
      .update({
        subcategory_name: editSubcategoryName.trim(),
        height: editSubcategoryHeight.trim() || null,
      })
      .eq("id", editingSubcategory.id);

    setLoading(false);
    if (error) {
      toast({ title: "Error updating subcategory", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Subcategory updated", description: `Updated to ${editSubcategoryName}` });
    setShowEditDialog(false);
    setEditingSubcategory(null);
    setEditSubcategoryName("");
    setEditSubcategoryHeight("");
    if (panchalohaCategory) loadSubcategories(panchalohaCategory.id);
  };

  const handleDeleteSubcategory = async (subcatId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated pieces.`)) return;
    const { error } = await supabase.from("subcategories").delete().eq("id", subcatId);
    if (error) {
      toast({ title: "Error deleting subcategory", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Subcategory deleted", description: `${name} deleted successfully` });
    if (panchalohaCategory) loadSubcategories(panchalohaCategory.id);
  };

  const openEditDialog = (subcat: Subcategory) => {
    setEditingSubcategory(subcat);
    setEditSubcategoryName(subcat.subcategory_name);
    setEditSubcategoryHeight(subcat.height || "");
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

      const { error: subError } = await supabase
        .from("subcategories")
        .update({ default_price: newPrice })
        .eq("id", subcat.id);

      if (subError) {
        toast({ title: "Error updating price", description: `${subcat.subcategory_name}: ${subError.message}`, variant: "destructive" });
        continue;
      }

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

  const filteredSubcategories = subcategories
    .filter((subcat) => subcat.subcategory_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((subcat) => !showLowStockOnly || (subcat.available_count || 0) < 5);

  return (
    <div className="min-h-screen bg-background">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={onFileSelected}
      />
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Panchaloha Idols - Subcategories
          </h1>
          <div className="flex gap-2 flex-wrap">
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
            <Button variant="outline" onClick={() => navigate("/panchaloha-catalog")}>
              <BookOpen className="w-4 h-4 mr-2" />
              Create Catalog
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
                  <div>
                    <Label>Height</Label>
                    <Input
                      placeholder="e.g., 6 inch, 12 inch"
                      value={subcategoryHeight}
                      onChange={(e) => setSubcategoryHeight(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddSubcategory} disabled={loading} className="w-full">
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
              <div>
                <Label>Height</Label>
                <Input
                  placeholder="e.g., 6 inch, 12 inch"
                  value={editSubcategoryHeight}
                  onChange={(e) => setEditSubcategoryHeight(e.target.value)}
                />
              </div>
              <Button onClick={handleEditSubcategory} disabled={loading} className="w-full">
                {loading ? "Updating..." : "Update Subcategory"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Price Update - Panchaloha Idols</DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Idol Name</TableHead>
                    <TableHead className="w-32">Current Price</TableHead>
                    <TableHead className="w-40">New Price (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcategories.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.subcategory_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.default_price != null ? `₹${s.default_price}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Enter price"
                          value={priceUpdates[s.id] || ""}
                          onChange={(e) =>
                            setPriceUpdates((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSavePrices} disabled={savingPrices}>
                  {savingPrices ? "Saving..." : "Save All"}
                </Button>
              </div>
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
          {filteredSubcategories.map((subcat) => (
            <Card key={subcat.id} className={`hover:shadow-lg transition-shadow overflow-hidden ${(subcat.available_count || 0) === 0 ? 'border-destructive bg-destructive/5' : ''}`}>
              <div className="flex">
                {/* Image on left */}
                <div className="w-36 h-44 shrink-0 bg-muted/30 flex items-center justify-center overflow-hidden">
                  {subcat.image_url ? (
                    <img
                      src={subcat.image_url.split('?')[0]}
                      alt={subcat.subcategory_name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>
                {/* Right side: info + actions */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm leading-tight break-words">{subcat.subcategory_name}</h3>
                      {subcat.height && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subcat.height}</p>
                      )}
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => triggerImageUpload(subcat.id)} disabled={uploadingId === subcat.id}>
                        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(subcat)}>
                        <Edit className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSubcategory(subcat.id, subcat.subcategory_name)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {(subcat.available_count || 0) === 0 ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 w-fit mt-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      No Stock
                    </Badge>
                  ) : (subcat.available_count || 0) < 5 ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5 w-fit mt-1 bg-orange-500">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Low Stock
                    </Badge>
                  ) : null}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-xs">Available:</span>
                      <span className={`font-bold text-lg ${(subcat.available_count || 0) === 0 ? 'text-destructive' : 'text-green-600'}`}>{subcat.available_count}</span>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" onClick={() => handleViewPieces(subcat.id, subcat.subcategory_name)}>
                      View Pieces
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredSubcategories.length === 0 && (
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
