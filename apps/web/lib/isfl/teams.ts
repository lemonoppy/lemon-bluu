// Primary colors keyed by team abbreviation — ISFL teams + legacy franchises.
// Source: update-portal-main/lib/teams.ts
const TEAM_COLORS: Record<string, string> = {
  // Current ISFL teams
  AUS: '#008080',
  AZ: '#C21111',
  BAL: '#E9AB00',
  BFB: '#51075F',
  COL: '#BF0A30',
  CTC: '#6807DE',
  HON: '#0B52DB',
  NOLA: '#412879',
  NYS: '#2F4F4F',
  OCO: '#E75900',
  OSK: '#1C3994',
  SAR: '#38A6FA',
  SJS: '#8F825F',
  YKW: '#040404',
  // Legacy franchises
  BER: '#ed1c24',
  CHI: '#ab060c',
  LVL: '#000000',
  PHI: '#285581',
};

const FALLBACK_COLOR = '#6b7280';

export function getTeamColor(abbr: string): string {
  return TEAM_COLORS[abbr] ?? FALLBACK_COLOR;
}
