import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { storeReducer, initialState, ActionTypes, nextId } from './storeReducer.js';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  const actions = useMemo(
    () => ({
      addInsurer: (insurer) => dispatch({ type: ActionTypes.ADD_INSURER, payload: { id: nextId('insurer'), ...insurer } }),
      updateInsurer: (insurer) => dispatch({ type: ActionTypes.UPDATE_INSURER, payload: insurer }),
      deleteInsurer: (id) => dispatch({ type: ActionTypes.DELETE_INSURER, payload: { id } }),

      addAgent: (agent) => dispatch({ type: ActionTypes.ADD_AGENT, payload: { id: nextId('AGT'), ...agent } }),
      updateAgent: (agent) => dispatch({ type: ActionTypes.UPDATE_AGENT, payload: agent }),
      deleteAgent: (id) => dispatch({ type: ActionTypes.DELETE_AGENT, payload: { id } }),

      addRule: (rule) => dispatch({ type: ActionTypes.ADD_RULE, payload: { id: nextId('rule'), ...rule } }),
      updateRule: (rule) => dispatch({ type: ActionTypes.UPDATE_RULE, payload: rule }),
      deleteRule: (id) => dispatch({ type: ActionTypes.DELETE_RULE, payload: { id } }),
      duplicateRule: (id) => dispatch({ type: ActionTypes.DUPLICATE_RULE, payload: { id } }),
      toggleRuleActive: (id) => dispatch({ type: ActionTypes.TOGGLE_RULE_ACTIVE, payload: { id } }),

      addOverride: (override) => dispatch({ type: ActionTypes.ADD_OVERRIDE, payload: { id: nextId('override'), ...override } }),
      updateOverride: (override) => dispatch({ type: ActionTypes.UPDATE_OVERRIDE, payload: override }),
      deleteOverride: (id) => dispatch({ type: ActionTypes.DELETE_OVERRIDE, payload: { id } }),

      addPolicy: (policy) => dispatch({ type: ActionTypes.ADD_POLICY, payload: { id: nextId('policy'), ...policy } }),
      updatePolicy: (policy) => dispatch({ type: ActionTypes.UPDATE_POLICY, payload: policy }),
      deletePolicy: (id) => dispatch({ type: ActionTypes.DELETE_POLICY, payload: { id } }),
      togglePolicyActive: (id) => dispatch({ type: ActionTypes.TOGGLE_POLICY_ACTIVE, payload: { id } }),

      setCommissionCheckerSession: (session) => dispatch({ type: ActionTypes.SET_COMMISSION_CHECKER_SESSION, payload: session }),

      resetDemoData: () => dispatch({ type: ActionTypes.RESET_DEMO_DATA }),
    }),
    []
  );

  const value = useMemo(() => ({ state, ...actions }), [state, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
