// Pure condition-tree evaluation. No React, no store — just data in, boolean out.
//
// A condition node is either:
//   a leaf:  { field, operator, value }
//   a group: { logic: 'AND' | 'OR', conditions: [node, ...] }
//
// An empty group ({ conditions: [] }) evaluates to `true` — "no restriction",
// which is what an insurer-default / catch-all rule uses.

function toComparableNumber(v) {
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function evaluateLeaf(condition, input) {
  const { field, operator, value } = condition;
  const actual = input[field];

  // Field not present on the input at all -> condition can't be satisfied,
  // except for not_equals/not_in where "absent" reasonably reads as "doesn't match".
  const isAbsent = actual === undefined || actual === null || actual === '';

  switch (operator) {
    case 'equals':
      if (isAbsent) return false;
      return String(actual) === String(value);
    case 'not_equals':
      if (isAbsent) return true;
      return String(actual) !== String(value);
    case 'in': {
      if (isAbsent) return false;
      const list = Array.isArray(value) ? value : [value];
      return list.map(String).includes(String(actual));
    }
    case 'not_in': {
      if (isAbsent) return true;
      const list = Array.isArray(value) ? value : [value];
      return !list.map(String).includes(String(actual));
    }
    case 'between': {
      const num = toComparableNumber(actual);
      if (num === null || !Array.isArray(value) || value.length !== 2) return false;
      const [min, max] = value.map(toComparableNumber);
      if (min === null || max === null) return false;
      return num >= min && num <= max;
    }
    case 'gt': {
      const num = toComparableNumber(actual);
      const bound = toComparableNumber(value);
      if (num === null || bound === null) return false;
      return num > bound;
    }
    case 'lt': {
      const num = toComparableNumber(actual);
      const bound = toComparableNumber(value);
      if (num === null || bound === null) return false;
      return num < bound;
    }
    default:
      return false;
  }
}

function isGroup(node) {
  return node && Array.isArray(node.conditions);
}

export function evaluateConditionTree(node, input) {
  if (!node) return true;

  if (isGroup(node)) {
    if (node.conditions.length === 0) return true;
    const results = node.conditions.map((child) => evaluateConditionTree(child, input));
    return node.logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  return evaluateLeaf(node, input);
}

// Counts leaf conditions in a tree — used as a "specificity" tiebreaker
// (more conditions matched = more specific rule).
export function countLeafConditions(node) {
  if (!node) return 0;
  if (isGroup(node)) {
    return node.conditions.reduce((sum, child) => sum + countLeafConditions(child), 0);
  }
  return 1;
}
