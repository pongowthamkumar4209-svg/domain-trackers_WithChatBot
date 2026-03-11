import { SearchResult, Clarification } from "@/types/clarification";
import { searchClarificationsApi } from "./api";

export async function searchClarifications(
  query: string,
  limit = 10
): Promise<{ results: SearchResult[]; suggestions: string[] }> {
  if (!query.trim()) return { results: [], suggestions: [] };
  const data = await searchClarificationsApi(query);
  const results: SearchResult[] = (data.results as Clarification[])
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      score: 0.9,
      row,
      highlights: {
        scenario_steps: highlightText(row.scenario_steps, query),
      },
    }));
  return { results, suggestions: data.suggestions ?? [] };
}

function highlightText(text: string, query: string): string {
  if (!text) return "";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
  );
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
