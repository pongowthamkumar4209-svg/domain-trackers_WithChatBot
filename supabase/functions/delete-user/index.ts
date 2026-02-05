import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify their role
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the requesting user is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can delete users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user ID (or email) to delete from the request body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const userId = typeof body?.userId === "string" ? body.userId : undefined;
    const email = typeof body?.email === "string" ? body.email : undefined;

    if (!userId && !email) {
      return new Response(
        JSON.stringify({ error: "userId or email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUserIds: string[] = [];
    if (userId) {
      targetUserIds.push(userId);
    } else {
      const normalizedEmail = email!.trim().toLowerCase();
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        console.error("Error listing users:", listError);
        return new Response(
          JSON.stringify({ error: listError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const matches = (usersData?.users || []).filter(
        (u) => (u.email || "").trim().toLowerCase() === normalizedEmail
      );

      // Idempotent: if the user doesn't exist, treat as success
      if (matches.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "User not found (already removed)" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetUserIds.push(...matches.map((u) => u.id));
    }

    // Prevent self-deletion (for both userId and email-based deletes)
    if (targetUserIds.includes(requestingUser.id)) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ user_id: string; success: boolean; error?: string }> = [];

    for (const targetId of targetUserIds) {
      try {
        // Delete the user from the authentication system first.
        // This prevents the "user already registered" issue caused by partial deletions.
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);

        // Idempotent: treat "User not found" as success
        if (authDeleteError && authDeleteError.message !== "User not found") {
          console.error("Error deleting auth user:", authDeleteError);
          results.push({ user_id: targetId, success: false, error: authDeleteError.message });
          continue;
        }

        // Then delete app records (profile + role) so the user disappears from the admin table.
        const [rolesRes, profileRes] = await Promise.all([
          supabaseAdmin.from("user_roles").delete().eq("user_id", targetId),
          supabaseAdmin.from("profiles").delete().eq("user_id", targetId),
        ]);

        if (rolesRes.error || profileRes.error) {
          if (rolesRes.error) console.error("Error deleting user roles:", rolesRes.error);
          if (profileRes.error) console.error("Error deleting profile:", profileRes.error);
          results.push({
            user_id: targetId,
            success: false,
            error: rolesRes.error?.message || profileRes.error?.message || "Failed to remove user records",
          });
          continue;
        }

        results.push({ user_id: targetId, success: true });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        console.error("Unexpected delete failure:", e);
        results.push({ user_id: targetId, success: false, error: message });
      }
    }

    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return new Response(
        JSON.stringify({ error: "Some deletions failed", results }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully", results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in delete-user function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
