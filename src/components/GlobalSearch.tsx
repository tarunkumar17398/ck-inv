import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Layers, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  code: string;
  name: string;
  category: string;
  type: "item" | "piece";
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search items
        const { data: itemResults } = await supabase
          .from("items")
          .select("id, item_code, item_name, categories(name)")
          .eq("status", "in_stock")
          .or(`item_code.ilike.%${query}%,item_name.ilike.%${query}%`)
          .limit(5);

        // Search pieces
        const { data: pieceResults } = await supabase
          .from("item_pieces")
          .select("id, piece_code, subcategories(subcategory_name, categories(name))")
          .eq("status", "available")
          .ilike("piece_code", `%${query}%`)
          .limit(5);

        const combinedResults: SearchResult[] = [
          ...(itemResults || []).map((item: any) => ({
            id: item.id,
            code: item.item_code,
            name: item.item_name,
            category: item.categories?.name || "Unknown",
            type: "item" as const,
          })),
          ...(pieceResults || []).map((piece: any) => ({
            id: piece.id,
            code: piece.piece_code,
            name: piece.subcategories?.subcategory_name || "Piece",
            category: piece.subcategories?.categories?.name || "Panchaloha",
            type: "piece" as const,
          })),
        ];

        setResults(combinedResults);
        setIsOpen(combinedResults.length > 0 || query.length >= 2);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleResultClick(results[selectedIndex]);
      } else if (query.length >= 2) {
        navigate(`/inventory?search=${encodeURIComponent(query)}`);
        setIsOpen(false);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "item") {
      navigate(`/inventory?search=${encodeURIComponent(result.code)}`);
    } else {
      navigate(`/pieces?search=${encodeURIComponent(result.code)}`);
    }
    setIsOpen(false);
    setQuery("");
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search items, pieces, codes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 hover:bg-accent text-left transition-colors",
                    selectedIndex === index && "bg-accent"
                  )}
                >
                  {result.type === "item" ? (
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Layers className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">{result.code}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                        {result.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{result.name}</p>
                  </div>
                </button>
              ))}
              <div className="border-t px-4 py-2">
                <button
                  onClick={() => {
                    navigate(`/inventory?search=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Search all for "{query}" →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
              <button
                onClick={() => {
                  navigate(`/inventory?search=${encodeURIComponent(query)}`);
                  setIsOpen(false);
                  setQuery("");
                }}
                className="block w-full mt-2 text-sm text-primary hover:underline"
              >
                Search in full inventory →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
