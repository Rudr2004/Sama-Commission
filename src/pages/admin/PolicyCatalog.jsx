import { useState, useMemo } from 'react';
import { useStore } from '../../store/StoreContext.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';
import { PolicyForm } from './PolicyForm.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { getOptionLabel } from '../../config/parameters.js';

const ACCENTS = [
  { bar: 'bg-brand-500', chip: 'bg-brand-50 text-brand-700' },
  { bar: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700' },
  { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700' },
  { bar: 'bg-cyan-500', chip: 'bg-cyan-50 text-cyan-700' },
];
function accentFor(insurerId, insurers) {
  const idx = insurers.findIndex((i) => i.id === insurerId);
  return ACCENTS[idx % ACCENTS.length] ?? ACCENTS[0];
}

export function PolicyCatalog() {
  const { state, deletePolicy, togglePolicyActive } = useStore();
  const toast = useToast();
  const [view, setView] = useState({ mode: 'list' });
  const [search, setSearch] = useState('');

  const handleDelete = (policy) => {
    if (!confirm(`Delete policy ${policy.policyNumber}?`)) return;
    try {
      deletePolicy(policy.id);
      toast.success('Policy deleted', `${policy.policyNumber} was removed from the catalog.`);
    } catch (err) {
      toast.error('Could not delete policy', err?.message);
    }
  };

  const handleTogglePublish = (policy) => {
    try {
      togglePolicyActive(policy.id);
      toast.success(
        policy.active ? 'Policy unpublished' : 'Policy published',
        policy.active
          ? `${policy.policyNumber} is now hidden from agents/users.`
          : `${policy.policyNumber} is now visible to agents/users.`,
      );
    } catch (err) {
      toast.error('Could not update policy', err?.message);
    }
  };

  const insurerName = (id) => state.insurers.find((i) => i.id === id)?.name ?? id;
  const insurerShortCode = (id) => state.insurers.find((i) => i.id === id)?.shortCode ?? '';

  const filtered = useMemo(() => {
    if (!search.trim()) return state.policies;
    const q = search.trim().toLowerCase();
    return state.policies.filter((p) => {
      const haystack = `${p.policyNumber} ${insurerName(p.insurerId)} ${getOptionLabel('vehicleClass', p.category)}`.toLowerCase();
      return haystack.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.policies, search, state.insurers]);

  const publishedCount = state.policies.filter((p) => p.active).length;

  if (view.mode === 'create') {
    return (
      <PolicyForm
        onDone={(result) => {
          setView({ mode: 'list' });
          if (result?.policyNumber) toast.success('Policy uploaded', `${result.policyNumber} was added to the catalog.`);
        }}
      />
    );
  }
  if (view.mode === 'edit') {
    return (
      <PolicyForm
        initialPolicy={view.policy}
        onDone={(result) => {
          setView({ mode: 'list' });
          if (result?.policyNumber) toast.success('Policy updated', `${result.policyNumber} was saved successfully.`);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Policy Catalog</h2>
            <p className="text-sm text-slate-500 mt-0.5">Issued policy — vehicle, IDV, and premium detail, one record per policy.</p>
          </div>
          <Button variant="primary" onClick={() => setView({ mode: 'create' })}>
            + Upload Policy
          </Button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-slate-50">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>
              <strong className="text-slate-800 font-semibold">{state.policies.length}</strong> total
            </span>
            <span className="w-px h-3 bg-slate-300" />
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <strong className="text-slate-800 font-semibold">{publishedCount}</strong> published
            </span>
            <span className="w-px h-3 bg-slate-300" />
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <strong className="text-slate-800 font-semibold">{state.policies.length - publishedCount}</strong> draft
            </span>
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search policy no., insurer, vehicle…"
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        <div className="p-5">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-8 text-center">No policy certificates match.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((policy) => {
                const accent = accentFor(policy.insurerId, state.insurers);
                return (
                  <div
                    key={policy.id}
                    className={`group relative rounded-2xl border border-slate-200 bg-white overflow-hidden
                      transition-all duration-200 ease-out hover:shadow-lg hover:shadow-slate-900/10 hover:border-slate-300
                      ${!policy.active ? 'opacity-60' : ''}`}
                  >
                    <div className={`h-1.5 w-full ${accent.bar}`} />

                    <div className="p-4 space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${accent.chip}`}
                          >
                            {(insurerShortCode(policy.insurerId) || insurerName(policy.insurerId)).charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 leading-tight truncate">{insurerName(policy.insurerId)}</p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">{policy.policyNumber}</p>
                          </div>
                        </div>
                        <Badge tone={policy.active ? 'green' : 'slate'}>{policy.active ? 'Published' : 'Draft'}</Badge>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-800">{getOptionLabel('vehicleClass', policy.category)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {getOptionLabel('fuelType', policy.fuelType)} · {policy.cubicCapacity ? `${policy.cubicCapacity}cc` : '—'} ·{' '}
                          {getOptionLabel('policyType', policy.policyType)}
                        </p>
                      </div>

                      <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">IDV</p>
                          <p className="text-sm font-mono font-medium text-slate-600">₹{policy.idv.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">Final premium</p>
                          <p className="text-lg font-bold text-slate-900 font-mono">
                            ₹{policy.premium.finalPremium.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <Button size="sm" className="flex-1" onClick={() => setView({ mode: 'edit', policy })}>
                          Edit
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => handleTogglePublish(policy)}>
                          {policy.active ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(policy)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
