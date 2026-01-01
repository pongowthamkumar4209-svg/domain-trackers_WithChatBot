import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search/SearchBar';
import { DetailModal } from '@/components/clarifications/DetailModal';
import { getStats, getClarifications } from '@/services/storageService';
import { ClarificationStats, Clarification, SearchResult } from '@/types/clarification';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, FileSpreadsheet, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<ClarificationStats | null>(null);
  const [selectedRow, setSelectedRow] = useState<Clarification | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  const handleResultSelect = (result: SearchResult) => {
    setSelectedRow(result.row);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-wide">Dashboard</h1>
          <p className="text-muted-foreground">Manage and search clarification data</p>
        </div>

        {/* Quick Search */}
        <Card>
          <CardContent className="pt-6">
            <SearchBar onResultSelect={handleResultSelect} placeholder="Quick search clarifications..." />
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Status</CardTitle>
              <BarChart3 className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byStatus['Open'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <BarChart3 className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byPriority['High'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.recentUploads.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => navigate('/upload')} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Excel
          </Button>
          <Button variant="outline" onClick={() => navigate('/search')} className="gap-2">
            <Search className="h-4 w-4" />
            Advanced Search
          </Button>
        </div>

        {stats?.total === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No data yet</h3>
              <p className="text-muted-foreground text-center mt-1 mb-4">
                Upload an Excel file with a "clarification" sheet to get started.
              </p>
              <Button onClick={() => navigate('/upload')}>Upload Excel</Button>
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
