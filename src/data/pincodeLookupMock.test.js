import { describe, it, expect } from 'vitest';
import { lookupByPincode, seedPincodeRecords } from './pincodeLookupMock.js';

describe('lookupByPincode', () => {
  it('finds a record by exact 6-digit pincode', () => {
    const result = lookupByPincode('400001');
    expect(result).not.toBeNull();
    expect(result.city).toBe('Mumbai');
    expect(result.rto).toBe('MH-01');
  });

  it('strips non-digit characters before matching', () => {
    const result = lookupByPincode(' 400-001 ');
    expect(result).not.toBeNull();
    expect(result.pincode).toBe('400001');
  });

  it('returns null for an unknown pincode', () => {
    expect(lookupByPincode('999999')).toBeNull();
  });

  it('returns null for an incomplete pincode', () => {
    expect(lookupByPincode('4000')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(lookupByPincode('')).toBeNull();
    expect(lookupByPincode(undefined)).toBeNull();
  });

  it('has a record for every state represented in the demo RTO list', () => {
    const states = new Set(seedPincodeRecords.map((r) => r.state));
    expect(states.size).toBeGreaterThanOrEqual(8);
  });
});
