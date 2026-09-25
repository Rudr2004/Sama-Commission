import { useState, useMemo } from 'react';
import { Badge } from './Badge.jsx';
import { Button } from './Button.jsx';
import { summarizeConditionTree } from '../../engine/ruleSummary.js';
import { calculatePremium } from '../../engine/calculatePremium.js';
import { getOptionLabel } from '../../config/parameters.js';

// Exported so other pages reusing InsurerDetailModal (e.g. Search Policies)
// can render the same tier badge tone without duplicating this map.
export const TIER_TONE = {
  agentOverride: 'violet',
  rto: 'brand',
  vehicleParam: 'green',
  insurerDefault: 'slate',
};

const TIER_EXPLANATION = {
  agentOverride:
    'This agent has a dedicated commission arrangement with this insurer that overrides every other rule — the highest-precedence tier in the engine.',
  rto: 'This rate comes from a rule scoped to the RTO/region on this policy — RTO-tier rules outrank vehicle-parameter rules and the insurer default.',
  vehicleParam:
    'This rate comes from a rule matched on vehicle/policy attributes (e.g. fuel type, case type, weight band) rather than RTO — it applies when no RTO-specific or agent-specific rule matched first.',
  insurerDefault:
    "No configured rule matched this policy's details, so the insurer's flat base/default commission rate was used as a fallback.",
};

function formatDateWindow(from, to) {
  if (!from && !to) return 'Always effective (no date restriction)';
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  if (from && to) return `Effective ${fmt(from)} – ${fmt(to)}`;
  if (from) return `Effective from ${fmt(from)} onward`;
  return `Effective until ${fmt(to)}`;
}

function outcomeLabel(outcome) {
  return outcome.type === 'percentage'
    ? `${outcome.value}%`
    : `₹${outcome.value}`;
}

function outcomeNumericValue(outcome) {
  // For sort-by-commission purposes; flat amounts and percentages aren't
  // directly comparable, but both trend "higher is better" for the agent.
  return outcome.value;
}

// ₹ commission amount for this outcome — only meaningful for a percentage
// outcome against a known premium; a flat outcome already IS the ₹ amount.
function commissionAmount(outcome, premiumAmount) {
  if (outcome.type === 'flat') return outcome.value;
  const premium = Number(premiumAmount);
  if (!Number.isFinite(premium) || premium <= 0) return null;
  return Math.round((outcome.value / 100) * premium);
}

// Exported so other pages (e.g. Search Policies' "Continue your last quote"
// results) can reuse the exact same detail modal instead of duplicating it.
export function InsurerDetailModal({
  result,
  insurer,
  submittedInput,
  onClose,
}) {
  const profile = insurer?.profile;
  const rule = result.matchedRule;
  const conditionText = rule?.conditionTree
    ? summarizeConditionTree(rule.conditionTree)
    : null;
  // Real OD + TP + GST breakdown (same engine that computed submittedInput.premiumAmount),
  // recomputed here from the raw inputs so the modal can show the actual components.
  const breakdown = submittedInput ? calculatePremium(submittedInput) : null;
  const commAmount = commissionAmount(
    result.outcome,
    submittedInput?.premiumAmount,
  );

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold text-slate-500 shrink-0">
              {result.insurerName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 leading-tight">
                {result.insurerName}
              </h3>
              {insurer?.shortCode && (
                <p className="text-xs text-slate-400">{insurer.shortCode}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Commission headline */}
          <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3">
            <p className="text-3xl font-bold text-slate-900">
              {outcomeLabel(result.outcome)}
            </p>
            <p className="text-xs text-slate-500">
              {result.outcome.type === 'percentage'
                ? 'commission, as a % of premium'
                : 'flat commission per policy'}
            </p>
            {result.outcome.type === 'percentage' &&
              (commAmount != null ? (
                <p className="text-lg font-semibold text-brand-700 mt-1">
                  ₹{commAmount.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    on ₹
                    {Number(submittedInput.premiumAmount).toLocaleString(
                      'en-IN',
                    )}{' '}
                    premium
                  </span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic mt-1">
                  Enter a Premium Amount on the entry form to see the ₹
                  commission
                </p>
              ))}
            <div className="mt-2">
              <Badge tone={TIER_TONE[result.precedenceTier]}>
                {result.precedenceLabel}
              </Badge>
            </div>
          </div>

          {/* Premium breakdown — policy-schedule style */}
          {breakdown && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Premium breakdown
              </p>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-2 text-sm">
                  <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">
                    Own Damage Premium (A)
                  </div>
                  <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                    ₹{breakdown.odPremium.toLocaleString('en-IN')}
                  </div>
                  <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">
                    Liability / TP Premium (B)
                  </div>
                  <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                    ₹{breakdown.tpPremium.toLocaleString('en-IN')}
                  </div>
                  {breakdown.addonPremium > 0 && (
                    <>
                      <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">
                        Add-on Premium
                      </div>
                      <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                        ₹{breakdown.addonPremium.toLocaleString('en-IN')}
                      </div>
                    </>
                  )}
                  <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">
                    Net Premium
                  </div>
                  <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                    ₹{breakdown.netPremium.toLocaleString('en-IN')}
                  </div>
                  <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">
                    GST (18%)
                  </div>
                  <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                    ₹{breakdown.gstAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="px-3 py-2 border-r border-slate-100 bg-slate-50 font-semibold text-slate-700">
                    Total Paid Premium
                  </div>
                  <div className="px-3 py-2 bg-slate-50 text-right font-semibold text-slate-900">
                    ₹{breakdown.grossPremium.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic mt-2">
                Auto-calculated: OD Premium = IDV × ~3.5% rate (less NCB) — TP
                Premium = fixed IRDAI-tariff-structured slab by vehicle class/cc
                — GST 18%.
              </p>
            </div>
          )}

          {/* What this policy includes — coverage, addons & standard clauses */}
          {submittedInput && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                What this policy includes
              </p>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">
                    Own Damage cover
                  </span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {getOptionLabel('policyType', submittedInput.policyType) ||
                      '—'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">
                    Third Party Liability
                  </span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    Death/bodily injury: unlimited (statutory) · Property
                    damage: up to ₹7.5 lakhs
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">
                    PA Cover for Owner-Driver
                  </span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {submittedInput.paOwnerCover === 'yes'
                      ? 'Included — up to ₹15 lakhs'
                      : 'Not opted'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">
                    Zero Depreciation Cover
                  </span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {submittedInput.zeroDepCover === 'yes'
                      ? 'Included'
                      : 'Not opted'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">
                    CNG/LPG Kit Fitted
                  </span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {submittedInput.isCngLpg === 'yes'
                      ? 'Declared — covered under OD'
                      : 'No'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">
                    No Claim Bonus (NCB)
                  </span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {submittedInput.ncb
                      ? `${submittedInput.ncb}% — applies to OD premium only`
                      : 'Not applied'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic mt-2">
                Driver's clause: covers any person, including the insured,
                holding an effective driving licence at the time of the
                accident. Standard exclusions apply — hire/reward, organized
                racing, speed testing, and use in connection with motor trade
                are not covered.
              </p>
            </div>
          )}

          {/* Why this rate — full breakdown */}
          {/* <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Why this rate</p>
            <p className="text-sm text-slate-700 leading-relaxed">{TIER_EXPLANATION[result.precedenceTier]}</p>
            {conditionText && (
              <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-xs text-slate-400 mb-1">Rule condition{rule?.name ? ` — "${rule.name}"` : ''}</p>
                <p className="text-sm text-slate-800 font-mono leading-relaxed">IF {conditionText}</p>
              </div>
            )}
            {rule && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {rule.priority != null && <span>Priority: {rule.priority}</span>}
                <span>{formatDateWindow(rule.effectiveFrom, rule.effectiveTo)}</span>
              </div>
            )}
          </div> */}

          {/* What was matched against */}
          {submittedInput && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Matched against this policy
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div>
                  <span className="text-slate-400">RTO: </span>
                  <span className="text-slate-800">
                    {getOptionLabel('rto', submittedInput.rto) || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Fuel: </span>
                  <span className="text-slate-800">
                    {getOptionLabel('fuelType', submittedInput.fuelType) || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Policy type: </span>
                  <span className="text-slate-800">
                    {getOptionLabel('policyType', submittedInput.policyType) ||
                      '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Case type: </span>
                  <span className="text-slate-800">
                    {getOptionLabel('caseType', submittedInput.caseType) || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Insurer profile */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Why this company
            </p>
            {profile ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-xs text-slate-400">Insurer type</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {profile.type}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-xs text-slate-400">
                      Claim settlement ratio
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      ~{profile.claimSettlementRatio}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-2 col-span-2">
                    <p className="text-xs text-slate-400">
                      Cashless garage network
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {profile.cashlessGarages.toLocaleString('en-IN')}+ garages
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-3">
                  {profile.note}
                </p>
                <p className="text-[11px] text-slate-400 italic mt-2">
                  Figures are representative/illustrative for this demo, not
                  live insurer data.
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No additional insurer profile configured.
              </p>
            )}
          </div>

          {/* Base commission context */}
          {insurer && (
            <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
              {result.precedenceTier === 'insurerDefault'
                ? `This is ${insurer.name}'s base/default commission — no rule for RTO, vehicle parameters, or this agent matched.`
                : `${insurer.name}'s base/default commission (used when no rule matches) is ${insurer.baseCommissionRate}% — this policy qualified for a better-matched rule above.`}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CommissionResultsList({ results, insurers, submittedInput }) {
  const [sortBy, setSortBy] = useState('commission');
  const [detailResult, setDetailResult] = useState(null);

  const sorted = useMemo(() => {
    const copy = [...results];
    if (sortBy === 'commission') {
      copy.sort(
        (a, b) =>
          outcomeNumericValue(b.outcome) - outcomeNumericValue(a.outcome),
      );
    } else {
      copy.sort((a, b) => a.insurerName.localeCompare(b.insurerName));
    }
    return copy;
  }, [results, sortBy]);

  if (results.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">No insurers configured.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        <span className="text-xs text-slate-400 self-center mr-1">
          Sort by:
        </span>
        {[
          { key: 'commission', label: 'Commission' },
          { key: 'insurer', label: 'Insurer name' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              sortBy === opt.key
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((result, idx) => (
          <div
            key={result.insurerId}
            className={`rounded-xl border p-4 bg-white flex flex-col gap-3 ${
              idx === 0 && sortBy === 'commission'
                ? 'border-brand-400 ring-1 ring-brand-200'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                  {result.insurerName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 leading-tight">
                    {result.insurerName}
                  </p>
                  {idx === 0 && sortBy === 'commission' && (
                    <span className="text-[11px] font-semibold text-brand-600">
                      Best rate
                    </span>
                  )}
                </div>
              </div>
              {submittedInput?.premiumAmount ? (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                    Total Premium
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    ₹
                    {Number(submittedInput.premiumAmount).toLocaleString(
                      'en-IN',
                    )}
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <p className="text-2xl font-bold text-slate-900">
                {outcomeLabel(result.outcome)}
              </p>
              <p className="text-xs text-slate-400">
                {result.outcome.type === 'percentage'
                  ? 'of premium'
                  : 'flat commission'}
              </p>
              {result.outcome.type === 'percentage' &&
                (commissionAmount(
                  result.outcome,
                  submittedInput?.premiumAmount,
                ) != null ? (
                  <p className="text-sm font-semibold text-brand-700 mt-1">
                    ₹
                    {commissionAmount(
                      result.outcome,
                      submittedInput?.premiumAmount,
                    ).toLocaleString('en-IN')}{' '}
                    commission
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic mt-1">
                    Enter Premium Amount to see ₹ commission
                  </p>
                ))}
            </div>

            <div className="mt-auto pt-2 border-t border-slate-100 space-y-1.5">
              <Badge tone={TIER_TONE[result.precedenceTier]}>
                {result.precedenceLabel}
              </Badge>
              <p className="text-xs text-slate-500 leading-relaxed">
                {result.reason}
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => setDetailResult(result)}
            >
              View details
            </Button>
          </div>
        ))}
      </div>

      {detailResult && (
        <InsurerDetailModal
          result={detailResult}
          insurer={(insurers || []).find(
            (i) => i.id === detailResult.insurerId,
          )}
          submittedInput={submittedInput}
          onClose={() => setDetailResult(null)}
        />
      )}
    </div>
  );
}
