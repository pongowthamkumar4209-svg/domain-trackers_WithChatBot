import { Clarification } from "@/types/clarification";

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

export async function parseExcelFile(
  file: File
): Promise<{ data: Partial<Clarification>[]; errors: string[] }> {
  // Dynamic import xlsx
  const XLSX = await import("xlsx");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        });
        const mapped: Partial<Clarification>[] = rows.map((row) => ({
          s_no: row["S.No"] as number,
          module: String(row["Module"] || row["module"] || ""),
          scenario_steps: String(row["Scenario/Steps"] || row["scenario_steps"] || ""),
          status: String(row["Status"] || row["status"] || "Open"),
          offshore_comments: String(row["Offshore Comments"] || row["offshore_comments"] || ""),
          onsite_comments: String(row["Onsite Comments"] || row["onsite_comments"] || ""),
          date: String(row["Date"] || row["date"] || ""),
          tester: String(row["Tester"] || row["tester"] || ""),
          offshore_reviewer: String(row["Offshore Reviewer"] || row["offshore_reviewer"] || ""),
          addressed_by: String(row["Addressed By"] || row["addressed_by"] || ""),
          defect_should_be_raised: String(row["Defect should be raised"] || ""),
          priority: String(row["Priority"] || row["priority"] || ""),
          assigned_to: String(row["Assigned To"] || row["assigned_to"] || ""),
          drop_name: String(row["Drop Name"] || row["drop_name"] || ""),
        }));
        resolve({ data: mapped, errors: [] });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
