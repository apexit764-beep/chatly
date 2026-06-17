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
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const radius = size / 2 - 8;
  const innerRadius = radius * 0.6;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;

  const arcs = data.map((slice) => {
    const fraction = total ? slice.value / total : 0;
    const sweep = fraction * Math.PI * 2;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;
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
      path: `M${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${innerRadius},${innerRadius} 0 ${largeArc} 0 ${ix2},${iy2} Z`,
      color: slice.color,
      label: slice.label,
      value: slice.value,
      fraction,
    };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc, i) => (
            <path key={i} d={arc.path} fill={arc.color} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-h1 font-bold leading-none">{total}</p>
          <p className="text-small text-muted-light dark:text-muted-dark">المجموع</p>
        </div>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 rounded flex-shrink-0" style={{ background: arc.color }} />
              <span className="text-body truncate">{arc.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-body font-semibold">{arc.value}</span>
              <span className="text-small text-muted-light dark:text-muted-dark">
                {Math.round(arc.fraction * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
