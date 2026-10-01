import { Fragment, useMemo, useState } from 'react';
import { Card, CardHeader, CardBody } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';
import { Badge } from '../common/Badge.jsx';
import { VehiclePolicyForm } from '../common/VehiclePolicyForm.jsx';
import { useToast } from '../common/ToastContext.jsx';
import { RTO_OPTIONS, getOptionLabel, getModelsForMake } from '../../config/parameters.js';
import { calculatePremium } from '../../engine/calculatePremium.js';
import { apiUrl } from '../../config/api.js';

const initialInput = {
  regNumber: '',
  rto: '',
  vehicleClass: '',
  vehicleSubclass: '',
  vehicleMake: '',
  vehicleModel: '',
  hasRegistrationDate: true,
  registrationDate: '',
  vehicleAge: '',
  policyIssueDate: '',
  fuelType: '',
  cubicCapacity: '',
  seatingCapacity: '',
  idv: '',
  premiumAmount: '',
  policyType: '',
  caseType: '',
  agentId: '',
  zeroDepCover: '',
  paOwnerCover: '',
  isCngLpg: '',
};

const inr = (n) => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—');

const CONFIDENCE = {
  high: { tone: 'green', label: 'Exact match' },
  medium: { tone: 'amber', label: 'Check basis' },
  low: { tone: 'red', label: 'Review needed' },
};

function monthOptions() {
  const now = new Date();
  return [0, 1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    };
  });
}

function formatMonth(value) {
  const m = /^(\d{4})-(\d{2})$/.exec(value || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : value || '—';
}

// The ranked per-company commission table. Used by the Admin calculator and the Agent's Commission Checker.
export function GridQuoteResults({ result, premium, headerAction = null }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <Card>
      <CardHeader
        title="Broker Commission by Company"
        subtitle="Ranked by commission amount, highest first. Each result shows exactly which grid row it came from."
          action={headerAction}
      />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{result.vehicle.class}</Badge>
          <Badge tone="slate">
            {result.vehicle.city ? `${result.vehicle.city}, ` : ''}
            {result.vehicle.state}
          </Badge>
          <Badge tone="slate" className="capitalize">
            {result.vehicle.fuel}
          </Badge>
          <Badge tone="slate" className="capitalize">
            {result.vehicle.cover} cover
          </Badge>
        </div>

        {premium ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
            {[
              ['OD premium', premium.odPremium],
              ['TP premium', premium.tpPremium],
              ['Add-ons', premium.addonPremium],
              ['Net premium', premium.netPremium],
              ['Gross (incl. GST)', premium.grossPremium],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-800">{inr(value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Premium couldn't be calculated (IDV and vehicle class are needed), so only commission rates are shown.
          </p>
        )}

        {result.quotes.length === 0 ? (
          <p className="text-sm text-slate-500">
            None of the uploaded grids has a row matching this vehicle. Check the RTO, class, fuel and policy type.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Company</th>
                  <th className="py-2.5 px-3 font-semibold">Rate</th>
                  <th className="py-2.5 px-3 font-semibold">Applied on</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Commission</th>
                  <th className="py-2.5 px-3 font-semibold">Match</th>
                  <th className="py-2.5 px-3" />
                </tr>
              </thead>
              <tbody>
                {result.quotes.map((q, i) => {
                  const conf = CONFIDENCE[q.confidence] || CONFIDENCE.medium;
                  const open = expanded === q.company;
                  return (
                    <Fragment key={q.company}>
                      <tr className="border-b border-slate-100 align-top hover:bg-slate-50/60">
                        <td className="py-3 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">{q.company}</p>
                          <p className="text-xs text-slate-400">
                            {formatMonth(q.grid.month)} grid
                          </p>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {q.ratePercent !== null && q.ratePercent !== undefined ? `${q.ratePercent}%` : q.rateNote || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {q.basisLabel}
                          {q.premiumBase != null && <p className="text-xs text-slate-400">{inr(q.premiumBase)}</p>}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {q.commission !== null && q.commission !== undefined ? inr(q.commission) : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge tone={conf.tone}>{conf.label}</Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(open ? null : q.company)}>
                            {open ? 'Hide' : 'Details'}
                          </Button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <td />
                          <td colSpan={6} className="py-3 px-3 space-y-2">
                            <p className="text-xs text-slate-500">
                              Matched grid row:{' '}
                              <span className="text-slate-800">
                                {[q.matchedRow.product, q.matchedRow.subProduct, q.matchedRow.policyType, q.matchedRow.rto]
                                  .filter(Boolean)
                                  .join(' · ') || '—'}
                              </span>
                              {q.matchedRow.slab && (
                                <>
                                  {' '}
                                  · slab <span className="text-slate-800">{q.matchedRow.slab}</span>
                                </>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              Why: {q.matchedRow.why.join(', ') || '—'} · from <span className="text-slate-700">{q.grid.fileName}</span>
                            </p>
                            {q.notes.map((n) => (
                              <p key={n} className="text-xs text-amber-700">
                                {n}
                              </p>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {result.unmatched.length > 0 && (
          <p className="text-xs text-slate-500">
            No matching row in: <span className="font-medium text-slate-700">{result.unmatched.map((u) => u.company).join(', ')}</span>
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// Asks the server what each uploaded commission grid pays for this vehicle. Throws with a readable
// message on failure. Shared by the Admin calculator and the Agent's Commission Checker.
export async function fetchGridQuote(input, month) {
  const vehicleAge = Number(input.vehicleAge) || 0;
  const premium = calculatePremium({ ...input, vehicleAge }) || null;
  const rtoLabel = RTO_OPTIONS.find((r) => r.value === input.rto)?.label || '';
  const rtoCity = rtoLabel.includes('—') ? rtoLabel.split('—')[1].trim() : '';
  const modelLabel =
    getModelsForMake(input.vehicleMake).find((m) => m.value === input.vehicleModel)?.label || input.vehicleModel;

  const response = await fetch(apiUrl('/api/grid/quote'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleClass: input.vehicleClass,
      vehicleSubclass: input.vehicleSubclass,
      fuelType: input.fuelType,
      policyType: input.policyType,
      caseType: input.caseType,
      rto: input.rto,
      rtoCity,
      regNumber: input.regNumber,
      ncb: Number(input.ncb) || 0,
      vehicleAge,
      cubicCapacity: Number(input.cubicCapacity) || null,
      vehicleMake: input.vehicleMake ? getOptionLabel('vehicleMake', input.vehicleMake) : '',
      vehicleModel: modelLabel || '',
      month,
      premium,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Could not calculate the commission.');
  return { response: data, premium };
}

// Shared by the Admin and Agent portals: enter a vehicle (RC lookup or manual details) and see
// what each company's uploaded commission grid pays the broker for it. All matching happens on
// the server against the grids stored from the Commission Grid uploads; this component only
// collects the vehicle, computes its premium and renders the answer.
export function GridQuotePanel() {
  const toast = useToast();
  const months = useMemo(monthOptions, []);
  const [input, setInput] = useState(initialInput);
  const [month, setMonth] = useState(months[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [outcome, setOutcome] = useState(null); // { response, premium }

  const hasState = Boolean(input.rto) || /^[A-Za-z]{2}/.test((input.regNumber || '').trim());
  const canSubmit = hasState && input.vehicleClass && input.fuelType && input.policyType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const outcomeData = await fetchGridQuote(input, month);
      setOutcome(outcomeData);
      setExpanded(null);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setOutcome(null);
      toast.error('Quote failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInput(initialInput);
    setOutcome(null);
    setError(null);
  };

  const result = outcome?.response;
  const premium = outcome?.premium;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Grid Commission Calculator"
          subtitle="Enter a vehicle number or its details to see what each uploaded commission grid pays the broker."
        />
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-5">
            <label className="flex flex-col gap-1 max-w-xs">
              <span className="text-xs font-medium text-slate-500">Grid month</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400">
                Uses each company's grid uploaded for this month, or its latest grid if none was uploaded for it.
              </span>
            </label>

            <VehiclePolicyForm value={input} onChange={setInput} agents={[]} showAgentField={false} />
          </CardBody>
          <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={handleReset}>
                Reset
              </Button>
              {!canSubmit && (
                <span className="text-xs text-amber-600">
                  Needs the RTO (or a registration number), vehicle class, fuel type and policy type.
                </span>
              )}
            </div>
            <Button type="submit" variant="primary" disabled={!canSubmit || isLoading}>
              {isLoading ? 'Calculating…' : 'Calculate Commission'}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && <GridQuoteResults result={result} premium={premium} />}
    </div>
  );
}
