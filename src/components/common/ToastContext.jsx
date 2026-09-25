import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 4000;

let idCounter = 0;
function nextToastId() {
  idCounter += 1;
  return `toast_${idCounter}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, { type = 'success', description, duration = AUTO_DISMISS_MS } = {}) => {
      const id = nextToastId();
      setToasts((list) => [...list, { id, message, description, type }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, description) => show(message, { type: 'success', description }),
      error: (message, description) => show(message, { type: 'error', description }),
      info: (message, description) => show(message, { type: 'info', description }),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const TYPE_STYLES = {
  success: {
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    bar: 'bg-emerald-500',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    ),
  },
  error: {
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    bar: 'bg-red-500',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    ),
  },
  info: {
    border: 'border-brand-200',
    iconBg: 'bg-brand-100',
    iconColor: 'text-brand-600',
    bar: 'bg-brand-500',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
};

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const style = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info;

  return (
    <div
      role="status"
      className={`pointer-events-auto relative overflow-hidden rounded-xl border ${style.border} bg-white shadow-lg shadow-slate-900/10 animate-toast-in`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />
      <div className="flex items-start gap-3 pl-4 pr-3 py-3">
        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${style.iconBg} ${style.iconColor}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {style.icon}
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 leading-tight">{toast.message}</p>
          {toast.description && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{toast.description}</p>}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-slate-350 hover:text-slate-500 rounded-md p-0.5 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
