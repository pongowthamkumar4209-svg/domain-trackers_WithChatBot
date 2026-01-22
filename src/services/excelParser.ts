import * as XLSX from 'xlsx';
import { Clarification, COLUMN_MAPPING } from '@/types/clarification';
import { generateRowHash } from './hashService';
import { extractKeywordsFromRow } from './keywordService';

const REQUIRED_SHEET = 'clarification';

export interface ParseResult {
  success: boolean;
  rows?: Partial<Clarification>[];
  error?: string;
  available_sheets?: string[];
}

// Parse date to ISO format
function parseDate(value: unknown): string {
  if (!value) return '';
  
  // Handle Excel serial dates
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d).toISOString();
    }
  }
  
  // Handle string dates
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return value;
  }
  
  return String(value);
}

// Format date for display as DD-MMM-YYYY
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return isoDate;
  }
}

// Find best matching header for fuzzy matching
function findMatchingColumn(header: string): keyof Clarification | null {
  const normalized = header.trim().toLowerCase();
  
  for (const [excelHeader, field] of Object.entries(COLUMN_MAPPING)) {
    if (excelHeader.toLowerCase() === normalized) {
      return field;
    }
  }
  
  // Fuzzy matching for close variations
  const fuzzyMatches: Record<string, keyof Clarification> = {
    'sno': 's_no',
    's no': 's_no',
    'serial': 's_no',
    'scenario': 'scenario_steps',
    'steps': 'scenario_steps',
    'scenario/steps': 'scenario_steps',
    'offshore comment': 'offshore_comments',
    'onsite comment': 'onsite_comments',
    'assigned': 'assigned_to',
    'assignedto': 'assigned_to',
    'offshore review': 'offshore_reviewer',
    'defect': 'defect_should_be_raised',
    'addressed': 'addressed_by',
  };
  
  for (const [pattern, field] of Object.entries(fuzzyMatches)) {
    if (normalized.includes(pattern)) {
      return field;
    }
  }
  
  return null;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    // Check for required sheet
    const sheetNames = workbook.SheetNames;
    const sheetIndex = sheetNames.findIndex(
      name => name.toLowerCase() === REQUIRED_SHEET.toLowerCase()
    );
    
    if (sheetIndex === -1) {
      return {
        success: false,
        error: `Sheet "${REQUIRED_SHEET}" not found.`,
        available_sheets: sheetNames,
      };
    }
    
    const sheet = workbook.Sheets[sheetNames[sheetIndex]];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
      raw: false,
      defval: '',
    });
    
    if (rawData.length === 0) {
      return {
        success: false,
        error: 'No data found in the clarification sheet.',
      };
    }
    
    // Map headers to fields
    const firstRow = rawData[0];
    const headerMapping: Record<string, keyof Clarification> = {};
    
    for (const header of Object.keys(firstRow)) {
      const field = findMatchingColumn(header);
      if (field) {
        headerMapping[header] = field;
      }
    }
    
    // Parse rows
    const rows: Partial<Clarification>[] = [];
    
    for (const rawRow of rawData) {
      const row: Partial<Clarification> = {};
      
      for (const [header, value] of Object.entries(rawRow)) {
        const field = headerMapping[header];
        if (field) {
          if (field === 's_no') {
            row[field] = value ? parseInt(String(value), 10) || null : null;
          } else if (field === 'date') {
            (row as any)[field] = parseDate(value);
          } else {
            (row as any)[field] = String(value || '');
          }
        }
      }
      
      // Extract keywords from long text fields
      row.keywords = extractKeywordsFromRow(row);
      
      // Generate hash for deduplication
      row.row_hash = await generateRowHash(row);
      
      rows.push(row);
    }
    
    return { success: true, rows };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse Excel file',
    };
  }
}
