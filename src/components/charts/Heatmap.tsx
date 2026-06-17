import { cn } from '@/utils/cn';

interface HeatmapProps {
  /** rows: day labels (Sun → Sat) */
  rows: string[];
  /** columns: time slot labels (e.g. 12am, 2am, 4am ...) */
  cols: string[];
  /** values: rows × cols matrix (0–100 typical) */
  values: number[][];
}

function bucket(v: number, max: number): number {
  if (max === 0) return 0;
  const p = v / max;
  if (p === 0) return 0;
  if (p < 0.2) return 1;
  if (p < 0.4) return 2;
  if (p < 0.6) return 3;
  if (p < 0.8) return 4;
  return 5;
}

export function Heatmap({ rows, cols, values }: HeatmapProps): JSX.Element {
  const max = Math.max(...values.flat(), 1);
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${cols.length}, minmax(0,1fr))`, gap: 4 }}>
          {/* corner */}
          <div />
          {cols.map((c) => (
            <div key={c} className="text-[10px] text-muted-light dark:text-muted-dark text-center">
              {c}
            </div>
          ))}
          {rows.map((row, ri) => (
            <FragmentRow key={row} row={row} bins={values[ri].map((v) => bucket(v, max))} rawValues={values[ri]} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-light dark:text-muted-dark">
          <span>أقل</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5].map((b) => (
              <span key={b} className={cn('h-3 w-5 rounded-sm', `heat-${b}`)} />
            ))}
          </div>
          <span>أكثر</span>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  bins,
  rawValues,
}: {
  row: string;
  bins: number[];
  rawValues: number[];
}): JSX.Element {
  return (
    <>
      <div className="text-small text-muted-light dark:text-muted-dark self-center">{row}</div>
      {bins.map((b, ci) => (
        <div
          key={`${row}-${ci}`}
          className={cn('aspect-square rounded-md hover:ring-2 hover:ring-primary/40 transition-all', `heat-${b}`)}
          title={`${row} · ${rawValues[ci]}`}
        />
      ))}
    </>
  );
}
