import { CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadBannerProps {
  filename: string;
  sheetName: string;
  addedCount: number;
  duplicatesSkipped: number;
  totalRows: number;
  onDismiss?: () => void;
}

export function UploadBanner({
  filename,
  sheetName,
  addedCount,
  duplicatesSkipped,
  totalRows,
  onDismiss,
}: UploadBannerProps) {
  const hasNewRows = addedCount > 0;
  const hasDuplicates = duplicatesSkipped > 0;

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-lg border p-4',
        hasNewRows
          ? 'border-success/30 bg-success/5'
          : 'border-warning/30 bg-warning/5'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          hasNewRows ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        )}
      >
        {hasNewRows ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <p className="font-medium text-foreground">
          {hasNewRows
            ? `Successfully added ${addedCount} new row${addedCount !== 1 ? 's' : ''}`
            : 'No new rows added'}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{filename}</span> • Sheet: "{sheetName}"
        </p>
        <div className="flex flex-wrap gap-4 pt-1 text-sm">
          <span className="text-success">
            <strong>{addedCount}</strong> added
          </span>
          {hasDuplicates && (
            <span className="text-warning">
              <strong>{duplicatesSkipped}</strong> duplicates skipped
            </span>
          )}
          <span className="text-muted-foreground">
            <strong>{totalRows}</strong> total rows
          </span>
        </div>
      </div>

      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
