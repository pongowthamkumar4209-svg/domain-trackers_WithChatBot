import { supabase } from '@/integrations/supabase/client';
import { Clarification, Upload, UploadResult, ClarificationStats, STATUS_VALUES } from '@/types/clarification';
import { generateRowHash } from './hashService';
import { extractKeywordsFromRow } from './keywordService';

// Save clarifications with append-only logic
export async function saveClarifications(
  rows: Partial<Clarification>[],
  filename: string,
  sheetName: string
): Promise<UploadResult> {
  // First, create the upload record
  const { data: uploadData, error: uploadError } = await supabase
    .from('uploads')
    .insert({
      filename,
      sheet_name: sheetName,
      total_rows_in_file: rows.length,
      added_count: 0,
      duplicates_skipped: 0,
    })
    .select('id')
    .single();

  if (uploadError) {
    console.error('Error creating upload:', uploadError);
    throw new Error('Failed to create upload record');
  }

  const uploadId = uploadData.id;
  let addedCount = 0;
  let duplicatesSkipped = 0;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Process rows - check for duplicates by hash
  for (const row of rows) {
    if (!row.row_hash) continue;

    // Check if hash already exists
    const { data: existing } = await supabase
      .from('clarifications')
      .select('id')
      .eq('row_hash', row.row_hash)
      .maybeSingle();

    if (existing) {
      duplicatesSkipped++;
    } else {
      // Normalize status value
      const normalizedStatus = normalizeStatus(row.status || '');
      // Normalize priority value
      const normalizedPriority = normalizePriority(row.priority || '');

      const { error: insertError } = await supabase
        .from('clarifications')
        .insert({
          s_no: row.s_no ?? null,
          module: row.module || '',
          scenario_steps: row.scenario_steps || '',
          status: normalizedStatus,
          offshore_comments: row.offshore_comments || '',
          onsite_comments: row.onsite_comments || '',
          date: row.date || '',
          tester: row.tester || '',
          offshore_reviewer: row.offshore_reviewer || '',
          addressed_by: row.addressed_by || '',
          defect_should_be_raised: row.defect_should_be_raised || '',
          priority: normalizedPriority,
          assigned_to: row.assigned_to || '',
          drop_name: row.drop_name || '',
          keywords: row.keywords || '',
          row_hash: row.row_hash,
          source_upload_id: uploadId,
          created_by: user?.id || null,
        });

      if (insertError) {
        // If it's a unique constraint error, it's a duplicate
        if (insertError.code === '23505') {
          duplicatesSkipped++;
        } else {
          console.error('Error inserting clarification:', insertError);
        }
      } else {
        addedCount++;
      }
    }
  }

  // Update the upload record with counts
  await supabase
    .from('uploads')
    .update({
      added_count: addedCount,
      duplicates_skipped: duplicatesSkipped,
    })
    .eq('id', uploadId);

  // Get total count
  const { count: totalRows } = await supabase
    .from('clarifications')
    .select('*', { count: 'exact', head: true });

  return {
    success: true,
    upload_id: uploadId,
    added_count: addedCount,
    duplicates_skipped: duplicatesSkipped,
    total_rows: totalRows || 0,
  };
}

// Normalize status to valid values
function normalizeStatus(status: string): string {
  const lower = status.toLowerCase().trim();
  if (lower.includes('offshore')) return 'Open from Offshore';
  if (lower === 'open') return 'Open';
  if (lower === 'closed') return 'Closed';
  // Default based on content
  if (lower) return 'Open';
  return '';
}

// Normalize priority to P1 or P2
function normalizePriority(priority: string): string {
  const lower = priority.toLowerCase().trim();
  if (['high', 'p1', '1', 'critical', 'urgent'].includes(lower)) return 'P1';
  if (['medium', 'p2', '2', 'normal', 'low', 'p3', 'p4'].includes(lower)) return 'P2';
  if (priority === '') return '';
  return 'P2';
}

// Create or update a single clarification (for manual add/edit)
export async function saveSingleClarification(
  data: Partial<Clarification>
): Promise<{ success: boolean; error?: string; isDuplicate?: boolean }> {
  // Extract keywords
  const keywords = extractKeywordsFromRow(data);
  
  // Generate row hash for deduplication
  const row_hash = await generateRowHash(data);
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Normalize status and priority
  const normalizedStatus = data.status && STATUS_VALUES.includes(data.status as any) 
    ? data.status 
    : normalizeStatus(data.status || '');
  const normalizedPriority = normalizePriority(data.priority || '');
  
  // If editing existing row, update it
  if (data.id) {
    const { error } = await supabase
      .from('clarifications')
      .update({
        s_no: data.s_no ?? null,
        module: data.module || '',
        scenario_steps: data.scenario_steps || '',
        status: normalizedStatus,
        offshore_comments: data.offshore_comments || '',
        onsite_comments: data.onsite_comments || '',
        date: data.date || '',
        tester: data.tester || '',
        offshore_reviewer: data.offshore_reviewer || '',
        addressed_by: data.addressed_by || '',
        defect_should_be_raised: data.defect_should_be_raised || '',
        priority: normalizedPriority,
        assigned_to: data.assigned_to || '',
        drop_name: data.drop_name || '',
        keywords,
        row_hash,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }
  
  // For new rows, check for duplicates based on scenario_steps (case-insensitive, trimmed)
  const scenarioSteps = (data.scenario_steps || '').trim().toLowerCase();
  if (scenarioSteps) {
    // Fetch all and compare client-side for case-insensitive matching
    const { data: allRows } = await supabase
      .from('clarifications')
      .select('id, scenario_steps');
    
    const isDuplicate = (allRows || []).some(row => 
      (row.scenario_steps || '').trim().toLowerCase() === scenarioSteps
    );
    
    if (isDuplicate) {
      return { success: false, error: 'A row with the same Scenario/Steps already exists', isDuplicate: true };
    }
  }
  
  // Insert new row
  const { error } = await supabase
    .from('clarifications')
    .insert({
      s_no: data.s_no ?? null,
      module: data.module || '',
      scenario_steps: data.scenario_steps || '',
      status: normalizedStatus,
      offshore_comments: data.offshore_comments || '',
      onsite_comments: data.onsite_comments || '',
      date: data.date || '',
      tester: data.tester || '',
      offshore_reviewer: data.offshore_reviewer || '',
      addressed_by: data.addressed_by || '',
      defect_should_be_raised: data.defect_should_be_raised || '',
      priority: normalizedPriority,
      assigned_to: data.assigned_to || '',
      drop_name: data.drop_name || '',
      keywords,
      row_hash,
      created_by: user?.id || null,
    });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
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
  let query = supabase.from('clarifications').select('*');

  if (filters) {
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.module) {
      query = query.eq('module', filters.module);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters.date_from) {
      query = query.gte('date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date', filters.date_to);
    }
  }

  // Order by s_no if available, then by first_seen_at
  query = query.order('s_no', { ascending: true, nullsFirst: false })
               .order('first_seen_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching clarifications:', error);
    return [];
  }

  // Map database rows to Clarification type (handles column renames)
  let clarifications = (data || []).map((row: any) => ({
    ...row,
    tester: row.tester || row.teater || '',
    drop_name: row.drop_name || '',
  })) as Clarification[];

  // Apply text search filter client-side if provided
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    clarifications = clarifications.filter(c => {
      const searchableText = [
        c.module, c.scenario_steps, c.status, c.offshore_comments,
        c.onsite_comments, c.assigned_to, c.priority, c.drop_name,
        c.tester, c.keywords
      ].join(' ').toLowerCase();
      return searchableText.includes(searchLower);
    });
  }

  return clarifications;
}

// Get unique values for filters
export async function getFilterOptions(): Promise<{
  statuses: string[];
  priorities: string[];
  modules: string[];
  assignees: string[];
}> {
  const { data } = await supabase.from('clarifications').select('status, priority, module, assigned_to');
  
  if (!data) {
    return { statuses: [], priorities: [], modules: [], assignees: [] };
  }

  const statuses = [...new Set(data.map(c => c.status).filter(Boolean))];
  const priorities = [...new Set(data.map(c => c.priority).filter(Boolean))];
  const modules = [...new Set(data.map(c => c.module).filter(Boolean))];
  const assignees = [...new Set(data.map(c => c.assigned_to).filter(Boolean))];

  return { statuses, priorities, modules, assignees };
}

// Get upload history
export async function getUploads(): Promise<Upload[]> {
  const { data, error } = await supabase
    .from('uploads')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error fetching uploads:', error);
    return [];
  }

  return (data || []) as Upload[];
}

// Get statistics based on status field
export async function getStats(): Promise<ClarificationStats> {
  const { data: clarifications } = await supabase.from('clarifications').select('status, priority, module');
  const uploads = await getUploads();

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byModule: Record<string, number> = {};
  
  let openCount = 0;
  let resolvedCount = 0;

  for (const c of clarifications || []) {
    if (c.status) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    if (c.priority) byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    if (c.module) byModule[c.module] = (byModule[c.module] || 0) + 1;
    
    // Count based on status column
    if (c.status === 'Closed') {
      resolvedCount++;
    } else if (c.status === 'Open' || c.status === 'Open from Offshore') {
      openCount++;
    }
  }

  return {
    total: clarifications?.length || 0,
    byStatus,
    byPriority,
    byModule,
    openCount,
    resolvedCount,
    recentUploads: uploads.slice(0, 5),
  };
}

// Clear all data
export async function clearAllData(): Promise<void> {
  await supabase.from('clarifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('uploads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}
