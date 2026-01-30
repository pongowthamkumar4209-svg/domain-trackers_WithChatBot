import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { ClarificationTable } from '@/components/clarifications/ClarificationTable';
import { DetailModal } from '@/components/clarifications/DetailModal';
import { SearchBar } from '@/components/search/SearchBar';
import { ClarificationForm } from '@/components/clarifications/ClarificationForm';
import { getClarifications, getFilterOptions, saveSingleClarification } from '@/services/storageService';
import { exportToCSV } from '@/services/exportService';
import { Clarification, SearchResult } from '@/types/clarification';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRolePermissions } from '@/hooks/useRolePermissions';

export default function SearchPage() {
  const { canCreate } = useRolePermissions();
  const [searchParams] = useSearchParams();
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [globalFilter, setGlobalFilter] = useState(searchParams.get('q') || '');
  const [selectedRow, setSelectedRow] = useState<Clarification | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<Clarification | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    statuses: [] as string[],
    priorities: [] as string[],
    modules: [] as string[],
    assignees: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      const [rows, options] = await Promise.all([
        getClarifications(),
        getFilterOptions()
      ]);
      setClarifications(rows);
      setFilterOptions(options);
    };
    loadData();
  }, []);

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedRowId) {
      const timer = setTimeout(() => {
        setHighlightedRowId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedRowId]);

  const handleResultSelect = (result: SearchResult) => {
    setHighlightedRowId(result.row.id);
    setSelectedRow(result.row);
  };

  const handleRowClick = (row: Clarification) => {
    setSelectedRow(row);
  };

  const handleEditClick = (row: Clarification) => {
    setEditingRow(row);
    setShowForm(true);
    setSelectedRow(null);
  };

  const handleSaveRow = async (data: Partial<Clarification>) => {
    const result = await saveSingleClarification(data);
    if (result.success) {
      const rows = await getClarifications();
      setClarifications(rows);
    }
    return result;
  };

  const handleExport = () => {
    exportToCSV(clarifications);
    toast({ title: 'Export complete', description: 'CSV file downloaded.' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display tracking-wide">Search</h1>
            <p className="text-muted-foreground">Find clarifications with fuzzy search</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            {canCreate && (
              <Button onClick={() => { setEditingRow(null); setShowForm(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <SearchBar onResultSelect={handleResultSelect} autoFocus placeholder="Search with typos, partial phrases..." />
          </CardContent>
        </Card>

        <ClarificationTable
          data={clarifications}
          onRowClick={handleRowClick}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          highlightedRowId={highlightedRowId}
        />
      </div>

      <DetailModal
        clarification={selectedRow}
        open={!!selectedRow}
        onOpenChange={(open) => !open && setSelectedRow(null)}
        onEdit={handleEditClick}
      />

      <ClarificationForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingRow(null);
        }}
        clarification={editingRow}
        onSave={handleSaveRow}
        filterOptions={filterOptions}
      />
    </MainLayout>
  );
}
