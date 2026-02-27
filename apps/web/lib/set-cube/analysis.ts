import { CARD_TYPES } from './constants';
import { getCardColors } from './scryfall';

import type { CubeCard, Distribution, ScryfallCard } from './types';

function getCardType(typeLine: string): string {
  for (const t of CARD_TYPES) {
    if (typeLine.includes(t)) return t;
  }
  return 'Other';
}

function normalizeCmc(cmc: number): number {
  return cmc >= 6 ? 6 : Math.floor(cmc);
}

export function computeDistribution(cards: ScryfallCard[]): Distribution {
  const manaCurve: Record<number, number> = {};
  const colorPie: Record<string, number> = {};
  const typeBreakdown: Record<string, number> = {};
  const rarityDistribution = { common: 0, uncommon: 0, rare: 0, mythic: 0 };

  for (let i = 0; i <= 6; i++) manaCurve[i] = 0;
  for (const t of CARD_TYPES) typeBreakdown[t] = 0;
  for (const c of ['W', 'U', 'B', 'R', 'G', 'C']) colorPie[c] = 0;

  for (const card of cards) {
    if (card.type_line.includes('Basic Land')) continue;

    const cmc = normalizeCmc(card.cmc);
    manaCurve[cmc] = (manaCurve[cmc] ?? 0) + 1;

    const colors = getCardColors(card);
    if (colors.length === 0) {
      colorPie['C'] = (colorPie['C'] ?? 0) + 1;
    } else {
      for (const c of colors) {
        colorPie[c] = (colorPie[c] ?? 0) + 1;
      }
    }

    const type = getCardType(card.type_line);
    typeBreakdown[type] = (typeBreakdown[type] ?? 0) + 1;

    const rarity = card.rarity;
    if (rarity in rarityDistribution) {
      rarityDistribution[rarity as keyof typeof rarityDistribution] += 1;
    }
  }

  return { manaCurve, colorPie, typeBreakdown, rarityDistribution };
}

export function computeCubeDistribution(cubeCards: CubeCard[]): Distribution {
  return computeDistribution(cubeCards.map((c) => c.scryfallData));
}

export function toPercentages(
  counts: Record<string | number, number>
): Record<string | number, number> {
  const total = Object.values(counts).reduce((sum, v) => sum + v, 0);
  if (total === 0) return counts;
  const result: Record<string | number, number> = {};
  for (const [k, v] of Object.entries(counts)) {
    result[k] = Math.round((v / total) * 1000) / 10;
  }
  return result;
}

export type ChartDataPoint = {
  label: string;
  cube: number;
  reference: number;
  cubeCount: number;
  referenceCount: number;
};

export function buildManaCurveData(
  cubeDist: Distribution,
  refDist: Distribution
): ChartDataPoint[] {
  const cubePct = toPercentages(cubeDist.manaCurve);
  const refPct = toPercentages(refDist.manaCurve);
  return Array.from({ length: 7 }, (_, i) => ({
    label: i === 6 ? '6+' : String(i),
    cube: cubePct[i] ?? 0,
    reference: refPct[i] ?? 0,
    cubeCount: cubeDist.manaCurve[i] ?? 0,
    referenceCount: refDist.manaCurve[i] ?? 0,
  }));
}

export function buildColorPieData(
  cubeDist: Distribution,
  refDist: Distribution
): ChartDataPoint[] {
  const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
  const cubePct = toPercentages(cubeDist.colorPie);
  const refPct = toPercentages(refDist.colorPie);
  return colors.map((c) => ({
    label: c,
    cube: cubePct[c] ?? 0,
    reference: refPct[c] ?? 0,
    cubeCount: cubeDist.colorPie[c] ?? 0,
    referenceCount: refDist.colorPie[c] ?? 0,
  }));
}

export function buildTypeBreakdownData(
  cubeDist: Distribution,
  refDist: Distribution
): ChartDataPoint[] {
  const cubePct = toPercentages(cubeDist.typeBreakdown);
  const refPct = toPercentages(refDist.typeBreakdown);
  return CARD_TYPES.map((t) => ({
    label: t,
    cube: cubePct[t] ?? 0,
    reference: refPct[t] ?? 0,
    cubeCount: cubeDist.typeBreakdown[t] ?? 0,
    referenceCount: refDist.typeBreakdown[t] ?? 0,
  }));
}

export function buildRarityData(
  cubeDist: Distribution,
  refDist: Distribution
): ChartDataPoint[] {
  const rarities = ['common', 'uncommon', 'rare', 'mythic'];
  const cubePct = toPercentages(cubeDist.rarityDistribution);
  const refPct = toPercentages(refDist.rarityDistribution);
  return rarities.map((r) => ({
    label: r.charAt(0).toUpperCase() + r.slice(1),
    cube: cubePct[r] ?? 0,
    reference: refPct[r] ?? 0,
    cubeCount:
      cubeDist.rarityDistribution[r as keyof typeof cubeDist.rarityDistribution] ?? 0,
    referenceCount:
      refDist.rarityDistribution[r as keyof typeof refDist.rarityDistribution] ?? 0,
  }));
}
