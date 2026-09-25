import { describe, it, expect } from 'vitest';
import { calculateOdPremium, calculateTpPremium, calculatePremium } from './calculatePremium.js';

describe('calculateOdPremium', () => {
  it('calculates OD premium as 3.5% of IDV with no NCB', () => {
    expect(calculateOdPremium(1000000)).toBe(35000);
  });

  it('applies the NCB discount slab', () => {
    expect(calculateOdPremium(1000000, { ncb: 20 })).toBe(Math.round(35000 * 0.8));
    expect(calculateOdPremium(1000000, { ncb: 50 })).toBe(Math.round(35000 * 0.5));
  });

  it('returns null for invalid IDV', () => {
    expect(calculateOdPremium(0)).toBeNull();
    expect(calculateOdPremium(undefined)).toBeNull();
    expect(calculateOdPremium(-500)).toBeNull();
  });
});

describe('calculateTpPremium', () => {
  it('applies the correct private car TP slab by cc', () => {
    expect(calculateTpPremium({ vehicleClass: 'private_car', cubicCapacity: 998 })).toBe(2094);
    expect(calculateTpPremium({ vehicleClass: 'private_car', cubicCapacity: 1197 })).toBe(3416);
    expect(calculateTpPremium({ vehicleClass: 'private_car', cubicCapacity: 1998 })).toBe(7897);
  });

  it('applies the correct two-wheeler TP slab by cc', () => {
    expect(calculateTpPremium({ vehicleClass: 'two_wheeler', cubicCapacity: 50 })).toBe(538);
    expect(calculateTpPremium({ vehicleClass: 'two_wheeler', cubicCapacity: 125 })).toBe(714);
    expect(calculateTpPremium({ vehicleClass: 'two_wheeler', cubicCapacity: 349 })).toBe(1366);
    expect(calculateTpPremium({ vehicleClass: 'two_wheeler', cubicCapacity: 650 })).toBe(2804);
  });

  it('applies the GCV weight-band TP rate', () => {
    expect(calculateTpPremium({ vehicleClass: 'commercial_gcv', weightBand: 'le_2_5t' })).toBe(7938);
    expect(calculateTpPremium({ vehicleClass: 'commercial_gcv', weightBand: '20_40t' })).toBe(24000);
  });

  it('returns a flat default for PCV and MISC-D', () => {
    expect(calculateTpPremium({ vehicleClass: 'commercial_pcv' })).toBe(9000);
    expect(calculateTpPremium({ vehicleClass: 'misc_d' })).toBe(6000);
  });

  it('returns null for an unrecognized vehicle class', () => {
    expect(calculateTpPremium({ vehicleClass: undefined })).toBeNull();
  });
});

describe('calculatePremium', () => {
  it('returns a full breakdown for a private car with no addons/NCB', () => {
    const result = calculatePremium({ vehicleClass: 'private_car', idv: 725000, cubicCapacity: 1197 });
    expect(result.odPremium).toBe(Math.round(725000 * 0.035));
    expect(result.tpPremium).toBe(3416);
    expect(result.addonPremium).toBe(0);
    expect(result.netPremium).toBe(result.odPremium + result.tpPremium);
    expect(result.gstAmount).toBe(Math.round(result.netPremium * 0.18));
    expect(result.grossPremium).toBe(result.netPremium + result.gstAmount);
  });

  it('adds Zero Dep Cover and PA Owner Cover addon premiums', () => {
    const withoutAddons = calculatePremium({ vehicleClass: 'private_car', idv: 725000, cubicCapacity: 1197 });
    const withAddons = calculatePremium({
      vehicleClass: 'private_car',
      idv: 725000,
      cubicCapacity: 1197,
      zeroDepCover: 'yes',
      paOwnerCover: 'yes',
    });
    expect(withAddons.addonPremium).toBe(4000);
    expect(withAddons.netPremium).toBe(withoutAddons.netPremium + 4000);
  });

  it('reduces OD premium (not TP) when NCB is applied', () => {
    const noNcb = calculatePremium({ vehicleClass: 'private_car', idv: 1000000, cubicCapacity: 1197 });
    const withNcb = calculatePremium({ vehicleClass: 'private_car', idv: 1000000, cubicCapacity: 1197, ncb: 50 });
    expect(withNcb.tpPremium).toBe(noNcb.tpPremium);
    expect(withNcb.odPremium).toBeLessThan(noNcb.odPremium);
  });

  it('returns null when IDV is missing', () => {
    expect(calculatePremium({ vehicleClass: 'private_car', cubicCapacity: 1197 })).toBeNull();
  });

  it('returns null when input itself is missing', () => {
    expect(calculatePremium(null)).toBeNull();
  });
});
