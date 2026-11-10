import KeyvFile, { makeField } from 'keyv-file';

class DynamicConfigKeyv extends KeyvFile {
  constructor() {
    super({
      filename: './config.json',
      writeDelay: 100,
      encode: JSON.stringify,
      decode: JSON.parse,
      expiredCheckDelay: Infinity,
    });
  }

  currentSeason = makeField<number, number>(this, 'currentSeason', 0);
  scheduleId = makeField<string, string>(
    this,
    'scheduleId',
    '1377711013553635349',
  );
}

export const DynamicConfig = new DynamicConfigKeyv();
