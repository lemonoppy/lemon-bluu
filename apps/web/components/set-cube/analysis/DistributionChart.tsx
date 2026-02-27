import { useTheme } from 'next-themes';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ChartDataPoint } from '@/lib/set-cube/analysis';

interface Props {
  data: ChartDataPoint[];
  title: string;
}

export default function DistributionChart({ data, title }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const gridColor = isDark ? 'oklch(0.28 0.08 264)' : 'oklch(0.88 0.012 240)';
  const tickColor = isDark ? 'oklch(0.67 0.04 240)' : '#64748b';
  const tooltipBg = isDark ? 'oklch(0.22 0.09 264)' : '#ffffff';
  const tooltipBorder = isDark ? 'oklch(0.28 0.08 264)' : '#e2e8f0';
  const tooltipText = isDark ? 'oklch(0.99 0 0)' : '#0f172a';
  const cubeBar = isDark ? 'oklch(0.62 0.14 222)' : '#1e3a8a';
  const refBar = isDark ? 'oklch(0.99 0 0)' : '#64748b';
  const cursorFill = isDark ? 'oklch(0.32 0.08 264)' : 'oklch(0.93 0.012 240)';

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="label"
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 11 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ fill: cursorFill }}
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              fontSize: 12,
              color: tooltipText,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value, name, props) => {
              const item = props.payload as
                | { cubeCount: number; referenceCount: number }
                | undefined;
              const count = item
                ? name === 'cube'
                  ? item.cubeCount
                  : item.referenceCount
                : 0;
              return [
                `${value ?? 0}% (${count})`,
                name === 'cube' ? 'My Cube' : 'Reference',
              ];
            }}
          />
          <Legend
            formatter={(value) => (value === 'cube' ? 'My Cube' : 'Reference')}
            wrapperStyle={{ fontSize: 12, color: tickColor }}
          />
          <Bar dataKey="cube" fill={cubeBar} radius={[3, 3, 0, 0]} />
          <Bar dataKey="reference" fill={refBar} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
