import { useState } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';
import {
  RTO_OPTIONS,
  VEHICLE_MAKES,
  VEHICLE_CLASSES,
  FUEL_TYPES,
  POLICY_TYPES,
  CASE_TYPES,
  PARAMETERS,
  getOptionLabel,
} from '../../config/parameters.js';
import { summarizeConditionTree, summarizeRule } from '../../engine/ruleSummary.js';
import { PRECEDENCE_TIERS } from '../../engine/evaluateCommission.js';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { FormField, TextInput, Select } from '../../components/common/FormField.jsx';

const ANY_AGENT = 'ANY';
const ANY = '';
const RULES_PER_PAGE = 10;

const TIER_BADGE_TONE = {
  rto: 'violet',
  vehicleParam: 'brand',
};

// Fields the quick form can express directly as single-value dropdowns/chips.
// Anything else found on a rule being edited is kept untouched as "extra
// conditions" rather than silently dropped.
const SELECT_FIELDS = ['vehicleClass', 'fuelType', 'policyType', 'caseType', 'ncb'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildConditionTree({ rtoList, vehicleMakeList, selects }, extraConditions) {
  const conditions = [];
  if (rtoList.length > 0) conditions.push({ field: 'rto', operator: 'in', value: rtoList });
  if (vehicleMakeList.length > 0) conditions.push({ field: 'vehicleMake', operator: 'in', value: vehicleMakeList });
  for (const key of SELECT_FIELDS) {
    if (selects[key]) conditions.push({ field: key, operator: 'equals', value: selects[key] });
  }
  if (extraConditions && extraConditions.length > 0) conditions.push(...extraConditions);
  return { logic: 'AND', conditions };
}

function emptySelects() {
  return SELECT_FIELDS.reduce((acc, key) => ({ ...acc, [key]: ANY }), {});
}

function emptyForm() {
  return {
    ruleId: null,
    name: '',
    insurerId: 'ALL',
    rtoList: [],
    vehicleMakeList: [],
    selects: emptySelects(),
    agentId: ANY_AGENT,
    outcomeType: 'percentage',
    outcomeValue: '',
    priority: 5,
    active: true,
    effectiveFrom: '',
    effectiveTo: '',
    originalEffectiveFrom: '',
    originalEffectiveTo: '',
  };
}

// Splits an existing rule's flat condition list into what the quick form's
// known fields can represent vs. everything else (nested groups, OR logic,
// or fields like weightBand/vehicleAge/seatingCapacity that have no quick
// control). The "everything else" is preserved and re-attached on save so
// editing here never silently deletes a rule's other scoping.
function decomposeConditionTree(tree) {
  const rtoList = [];
  const vehicleMakeList = [];
  const selects = emptySelects();
  const extraConditions = [];

  const leaves = tree && Array.isArray(tree.conditions) && tree.logic !== 'OR' ? tree.conditions : tree ? [tree] : [];

  for (const node of leaves) {
    if (Array.isArray(node.conditions)) {
      extraConditions.push(node);
      continue;
    }
    if (node.field === 'rto' && (node.operator === 'in' || node.operator === 'equals')) {
      rtoList.push(...(Array.isArray(node.value) ? node.value : [node.value]));
    } else if (node.field === 'vehicleMake' && (node.operator === 'in' || node.operator === 'equals')) {
      vehicleMakeList.push(...(Array.isArray(node.value) ? node.value : [node.value]));
    } else if (SELECT_FIELDS.includes(node.field) && node.operator === 'equals' && !Array.isArray(node.value)) {
      selects[node.field] = node.value;
    } else {
      extraConditions.push(node);
    }
  }

  return { rtoList, vehicleMakeList, selects, extraConditions };
}

function ruleToForm(rule) {
  const { rtoList, vehicleMakeList, selects, extraConditions } = decomposeConditionTree(rule.conditionTree);
  return {
    originalRule: rule,
    ruleId: rule.id,
    name: rule.name,
    insurerId: rule.insurerId,
    rtoList,
    vehicleMakeList,
    selects,
    agentId: ANY_AGENT,
    outcomeType: rule.outcome.type,
    outcomeValue: String(rule.outcome.value),
    priority: rule.priority,
    active: rule.active,
    effectiveFrom: rule.effectiveFrom || '',
    effectiveTo: rule.effectiveTo || '',
    // Snapshot of the dates as loaded, so editing a rule that already has a
    // past effective date doesn't force the admin to bump it just to save
    // an unrelated change — the past-date rule only applies to NEW values.
    originalEffectiveFrom: rule.effectiveFrom || '',
    originalEffectiveTo: rule.effectiveTo || '',
    extraConditions,
  };
}

export function QuickCommissionRule() {
  const { state, addRule, updateRule, addOverride, deleteRule, deleteOverride, duplicateRule, toggleRuleActive } = useStore();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm());
  const [formOpen, setFormOpen] = useState(false);
  const [rulesPage, setRulesPage] = useState(1);
  const minDate = todayIso();

  const isEdit = Boolean(form.ruleId);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleInList = (listKey, value) => {
    setForm((f) => {
      const list = f[listKey];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...f, [listKey]: next };
    });
  };

  const setSelect = (key, value) => setForm((f) => ({ ...f, selects: { ...f.selects, [key]: value } }));

  // Past-date restriction only applies to a date the admin is newly setting —
  // editing a rule that already has a past effective date shouldn't force
  // that date to be bumped just to save an unrelated change.
  const fromUnchanged = form.effectiveFrom === (form.originalEffectiveFrom || '');
  const toUnchanged = form.effectiveTo === (form.originalEffectiveTo || '');
  const datesValid =
    (!form.effectiveFrom || fromUnchanged || form.effectiveFrom >= minDate) &&
    (!form.effectiveTo || toUnchanged || form.effectiveTo >= minDate) &&
    (!form.effectiveFrom || !form.effectiveTo || form.effectiveTo >= form.effectiveFrom);

  const hasAnyCondition =
    form.rtoList.length > 0 ||
    form.vehicleMakeList.length > 0 ||
    SELECT_FIELDS.some((k) => form.selects[k]) ||
    (form.extraConditions?.length > 0);

  const canSubmit = hasAnyCondition && form.outcomeValue !== '' && !Number.isNaN(Number(form.outcomeValue)) && datesValid;

  const isQuickRule = (r) => r.createdVia === 'quickRule';
  const quickOverrides = state.agentOverrides.filter(isQuickRule);

  const insurerName = (id) => (id === 'ALL' ? 'All insurers' : state.insurers.find((i) => i.id === id)?.name ?? id);
  const agentName = (id) => state.agents.find((a) => a.id === id)?.name ?? id;

  const sortedRules = [...state.rules].sort((a, b) => a.priority - b.priority);
  const totalRulePages = Math.max(1, Math.ceil(sortedRules.length / RULES_PER_PAGE));
  const currentRulesPage = Math.min(rulesPage, totalRulePages);
  const pagedRules = sortedRules.slice((currentRulesPage - 1) * RULES_PER_PAGE, currentRulesPage * RULES_PER_PAGE);

  const resetForm = () => {
    setForm(emptyForm());
    setFormOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!datesValid) {
        toast.error('Invalid effective dates', 'Effective dates cannot be in the past, and "to" must not be before "from".');
      } else {
        toast.error('Missing required fields', 'Select at least one condition (RTO, Vehicle Company, or another filter), and enter a commission value.');
      }
      return;
    }

    const conditionTree = buildConditionTree(form, form.extraConditions);
    const outcome = { type: form.outcomeType, value: Number(form.outcomeValue) };

    const rtoLabel = form.rtoList.length ? form.rtoList.join(', ') : 'any RTO';
    const makeLabel = form.vehicleMakeList.length
      ? form.vehicleMakeList.map((v) => getOptionLabel('vehicleMake', v)).join(', ')
      : 'any vehicle company';
    const autoName = `Quick rule: ${rtoLabel} + ${makeLabel}`;

    try {
      if (isEdit) {
        updateRule({
          ...form.originalRule,
          id: form.ruleId,
          name: form.name?.trim() || autoName,
          insurerId: form.insurerId,
          scopeType: form.rtoList.length > 0 ? 'rto' : 'vehicleParam',
          priority: Number(form.priority) || 5,
          active: form.active,
          conditionTree,
          outcome,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
        });
        toast.success('Rule updated', `"${form.name?.trim() || autoName}" was saved successfully.`);
      } else if (form.agentId === ANY_AGENT) {
        addRule({
          name: autoName,
          insurerId: form.insurerId,
          scopeType: 'rto',
          priority: Number(form.priority) || 5,
          active: true,
          conditionTree,
          outcome,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          createdVia: 'quickRule',
        });
        toast.success('Quick rule created', `${rtoLabel} + ${makeLabel} is now live.`);
      } else {
        addOverride({
          agentId: form.agentId,
          name: `Quick override: ${agentName(form.agentId)} — ${rtoLabel} + ${makeLabel}`,
          insurerId: form.insurerId,
          conditionTree: conditionTree.conditions.length > 0 ? conditionTree : null,
          outcome,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          createdVia: 'quickRule',
        });
        toast.success('Quick override created', `Broker override saved for ${agentName(form.agentId)}.`);
      }
      resetForm();
    } catch (err) {
      toast.error(isEdit ? 'Could not save changes' : 'Could not create quick rule', err?.message);
    }
  };

  const handleRemoveOverride = (ov) => {
    try {
      deleteOverride(ov.id);
      toast.success('Override removed', `"${ov.name}" was deleted.`);
    } catch (err) {
      toast.error('Could not remove override', err?.message);
    }
  };

  const handleDelete = (rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      deleteRule(rule.id);
      if (form.ruleId === rule.id) resetForm();
      if (pagedRules.length === 1 && currentRulesPage > 1) setRulesPage(currentRulesPage - 1);
      toast.success('Rule deleted', `"${rule.name}" was removed.`);
    } catch (err) {
      toast.error('Could not delete rule', err?.message);
    }
  };

  const handleDuplicate = (rule) => {
    try {
      duplicateRule(rule.id);
      toast.success('Rule duplicated', `A copy of "${rule.name}" was created (disabled by default).`);
    } catch (err) {
      toast.error('Could not duplicate rule', err?.message);
    }
  };

  const handleToggleActive = (rule) => {
    try {
      toggleRuleActive(rule.id);
      toast.success(rule.active ? 'Rule disabled' : 'Rule enabled', `"${rule.name}" is now ${rule.active ? 'inactive' : 'active'}.`);
    } catch (err) {
      toast.error('Could not update rule', err?.message);
    }
  };

  const selectFieldConfig = {
    vehicleClass: { label: 'Vehicle Class', options: VEHICLE_CLASSES.map(({ value, label }) => ({ value, label })) },
    fuelType: { label: 'Fuel Type', options: FUEL_TYPES },
    policyType: { label: 'Policy Type', options: POLICY_TYPES },
    caseType: { label: 'Case Type', options: CASE_TYPES },
    ncb: { label: 'NCB Slab', options: PARAMETERS.find((p) => p.key === 'ncb').options },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={isEdit ? `Edit Rule: ${form.name || 'Untitled'}` : 'Quick Commission Rule'}
          subtitle={
            isEdit
              ? 'Editing an existing rule. Adjust the fields below and save.'
              : 'Set commission by RTO + Vehicle Company (Make) + other filters + Broker/Agent in one step.'
          }
          action={
            formOpen ? (
              <Button variant="ghost" onClick={resetForm}>
                {isEdit ? 'Cancel edit' : 'Close'}
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setFormOpen(true)}>
                + New Rule
              </Button>
            )
          }
        />
        {formOpen && (
        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-5">
            {isEdit && (
              <FormField label="Rule name" hint="Shown in the rule list below">
                <TextInput value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ahmedabad RTO boost" />
              </FormField>
            )}

            <FormField label="Applies to insurer" required>
              <Select value={form.insurerId} onChange={(e) => set({ insurerId: e.target.value })}>
                <option value="ALL">All insurers</option>
                {state.insurers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1.5">
                RTO <span className="text-xs text-slate-400 font-normal">(leave empty for any RTO)</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RTO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleInList('rtoList', opt.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-full font-medium border transition-colors ${
                      form.rtoList.includes(opt.value)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1.5">
                Vehicle Company (Make) <span className="text-xs text-slate-400 font-normal">(leave empty for any company)</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VEHICLE_MAKES.map((make) => (
                  <button
                    key={make.value}
                    type="button"
                    onClick={() => toggleInList('vehicleMakeList', make.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-full font-medium border transition-colors ${
                      form.vehicleMakeList.includes(make.value)
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {make.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-1.5">
                Other filters <span className="text-xs text-slate-400 font-normal">(each optional — "Any" is ignored)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SELECT_FIELDS.map((key) => (
                  <FormField key={key} label={selectFieldConfig[key].label}>
                    <Select value={form.selects[key]} onChange={(e) => setSelect(key, e.target.value)}>
                      <option value={ANY}>Any</option>
                      {selectFieldConfig[key].options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                ))}
              </div>
            </div>

            {form.extraConditions?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This rule also has conditions not shown above (kept as-is and re-saved unchanged):{' '}
                <span className="font-mono">{form.extraConditions.map((c) => summarizeConditionTree(c)).join('; ')}</span>
              </div>
            )}

            {!isEdit && (
              <FormField
                label="Broker / Agent"
                required
                hint="Choosing a specific agent creates the highest-precedence agent override; 'Any' creates a standard rule."
              >
                <Select value={form.agentId} onChange={(e) => set({ agentId: e.target.value })}>
                  <option value={ANY_AGENT}>Any broker / agent</option>
                  {state.agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Outcome type" required>
                <Select value={form.outcomeType} onChange={(e) => set({ outcomeType: e.target.value })}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat amount (₹)</option>
                </Select>
              </FormField>
              <FormField label={form.outcomeType === 'percentage' ? 'Commission %' : 'Commission ₹'} required>
                <TextInput
                  type="number"
                  step="0.1"
                  value={form.outcomeValue}
                  onChange={(e) => set({ outcomeValue: e.target.value })}
                  placeholder="e.g. 12"
                />
              </FormField>
              {(isEdit || form.agentId === ANY_AGENT) && (
                <FormField label="Priority" hint="Lower number evaluated first, within the same tier">
                  <TextInput type="number" value={form.priority} onChange={(e) => set({ priority: e.target.value })} />
                </FormField>
              )}
            </div>

            {isEdit && (
              <FormField label="Active">
                <div className="flex items-center h-[38px]">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => set({ active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Enabled
                  </label>
                </div>
              </FormField>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Effective from" hint="Optional — cannot be a past date">
                <TextInput
                  type="date"
                  min={minDate}
                  value={form.effectiveFrom}
                  onChange={(e) => set({ effectiveFrom: e.target.value })}
                />
              </FormField>
              <FormField label="Effective to" hint="Optional — cannot be a past date">
                <TextInput
                  type="date"
                  min={form.effectiveFrom || minDate}
                  value={form.effectiveTo}
                  onChange={(e) => set({ effectiveTo: e.target.value })}
                />
              </FormField>
            </div>
            {!datesValid && (
              <p className="text-xs text-red-500 -mt-3">
                Effective dates cannot be in the past, and "to" must not be before "from".
              </p>
            )}

            <div className="rounded-lg bg-slate-900 text-slate-100 px-4 py-3 text-sm font-mono leading-relaxed">
              <span className="text-slate-400">IF </span>
              {summarizeConditionTree(buildConditionTree(form, form.extraConditions)) || <span className="text-slate-500">always</span>}
              {!isEdit && form.agentId !== ANY_AGENT && (
                <span className="text-slate-400"> AND broker = {agentName(form.agentId)}</span>
              )}
            </div>
          </CardBody>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
            {isEdit && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {isEdit ? 'Save Changes' : form.agentId === ANY_AGENT ? 'Create Rule' : 'Create Agent Override'}
            </Button>
          </div>
        </form>
        )}
      </Card>

      {quickOverrides.length > 0 && (
        <Card>
          <CardHeader
            title="Broker Overrides"
            subtitle="Agent-specific overrides created via the quick form above."
          />
          <CardBody className="space-y-3">
            {quickOverrides.map((ov) => (
              <div key={ov.id} className="rounded-lg border border-violet-200 bg-violet-50/40 px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="violet">Broker override</Badge>
                    <Badge tone="slate">{insurerName(ov.insurerId)}</Badge>
                    <Badge tone="brand">{ov.outcome.type === 'percentage' ? `${ov.outcome.value}%` : `₹${ov.outcome.value}`}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{ov.name}</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => handleRemoveOverride(ov)}>
                  Remove
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="All Commission Rules"
          subtitle="All rules, evaluated by precedence tier then priority. Lower priority number runs first within a tier."
        />
        <CardBody className="space-y-3">
          {sortedRules.length === 0 && <p className="text-sm text-slate-400 italic">No rules configured yet.</p>}
          {pagedRules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-lg border px-4 py-3 ${rule.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <Badge tone={TIER_BADGE_TONE[rule.scopeType] || 'slate'}>{PRECEDENCE_TIERS[rule.scopeType]?.label ?? rule.scopeType}</Badge>
                    <Badge tone="slate">{insurerName(rule.insurerId)}</Badge>
                    <Badge tone="slate">Priority {rule.priority}</Badge>
                    {!rule.active && <Badge tone="red">Disabled</Badge>}
                    {(rule.effectiveFrom || rule.effectiveTo) && (
                      <Badge tone="amber">
                        {rule.effectiveFrom || '…'} → {rule.effectiveTo || '…'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 font-mono mt-1.5 break-words">{summarizeRule(rule)}</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      setForm(ruleToForm(rule));
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => handleDuplicate(rule)}>
                    Duplicate
                  </Button>
                  <Button size="sm" onClick={() => handleToggleActive(rule)}>
                    {rule.active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(rule)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
        {sortedRules.length > RULES_PER_PAGE && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-slate-500">
              Showing {(currentRulesPage - 1) * RULES_PER_PAGE + 1}–{Math.min(currentRulesPage * RULES_PER_PAGE, sortedRules.length)} of{' '}
              {sortedRules.length} rules
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setRulesPage((p) => Math.max(1, p - 1))} disabled={currentRulesPage <= 1}>
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {currentRulesPage} of {totalRulePages}
              </span>
              <Button
                size="sm"
                onClick={() => setRulesPage((p) => Math.min(totalRulePages, p + 1))}
                disabled={currentRulesPage >= totalRulePages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
