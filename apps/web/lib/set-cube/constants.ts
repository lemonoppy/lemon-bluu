import type { DraftConfig, Rarity } from './types';

export const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

export const COLOR_HEX: Record<string, string> = {
  W: '#f9fafb',
  U: '#3b82f6',
  B: '#1f2937',
  R: '#ef4444',
  G: '#22c55e',
  C: '#9ca3af',
};

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'mythic'];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#6b7280',
  uncommon: '#6366f1',
  rare: '#f59e0b',
  mythic: '#f97316',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  mythic: 'Mythic',
};

export const CARD_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Land',
  'Battle',
  'Other',
];

export const CMC_LABELS: Record<number, string> = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6+',
};

export const DEFAULT_DRAFT_CONFIG: DraftConfig = {
  playerCount: 8,
  packsPerPlayer: 3,
  cardsPerPack: 15,
  rareSlotsPerPack: 1,
  uncommonSlotsPerPack: 5,
  commonSlotsPerPack: 8,
  mythicReplaceRate: 0.125,
  mysticalArchiveSlotsPerPack: 1,
};

export const REFERENCE_SET_TYPES = [
  'expansion',
  'core',
  'masters',
  'draft_innovation',
];

export const CUBE_STORAGE_KEY = 'cube-planner:cube';
export const DRAFT_CONFIG_KEY = 'cube-planner:draft-config';
