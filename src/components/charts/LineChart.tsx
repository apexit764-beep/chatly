import { useMemo, useState } from 'react';

interface Series {
  name: string;
  color: string;
  data: number[];
}

interface LineChartProps {
  labels: string[];
  series: Series[];
  height?: number;
  areaFill?: boolean;
}

export function LineChart({ labels, series, height = 240, areaFill = true }: LineChartProps): JSX.Element {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const width = 600;
  const padding = { top: 20, right: 20, bottom: 32, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxY = useMemo(
    () => Math.max(...series.flatMap((s) => s.data), 10),
    [series]
  );
  const stepX = innerW / Math.max(labels.length - 1, 1);
  const yGrid = [0, 0.25, 0.5, 0.75, 1];

  const point = (i: number, v: number): { x: number; y: number } => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (v / maxY) * innerH,
  });

  const rowH = 18;
  const tooltipPadY = 8;
  const headerH = 22;
  // Tooltip width scales with longest series name (≈ 7px per char) + chips + padding.
  // Clamped to a sensible range so short names don't shrink it too much and very long names cap out.
  const longestName = useMemo(
    () => series.reduce((m, s) => Math.max(m, s.name.length), 0),
    [series]
  );
  const tw = Math.max(140, Math.min(260, longestName * 8 + 70));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {yGrid.map((g) => (
          <line
            key={g}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - g)}
            y2={padding.top + innerH * (1 - g)}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="3 3"
          />
        ))}
        {yGrid.map((g) => (
          <text
            key={`yl-${g}`}
            x={padding.left - 6}
            y={padding.top + innerH * (1 - g) + 4}
            fontSize="10"
            textAnchor="end"
            fill="currentColor"
            opacity="0.5"
          >
            {Math.round(maxY * g)}
          </text>
        ))}
        {labels.map((lbl, i) => (
          <text
            key={lbl + i}
            x={padding.left + i * stepX}
            y={height - 8}
            fontSize="10"
            textAnchor="middle"
            fill="currentColor"
            opacity={hoveredCol === i ? 1 : 0.6}
            fontWeight={hoveredCol === i ? '600' : '400'}
          >
            {lbl}
          </text>
        ))}

        {/* Hover column highlight */}
        {hoveredCol !== null && (
          <line
            x1={padding.left + hoveredCol * stepX}
            x2={padding.left + hoveredCol * stepX}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        )}

        {series.map((s) => {
          const d = s.data.map((v, i) => {
            const p = point(i, v);
            return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
          }).join(' ');
          const area = d + ` L${padding.left + (s.data.length - 1) * stepX},${padding.top + innerH} L${padding.left},${padding.top + innerH} Z`;
          return (
            <g key={s.name}>
              {areaFill && <path d={area} fill={s.color} fillOpacity="0.12" />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {s.data.map((v, i) => {
                const p = point(i, v);
                const isActive = hoveredCol === i;
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 5 : 3}
                    fill={isActive ? '#fff' : s.color}
                    stroke={isActive ? s.color : 'none'}
                    strokeWidth={isActive ? 2.5 : 0}
                    style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Tooltip — uses foreignObject for proper RTL HTML rendering */}
        {hoveredCol !== null && (() => {
          const colX = padding.left + hoveredCol * stepX;
          const th = headerH + tooltipPadY * 2 + series.length * rowH;
          let tx = colX + 10;
          if (tx + tw > width - padding.right) tx = colX - tw - 10;
          const ty = padding.top + 4;
          const sorted = series.map((s, si) => ({ s, si, v: s.data[hoveredCol] })).sort((a, b) => b.v - a.v);
          return (
            <foreignObject x={tx} y={ty} width={tw} height={th} style={{ pointerEvents: 'none', overflow: 'visible' }}>
              <div
                dir="rtl"
                style={{
                  width: tw,
                  background: 'var(--tooltip-bg, #fff)',
                  border: '1px solid var(--tooltip-border, #e5e7eb)',
                  borderRadius: 8,
                  padding: `${tooltipPadY}px 10px`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: 11,
                  color: 'inherit',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 700, paddingBottom: 6, marginBottom: 4, borderBottom: '1px solid var(--tooltip-border, #e5e7eb)' }}>
                  {labels[hoveredCol]}
                </div>
                {sorted.map((item) => (
                  <div key={item.si} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: item.s.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ opacity: 0.75, whiteSpace: 'nowrap' }}>{item.s.name}</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.v}</span>
                  </div>
                ))}
              </div>
            </foreignObject>
          );
        })()}

        {/* Invisible hit areas per column */}
        {labels.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={padding.left + i * stepX - stepX / 2}
            y={padding.top}
            width={stepX}
            height={innerH + padding.bottom}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredCol(i)}
            onMouseLeave={() => setHoveredCol(null)}
          />
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 px-2 mt-2 text-small">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-muted-light dark:text-muted-dark">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
