import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { ClarificationTable } from "@/components/clarifications/ClarificationTable";
import { ClarificationForm } from "@/components/clarifications/ClarificationForm";
import { DetailModal } from "@/components/clarifications/DetailModal";
import { SearchBar } from "@/components/search/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Loader2, BarChart3, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Clarification, SearchResult } from "@/types/clarification";
import { fetchClarifications, createClarification, updateClarification } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/useRolePermissions";

export default function Dashboard() {
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRow, setSelectedRow] = useState<Clarification | null>(null);
  const [editRow, setEditRow] = useState<Clarification | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const { toast } = useToast();
  const { canEdit } = useRolePermissions();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchClarifications();
      setClarifications(data);
    } catch (err: unknown) {
      toast({ title: "Error loading data", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filterOptions = {
    statuses: [...new Set(clarifications.map((c) => c.status).filter(Boolean))],
    priorities: [...new Set(clarifications.map((c) => c.priority).filter(Boolean))],
    modules: [...new Set(clarifications.map((c) => c.module).filter(Boolean))],
    assignees: [...new Set(clarifications.map((c) => c.assigned_to).filter(Boolean))],
  };

  const stats = {
    total: clarifications.length,
    open: clarifications.filter((c) => c.status === "Open").length,
    closed: clarifications.filter((c) => c.status === "Closed").length,
    offshore: clarifications.filter((c) => c.status === "Open from Offshore").length,
    p1: clarifications.filter((c) => c.priority === "P1").length,
  };

  const handleSave = async (data: Partial<Clarification>) => {
    try {
      if (data.id) {
        await updateClarification(data.id, data as Record<string, unknown>);
      } else {
        await createClarification(data as Record<string, unknown>);
      }
      await load();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: String(err) };
    }
  };

  const handleSearchResult = (result: SearchResult) => {
    setHighlightedRowId(result.id);
    setTimeout(() => setHighlightedRowId(null), 3000);
    setSelectedRow(result.row);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Clarification Notices</h2>
            <p className="text-sm text-muted-foreground">Manage and track engineering clarifications</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => { setEditRow(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> New CN
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: BarChart3, color: "text-primary" },
            { label: "Open", value: stats.open, icon: AlertCircle, color: "text-yellow-600" },
            { label: "Closed", value: stats.closed, icon: CheckCircle, color: "text-green-600" },
            { label: "Offshore", value: stats.offshore, icon: Clock, color: "text-blue-600" },
            { label: "P1", value: stats.p1, icon: AlertCircle, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color} opacity-80`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="max-w-md">
          <SearchBar onResultSelect={handleSearchResult} placeholder="Search CNs..." />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ClarificationTable
            data={clarifications}
            onRowClick={setSelectedRow}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            highlightedRowId={highlightedRowId}
          />
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal
        clarification={selectedRow}
        open={!!selectedRow}
        onOpenChange={(o) => !o && setSelectedRow(null)}
        onEdit={(row) => { setSelectedRow(null); setEditRow(row); setShowForm(true); }}
      />

      {/* Form Modal */}
      <ClarificationForm
        open={showForm}
        onOpenChange={setShowForm}
        clarification={editRow}
        onSave={handleSave}
        filterOptions={filterOptions}
      />
    </MainLayout>
  );
}
