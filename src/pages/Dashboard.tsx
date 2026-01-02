import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search/SearchBar';
import { DetailModal } from '@/components/clarifications/DetailModal';
import { ClarificationTable } from '@/components/clarifications/ClarificationTable';
import { DropZone } from '@/components/upload/DropZone';
import { UploadBanner } from '@/components/upload/UploadBanner';
import { getStats, getClarifications, saveClarifications } from '@/services/storageService';
import { parseExcelFile } from '@/services/excelParser';
import { ClarificationStats, Clarification, SearchResult, UploadResult } from '@/types/clarification';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Search, 
  FileSpreadsheet, 
  BarChart3, 
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<ClarificationStats | null>(null);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [selectedRow, setSelectedRow] = useState<Clarification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult & { filename: string } | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, rows] = await Promise.all([getStats(), getClarifications()]);
      setStats(statsData);
      setClarifications(rows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResultSelect = (result: SearchResult) => {
    setSelectedRow(result.row);
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

  const statusCounts = stats?.byStatus || {};
  const priorityCounts = stats?.byPriority || {};

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative z-10">
            <h1 className="text-4xl font-display tracking-wide mb-2">Welcome Back</h1>
            <p className="text-primary-foreground/80 text-lg">
              Manage and search your clarification data efficiently
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
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
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow">
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

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Open Items</CardTitle>
              <AlertCircle className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statusCounts['Open'] || statusCounts['open'] || 0}</div>
              <p className="text-xs text-white/70 mt-1">Pending resolution</p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Resolved</CardTitle>
              <CheckCircle className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statusCounts['Closed'] || statusCounts['closed'] || statusCounts['Resolved'] || 0}</div>
              <p className="text-xs text-white/70 mt-1">Completed items</p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/90">High Priority</CardTitle>
              <TrendingUp className="h-5 w-5 text-white/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{priorityCounts['High'] || priorityCounts['high'] || 0}</div>
              <p className="text-xs text-white/70 mt-1">Urgent attention needed</p>
            </CardContent>
            <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          </Card>
        </div>

        {/* Quick Search */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Quick Search
            </CardTitle>
            <CardDescription>
              Search across all clarification data with fuzzy matching
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchBar onResultSelect={handleResultSelect} placeholder="Search by module, scenario, status, assignee..." />
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              Upload an Excel file with a "clarification" sheet. Unique rows will be added to existing data.
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
          <Card className="shadow-md overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Clarification Data
              </CardTitle>
              <CardDescription>
                {clarifications.length} total records • Click a row to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ClarificationTable 
                data={clarifications} 
                onRowClick={setSelectedRow} 
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
                Upload an Excel file with a "clarification" sheet to get started. The data will be saved and you can add more files later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <DetailModal
        clarification={selectedRow}
        open={!!selectedRow}
        onOpenChange={(open) => !open && setSelectedRow(null)}
      />
    </MainLayout>
  );
}
