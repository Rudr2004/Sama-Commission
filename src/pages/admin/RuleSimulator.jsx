import { useState } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { evaluateCommission } from '../../engine/evaluateCommission.js';
import { calculatePremium } from '../../engine/calculatePremium.js';
import { VehiclePolicyForm } from '../../components/common/VehiclePolicyForm.jsx';
import { CommissionResultsList } from '../../components/common/CommissionResultsList.jsx';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';

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

export function RuleSimulator() {
  const { state } = useStore();
  const [input, setInput] = useState(initialInput);
  const [results, setResults] = useState(null);
  const [submittedInput, setSubmittedInput] = useState(null);

  const canSubmit = input.rto && input.vehicleClass && input.fuelType && input.policyType;

  const handleRun = (e) => {
    e.preventDefault();
    const normalized = { ...input, vehicleAge: Number(input.vehicleAge) || 0 };
    const premium = calculatePremium(normalized);
    const withPremium = { ...normalized, premiumAmount: premium?.grossPremium ?? '' };
    setResults(evaluateCommission(withPremium, state.insurers, state.rules, state.agentOverrides));
    setSubmittedInput(withPremium);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Rule Testing / Simulation Panel"
          subtitle="Preview how a sample vehicle/policy would be quoted before publishing rule changes to agents."
        />
        <form onSubmit={handleRun}>
          <CardBody className="space-y-5">
            <VehiclePolicyForm value={input} onChange={setInput} agents={state.agents} />
          </CardBody>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-between items-center">
            <p className="text-xs text-slate-400">
              {state.rules.filter((r) => r.active).length} active rule(s) · {state.agentOverrides.length} agent override(s)
            </p>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              Run Simulation
            </Button>
          </div>
        </form>
      </Card>

      {results && submittedInput && (
        <Card>
          <CardHeader title="Simulated Results" subtitle="This is exactly what an agent would see for this input." />
          <CardBody>
            <CommissionResultsList results={results} insurers={state.insurers} submittedInput={submittedInput} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
