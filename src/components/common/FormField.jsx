// Hover-triggered info icon + tooltip, e.g. for showing the formula behind
// an auto-calculated field (IDV, Premium Amount). Pure CSS (group-hover) —
// no JS state, works the same in every FormField without extra wiring.
function InfoTooltip({ text }) {
  return (
    <span className="relative inline-flex items-center group ml-1 align-middle">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-300 text-slate-400 text-[10px] font-bold leading-none cursor-pointer hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50"
        aria-label="More info"
      >
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:block w-72 rounded-lg bg-slate-900 text-white text-xs leading-relaxed px-3.5 py-3 shadow-xl z-20 whitespace-pre-line">
        {text}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
      </span>
    </span>
  );
}

export function FormField({ label, children, hint, required, infoTooltip }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {infoTooltip && <InfoTooltip text={infoTooltip} />}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

export function TextInput(props) {
  return <input className={inputClass} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={`${inputClass} bg-white`} {...props}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea className={inputClass} {...props} />;
}
