import { ConditionGroup } from './ConditionGroup.jsx';
import { summarizeConditionTree } from '../../engine/ruleSummary.js';
import { makeEmptyGroup } from './conditionTreeUtils.js';

export function ConditionTreeBuilder({ conditionTree, onChange }) {
  const tree = conditionTree || makeEmptyGroup('AND');
  const summary = summarizeConditionTree(tree);

  return (
    <div className="space-y-3">
      <ConditionGroup node={tree} onChange={onChange} isRoot depth={0} />
      <div className="rounded-lg bg-slate-900 text-slate-100 px-4 py-3 text-sm font-mono leading-relaxed">
        <span className="text-slate-400">IF </span>
        {summary || <span className="text-slate-500">always (no conditions)</span>}
      </div>
    </div>
  );
}
