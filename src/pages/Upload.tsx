import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropZone } from '@/components/upload/DropZone';
import { UploadBanner } from '@/components/upload/UploadBanner';
import { parseExcelFile } from '@/services/excelParser';
import { saveClarifications } from '@/services/storageService';
import { UploadResult } from '@/types/clarification';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function UploadPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<UploadResult & { filename: string } | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError('');
    setUploadResult(null);

    try {
      const parseResult = await parseExcelFile(file);
      
      if (!parseResult.success) {
        let errorMsg = parseResult.error || 'Failed to parse file';
        if (parseResult.available_sheets) {
          errorMsg += ` Available sheets: ${parseResult.available_sheets.join(', ')}`;
        }
        setError(errorMsg);
        toast({ title: 'Upload failed', description: errorMsg, variant: 'destructive' });
        return;
      }

      const result = await saveClarifications(parseResult.rows!, file.name, 'clarification');
      setUploadResult({ ...result, filename: file.name });
      
      toast({
        title: 'Upload successful',
        description: `Added ${result.added_count} rows, skipped ${result.duplicates_skipped} duplicates.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-wide">Upload Excel</h1>
          <p className="text-muted-foreground">Upload an Excel file with a "clarification" sheet</p>
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Processing file...</p>
              </div>
            ) : (
              <DropZone onFileSelect={handleFileSelect} error={error} />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
