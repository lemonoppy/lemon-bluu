// Generic function to sum stats by one or more keys
export function sumStatsByKeys<T extends Record<string, any>>(
  data: T[],
  keys: (keyof T)[],
  exclude: (keyof T)[] = []
): Record<string, T> {
  const grouped: Record<string, T> = {};
  for (const item of data) {
    const groupKey = keys.map(k => item[k]).join('-');
    if (!grouped[groupKey]) {
      grouped[groupKey] = { ...item };
    } else {
      for (const k of Object.keys(item) as (keyof T)[]) {
        if (
          typeof item[k] === 'number' &&
          !keys.includes(k) &&
          !exclude.includes(k)
        ) {
          (grouped[groupKey] as any)[k] = (grouped[groupKey][k] as number) + (item[k] as number);
        }
      }
    }
  }

  // Yards Per Carry Calculation
  for (const groupKey in grouped) {
    const record = grouped[groupKey];
    if (
      'ypc' in record &&
      typeof record['yards'] === 'number' &&
      typeof record['attempts'] === 'number' &&
      record['attempts'] > 0
    ) {
      (record as any)['ypc'] = (record['yards'] / record['attempts']).toFixed(2);
      (record as any)['points'] = record['td'] * 6;
    }
  }

  // Yards Per Reception Calculation
  for (const groupKey in grouped) {
    const record = grouped[groupKey];
    if (
      'ypr' in record &&
      typeof record['yards'] === 'number' &&
      typeof record['receptions'] === 'number' &&
      record['receptions'] > 0
    ) {
      (record as any)['ypr'] = (record['yards'] / record['receptions']).toFixed(2);
      (record as any)['points'] = record['td'] * 6;
    }
  }

  // Punting Average Calculation
  for (const groupKey in grouped) {
    const record = grouped[groupKey];
    if (
      'punts' in record &&
      typeof record['yds'] === 'number' &&
      typeof record['punts'] === 'number' &&
      record['punts'] > 0
    ) {
      (record as any)['avg'] = (record['yds'] / record['punts']).toFixed(2);
    }
  }

  // Completion Percentage and Yards Per Attempt Calculations
  for (const groupKey in grouped) {
    const record = grouped[groupKey];
    if (
      'rating' in record &&
      typeof record['yards'] === 'number' &&
      typeof record['attempts'] === 'number' &&
      record['attempts'] > 0
    ) {
      (record as any)['ypa'] = (record['yards'] / record['attempts']).toFixed(2);
      (record as any)['completionpct'] = (record['completions'] / record['attempts']).toFixed(2);
      (record as any)['points'] = record['td'] * 6;
    }
  }

  // FG Calculations
  for (const groupKey in grouped) {
    const record = grouped[groupKey];
    if ('xpmade' in record) {
      const fgMade =
        (record['fgunder20made'] ?? 0) +
        (record['fg20_29made'] ?? 0) +
        (record['fg30_39made'] ?? 0) +
        (record['fg40_49made'] ?? 0) +
        (record['fg50plusmade'] ?? 0);

      const fgAtt =
        (record['fgunder20att'] ?? 0) +
        (record['fg20_29att'] ?? 0) +
        (record['fg30_39att'] ?? 0) +
        (record['fg40_49att'] ?? 0) +
        (record['fg50plusatt'] ?? 0);

      const fgPct = fgAtt > 0 ? fgMade / fgAtt : 0;

      (record as any)['points'] = (record['xpmade'] ?? 0) + fgMade * 3;
      (record as any)['fgPct'] = fgPct.toFixed(3);
    }
  }

  // Passer Rating Calculations
  for (const groupKey in grouped) {
    const record = grouped[groupKey];
    // NFL Passer Rating Calculation
    // https://operations.nfl.com/gameday/nfl-basics/how-is-the-nfl-passer-rating-calculated/
    // a = ((completions / attempts) - 0.3) * 5
    // b = ((yards / attempts) - 3) * 0.25
    // c = (td / attempts) * 20
    // d = 2.375 - ((int / attempts) * 25)
    // Each component is capped between 0 and 2.375
    // Passer rating = ((a + b + c + d) / 6) * 100
    const completions = record['completions'] ?? 0;
    const attempts = record['attempts'] ?? 0;
    const yards = record['yards'] ?? 0;
    const td = record['td'] ?? 0;
    const interceptions = record['int'] ?? 0;
    if (attempts > 0) {
      let a = ((completions / attempts) - 0.3) * 5;
      let b = ((yards / attempts) - 3) * 0.25;
      let c = (td / attempts) * 20;
      let d = 2.375 - ((interceptions / attempts) * 25);
      a = Math.max(0, Math.min(a, 2.375));
      b = Math.max(0, Math.min(b, 2.375));
      c = Math.max(0, Math.min(c, 2.375));
      d = Math.max(0, Math.min(d, 2.375));
      const passerRating = ((a + b + c + d) / 6) * 100;
      (record as any)['rating'] = passerRating.toFixed(2);
    } else {
      (record as any)['rating'] = '0.00';
    }
  }

  // Scrimmage Yards Calculation
  for (const groupKey in grouped) {
    const record = grouped[groupKey];
    // Only sum explicit rushYards and recYards, do not infer from 'yards'
    const rushYards = Number(record['rushYards']) || 0;
    const recYards = Number(record['recYards']) || 0;
    (record as any)['scrimmageYards'] = rushYards + recYards;
  }

  return grouped;
}
