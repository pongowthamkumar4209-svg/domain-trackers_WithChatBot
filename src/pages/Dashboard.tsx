import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search/SearchBar';
import { DetailModal } from '@/components/clarifications/DetailModal';
import { ClarificationTable } from '@/components/clarifications/ClarificationTable';
import { ClarificationForm } from '@/components/clarifications/ClarificationForm';
import { DropZone } from '@/components/upload/DropZone';
import { UploadBanner } from '@/components/upload/UploadBanner';
import { getStats, getClarifications, saveClarifications, getFilterOptions, saveSingleClarification } from '@/services/storageService';
import { parseExcelFile } from '@/services/excelParser';
import { ClarificationStats, Clarification, SearchResult, UploadResult } from '@/types/clarification';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Search, 
  FileSpreadsheet, 
  BarChart3, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Edit
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<ClarificationStats | null>(null);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [selectedRow, setSelectedRow] = useState<Clarification | null>(null);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult & { filename: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<Clarification | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    statuses: [] as string[],
    priorities: [] as string[],
    modules: [] as string[],
    assignees: [] as string[],
  });
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, rows, options] = await Promise.all([
        getStats(), 
        getClarifications(),
        getFilterOptions()
      ]);
      setStats(statsData);
      setClarifications(rows);
      setFilterOptions(options);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
    // Highlight the row and scroll to it
    setHighlightedRowId(result.row.id);
    // Also open the detail modal
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
      await loadData();
    }
    return result;
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const parseResult = await parseExcelFile(file);
      
      if (!parseResult.success) {
        let errorMsg = parseResult.error || 'Failed to parse file';
        if (parseResult.available_sheets) {
          errorMsg += ` Available sheets: ${parseResult.available_sheets.join(', ')}`;
        }
        toast({ title: 'Upload failed', description: errorMsg, variant: 'destructive' });
        return;
      }

      const result = await saveClarifications(parseResult.rows!, file.name, 'clarification');
      setUploadResult({ ...result, filename: file.name });
      
      toast({
        title: 'Upload successful',
        description: `Added ${result.added_count} rows, skipped ${result.duplicates_skipped} duplicates.`,
      });

      // Reload data
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-display tracking-wide mb-2">Welcome Back</h1>
              <p className="text-white/70 text-lg">
                Manage and search your clarification data efficiently
              </p>
            </div>
            <Button 
              onClick={() => { setEditingRow(null); setShowForm(true); }}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>

        {/* Upload Banner */}
        {uploadResult && (
          <UploadBanner
            filename={uploadResult.filename}
            sheetName="clarification"
            addedCount={uploadResult.added_count}
            duplicatesSkipped={uploadResult.duplicates_skipped}
            totalRows={uploadResult.total_rows}
            onDismiss={() => setUploadResult(null)}
          />
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Total Records</CardTitle>
              <FileSpreadsheet className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-white/70 mt-1">Clarification entries</p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Open Items</CardTitle>
              <AlertCircle className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.openCount || 0}</div>
              <p className="text-xs text-white/70 mt-1">Open ≠ 'Closed'</p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Resolved</CardTitle>
              <CheckCircle className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.resolvedCount || 0}</div>
              <p className="text-xs text-white/70 mt-1">Open = 'Closed'</p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">High Priority</CardTitle>
              <TrendingUp className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.byPriority?.['High'] || stats?.byPriority?.['high'] || 0}</div>
              <p className="text-xs text-white/70 mt-1">Urgent attention needed</p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          </Card>
        </div>

        {/* Quick Search */}
        <Card className="shadow-md border-l-4 border-l-violet-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-violet-500" />
              Quick Search
            </CardTitle>
            <CardDescription>
              Search across all clarification data with fuzzy matching. Click a result to highlight and view details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchBar onResultSelect={handleResultSelect} placeholder="Search by module, scenario, status, assignee..." />
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="shadow-md border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-500" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              Upload an Excel file with a "clarification" sheet. Keywords will be auto-extracted and unique rows added.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Processing file...</p>
              </div>
            ) : (
              <DropZone onFileSelect={handleFileSelect} />
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        {isLoading ? (
          <Card className="shadow-md">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : clarifications.length > 0 ? (
          <Card className="shadow-md overflow-hidden border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                Clarification Data
              </CardTitle>
              <CardDescription>
                {clarifications.length} total records • Click a row to view details • Use filters to narrow down
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ClarificationTable 
                data={clarifications} 
                onRowClick={handleRowClick}
                highlightedRowId={highlightedRowId}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium">No data yet</h3>
              <p className="text-muted-foreground text-center mt-2 mb-6 max-w-md">
                Upload an Excel file with a "clarification" sheet or add rows manually to get started.
              </p>
              <Button onClick={() => { setEditingRow(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Row
              </Button>
            </CardContent>
          </Card>
        )}
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
