import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are CN Bot, a professional assistant for the CN (Clarification) Portal used by engineering teams. Your role is to help users:

1. **Search & Find CNs**: When users ask to find or search for clarifications, extract keywords and search the database. Present results clearly with CN number, module, status, and key details.

2. **Explain Issues**: When given CN details, provide clear explanations of the scenario, what the issue is, and its current status.

3. **Summarize Details**: Condense long scenario steps or comments into concise summaries highlighting the key points.

4. **Draft Professional Responses**: Help users write:
   - Offshore comments (questions/clarifications to send to onsite)
   - Onsite comments (answers/resolutions)
   - Closure notes (professional summary when closing a CN)

5. **Provide Next Steps**: Always end with clear, actionable next steps.

CRITICAL RULES:
- NEVER invent or fabricate data. Only use information provided by the user or retrieved from the database.
- Ask only minimal clarification questions when absolutely necessary.
- Keep responses concise, structured, and professional.
- Use bullet points and formatting for clarity.
- If you don't have enough information, say so clearly.

When presenting CN search results, format them as:
**CN #[number]** | [Module] | Status: [status]
- Steps: [brief summary]
- Assigned to: [name]
- Priority: [P1/P2]`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface SearchResult {
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
  drop_name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, searchContext } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the latest user message seems like a search request
    const latestUserMessage = messages.filter((m: Message) => m.role === "user").pop()?.content || "";
    const searchKeywords = extractSearchIntent(latestUserMessage);
    
    let contextMessage = "";
    
    if (searchKeywords) {
      // Perform database search
      const searchPattern = `%${searchKeywords}%`;
      const { data: results, error } = await supabase
        .from("clarifications")
        .select("id, s_no, module, scenario_steps, status, offshore_comments, onsite_comments, assigned_to, date, priority, drop_name")
        .or(
          `module.ilike.${searchPattern},` +
          `scenario_steps.ilike.${searchPattern},` +
          `status.ilike.${searchPattern},` +
          `offshore_comments.ilike.${searchPattern},` +
          `onsite_comments.ilike.${searchPattern},` +
          `keywords.ilike.${searchPattern},` +
          `assigned_to.ilike.${searchPattern},` +
          `drop_name.ilike.${searchPattern}`
        )
        .order("first_seen_at", { ascending: false })
        .limit(5);

      if (!error && results && results.length > 0) {
        contextMessage = `\n\n[DATABASE SEARCH RESULTS for "${searchKeywords}"]\nFound ${results.length} matching clarification(s):\n\n`;
        results.forEach((r: SearchResult, i: number) => {
          contextMessage += `${i + 1}. CN #${r.s_no || "N/A"} | ${r.module} | Status: ${r.status}
   - Steps: ${(r.scenario_steps || "").substring(0, 150)}${(r.scenario_steps || "").length > 150 ? "..." : ""}
   - Assigned: ${r.assigned_to || "Unassigned"} | Priority: ${r.priority || "N/A"}
   - Drop: ${r.drop_name || "N/A"}
   - Offshore: ${(r.offshore_comments || "").substring(0, 100)}${(r.offshore_comments || "").length > 100 ? "..." : ""}
   - Onsite: ${(r.onsite_comments || "").substring(0, 100)}${(r.onsite_comments || "").length > 100 ? "..." : ""}\n\n`;
        });
        contextMessage += "[END OF SEARCH RESULTS]\n\nPlease summarize these results for the user in a helpful way.";
      } else if (searchKeywords) {
        contextMessage = `\n\n[DATABASE SEARCH RESULTS for "${searchKeywords}"]\nNo matching clarifications found. Suggest the user try different keywords or check the spelling.\n`;
      }
    }

    // Add search context to the last user message if we found results
    const enhancedMessages = [...messages];
    if (contextMessage && enhancedMessages.length > 0) {
      const lastIndex = enhancedMessages.length - 1;
      if (enhancedMessages[lastIndex].role === "user") {
        enhancedMessages[lastIndex] = {
          ...enhancedMessages[lastIndex],
          content: enhancedMessages[lastIndex].content + contextMessage
        };
      }
    }

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...enhancedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("CN Bot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Extract search intent from user message
function extractSearchIntent(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Common search triggers
  const searchTriggers = [
    "search", "find", "look for", "show me", "get", "fetch",
    "where is", "what about", "any cn", "clarification about",
    "related to", "regarding", "about"
  ];
  
  const hasSearchIntent = searchTriggers.some(trigger => lowerMessage.includes(trigger));
  
  // If it's a search request, extract the key terms
  if (hasSearchIntent) {
    // Remove common filler words and search triggers
    let cleaned = lowerMessage;
    const removeWords = [
      "search", "find", "look for", "show me", "get", "fetch",
      "where is", "what about", "any", "clarification", "cn", "cns",
      "related to", "regarding", "about", "please", "can you",
      "could you", "the", "a", "an", "for", "me", "all"
    ];
    removeWords.forEach(word => {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
    });
    
    // Clean up and return
    const keywords = cleaned.trim().replace(/\s+/g, " ");
    return keywords.length >= 2 ? keywords : null;
  }
  
  // Check for module names or specific patterns (like bug IDs)
  const modulePattern = /\b(module|drop|p1|p2|open|closed)\s*:?\s*(\w+)/i;
  const bugPattern = /\b(BUG|DEFECT|DEF|INC|CR)[-_]?\d+/i;
  
  const moduleMatch = message.match(modulePattern);
  const bugMatch = message.match(bugPattern);
  
  if (bugMatch) return bugMatch[0];
  if (moduleMatch) return moduleMatch[2];
  
  return null;
}
