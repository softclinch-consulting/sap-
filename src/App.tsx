import React, { useState, useEffect } from 'react';
import { User } from './types/index.ts';
import { api, getActiveUserId, setActiveUserId } from './services/api.ts';
import { Header } from './components/Header.tsx';
import { ManagementSidebar } from './components/ManagementSidebar.tsx';
import { ManagementDashboardView } from './components/ManagementDashboardView.tsx';
import { TicketListView } from './components/TicketListView.tsx';
import { ManagementTicketWorkspace } from './components/ManagementTicketWorkspace.tsx';
import { CustomerPortal } from './components/CustomerPortal.tsx';
import { SupportTeamView } from './components/SupportTeamView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { DatabaseManagementView } from './components/DatabaseManagementView.tsx';
import { CreateTicketView } from './components/CreateTicketView.tsx';
import { LoginView } from './components/LoginView.tsx';
import { GoogleSheetView } from './components/GoogleSheetView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ChevronRight, Home, Building2, Ticket, ArrowLeftRight } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Portal mode: 'management' | 'customer' | 'management-login' | 'customer-login'
  const [portalMode, setPortalMode] = useState<'management' | 'customer' | 'management-login' | 'customer-login'>('management');

  // Navigation view within portal
  const [activeView, setActiveView] = useState<string>('management-dashboard');
  const [viewParam, setViewParam] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check URL or path if specified
    const path = window.location.pathname;
    if (path.includes('/customer/login')) {
      setPortalMode('customer-login');
      setLoading(false);
      return;
    } else if (path.includes('/management/login')) {
      setPortalMode('management-login');
      setLoading(false);
      return;
    }

    loadInitialUser();
  }, []);

  const loadInitialUser = async () => {
    try {
      setLoading(true);
      const res = await api.getCurrentUser();
      setCurrentUser(res.user);

      // Determine portal based on role
      const isClient = res.user.role === 'CLIENT_ADMIN' || res.user.role === 'CLIENT_EMPLOYEE';
      if (isClient) {
        setPortalMode('customer');
        setActiveView('customer-dashboard');
      } else {
        setPortalMode('management');
        setActiveView('management-dashboard');
      }
    } catch (err) {
      console.error(err);
      setPortalMode('management-login');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    const isClient = user.role === 'CLIENT_ADMIN' || user.role === 'CLIENT_EMPLOYEE';
    if (isClient) {
      setPortalMode('customer');
      setActiveView('customer-dashboard');
    } else {
      setPortalMode('management');
      setActiveView('management-dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('softclinch_active_user_id');
    setCurrentUser(null);
    if (portalMode === 'customer') {
      setPortalMode('customer-login');
    } else {
      setPortalMode('management-login');
    }
  };

  const handleNavigate = (view: string, param?: string) => {
    let targetView = view;
    // Normalize aliases so no route, search, or notification click ever causes a blank screen
    if (view === 'ticket-detail') {
      targetView = portalMode === 'customer' ? 'customer-ticket-detail' : 'management-ticket-workspace';
    } else if (view === 'tickets') {
      targetView = portalMode === 'customer' ? 'customer-tickets' : 'management-tickets';
    } else if (view === 'dashboard') {
      targetView = portalMode === 'customer' ? 'customer-dashboard' : 'management-dashboard';
    } else if (view === 'support-team') {
      targetView = 'management-team';
    } else if (view === 'reports') {
      targetView = 'management-reports';
    }

    setActiveView(targetView);
    setViewParam(param);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchPortalDirect = (target: 'management' | 'customer') => {
    if (target === 'customer') {
      // Find default customer user
      api.switchUser('usr-client-acme-admin').then(res => {
        setActiveUserId(res.user.id);
        setCurrentUser(res.user);
        setPortalMode('customer');
        setActiveView('customer-dashboard');
      });
    } else {
      // Switch to default admin
      api.switchUser('usr-superadmin').then(res => {
        setActiveUserId(res.user.id);
        setCurrentUser(res.user);
        setPortalMode('management');
        setActiveView('management-dashboard');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <div className="text-xs font-bold text-slate-700 tracking-wide uppercase">
            SoftClinch SAP Support Desk
          </div>
          <div className="text-[11px] text-slate-500">Initializing portals...</div>
        </div>
      </div>
    );
  }

  // LOGIN VIEWS
  if (portalMode === 'management-login') {
    return (
      <LoginView
        portalType="management"
        onLoginSuccess={handleLoginSuccess}
        onSwitchPortal={p => setPortalMode(p === 'customer' ? 'customer-login' : 'management-login')}
      />
    );
  }

  if (portalMode === 'customer-login') {
    return (
      <LoginView
        portalType="customer"
        onLoginSuccess={handleLoginSuccess}
        onSwitchPortal={p => setPortalMode(p === 'customer' ? 'customer-login' : 'management-login')}
      />
    );
  }

  // 1. CUSTOMER PORTAL
  if (portalMode === 'customer') {
    return (
      <CustomerPortal
        currentUser={currentUser}
        activeView={activeView}
        viewParam={viewParam}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  }

  // 2. MANAGEMENT PORTAL
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Management Sidebar */}
      <ManagementSidebar
        currentUser={currentUser}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentUser={currentUser}
          onUserChanged={u => {
            setCurrentUser(u);
            const isClient = u.role === 'CLIENT_ADMIN' || u.role === 'CLIENT_EMPLOYEE';
            if (isClient) {
              setPortalMode('customer');
              setActiveView('customer-dashboard');
            }
          }}
          onNavigate={handleNavigate}
          activeView={activeView}
        />

        {/* Portal Switcher Banner */}
        <div className="px-6 py-2 bg-blue-50/70 border-b border-blue-200 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">SoftClinch SAP Support Desk</span>
            <span>•</span>
            <span className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.2 rounded">
              Management Portal
            </span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              (For SoftClinch AMS Managers &amp; Support Engineers)
            </span>
          </div>

          <button
            onClick={() => handleSwitchPortalDirect('customer')}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-teal-800 border border-teal-300 font-bold rounded text-[11px] flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <ArrowLeftRight className="w-3 h-3 text-teal-600" />
            Switch to Customer Portal View &rarr;
          </button>
        </div>

        {/* View Surface */}
        <main className="flex-1 p-6 overflow-y-auto">
          <ErrorBoundary onReset={() => setActiveView('management-dashboard')}>
            {(activeView === 'management-dashboard' || activeView === 'dashboard') && (
              <ManagementDashboardView currentUser={currentUser} onNavigate={handleNavigate} />
            )}

            {(activeView === 'management-tickets' || activeView === 'tickets') && (
              <TicketListView
                currentUser={currentUser}
                onNavigate={handleNavigate}
                initialSearch={viewParam}
              />
            )}

            {activeView === 'management-sheets' && (
              (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'AMS_MANAGER') ? (
                <GoogleSheetView
                  currentUser={currentUser}
                  portalType="management"
                  onNavigate={handleNavigate}
                  onTicketSelect={id => handleNavigate('management-ticket-workspace', id)}
                />
              ) : (
                <div className="bg-white p-6 rounded-lg border border-slate-200 text-center text-xs space-y-3 max-w-md mx-auto mt-12">
                  <div className="font-bold text-slate-800 text-sm">Access Restricted to Administrators</div>
                  <p className="text-slate-500">The Google Sheet Register is reserved strictly for Super Admin and AMS Delivery Managers.</p>
                  <button
                    onClick={() => handleNavigate('management-tickets')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded cursor-pointer"
                  >
                    Return to Ticket Management
                  </button>
                </div>
              )
            )}

            {(activeView === 'management-ticket-workspace' || activeView === 'ticket-detail') && (
              viewParam ? (
                <ManagementTicketWorkspace
                  ticketId={viewParam}
                  currentUser={currentUser}
                  onBack={() => handleNavigate('management-tickets')}
                  onNavigate={handleNavigate}
                />
              ) : (
                <TicketListView
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                  initialSearch={viewParam}
                />
              )
            )}

            {activeView === 'create-ticket' && (
              <CreateTicketView
                currentUser={currentUser}
                onBack={() => handleNavigate('management-tickets')}
                onTicketCreated={id => handleNavigate('management-ticket-workspace', id)}
              />
            )}

            {(activeView === 'management-team' || activeView === 'support-team') && (
              <SupportTeamView currentUser={currentUser} onNavigate={handleNavigate} />
            )}

            {(activeView === 'management-reports' || activeView === 'reports') && (
              <ReportsView currentUser={currentUser} onNavigate={handleNavigate} />
            )}

            {activeView === 'database-management' && (
              <DatabaseManagementView currentUser={currentUser} onNavigate={handleNavigate} />
            )}

            {/* Fallback to ManagementDashboardView so no view ever shows a blank screen */}
            {![
              'management-dashboard', 'dashboard',
              'management-tickets', 'tickets',
              'management-sheets',
              'management-ticket-workspace', 'ticket-detail',
              'create-ticket',
              'management-team', 'support-team',
              'management-reports', 'reports',
              'database-management'
            ].includes(activeView) && (
              <ManagementDashboardView currentUser={currentUser} onNavigate={handleNavigate} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
