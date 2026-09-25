import { useState } from 'react';
import { RTO_OPTIONS } from '../../config/parameters.js';
import { lookupByPincode } from '../../data/pincodeLookupMock.js';
import { Button } from './Button.jsx';
import { FormField, Select, TextInput } from './FormField.jsx';
import { useToast } from './ToastContext.jsx';

// Acko / Paytm Insurance style: capture the policyholder's current address
// (pincode-first, like a real aggregator) rather than a bare RTO dropdown.
// A known pincode auto-fills City, State, and RTO — every field stays
// independently editable afterward, exactly like the RC lookup elsewhere
// on this form.
export function UserRtoModal({ initialDetails, onSave, onClose }) {
  const toast = useToast();
  const [pincode, setPincode] = useState(initialDetails?.pincode || '');
  const [city, setCity] = useState(initialDetails?.city || '');
  const [state, setState] = useState(initialDetails?.state || '');
  const [rto, setRto] = useState(initialDetails?.rto || '');
  const [addressLine, setAddressLine] = useState(initialDetails?.addressLine || '');
  const [autoFilled, setAutoFilled] = useState(false);

  const handlePincodeChange = (nextPincode) => {
    setPincode(nextPincode);
    setAutoFilled(false);
    if (nextPincode.replace(/\D/g, '').length === 6) {
      const record = lookupByPincode(nextPincode);
      if (record) {
        setCity(record.city);
        setState(record.state);
        setRto(record.rto);
        setAutoFilled(true);
        toast.success('Location found', `Auto-filled from pincode — City, State, and RTO stay editable.`);
      } else {
        toast.error('Pincode not recognized', 'Enter City, State, and RTO manually below.');
      }
    }
  };

  // Rendered as a plain div, not a <form> — this modal is always mounted
  // inside VehiclePolicyForm, which itself is always embedded inside a
  // page-level <form> (AgentPortal / RuleSimulator). Nesting a second
  // <form> inside that is invalid HTML: the browser silently closes the
  // outer form early and reparents its remaining fields outside it, which
  // corrupts the outer form's fields and can make Save appear to wipe
  // other data. A plain button + onClick avoids the nested-form entirely.
  const handleSave = () => {
    if (!rto) return;
    onSave({ pincode: pincode.trim(), city: city.trim(), state: state.trim(), addressLine: addressLine.trim(), rto });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4 animate-modal-backdrop"
      onClick={onClose}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Policyholder's Current Address</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Used when the policyholder's current location differs from where the vehicle is registered.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <FormField label="Pincode" required hint="Enter a 6-digit pincode to auto-fill City, State & RTO">
            <TextInput
              value={pincode}
              onChange={(e) => handlePincodeChange(e.target.value)}
              placeholder="e.g. 400001"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="City" required>
              <TextInput value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" />
            </FormField>
            <FormField label="State" required>
              <TextInput value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Maharashtra" />
            </FormField>
          </div>

          <FormField label="Address line" hint="Optional">
            <TextInput value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="Flat / Street / Area" />
          </FormField>

          <FormField
            label="RTO"
            required
            hint={autoFilled ? 'Auto-filled from pincode — change if needed' : undefined}
          >
            <Select value={rto} onChange={(e) => setRto(e.target.value)}>
              <option value="">Select RTO…</option>
              {RTO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} disabled={!rto || !city.trim() || !state.trim()}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
