import { COLOR_NAMES } from '@/lib/set-cube/constants';

const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };
const sortWUBRG = (colors: string[]) =>
  [...colors].sort((a, b) => (WUBRG_ORDER[a] ?? 9) - (WUBRG_ORDER[b] ?? 9));

const pipClasses: Record<string, string> = {
  W: 'bg-amber-50 border-amber-300 text-amber-900',
  U: 'bg-blue-600 border-blue-800 text-white',
  B: 'bg-slate-800 border-slate-600 text-white',
  R: 'bg-red-600 border-red-800 text-white',
  G: 'bg-emerald-600 border-emerald-800 text-white',
  C: 'bg-slate-300 border-slate-400 text-slate-800',
};

export default function ColorPips({ colors }: { colors: string[] }) {
  if (!colors || colors.length === 0) {
    return (
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 border border-slate-400 text-slate-800 text-[10px] font-bold shadow-sm"
        title="Colorless"
      >
        C
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      {sortWUBRG(colors).map((c) => (
        <span
          key={c}
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold shadow-sm ${
            pipClasses[c] ?? 'bg-slate-500 border-slate-600 text-white'
          }`}
          title={COLOR_NAMES[c] ?? c}
        >
          {c}
        </span>
      ))}
    </span>
  );
}
