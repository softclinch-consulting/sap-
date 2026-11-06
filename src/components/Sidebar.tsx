import React from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  PlusCircle,
  Building2,
  Server,
  Layers,
  Users,
  Timer,
  GitPullRequest,
  BookOpen,
  BarChart3,
  Bell,
  FileText,
  Settings,
  Database,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { User, UserRole } from '../types/index.ts';

interface SidebarProps {
  currentUser: User | null;
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, activeView, onNavigate }) => {
  const role: UserRole = currentUser?.role || 'SUPER_ADMIN';

  // Navigation builders based on spec:
  // Admin Navigation (SUPER_ADMIN, AMS_MANAGER, SUPPORT_LEAD)
  // Consultant Navigation (SAP_CONSULTANT)
  // Client Navigation (CLIENT_ADMIN, CLIENT_EMPLOYEE)

  const isInternalStaff =
    role === 'SUPER_ADMIN' || role === 'AMS_MANAGER' || role === 'SUPPORT_LEAD';
  const isConsultant = role === 'SAP_CONSULTANT';
  const isClient = role === 'CLIENT_ADMIN' || role === 'CLIENT_EMPLOYEE';

  return (
    <aside className="w-64 bg-[#101B2D] text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 select-none z-40 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3 bg-[#0d1624]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#0F766E] flex items-center justify-center font-bold text-white shadow-md text-base tracking-wider">
          SC
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-wide leading-tight flex items-center gap-1.5">
            SoftClinch
            <span className="text-[10px] bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium px-1 rounded">AMS</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium tracking-tight">SAP Support Desk</div>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Role View</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
          {role.replace('_', ' ')}
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 text-xs">
        {/* Core Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'dashboard'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>{isClient || isConsultant ? 'My Dashboard' : 'Operations Dashboard'}</span>
          </div>
          {activeView === 'dashboard' && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
        </button>

        {/* Raise New Ticket (prominent for Client and Support Lead) */}
        <button
          onClick={() => onNavigate('create-ticket')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'create-ticket'
              ? 'bg-[#0F766E] text-white shadow-xs'
              : 'text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 hover:bg-emerald-900/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-emerald-300">Raise SAP Ticket</span>
          </div>
          <span className="text-[9px] bg-emerald-700/50 text-emerald-200 px-1.5 py-0.2 rounded font-bold">NEW</span>
        </button>

        {/* Section: Ticket Management */}
        <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Ticket Workspace
        </div>

        <button
          onClick={() => onNavigate('tickets')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'tickets'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <TicketIcon className="w-4 h-4" />
            <span>{isConsultant ? 'Assigned Tickets' : isClient ? 'My Tickets' : 'All Tickets'}</span>
          </div>
        </button>

        {/* Section: SAP & Clients (Admins/Managers) */}
        {isInternalStaff && (
          <>
            <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              SAP Enterprise Operations
            </div>

            <button
              onClick={() => onNavigate('organizations')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
                activeView === 'organizations'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                <span>Clients &amp; Organizations</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('landscapes')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
                activeView === 'landscapes'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4" />
                <span>SAP Landscape</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('support-team')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
                activeView === 'support-team'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Support Team &amp; Workload</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('sla-management')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
                activeView === 'sla-management'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Timer className="w-4 h-4" />
                <span>SLA Management Engine</span>
              </div>
            </button>
          </>
        )}

        {/* Client Organization profile view if client */}
        {isClient && (
          <button
            onClick={() => onNavigate('my-organization')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
              activeView === 'my-organization'
                ? 'bg-[#2563EB] text-white'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4" />
              <span>My Organization</span>
            </div>
          </button>
        )}

        {/* Change Requests */}
        <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Governance &amp; Knowledge
        </div>

        <button
          onClick={() => onNavigate('change-requests')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'change-requests'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <GitPullRequest className="w-4 h-4" />
            <span>Change Requests (CR)</span>
          </div>
        </button>

        <button
          onClick={() => onNavigate('knowledge-base')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'knowledge-base'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4" />
            <span>SAP Knowledge Base</span>
          </div>
        </button>

        {/* Time Tracking (Consultants and Managers) */}
        {!isClient && (
          <button
            onClick={() => onNavigate('time-tracking')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
              activeView === 'time-tracking'
                ? 'bg-[#2563EB] text-white'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Timer className="w-4 h-4" />
              <span>Support Time Tracking</span>
            </div>
          </button>
        )}

        {/* Reports & Analytics */}
        <button
          onClick={() => onNavigate('reports')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'reports'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4" />
            <span>Reports &amp; Analytics</span>
          </div>
        </button>

        {/* System Administration & Local Storage */}
        {role === 'SUPER_ADMIN' && (
          <>
            <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Administration &amp; Storage
            </div>

            <button
              onClick={() => onNavigate('database-management')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
                activeView === 'database-management'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                <span>Database &amp; Backups</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('audit-logs')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
                activeView === 'audit-logs'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Audit Trail Logs</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-[#0d1624] text-[11px] text-slate-400">
        <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
          <span>SoftClinch Local Desk</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">v2.4 LTS</span>
        </div>
        <div className="text-[10px] text-slate-500 truncate">
          Storage: <span className="text-slate-400">./database/sap-support.db</span>
        </div>
      </div>
    </aside>
  );
};
