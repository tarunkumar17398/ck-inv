import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  name: string;
  prefix: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryPrefix, setCategoryPrefix] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

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

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryPrefix(category.prefix);
    } else {
      setEditingCategory(null);
      setCategoryName("");
      setCategoryPrefix("");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!categoryName || !categoryPrefix) {
      toast({
        title: "Missing fields",
        description: "Please provide both name and prefix",
        variant: "destructive",
      });
      return;
    }

    if (editingCategory) {
      // Update
      const { error } = await supabase
        .from("categories")
        .update({ name: categoryName, prefix: categoryPrefix.toUpperCase() })
        .eq("id", editingCategory.id);

      if (error) {
        toast({
          title: "Error updating category",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Category updated",
        description: `${categoryName} has been updated`,
      });
    } else {
      // Create
      const { data: newCat, error } = await supabase
        .from("categories")
        .insert({ name: categoryName, prefix: categoryPrefix.toUpperCase() })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error creating category",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Initialize counter
      await supabase
        .from("item_code_counters")
        .insert({ category_id: newCat.id, current_number: 1, current_letter: null });

      toast({
        title: "Category created",
        description: `${categoryName} (CK${categoryPrefix}) has been created`,
      });
    }

    setDialogOpen(false);
    loadCategories();
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Manage Categories</h1>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{cat.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDialog(cat)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">CK{cat.prefix}</p>
                <p className="text-sm text-muted-foreground mt-1">Category Prefix</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Brass"
              />
            </div>
            <div>
              <Label>Prefix (2 letters)</Label>
              <Input
                value={categoryPrefix}
                onChange={(e) => setCategoryPrefix(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="e.g., BR"
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Will be used as CK{categoryPrefix || "XX"}
              </p>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingCategory ? "Update Category" : "Add Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;