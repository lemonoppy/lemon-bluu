import type {
  ArchiveTier,
  Rarity,
  SimulatorResult,
} from '@/lib/set-cube/types';

import RarityBadge from '../shared/RarityBadge';

const ARCHIVE_TIER_META: Record<ArchiveTier, { label: string; rate: string }> =
  {
    'archive-common': { label: 'Common/Uncommon', rate: '66.7%' },
    'archive-rare': { label: 'Rare', rate: '26.4%' },
    'archive-mythic': { label: 'Mythic', rate: '6.6%' },
  };

interface Props {
  results: SimulatorResult[];
}

function calcMath(uniqueCards: number, slotsAvailable: number) {
  if (uniqueCards === 0) return null;
  const n = slotsAvailable;
  const p = 1 / uniqueCards;
  const mean = n * p;
  const stddev = Math.sqrt(n * p * (1 - p));
  return { mean, stddev, upperBound: mean + 2 * stddev };
}

export default function SimulatorTable({ results }: Props) {
  const mainResults = results.filter(
    (r) => !String(r.rarity).startsWith('archive'),
  );
  const archiveResults = results.filter((r) =>
    String(r.rarity).startsWith('archive'),
  ) as (SimulatorResult & { rarity: ArchiveTier })[];

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Rarity
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Unique
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Slots
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold font-mono text-muted-foreground">
              μ
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold font-mono text-muted-foreground">
              σ
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold font-mono text-muted-foreground">
              μ+2σ
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-widest text-foreground">
              Copies
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {mainResults.map((result) => {
            const math = calcMath(result.uniqueCards, result.slotsAvailable);
            return (
              <tr
                key={result.rarity}
                className="hover:bg-muted/20 transition-colors"
              >
                <td className="px-5 py-3">
                  <RarityBadge rarity={result.rarity as Rarity} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {result.uniqueCards}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {result.slotsAvailable}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground/60">
                  {math ? math.mean.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground/60">
                  {math ? math.stddev.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground/60">
                  {math ? math.upperBound.toFixed(2) : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  {result.uniqueCards > 0 ? (
                    <span className="font-mono font-bold text-foreground">
                      {result.copiesRequired}×
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
              </tr>
            );
          })}

          {/* Mystical Archive separator */}
          <tr className="bg-violet-100 dark:bg-violet-950/40 border-t-2 border-violet-300 dark:border-violet-800/40">
            <td colSpan={7} className="px-5 py-2">
              <span className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">
                Mystical Archive
              </span>
            </td>
          </tr>

          {archiveResults.map((result) => {
            const math = calcMath(result.uniqueCards, result.slotsAvailable);
            const meta = ARCHIVE_TIER_META[result.rarity];
            return (
              <tr
                key={result.rarity}
                className="bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/30 transition-colors"
              >
                <td className="px-5 py-3">
                  <span className="font-medium text-violet-700 dark:text-violet-300">
                    {meta.label}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground/50">
                    {meta.rate}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {result.uniqueCards}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {result.slotsAvailable}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground/60">
                  {math ? math.mean.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground/60">
                  {math ? math.stddev.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground/60">
                  {math ? math.upperBound.toFixed(2) : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  {result.uniqueCards > 0 ? (
                    <span className="font-mono font-bold text-violet-700 dark:text-violet-300">
                      {result.copiesRequired}×
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
