import type { CubeCard } from '@/lib/set-cube/types';

interface Props {
  cards: CubeCard[];
}

export default function CubeStatsBar({ cards }: Props) {
  const nonArchiveCards = cards.filter((c) => !c.inArchive);
  const archiveCards = cards.filter((c) => c.inArchive);
  const totalUnique = nonArchiveCards.length;
  const archiveUnique = archiveCards.length;
  const byRarity = {
    common: nonArchiveCards.filter((c) => c.scryfallData.rarity === 'common').length,
    uncommon: nonArchiveCards.filter((c) => c.scryfallData.rarity === 'uncommon').length,
    rare: nonArchiveCards.filter((c) => c.scryfallData.rarity === 'rare').length,
    mythic: nonArchiveCards.filter((c) => c.scryfallData.rarity === 'mythic').length,
  };
  const archiveByRarity = {
    common: archiveCards.filter((c) => c.scryfallData.rarity === 'common').length,
    uncommon: archiveCards.filter((c) => c.scryfallData.rarity === 'uncommon').length,
    rare: archiveCards.filter((c) => c.scryfallData.rarity === 'rare').length,
    mythic: archiveCards.filter((c) => c.scryfallData.rarity === 'mythic').length,
  };

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-card border border-border rounded-lg shadow-sm text-sm w-full">
      <StatItem label="Unique" value={totalUnique} />
      <span className="flex items-center gap-4">
        <StatItem label="C" value={byRarity.common} color="text-muted-foreground" />
        <StatItem label="U" value={byRarity.uncommon} color="text-sky-500" />
        <StatItem label="R" value={byRarity.rare} color="text-amber-500" />
        <StatItem label="M" value={byRarity.mythic} color="text-orange-500" />
      </span>
      <Divider />
      <StatItem label="Archive" value={archiveUnique} color="text-violet-500" />
      <span className="flex items-center gap-4">
        <StatItem label="C" value={archiveByRarity.common} color="text-muted-foreground" />
        <StatItem label="U" value={archiveByRarity.uncommon} color="text-sky-500" />
        <StatItem label="R" value={archiveByRarity.rare} color="text-amber-500" />
        <StatItem label="M" value={archiveByRarity.mythic} color="text-orange-500" />
      </span>
    </div>
  );
}

function StatItem({
  label,
  value,
  color = 'text-foreground',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </span>
  );
}

function Divider() {
  return <span className="text-border">|</span>;
}
