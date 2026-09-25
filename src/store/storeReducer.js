// Reducer + action creators for the mock backend. Kept separate from the
// Context/Provider so the reducer itself is easy to unit test if needed.

import { seedInsurers, seedAgents, seedRules, seedAgentOverrides, seedPolicies } from '../data/seed.js';

let idCounter = 1;
export function nextId(prefix) {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export const initialState = {
  insurers: seedInsurers,
  agents: seedAgents,
  rules: seedRules,
  agentOverrides: seedAgentOverrides,
  policies: seedPolicies,
  // Persists the Commission Checker's last entry + results across tab
  // navigation within the same session (survives unmount, not a reload).
  commissionCheckerSession: null,
};

export const ActionTypes = {
  ADD_INSURER: 'ADD_INSURER',
  UPDATE_INSURER: 'UPDATE_INSURER',
  DELETE_INSURER: 'DELETE_INSURER',

  ADD_AGENT: 'ADD_AGENT',
  UPDATE_AGENT: 'UPDATE_AGENT',
  DELETE_AGENT: 'DELETE_AGENT',

  ADD_RULE: 'ADD_RULE',
  UPDATE_RULE: 'UPDATE_RULE',
  DELETE_RULE: 'DELETE_RULE',
  DUPLICATE_RULE: 'DUPLICATE_RULE',
  TOGGLE_RULE_ACTIVE: 'TOGGLE_RULE_ACTIVE',

  ADD_OVERRIDE: 'ADD_OVERRIDE',
  UPDATE_OVERRIDE: 'UPDATE_OVERRIDE',
  DELETE_OVERRIDE: 'DELETE_OVERRIDE',

  ADD_POLICY: 'ADD_POLICY',
  UPDATE_POLICY: 'UPDATE_POLICY',
  DELETE_POLICY: 'DELETE_POLICY',
  TOGGLE_POLICY_ACTIVE: 'TOGGLE_POLICY_ACTIVE',

  SET_COMMISSION_CHECKER_SESSION: 'SET_COMMISSION_CHECKER_SESSION',

  RESET_DEMO_DATA: 'RESET_DEMO_DATA',
};

export function storeReducer(state, action) {
  switch (action.type) {
    case ActionTypes.ADD_INSURER:
      return { ...state, insurers: [...state.insurers, action.payload] };

    case ActionTypes.UPDATE_INSURER:
      return {
        ...state,
        insurers: state.insurers.map((i) => (i.id === action.payload.id ? { ...i, ...action.payload } : i)),
      };

    case ActionTypes.DELETE_INSURER:
      return {
        ...state,
        insurers: state.insurers.filter((i) => i.id !== action.payload.id),
        rules: state.rules.filter((r) => r.insurerId !== action.payload.id),
      };

    case ActionTypes.ADD_AGENT:
      return { ...state, agents: [...state.agents, action.payload] };

    case ActionTypes.UPDATE_AGENT:
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.payload.id ? { ...a, ...action.payload } : a)),
      };

    case ActionTypes.DELETE_AGENT:
      return {
        ...state,
        agents: state.agents.filter((a) => a.id !== action.payload.id),
        agentOverrides: state.agentOverrides.filter((o) => o.agentId !== action.payload.id),
      };

    case ActionTypes.ADD_RULE:
      return { ...state, rules: [...state.rules, action.payload] };

    case ActionTypes.UPDATE_RULE:
      return {
        ...state,
        rules: state.rules.map((r) => (r.id === action.payload.id ? action.payload : r)),
      };

    case ActionTypes.DELETE_RULE:
      return { ...state, rules: state.rules.filter((r) => r.id !== action.payload.id) };

    case ActionTypes.DUPLICATE_RULE: {
      const original = state.rules.find((r) => r.id === action.payload.id);
      if (!original) return state;
      const copy = {
        ...original,
        id: nextId('rule'),
        name: `${original.name} (copy)`,
        active: false,
      };
      return { ...state, rules: [...state.rules, copy] };
    }

    case ActionTypes.TOGGLE_RULE_ACTIVE:
      return {
        ...state,
        rules: state.rules.map((r) => (r.id === action.payload.id ? { ...r, active: !r.active } : r)),
      };

    case ActionTypes.ADD_OVERRIDE:
      return { ...state, agentOverrides: [...state.agentOverrides, action.payload] };

    case ActionTypes.UPDATE_OVERRIDE:
      return {
        ...state,
        agentOverrides: state.agentOverrides.map((o) => (o.id === action.payload.id ? action.payload : o)),
      };

    case ActionTypes.DELETE_OVERRIDE:
      return { ...state, agentOverrides: state.agentOverrides.filter((o) => o.id !== action.payload.id) };

    case ActionTypes.ADD_POLICY:
      return { ...state, policies: [...state.policies, action.payload] };

    case ActionTypes.UPDATE_POLICY:
      return {
        ...state,
        policies: state.policies.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };

    case ActionTypes.DELETE_POLICY:
      return { ...state, policies: state.policies.filter((p) => p.id !== action.payload.id) };

    case ActionTypes.TOGGLE_POLICY_ACTIVE:
      return {
        ...state,
        policies: state.policies.map((p) => (p.id === action.payload.id ? { ...p, active: !p.active } : p)),
      };

    case ActionTypes.SET_COMMISSION_CHECKER_SESSION:
      return { ...state, commissionCheckerSession: action.payload };

    case ActionTypes.RESET_DEMO_DATA:
      return initialState;

    default:
      return state;
  }
}
