import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache for search results
const cache = new Map<string, { data: any; timestamp: number; count: number }>();
const CACHE_TTL = 60000; // 60 seconds

// Rate limiting: track requests per user
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 requests
const RATE_WINDOW = 5000; // 5 seconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

function sanitizeQuery(query: string): string {
  // Remove potentially dangerous characters for SQL/XSS
  return query
    .replace(/[<>'"`;\\]/g, "")
    .trim()
    .substring(0, 200); // Limit query length
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const page = parseInt(url.searchParams.get("page") || "0", 10);
    const size = parseInt(url.searchParams.get("size") || "1", 10);

    // Get user ID from auth header or use anonymous
    const authHeader = req.headers.get("authorization");
    let userId = "anonymous";
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      // Extract user from token if provided
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      } catch {
        // Continue with anonymous if token invalid
      }
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      console.log(`Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a few seconds." }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const sanitizedQuery = sanitizeQuery(query);
    
    if (!sanitizedQuery) {
      return new Response(
        JSON.stringify({ items: [], page: 0, total_matches: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Search request: query="${sanitizedQuery}", page=${page}, size=${size}, user=${userId}`);

    // Check cache for count
    const cacheKey = sanitizedQuery.toLowerCase();
    const cached = cache.get(cacheKey);
    let totalCount: number;
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      totalCount = cached.count;
      console.log(`Cache hit for count: ${totalCount}`);
    } else {
      // Get total count using ilike for partial matching
      const searchPattern = `%${sanitizedQuery}%`;
      
      const { count, error: countError } = await supabase
        .from("clarifications")
        .select("*", { count: "exact", head: true })
        .or(
          `module.ilike.${searchPattern},` +
          `scenario_steps.ilike.${searchPattern},` +
          `status.ilike.${searchPattern},` +
          `offshore_comments.ilike.${searchPattern},` +
          `onsite_comments.ilike.${searchPattern},` +
          `keywords.ilike.${searchPattern},` +
          `assigned_to.ilike.${searchPattern},` +
          `reason.ilike.${searchPattern}`
        );

      if (countError) {
        console.error("Count error:", countError);
        throw countError;
      }

      totalCount = count || 0;
      cache.set(cacheKey, { data: null, timestamp: Date.now(), count: totalCount });
      console.log(`Count query result: ${totalCount}`);
    }

    // Fetch paginated results
    const searchPattern = `%${sanitizedQuery}%`;
    const offset = page * size;

    const { data: items, error: fetchError } = await supabase
      .from("clarifications")
      .select("id, s_no, module, scenario_steps, status, offshore_comments, onsite_comments, assigned_to, date, priority")
      .or(
        `module.ilike.${searchPattern},` +
        `scenario_steps.ilike.${searchPattern},` +
        `status.ilike.${searchPattern},` +
        `offshore_comments.ilike.${searchPattern},` +
        `onsite_comments.ilike.${searchPattern},` +
        `keywords.ilike.${searchPattern},` +
        `assigned_to.ilike.${searchPattern},` +
        `reason.ilike.${searchPattern}`
      )
      .order("first_seen_at", { ascending: false })
      .range(offset, offset + size - 1);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }

    console.log(`Fetched ${items?.length || 0} items for page ${page}`);

    // Log search to audit table (fire and forget)
    if (page === 0) {
      supabase
        .from("bot_search_logs")
        .insert({
          user_id: userId,
          search_term: sanitizedQuery,
          match_count: totalCount,
        })
        .then(({ error }) => {
          if (error) console.error("Audit log error:", error);
          else console.log("Search logged to audit");
        });
    }

    const response = {
      items: items || [],
      page,
      total_matches: totalCount,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: "Search failed. Please try again." }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
