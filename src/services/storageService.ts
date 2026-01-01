import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Clarification, Upload, UploadResult, ClarificationStats } from '@/types/clarification';

interface ClarificationDB extends DBSchema {
  clarifications: {
    key: string;
    value: Clarification;
    indexes: {
      'by-hash': string;
      'by-status': string;
      'by-priority': string;
      'by-module': string;
      'by-date': string;
    };
  };
  uploads: {
    key: string;
    value: Upload;
    indexes: {
      'by-date': string;
    };
  };
}

let db: IDBPDatabase<ClarificationDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ClarificationDB>> {
  if (db) return db;
  
  db = await openDB<ClarificationDB>('cn-clarification-portal', 1, {
    upgrade(database) {
      // Clarifications store
      const clarificationStore = database.createObjectStore('clarifications', { keyPath: 'id' });
      clarificationStore.createIndex('by-hash', 'row_hash', { unique: true });
      clarificationStore.createIndex('by-status', 'status');
      clarificationStore.createIndex('by-priority', 'priority');
      clarificationStore.createIndex('by-module', 'module');
      clarificationStore.createIndex('by-date', 'date');
      
      // Uploads store
      const uploadsStore = database.createObjectStore('uploads', { keyPath: 'id' });
      uploadsStore.createIndex('by-date', 'uploaded_at');
    },
  });
  
  return db;
}

// Generate UUID
function generateId(): string {
  return crypto.randomUUID();
}

// Save clarifications with append-only logic
export async function saveClarifications(
  rows: Partial<Clarification>[],
  filename: string,
  sheetName: string
): Promise<UploadResult> {
  const database = await getDB();
  const uploadId = generateId();
  
  let addedCount = 0;
  let duplicatesSkipped = 0;
  
  const tx = database.transaction('clarifications', 'readwrite');
  
  for (const row of rows) {
    try {
      // Check if hash already exists
      const existing = await tx.store.index('by-hash').get(row.row_hash!);
      
      if (existing) {
        duplicatesSkipped++;
      } else {
        const clarification: Clarification = {
          id: generateId(),
          s_no: row.s_no ?? null,
          module: row.module || '',
          scenario_steps: row.scenario_steps || '',
          status: row.status || '',
          offshore_comments: row.offshore_comments || '',
          onsite_comments: row.onsite_comments || '',
          date: row.date || '',
          teater: row.teater || '',
          offshore_reviewer: row.offshore_reviewer || '',
          open: row.open || '',
          addressed_by: row.addressed_by || '',
          defect_should_be_raised: row.defect_should_be_raised || '',
          priority: row.priority || '',
          assigned_to: row.assigned_to || '',
          reason: row.reason || '',
          row_hash: row.row_hash!,
          first_seen_at: new Date().toISOString(),
          source_upload_id: uploadId,
        };
        
        await tx.store.add(clarification);
        addedCount++;
      }
    } catch (error) {
      // If it's a constraint error (duplicate), skip
      if (error instanceof Error && error.name === 'ConstraintError') {
        duplicatesSkipped++;
      } else {
        throw error;
      }
    }
  }
  
  await tx.done;
  
  // Get total count
  const totalRows = await database.count('clarifications');
  
  // Save upload record
  const upload: Upload = {
    id: uploadId,
    filename,
    sheet_name: sheetName,
    uploaded_at: new Date().toISOString(),
    total_rows_in_file: rows.length,
    added_count: addedCount,
    duplicates_skipped: duplicatesSkipped,
  };
  
  await database.add('uploads', upload);
  
  return {
    success: true,
    upload_id: uploadId,
    added_count: addedCount,
    duplicates_skipped: duplicatesSkipped,
    total_rows: totalRows,
  };
}

// Get all clarifications with optional filters
export interface FilterOptions {
  status?: string;
  priority?: string;
  module?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export async function getClarifications(filters?: FilterOptions): Promise<Clarification[]> {
  const database = await getDB();
  let clarifications = await database.getAll('clarifications');
  
  if (filters) {
    clarifications = clarifications.filter(c => {
      if (filters.status && c.status !== filters.status) return false;
      if (filters.priority && c.priority !== filters.priority) return false;
      if (filters.module && c.module !== filters.module) return false;
      if (filters.assigned_to && c.assigned_to !== filters.assigned_to) return false;
      if (filters.date_from && c.date < filters.date_from) return false;
      if (filters.date_to && c.date > filters.date_to) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableText = [
          c.module, c.scenario_steps, c.status, c.offshore_comments,
          c.onsite_comments, c.reason, c.assigned_to, c.priority
        ].join(' ').toLowerCase();
        if (!searchableText.includes(searchLower)) return false;
      }
      return true;
    });
  }
  
  // Sort by s_no or first_seen_at
  clarifications.sort((a, b) => {
    if (a.s_no !== null && b.s_no !== null) {
      return a.s_no - b.s_no;
    }
    return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
  });
  
  return clarifications;
}

// Get unique values for filters
export async function getFilterOptions(): Promise<{
  statuses: string[];
  priorities: string[];
  modules: string[];
  assignees: string[];
}> {
  const clarifications = await getClarifications();
  
  const statuses = [...new Set(clarifications.map(c => c.status).filter(Boolean))];
  const priorities = [...new Set(clarifications.map(c => c.priority).filter(Boolean))];
  const modules = [...new Set(clarifications.map(c => c.module).filter(Boolean))];
  const assignees = [...new Set(clarifications.map(c => c.assigned_to).filter(Boolean))];
  
  return { statuses, priorities, modules, assignees };
}

// Get upload history
export async function getUploads(): Promise<Upload[]> {
  const database = await getDB();
  const uploads = await database.getAll('uploads');
  return uploads.sort((a, b) => 
    new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );
}

// Get statistics
export async function getStats(): Promise<ClarificationStats> {
  const clarifications = await getClarifications();
  const uploads = await getUploads();
  
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byModule: Record<string, number> = {};
  
  for (const c of clarifications) {
    if (c.status) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    if (c.priority) byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    if (c.module) byModule[c.module] = (byModule[c.module] || 0) + 1;
  }
  
  return {
    total: clarifications.length,
    byStatus,
    byPriority,
    byModule,
    recentUploads: uploads.slice(0, 5),
  };
}

// Clear all data (for testing)
export async function clearAllData(): Promise<void> {
  const database = await getDB();
  await database.clear('clarifications');
  await database.clear('uploads');
}
