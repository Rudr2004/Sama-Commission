import { ConditionRow } from './ConditionRow.jsx';
import { Button } from '../common/Button.jsx';
import { makeEmptyGroup, makeEmptyLeaf } from './conditionTreeUtils.js';

const DEPTH_STYLES = [
  'border-brand-300 bg-brand-50/40',
  'border-violet-300 bg-violet-50/40',
  'border-amber-300 bg-amber-50/40',
  'border-emerald-300 bg-emerald-50/40',
];

function isGroup(node) {
  return node && Array.isArray(node.conditions);
}

export function ConditionGroup({ node, depth = 0, onChange, onRemove, isRoot = false }) {
  const style = DEPTH_STYLES[depth % DEPTH_STYLES.length];

  const setLogic = (logic) => onChange({ ...node, logic });

  const updateChild = (idx, updatedChild) => {
    const conditions = [...node.conditions];
    conditions[idx] = updatedChild;
    onChange({ ...node, conditions });
  };

  const removeChild = (idx) => {
    const conditions = node.conditions.filter((_, i) => i !== idx);
    onChange({ ...node, conditions });
  };

  const addCondition = () => {
    onChange({ ...node, conditions: [...node.conditions, makeEmptyLeaf()] });
  };

  const addGroup = () => {
    onChange({ ...node, conditions: [...node.conditions, makeEmptyGroup('AND')] });
  };

  return (
    <div className={`rounded-xl border-2 ${style} p-3 space-y-2.5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isRoot ? 'Match' : 'Group'}
          </span>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden">
            {['AND', 'OR'].map((logic) => (
              <button
                key={logic}
                type="button"
                onClick={() => setLogic(logic)}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  node.logic === logic ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {logic}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">of the following</span>
        </div>
        {!isRoot && (
          <Button variant="ghost" size="sm" onClick={onRemove} title="Remove group">
            ✕ Remove group
          </Button>
        )}
      </div>

      {node.conditions.length === 0 && (
        <p className="text-xs text-slate-400 italic px-1">
          No conditions yet — this group matches everything. Add a condition or nested group below.
        </p>
      )}

      <div className="space-y-2">
        {node.conditions.map((child, idx) =>
          isGroup(child) ? (
            <ConditionGroup
              key={idx}
              node={child}
              depth={depth + 1}
              onChange={(updated) => updateChild(idx, updated)}
              onRemove={() => removeChild(idx)}
            />
          ) : (
            <ConditionRow
              key={idx}
              condition={child}
              onChange={(updated) => updateChild(idx, updated)}
              onRemove={() => removeChild(idx)}
            />
          )
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="subtle" size="sm" onClick={addCondition}>
          + Condition
        </Button>
        <Button variant="subtle" size="sm" onClick={addGroup}>
          + Nested group
        </Button>
      </div>
    </div>
  );
}
