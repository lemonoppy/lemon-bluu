import type { CubeCard, CubeList, ScryfallCard, ScryfallCardFace } from './types';

const SYNC_META_KEY = 'cube-planner:sync-meta';

export interface SyncMeta {
  shareId: string;
  writeToken: string;
  lastSyncedModified?: string;
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function loadSyncMeta(): SyncMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return null;
  }
}

export function getOrCreateSyncMeta(): SyncMeta {
  const existing = loadSyncMeta();
  if (existing) return existing;
  const meta: SyncMeta = {
    shareId: randomHex(6),    // 12-char hex
    writeToken: randomHex(16), // 32-char hex
  };
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  return meta;
}

function stripFace(face: ScryfallCardFace): ScryfallCardFace {
  return {
    name: face.name,
    mana_cost: face.mana_cost,
    type_line: face.type_line,
    oracle_text: face.oracle_text,
    colors: face.colors,
    color_indicator: face.color_indicator,
    image_uris: face.image_uris
      ? { small: face.image_uris.small, normal: face.image_uris.normal, large: face.image_uris.large, png: face.image_uris.png, art_crop: face.image_uris.art_crop, border_crop: face.image_uris.border_crop }
      : undefined,
  };
}

function stripCard(card: CubeCard): CubeCard {
  const d = card.scryfallData as ScryfallCard & Record<string, unknown>;
  const stripped: ScryfallCard = {
    id: d.id,
    name: d.name,
    mana_cost: d.mana_cost,
    cmc: d.cmc,
    type_line: d.type_line,
    oracle_text: d.oracle_text,
    colors: d.colors,
    color_identity: d.color_identity,
    rarity: d.rarity,
    set: d.set,
    set_name: d.set_name,
    collector_number: d.collector_number,
    layout: d.layout,
    scryfall_uri: d.scryfall_uri,
    uri: d.uri,
    lang: d.lang,
    released_at: d.released_at,
    legalities: {},
    image_uris: d.image_uris
      ? { small: d.image_uris.small, normal: d.image_uris.normal, large: d.image_uris.large, png: d.image_uris.png, art_crop: d.image_uris.art_crop, border_crop: d.image_uris.border_crop }
      : undefined,
    card_faces: d.card_faces?.map(stripFace),
  };
  return { ...card, scryfallData: stripped };
}

function stripForSync(cube: CubeList): CubeList {
  return { ...cube, cards: cube.cards.map(stripCard) };
}

export async function syncCube(cube: CubeList): Promise<string> {
  const meta = getOrCreateSyncMeta();
  const res = await fetch(`/api/cube/${meta.shareId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-write-token': meta.writeToken,
    },
    body: JSON.stringify(stripForSync(cube)),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Sync failed');
  }
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...meta, lastSyncedModified: cube.lastModified }));
  return meta.shareId;
}
