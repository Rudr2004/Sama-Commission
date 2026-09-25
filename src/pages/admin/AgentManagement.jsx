import { useState } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { FormField, TextInput } from '../../components/common/FormField.jsx';
import { Badge } from '../../components/common/Badge.jsx';

function AgentFormModal({ agent, onSave, onClose }) {
  const [name, setName] = useState(agent?.name ?? '');
  const [designation, setDesignation] = useState(agent?.designation ?? '');
  const [email, setEmail] = useState(agent?.email ?? '');
  const [mobile, setMobile] = useState(agent?.mobile ?? '');
  const [branch, setBranch] = useState(agent?.branch ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...(agent || {}),
      name: name.trim(),
      designation: designation.trim() || undefined,
      email: email.trim() || undefined,
      mobile: mobile.trim() || undefined,
      branch: branch.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">{agent ? 'Edit Agent' : 'Add Agent'}</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            <FormField label="Full name" required>
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Krupal Prajapati" autoFocus />
            </FormField>
            <FormField label="Designation" hint="Shown as a badge next to the agent's name">
              <TextInput value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Account Officer" />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Email">
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@samainsurance.in" />
              </FormField>
              <FormField label="Mobile">
                <TextInput value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91-98250-00000" />
              </FormField>
            </div>
            <FormField label="Branch" hint="Office/location the agent operates from">
              <TextInput value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. Ahmedabad" />
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

export function AgentManagement() {
  const { state, addAgent, updateAgent, deleteAgent } = useStore();
  const toast = useToast();
  const [modalAgent, setModalAgent] = useState(undefined); // undefined = closed, null = "add new", object = edit

  const overrideCountByAgent = (agentId) => state.agentOverrides.filter((o) => o.agentId === agentId).length;

  const handleSave = (agent) => {
    try {
      if (agent.id) {
        updateAgent(agent);
        toast.success('Agent updated', `${agent.name} was saved successfully.`);
      } else {
        addAgent(agent);
        toast.success('Agent added', `${agent.name} is now available for overrides and commission checks.`);
      }
      setModalAgent(undefined);
    } catch (err) {
      toast.error('Could not save agent', err?.message);
    }
  };

  const handleDelete = (agent) => {
    const overrideCount = overrideCountByAgent(agent.id);
    const warning = overrideCount > 0 ? ` This also removes ${overrideCount} agent override(s).` : '';
    if (!confirm(`Delete ${agent.name}?${warning}`)) return;
    try {
      deleteAgent(agent.id);
      toast.success('Agent deleted', `${agent.name} and any associated overrides were removed.`);
    } catch (err) {
      toast.error('Could not delete agent', err?.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Agent Directory"
          subtitle="Sama Insurance broking staff — sourced from the real broker-grid distribution list. Used across Commission Checker and Agent Overrides."
          action={
            <Button variant="primary" onClick={() => setModalAgent(null)}>
              + Add Agent
            </Button>
          }
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4 font-medium">Agent</th>
                  <th className="py-2 pr-4 font-medium">Designation</th>
                  <th className="py-2 pr-4 font-medium">Contact</th>
                  <th className="py-2 pr-4 font-medium">Branch</th>
                  <th className="py-2 pr-4 font-medium">Overrides</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-slate-50 last:border-0 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{agent.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{agent.id}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {agent.designation ? <Badge tone="slate">{agent.designation}</Badge> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {agent.email && <div>{agent.email}</div>}
                      {agent.mobile && <div className="text-slate-400">{agent.mobile}</div>}
                      {!agent.email && !agent.mobile && <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{agent.branch || <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 pr-4">
                      {overrideCountByAgent(agent.id) > 0 ? (
                        <Badge tone="violet">{overrideCountByAgent(agent.id)} override(s)</Badge>
                      ) : (
                        <span className="text-slate-300">None</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => setModalAgent(agent)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(agent)}>
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

      {modalAgent !== undefined && (
        <AgentFormModal agent={modalAgent} onSave={handleSave} onClose={() => setModalAgent(undefined)} />
      )}
    </div>
  );
}
