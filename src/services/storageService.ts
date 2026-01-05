import { supabase } from '@/integrations/supabase/client';
import { Clarification, Upload, UploadResult, ClarificationStats } from '@/types/clarification';
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
      const { error: insertError } = await supabase
        .from('clarifications')
        .insert({
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
          keywords: row.keywords || '',
          row_hash: row.row_hash,
          source_upload_id: uploadId,
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

// Create or update a single clarification (for manual add/edit)
export async function saveSingleClarification(
  data: Partial<Clarification>
): Promise<{ success: boolean; error?: string; isDuplicate?: boolean }> {
  // Extract keywords
  const keywords = extractKeywordsFromRow(data);
  
  // Generate row hash for deduplication
  const row_hash = await generateRowHash(data);
  
  // If editing existing row, update it
  if (data.id) {
    const { error } = await supabase
      .from('clarifications')
      .update({
        s_no: data.s_no ?? null,
        module: data.module || '',
        scenario_steps: data.scenario_steps || '',
        status: data.status || '',
        offshore_comments: data.offshore_comments || '',
        onsite_comments: data.onsite_comments || '',
        date: data.date || '',
        teater: data.teater || '',
        offshore_reviewer: data.offshore_reviewer || '',
        open: data.open || '',
        addressed_by: data.addressed_by || '',
        defect_should_be_raised: data.defect_should_be_raised || '',
        priority: data.priority || '',
        assigned_to: data.assigned_to || '',
        reason: data.reason || '',
        keywords,
        row_hash,
      })
      .eq('id', data.id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }
  
  // For new rows, check for duplicates
  const { data: existing } = await supabase
    .from('clarifications')
    .select('id')
    .eq('row_hash', row_hash)
    .maybeSingle();
  
  if (existing) {
    return { success: false, error: 'Duplicate row detected', isDuplicate: true };
  }
  
  // Insert new row
  const { error } = await supabase
    .from('clarifications')
    .insert({
      s_no: data.s_no ?? null,
      module: data.module || '',
      scenario_steps: data.scenario_steps || '',
      status: data.status || '',
      offshore_comments: data.offshore_comments || '',
      onsite_comments: data.onsite_comments || '',
      date: data.date || '',
      teater: data.teater || '',
      offshore_reviewer: data.offshore_reviewer || '',
      open: data.open || '',
      addressed_by: data.addressed_by || '',
      defect_should_be_raised: data.defect_should_be_raised || '',
      priority: data.priority || '',
      assigned_to: data.assigned_to || '',
      reason: data.reason || '',
      keywords,
      row_hash,
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

  let clarifications = (data || []) as Clarification[];

  // Apply text search filter client-side if provided
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    clarifications = clarifications.filter(c => {
      const searchableText = [
        c.module, c.scenario_steps, c.status, c.offshore_comments,
        c.onsite_comments, c.reason, c.assigned_to, c.priority
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

// Get statistics including Open vs Closed from 'open' column
export async function getStats(): Promise<ClarificationStats> {
  const { data: clarifications } = await supabase.from('clarifications').select('status, priority, module, open');
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
    
    // Count based on 'open' column
    const openValue = (c.open || '').toLowerCase().trim();
    if (openValue === 'closed') {
      resolvedCount++;
    } else if (openValue) {
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
