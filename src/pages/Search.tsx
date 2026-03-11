import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { SearchBar } from "@/components/search/SearchBar";
import { DetailModal } from "@/components/clarifications/DetailModal";
import { searchClarifications } from "@/services/searchService";
import { Clarification, SearchResult } from "@/types/clarification";
import { formatDisplayDate } from "@/services/excelParser";
import { Loader2 } from "lucide-react";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Clarification | null>(null);
  const query = params.get("q") || "";

  const runSearch = async (q: string) => {
    if (!q) return;
    setLoading(true);
    const r = await searchClarifications(q, 50);
    setResults(r.results);
    setLoading(false);
  };

  useEffect(() => { runSearch(query); }, [query]);

  const handleResult = (r: SearchResult) => {
    setSelected(r.row);
    setParams({ q: query });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Search Clarifications</h2>
          <p className="text-sm text-muted-foreground">Full-text search across all CN fields</p>
        </div>

        <SearchBar
          autoFocus
          onResultSelect={handleResult}
          placeholder="Search by module, keywords, comments..."
        />

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{results.length} result(s) for "{query}"</p>
            {results.map((r) => (
              <button
                key={r.id}
                className="w-full text-left rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                onClick={() => setSelected(r.row)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">#{r.row.s_no || "N/A"}</span>
                  <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {r.row.module}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDisplayDate(r.row.date)}</span>
                </div>
                {r.highlights.scenario_steps && (
                  <div
                    className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: r.highlights.scenario_steps }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <p className="text-muted-foreground">No results found for "{query}".</p>
        )}
      </div>

      <DetailModal
        clarification={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </MainLayout>
  );
}
