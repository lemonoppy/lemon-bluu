import { useEffect, useRef, useState } from 'react';

import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useDebounce } from 'use-debounce';

import { autocomplete, fetchCardByName } from '@/lib/set-cube/scryfall';
import type { ScryfallCard } from '@/lib/set-cube/types';

interface Props {
  onAdd: (card: ScryfallCard) => void;
}

export default function CardSearch({ onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    autocomplete(debouncedQuery).then((results) => {
      setSuggestions(results.slice(0, 8));
      setOpen(results.length > 0);
      setLoading(false);
    });
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSelect(name: string) {
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    setFetching(true);
    try {
      const card = await fetchCardByName(name);
      onAdd(card);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 transition-all shadow-sm">
        <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          placeholder="Search for a card…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          disabled={fetching}
        />
        {(loading || fetching) && (
          <span className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
        )}
      </div>
      {open && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-popover-foreground hover:bg-muted transition-colors"
                onClick={() => handleSelect(name)}
              >
                <PlusIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
