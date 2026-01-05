import { useState, useMemo } from 'react';
import { Clarification } from '@/types/clarification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface ColumnFilter {
  column: keyof Clarification;
  type: 'text' | 'choice' | 'date';
  value: string | string[] | { from?: Date; to?: Date };
  operator?: 'contains' | 'equals' | 'between' | 'before' | 'after';
}

interface ColumnFiltersProps {
  data: Clarification[];
  filters: ColumnFilter[];
  onFiltersChange: (filters: ColumnFilter[]) => void;
}

// Columns that should use multi-select choice filter
const CHOICE_COLUMNS: (keyof Clarification)[] = [
  'status', 'priority', 'module', 'assigned_to', 'open', 'teater', 'offshore_reviewer'
];

// Columns that should use date filter
const DATE_COLUMNS: (keyof Clarification)[] = ['date'];

export function ColumnFilters({ data, filters, onFiltersChange }: ColumnFiltersProps) {
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Get unique values for choice columns
  const uniqueValues = useMemo(() => {
    const values: Partial<Record<keyof Clarification, string[]>> = {};
    for (const col of CHOICE_COLUMNS) {
      const unique = [...new Set(data.map(d => String(d[col] || '')).filter(Boolean))];
      values[col] = unique.sort();
    }
    return values;
  }, [data]);

  const getFilterForColumn = (column: keyof Clarification): ColumnFilter | undefined => {
    return filters.find(f => f.column === column);
  };

  const updateFilter = (column: keyof Clarification, update: Partial<ColumnFilter>) => {
    const existing = filters.findIndex(f => f.column === column);
    if (existing >= 0) {
      const newFilters = [...filters];
      newFilters[existing] = { ...newFilters[existing], ...update };
      onFiltersChange(newFilters);
    } else {
      const type = CHOICE_COLUMNS.includes(column) ? 'choice' : DATE_COLUMNS.includes(column) ? 'date' : 'text';
      onFiltersChange([...filters, { column, type, value: '', operator: 'contains', ...update }]);
    }
  };

  const removeFilter = (column: keyof Clarification) => {
    onFiltersChange(filters.filter(f => f.column !== column));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const renderTextFilter = (column: keyof Clarification) => {
    const filter = getFilterForColumn(column);
    return (
      <div className="space-y-2">
        <Select
          value={filter?.operator || 'contains'}
          onValueChange={(v) => updateFilter(column, { operator: v as 'contains' | 'equals' })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="equals">Equals</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter value..."
          value={typeof filter?.value === 'string' ? filter.value : ''}
          onChange={(e) => updateFilter(column, { value: e.target.value })}
        />
      </div>
    );
  };

  const renderChoiceFilter = (column: keyof Clarification) => {
    const filter = getFilterForColumn(column);
    const options = uniqueValues[column] || [];
    const selectedValues = Array.isArray(filter?.value) ? filter.value : [];

    const toggleValue = (value: string) => {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      updateFilter(column, { value: newValues, type: 'choice' });
    };

    return (
      <div className="max-h-48 overflow-auto space-y-1">
        {options.map((option) => (
          <div key={option} className="flex items-center gap-2">
            <Checkbox
              id={`${column}-${option}`}
              checked={selectedValues.includes(option)}
              onCheckedChange={() => toggleValue(option)}
            />
            <label htmlFor={`${column}-${option}`} className="text-sm cursor-pointer">
              {option || '(empty)'}
            </label>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-sm text-muted-foreground">No values available</p>
        )}
      </div>
    );
  };

  const renderDateFilter = (column: keyof Clarification) => {
    const filter = getFilterForColumn(column);
    const dateValue = filter?.value as { from?: Date; to?: Date } | undefined;

    return (
      <div className="space-y-2">
        <Select
          value={filter?.operator || 'between'}
          onValueChange={(v) => updateFilter(column, { operator: v as 'between' | 'before' | 'after' })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="between">Between</SelectItem>
            <SelectItem value="before">Before</SelectItem>
            <SelectItem value="after">After</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue?.from ? format(dateValue.from, 'PPP') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateValue?.from}
                onSelect={(date) => updateFilter(column, { 
                  value: { ...dateValue, from: date }, 
                  type: 'date' 
                })}
              />
            </PopoverContent>
          </Popover>
          {filter?.operator === 'between' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateValue?.to ? format(dateValue.to, 'PPP') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateValue?.to}
                  onSelect={(date) => updateFilter(column, { 
                    value: { ...dateValue, to: date }, 
                    type: 'date' 
                  })}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    );
  };

  const filterColumns: { key: keyof Clarification; label: string }[] = [
    { key: 'module', label: 'Module' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'open', label: 'Open' },
    { key: 'date', label: 'Date' },
    { key: 'scenario_steps', label: 'Scenario/Steps' },
    { key: 'offshore_comments', label: 'Offshore Comments' },
    { key: 'onsite_comments', label: 'Onsite Comments' },
    { key: 'reason', label: 'Reason' },
    { key: 'teater', label: 'Teater' },
    { key: 'offshore_reviewer', label: 'Offshore Reviewer' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterColumns.map(({ key, label }) => {
        const filter = getFilterForColumn(key);
        const hasValue = filter && (
          (typeof filter.value === 'string' && filter.value) ||
          (Array.isArray(filter.value) && filter.value.length > 0) ||
          (typeof filter.value === 'object' && !Array.isArray(filter.value) && (filter.value.from || filter.value.to))
        );

        return (
          <Popover 
            key={key} 
            open={activePopover === key} 
            onOpenChange={(open) => setActivePopover(open ? key : null)}
          >
            <PopoverTrigger asChild>
              <Button 
                variant={hasValue ? 'default' : 'outline'} 
                size="sm" 
                className="gap-1"
              >
                <Filter className="h-3 w-3" />
                {label}
                {hasValue && (
                  <span className="ml-1 rounded-full bg-primary-foreground text-primary w-4 h-4 text-xs flex items-center justify-center">
                    {Array.isArray(filter?.value) ? filter.value.length : '1'}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{label}</h4>
                  {hasValue && (
                    <Button variant="ghost" size="sm" onClick={() => removeFilter(key)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {CHOICE_COLUMNS.includes(key)
                  ? renderChoiceFilter(key)
                  : DATE_COLUMNS.includes(key)
                  ? renderDateFilter(key)
                  : renderTextFilter(key)}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}

      {filters.length > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-destructive">
          <X className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
}

// Apply filters to data
export function applyColumnFilters(data: Clarification[], filters: ColumnFilter[]): Clarification[] {
  if (filters.length === 0) return data;

  return data.filter(row => {
    return filters.every(filter => {
      const cellValue = String(row[filter.column] || '').toLowerCase();

      if (filter.type === 'text') {
        const filterValue = (filter.value as string).toLowerCase();
        if (!filterValue) return true;
        return filter.operator === 'equals'
          ? cellValue === filterValue
          : cellValue.includes(filterValue);
      }

      if (filter.type === 'choice') {
        const selectedValues = filter.value as string[];
        if (selectedValues.length === 0) return true;
        return selectedValues.some(v => v.toLowerCase() === cellValue);
      }

      if (filter.type === 'date') {
        const dateValue = filter.value as { from?: Date; to?: Date };
        if (!dateValue.from && !dateValue.to) return true;
        
        const rowDate = new Date(row.date);
        if (isNaN(rowDate.getTime())) return true;

        if (filter.operator === 'after' && dateValue.from) {
          return rowDate >= dateValue.from;
        }
        if (filter.operator === 'before' && dateValue.from) {
          return rowDate <= dateValue.from;
        }
        if (filter.operator === 'between') {
          const afterFrom = !dateValue.from || rowDate >= dateValue.from;
          const beforeTo = !dateValue.to || rowDate <= dateValue.to;
          return afterFrom && beforeTo;
        }
      }

      return true;
    });
  });
}
