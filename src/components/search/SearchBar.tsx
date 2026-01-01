import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Lightbulb } from 'lucide-react';
import { SearchResult } from '@/types/clarification';
import { searchClarifications } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  onResultSelect?: (result: SearchResult) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export function SearchBar({ onResultSelect, autoFocus, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const response = await searchClarifications(debouncedQuery, 5);
        setResults(response.results);
        setSuggestions(response.suggestions);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleResultClick(results[selectedIndex]);
      } else if (results.length > 0) {
        handleResultClick(results[0]);
      } else if (query.trim()) {
        // Navigate to search page with query
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setShowDropdown(false);
    setQuery('');
    onResultSelect?.(result);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder || 'Search clarifications...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className="pl-9 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (results.length > 0 || suggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-card shadow-lg">
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="border-b p-2">
              <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3" />
                Did you mean:
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestions.map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="max-h-80 overflow-auto p-1">
            {results.map((result, idx) => (
              <button
                key={result.id}
                className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                  idx === selectedIndex
                    ? 'bg-primary/10'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    #{result.row.s_no || 'N/A'}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {result.row.module}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Score: {(result.score * 100).toFixed(0)}%
                  </span>
                </div>
                {result.highlights.scenario_steps && (
                  <div
                    className="mt-1 text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: result.highlights.scenario_steps }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
