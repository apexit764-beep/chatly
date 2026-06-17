import { useMemo } from 'react';

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
            opacity="0.6"
          >
            {lbl}
          </text>
        ))}
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
                return <circle key={i} cx={p.x} cy={p.y} r="3" fill={s.color} />;
              })}
            </g>
          );
        })}
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
