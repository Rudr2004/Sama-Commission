import { useStore } from '../../store/StoreContext.jsx';
import { evaluateCommission } from '../../engine/evaluateCommission.js';
import { calculatePremium } from '../../engine/calculatePremium.js';
import { VehiclePolicyForm } from '../../components/common/VehiclePolicyForm.jsx';
import { CommissionResultsList } from '../../components/common/CommissionResultsList.jsx';
import { PolicyInputSummary } from '../../components/common/PolicyInputSummary.jsx';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { InfoPanel } from '../../components/common/InfoPanel.jsx';

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

export function AgentPortal() {
  const { state, setCommissionCheckerSession } = useStore();

  // Persisted in the global store (not local component state) so the
  // entered vehicle details and computed results survive navigating away
  // to another tab and back — only cleared by an explicit Reset.
  const session = state.commissionCheckerSession;
  const input = session?.input ?? initialInput;
  const results = session?.results ?? null;
  const submittedInput = session?.submittedInput ?? null;

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
  };

  const handleReset = () => {
    setCommissionCheckerSession(null);
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
        </>
      )}
    </div>
  );
}
