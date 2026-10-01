import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { evaluateCommission } from '../../engine/evaluateCommission.js';
import { calculatePremium } from '../../engine/calculatePremium.js';
import { VehiclePolicyForm } from '../../components/common/VehiclePolicyForm.jsx';
import { CommissionResultsList } from '../../components/common/CommissionResultsList.jsx';
import { PolicyInputSummary } from '../../components/common/PolicyInputSummary.jsx';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { InfoPanel } from '../../components/common/InfoPanel.jsx';
import { GridQuoteResults, fetchGridQuote } from '../../components/gridQuote/GridQuotePanel.jsx';

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

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function AgentPortal() {
  const { state, setCommissionCheckerSession } = useStore();

  // Persisted in the global store (not local component state) so the
  // entered vehicle details and computed results survive navigating away
  // to another tab and back — only cleared by an explicit Reset.
  const session = state.commissionCheckerSession;
  const input = session?.input ?? initialInput;
  const results = session?.results ?? null;
  const submittedInput = session?.submittedInput ?? null;

  // Broker commission from the uploaded commission grids, shown below the rule-based results for
  // the same vehicle. Failures here never affect the existing results above it.
  const [gridMonth, setGridMonth] = useState(currentMonthValue);
  const [gridState, setGridState] = useState({ loading: false, error: null, outcome: null });
  const gridMonths = useMemo(() => {
    const now = new Date();
    return [0, 1].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return {
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      };
    });
  }, []);

  const loadGridQuote = async (vehicleInput, month) => {
    setGridState({ loading: true, error: null, outcome: null });
    try {
      const outcome = await fetchGridQuote(vehicleInput, month);
      setGridState({ loading: false, error: null, outcome });
    } catch (err) {
      setGridState({ loading: false, error: err.message || 'Could not load grid commission.', outcome: null });
    }
  };

  // The checker's results survive navigating between tabs; re-fetch the grid part when coming back.
  useEffect(() => {
    if (submittedInput) loadGridQuote(submittedInput, gridMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setInput = (nextInput) => {
    setCommissionCheckerSession({ input: nextInput, results, submittedInput });
  };

  const canSubmit =
    input.rto &&
    input.vehicleClass &&
    input.vehicleMake &&
    input.vehicleModel &&
    input.fuelType &&
    input.cubicCapacity &&
    input.seatingCapacity &&
    input.policyType &&
    input.caseType &&
    input.policyIssueDate &&
    input.zeroDepCover &&
    input.paOwnerCover &&
    input.isCngLpg &&
    input.agentId &&
    (input.hasRegistrationDate === false || input.registrationDate);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = { ...input, vehicleAge: Number(input.vehicleAge) || 0 };
    const premium = calculatePremium(normalized);
    const withPremium = { ...normalized, premiumAmount: premium?.grossPremium ?? '' };
    const nextResults = evaluateCommission(withPremium, state.insurers, state.rules, state.agentOverrides);
    setCommissionCheckerSession({ input, results: nextResults, submittedInput: withPremium });
    loadGridQuote(withPremium, gridMonth);
  };

  const handleReset = () => {
    setCommissionCheckerSession(null);
    setGridState({ loading: false, error: null, outcome: null });
  };

  return (
    <div className="space-y-6">
      <InfoPanel />

      <Card>
        <CardHeader
          title="Vehicle & Policy Entry"
          subtitle="Enter the vehicle and policy details to instantly see applicable insurers and commission rates."
        />
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-5">
            <VehiclePolicyForm value={input} onChange={setInput} agents={state.agents} />
          </CardBody>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-between items-center">
            <Button type="button" variant="ghost" onClick={handleReset}>
              Reset
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              Check Commission
            </Button>
          </div>
        </form>
      </Card>

      {results && submittedInput && (
        <>
          <PolicyInputSummary input={submittedInput} insurers={state.insurers} />

          <Card>
            <CardHeader
              title="Eligible Insurers & Commission"
              subtitle="Every rate shown here is traceable to a specific rule — see the reason under each card."
            />
            <CardBody>
              <CommissionResultsList results={results} insurers={state.insurers} submittedInput={submittedInput} />
            </CardBody>
          </Card>

          {gridState.loading && (
            <Card>
              <CardBody>
                <p className="text-sm text-slate-500">Calculating broker commission from the uploaded grids…</p>
              </CardBody>
            </Card>
          )}
          {gridState.error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Grid commission isn't available right now: {gridState.error}
            </div>
          )}
          {gridState.outcome && (
            <GridQuoteResults
              result={gridState.outcome.response}
              premium={gridState.outcome.premium}
              headerAction={
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Grid month</span>
                  <select
                    value={gridMonth}
                    onChange={(e) => {
                      setGridMonth(e.target.value);
                      loadGridQuote(submittedInput, e.target.value);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {gridMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              }
            />
          )}
        </>
      )}
    </div>
  );
}
