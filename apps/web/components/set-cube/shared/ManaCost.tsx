const WUBRG_ORDER: Record<string, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };
const isPureColor = (sym: string) => /^\{[WUBRG]\}$/.test(sym);

function sortSymbolsWUBRG(symbols: string[]): string[] {
  const sorted = symbols
    .filter(isPureColor)
    .sort((a, b) => (WUBRG_ORDER[a[1]] ?? 9) - (WUBRG_ORDER[b[1]] ?? 9));
  let ci = 0;
  return symbols.map((s) => (isPureColor(s) ? sorted[ci++] : s));
}

export default function ManaCost({ cost }: { cost: string }) {
  if (!cost) return null;

  const symbols = sortSymbolsWUBRG(cost.match(/\{[^}]+\}/g) ?? []);

  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs">
      {symbols.map((sym, i) => {
        const inner = sym.slice(1, -1);
        return (
          <span
            key={i}
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold border shadow-sm ${getColorClass(inner)}`}
            title={sym}
          >
            {inner.length <= 2 ? inner : inner[0]}
          </span>
        );
      })}
    </span>
  );
}

function getColorClass(sym: string): string {
  if (sym === 'W') return 'bg-amber-50 border-amber-300 text-amber-900';
  if (sym === 'U') return 'bg-blue-600 border-blue-800 text-white';
  if (sym === 'B') return 'bg-slate-800 border-slate-600 text-white';
  if (sym === 'R') return 'bg-red-600 border-red-800 text-white';
  if (sym === 'G') return 'bg-emerald-600 border-emerald-800 text-white';
  if (sym === 'C') return 'bg-slate-300 border-slate-400 text-slate-800';
  if (/^\d+$/.test(sym)) return 'bg-slate-500 border-slate-600 text-white';
  if (sym === 'X') return 'bg-slate-500 border-slate-600 text-white';
  if (sym.includes('/')) return 'bg-slate-400 border-slate-500 text-white';
  return 'bg-slate-500 border-slate-600 text-white';
}
