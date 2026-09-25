import { PARAMETERS, getParameter, OPERATORS, OPERATORS_BY_TYPE, FIELD_TYPES } from '../../config/parameters.js';
import { Select, TextInput } from '../common/FormField.jsx';
import { Button } from '../common/Button.jsx';

function ValueEditor({ field, operator, value, onChange }) {
  const param = getParameter(field);
  if (!param) return <TextInput value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;

  const isListOperator = operator === 'in' || operator === 'not_in';

  if (operator === 'between') {
    const [min, max] = Array.isArray(value) ? value : ['', ''];
    return (
      <div className="flex items-center gap-2">
        <TextInput
          type="number"
          value={min}
          onChange={(e) => onChange([e.target.value, max])}
          placeholder="Min"
          className="w-20"
        />
        <span className="text-slate-400 text-sm">and</span>
        <TextInput
          type="number"
          value={max}
          onChange={(e) => onChange([min, e.target.value])}
          placeholder="Max"
          className="w-20"
        />
      </div>
    );
  }

  if (param.type === FIELD_TYPES.NUMBER) {
    return <TextInput type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;
  }

  if (param.options && param.options.length > 0) {
    if (isListOperator) {
      const selected = Array.isArray(value) ? value : [];
      return (
        <select
          multiple
          value={selected}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
          className="w-full rounded-lg border border-slate-300 text-sm px-2 py-1.5 h-[76px] focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {param.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {param.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    );
  }

  return <TextInput value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Value" />;
}

export function ConditionRow({ condition, onChange, onRemove }) {
  const param = getParameter(condition.field);
  const availableOperators = param ? OPERATORS_BY_TYPE[param.type] || [] : [];

  const handleFieldChange = (field) => {
    const newParam = getParameter(field);
    const defaultOp = newParam ? (OPERATORS_BY_TYPE[newParam.type] || [])[0] : 'equals';
    onChange({ field, operator: defaultOp, value: defaultOp === 'between' ? ['', ''] : '' });
  };

  const handleOperatorChange = (operator) => {
    onChange({ ...condition, operator, value: operator === 'between' ? ['', ''] : '' });
  };

  return (
    <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <div className="grid grid-cols-3 gap-2 flex-1">
        <Select value={condition.field} onChange={(e) => handleFieldChange(e.target.value)}>
          <option value="">Field…</option>
          {PARAMETERS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </Select>
        <Select value={condition.operator} onChange={(e) => handleOperatorChange(e.target.value)} disabled={!condition.field}>
          {availableOperators.map((opKey) => (
            <option key={opKey} value={opKey}>
              {OPERATORS[opKey].label}
            </option>
          ))}
        </Select>
        <ValueEditor
          field={condition.field}
          operator={condition.operator}
          value={condition.value}
          onChange={(value) => onChange({ ...condition, value })}
        />
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove} title="Remove condition">
        ✕
      </Button>
    </div>
  );
}
