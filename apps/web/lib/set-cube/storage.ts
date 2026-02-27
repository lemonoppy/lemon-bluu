import { CUBE_STORAGE_KEY } from './constants';

import type { CubeCard, CubeList, Rarity, ScryfallCard, SimulatorResult } from './types';

export function makeEmptyCube(): CubeList {
  return {
    version: 1,
    name: 'My Set Cube',
    lastModified: new Date().toISOString(),
    cards: [],
  };
}

const INITIAL_CUBE: CubeList = makeEmptyCube();

/** Migrate old format (separate mysticalArchive array) to new inArchive boolean. */
function migrate(parsed: CubeList & { mysticalArchive?: CubeCard[] }): CubeList {
  const base: CubeList = {
    version: parsed.version,
    name: parsed.name,
    lastModified: parsed.lastModified,
    cards: parsed.cards,
  };

  if (!parsed.mysticalArchive || parsed.mysticalArchive.length === 0) {
    return base;
  }

  const archiveIds = new Set(parsed.mysticalArchive.map((c) => c.id));
  // Merge archive cards into main cards list
  const mergedCards = parsed.cards.map((c) =>
    archiveIds.has(c.id) ? { ...c, inArchive: true } : c
  );
  // Add archive cards that aren't already in the main list
  for (const archiveCard of parsed.mysticalArchive) {
    if (!mergedCards.some((c) => c.id === archiveCard.id)) {
      mergedCards.push({ ...archiveCard, inArchive: true });
    }
  }
  return { ...base, cards: mergedCards };
}

export function loadCube(): CubeList {
  if (typeof window === 'undefined') return { ...INITIAL_CUBE };
  try {
    const raw = localStorage.getItem(CUBE_STORAGE_KEY);
    if (!raw) return { ...INITIAL_CUBE };
    const parsed = JSON.parse(raw) as CubeList & { mysticalArchive?: CubeCard[] };
    return migrate(parsed);
  } catch {
    return { ...INITIAL_CUBE };
  }
}

export function saveCube(cube: CubeList): void {
  if (typeof window === 'undefined') return;
  const updated = { ...cube, lastModified: new Date().toISOString() };
  localStorage.setItem(CUBE_STORAGE_KEY, JSON.stringify(updated));
}

export function addCard(cube: CubeList, scryfallData: ScryfallCard): CubeList {
  const existing = cube.cards.find((c) => c.id === scryfallData.id);
  if (existing) {
    return updateCopies(cube, scryfallData.id, existing.copies + 1);
  }
  const newCard: CubeCard = {
    id: scryfallData.id,
    name: scryfallData.name,
    scryfallData,
    copies: 1,
    addedAt: new Date().toISOString(),
  };
  return { ...cube, cards: [...cube.cards, newCard] };
}

export function removeCard(cube: CubeList, cardId: string): CubeList {
  return { ...cube, cards: cube.cards.filter((c) => c.id !== cardId) };
}

export function updateCopies(cube: CubeList, cardId: string, copies: number): CubeList {
  return {
    ...cube,
    cards: cube.cards.map((c) => (c.id === cardId ? { ...c, copies: Math.max(1, copies) } : c)),
  };
}

export function addArchiveCard(cube: CubeList, scryfallData: ScryfallCard): CubeList {
  const existing = cube.cards.find((c) => c.id === scryfallData.id);
  if (existing) {
    if (existing.inArchive) return cube;
    return {
      ...cube,
      cards: cube.cards.map((c) => (c.id === scryfallData.id ? { ...c, inArchive: true } : c)),
    };
  }
  const newCard: CubeCard = {
    id: scryfallData.id,
    name: scryfallData.name,
    scryfallData,
    copies: 1,
    addedAt: new Date().toISOString(),
    inArchive: true,
  };
  return { ...cube, cards: [...cube.cards, newCard] };
}

export function removeArchiveCard(cube: CubeList, cardId: string): CubeList {
  return {
    ...cube,
    cards: cube.cards.map((c) => (c.id === cardId ? { ...c, inArchive: false } : c)),
  };
}

export function exportCubeCobra(cube: CubeList): void {
  const lines = cube.cards
    .filter((c) => !c.inArchive)
    .map((c) => `1 ${c.name} (${c.scryfallData.set.toUpperCase()}) ${c.scryfallData.collector_number}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cube.name.replace(/\s+/g, '-').toLowerCase()}-cubecobra.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── CubeCobra CSV helpers ────────────────────────────────────────────────────

const CSV_HEADERS =
  'name,CMC,Type,Color,Set,Collector Number,Rarity,Color Category,status,Finish,maybeboard,image URL,image Back URL,tags,Notes,MTGO ID';

function csvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function colorCategory(card: CubeCard): string {
  const s = card.scryfallData;
  if (s.type_line?.includes('Land')) return 'L';
  const colors = s.colors ?? s.color_identity ?? [];
  if (colors.length === 0) return 'C';
  if (colors.length > 1) return 'M';
  return colors[0];
}

function cardImageUrl(s: ScryfallCard): string {
  return s.image_uris?.normal ?? s.card_faces?.[0]?.image_uris?.normal ?? '';
}

function cardImageBackUrl(s: ScryfallCard): string {
  return s.card_faces?.[1]?.image_uris?.normal ?? '';
}

function cardToCsvRow(card: CubeCard, tags: string): string {
  const s = card.scryfallData;
  return [
    csvField(card.name),
    String(s.cmc ?? ''),
    csvField(s.type_line ?? ''),
    (s.colors ?? s.color_identity ?? []).join(''),
    s.set.toUpperCase(),
    s.collector_number,
    s.rarity,
    colorCategory(card),
    '',           // status
    'Non-foil',   // Finish
    'false',      // maybeboard
    csvField(cardImageUrl(s)),
    csvField(cardImageBackUrl(s)),
    csvField(tags),
    '',           // Notes
    '',           // MTGO ID
  ].join(',');
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function archiveTierKey(rarity: Rarity): string {
  if (rarity === 'rare') return 'archive-rare';
  if (rarity === 'mythic') return 'archive-mythic';
  return 'archive-common';
}

export function exportCubeCobraCSVSingleton(cube: CubeList): void {
  const rows = cube.cards.map((c) =>
    cardToCsvRow(c, c.inArchive ? 'Mystical Archive' : ''),
  );
  const content = [CSV_HEADERS, ...rows].join('\n');
  downloadCsv(content, `${cube.name.replace(/\s+/g, '-').toLowerCase()}-cubecobra-singleton.csv`);
}

export function exportCubeCobraCSVWithCopies(
  cube: CubeList,
  results: SimulatorResult[],
): void {
  const copiesMap = new Map(results.map((r) => [String(r.rarity), r.copiesRequired]));
  const rows: string[] = [];

  for (const card of cube.cards) {
    const rarity = card.scryfallData.rarity as Rarity;
    const tierKey = card.inArchive ? archiveTierKey(rarity) : rarity;
    const copies = copiesMap.get(tierKey) ?? 1;
    const tags = card.inArchive ? 'Mystical Archive' : '';
    for (let i = 0; i < copies; i++) {
      rows.push(cardToCsvRow(card, tags));
    }
  }

  const content = [CSV_HEADERS, ...rows].join('\n');
  downloadCsv(
    content,
    `${cube.name.replace(/\s+/g, '-').toLowerCase()}-cubecobra-with-copies.csv`,
  );
}

export function exportCubeJson(cube: CubeList): void {
  const json = JSON.stringify(cube, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cube.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importCubeJson(file: File): Promise<CubeList> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as CubeList & { mysticalArchive?: CubeCard[] };
        resolve(migrate(parsed));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
