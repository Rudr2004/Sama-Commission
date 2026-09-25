// The rules engine. Pure function, no React imports — unit-testable in
// isolation (see evaluateCommission.test.js).
//
// PRECEDENCE (documented, explicit, and what drives "why this rule won"):
//   1. Agent-specific override — a rule/override scoped to the querying agent's ID
//   2. RTO-specific rule       — scopeType 'rto' (keys off the RTO field)
//   3. Vehicle/policy-param rule — scopeType 'vehicleParam' (any other field combo)
//   4. Insurer default/base commission — fallback when nothing else matches
//
// Within the SAME precedence tier, rules are ordered by `priority`
// (lower number = evaluated first) and the first full match wins. If two
// matching rules in the same tier share a priority, the rule with more leaf
// conditions (more specific) wins as a tiebreaker.

import { evaluateConditionTree, countLeafConditions } from './conditions.js';

export const PRECEDENCE_TIERS = {
  agentOverride: { rank: 1, label: 'Agent-specific override' },
  rto: { rank: 2, label: 'RTO-specific rule' },
  vehicleParam: { rank: 3, label: 'Vehicle/policy parameter rule' },
  insurerDefault: { rank: 4, label: 'Insurer default/base commission' },
};

function isWithinEffectiveWindow(rule, asOfDate) {
  const now = asOfDate ? new Date(asOfDate) : new Date();
  if (rule.effectiveFrom && now < new Date(rule.effectiveFrom)) return false;
  if (rule.effectiveTo && now > new Date(rule.effectiveTo)) return false;
  return true;
}

function ruleAppliesToInsurer(rule, insurerId) {
  return rule.insurerId === 'ALL' || rule.insurerId === insurerId;
}

function describeConditionSummary(rule) {
  // Short human summary used in the "why this rate" explanation.
  // Full plain-English rendering lives in ruleSummary.js; this is a compact form.
  return rule.name;
}

/**
 * Finds the winning rule for a single insurer given the agent's input.
 * Returns { rule, tier } or null if nothing but the insurer default applies.
 */
function resolveForInsurer(insurer, input, rules, agentOverrides, asOfDate) {
  const candidates = [];

  // Tier 1: agent-specific overrides
  for (const ov of agentOverrides) {
    if (ov.agentId !== input.agentId) continue;
    if (ov.insurerId && ov.insurerId !== 'ALL' && ov.insurerId !== insurer.id) continue;
    if (!isWithinEffectiveWindow(ov, asOfDate)) continue;
    if (ov.conditionTree && !evaluateConditionTree(ov.conditionTree, input)) continue;
    candidates.push({
      tier: 'agentOverride',
      rule: {
        id: ov.id,
        name: ov.name || `Agent override for ${ov.agentId}`,
        priority: 0,
        outcome: ov.outcome,
        conditionTree: ov.conditionTree,
      },
    });
  }

  // Tiers 2 & 3: regular rules, split by scopeType
  const activeRules = rules.filter(
    (r) =>
      r.active !== false &&
      ruleAppliesToInsurer(r, insurer.id) &&
      isWithinEffectiveWindow(r, asOfDate) &&
      (r.scopeType === 'rto' || r.scopeType === 'vehicleParam') &&
      evaluateConditionTree(r.conditionTree, input)
  );

  for (const r of activeRules) {
    candidates.push({ tier: r.scopeType, rule: r });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const rankA = PRECEDENCE_TIERS[a.tier].rank;
    const rankB = PRECEDENCE_TIERS[b.tier].rank;
    if (rankA !== rankB) return rankA - rankB;

    const prioA = a.rule.priority ?? Infinity;
    const prioB = b.rule.priority ?? Infinity;
    if (prioA !== prioB) return prioA - prioB;

    const specA = countLeafConditions(a.rule.conditionTree);
    const specB = countLeafConditions(b.rule.conditionTree);
    return specB - specA;
  });

  return candidates[0];
}

/**
 * @param {object} input - agent-entered vehicle/policy details, e.g.
 *   { rto, vehicleClass, vehicleSubclass, fuelType, vehicleAge, policyType, agentId, ...extra }
 * @param {object[]} insurers - [{ id, name, baseCommissionRate }]
 * @param {object[]} rules - all configured rules (any insurerId, incl. 'ALL')
 * @param {object[]} agentOverrides - agent-specific override records
 * @param {string|Date} [asOfDate] - evaluate effective-dated rules as of this date (defaults to now)
 * @returns {object[]} one result per insurer: { insurerId, insurerName, outcome, matchedRule, precedenceTier, precedenceLabel, reason }
 */
export function evaluateCommission(input, insurers, rules, agentOverrides = [], asOfDate = null) {
  return insurers.map((insurer) => {
    const resolved = resolveForInsurer(insurer, input, rules, agentOverrides, asOfDate);

    if (!resolved) {
      return {
        insurerId: insurer.id,
        insurerName: insurer.name,
        outcome: { type: 'percentage', value: insurer.baseCommissionRate },
        matchedRule: null,
        precedenceTier: 'insurerDefault',
        precedenceLabel: PRECEDENCE_TIERS.insurerDefault.label,
        reason: `No configured rule matched — applied ${insurer.name}'s base commission of ${insurer.baseCommissionRate}%.`,
      };
    }

    const { tier, rule } = resolved;
    const tierLabel = PRECEDENCE_TIERS[tier].label;
    let reason;
    if (tier === 'agentOverride') {
      reason = `Agent-specific override applied for agent ${input.agentId}.`;
    } else {
      reason = `Matched ${tierLabel.toLowerCase()}: "${describeConditionSummary(rule)}".`;
    }

    return {
      insurerId: insurer.id,
      insurerName: insurer.name,
      outcome: rule.outcome,
      matchedRule: {
        id: rule.id,
        name: rule.name,
        conditionTree: rule.conditionTree ?? null,
        priority: rule.priority ?? null,
        effectiveFrom: rule.effectiveFrom ?? null,
        effectiveTo: rule.effectiveTo ?? null,
      },
      precedenceTier: tier,
      precedenceLabel: tierLabel,
      reason,
    };
  });
}
