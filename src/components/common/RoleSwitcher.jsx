import { useNavigate, useLocation } from 'react-router-dom';

export function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const setRole = (role) => {
    navigate(role === 'admin' ? '/admin' : '/agent');
  };

  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden">
      <button
        onClick={() => setRole('admin')}
        className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
          isAdmin ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Admin
      </button>
      <button
        onClick={() => setRole('agent')}
        className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
          !isAdmin ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Agent
      </button>
    </div>
  );
}
