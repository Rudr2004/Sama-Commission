// Translates a condition tree + outcome into a plain-English sentence, e.g.
//   "IF (RTO is any of GJ-01, GJ-27 AND Fuel Type = Diesel) OR (Vehicle Class = Two-Wheeler) THEN 12% commission"
//
// Pure formatting logic — no React.

import { getParameter, getOptionLabel, OPERATORS } from '../config/parameters.js';

function formatValue(field, operator, value) {
  const param = getParameter(field);
  if (operator === 'between' && Array.isArray(value)) {
    return `${value[0]}–${value[1]}`;
  }
  if (Array.isArray(value)) {
    return value.map((v) => (param ? getOptionLabel(field, v) : v)).join(', ');
  }
  return param ? getOptionLabel(field, value) : value;
}

function describeLeaf(condition) {
  const param = getParameter(condition.field);
  const fieldLabel = param ? param.label : condition.field;
  const opLabel = OPERATORS[condition.operator]?.label ?? condition.operator;
  return `${fieldLabel} ${opLabel} ${formatValue(condition.field, condition.operator, condition.value)}`;
}

function describeNode(node) {
  if (!node) return '';
  if (Array.isArray(node.conditions)) {
    if (node.conditions.length === 0) return 'always';
    if (node.conditions.length === 1) return describeNode(node.conditions[0]);
    const parts = node.conditions.map((child) => {
      const inner = describeNode(child);
      return Array.isArray(child.conditions) && child.conditions.length > 1 ? `(${inner})` : inner;
    });
    return parts.join(` ${node.logic} `);
  }
  return describeLeaf(node);
}

export function describeOutcome(outcome) {
  if (!outcome) return '';
  return outcome.type === 'percentage' ? `${outcome.value}% commission` : `₹${outcome.value} flat commission`;
}

export function summarizeRule(rule) {
  const conditionText = describeNode(rule.conditionTree);
  const outcomeText = describeOutcome(rule.outcome);
  return `IF ${conditionText} THEN ${outcomeText}`;
}

export function summarizeConditionTree(tree) {
  return describeNode(tree);
}
