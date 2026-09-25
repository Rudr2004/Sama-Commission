import { Badge } from '../../components/common/Badge.jsx';
import { Button } from '../../components/common/Button.jsx';
import { getOptionLabel } from '../../config/parameters.js';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value || '—'}</p>
    </div>
  );
}

function money(v) {
  return v || v === 0 ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';
}

export function PolicyDetailModal({ policy, insurerName, onClose }) {
  const idv = policy.idvBreakup;

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4 overflow-y-auto py-8 animate-modal-backdrop"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl animate-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge tone="brand">{insurerName}</Badge>
              <Badge tone="violet">{getOptionLabel('policyType', policy.policyType)}</Badge>
            </div>
            <h3 className="font-semibold text-lg text-slate-900">{getOptionLabel('vehicleClass', policy.category)}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Vehicle Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
              <Field label="Vehicle class" value={getOptionLabel('vehicleClass', policy.category)} />
              <Field label="RTO" value={policy.rto} />
              <Field label="Fuel type" value={getOptionLabel('fuelType', policy.fuelType)} />
              <Field label="Cubic capacity" value={policy.cubicCapacity ? `${policy.cubicCapacity} cc` : null} />
              <Field label="Seating capacity" value={policy.seatingCapacity} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Insured's Declared Value (IDV)</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
              <Field label="Total IDV" value={money(policy.idv)} />
              <Field label="Vehicle" value={idv ? money(idv.vehicle) : '—'} />
              <Field label="Accessories" value={idv ? money(idv.accessories) : '—'} />
              <Field label="Electrical fittings" value={idv ? money(idv.electricalFittings) : '—'} />
              <Field label="Non-electrical fittings" value={idv ? money(idv.nonElectricalFittings) : '—'} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Premium Schedule</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
              <Field label="Own Damage (OD) premium" value={money(policy.premium.odPremium)} />
              <Field label="Third-Party (TP) / liability premium" value={money(policy.premium.tpPremium)} />
              <Field label="Add-on premium total" value={money(policy.premium.addonPremium)} />
              <Field label="Net premium" value={money(policy.premium.netPremium)} />
              <Field label={`GST (${policy.premium.gstPercent}%)`} value={money(policy.premium.gstAmount)} />
              <Field label="Total discount" value={policy.premium.totalDiscountPercent ? `${policy.premium.totalDiscountPercent}%` : '—'} />
            </div>
            <div className="mt-3 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-800">Final Premium (incl. GST)</span>
              <span className="text-xl font-bold text-brand-900">{money(policy.premium.finalPremium)}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">No Claim Bonus</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
              <Field label="NCB" value={policy.ncbPercent || policy.ncbPercent === 0 ? `${policy.ncbPercent}%` : null} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Policy Validity &amp; Service</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
              <Field label="Period from" value={policy.periodFrom} />
              <Field label="Period to" value={policy.periodTo} />
              <Field
                label="Claim settlement ratio"
                value={policy.claimSettlementRatio != null ? `${policy.claimSettlementRatio}%` : null}
              />
              <Field label="Cashless garages" value={policy.cashlessGarages ? policy.cashlessGarages.toLocaleString('en-IN') : null} />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
