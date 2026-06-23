import { useState } from 'react';

interface BarChartProps {
  labels: string[];
  data: number[];
  color?: string;
  height?: number;
}

export function BarChart({ labels, data, color = '#6C63FF', height = 240 }: BarChartProps): JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
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
          const isActive = hovered === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="4"
                fill={color}
                fillOpacity={hovered !== null && !isActive ? 0.35 : 0.85}
                style={{ transition: 'fill-opacity 0.2s ease, y 0.15s ease, height 0.15s ease' }}
              />
              {isActive && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={x + barW / 2 - 28}
                    y={y - 32}
                    width={56}
                    height={24}
                    rx="6"
                    fill="var(--color-surface-dark, #1e1e2e)"
                    fillOpacity="0.92"
                  />
                  <text
                    x={x + barW / 2}
                    y={y - 15}
                    fontSize="12"
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#fff"
                  >
                    {v}
                  </text>
                </g>
              )}
              {!isActive && (
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
              )}
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
            opacity={hovered !== null && hovered !== i ? 0.3 : 0.6}
            style={{ transition: 'opacity 0.2s ease' }}
            fontWeight={hovered === i ? '600' : '400'}
          >
            {lbl}
          </text>
        ))}
      </svg>
    </div>
  );
}
