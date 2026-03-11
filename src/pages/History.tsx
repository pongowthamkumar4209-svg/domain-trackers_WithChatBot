import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { fetchUploadHistory } from "@/services/api";
import { Loader2, FileSpreadsheet } from "lucide-react";

interface UploadRecord {
  id: string;
  filename: string;
  row_count: number;
  uploaded_by: string;
  created_at: string;
}

export default function History() {
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUploadHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Upload History</h2>
          <p className="text-sm text-muted-foreground">Log of all Excel imports</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground">No uploads yet.</p>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">File</th>
                  <th className="px-4 py-3 text-left">Rows</th>
                  <th className="px-4 py-3 text-left">Uploaded By</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      {h.filename}
                    </td>
                    <td className="px-4 py-3">{h.row_count}</td>
                    <td className="px-4 py-3">{h.uploaded_by}</td>
                    <td className="px-4 py-3">{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
