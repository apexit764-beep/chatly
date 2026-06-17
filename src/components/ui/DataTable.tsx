import { ReactNode, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Inbox as InboxIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  /** value accessor used for sorting + default rendering */
  accessor?: (row: T) => string | number | undefined | null;
  /** custom cell renderer */
  cell?: (row: T) => ReactNode;
  /** allow sorting (default: true if accessor provided) */
  sortable?: boolean;
  /** hide on small screens */
  hideOn?: 'sm' | 'md' | 'lg' | 'xl';
  /** explicit width or "1" for shrink */
  width?: string;
  /** text alignment */
  align?: 'start' | 'end' | 'center';
  /** className passed to th + td */
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  /** Extra toolbar (rendered at the end of the row — left in RTL) */
  toolbar?: ReactNode;
  /** Filter controls (rendered next to the search input — right in RTL) */
  filters?: ReactNode;
  /** Show search input. Default true */
  searchable?: boolean;
  /** Page size, default 10. Set to 0 to disable pagination */
  pageSize?: number;
  /** Empty state shown when filtered data is empty */
  emptyState?: ReactNode;
  /** Bulk select callbacks */
  selectable?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  /** Click row */
  onRowClick?: (row: T) => void;
  /** Optional className for the wrapper card */
  className?: string;
}

const hideClass = (h?: 'sm' | 'md' | 'lg' | 'xl'): string => {
  if (!h) return '';
  return ({
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell',
    xl: 'hidden xl:table-cell',
  } as const)[h];
};

const alignClass = (a?: 'start' | 'end' | 'center'): string => {
  if (!a || a === 'start') return 'text-start';
  if (a === 'end') return 'text-end';
  return 'text-center';
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  searchPlaceholder = 'بحث...',
  searchAccessor,
  toolbar,
  filters,
  searchable = true,
  pageSize = 10,
  emptyState,
  selectable = false,
  onSelectionChange,
  bulkActions,
  onRowClick,
  className,
}: DataTableProps<T>): JSX.Element {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search || !searchAccessor) return data;
    const q = search.toLowerCase();
    return data.filter((row) => searchAccessor(row).toLowerCase().includes(q));
  }, [data, search, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = col.accessor!(a);
      const bv = col.accessor!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv), 'ar')
        : String(bv).localeCompare(String(av), 'ar');
    });
    return arr;
  }, [filtered, sortKey, sortDir, columns]);

  const total = sorted.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const start = pageSize > 0 ? safePage * pageSize : 0;
  const end = pageSize > 0 ? start + pageSize : total;
  const pageRows = pageSize > 0 ? sorted.slice(start, end) : sorted;

  const toggleSort = (col: Column<T>): void => {
    if (col.sortable === false || !col.accessor) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const toggleRowSelected = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (onSelectionChange) onSelectionChange(data.filter((r) => next.has(rowKey(r))));
      return next;
    });
  };

  const toggleAllPage = (): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((r) => next.has(rowKey(r)));
      if (allSelected) {
        pageRows.forEach((r) => next.delete(rowKey(r)));
      } else {
        pageRows.forEach((r) => next.add(rowKey(r)));
      }
      if (onSelectionChange) onSelectionChange(data.filter((r) => next.has(rowKey(r))));
      return next;
    });
  };

  const clearSelection = (): void => {
    setSelected(new Set());
    if (onSelectionChange) onSelectionChange([]);
  };

  const selectedArr = data.filter((r) => selected.has(rowKey(r)));
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)));

  return (
    <div className={cn('bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card overflow-hidden', className)}>
      {/* Toolbar */}
      {(searchable || toolbar || filters) && (
        <div className="p-3 flex flex-wrap items-center gap-2 border-b border-border-light dark:border-border-dark">
          {searchable && searchAccessor && (
            <div className="relative w-full sm:w-56 flex-shrink-0">
              <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full h-9 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>
          )}
          {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
          {toolbar && <div className="flex items-center gap-2 flex-wrap ms-auto">{toolbar}</div>}
        </div>
      )}

      {/* Bulk action bar */}
      {selectable && selectedArr.length > 0 && (
        <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-small font-medium">
            <span className="text-primary font-bold">{selectedArr.length}</span> صف مُحدّد
          </p>
          <div className="flex items-center gap-2">
            {bulkActions && bulkActions(selectedArr, clearSelection)}
            <button onClick={clearSelection} className="text-small text-muted-light dark:text-muted-dark hover:text-current">
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead className="bg-bg-light dark:bg-bg-dark/50 text-small text-muted-light dark:text-muted-dark border-b border-border-light dark:border-border-dark">
            <tr>
              {selectable && (
                <th className="px-3 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllPage}
                    className="h-4 w-4 accent-primary cursor-pointer"
                    aria-label="تحديد الكل"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const isSortable = col.sortable !== false && !!col.accessor;
                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      'font-medium px-3 py-2.5 whitespace-nowrap',
                      alignClass(col.align),
                      hideClass(col.hideOn),
                      isSortable && 'cursor-pointer select-none hover:text-current',
                      col.className
                    )}
                    onClick={isSortable ? () => toggleSort(col) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {isSortable && (
                        isSorted ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {pageRows.map((row) => {
              const id = rowKey(row);
              const isSelected = selected.has(id);
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer',
                    'hover:bg-bg-light dark:hover:bg-bg-dark/40',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  {selectable && (
                    <td className="px-3 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelected(id)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                        aria-label="تحديد الصف"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-2.5',
                        alignClass(col.align),
                        hideClass(col.hideOn),
                        col.className
                      )}
                    >
                      {col.cell ? col.cell(row) : col.accessor ? String(col.accessor(row) ?? '') : ''}
                    </td>
                  ))}
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-3 py-12 text-center">
                  {emptyState ?? (
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-bg-light dark:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark mb-2">
                        <InboxIcon className="h-6 w-6" />
                      </div>
                      <p className="text-body font-medium">لا توجد نتائج</p>
                      <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
                        {search ? 'جرّب تعديل بحثك أو الفلاتر' : 'لا توجد بيانات لعرضها'}
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageSize > 0 && total > pageSize && (
        <div className="px-4 py-3 border-t border-border-light dark:border-border-dark flex items-center justify-between flex-wrap gap-2">
          <p className="text-small text-muted-light dark:text-muted-dark">
            عرض {start + 1}-{Math.min(end, total)} من {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="h-8 w-8 rounded-md hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-current flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="السابق"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {pageNumbers(safePage, totalPages).map((n, i) =>
              n === '…' ? (
                <span key={`gap-${i}`} className="text-small text-muted-light dark:text-muted-dark px-1">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={cn(
                    'h-8 min-w-8 px-2.5 rounded-md text-small font-medium',
                    safePage === n
                      ? 'bg-primary text-white'
                      : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current'
                  )}
                >
                  {(n as number) + 1}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className="h-8 w-8 rounded-md hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-current flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="التالي"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function pageNumbers(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const out: Array<number | '…'> = [0];
  const showLeft = Math.max(1, current - 1);
  const showRight = Math.min(total - 2, current + 1);
  if (showLeft > 1) out.push('…');
  for (let i = showLeft; i <= showRight; i += 1) out.push(i);
  if (showRight < total - 2) out.push('…');
  out.push(total - 1);
  return out;
}
