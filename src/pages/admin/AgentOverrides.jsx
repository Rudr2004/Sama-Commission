import { useState } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';
import { ConditionTreeBuilder } from '../../components/conditionBuilder/ConditionTreeBuilder.jsx';
import { makeEmptyGroup } from '../../components/conditionBuilder/conditionTreeUtils.js';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { FormField, TextInput, Select } from '../../components/common/FormField.jsx';
import { summarizeConditionTree } from '../../engine/ruleSummary.js';

function emptyOverride() {
  return {
    agentId: '',
    name: '',
    insurerId: 'ALL',
    scoped: false,
    conditionTree: makeEmptyGroup('AND'),
    outcome: { type: 'percentage', value: '' },
  };
}

function OverrideFormModal({ agents, insurers, onSave, onClose }) {
  const [form, setForm] = useState(emptyOverride());
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.agentId || form.outcome.value === '') {
      toast.error('Missing required fields', 'Agent and outcome value are both required.');
      return;
    }
    onSave({
      agentId: form.agentId,
      name: form.name.trim() || undefined,
      insurerId: form.insurerId,
      conditionTree: form.scoped ? form.conditionTree : null,
      outcome: { ...form.outcome, value: Number(form.outcome.value) },
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">New Agent-Specific Override</h3>
            <p className="text-sm text-slate-500 mt-0.5">Highest precedence — beats every RTO and vehicle-parameter rule for this agent.</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Agent" required>
                <Select value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
                  <option value="">Select agent…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Scope to insurer" hint="Or leave as All insurers">
                <Select value={form.insurerId} onChange={(e) => setForm({ ...form, insurerId: e.target.value })}>
                  <option value="ALL">All insurers</option>
                  {insurers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <FormField label="Internal note" hint="Optional — for admin readability only">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Loyalty override for top performer"
              />
            </FormField>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.scoped}
                onChange={(e) => setForm({ ...form, scoped: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Also scope to specific vehicle/policy parameters
            </label>

            {form.scoped && (
              <ConditionTreeBuilder
                conditionTree={form.conditionTree}
                onChange={(conditionTree) => setForm({ ...form, conditionTree })}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Outcome type" required>
                <Select
                  value={form.outcome.type}
                  onChange={(e) => setForm({ ...form, outcome: { ...form.outcome, type: e.target.value } })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat amount (₹)</option>
                </Select>
              </FormField>
              <FormField label={form.outcome.type === 'percentage' ? 'Commission %' : 'Commission ₹'} required>
                <TextInput
                  type="number"
                  step="0.1"
                  value={form.outcome.value}
                  onChange={(e) => setForm({ ...form, outcome: { ...form.outcome, value: e.target.value } })}
                />
              </FormField>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Override
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AgentOverrides() {
  const { state, addOverride, deleteOverride } = useStore();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const agentName = (id) => state.agents.find((a) => a.id === id)?.name ?? id;
  const insurerName = (id) => (id === 'ALL' || !id ? 'All insurers' : state.insurers.find((i) => i.id === id)?.name ?? id);

  const handleDelete = (ov) => {
    if (!confirm(`Remove override for ${agentName(ov.agentId)}?`)) return;
    try {
      deleteOverride(ov.id);
      toast.success('Override removed', `The commission override for ${agentName(ov.agentId)} was deleted.`);
    } catch (err) {
      toast.error('Could not remove override', err?.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Agent-Specific Overrides"
          subtitle="Highest-precedence commission rules, tied to one agent. These win over every RTO and vehicle-parameter rule."
          action={
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              + New Override
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {state.agentOverrides.length === 0 && <p className="text-sm text-slate-400 italic">No agent overrides configured.</p>}
          {state.agentOverrides.map((ov) => (
            <div key={ov.id} className="rounded-lg border border-violet-200 bg-violet-50/40 px-4 py-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{agentName(ov.agentId)}</h3>
                    <Badge tone="violet">Agent override</Badge>
                    <Badge tone="slate">{insurerName(ov.insurerId)}</Badge>
                    <Badge tone="brand">
                      {ov.outcome.type === 'percentage' ? `${ov.outcome.value}%` : `₹${ov.outcome.value} flat`}
                    </Badge>
                  </div>
                  {ov.name && <p className="text-sm text-slate-600 mt-1">{ov.name}</p>}
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    {ov.conditionTree ? `Scoped to: ${summarizeConditionTree(ov.conditionTree)}` : 'Applies unconditionally for this agent + insurer'}
                  </p>
                </div>
                <Button size="sm" variant="danger" onClick={() => handleDelete(ov)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {modalOpen && (
        <OverrideFormModal
          agents={state.agents}
          insurers={state.insurers}
          onSave={(payload) => {
            try {
              addOverride(payload);
              toast.success('Override created', `Agent-specific override saved for ${agentName(payload.agentId)}.`);
              setModalOpen(false);
            } catch (err) {
              toast.error('Could not create override', err?.message);
            }
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
