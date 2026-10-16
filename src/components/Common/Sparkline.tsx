import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  isPositive?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 72,
  height = 20,
  color,
  isPositive = true,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const strokeColor = color || (isPositive ? "#d4f55c" : "#ff5c5c");
  const gradientId = `spark-grad-${Math.random().toString(36).substring(2, 8)}`;

  // Calculate coordinates with 2px padding
  const padY = 2;
  const padX = 1;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padY * 2;

  const points = data.map((val, idx) => {
    const x = padX + (idx / (data.length - 1)) * usableWidth;
    const y = height - padY - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylineStr = points.join(" ");

  // Closed path for area gradient fill
  const firstX = padX;
  const lastX = width - padX;
  const areaPath = `M ${points[0]} L ${points.slice(1).join(" L ")} L ${lastX},${height} L ${firstX},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible", display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Area under curve */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Main sparkline */}
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polylineStr}
      />

      {/* Pulse dot on the latest sample */}
      <circle
        cx={width - padX}
        cy={height - padY - ((data[data.length - 1] - min) / range) * usableHeight}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
};
