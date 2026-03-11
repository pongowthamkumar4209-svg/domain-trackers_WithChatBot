/**
 * Supabase stub — this app no longer uses Supabase.
 * All data is served by the local Flask/SQLite backend.
 * This file exists only so legacy imports compile without errors.
 */
export const supabase = {
  functions: {
    invoke: async () => ({ data: null, error: new Error("Supabase removed") }),
  },
};
