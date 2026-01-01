import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { ClarificationTable } from '@/components/clarifications/ClarificationTable';
import { DetailModal } from '@/components/clarifications/DetailModal';
import { SearchBar } from '@/components/search/SearchBar';
import { getClarifications } from '@/services/storageService';
import { exportToCSV } from '@/services/exportService';
import { Clarification, SearchResult } from '@/types/clarification';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [globalFilter, setGlobalFilter] = useState(searchParams.get('q') || '');
  const [selectedRow, setSelectedRow] = useState<Clarification | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    getClarifications().then(setClarifications);
  }, []);

  const handleResultSelect = (result: SearchResult) => {
    setSelectedRow(result.row);
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
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <SearchBar onResultSelect={handleResultSelect} autoFocus placeholder="Search with typos, partial phrases..." />
          </CardContent>
        </Card>

        <ClarificationTable
          data={clarifications}
          onRowClick={setSelectedRow}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
        />
      </div>

      <DetailModal
        clarification={selectedRow}
        open={!!selectedRow}
        onOpenChange={(open) => !open && setSelectedRow(null)}
      />
    </MainLayout>
  );
}
