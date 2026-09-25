import { useState } from 'react';
import { Card, CardHeader, CardBody } from './Card.jsx';
import { Badge } from './Badge.jsx';
import { Button } from './Button.jsx';
import { getOptionLabel, getModelsForMake } from '../../config/parameters.js';
import { calculatePremium } from '../../engine/calculatePremium.js';

function modelLabel(makeValue, modelValue) {
  if (!makeValue || !modelValue) return null;
  const model = getModelsForMake(makeValue).find((m) => m.value === modelValue);
  return model ? model.label : modelValue;
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

// A motor policy runs exactly 1 year from its issue date (matches the real
// issued-policy records in seedPolicies: periodFrom = issueDate, periodTo =
// issueDate + 1yr - 1 day).
function derivePolicyPeriod(policyIssueDate) {
  if (!policyIssueDate) return null;
  const start = new Date(policyIssueDate);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function describeExpiry(end) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((endDay.getTime() - today.getTime()) / MS_PER_DAY);

  if (diffDays < 0) {
    const agoDays = Math.abs(diffDays);
    if (agoDays >= 60) {
      const months = Math.floor(agoDays / 30);
      return { text: `Expired ${months} month${months === 1 ? '' : 's'} ago`, tone: 'red' };
    }
    return { text: `Expired ${agoDays} day${agoDays === 1 ? '' : 's'} ago`, tone: 'red' };
  }
  if (diffDays === 0) return { text: 'Expires today', tone: 'amber' };
  if (diffDays <= 30) return { text: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`, tone: 'amber' };
  return { text: `Expires ${end.toISOString().slice(0, 10)}`, tone: 'green' };
}

export function PolicyInputSummary({ input, insurers }) {
  const [expanded, setExpanded] = useState(false);

  const previousInsurerName = insurers?.find((i) => i.id === input.previousInsurerId)?.name;

  const addonBadges = [
    input.zeroDepCover === 'yes' && 'Zero Dep Cover',
    input.paOwnerCover === 'yes' && 'PA Owner Cover',
    input.isCngLpg === 'yes' && 'CNG/LPG Fitted',
  ].filter(Boolean);

  const period = derivePolicyPeriod(input.policyIssueDate);
  const expiry = period ? describeExpiry(period.end) : null;
  // A renewal case means RC lookup (or manual entry) found/recorded a prior
  // policy on this vehicle — surface its live/expired status prominently,
  // since that's the whole reason this is a renewal and not a fresh policy.
  const isRenewal = input.caseType === 'renewal';
  const isExpired = expiry?.tone === 'red';

  // Same breakdown engine used by InsurerDetailModal — insurer-agnostic, so
  // it belongs here rather than duplicated per insurer card.
  const breakdown = calculatePremium(input);

  return (
    <Card>
      <CardHeader
        title="Your Vehicle & Policy"
        subtitle="Quote generated for the following details."
        action={
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Hide Details' : 'Show Details'}
          </Button>
        }
      />
      {isRenewal && period && (
        <div
          className={`mx-5 mt-4 rounded-lg border px-4 py-3 flex items-start justify-between gap-4 flex-wrap ${
            isExpired ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div>
            <p className={`text-sm font-semibold ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}>
              {isExpired ? 'Expired Policy on Record' : 'Existing Policy — Active'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {period.start.toISOString().slice(0, 10)} → {period.end.toISOString().slice(0, 10)}
              {getOptionLabel('policyType', input.policyType) ? ` · ${getOptionLabel('policyType', input.policyType)}` : ''}
              {previousInsurerName ? ` · ${previousInsurerName}` : ''}
            </p>
          </div>
          <Badge tone={expiry.tone}>{expiry.text}</Badge>
        </div>
      )}
      <CardBody>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Fact label="Motor company" value={getOptionLabel('vehicleMake', input.vehicleMake)} />
          <Fact label="Model" value={modelLabel(input.vehicleMake, input.vehicleModel)} />
          <Fact label="Vehicle class" value={getOptionLabel('vehicleClass', input.vehicleClass)} />
          <Fact label="Subclass" value={getOptionLabel('vehicleSubclass', input.vehicleSubclass)} />
          <Fact label="Registration no." value={input.regNumber} />
          <Fact label="RTO" value={getOptionLabel('rto', input.rto)} />
          <Fact label="Fuel type" value={getOptionLabel('fuelType', input.fuelType)} />
          <Fact label="Cubic capacity" value={input.cubicCapacity ? `${input.cubicCapacity} cc` : null} />
          <Fact label="Seating capacity" value={input.seatingCapacity ? `${input.seatingCapacity}` : null} />
          <Fact label="Registration date" value={input.hasRegistrationDate === false ? 'Not registered yet' : input.registrationDate} />
          <Fact label="Vehicle age" value={input.hasRegistrationDate !== false && input.vehicleAge !== '' ? `${input.vehicleAge} yrs` : null} />
          <Fact label="Policy issue date" value={input.policyIssueDate} />
          <Fact label="Policy start date" value={period ? period.start.toISOString().slice(0, 10) : null} />
          <div>
            {period && (
              <>
                <p className="text-xs text-slate-400">Policy end date</p>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 flex-wrap">
                  {period.end.toISOString().slice(0, 10)}
                  <Badge tone={expiry.tone}>{expiry.text}</Badge>
                </p>
              </>
            )}
          </div>
          <Fact label="Policy type" value={getOptionLabel('policyType', input.policyType)} />
          <Fact label="Case type" value={getOptionLabel('caseType', input.caseType)} />
          <Fact label="Previous insurer" value={previousInsurerName} />
          <Fact label="NCB slab" value={input.ncb ? `${input.ncb}%` : null} />
          <Fact label="IDV" value={input.idv ? `₹${Number(input.idv).toLocaleString('en-IN')}` : null} />
          <Fact label="Premium amount" value={input.premiumAmount ? `₹${Number(input.premiumAmount).toLocaleString('en-IN')}` : null} />
        </div>

        {addonBadges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-1.5">Addons selected</p>
            <div className="flex flex-wrap gap-1.5">
              {addonBadges.map((label) => (
                <Badge key={label} tone="violet">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {expanded && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-5">
            {breakdown && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Premium breakdown</p>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-2 text-sm">
                    <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">Own Damage Premium (A)</div>
                    <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                      ₹{breakdown.odPremium.toLocaleString('en-IN')}
                    </div>
                    <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">Liability / TP Premium (B)</div>
                    <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                      ₹{breakdown.tpPremium.toLocaleString('en-IN')}
                    </div>
                    {breakdown.addonPremium > 0 && (
                      <>
                        <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">Add-on Premium</div>
                        <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                          ₹{breakdown.addonPremium.toLocaleString('en-IN')}
                        </div>
                      </>
                    )}
                    <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">Net Premium</div>
                    <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                      ₹{breakdown.netPremium.toLocaleString('en-IN')}
                    </div>
                    <div className="px-3 py-2 border-b border-r border-slate-100 text-slate-500">GST (18%)</div>
                    <div className="px-3 py-2 border-b border-slate-100 text-right font-medium text-slate-800">
                      ₹{breakdown.gstAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="px-3 py-2 border-r border-slate-100 bg-slate-50 font-semibold text-slate-700">Total Paid Premium</div>
                    <div className="px-3 py-2 bg-slate-50 text-right font-semibold text-slate-900">
                      ₹{breakdown.grossPremium.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic mt-2">
                  Auto-calculated: OD Premium = IDV × ~3.5% rate (less NCB) — TP Premium = fixed IRDAI-tariff-structured slab by
                  vehicle class/cc — GST 18%.
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">What this policy includes</p>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">Own Damage cover</span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {getOptionLabel('policyType', input.policyType) || '—'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">Third Party Liability</span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    Death/bodily injury: unlimited (statutory) · Property damage: up to ₹7.5 lakhs
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">PA Cover for Owner-Driver</span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {input.paOwnerCover === 'yes' ? 'Included — up to ₹15 lakhs' : 'Not opted'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">Zero Depreciation Cover</span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {input.zeroDepCover === 'yes' ? 'Included' : 'Not opted'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">CNG/LPG Kit Fitted</span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {input.isCngLpg === 'yes' ? 'Declared — covered under OD' : 'No'}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">No Claim Bonus (NCB)</span>
                  <span className="text-sm text-slate-800 font-medium text-right">
                    {input.ncb ? `${input.ncb}% — applies to OD premium only` : 'Not applied'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic mt-2">
                Driver's clause: covers any person, including the insured, holding an effective driving licence at the time of
                the accident. Standard exclusions apply — hire/reward, organized racing, speed testing, and use in connection
                with motor trade are not covered.
              </p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
