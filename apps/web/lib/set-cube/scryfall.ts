import type { ScryfallCard, ScryfallSet } from './types';

const BASE = '/api/scryfall';

export async function autocomplete(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  const res = await fetch(`${BASE}/search/autocomplete?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchCardByName(name: string): Promise<ScryfallCard> {
  const res = await fetch(`${BASE}/search/named?exact=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Card not found: ${name}`);
  return res.json();
}

export async function fetchSetCards(setCode: string): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];
  let hasMore = true;
  let page = 1;

  while (hasMore) {
    const res = await fetch(`${BASE}/sets/${setCode}/cards?page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    cards.push(...(data.data ?? []));
    hasMore = data.has_more ?? false;
    page++;
  }

  return cards;
}

export async function fetchSets(): Promise<ScryfallSet[]> {
  const res = await fetch(`${BASE}/sets`);
  if (!res.ok) throw new Error('Failed to fetch sets');
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchSet(setCode: string): Promise<ScryfallSet> {
  const res = await fetch(`${BASE}/sets/${setCode}`);
  if (!res.ok) throw new Error(`Set not found: ${setCode}`);
  return res.json();
}

export function getCardImageUri(card: ScryfallCard): string | null {
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal;
  return null;
}

/** Returns image URIs for all faces (1 for normal cards, 2 for double-faced). */
export function getCardFaceImageUris(card: ScryfallCard): string[] {
  if (card.image_uris?.normal) return [card.image_uris.normal];
  const faces = card.card_faces ?? [];
  return faces.map((f) => f.image_uris?.normal).filter((u): u is string => !!u);
}

export function getCardSmallImageUri(card: ScryfallCard): string | null {
  if (card.image_uris?.small) return card.image_uris.small;
  if (card.card_faces?.[0]?.image_uris?.small) return card.card_faces[0].image_uris.small;
  return null;
}

export function getCardManaCost(card: ScryfallCard): string {
  if (card.mana_cost) return card.mana_cost;
  if (card.card_faces?.[0]?.mana_cost) return card.card_faces[0].mana_cost ?? '';
  return '';
}

export function getCardColors(card: ScryfallCard): string[] {
  if (card.colors && card.colors.length > 0) return card.colors;
  if (card.card_faces) {
    const colors = new Set<string>();
    for (const face of card.card_faces) {
      (face.colors ?? []).forEach((c) => colors.add(c));
    }
    return [...colors];
  }
  return card.color_identity ?? [];
}
