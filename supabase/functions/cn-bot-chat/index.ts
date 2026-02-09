import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are CN Bot, a powerful AI assistant for the CN (Clarification) Portal. You have FULL ACCESS to the portal's database and can answer ANY question about the data.

You will receive a DATA SNAPSHOT with every message containing:
- Total record counts and breakdowns by status, priority, module, assignee
- When the user asks about specific records, search results will be included

YOUR CAPABILITIES:
1. **Answer Data Questions**: Count records, filter by status/priority/module, calculate percentages, compare modules, identify trends.
2. **Search & Find CNs**: Find specific clarifications by keywords, module, status, assignee, etc.
3. **Explain Issues**: Provide clear explanations of scenarios and their current status.
4. **Summarize Details**: Condense long scenario steps or comments into concise summaries.
5. **Draft Professional Responses**: Help write offshore/onsite comments and closure notes.
6. **Provide Analytics**: Answer questions like "how many open P1s?", "which module has most issues?", etc.

CRITICAL RULES:
- ALWAYS use the DATA SNAPSHOT provided to answer questions. You HAVE database access through this snapshot.
- NEVER say "I don't have access to the database" - you DO have access via the snapshot.
- When asked about counts or aggregations, calculate from the snapshot data.
- For specific record searches, use the SEARCH RESULTS section if provided.
- Keep responses concise, structured, and professional.
- Use bullet points and formatting for clarity.
- If the snapshot doesn't contain enough detail for a specific query, suggest the user refine their question.

When presenting CN search results, format them as:
**CN #[number]** | [Module] | Status: [status]
- Steps: [brief summary]
- Assigned to: [name]
- Priority: [P1/P2]`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Always fetch a comprehensive data snapshot
    const snapshot = await buildDataSnapshot(supabase);

    // Check if user message needs specific record search
    const latestUserMessage =
      messages.filter((m: Message) => m.role === "user").pop()?.content || "";
    const searchResults = await performSmartSearch(supabase, latestUserMessage);

    // Build context message
    let contextMessage = `\n\n[DATA SNAPSHOT - Live Portal Data]\n${snapshot}`;

    if (searchResults) {
      contextMessage += `\n\n[SEARCH RESULTS]\n${searchResults}`;
    }

    contextMessage += `\n[END OF DATA]\n\nUse the above data to answer the user's question accurately.`;

    // Enhance the last user message with context
    const enhancedMessages = [...messages];
    const lastIndex = enhancedMessages.length - 1;
    if (lastIndex >= 0 && enhancedMessages[lastIndex].role === "user") {
      enhancedMessages[lastIndex] = {
        ...enhancedMessages[lastIndex],
        content: enhancedMessages[lastIndex].content + contextMessage,
      };
    }

    // Call Lovable AI Gateway
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please wait a moment and try again.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI service quota exceeded. Please try again later.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("CN Bot error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Build a comprehensive data snapshot for the AI
async function buildDataSnapshot(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  // Fetch all clarifications (summary fields only for efficiency)
  const { data: allRows, error } = await supabase
    .from("clarifications")
    .select(
      "id, s_no, module, status, priority, assigned_to, drop_name, date, tester, offshore_reviewer, addressed_by, defect_should_be_raised, first_seen_at"
    )
    .order("s_no", { ascending: true });

  if (error || !allRows) {
    return "Unable to fetch data. Error: " + (error?.message || "Unknown");
  }

  const total = allRows.length;

  // Status breakdown
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byModule: Record<string, number> = {};
  const byAssignee: Record<string, number> = {};
  const byDropName: Record<string, number> = {};

  for (const row of allRows) {
    const status = row.status || "Unknown";
    const priority = row.priority || "Unset";
    const module = row.module || "Unknown";
    const assignee = row.assigned_to || "Unassigned";
    const drop = row.drop_name || "Unknown";

    byStatus[status] = (byStatus[status] || 0) + 1;
    byPriority[priority] = (byPriority[priority] || 0) + 1;
    byModule[module] = (byModule[module] || 0) + 1;
    byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
    byDropName[drop] = (byDropName[drop] || 0) + 1;
  }

  // Build snapshot text
  let snapshot = `Total Records: ${total}\n\n`;

  snapshot += `Status Breakdown:\n`;
  for (const [status, count] of Object.entries(byStatus).sort(
    (a, b) => b[1] - a[1]
  )) {
    snapshot += `  - ${status}: ${count} (${((count / total) * 100).toFixed(1)}%)\n`;
  }

  snapshot += `\nPriority Breakdown:\n`;
  for (const [priority, count] of Object.entries(byPriority).sort(
    (a, b) => b[1] - a[1]
  )) {
    snapshot += `  - ${priority}: ${count}\n`;
  }

  snapshot += `\nModule Breakdown:\n`;
  for (const [module, count] of Object.entries(byModule).sort(
    (a, b) => b[1] - a[1]
  )) {
    snapshot += `  - ${module}: ${count}\n`;
  }

  snapshot += `\nAssignee Breakdown:\n`;
  for (const [assignee, count] of Object.entries(byAssignee).sort(
    (a, b) => b[1] - a[1]
  )) {
    snapshot += `  - ${assignee}: ${count}\n`;
  }

  snapshot += `\nDrop/Release Breakdown:\n`;
  for (const [drop, count] of Object.entries(byDropName).sort(
    (a, b) => b[1] - a[1]
  )) {
    snapshot += `  - ${drop}: ${count}\n`;
  }

  // Cross-tabulation: status by module (top modules)
  const topModules = Object.entries(byModule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([m]) => m);
  
  snapshot += `\nStatus by Module (Top ${topModules.length}):\n`;
  for (const mod of topModules) {
    const moduleRows = allRows.filter((r: any) => r.module === mod);
    const statusCounts: Record<string, number> = {};
    for (const r of moduleRows) {
      const s = r.status || "Unknown";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
    const parts = Object.entries(statusCounts)
      .map(([s, c]) => `${s}: ${c}`)
      .join(", ");
    snapshot += `  - ${mod}: ${parts}\n`;
  }

  // Upload history
  const { data: uploads } = await supabase
    .from("uploads")
    .select("filename, uploaded_at, added_count, duplicates_skipped")
    .order("uploaded_at", { ascending: false })
    .limit(5);

  if (uploads && uploads.length > 0) {
    snapshot += `\nRecent Uploads:\n`;
    for (const u of uploads) {
      snapshot += `  - ${u.filename} (${u.uploaded_at}): ${u.added_count} added, ${u.duplicates_skipped} duplicates\n`;
    }
  }

  return snapshot;
}

// Smart search: extract keywords and search the database
async function performSmartSearch(
  supabase: ReturnType<typeof createClient>,
  message: string
): Promise<string | null> {
  const lower = message.toLowerCase();

  // Always try to find specific records if the message has searchable terms
  // Extract potential search terms (anything that's not a common stop word)
  const stopWords = new Set([
    "i", "me", "my", "we", "our", "you", "your", "it", "its", "the", "a", "an",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "can", "may",
    "might", "shall", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "about", "that", "this", "these", "those", "what",
    "which", "who", "whom", "how", "many", "much", "more", "most", "some",
    "any", "all", "each", "every", "both", "few", "no", "not", "only", "very",
    "just", "also", "than", "too", "so", "and", "but", "or", "if", "then",
    "because", "while", "where", "when", "why", "out", "up", "down",
    "them", "they", "their", "there", "here", "now", "still", "already",
    "show", "tell", "give", "find", "search", "get", "list", "display",
    "count", "total", "number", "records", "having", "status",
    "please", "help", "want", "need", "know", "like",
  ]);

  // Check for specific patterns that indicate a search need
  const hasSpecificQuery =
    /defect|retest|open|closed|offshore|module|assigned|priority|p1|p2|bug|drop|scenario/i.test(
      lower
    );
  const hasBugPattern = /\b(BUG|DEFECT|DEF|INC|CR)[-_]?\d+/i.test(message);
  const hasNameSearch = /\b(assigned to|tester|reviewer)\s+\w+/i.test(lower);

  if (!hasSpecificQuery && !hasBugPattern && !hasNameSearch) {
    return null;
  }

  // Extract meaningful keywords
  const words = message
    .replace(/[?.,!;:()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()));

  if (words.length === 0) return null;

  // Build search: try each keyword against multiple columns
  const searchTerms = words.slice(0, 5); // limit to 5 keywords
  
  // Search with combined pattern
  const combinedPattern = searchTerms.join(" ");
  const searchPattern = `%${combinedPattern}%`;
  
  // Try combined first
  let { data: results, error } = await supabase
    .from("clarifications")
    .select(
      "id, s_no, module, scenario_steps, status, offshore_comments, onsite_comments, assigned_to, date, priority, drop_name, tester, defect_should_be_raised"
    )
    .or(
      `module.ilike.${searchPattern},` +
      `scenario_steps.ilike.${searchPattern},` +
      `status.ilike.${searchPattern},` +
      `offshore_comments.ilike.${searchPattern},` +
      `onsite_comments.ilike.${searchPattern},` +
      `keywords.ilike.${searchPattern},` +
      `assigned_to.ilike.${searchPattern},` +
      `drop_name.ilike.${searchPattern},` +
      `defect_should_be_raised.ilike.${searchPattern},` +
      `tester.ilike.${searchPattern}`
    )
    .order("s_no", { ascending: true })
    .limit(20);

  // If no results with combined, try individual keywords
  if ((!results || results.length === 0) && searchTerms.length > 1) {
    for (const term of searchTerms) {
      const pattern = `%${term}%`;
      const { data: termResults } = await supabase
        .from("clarifications")
        .select(
          "id, s_no, module, scenario_steps, status, offshore_comments, onsite_comments, assigned_to, date, priority, drop_name, tester, defect_should_be_raised"
        )
        .or(
          `module.ilike.${pattern},` +
          `scenario_steps.ilike.${pattern},` +
          `status.ilike.${pattern},` +
          `offshore_comments.ilike.${pattern},` +
          `onsite_comments.ilike.${pattern},` +
          `keywords.ilike.${pattern},` +
          `assigned_to.ilike.${pattern},` +
          `drop_name.ilike.${pattern},` +
          `defect_should_be_raised.ilike.${pattern},` +
          `tester.ilike.${pattern}`
        )
        .order("s_no", { ascending: true })
        .limit(20);

      if (termResults && termResults.length > 0) {
        results = termResults;
        break;
      }
    }
  }

  if (!results || results.length === 0) return null;

  let output = `Found ${results.length} matching record(s):\n\n`;
  for (const r of results) {
    output += `CN #${r.s_no || "N/A"} | ${r.module} | Status: ${r.status} | Priority: ${r.priority || "N/A"}
  - Steps: ${(r.scenario_steps || "").substring(0, 200)}${(r.scenario_steps || "").length > 200 ? "..." : ""}
  - Assigned: ${r.assigned_to || "Unassigned"} | Tester: ${r.tester || "N/A"}
  - Drop: ${r.drop_name || "N/A"} | Defect: ${r.defect_should_be_raised || "N/A"}
  - Offshore: ${(r.offshore_comments || "").substring(0, 150)}${(r.offshore_comments || "").length > 150 ? "..." : ""}
  - Onsite: ${(r.onsite_comments || "").substring(0, 150)}${(r.onsite_comments || "").length > 150 ? "..." : ""}\n\n`;
  }

  return output;
}
