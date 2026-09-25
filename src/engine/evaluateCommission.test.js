import { describe, it, expect } from 'vitest';
import { evaluateCommission } from './evaluateCommission.js';
import { seedInsurers, seedRules, seedAgentOverrides } from '../data/seed.js';

function run(input) {
  return evaluateCommission(input, seedInsurers, seedRules, seedAgentOverrides, '2026-09-01');
}

describe('evaluateCommission', () => {
  it('falls back to insurer base commission when nothing matches', () => {
    const results = run({
      rto: 'TS-08',
      vehicleClass: 'two_wheeler',
      fuelType: 'petrol',
      vehicleAge: 10,
      policyType: 'package',
      caseType: 'renewal',
      agentId: 'AGT-9999',
    });
    const magma = results.find((r) => r.insurerId === 'magma_hdi');
    expect(magma.precedenceTier).toBe('insurerDefault');
    expect(magma.outcome.value).toBe(9.5);
  });

  it('applies RTO-specific rule for Ahmedabad two-wheeler on ICICI', () => {
    const results = run({
      rto: 'GJ-01',
      vehicleClass: 'private_car',
      fuelType: 'petrol',
      vehicleAge: 3,
      policyType: 'package',
      caseType: 'new',
      agentId: 'AGT-9999',
    });
    const icici = results.find((r) => r.insurerId === 'icici_lombard');
    expect(icici.precedenceTier).toBe('rto');
    expect(icici.outcome.value).toBe(27.5);
  });

  it('agent-specific override beats RTO rule for the same agent+insurer', () => {
    const results = run({
      rto: 'GJ-01',
      vehicleClass: 'private_car',
      fuelType: 'petrol',
      vehicleAge: 3,
      policyType: 'package',
      caseType: 'new',
      agentId: 'AGT-1001', // has an override on icici_lombard
    });
    const icici = results.find((r) => r.insurerId === 'icici_lombard');
    expect(icici.precedenceTier).toBe('agentOverride');
    expect(icici.outcome.value).toBe(16);
  });

  it('evaluates a compound OR/AND rule correctly (diesel branch matches)', () => {
    const rules = [
      {
        id: 'compound_rule',
        name: 'Diesel Rajkot cars OR any Two-Wheeler',
        insurerId: 'bajaj_allianz',
        scopeType: 'vehicleParam',
        priority: 15,
        active: true,
        conditionTree: {
          logic: 'OR',
          conditions: [
            {
              logic: 'AND',
              conditions: [
                { field: 'rto', operator: 'in', value: ['GJ-27'] },
                { field: 'fuelType', operator: 'equals', value: 'diesel' },
              ],
            },
            { field: 'vehicleClass', operator: 'equals', value: 'two_wheeler' },
          ],
        },
        outcome: { type: 'percentage', value: 12 },
      },
    ];
    const results = evaluateCommission(
      { rto: 'GJ-27', vehicleClass: 'private_car', fuelType: 'diesel', vehicleAge: 4, policyType: 'new', agentId: 'AGT-9999' },
      seedInsurers,
      rules,
      [],
      '2026-06-01'
    );
    const bajaj = results.find((r) => r.insurerId === 'bajaj_allianz');
    expect(bajaj.precedenceTier).toBe('vehicleParam');
    expect(bajaj.outcome.value).toBe(12);
  });

  it('evaluates a compound OR/AND rule correctly (two-wheeler branch, different RTO/fuel)', () => {
    const rules = [
      {
        id: 'compound_rule',
        name: 'Diesel Rajkot cars OR any Two-Wheeler',
        insurerId: 'bajaj_allianz',
        scopeType: 'vehicleParam',
        priority: 15,
        active: true,
        conditionTree: {
          logic: 'OR',
          conditions: [
            {
              logic: 'AND',
              conditions: [
                { field: 'rto', operator: 'in', value: ['GJ-27'] },
                { field: 'fuelType', operator: 'equals', value: 'diesel' },
              ],
            },
            { field: 'vehicleClass', operator: 'equals', value: 'two_wheeler' },
          ],
        },
        outcome: { type: 'percentage', value: 12 },
      },
    ];
    const results = evaluateCommission(
      { rto: 'MH-12', vehicleClass: 'two_wheeler', fuelType: 'electric', vehicleAge: 1, policyType: 'new', agentId: 'AGT-9999' },
      seedInsurers,
      rules,
      [],
      '2026-06-01'
    );
    const bajaj = results.find((r) => r.insurerId === 'bajaj_allianz');
    expect(bajaj.precedenceTier).toBe('vehicleParam');
    expect(bajaj.outcome.value).toBe(12);
  });

  it('does not match the compound rule when neither branch is satisfied', () => {
    const rules = [
      {
        id: 'compound_rule',
        name: 'Diesel Rajkot cars OR any Two-Wheeler',
        insurerId: 'bajaj_allianz',
        scopeType: 'vehicleParam',
        priority: 15,
        active: true,
        conditionTree: {
          logic: 'OR',
          conditions: [
            {
              logic: 'AND',
              conditions: [
                { field: 'rto', operator: 'in', value: ['GJ-27'] },
                { field: 'fuelType', operator: 'equals', value: 'diesel' },
              ],
            },
            { field: 'vehicleClass', operator: 'equals', value: 'two_wheeler' },
          ],
        },
        outcome: { type: 'percentage', value: 12 },
      },
    ];
    const results = evaluateCommission(
      { rto: 'MH-12', vehicleClass: 'private_car', fuelType: 'petrol', vehicleAge: 5, policyType: 'new', agentId: 'AGT-9999' },
      seedInsurers,
      rules,
      [],
      '2026-06-01'
    );
    const bajaj = results.find((r) => r.insurerId === 'bajaj_allianz');
    expect(bajaj.precedenceTier).toBe('insurerDefault');
  });

  it('applies flat-amount outcome for Mumbai South RTO rule', () => {
    const rules = [
      {
        id: 'flat_rule',
        name: 'Mumbai South RTO — flat bonus',
        insurerId: 'tata_aig',
        scopeType: 'rto',
        priority: 10,
        active: true,
        conditionTree: { logic: 'AND', conditions: [{ field: 'rto', operator: 'in', value: ['MH-01'] }] },
        outcome: { type: 'flat', value: 1500 },
      },
    ];
    const results = evaluateCommission(
      { rto: 'MH-01', vehicleClass: 'private_car', fuelType: 'petrol', vehicleAge: 5, policyType: 'new', agentId: 'AGT-9999' },
      seedInsurers,
      rules,
      [],
      '2026-06-01'
    );
    const tataAig = results.find((r) => r.insurerId === 'tata_aig');
    expect(tataAig.precedenceTier).toBe('rto');
    expect(tataAig.outcome).toEqual({ type: 'flat', value: 1500 });
  });

  it('respects vehicle age "between" operator boundaries', () => {
    const rules = [
      {
        id: 'age_rule',
        name: 'New vehicles (0-2 yrs) — Private Car premium',
        insurerId: 'hdfc_ergo',
        scopeType: 'vehicleParam',
        priority: 20,
        active: true,
        conditionTree: {
          logic: 'AND',
          conditions: [
            { field: 'vehicleAge', operator: 'between', value: [0, 2] },
            { field: 'vehicleClass', operator: 'equals', value: 'private_car' },
          ],
        },
        outcome: { type: 'percentage', value: 13 },
      },
    ];
    const runAge = (vehicleAge) =>
      evaluateCommission(
        { rto: 'DL-01', vehicleClass: 'private_car', fuelType: 'petrol', vehicleAge, policyType: 'new', agentId: 'AGT-9999' },
        seedInsurers,
        rules,
        [],
        '2026-06-01'
      );
    const hdfcWithin = runAge(2).find((r) => r.insurerId === 'hdfc_ergo');
    const hdfcOutOfRange = runAge(3).find((r) => r.insurerId === 'hdfc_ergo');
    expect(hdfcWithin.precedenceTier).toBe('vehicleParam');
    expect(hdfcWithin.outcome.value).toBe(13);
    expect(hdfcOutOfRange.precedenceTier).toBe('insurerDefault');
  });

  it('RTO tier outranks vehicleParam tier at equal priority', () => {
    // Construct a scenario where both an rto-scope and vehicleParam-scope
    // rule for the same insurer match; rto must win per precedence order.
    const rules = [
      {
        id: 'r1',
        name: 'RTO rule',
        insurerId: 'icici_lombard',
        scopeType: 'rto',
        priority: 50,
        active: true,
        conditionTree: { logic: 'AND', conditions: [{ field: 'rto', operator: 'in', value: ['GJ-05'] }] },
        outcome: { type: 'percentage', value: 20 },
      },
      {
        id: 'r2',
        name: 'Vehicle param rule',
        insurerId: 'icici_lombard',
        scopeType: 'vehicleParam',
        priority: 1, // even higher "priority" (lower number) must still lose to RTO tier
        active: true,
        conditionTree: { logic: 'AND', conditions: [{ field: 'fuelType', operator: 'equals', value: 'petrol' }] },
        outcome: { type: 'percentage', value: 99 },
      },
    ];
    const results = evaluateCommission(
      { rto: 'GJ-05', fuelType: 'petrol', vehicleClass: 'private_car', vehicleAge: 5, policyType: 'new', agentId: 'AGT-9999' },
      seedInsurers,
      rules,
      [],
      '2026-06-01'
    );
    const icici = results.find((r) => r.insurerId === 'icici_lombard');
    expect(icici.precedenceTier).toBe('rto');
    expect(icici.outcome.value).toBe(20);
  });

  it('ignores rules outside their effective date window', () => {
    const rules = [
      {
        id: 'expired_rule',
        name: 'Expired promo',
        insurerId: 'icici_lombard',
        scopeType: 'vehicleParam',
        priority: 5,
        active: true,
        conditionTree: { logic: 'AND', conditions: [] },
        outcome: { type: 'percentage', value: 50 },
        effectiveFrom: '2025-01-01',
        effectiveTo: '2025-12-31',
      },
    ];
    const results = evaluateCommission(
      { rto: 'GJ-05', fuelType: 'petrol', vehicleClass: 'private_car', vehicleAge: 5, policyType: 'new', agentId: 'AGT-9999' },
      seedInsurers,
      rules,
      [],
      '2026-06-01'
    );
    const icici = results.find((r) => r.insurerId === 'icici_lombard');
    expect(icici.precedenceTier).toBe('insurerDefault');
  });

  it('a broker/agent override on RTO + Vehicle Company beats a plain RTO rule for that agent', () => {
    const rules = [
      {
        id: 'rto_make_rule',
        name: 'Quick rule: GJ-01 + Maruti Suzuki',
        insurerId: 'ALL',
        scopeType: 'rto',
        priority: 5,
        active: true,
        conditionTree: {
          logic: 'AND',
          conditions: [
            { field: 'rto', operator: 'in', value: ['GJ-01'] },
            { field: 'vehicleMake', operator: 'in', value: ['maruti_suzuki'] },
          ],
        },
        outcome: { type: 'percentage', value: 10 },
      },
    ];
    const overrides = [
      {
        id: 'broker_override',
        agentId: 'AGT-1002',
        name: 'Quick override: Priya Nair — GJ-01 + Maruti Suzuki',
        insurerId: 'ALL',
        conditionTree: {
          logic: 'AND',
          conditions: [
            { field: 'rto', operator: 'in', value: ['GJ-01'] },
            { field: 'vehicleMake', operator: 'in', value: ['maruti_suzuki'] },
          ],
        },
        outcome: { type: 'percentage', value: 18 },
      },
    ];
    const input = {
      rto: 'GJ-01',
      vehicleMake: 'maruti_suzuki',
      vehicleClass: 'private_car',
      fuelType: 'petrol',
      vehicleAge: 3,
      policyType: 'new',
      agentId: 'AGT-1002',
    };

    const resultsForBroker = evaluateCommission(input, seedInsurers, rules, overrides, '2026-06-01');
    const icici = resultsForBroker.find((r) => r.insurerId === 'icici_lombard');
    expect(icici.precedenceTier).toBe('agentOverride');
    expect(icici.outcome.value).toBe(18);

    const resultsForOtherAgent = evaluateCommission({ ...input, agentId: 'AGT-9999' }, seedInsurers, rules, overrides, '2026-06-01');
    const iciciOther = resultsForOtherAgent.find((r) => r.insurerId === 'icici_lombard');
    expect(iciciOther.precedenceTier).toBe('rto');
    expect(iciciOther.outcome.value).toBe(10);
  });

  it('an RTO + Vehicle Company rule with no broker match does not fire for a different vehicle company', () => {
    const rules = [
      {
        id: 'rto_make_rule',
        name: 'Quick rule: GJ-01 + Maruti Suzuki',
        insurerId: 'ALL',
        scopeType: 'rto',
        priority: 5,
        active: true,
        conditionTree: {
          logic: 'AND',
          conditions: [
            { field: 'rto', operator: 'in', value: ['GJ-01'] },
            { field: 'vehicleMake', operator: 'in', value: ['maruti_suzuki'] },
          ],
        },
        outcome: { type: 'percentage', value: 10 },
      },
    ];
    const results = evaluateCommission(
      { rto: 'GJ-01', vehicleMake: 'hyundai', vehicleClass: 'private_car', fuelType: 'petrol', vehicleAge: 3, policyType: 'new', agentId: 'AGT-9999' },
      seedInsurers,
      rules,
      [],
      '2026-06-01'
    );
    const icici = results.find((r) => r.insurerId === 'icici_lombard');
    expect(icici.precedenceTier).toBe('insurerDefault');
  });

  it('applies the reduced SAOD commission rule across all insurers', () => {
    const results = run({
      rto: 'DL-01',
      vehicleClass: 'private_car',
      fuelType: 'petrol',
      vehicleAge: 4,
      policyType: 'saod',
      caseType: 'new',
      seatingCapacity: 5,
      agentId: 'AGT-9999',
    });
    const hdfc = results.find((r) => r.insurerId === 'hdfc_ergo');
    expect(hdfc.precedenceTier).toBe('vehicleParam');
    expect(hdfc.outcome.value).toBe(6);
  });

  it('applies the high-seating PCV bonus for Go Digit when seating capacity > 6', () => {
    const results = run({
      rto: 'GJ-05',
      vehicleClass: 'commercial_pcv',
      fuelType: 'diesel',
      vehicleAge: 2,
      policyType: 'package',
      caseType: 'new',
      seatingCapacity: 12,
      agentId: 'AGT-9999',
    });
    const digit = results.find((r) => r.insurerId === 'go_digit');
    expect(digit.precedenceTier).toBe('vehicleParam');
    expect(digit.outcome.value).toBe(10.5);
  });

  it('does not apply the high-seating PCV bonus when seating capacity is 6 or below', () => {
    const results = run({
      rto: 'GJ-05',
      vehicleClass: 'commercial_pcv',
      fuelType: 'diesel',
      vehicleAge: 2,
      policyType: 'package',
      caseType: 'new',
      seatingCapacity: 4,
      agentId: 'AGT-9999',
    });
    const digit = results.find((r) => r.insurerId === 'go_digit');
    expect(digit.precedenceTier).toBe('insurerDefault');
  });

  it('applies the reduced Break-In case-type commission across all insurers', () => {
    const results = run({
      rto: 'MH-12',
      vehicleClass: 'private_car',
      fuelType: 'petrol',
      vehicleAge: 6,
      policyType: 'package',
      caseType: 'break_in',
      seatingCapacity: 5,
      agentId: 'AGT-9999',
    });
    const tataAig = results.find((r) => r.insurerId === 'tata_aig');
    expect(tataAig.precedenceTier).toBe('vehicleParam');
    expect(tataAig.outcome.value).toBe(5);
  });

  it('applies the Magma GCV weight-band rule for a ≤2.5T Gujarat truck', () => {
    const results = run({
      rto: 'GJ-01',
      vehicleClass: 'commercial_gcv',
      fuelType: 'diesel',
      vehicleAge: 2,
      weightBand: 'le_2_5t',
      policyType: 'package',
      caseType: 'new',
      agentId: 'AGT-9999',
    });
    const magma = results.find((r) => r.insurerId === 'magma_hdi');
    expect(magma.precedenceTier).toBe('vehicleParam');
    expect(magma.outcome.value).toBe(56);
  });

  it('does not apply the ≤2.5T GCV rule to a different weight band', () => {
    const results = run({
      rto: 'GJ-01',
      vehicleClass: 'commercial_gcv',
      fuelType: 'diesel',
      vehicleAge: 2,
      weightBand: '20_40t',
      policyType: 'package',
      caseType: 'new',
      agentId: 'AGT-9999',
    });
    const magma = results.find((r) => r.insurerId === 'magma_hdi');
    expect(magma.precedenceTier).not.toBe('vehicleParam');
  });

  it('applies the Magma tractor (MISC-D) rule using the vehicleSubclass condition', () => {
    // rule_magma_tractor_delhi_new is scoped to vehicleParam; use an RTO with
    // no Magma rto-tier rule so the rto tier doesn't outrank it and mask the
    // vehicleParam match being tested here.
    const rules = seedRules.filter((r) => r.id !== 'rule_magma_delhi_petrol' && r.id !== 'rule_magma_delhi_diesel');
    const results = evaluateCommission(
      {
        rto: 'DL-01',
        vehicleClass: 'misc_d',
        vehicleSubclass: 'tractor_new',
        fuelType: 'diesel',
        vehicleAge: 1,
        policyType: 'package',
        caseType: 'new',
        agentId: 'AGT-9999',
      },
      seedInsurers,
      rules,
      seedAgentOverrides,
      '2026-09-01'
    );
    const magma = results.find((r) => r.insurerId === 'magma_hdi');
    expect(magma.precedenceTier).toBe('vehicleParam');
    expect(magma.outcome.value).toBe(24);
  });

  it('does not apply the tractor rule to a harvester in the same MISC-D class', () => {
    const rules = seedRules.filter((r) => r.id !== 'rule_magma_delhi_petrol' && r.id !== 'rule_magma_delhi_diesel');
    const results = evaluateCommission(
      {
        rto: 'DL-01',
        vehicleClass: 'misc_d',
        vehicleSubclass: 'harvester_new',
        fuelType: 'diesel',
        vehicleAge: 1,
        policyType: 'package',
        caseType: 'new',
        agentId: 'AGT-9999',
      },
      seedInsurers,
      rules,
      seedAgentOverrides,
      '2026-09-01'
    );
    const magma = results.find((r) => r.insurerId === 'magma_hdi');
    expect(magma.precedenceTier).toBe('insurerDefault');
  });
});
