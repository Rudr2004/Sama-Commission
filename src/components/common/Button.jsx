const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:outline-red-500',
  ghost: 'text-slate-600 hover:bg-slate-100',
  subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
};

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 rounded-md',
  md: 'text-sm px-3.5 py-2 rounded-lg',
};

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
