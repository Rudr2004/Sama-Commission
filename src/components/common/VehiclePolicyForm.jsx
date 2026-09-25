import { useMemo, useState } from 'react';
import {
  RTO_OPTIONS,
  VEHICLE_CLASSES,
  FUEL_TYPES,
  POLICY_TYPES,
  CASE_TYPES,
  GCV_WEIGHT_BANDS,
  PARAMETERS,
  DEFAULT_FUEL_BY_CLASS,
  getSubclassesForClass,
  getMakesForClass,
  getModelsForMake,
  getFuelTypesForModel,
  getModelSpec,
  getOptionLabel,
} from '../../config/parameters.js';
import { lookupVehicleByRegNumber } from '../../data/rcLookupMock.js';
import { calculateIdv } from '../../engine/calculateIdv.js';
import { FormField, Select, TextInput } from './FormField.jsx';
import { Button } from './Button.jsx';
import { SearchableSelect } from './SearchableSelect.jsx';
import { useToast } from './ToastContext.jsx';
import { UserRtoModal } from './UserRtoModal.jsx';

function calcAgeFromDate(dateStr) {
  if (!dateStr) return '';
  const reg = new Date(dateStr);
  if (Number.isNaN(reg.getTime())) return '';
  const diffMs = Date.now() - reg.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.round(years * 10) / 10);
}

// Addon toggles rendered in their own "Addons" section, matching the
// dedicated entry-form layout rather than the generic extras grid.
const ADDON_KEYS = ['zeroDepCover', 'paOwnerCover', 'isCngLpg'];

// Additional/extensible parameters are anything in the config registry
// that isn't one of the core dedicated fields or a dedicated addon.
const CORE_KEYS = [
  'rto',
  'vehicleClass',
  'vehicleSubclass',
  'vehicleMake',
  'vehicleModel',
  'fuelType',
  'cubicCapacity',
  'seatingCapacity',
  'weightBand',
  'vehicleAge',
  'idv',
  'premiumAmount',
  'policyType',
  'caseType',
  'agentId',
  ...ADDON_KEYS,
];
const EXTRA_PARAMETERS = PARAMETERS.filter((p) => !CORE_KEYS.includes(p.key));
const ADDON_PARAMETERS = PARAMETERS.filter((p) => ADDON_KEYS.includes(p.key));

export function VehiclePolicyForm({ value, onChange, agents, showAgentField = true }) {
  const toast = useToast();
  const [regLookupInput, setRegLookupInput] = useState('');
  const [lookupState, setLookupState] = useState('idle'); // 'idle' | 'found' | 'not_found'
  const [userRtoModalOpen, setUserRtoModalOpen] = useState(false);

  // 'vehicle' = User RTO is the same as the vehicle's registered RTO (the
  // rto field as populated by RC lookup or manual entry) — the default.
  // 'user' = the policyholder's current RTO differs from where the vehicle
  // is registered, so it's collected separately via a popup so the two
  // never get conflated.
  const rtoType = value.rtoType || 'vehicle';

  const subclasses = useMemo(() => getSubclassesForClass(value.vehicleClass), [value.vehicleClass]);
  const makes = useMemo(() => getMakesForClass(value.vehicleClass), [value.vehicleClass]);
  const models = useMemo(() => getModelsForMake(value.vehicleMake), [value.vehicleMake]);
  const availableFuelTypes = useMemo(
    () => (value.vehicleModel ? getFuelTypesForModel(value.vehicleMake, value.vehicleModel) : FUEL_TYPES.map((f) => f.value)),
    [value.vehicleMake, value.vehicleModel]
  );
  const modelSpec = useMemo(() => getModelSpec(value.vehicleMake, value.vehicleModel), [value.vehicleMake, value.vehicleModel]);

  // "Is CNG/LPG Fitted" only makes sense for models that support a CNG
  // variant/retrofit AND when the selected fuel type isn't already CNG
  // itself (in which case the question is redundant — it's already CNG).
  // This is a policy addon selection only — it does not affect IDV, which
  // is purely ex-showroom price x (1 - age-based depreciation).
  const isCngLpgApplicable = Boolean(availableFuelTypes.includes('cng') && value.fuelType !== 'cng');

  const estimatedIdv = useMemo(
    () =>
      modelSpec?.exShowroomPrice
        ? calculateIdv(modelSpec.exShowroomPrice, value.vehicleAge, { vehicleClass: value.vehicleClass })
        : null,
    [modelSpec, value.vehicleAge, value.vehicleClass]
  );

  // GCV Weight Band (GVW) only applies to Goods Carrying vehicles — real
  // broker payout grids key GCV commission off this, not PC/TW/PCV/MISC-D.
  const isWeightBandApplicable = value.vehicleClass === 'commercial_gcv';

  const hasRegistrationDate = value.hasRegistrationDate !== false;

  const set = (patch) => onChange({ ...value, ...patch });

  const handleClassChange = (vehicleClass) => {
    const defaultFuel = DEFAULT_FUEL_BY_CLASS[vehicleClass];
    set({
      vehicleClass,
      vehicleSubclass: '',
      vehicleMake: '',
      vehicleModel: '',
      isCngLpg: 'no',
      weightBand: '',
      ...(defaultFuel ? { fuelType: defaultFuel } : { fuelType: '' }),
    });
  };

  const handleMakeChange = (vehicleMake) => {
    set({ vehicleMake, vehicleModel: '', fuelType: '', isCngLpg: 'no', weightBand: '' });
  };

  const handleModelChange = (vehicleModel) => {
    const fuelOptions = getFuelTypesForModel(value.vehicleMake, vehicleModel);
    const spec = getModelSpec(value.vehicleMake, vehicleModel);
    const nextFuelType = fuelOptions.length === 1 ? fuelOptions[0] : '';
    const cngApplicable = fuelOptions.includes('cng') && nextFuelType !== 'cng';
    const nextIsCngLpg = cngApplicable ? value.isCngLpg : 'no';
    const idv = spec?.exShowroomPrice
      ? calculateIdv(spec.exShowroomPrice, value.vehicleAge, { vehicleClass: value.vehicleClass })
      : '';
    set({
      vehicleModel,
      fuelType: nextFuelType,
      cubicCapacity: spec?.cubicCapacity ?? value.cubicCapacity,
      seatingCapacity: spec?.seatingCapacity ?? value.seatingCapacity,
      idv: idv || value.idv,
      weightBand: spec?.weightBand ?? value.weightBand,
      isCngLpg: nextIsCngLpg,
    });
  };

  const handleFuelTypeChange = (fuelType) => {
    const cngApplicable = availableFuelTypes.includes('cng') && fuelType !== 'cng';
    const nextIsCngLpg = cngApplicable ? value.isCngLpg : 'no';
    const idv = modelSpec?.exShowroomPrice
      ? calculateIdv(modelSpec.exShowroomPrice, value.vehicleAge, { vehicleClass: value.vehicleClass })
      : '';
    set({ fuelType, isCngLpg: nextIsCngLpg, ...(idv ? { idv } : {}) });
  };

  const handleCngLpgChange = (isCngLpg) => {
    set({ isCngLpg });
  };

  const handleRegistrationDate = (registrationDate) => {
    const vehicleAge = calcAgeFromDate(registrationDate);
    const idv = modelSpec?.exShowroomPrice
      ? calculateIdv(modelSpec.exShowroomPrice, vehicleAge, { vehicleClass: value.vehicleClass })
      : '';
    set({ registrationDate, vehicleAge, ...(idv ? { idv } : {}) });
  };

  const handleHasRegistrationDateToggle = (checked) => {
    set({ hasRegistrationDate: checked, ...(checked ? {} : { registrationDate: '', vehicleAge: '' }) });
  };

  // `differentUserRto` = the "User RTO is different from Vehicle RTO"
  // checkbox. Unchecked (default) -> User RTO always equals Vehicle RTO,
  // no separate entry needed. Checked -> the policyholder's current RTO is
  // collected separately via a popup.
  const handleDifferentUserRtoToggle = (checked) => {
    if (!checked) {
      // Restore the vehicle's own registered RTO (tracked separately so it
      // isn't lost while a User RTO was in effect).
      set({ rtoType: 'vehicle', rto: value.vehicleRto || value.rto || '' });
    } else {
      set({ rtoType: 'user', vehicleRto: value.vehicleRto || value.rto || '' });
      setUserRtoModalOpen(true);
    }
  };

  const handleUserRtoSave = (details) => {
    set({
      rtoType: 'user',
      rto: details.rto,
      userPincode: details.pincode,
      userCity: details.city,
      userState: details.state,
      userAddressLine: details.addressLine,
    });
    setUserRtoModalOpen(false);
  };

  const handleRcLookup = () => {
    const record = lookupVehicleByRegNumber(regLookupInput);
    if (!record) {
      setLookupState('not_found');
      toast.error('Vehicle not found', `No RC record for "${regLookupInput}". Enter the details manually below.`);
      return;
    }
    setLookupState('found');
    const spec = getModelSpec(record.vehicleMake, record.vehicleModel);
    const recordFuelOptions = getFuelTypesForModel(record.vehicleMake, record.vehicleModel);
    const vehicleAge = calcAgeFromDate(record.registrationDate);
    const cngApplicable = recordFuelOptions.includes('cng') && record.fuelType !== 'cng';
    const nextIsCngLpg = cngApplicable ? record.lastIsCngLpg || value.isCngLpg : 'no';
    const idv = spec?.exShowroomPrice
      ? calculateIdv(spec.exShowroomPrice, vehicleAge, { vehicleClass: record.vehicleClass })
      : '';
    set({
      regNumber: record.regNumber,
      vehicleClass: record.vehicleClass,
      vehicleSubclass: record.vehicleSubclass,
      vehicleMake: record.vehicleMake,
      vehicleModel: record.vehicleModel,
      fuelType: record.fuelType,
      cubicCapacity: spec?.cubicCapacity ?? value.cubicCapacity,
      seatingCapacity: spec?.seatingCapacity ?? value.seatingCapacity,
      hasRegistrationDate: true,
      registrationDate: record.registrationDate,
      vehicleAge,
      vehicleRto: record.rto,
      ...(rtoType === 'vehicle' ? { rto: record.rto } : {}),
      idv: idv || value.idv,
      weightBand: spec?.weightBand ?? value.weightBand,
      isCngLpg: nextIsCngLpg,
      // Vehicles old enough to already carry a prior policy expose it as
      // lastPolicyIssueDate/lastPolicyType/lastNcb/lastZeroDepCover/
      // lastPaOwnerCover/lastAgentId/lastInsurerId — auto-fill Policy
      // Details, Addons, the servicing agent & prior insurer from that
      // policy, and default to a renewal case since that's what it implies.
      // previousInsurerId is kept separate from any "insurerId" field since
      // the commission checker evaluates every insurer, not one chosen one —
      // this only records which insurer the prior/expiring policy was with.
      ...(record.lastPolicyIssueDate
        ? {
            policyIssueDate: record.lastPolicyIssueDate,
            policyType: record.lastPolicyType || value.policyType,
            caseType: value.caseType || 'renewal',
            ncb: record.lastNcb ?? value.ncb,
            zeroDepCover: record.lastZeroDepCover || value.zeroDepCover,
            paOwnerCover: record.lastPaOwnerCover || value.paOwnerCover,
            previousInsurerId: record.lastInsurerId || value.previousInsurerId,
            ...(showAgentField && record.lastAgentId && agents?.some((a) => a.id === record.lastAgentId)
              ? { agentId: value.agentId || record.lastAgentId }
              : {}),
          }
        : {}),
    });
    toast.success(
      'Vehicle found',
      record.lastPolicyIssueDate
        ? 'Auto-filled from RC lookup, including its prior policy details — every field below stays editable.'
        : 'Auto-filled from RC lookup — every field below stays editable.'
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4">
        <h3 className="text-sm font-semibold text-slate-800">RC Lookup (auto-fill)</h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-3">
          Enter a registration number to auto-fill the vehicle fields below. Everything stays manually editable —
          use this as a shortcut, not a requirement.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
          <div className="flex-1">
            <TextInput
              value={regLookupInput}
              onChange={(e) => {
                setRegLookupInput(e.target.value);
                setLookupState('idle');
              }}
              placeholder="e.g. MH12AB1234"
            />
          </div>
          <Button type="button" variant="primary" onClick={handleRcLookup} disabled={!regLookupInput.trim()}>
            Fetch Details
          </Button>
        </div>
        {lookupState === 'not_found' && (
          <p className="text-xs text-red-600 mt-2">No RC record found for this number — fill the fields below manually.</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Vehicle Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Vehicle class" required>
            <Select value={value.vehicleClass || ''} onChange={(e) => handleClassChange(e.target.value)}>
              <option value="">Select class…</option>
              {VEHICLE_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Policy issue date" required>
            <TextInput
              type="date"
              value={value.policyIssueDate || ''}
              onChange={(e) => set({ policyIssueDate: e.target.value })}
            />
          </FormField>

          <FormField label="Motor company (Make)" required hint="Vehicle manufacturer">
            <Select value={value.vehicleMake || ''} onChange={(e) => handleMakeChange(e.target.value)} disabled={!value.vehicleClass}>
              <option value="">Select company…</option>
              {makes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Model" required>
            <Select value={value.vehicleModel || ''} onChange={(e) => handleModelChange(e.target.value)} disabled={!value.vehicleMake}>
              <option value="">Select model…</option>
              {models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Vehicle subclass">
            <Select
              value={value.vehicleSubclass || ''}
              onChange={(e) => set({ vehicleSubclass: e.target.value })}
              disabled={!value.vehicleClass}
            >
              <option value="">Select subclass…</option>
              {subclasses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Fuel type"
            required
            hint={value.vehicleModel ? undefined : 'Select a model to see the fuel types it is actually available in'}
          >
            <Select value={value.fuelType || ''} onChange={(e) => handleFuelTypeChange(e.target.value)} disabled={!value.vehicleModel}>
              <option value="">Select fuel type…</option>
              {FUEL_TYPES.filter((f) => availableFuelTypes.includes(f.value)).map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Cubic capacity (cc)" required>
            <TextInput
              type="number"
              value={value.cubicCapacity || ''}
              onChange={(e) => set({ cubicCapacity: e.target.value })}
              placeholder="e.g. 1197"
            />
          </FormField>
          <FormField label="Seating capacity" required>
            <TextInput
              type="number"
              value={value.seatingCapacity || ''}
              onChange={(e) => set({ seatingCapacity: e.target.value })}
              placeholder="e.g. 5"
            />
          </FormField>

          {isWeightBandApplicable && (
            <FormField
              label="GCV Weight Band (GVW)"
              required
              hint="Gross Vehicle Weight — the dimension broker payout grids key GCV commission off"
            >
              <Select value={value.weightBand || ''} onChange={(e) => set({ weightBand: e.target.value })}>
                <option value="">Select weight band…</option>
                {GCV_WEIGHT_BANDS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="Vehicle registration number" hint="Free text, for reference only">
            <TextInput
              value={value.regNumber || ''}
              onChange={(e) => set({ regNumber: e.target.value })}
              placeholder="e.g. GJ01AB1234"
            />
          </FormField>
          <FormField
            label="IDV (₹, Insured Declared Value)"
            hint={
              estimatedIdv && Number(value.idv) !== estimatedIdv
                ? `Estimated from ${getOptionLabel('vehicleMake', value.vehicleMake) || 'model'} ex-showroom price & age: ₹${estimatedIdv.toLocaleString('en-IN')} — edit if needed`
                : `Auto-estimated from company/model price & age; editable`
            }
            infoTooltip={
              'IDV = Ex-Showroom Price × (1 − Depreciation Rate)\n\n' +
              'Depreciation by vehicle age (Private Car / Two-Wheeler):\n' +
              '≤6mo 5% · 6mo-1yr 15% · 1-2yr 20% · 2-3yr 30% · 3-4yr 40% · 4-5yr 50%\n\n' +
              'Commercial (GCV/PCV) & MISC-D use a flatter schedule:\n' +
              '≤1yr 10% · 1-2yr 15% · 2-3yr 20% · 3-4yr 28% · 4-5yr 35% · 5-7yr 42% · beyond 45%'
            }
          >
            <TextInput
              type="number"
              value={value.idv || ''}
              onChange={(e) => set({ idv: e.target.value })}
              placeholder="e.g. 507500"
            />
          </FormField>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Registration Details</h3>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 mb-3">
          <input
            type="checkbox"
            checked={hasRegistrationDate}
            onChange={(e) => handleHasRegistrationDateToggle(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Has Registration Date?
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hasRegistrationDate && (
            <>
              <FormField label="Registration date" required hint="Vehicle age is derived automatically">
                <TextInput
                  type="date"
                  value={value.registrationDate || ''}
                  onChange={(e) => handleRegistrationDate(e.target.value)}
                />
              </FormField>
              <FormField label="Vehicle age (years)" hint="Derived from registration date — not directly editable">
                <TextInput
                  type="number"
                  step="0.1"
                  value={value.vehicleAge ?? ''}
                  readOnly
                  disabled
                  placeholder="Auto-filled from registration date"
                />
              </FormField>
            </>
          )}
          <FormField label="RTO (Vehicle)" required>
            <SearchableSelect
              value={rtoType === 'vehicle' ? value.rto || '' : value.vehicleRto || ''}
              onChange={(rto) => (rtoType === 'vehicle' ? set({ rto }) : set({ vehicleRto: rto }))}
              options={RTO_OPTIONS}
              placeholder="Select RTO…"
            />
          </FormField>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={rtoType === 'user'}
            onChange={(e) => handleDifferentUserRtoToggle(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          User RTO is different from Vehicle RTO
          <span className="text-xs text-slate-400">(policyholder's current RTO, if different)</span>
        </label>

        {rtoType === 'user' && (
          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">Policyholder's current address (User RTO: {getOptionLabel('rto', value.rto) || 'not set'})</p>
              <p>
                {[value.userAddressLine, value.userCity, value.userState, value.userPincode].filter(Boolean).join(', ') ||
                  'Not entered yet'}
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => setUserRtoModalOpen(true)}>
              Edit Address
            </Button>
          </div>
        )}
      </div>

      {userRtoModalOpen && (
        <UserRtoModal
          initialDetails={{
            pincode: value.userPincode,
            city: value.userCity,
            state: value.userState,
            addressLine: value.userAddressLine,
            rto: value.rto,
          }}
          onSave={handleUserRtoSave}
          onClose={() => setUserRtoModalOpen(false)}
        />
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Policy Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Policy type" required>
            <Select value={value.policyType || ''} onChange={(e) => set({ policyType: e.target.value })}>
              <option value="">Select policy type…</option>
              {POLICY_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Case type" required>
            <Select value={value.caseType || ''} onChange={(e) => set({ caseType: e.target.value })}>
              <option value="">Select case type…</option>
              {CASE_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
          {showAgentField && (
            <FormField label="Agent" required hint="Determines whether an agent-specific override applies">
              <Select value={value.agentId || ''} onChange={(e) => set({ agentId: e.target.value })}>
                <option value="">Select agent…</option>
                {(agents || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Addons</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ADDON_PARAMETERS.map((param) => {
            if (param.key === 'isCngLpg') {
              return (
                <FormField
                  key={param.key}
                  label={param.label}
                  required={isCngLpgApplicable}
                  hint={
                    isCngLpgApplicable
                      ? 'Aftermarket CNG/LPG kit fitted to this vehicle'
                      : value.vehicleModel
                        ? 'Not applicable — select a model/fuel combination that supports a CNG retrofit'
                        : 'Select a model to see if this applies'
                  }
                >
                  <Select
                    value={isCngLpgApplicable ? value.isCngLpg || '' : 'no'}
                    onChange={(e) => handleCngLpgChange(e.target.value)}
                    disabled={!isCngLpgApplicable}
                  >
                    <option value="">Select…</option>
                    {param.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              );
            }
            return (
              <FormField key={param.key} label={param.label} required>
                <Select value={value[param.key] || ''} onChange={(e) => set({ [param.key]: e.target.value })}>
                  <option value="">Select…</option>
                  {param.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            );
          })}
        </div>
      </div>

      {EXTRA_PARAMETERS.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Additional parameters</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXTRA_PARAMETERS.map((param) => (
              <FormField key={param.key} label={param.label}>
                {param.options ? (
                  <Select value={value[param.key] || ''} onChange={(e) => set({ [param.key]: e.target.value })}>
                    <option value="">Select…</option>
                    {param.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <TextInput
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={value[param.key] || ''}
                    onChange={(e) => set({ [param.key]: e.target.value })}
                  />
                )}
              </FormField>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
