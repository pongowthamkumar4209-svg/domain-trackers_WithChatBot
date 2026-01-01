import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { getUploads } from '@/services/storageService';
import { Upload } from '@/types/clarification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDisplayDate } from '@/services/excelParser';
import { FileSpreadsheet } from 'lucide-react';

export default function History() {
  const [uploads, setUploads] = useState<Upload[]>([]);

  useEffect(() => {
    getUploads().then(setUploads);
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display tracking-wide">Upload History</h1>
          <p className="text-muted-foreground">View all past Excel uploads</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {uploads.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No uploads yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Sheet</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Rows in File</TableHead>
                    <TableHead className="text-right">Added</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell className="font-medium">{upload.filename}</TableCell>
                      <TableCell>{upload.sheet_name}</TableCell>
                      <TableCell>{formatDisplayDate(upload.uploaded_at)}</TableCell>
                      <TableCell className="text-right">{upload.total_rows_in_file}</TableCell>
                      <TableCell className="text-right text-success">{upload.added_count}</TableCell>
                      <TableCell className="text-right text-warning">{upload.duplicates_skipped}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
