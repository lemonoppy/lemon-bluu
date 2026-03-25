import { useTheme } from 'next-themes';

export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return {
    grid: isDark ? 'oklch(0.28 0.08 264)' : 'oklch(0.88 0.012 240)',
    tick: isDark ? 'oklch(0.67 0.04 240)' : '#64748b',
    tooltipBg: isDark ? 'oklch(0.22 0.09 264)' : '#ffffff',
    tooltipBorder: isDark ? 'oklch(0.28 0.08 264)' : '#e2e8f0',
    tooltipText: isDark ? 'oklch(0.99 0 0)' : '#0f172a',
    bar: isDark ? 'oklch(0.62 0.14 222)' : '#1e3a8a',
    lineAvg: isDark ? 'oklch(0.696 0.17 162.48)' : '#15803d',
    lineMedian: isDark ? 'oklch(0.62 0.14 222)' : '#1e3a8a',
    lineTop10: isDark ? 'oklch(0.769 0.188 70.08)' : '#b45309',
    lineTop20: isDark ? 'oklch(0.75 0.15 50)' : '#c2410c',
  };
}

export function tooltipStyle(c: ReturnType<typeof useChartColors>) {
  return {
    backgroundColor: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: '8px',
    fontSize: 12,
    color: c.tooltipText,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };
}
