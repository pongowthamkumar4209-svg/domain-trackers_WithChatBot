import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
} from '@tanstack/react-table';
import { Clarification, COLUMN_LABELS } from '@/types/clarification';
import { formatDisplayDate } from '@/services/excelParser';
import { ColumnFilters, ColumnFilter, applyColumnFilters } from './ColumnFilters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Columns3,
  Search,
} from 'lucide-react';

interface ClarificationTableProps {
  data: Clarification[];
  onRowClick?: (row: Clarification) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  highlightedRowId?: string | null;
}

export function ClarificationTable({
  data,
  onRowClick,
  globalFilter = '',
  onGlobalFilterChange,
  highlightedRowId,
}: ClarificationTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [excelFilters, setExcelFilters] = useState<ColumnFilter[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    offshore_reviewer: false,
    teater: false,
    open: false,
    defect_should_be_raised: false,
    keywords: false,
  });
  
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Apply Excel-style filters to data
  const filteredData = useMemo(() => {
    return applyColumnFilters(data, excelFilters);
  }, [data, excelFilters]);

  // Scroll to highlighted row
  useEffect(() => {
    if (highlightedRowId) {
      const rowEl = rowRefs.current.get(highlightedRowId);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedRowId]);

  const columns = useMemo<ColumnDef<Clarification>[]>(
    () => [
      {
        accessorKey: 's_no',
        header: 'S.No',
        size: 60,
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('s_no') || '-'}</span>
        ),
      },
      {
        accessorKey: 'module',
        header: 'Module',
        size: 120,
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {row.getValue('module') || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'scenario_steps',
        header: COLUMN_LABELS.scenario_steps,
        size: 300,
        cell: ({ row }) => (
          <div
            className="max-w-[300px] truncate whitespace-pre-line"
            title={row.getValue('scenario_steps')}
          >
            {row.getValue('scenario_steps') || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const statusClass =
            status?.toLowerCase() === 'open'
              ? 'bg-warning/10 text-warning border-warning/20'
              : status?.toLowerCase() === 'closed'
              ? 'bg-success/10 text-success border-success/20'
              : 'bg-muted text-muted-foreground';
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
            >
              {status || '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        size: 90,
        cell: ({ row }) => {
          const priority = row.getValue('priority') as string;
          const priorityClass =
            priority?.toLowerCase() === 'high'
              ? 'bg-destructive/10 text-destructive'
              : priority?.toLowerCase() === 'medium'
              ? 'bg-warning/10 text-warning'
              : 'bg-muted text-muted-foreground';
          return (
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityClass}`}>
              {priority || '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'assigned_to',
        header: 'Assigned To',
        size: 120,
      },
      {
        accessorKey: 'date',
        header: 'Date',
        size: 100,
        cell: ({ row }) => formatDisplayDate(row.getValue('date')) || '-',
      },
      {
        accessorKey: 'keywords',
        header: 'Keywords',
        size: 200,
        cell: ({ row }) => {
          const keywords = row.getValue('keywords') as string;
          if (!keywords) return '-';
          const keywordList = keywords.split(',').slice(0, 5);
          return (
            <div className="flex flex-wrap gap-1">
              {keywordList.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-xs"
                >
                  {kw.trim()}
                </span>
              ))}
              {keywords.split(',').length > 5 && (
                <span className="text-xs text-muted-foreground">+{keywords.split(',').length - 5}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'open',
        header: 'Open',
        size: 80,
        cell: ({ row }) => {
          const open = row.getValue('open') as string;
          const openClass =
            open?.toLowerCase() === 'closed'
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning';
          return (
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${openClass}`}>
              {open || '-'}
            </span>
          );
        },
      },
      {
        accessorKey: 'offshore_comments',
        header: 'Offshore Comments',
        size: 200,
        cell: ({ row }) => (
          <div
            className="max-w-[200px] truncate whitespace-pre-line"
            title={row.getValue('offshore_comments')}
          >
            {row.getValue('offshore_comments') || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'onsite_comments',
        header: 'Onsite Comments',
        size: 200,
        cell: ({ row }) => (
          <div
            className="max-w-[200px] truncate whitespace-pre-line"
            title={row.getValue('onsite_comments')}
          >
            {row.getValue('onsite_comments') || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        size: 200,
        cell: ({ row }) => (
          <div
            className="max-w-[200px] truncate"
            title={row.getValue('reason')}
          >
            {row.getValue('reason') || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'addressed_by',
        header: 'Addressed By',
        size: 120,
      },
      {
        accessorKey: 'teater',
        header: 'Teater',
        size: 100,
      },
      {
        accessorKey: 'offshore_reviewer',
        header: 'Offshore Reviewer',
        size: 120,
      },
      {
        accessorKey: 'defect_should_be_raised',
        header: 'Defect should be raised',
        size: 150,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onGlobalFilterChange,
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Global Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter rows..."
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange?.(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-auto">
            {table.getAllLeafColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {COLUMN_LABELS[column.id as keyof typeof COLUMN_LABELS] || column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Excel-style Column Filters */}
      <ColumnFilters
        data={data}
        filters={excelFilters}
        onFiltersChange={setExcelFilters}
      />

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 opacity-30" />
                          )}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row, index) => {
                  const isHighlighted = highlightedRowId === row.original.id;
                  return (
                    <TableRow
                      key={row.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(row.original.id, el);
                      }}
                      className={`cursor-pointer hover:bg-muted/50 transition-all duration-300 ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                      } ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 animate-pulse' : ''}`}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            {' - '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
            {' of '}
            {table.getFilteredRowModel().rows.length} rows
            {excelFilters.length > 0 && ` (filtered from ${data.length})`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
