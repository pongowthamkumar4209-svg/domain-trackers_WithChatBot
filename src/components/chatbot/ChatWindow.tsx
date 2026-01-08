import { useState, useRef, useEffect, useCallback } from "react";
import { X, Search, ArrowRight, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface Message {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: Date;
  clarification?: ClarificationResult | null;
}

interface ClarificationResult {
  id: string;
  s_no: number | null;
  module: string;
  scenario_steps: string;
  status: string;
  offshore_comments: string;
  onsite_comments: string;
  assigned_to: string;
  date: string;
  priority: string;
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatWindow = ({ isOpen, onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hi! I'm CN Bot. Type keywords and I'll find matching clarifications.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [lastQuery, setLastQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedInput = useDebounce(inputValue, 300);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset when query changes
  useEffect(() => {
    if (debouncedInput !== lastQuery && debouncedInput) {
      setCurrentPage(0);
      setTotalMatches(0);
    }
  }, [debouncedInput, lastQuery]);

  const addMessage = useCallback((role: "bot" | "user", content: string, clarification?: ClarificationResult | null) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      clarification,
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const formatClarification = (item: ClarificationResult): string => {
    return `**#${item.s_no || "N/A"} - ${item.module}**`;
  };

  const performSearch = useCallback(async (query: string, page: number) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chatbot-search", {
        body: null,
        headers: {},
      });

      // Use fetch directly for query params support
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-search?q=${encodeURIComponent(query)}&page=${page}&size=1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const result = await response.json();
      
      setTotalMatches(result.total_matches);
      setLastQuery(query);
      setCurrentPage(page);

      if (result.items && result.items.length > 0) {
        const item = result.items[0] as ClarificationResult;
        const matchInfo = page === 0 
          ? `Found ${result.total_matches} match${result.total_matches > 1 ? "es" : ""}. Showing result ${page + 1}:`
          : `Result ${page + 1} of ${result.total_matches}:`;
        
        addMessage("bot", matchInfo, item);
      } else if (page === 0) {
        addMessage("bot", "No matching clarification found.");
      } else {
        addMessage("bot", "No more results.");
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Search cancelled");
        return;
      }
      console.error("Search error:", error);
      addMessage("bot", error.message || "Sorry, something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  const handleSearch = useCallback(() => {
    const query = inputValue.trim();
    if (!query) return;

    addMessage("user", query);
    performSearch(query, 0);
  }, [inputValue, addMessage, performSearch]);

  const handleNext = useCallback(() => {
    if (currentPage + 1 >= totalMatches) {
      addMessage("bot", "No more results.");
      return;
    }
    performSearch(lastQuery, currentPage + 1);
  }, [currentPage, totalMatches, lastQuery, performSearch, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      role="dialog"
      aria-label="CN Bot Chat"
      aria-modal="true"
    >
      {/* Header - Close button always visible */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-3 flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-semibold text-sm truncate">CN Bot</h2>
          <p className="text-white/70 text-xs truncate">Clarification Assistant</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-md text-white bg-white/20 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 h-80" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "bot"
                    ? "bg-violet-100 dark:bg-violet-900/30"
                    : "bg-primary/10"
                }`}
              >
                {msg.role === "bot" ? (
                  <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className={`flex flex-col ${msg.role === "user" ? "items-end" : ""} max-w-[80%]`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === "bot"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {msg.content}
                </div>
                
                {/* Clarification Card */}
                {msg.clarification && (
                  <div className="mt-2 w-full bg-card border border-border rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        #{msg.clarification.s_no || "N/A"}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        msg.clarification.status?.toLowerCase().includes("open")
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}>
                        {msg.clarification.status || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Module:</span>{" "}
                      <span className="text-foreground">{msg.clarification.module || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Steps:</span>
                      <p className="text-foreground mt-0.5 line-clamp-3">
                        {msg.clarification.scenario_steps || "N/A"}
                      </p>
                    </div>
                    {msg.clarification.offshore_comments && (
                      <div>
                        <span className="text-muted-foreground">Offshore:</span>
                        <p className="text-foreground mt-0.5 line-clamp-2">
                          {msg.clarification.offshore_comments}
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground pt-1 border-t border-border">
                      <span>Assigned: {msg.clarification.assigned_to || "N/A"}</span>
                      <span>{msg.clarification.date || "N/A"}</span>
                    </div>
                  </div>
                )}
                
                <span className="text-[10px] text-muted-foreground mt-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-spin" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Searching...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-background/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type keywords..."
            className="flex-1 h-9 text-sm"
            aria-label="Search keywords"
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isLoading || !inputValue.trim()}
            className="h-9 px-3"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNext}
            disabled={isLoading || totalMatches === 0 || currentPage + 1 >= totalMatches}
            className="h-9 px-3"
            aria-label="Next result"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        {totalMatches > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Result {currentPage + 1} of {totalMatches} • Press Enter to search
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
