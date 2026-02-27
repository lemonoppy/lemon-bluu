export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  colors?: string[];
  color_indicator?: string[];
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  set: string;
  set_name: string;
  collector_number: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: ScryfallCardFace[];
  layout: string;
  legalities: Record<string, string>;
  released_at: string;
  scryfall_uri: string;
  uri: string;
  lang: string;
}

export interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  card_count: number;
  icon_svg_uri: string;
  scryfall_uri: string;
  search_uri: string;
  digital: boolean;
  nonfoil_only: boolean;
  foil_only: boolean;
}

export interface CubeCard {
  id: string; // Scryfall UUID
  name: string;
  scryfallData: ScryfallCard;
  copies: number; // physical copies the user has/wants
  addedAt: string;
  inArchive?: boolean; // true if this card fills the Mystical Archive pack slot
}

export interface CubeList {
  version: number;
  name: string;
  lastModified: string;
  cards: CubeCard[];
}

export interface DraftConfig {
  playerCount: number;
  packsPerPlayer: number;
  cardsPerPack: number;
  rareSlotsPerPack: number;
  uncommonSlotsPerPack: number;
  commonSlotsPerPack: number;
  mythicReplaceRate: number;
  mysticalArchiveSlotsPerPack: number;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';
export type Color = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export interface Distribution {
  manaCurve: Record<number, number>;
  colorPie: Record<string, number>;
  typeBreakdown: Record<string, number>;
  rarityDistribution: Record<Rarity, number>;
}

export type ArchiveTier = 'archive-common' | 'archive-rare' | 'archive-mythic';

export interface SimulatorResult {
  rarity: Rarity | ArchiveTier;
  uniqueCards: number;
  slotsAvailable: number;
  copiesRequired: number;
}
