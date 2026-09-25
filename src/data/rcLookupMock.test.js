import { describe, it, expect } from 'vitest';
import { lookupVehicleByRegNumber, seedRcLookupRecords } from './rcLookupMock.js';

describe('lookupVehicleByRegNumber', () => {
  it('finds a record by exact registration number', () => {
    const result = lookupVehicleByRegNumber('MH12AB1234');
    expect(result).not.toBeNull();
    expect(result.vehicleMake).toBe('maruti_suzuki');
    expect(result.vehicleModel).toBe('swift');
  });

  it('is case-insensitive and ignores spaces/hyphens', () => {
    const result = lookupVehicleByRegNumber('mh 12-ab-1234');
    expect(result).not.toBeNull();
    expect(result.regNumber).toBe('MH12AB1234');
  });

  it('returns null for an unknown registration number', () => {
    expect(lookupVehicleByRegNumber('XX99ZZ0000')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(lookupVehicleByRegNumber('')).toBeNull();
    expect(lookupVehicleByRegNumber(undefined)).toBeNull();
  });

  it('has at least one two-wheeler and one private car record for demo variety', () => {
    expect(seedRcLookupRecords.some((r) => r.vehicleClass === 'two_wheeler')).toBe(true);
    expect(seedRcLookupRecords.some((r) => r.vehicleClass === 'private_car')).toBe(true);
  });
});
