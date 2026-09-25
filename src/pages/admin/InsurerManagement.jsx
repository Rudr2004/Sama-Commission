import { useState } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { FormField, TextInput } from '../../components/common/FormField.jsx';
import { Badge } from '../../components/common/Badge.jsx';

function InsurerFormModal({ insurer, onSave, onClose }) {
  const [name, setName] = useState(insurer?.name ?? '');
  const [shortCode, setShortCode] = useState(insurer?.shortCode ?? '');
  const [baseCommissionRate, setBaseCommissionRate] = useState(insurer?.baseCommissionRate ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || baseCommissionRate === '') return;
    onSave({
      ...(insurer || {}),
      name: name.trim(),
      shortCode: shortCode.trim() || undefined,
      baseCommissionRate: Number(baseCommissionRate),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">{insurer ? 'Edit Insurer' : 'Add Insurer'}</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            <FormField label="Insurer name" required>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ICICI Lombard General Insurance" autoFocus />
            </FormField>
            <FormField label="Short code" hint="Shown as a badge, e.g. ICICI, HDFC ERGO">
              <TextInput value={shortCode} onChange={(e) => setShortCode(e.target.value)} placeholder="e.g. ICICI" />
            </FormField>
            <FormField label="Base / default commission (%)" required hint="Fallback rate used when no rule matches.">
              <TextInput
                type="number"
                step="0.1"
                value={baseCommissionRate}
                onChange={(e) => setBaseCommissionRate(e.target.value)}
                placeholder="e.g. 10"
              />
            </FormField>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InsurerManagement() {
  const { state, addInsurer, updateInsurer, deleteInsurer } = useStore();
  const toast = useToast();
  const [modalInsurer, setModalInsurer] = useState(undefined); // undefined = closed, null = "add new", object = edit

  const rulesCountByInsurer = (insurerId) => state.rules.filter((r) => r.insurerId === insurerId).length;

  const handleSave = (insurer) => {
    try {
      if (insurer.id) {
        updateInsurer(insurer);
        toast.success('Insurer updated', `${insurer.name} was saved successfully.`);
      } else {
        addInsurer(insurer);
        toast.success('Insurer added', `${insurer.name} is now available for rules and policies.`);
      }
      setModalInsurer(undefined);
    } catch (err) {
      toast.error('Could not save insurer', err?.message);
    }
  };

  const handleDelete = (insurer) => {
    if (!confirm(`Delete ${insurer.name}? This also removes its ${rulesCountByInsurer(insurer.id)} rule(s).`)) return;
    try {
      deleteInsurer(insurer.id);
      toast.success('Insurer deleted', `${insurer.name} and its rules were removed.`);
    } catch (err) {
      toast.error('Could not delete insurer', err?.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Insurer Management"
          subtitle="Configure participating insurers and each one's base commission fallback."
          action={
            <Button variant="primary" onClick={() => setModalInsurer(null)}>
              + Add Insurer
            </Button>
          }
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4 font-medium">Insurer</th>
                  <th className="py-2 pr-4 font-medium">Base Commission</th>
                  <th className="py-2 pr-4 font-medium">Rules Configured</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.insurers.map((insurer) => (
                  <tr key={insurer.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {insurer.name}
                        {insurer.shortCode && <Badge tone="slate">{insurer.shortCode}</Badge>}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone="brand">{insurer.baseCommissionRate}%</Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{rulesCountByInsurer(insurer.id)} rule(s)</td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => setModalInsurer(insurer)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(insurer)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {modalInsurer !== undefined && (
        <InsurerFormModal insurer={modalInsurer} onSave={handleSave} onClose={() => setModalInsurer(undefined)} />
      )}
    </div>
  );
}
