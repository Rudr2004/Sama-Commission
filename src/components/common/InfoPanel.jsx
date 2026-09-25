import { useState } from 'react';
import { PRECEDENCE_TIERS } from '../../engine/evaluateCommission.js';

const TIER_ORDER = ['agentOverride', 'rto', 'vehicleParam', 'insurerDefault'];

export function InfoPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-brand-800">How this Rule Engine works — rule precedence order</span>
        <svg
          className={`shrink-0 w-4 h-4 text-brand-600 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-slate-700 space-y-3">
          <p>
            Every insurer's commission is decided by running the agent's entered vehicle/policy details against all
            configured rules, then picking a single winner using a fixed precedence order — <em>even though</em> each
            rule's own conditions can be an arbitrary AND/OR tree. This keeps the result explainable: any commission
            shown to an agent can always be traced back to exactly one rule and one precedence tier.
          </p>
          <ol className="space-y-2">
            {TIER_ORDER.map((tier, idx) => (
              <li key={tier} className="flex gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-semibold">
                  {idx + 1}
                </span>
                <span>
                  <strong>{PRECEDENCE_TIERS[tier].label}.</strong>{' '}
                  {tier === 'agentOverride' && 'A commission override tied to that specific agent ID — always wins if present.'}
                  {tier === 'rto' && "A rule scoped by RTO (region) that matches the agent's input."}
                  {tier === 'vehicleParam' && 'A rule based on other vehicle/policy parameters (age, class, fuel, policy type, etc).'}
                  {tier === 'insurerDefault' && "The insurer's flat base commission — used only when nothing above matches."}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-500">
            Within the same tier, rules are ordered by priority (lower number evaluated first); the first full match
            wins. Ties fall back to the more specific rule (the one with more conditions).
          </p>
          {/* <p className="text-xs text-slate-500 italic">Demo data resets on reload — this POC uses in-memory state only.</p> */}
        </div>
      )}
    </div>
  );
}
