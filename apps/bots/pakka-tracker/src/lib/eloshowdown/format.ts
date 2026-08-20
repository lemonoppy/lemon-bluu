export const formatSigned = (value: number): string =>
  value >= 0 ? `+${value}` : `${value}`;

export const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
