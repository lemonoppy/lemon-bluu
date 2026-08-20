import { isRiftboundEvent } from '../client';

describe('isRiftboundEvent', () => {
  it('accepts Riftbound events', () => {
    expect(isRiftboundEvent('RIFTBOUND')).toBe(true);
  });

  it('rejects other games on the platform', () => {
    expect(isRiftboundEvent('LORCANA')).toBe(false);
    expect(isRiftboundEvent('MTG')).toBe(false);
    expect(isRiftboundEvent('OTHER')).toBe(false);
  });

  it('rejects missing game types', () => {
    expect(isRiftboundEvent(null)).toBe(false);
  });
});
