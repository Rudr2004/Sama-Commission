import { useEffect, useMemo, useRef, useState } from 'react';

const VISIBLE_OPTION_COUNT = 5;
const OPTION_ROW_HEIGHT_PX = 36;

// Custom dropdown for the Commission Grid's filter bar, built specifically to
// fix a real problem with plain <select> here: RTO lists can run 40+ options,
// and a native <select> popup is browser-rendered — unstyled, can't be capped
// in height, and (as seen live) can render wider than the viewport and spill
// off-screen. This renders its own absolutely-positioned popup instead, so it
// stays clipped to a fixed height (5 rows, scrollable) and never overflows,
// plus a search box so a 40-option list is actually usable.
export function CommissionGridFilterSelect({ value, onChange, options, allLabel, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((o) => {
      if (o) setQuery('');
      return !o;
    });
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
    setQuery('');
  };

  const displayLabel = value === 'all' ? allLabel : value;

  return (
    <div
      className="relative"
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          setQuery('');
        }
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
          value === 'all' ? 'text-slate-500' : 'text-slate-900'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-slate-100">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: `${VISIBLE_OPTION_COUNT * OPTION_ROW_HEIGHT_PX}px` }}>
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                value === 'all' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
              }`}
              style={{ height: `${OPTION_ROW_HEIGHT_PX}px` }}
            >
              {allLabel}
            </button>
            {filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                  value === opt ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                }`}
                style={{ height: `${OPTION_ROW_HEIGHT_PX}px` }}
              >
                {opt}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <p className="px-3 py-3 text-xs text-slate-400 text-center">No matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
