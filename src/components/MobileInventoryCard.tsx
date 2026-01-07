import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
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
  price: number | null;
  cost_price: number | null;
  categories: {
    name: string;
  };
}

interface MobileInventoryCardProps {
  item: Item;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function MobileInventoryCard({
  item,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: MobileInventoryCardProps) {
  const priceRatio = (() => {
    const weight = parseFloat(item.weight || "0");
    const price = parseFloat(item.price?.toString() || "0");
    if (weight > 0 && price > 0) {
      return (price / weight).toFixed(2);
    }
    return null;
  })();

  const isLowRatio = priceRatio !== null && parseFloat(priceRatio) < 3;

  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        isSelected && "bg-primary/5 border-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mt-1"
          aria-label={`Select ${item.item_code}`}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-mono font-bold text-base">{item.item_code}</span>
            <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
              {item.categories.name}
            </span>
          </div>
          
          <p className="text-sm text-foreground mb-2 line-clamp-2">{item.item_name}</p>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight:</span>
              <span className="font-medium">
                {item.weight ? `${parseFloat(item.weight).toLocaleString()}g` : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{item.size || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-medium">
                {item.cost_price ? `₹${item.cost_price.toLocaleString()}` : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold text-primary">
                {item.price ? `₹${item.price.toLocaleString()}` : "-"}
              </span>
            </div>
          </div>

          {priceRatio && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Ratio:</span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded font-semibold",
                  isLowRatio ? "bg-destructive text-destructive-foreground" : "bg-muted"
                )}
              >
                {priceRatio}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
          <Pencil className="w-4 h-4 mr-1.5" />
          Edit
        </Button>
        <Button size="sm" variant="outline" onClick={onDuplicate}>
          <Copy className="w-4 h-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{item.item_code}</strong> - {item.item_name}?
                <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
