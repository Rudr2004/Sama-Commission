import { describe, it, expect } from 'vitest';
import { calculateIdv, getDepreciationRate } from './calculateIdv.js';

describe('getDepreciationRate', () => {
  it('applies 5% for a vehicle up to 6 months old', () => {
    expect(getDepreciationRate(0.5)).toBe(0.05);
    expect(getDepreciationRate(0)).toBe(0.05);
  });

  it('applies 15% for a vehicle between 6 months and 1 year old', () => {
    expect(getDepreciationRate(0.75)).toBe(0.15);
    expect(getDepreciationRate(1)).toBe(0.15);
  });

  it('applies 20% for a vehicle between 1 and 2 years old', () => {
    expect(getDepreciationRate(1.5)).toBe(0.2);
    expect(getDepreciationRate(2)).toBe(0.2);
  });

  it('applies 50% for a vehicle between 4 and 5 years old', () => {
    expect(getDepreciationRate(4.5)).toBe(0.5);
    expect(getDepreciationRate(5)).toBe(0.5);
  });

  it('applies the beyond-schedule rate for a vehicle older than 5 years', () => {
    expect(getDepreciationRate(8)).toBe(0.5);
  });

  it('returns null for invalid ages', () => {
    expect(getDepreciationRate(-1)).toBeNull();
    expect(getDepreciationRate(NaN)).toBeNull();
    expect(getDepreciationRate('')).toBeNull();
  });
});

describe('calculateIdv', () => {
  it('calculates IDV for a new vehicle (5% depreciation)', () => {
    expect(calculateIdv(725000, 0.3)).toBe(688750);
  });

  it('calculates IDV for a 3-year-old vehicle (30% depreciation)', () => {
    expect(calculateIdv(1000000, 2.5)).toBe(700000);
  });

  it('returns null when price is missing or invalid', () => {
    expect(calculateIdv(0, 2)).toBeNull();
    expect(calculateIdv(undefined, 2)).toBeNull();
    expect(calculateIdv(-500, 2)).toBeNull();
  });

  it('returns null when age is invalid', () => {
    expect(calculateIdv(725000, -1)).toBeNull();
    expect(calculateIdv(725000, undefined)).toBeNull();
  });

  it('defaults to the PC/TW depreciation curve when vehicleClass is not given', () => {
    expect(calculateIdv(1000000, 2.5)).toBe(calculateIdv(1000000, 2.5, { vehicleClass: 'private_car' }));
  });

  it('uses a flatter depreciation curve for commercial GCV vehicles', () => {
    // At 2.5 years: PC/TW = 30% depreciation, commercial = 20%.
    const pcIdv = calculateIdv(1000000, 2.5, { vehicleClass: 'private_car' });
    const gcvIdv = calculateIdv(1000000, 2.5, { vehicleClass: 'commercial_gcv' });
    expect(pcIdv).toBe(700000);
    expect(gcvIdv).toBe(800000);
    expect(gcvIdv).toBeGreaterThan(pcIdv);
  });

  it('uses the commercial curve for PCV and MISC-D too', () => {
    expect(calculateIdv(1000000, 2.5, { vehicleClass: 'commercial_pcv' })).toBe(800000);
    expect(calculateIdv(1000000, 2.5, { vehicleClass: 'misc_d' })).toBe(800000);
  });

  it('applies the commercial beyond-schedule rate past 7 years', () => {
    expect(getDepreciationRate(10, 'commercial_gcv')).toBe(0.45);
    expect(getDepreciationRate(10, 'private_car')).toBe(0.5);
  });

  it('IDV is purely ex-showroom price x (1 - depreciation) — CNG/LPG has no effect', () => {
    // A CNG/LPG addon is a separate policy addon, not an IDV component —
    // passing hasCngLpgKit (even if a caller still does) must be a no-op.
    const withoutKit = calculateIdv(725000, 0.3, { vehicleClass: 'private_car' });
    const withKitFlag = calculateIdv(725000, 0.3, { vehicleClass: 'private_car', hasCngLpgKit: true });
    expect(withoutKit).toBe(688750);
    expect(withKitFlag).toBe(withoutKit);
  });
});
