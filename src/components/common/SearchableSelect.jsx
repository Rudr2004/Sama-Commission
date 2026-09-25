import { useEffect, useRef, useState } from 'react';

const VISIBLE_OPTION_COUNT = 6;
// Matches the fixed row height below (py-2 + text-sm line-height) so the
// dropdown caps at exactly VISIBLE_OPTION_COUNT rows before scrolling.
const OPTION_ROW_HEIGHT_PX = 36;

// A dropdown for long option lists (e.g. RTOs) that shows a fixed number of
// rows and scrolls for the rest. Unlike a native <select>, its popup is a
// normal absolutely-positioned div — sized and clipped by our own CSS — so
// it never renders wider than the trigger or spills past the viewport edge
// the way native <select> popups (browser-owned, unstyleable) can with long
// option labels.
export function SearchableSelect({ value, onChange, options, placeholder = 'Select…', disabled = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    setOpen((o) => !o);
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
          selectedOption ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight: `${VISIBLE_OPTION_COUNT * OPTION_ROW_HEIGHT_PX}px` }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                  String(opt.value) === String(value) ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                }`}
                style={{ height: `${OPTION_ROW_HEIGHT_PX}px` }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
