import { Clarification, COLUMN_LABELS } from '@/types/clarification';
import { formatDisplayDate } from './excelParser';

// Escape CSV value
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  
  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  
  return str;
}

// Export clarifications to CSV
export function exportToCSV(
  clarifications: Clarification[],
  filename = 'clarifications-export.csv'
): void {
  const columns: (keyof Clarification)[] = [
    's_no', 'module', 'scenario_steps', 'status', 'offshore_comments',
    'onsite_comments', 'date', 'teater', 'offshore_reviewer', 'open',
    'addressed_by', 'defect_should_be_raised', 'priority', 'assigned_to', 'reason'
  ];
  
  // Build header row
  const headers = columns.map(col => {
    const label = COLUMN_LABELS[col as keyof typeof COLUMN_LABELS];
    return escapeCSV(label || col);
  });
  
  // Build data rows
  const rows = clarifications.map(c => {
    return columns.map(col => {
      let value = c[col];
      
      // Format date for display
      if (col === 'date' && value) {
        value = formatDisplayDate(value as string);
      }
      
      return escapeCSV(value);
    });
  });
  
  // Combine into CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Create and trigger download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
