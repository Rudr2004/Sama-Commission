import { useState } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { VEHICLE_CLASSES, FUEL_TYPES, POLICY_TYPES, RTO_OPTIONS } from '../../config/parameters.js';
import { useToast } from '../../components/common/ToastContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { FormField, TextInput, Select } from '../../components/common/FormField.jsx';

function emptyPolicy() {
  return {
    insurerId: '',
    policyNumber: '',
    certificateNumber: '',
    category: '',
    policyType: '',

    cubicCapacity: '',
    seatingCapacity: '',
    rto: '',
    fuelType: '',

    idv: '',
    idvVehicle: '',
    idvAccessories: '',
    idvElectricalFittings: '',
    idvNonElectricalFittings: '',

    odPremium: '',
    tpPremium: '',
    addonPremium: '',
    gstPercent: '18',
    totalDiscountPercent: '',

    ncbPercent: '',

    policyIssueDate: '',
    periodFrom: '',
    periodTo: '',

    claimSettlementRatio: '',
    cashlessGarages: '',
    active: true,
  };
}

function flattenPolicy(policy) {
  return {
    ...emptyPolicy(),
    ...policy,
    idvVehicle: policy.idvBreakup?.vehicle ?? '',
    idvAccessories: policy.idvBreakup?.accessories ?? '',
    idvElectricalFittings: policy.idvBreakup?.electricalFittings ?? '',
    idvNonElectricalFittings: policy.idvBreakup?.nonElectricalFittings ?? '',
    odPremium: policy.premium?.odPremium ?? '',
    tpPremium: policy.premium?.tpPremium ?? '',
    addonPremium: policy.premium?.addonPremium ?? '',
    gstPercent: policy.premium?.gstPercent ?? '18',
    totalDiscountPercent: policy.premium?.totalDiscountPercent ?? '',
  };
}

// A numbered-section wrapper so the long form reads as a guided sequence
// rather than one flat wall of fields — mirrors the step feel of a real
// policy-issuance workflow.
function Section({ step, title, description, children }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-start gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

export function PolicyForm({ initialPolicy, onDone }) {
  const { state, addPolicy, updatePolicy } = useStore();
  const toast = useToast();
  const isEdit = Boolean(initialPolicy?.id);
  const [form, setForm] = useState(() => (initialPolicy ? flattenPolicy(initialPolicy) : emptyPolicy()));

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const num = (v) => (v === '' ? undefined : Number(v));

  const odPremiumPreview = num(form.odPremium) ?? 0;
  const tpPremiumPreview = num(form.tpPremium) ?? 0;
  const addonPremiumPreview = num(form.addonPremium) ?? 0;
  const gstPercentPreview = num(form.gstPercent) ?? 18;
  const netPremiumPreview = odPremiumPreview + tpPremiumPreview + addonPremiumPreview;
  const gstAmountPreview = Math.round(
    ((odPremiumPreview + addonPremiumPreview) * gstPercentPreview) / 100 + (tpPremiumPreview * gstPercentPreview) / 100,
  );
  const finalPremiumPreview = Math.round(netPremiumPreview + gstAmountPreview);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.insurerId || !form.policyNumber.trim() || !form.category) {
      toast.error('Missing required fields', 'Insurer, policy number, and vehicle class are all required.');
      return;
    }

    const payload = {
      id: initialPolicy?.id,
      insurerId: form.insurerId,
      policyNumber: form.policyNumber.trim(),
      certificateNumber: form.certificateNumber.trim(),
      category: form.category,
      policyType: form.policyType,

      cubicCapacity: num(form.cubicCapacity),
      seatingCapacity: num(form.seatingCapacity),
      rto: form.rto,
      fuelType: form.fuelType,

      idv: num(form.idv) ?? 0,
      idvBreakup:
        form.idvVehicle || form.idvAccessories || form.idvElectricalFittings || form.idvNonElectricalFittings
          ? {
              vehicle: num(form.idvVehicle) ?? 0,
              accessories: num(form.idvAccessories) ?? 0,
              electricalFittings: num(form.idvElectricalFittings) ?? 0,
              nonElectricalFittings: num(form.idvNonElectricalFittings) ?? 0,
            }
          : null,

      premium: {
        odPremium: odPremiumPreview,
        tpPremium: tpPremiumPreview,
        addonPremium: addonPremiumPreview,
        netPremium: netPremiumPreview,
        gstPercent: gstPercentPreview,
        gstAmount: gstAmountPreview,
        finalPremium: finalPremiumPreview,
        totalDiscountPercent: num(form.totalDiscountPercent) ?? 0,
      },

      ncbPercent: num(form.ncbPercent) ?? 0,

      policyIssueDate: form.policyIssueDate || null,
      periodFrom: form.periodFrom || null,
      periodTo: form.periodTo || null,

      claimSettlementRatio: num(form.claimSettlementRatio),
      cashlessGarages: num(form.cashlessGarages) ?? 0,
      active: form.active,
    };

    try {
      if (isEdit) {
        updatePolicy(payload);
      } else {
        addPolicy(payload);
      }
      onDone(payload);
    } catch (err) {
      toast.error(isEdit ? 'Could not save changes' : 'Could not upload policy', err?.message);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? `Edit Policy: ${initialPolicy.policyNumber}` : 'Upload New Policy Certificate'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Vehicle and premium detail only — no policyholder-identifying information is collected here.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-5 py-5 space-y-4">
          <Section step={1} title="Policy" description="Which insurer and what kind of cover.">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Insurer" required>
                <Select value={form.insurerId} onChange={(e) => set({ insurerId: e.target.value })}>
                  <option value="">Select insurer…</option>
                  {state.insurers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Policy number" required>
                <TextInput
                  value={form.policyNumber}
                  onChange={(e) => set({ policyNumber: e.target.value })}
                  placeholder="e.g. 231702312310000060"
                />
              </FormField>
              <FormField label="Certificate number">
                <TextInput
                  value={form.certificateNumber}
                  onChange={(e) => set({ certificateNumber: e.target.value })}
                  placeholder="e.g. 2317/PVT CAR/1234567/00/000"
                />
              </FormField>
              <FormField label="Policy type" required>
                <Select value={form.policyType} onChange={(e) => set({ policyType: e.target.value })}>
                  <option value="">Select…</option>
                  {POLICY_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </Section>

          <Section step={2} title="Vehicle" description="Vehicle class and specs — no registration or identity details.">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Vehicle class" required>
                <Select value={form.category} onChange={(e) => set({ category: e.target.value, fuelType: '' })}>
                  <option value="">Select…</option>
                  {VEHICLE_CLASSES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="RTO" required>
                <Select value={form.rto} onChange={(e) => set({ rto: e.target.value })}>
                  <option value="">Select RTO…</option>
                  {RTO_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Fuel type" required>
                <Select value={form.fuelType} onChange={(e) => set({ fuelType: e.target.value })}>
                  <option value="">Select…</option>
                  {FUEL_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Cubic capacity (cc)">
                <TextInput type="number" value={form.cubicCapacity} onChange={(e) => set({ cubicCapacity: e.target.value })} />
              </FormField>
              <FormField label="Seating capacity">
                <TextInput type="number" value={form.seatingCapacity} onChange={(e) => set({ seatingCapacity: e.target.value })} />
              </FormField>
            </div>
          </Section>

          <Section step={3} title="Insured's Declared Value (IDV)" description="Total sum assured, with an optional part-wise breakup.">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <FormField label="Total IDV (₹)" required>
                <TextInput type="number" value={form.idv} onChange={(e) => set({ idv: e.target.value })} />
              </FormField>
              <FormField label="Vehicle (₹)" hint="Optional breakup">
                <TextInput type="number" value={form.idvVehicle} onChange={(e) => set({ idvVehicle: e.target.value })} />
              </FormField>
              <FormField label="Accessories (₹)">
                <TextInput type="number" value={form.idvAccessories} onChange={(e) => set({ idvAccessories: e.target.value })} />
              </FormField>
              <FormField label="Electrical fittings (₹)">
                <TextInput
                  type="number"
                  value={form.idvElectricalFittings}
                  onChange={(e) => set({ idvElectricalFittings: e.target.value })}
                />
              </FormField>
              <FormField label="Non-electrical fittings (₹)">
                <TextInput
                  type="number"
                  value={form.idvNonElectricalFittings}
                  onChange={(e) => set({ idvNonElectricalFittings: e.target.value })}
                />
              </FormField>
            </div>
          </Section>

          <Section step={4} title="Premium Schedule" description="OD, TP, add-ons and GST — final premium is calculated live as you type.">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <FormField label="Own Damage (OD) premium">
                <TextInput type="number" value={form.odPremium} onChange={(e) => set({ odPremium: e.target.value })} />
              </FormField>
              <FormField label="Third-Party (TP) / liability premium">
                <TextInput type="number" value={form.tpPremium} onChange={(e) => set({ tpPremium: e.target.value })} />
              </FormField>
              <FormField label="Add-on premium total">
                <TextInput type="number" value={form.addonPremium} onChange={(e) => set({ addonPremium: e.target.value })} />
              </FormField>
              <FormField label="GST %">
                <TextInput type="number" value={form.gstPercent} onChange={(e) => set({ gstPercent: e.target.value })} />
              </FormField>
              <FormField label="Total discount (%)">
                <TextInput
                  type="number"
                  value={form.totalDiscountPercent}
                  onChange={(e) => set({ totalDiscountPercent: e.target.value })}
                />
              </FormField>
            </div>

            <div className="mt-4 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-6 text-xs text-brand-800">
                <span>
                  Net premium <strong className="font-mono">₹{netPremiumPreview.toLocaleString('en-IN')}</strong>
                </span>
                <span>
                  GST amount <strong className="font-mono">₹{gstAmountPreview.toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-brand-600">Final premium</p>
                <p className="text-xl font-bold text-brand-900 font-mono">₹{finalPremiumPreview.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </Section>

          <Section step={5} title="No Claim Bonus">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="NCB (%)">
                <TextInput type="number" value={form.ncbPercent} onChange={(e) => set({ ncbPercent: e.target.value })} />
              </FormField>
            </div>
          </Section>

          <Section step={6} title="Policy Dates & Service Metrics">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <FormField label="Policy issue date">
                <TextInput type="date" value={form.policyIssueDate} onChange={(e) => set({ policyIssueDate: e.target.value })} />
              </FormField>
              <FormField label="Period of insurance — from" required>
                <TextInput type="date" value={form.periodFrom} onChange={(e) => set({ periodFrom: e.target.value })} />
              </FormField>
              <FormField label="Period of insurance — to" required>
                <TextInput type="date" value={form.periodTo} onChange={(e) => set({ periodTo: e.target.value })} />
              </FormField>
              <FormField label="Claim settlement ratio (%)">
                <TextInput
                  type="number"
                  step="0.1"
                  value={form.claimSettlementRatio}
                  onChange={(e) => set({ claimSettlementRatio: e.target.value })}
                />
              </FormField>
              <FormField label="Cashless garages">
                <TextInput type="number" value={form.cashlessGarages} onChange={(e) => set({ cashlessGarages: e.target.value })} />
              </FormField>
            </div>
          </Section>

          <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors w-fit">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set({ active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700">Published (visible to agents/users)</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {isEdit ? 'Save Changes' : 'Upload Policy Certificate'}
          </Button>
        </div>
      </form>
    </div>
  );
}
