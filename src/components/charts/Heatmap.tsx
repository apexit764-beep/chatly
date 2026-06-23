import { useState } from 'react';
import { cn } from '@/utils/cn';

interface HeatmapProps {
  rows: string[];
  cols: string[];
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
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(...values.flat(), 1);

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(${cols.length}, minmax(0,1fr))`, gap: 4 }}>
          <div />
          {cols.map((c, ci) => (
            <div
              key={c}
              className="text-[10px] text-muted-light dark:text-muted-dark text-center transition-opacity"
              style={{ opacity: hovered !== null && hovered.c !== ci ? 0.35 : 1 }}
            >
              {c}
            </div>
          ))}
          {rows.map((row, ri) => (
            <FragmentRow
              key={row}
              row={row}
              ri={ri}
              bins={values[ri].map((v) => bucket(v, max))}
              rawValues={values[ri]}
              cols={cols}
              hovered={hovered}
              onHover={setHovered}
            />
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
  ri,
  bins,
  rawValues,
  cols,
  hovered,
  onHover,
}: {
  row: string;
  ri: number;
  bins: number[];
  rawValues: number[];
  cols: string[];
  hovered: { r: number; c: number } | null;
  onHover: (v: { r: number; c: number } | null) => void;
}): JSX.Element {
  return (
    <>
      <div
        className="text-small text-muted-light dark:text-muted-dark self-center transition-opacity"
        style={{ opacity: hovered !== null && hovered.r !== ri ? 0.35 : 1 }}
      >
        {row}
      </div>
      {bins.map((b, ci) => {
        const isActive = hovered?.r === ri && hovered?.c === ci;
        const dimmed = hovered !== null && !isActive;
        return (
          <div
            key={`${row}-${ci}`}
            className="relative"
            onMouseEnter={() => onHover({ r: ri, c: ci })}
            onMouseLeave={() => onHover(null)}
          >
            <div
              className={cn(
                'aspect-square rounded-md transition-all cursor-pointer',
                `heat-${b}`,
                isActive && 'ring-2 ring-primary/50 scale-110'
              )}
              style={{ opacity: dimmed ? 0.35 : 1 }}
            />
            {isActive && (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 bg-[#1e1e2e]/92 text-white text-[11px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-lg">
                {row} · {cols[ci]} — {rawValues[ci]}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
