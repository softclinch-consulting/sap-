import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Ticket as TicketIcon,
  PlusCircle,
  Users,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { User, UserRole } from '../types/index.ts';

interface ManagementSidebarProps {
  currentUser: User | null;
  activeView: string;
  onNavigate: (view: string, param?: string) => void;
  onLogout: () => void;
}

export const ManagementSidebar: React.FC<ManagementSidebarProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onLogout
}) => {
  const role: UserRole = currentUser?.role || 'SUPER_ADMIN';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'AMS_MANAGER';

  return (
    <aside className="w-64 bg-[#101B2D] text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 select-none z-40 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3 bg-[#0d1624]">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#0F766E] flex items-center justify-center font-bold text-white shadow-md text-base">
          SC
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-wide leading-tight flex items-center gap-1.5">
            SoftClinch
            <span className="text-[10px] bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium px-1 rounded">
              AMS
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Management Portal</div>
        </div>
      </div>

      {/* Role Banner */}
      <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Portal Access</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50">
          {role.replace('_', ' ')}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 text-xs">
        <button
          onClick={() => onNavigate('management-dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'management-dashboard'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>Management Dashboard</span>
          </div>
          {activeView === 'management-dashboard' && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
        </button>

        <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Support Operations
        </div>

        <button
          onClick={() => onNavigate('management-tickets')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'management-tickets'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <TicketIcon className="w-4 h-4" />
            <span>Ticket Management</span>
          </div>
        </button>

        {isAdmin && (
          <button
            onClick={() => onNavigate('management-sheets')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
              activeView === 'management-sheets'
                ? 'bg-[#0F9D58] text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Sheet Register</span>
            </div>
            <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 rounded font-bold">
              Admin Only
            </span>
          </button>
        )}

        <button
          onClick={() => onNavigate('management-team')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'management-team'
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
          onClick={() => onNavigate('management-reports')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium transition-colors ${
            activeView === 'management-reports'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4" />
            <span>Management Reports &amp; SLA</span>
          </div>
        </button>

        {isAdmin && (
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
          </>
        )}
      </div>

      {/* Bottom Footer Info & Logout */}
      <div className="p-3 border-t border-slate-800 bg-[#0d1624] text-[11px] text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-300 truncate">{currentUser?.name}</div>
          <button
            onClick={onLogout}
            className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
          >
            Sign Out
          </button>
        </div>
        <div className="text-[10px] text-slate-500">
          Storage: <span className="text-slate-400">./database/sap-support.db</span>
        </div>
      </div>
    </aside>
  );
};
