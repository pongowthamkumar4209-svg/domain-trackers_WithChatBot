import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  error?: string;
}

export function DropZone({ onFileSelect, isLoading, error }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
    disabled: isLoading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        isDragActive && !isDragReject && 'border-primary bg-primary/5',
        isDragReject && 'border-destructive bg-destructive/5',
        error && 'border-destructive',
        !isDragActive && !error && 'border-border hover:border-primary/50 hover:bg-muted/50',
        isLoading && 'pointer-events-none opacity-50'
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4 text-center">
        {isDragReject ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <p className="font-medium text-destructive">Invalid file type</p>
              <p className="text-sm text-muted-foreground">
                Only .xlsx files are supported
              </p>
            </div>
          </>
        ) : isDragActive ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <p className="font-medium text-primary">Drop your Excel file here</p>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Drag & drop your Excel file here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse. Only .xlsx files up to 10 MB.
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
