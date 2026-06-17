interface BarChartProps {
  labels: string[];
  data: number[];
  color?: string;
  height?: number;
}

export function BarChart({ labels, data, color = '#6C63FF', height = 240 }: BarChartProps): JSX.Element {
  const width = 600;
  const padding = { top: 20, right: 16, bottom: 32, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data, 1);
  const barW = (innerW / data.length) * 0.6;
  const slot = innerW / data.length;
  const yGrid = [0, 0.25, 0.5, 0.75, 1];

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
            {Math.round(max * g)}
          </text>
        ))}
        {data.map((v, i) => {
          const h = (v / max) * innerH;
          const x = padding.left + i * slot + (slot - barW) / 2;
          const y = padding.top + innerH - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="4"
                fill={color}
                fillOpacity="0.85"
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                fontSize="10"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.8"
                fontWeight="600"
              >
                {v}
              </text>
            </g>
          );
        })}
        {labels.map((lbl, i) => (
          <text
            key={lbl + i}
            x={padding.left + i * slot + slot / 2}
            y={height - 8}
            fontSize="10"
            textAnchor="middle"
            fill="currentColor"
            opacity="0.6"
          >
            {lbl}
          </text>
        ))}
      </svg>
    </div>
  );
}
