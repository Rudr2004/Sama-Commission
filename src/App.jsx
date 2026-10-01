import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { StoreProvider, useStore } from './store/StoreContext.jsx';
import { ToastProvider } from './components/common/ToastContext.jsx';
import { RoleSwitcher } from './components/common/RoleSwitcher.jsx';
import { Button } from './components/common/Button.jsx';
import logo from './assets/logo.jpg';
import { AdminLayout } from './pages/admin/AdminLayout.jsx';
import { InsurerManagement } from './pages/admin/InsurerManagement.jsx';
import { AgentManagement } from './pages/admin/AgentManagement.jsx';
import { PolicyCatalog } from './pages/admin/PolicyCatalog.jsx';
import { QuickCommissionRule } from './pages/admin/QuickCommissionRule.jsx';
import { AgentOverrides } from './pages/admin/AgentOverrides.jsx';
import { RuleSimulator } from './pages/admin/RuleSimulator.jsx';
import { CommissionGrid } from './pages/admin/CommissionGrid.jsx';
import { GridQuote } from './pages/admin/GridQuote.jsx';
import { AgentLayout } from './pages/agent/AgentLayout.jsx';
import { AgentPortal } from './pages/agent/AgentPortal.jsx';
import { PolicyBrowse } from './pages/agent/PolicyBrowse.jsx';

function Header() {
  const { resetDemoData } = useStore();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/agent" className="flex items-center gap-2">
          <img src={logo} alt="Sama Insurance" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <p className="font-semibold text-slate-900 leading-tight">Commission Rules Engine</p>
            {/* <p className="text-xs text-slate-400 leading-tight">Motor insurance POC</p> */}
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          {/* <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm('Reset all demo data to the seeded defaults?')) resetDemoData();
            }}
            title="Reset in-memory demo data"
          >
            Reset demo data
          </Button> */}
        </div>
      </div>
    </header>
  );
}

function AppShell() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/agent" replace />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<InsurerManagement />} />
            <Route path="agents" element={<AgentManagement />} />
            <Route path="policies" element={<PolicyCatalog />} />
            <Route path="quick-rule" element={<QuickCommissionRule />} />
            <Route path="rules" element={<Navigate to="/admin/quick-rule" replace />} />
            <Route path="overrides" element={<AgentOverrides />} />
            <Route path="simulate" element={<RuleSimulator />} />
            <Route path="commission-grid" element={<CommissionGrid />} />
            <Route path="grid-quote" element={<GridQuote />} />
          </Route>
          <Route path="/agent" element={<AgentLayout />}>
            <Route index element={<AgentPortal />} />
            <Route path="policies" element={<PolicyBrowse />} />
          </Route>
          <Route path="*" element={<Navigate to="/agent" replace />} />
        </Routes>
      </main>
      {/* <footer className="text-center text-xs text-slate-400 py-4">
        Proof of concept — in-memory data only, resets on reload.
      </footer> */}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </StoreProvider>
  );
}
