import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ItemPiece {
  id: string;
  piece_code: string;
  status: string;
  date_added: string;
  date_sold: string | null;
  notes: string | null;
}

const PiecesManagement = () => {
  const [searchParams] = useSearchParams();
  const subcategoryId = searchParams.get("subcategory");
  const subcategoryName = searchParams.get("name");
  
  const [pieces, setPieces] = useState<ItemPiece[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<ItemPiece | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (subcategoryId) {
      loadPieces();
    }
  }, [subcategoryId]);

  const loadPieces = async () => {
    if (!subcategoryId) return;

    const { data, error } = await supabase
      .from("item_pieces")
      .select("*")
      .eq("subcategory_id", subcategoryId)
      .order("piece_code");

    if (error) {
      toast({
        title: "Error loading pieces",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setPieces(data || []);
  };

  const generateNextPieceCode = async () => {
    // Get the category ID for Panchaloha Idols
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("name", "Panchaloha Idols")
      .single();

    if (!category) return null;

    // Use the existing item_code_counters system
    const { data: codeData, error: codeError } = await supabase
      .rpc("generate_next_item_code", { p_category_id: category.id });

    if (codeError) {
      console.error("Error generating piece code:", codeError);
      return null;
    }

    return codeData;
  };

  const handleAddPiece = async () => {
    if (!subcategoryId) return;

    setLoading(true);

    const pieceCode = await generateNextPieceCode();
    
    if (!pieceCode) {
      toast({
        title: "Error",
        description: "Failed to generate piece code",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("item_pieces").insert({
      subcategory_id: subcategoryId,
      piece_code: pieceCode,
      status: "available",
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error adding piece",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Piece added",
      description: `Piece ${pieceCode} added successfully`,
    });

    setNotes("");
    setShowAddDialog(false);
    loadPieces();
  };

  const handleEditPiece = (piece: ItemPiece) => {
    setSelectedPiece(piece);
    setNotes(piece.notes || "");
    setShowEditDialog(true);
  };

  const handleUpdatePiece = async () => {
    if (!selectedPiece) return;

    setLoading(true);

    const { error } = await supabase
      .from("item_pieces")
      .update({
        notes: notes.trim() || null,
      })
      .eq("id", selectedPiece.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error updating piece",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Piece updated",
      description: "Notes updated successfully",
    });

    setShowEditDialog(false);
    setSelectedPiece(null);
    setNotes("");
    loadPieces();
  };

  const handleMarkAsSold = async (piece: ItemPiece) => {
    if (!confirm(`Mark piece ${piece.piece_code} as sold?`)) return;

    const { error } = await supabase
      .from("item_pieces")
      .update({
        status: "sold",
        date_sold: new Date().toISOString(),
      })
      .eq("id", piece.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Piece marked as sold",
      description: `${piece.piece_code} is now sold`,
    });

    loadPieces();
  };

  const handleMarkAsAvailable = async (piece: ItemPiece) => {
    if (!confirm(`Mark piece ${piece.piece_code} as available?`)) return;

    const { error } = await supabase
      .from("item_pieces")
      .update({
        status: "available",
        date_sold: null,
      })
      .eq("id", piece.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Piece marked as available",
      description: `${piece.piece_code} is now available`,
    });

    loadPieces();
  };

  const handleDeletePiece = async (piece: ItemPiece) => {
    if (!confirm(`Are you sure you want to delete piece ${piece.piece_code}?`)) return;

    const { error } = await supabase
      .from("item_pieces")
      .delete()
      .eq("id", piece.id);

    if (error) {
      toast({
        title: "Error deleting piece",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Piece deleted",
      description: `${piece.piece_code} deleted successfully`,
    });

    loadPieces();
  };

  const availablePieces = pieces.filter((p) => p.status === "available");
  const soldPieces = pieces.filter((p) => p.status === "sold");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/panchaloha-subcategories")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subcategories
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{subcategoryName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total: {pieces.length} | Available: {availablePieces.length} | Sold: {soldPieces.length}
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Piece
          </Button>
        </div>

        <div className="space-y-6">
          {/* Available Pieces */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Available Pieces ({availablePieces.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availablePieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{piece.piece_code}</p>
                      {piece.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{piece.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Added: {format(new Date(piece.date_added), "PPP")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPiece(piece)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsSold(piece)}
                      >
                        Mark Sold
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePiece(piece)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {availablePieces.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No available pieces</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sold Pieces */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Sold Pieces ({soldPieces.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {soldPieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent opacity-60"
                  >
                    <div className="flex-1">
                      <p className="font-semibold line-through">{piece.piece_code}</p>
                      {piece.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{piece.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Sold: {piece.date_sold ? format(new Date(piece.date_sold), "PPP") : "N/A"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsAvailable(piece)}
                      >
                        Mark Available
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePiece(piece)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {soldPieces.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No sold pieces</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Piece Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Piece</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                A new piece code will be automatically generated (CKPI####)
              </p>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any notes about this piece"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAddPiece}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Adding..." : "Add Piece"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Piece Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Piece - {selectedPiece?.piece_code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes about this piece"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                onClick={handleUpdatePiece}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Updating..." : "Update Piece"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PiecesManagement;
