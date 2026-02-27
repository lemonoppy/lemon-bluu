import { RARITY_ORDER } from './constants';

import type { ArchiveTier, CubeCard, DraftConfig, Rarity, SimulatorResult } from './types';

// Upper bound on copies needed for one card in a random pack opening.
// Models each pack slot as independently drawing one of `uniqueCards` cards
// (Binomial(slots, 1/uniqueCards)). Returns mean + 2 standard deviations,
// rounded up, so you're covered at roughly the 95th percentile.
function upperBoundCopies(slots: number, uniqueCards: number): number {
  const p = 1 / uniqueCards;
  const mean = slots * p;
  const stddev = Math.sqrt(slots * p * (1 - p));
  return Math.max(1, Math.ceil(mean + 2 * stddev));
}

export function calculateDraftNeeds(
  cubeCards: CubeCard[],
  config: DraftConfig,
  archiveCards: CubeCard[] = []
): SimulatorResult[] {
  const {
    playerCount,
    packsPerPlayer,
    rareSlotsPerPack,
    uncommonSlotsPerPack,
    commonSlotsPerPack,
    mythicReplaceRate,
    mysticalArchiveSlotsPerPack,
  } = config;

  const totalPacks = playerCount * packsPerPlayer;
  const totalRareSlots = totalPacks * rareSlotsPerPack;
  const mythicSlots = Math.round(totalRareSlots * mythicReplaceRate);
  const rareSlots = totalRareSlots - mythicSlots;
  const totalUncommonSlots = totalPacks * uncommonSlotsPerPack;
  const totalCommonSlots = totalPacks * commonSlotsPerPack;
  const totalArchiveSlots = totalPacks * (mysticalArchiveSlotsPerPack ?? 0);

  const slotsByRarity: Record<Rarity, number> = {
    mythic: mythicSlots,
    rare: rareSlots,
    uncommon: totalUncommonSlots,
    common: totalCommonSlots,
  };

  const rarityResults = RARITY_ORDER.map((rarity): SimulatorResult => {
    const uniqueCards = cubeCards.filter((c) => c.scryfallData.rarity === rarity).length;
    const slotsAvailable = slotsByRarity[rarity];
    const copiesRequired = uniqueCards > 0 ? upperBoundCopies(slotsAvailable, uniqueCards) : 0;
    return { rarity, uniqueCards, slotsAvailable, copiesRequired };
  });

  // Mystical Archive slots are distributed by rarity tier:
  // C/U = 2/3, Rare = 26.4%, Mythic = 6.6%
  const ARCHIVE_TIER_RATES: Record<ArchiveTier, number> = {
    'archive-common': 2 / 3,
    'archive-rare': 0.264,
    'archive-mythic': 0.066,
  };

  function archiveTierFor(rarity: Rarity): ArchiveTier {
    if (rarity === 'rare') return 'archive-rare';
    if (rarity === 'mythic') return 'archive-mythic';
    return 'archive-common';
  }

  const archiveTierResults: SimulatorResult[] = (
    ['archive-common', 'archive-rare', 'archive-mythic'] as ArchiveTier[]
  ).map((tier) => {
    const uniqueCards = archiveCards.filter(
      (c) => archiveTierFor(c.scryfallData.rarity as Rarity) === tier,
    ).length;
    const slotsAvailable = Math.round(totalArchiveSlots * ARCHIVE_TIER_RATES[tier]);
    const copiesRequired = uniqueCards > 0 ? upperBoundCopies(slotsAvailable, uniqueCards) : 0;
    return { rarity: tier, uniqueCards, slotsAvailable, copiesRequired };
  });

  return [...rarityResults, ...archiveTierResults];
}

export function getTotalPackCards(config: DraftConfig): number {
  return (
    config.rareSlotsPerPack +
    config.uncommonSlotsPerPack +
    config.commonSlotsPerPack +
    (config.mysticalArchiveSlotsPerPack ?? 0)
  );
}

export function getTotalDraftCards(config: DraftConfig): number {
  return config.playerCount * config.packsPerPlayer * getTotalPackCards(config);
}
