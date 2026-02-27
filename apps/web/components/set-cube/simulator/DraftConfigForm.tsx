import { getTotalDraftCards } from '@/lib/set-cube/simulator';
import type { DraftConfig } from '@/lib/set-cube/types';

interface Props {
  config: DraftConfig;
  onChange: (config: DraftConfig) => void;
}

export default function DraftConfigForm({ config, onChange }: Props) {
  function set<K extends keyof DraftConfig>(key: K, value: DraftConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  const fields: {
    key: keyof DraftConfig;
    label: string;
    min: number;
    max: number;
    step?: number;
  }[] = [
    { key: 'playerCount', label: 'Players', min: 2, max: 16 },
    { key: 'packsPerPlayer', label: 'Packs / Player', min: 1, max: 6 },
    { key: 'rareSlotsPerPack', label: 'Rare Slots / Pack', min: 0, max: 4 },
    { key: 'uncommonSlotsPerPack', label: 'Uncommon Slots / Pack', min: 0, max: 8 },
    { key: 'commonSlotsPerPack', label: 'Common Slots / Pack', min: 0, max: 16 },
    { key: 'mysticalArchiveSlotsPerPack', label: 'Mystical Archive / Pack', min: 0, max: 4 },
    { key: 'mythicReplaceRate', label: 'Mythic Replace Rate', min: 0, max: 1, step: 0.125 },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">Draft Configuration</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map(({ key, label, min, max, step }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <input
              type="number"
              value={config[key]}
              min={min}
              max={max}
              step={step ?? 1}
              onChange={(e) =>
                set(key, parseFloat(e.target.value) as DraftConfig[typeof key])
              }
              className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none w-full shadow-sm"
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Total draft cards:{' '}
        <span className="text-foreground font-semibold">{getTotalDraftCards(config)}</span>
      </p>
    </div>
  );
}
