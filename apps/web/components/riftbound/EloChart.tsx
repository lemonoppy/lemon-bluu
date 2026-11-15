import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartCard } from '@/components/ui/chart-card';
import { useChartColors } from '@/lib/chart-utils';
import type { EloHistoryPoint } from '@/lib/riftbound';
import { formatDate, formatSigned } from '@/lib/riftbound';

interface ChartPoint extends EloHistoryPoint {
  label: string;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md space-y-1">
      <div className="font-semibold text-foreground">
        {formatDate(point.date)} — {point.eloAfter} elo
      </div>
      <div className="text-muted-foreground">
        {formatSigned(point.eloChange)} vs {point.opponentName ?? 'Unknown'} (
        {point.result ?? '—'})
      </div>
    </div>
  );
}

export function EloChart({ points }: { points: EloHistoryPoint[] }) {
  const colors = useChartColors();

  if (points.length === 0) {
    return (
      <ChartCard title="Elo history (EloShowdown)">
        <p className="text-sm text-muted-foreground py-6">
          No Elo history recorded for this player yet.
        </p>
      </ChartCard>
    );
  }

  const data: ChartPoint[] = points.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

  return (
    <ChartCard title="Elo history (EloShowdown, all recorded matches)">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.tick, fontSize: 10 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={false}
            minTickGap={50}
          />
          <YAxis
            tick={{ fill: colors.tick, fontSize: 10 }}
            axisLine={{ stroke: colors.grid }}
            tickLine={false}
            domain={[
              (dataMin: number) => Math.floor(dataMin - 15),
              (dataMax: number) => Math.ceil(dataMax + 15),
            ]}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.grid }} />
          <Line
            type="monotone"
            dataKey="eloAfter"
            stroke={colors.lineMedian}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-muted-foreground">
        Includes all EloShowdown matches for this player, not only Ottawa events.
      </p>
    </ChartCard>
  );
}
