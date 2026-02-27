import { useEffect, useState } from 'react';

import { REFERENCE_SET_TYPES } from '@/lib/set-cube/constants';
import { fetchSets } from '@/lib/set-cube/scryfall';
import type { ScryfallSet } from '@/lib/set-cube/types';

interface Props {
  value: string;
  onChange: (code: string) => void;
}

export default function SetSelector({ value, onChange }: Props) {
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSets().then((all) => {
      const filtered = all
        .filter((s) => REFERENCE_SET_TYPES.includes(s.set_type) && !s.digital && s.released_at)
        .sort(
          (a, b) =>
            new Date(b.released_at!).getTime() - new Date(a.released_at!).getTime()
        )
        .slice(0, 40);
      setSets(filtered);
      setLoading(false);
    });
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      className="bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none shadow-sm disabled:text-muted-foreground"
    >
      <option value="">— Select reference set —</option>
      {sets.map((s) => (
        <option key={s.code} value={s.code}>
          {s.name} ({s.code.toUpperCase()}, {s.released_at?.slice(0, 4)})
        </option>
      ))}
    </select>
  );
}
