import { useState, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, Loader2 } from "lucide-react";
import { parseExcelFile } from "@/services/excelParser";
import { createClarification, addUploadHistory } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setDone(false);
    try {
      const { data, errors } = await parseExcelFile(file);
      if (errors.length) {
        toast({ title: "Parse errors", description: errors.join(", "), variant: "destructive" });
        return;
      }
      let count = 0;
      for (const row of data) {
        await createClarification(row as Record<string, unknown>);
        count++;
      }
      await addUploadHistory({ filename: file.name, row_count: count });
      setDone(true);
      toast({ title: `Uploaded ${count} records from ${file.name}` });
    } catch (err: unknown) {
      toast({ title: "Upload failed", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    multiple: false,
  });

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold">Upload Clarifications</h2>
          <p className="text-sm text-muted-foreground">Import CN data from an Excel spreadsheet</p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p>Processing...</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 text-green-600">
              <CheckCircle className="h-12 w-12" />
              <p className="font-medium">Upload complete!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12" />
              <p className="font-medium">Drop your Excel file here</p>
              <p className="text-sm">Supports .xlsx and .xls</p>
              <Button variant="outline" size="sm">
                <UploadIcon className="h-4 w-4 mr-2" /> Browse files
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Expected columns:</p>
          <p>S.No, Module, Scenario/Steps, Status, Offshore Comments, Onsite Comments, Date, Tester, Offshore Reviewer, Addressed By, Defect should be raised, Priority, Assigned To, Drop Name</p>
        </div>
      </div>
    </MainLayout>
  );
}
