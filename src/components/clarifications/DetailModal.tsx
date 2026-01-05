import { Clarification, COLUMN_LABELS } from '@/types/clarification';
import { formatDisplayDate } from '@/services/excelParser';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, Edit } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DetailModalProps {
  clarification: Clarification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (clarification: Clarification) => void;
  highlightTerms?: string[];
}

export function DetailModal({ clarification, open, onOpenChange, onEdit, highlightTerms = [] }: DetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  if (!clarification) return null;

  const copyToClipboard = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast({ title: 'Copied to clipboard' });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  // Highlight matching terms in text
  const highlightText = (text: string): string => {
    if (!highlightTerms.length || !text) return text;
    let result = text;
    for (const term of highlightTerms) {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>');
    }
    return result;
  };

  const fields: { key: keyof Clarification; label: string; isLong?: boolean }[] = [
    { key: 's_no', label: COLUMN_LABELS.s_no },
    { key: 'module', label: COLUMN_LABELS.module },
    { key: 'scenario_steps', label: COLUMN_LABELS.scenario_steps, isLong: true },
    { key: 'status', label: COLUMN_LABELS.status },
    { key: 'priority', label: COLUMN_LABELS.priority },
    { key: 'assigned_to', label: COLUMN_LABELS.assigned_to },
    { key: 'date', label: COLUMN_LABELS.date },
    { key: 'keywords', label: COLUMN_LABELS.keywords },
    { key: 'offshore_comments', label: COLUMN_LABELS.offshore_comments, isLong: true },
    { key: 'onsite_comments', label: COLUMN_LABELS.onsite_comments, isLong: true },
    { key: 'reason', label: COLUMN_LABELS.reason, isLong: true },
    { key: 'addressed_by', label: COLUMN_LABELS.addressed_by },
    { key: 'teater', label: COLUMN_LABELS.teater },
    { key: 'offshore_reviewer', label: COLUMN_LABELS.offshore_reviewer },
    { key: 'open', label: COLUMN_LABELS.open },
    { key: 'defect_should_be_raised', label: COLUMN_LABELS.defect_should_be_raised },
  ];

  const formatValue = (key: keyof Clarification, value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (key === 'date') return formatDisplayDate(String(value));
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">#{clarification.s_no || 'N/A'}</span>
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {clarification.module || 'Unknown Module'}
              </span>
            </div>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(clarification)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {fields.map(({ key, label, isLong }) => {
              const value = formatValue(key, clarification[key]);
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      {label}
                    </label>
                    {isLong && value !== '-' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(key, value)}
                      >
                        {copiedField === key ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  <div
                    className={`rounded-md bg-muted/50 px-3 py-2 text-sm ${
                      isLong ? 'whitespace-pre-line' : ''
                    }`}
                  >
                    {key === 'status' ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          value.toLowerCase() === 'open'
                            ? 'border-warning/20 bg-warning/10 text-warning'
                            : value.toLowerCase() === 'closed'
                            ? 'border-success/20 bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {value}
                      </span>
                    ) : key === 'priority' ? (
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          value.toLowerCase() === 'high'
                            ? 'bg-destructive/10 text-destructive'
                            : value.toLowerCase() === 'medium'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {value}
                      </span>
                    ) : key === 'keywords' ? (
                      <div className="flex flex-wrap gap-1">
                        {value.split(',').filter(Boolean).map((kw, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs"
                          >
                            {kw.trim()}
                          </span>
                        ))}
                      </div>
                    ) : isLong && highlightTerms.length > 0 ? (
                      <span dangerouslySetInnerHTML={{ __html: highlightText(value) }} />
                    ) : (
                      value
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
