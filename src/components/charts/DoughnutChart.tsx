import { useState } from 'react';

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface DoughnutChartProps {
  data: Slice[];
  size?: number;
}

export function DoughnutChart({ data, size = 200 }: DoughnutChartProps): JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.6;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;

  const arcs = data.map((slice, idx) => {
    const fraction = total ? slice.value / total : 0;
    const sweep = fraction * Math.PI * 2;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;
    const midAngle = (startAngle + endAngle) / 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const ix1 = cx + innerRadius * Math.cos(endAngle);
    const iy1 = cy + innerRadius * Math.sin(endAngle);
    const ix2 = cx + innerRadius * Math.cos(startAngle);
    const iy2 = cy + innerRadius * Math.sin(startAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    return {
      idx,
      path: `M${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${innerRadius},${innerRadius} 0 ${largeArc} 0 ${ix2},${iy2} Z`,
      color: slice.color,
      label: slice.label,
      value: slice.value,
      fraction,
      midAngle,
    };
  });

  const hoveredArc = hovered !== null ? arcs[hovered] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc) => (
            <path
              key={arc.idx}
              d={arc.path}
              fill={arc.color}
              opacity={hovered !== null && hovered !== arc.idx ? 0.4 : 1}
              style={{
                transform: hovered === arc.idx
                  ? `translate(${Math.cos(arc.midAngle) * 4}px, ${Math.sin(arc.midAngle) * 4}px)`
                  : 'translate(0,0)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHovered(arc.idx)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hoveredArc ? (
            <>
              <p className="text-h1 font-bold leading-none" style={{ color: hoveredArc.color }}>
                {hoveredArc.value}
              </p>
              <p className="text-small text-muted-light dark:text-muted-dark">{hoveredArc.label}</p>
            </>
          ) : (
            <>
              <p className="text-h1 font-bold leading-none">{total}</p>
              <p className="text-small text-muted-light dark:text-muted-dark">المجموع</p>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 w-full">
        {arcs.map((arc) => (
          <div
            key={arc.label}
            className="flex items-center gap-2 cursor-pointer transition-opacity"
            style={{ opacity: hovered !== null && hovered !== arc.idx ? 0.4 : 1 }}
            onMouseEnter={() => setHovered(arc.idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: arc.color }} />
            <span className="text-small">{arc.label}</span>
            <span className="text-small font-semibold">{arc.value}</span>
            <span className="text-[11px] text-muted-light dark:text-muted-dark">
              {Math.round(arc.fraction * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
