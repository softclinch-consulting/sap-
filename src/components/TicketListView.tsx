import React, { useState, useEffect } from 'react';
import {
  Ticket,
  User,
  TicketPriority,
  TicketStatus,
  SAPModule
} from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  AlertTriangle,
  Flame,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Building2,
  RefreshCw,
  ExternalLink,
  Paperclip,
  FileSpreadsheet
} from 'lucide-react';

interface TicketListViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
  initialSearch?: string;
}

export const TicketListView: React.FC<TicketListViewProps> = ({
  currentUser,
  onNavigate,
  initialSearch = ''
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [currentUser, selectedStatus, selectedPriority, selectedModule, assignedToMeOnly]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;
      if (selectedModule !== 'ALL') params.module = selectedModule;
      if (assignedToMeOnly) params.assignedToMe = true;
      if (search) params.search = search;

      const res = await api.getTickets(params);
      setTickets(res.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTickets();
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'P1':
        return <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-max">P1 Critical</span>;
      case 'P2':
        return <span className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded w-max">P2 High</span>;
      case 'P3':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded w-max">P3 Medium</span>;
      case 'P4':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded w-max">P4 Low</span>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'New':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded font-medium">New</span>;
      case 'Assigned':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 rounded font-medium">Assigned</span>;
      case 'In Progress':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-xs px-2 py-0.5 rounded font-medium">In Progress</span>;
      case 'Pending Client':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded font-medium">Pending Client</span>;
      case 'Pending Admin Review':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2 py-0.5 rounded font-bold flex items-center gap-1"><Clock className="w-3 h-3 text-amber-700" /> Pending Admin Review</span>;
      case 'Escalated':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">Escalated</span>;
      case 'Resolved':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded font-medium">Resolved</span>;
      case 'Closed':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5 rounded font-medium">Closed</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">{status}</span>;
    }
  };

  const getSLABadge = (t: Ticket) => {
    if (t.status === 'Resolved' || t.status === 'Closed') {
      return (
        <span className="text-[11px] text-emerald-700 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Met Target
        </span>
      );
    }
    if (t.isResolutionBreached || t.isResponseBreached) {
      return (
        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-red-200">
          <AlertTriangle className="w-3 h-3 text-red-600" /> Breached
        </span>
      );
    }
    if (t.isAtRisk) {
      return (
        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-amber-300 animate-pulse">
          <Flame className="w-3 h-3 text-amber-600" /> At Risk (&lt; 1h)
        </span>
      );
    }
    return (
      <span className="text-[11px] text-slate-600 flex items-center gap-1">
        <Clock className="w-3 h-3 text-slate-400" /> On Schedule
      </span>
    );
  };

  const isConsultant = currentUser?.role === 'SAP_CONSULTANT';
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'AMS_MANAGER';

  return (
    <div className="space-y-4">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            SAP Incident &amp; Request Register
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              {tickets.length} records
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time SAP support tickets with SLA deadline tracking, T-codes, and consultant assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={() => onNavigate('management-sheets')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              Google Sheet Register (Admin)
            </button>
          )}

          <a
            href="/api/tickets/export/csv"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>

          <button
            onClick={() => onNavigate('create-ticket')}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Raise New Ticket
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, Subject, T-Code..."
              className="w-full pl-8 pr-3 py-1 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-[#F5F7FA] border border-[#E5EAF0] rounded px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="New">New</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Client">Pending Client</option>
            <option value="Pending Admin Review">Pending Admin Review</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="bg-[#F5F7FA] border border-[#E5EAF0] rounded px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 Critical</option>
            <option value="P2">P2 High</option>
            <option value="P3">P3 Medium</option>
            <option value="P4">P4 Low</option>
          </select>

          {/* SAP Module Filter */}
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
            className="bg-[#F5F7FA] border border-[#E5EAF0] rounded px-2.5 py-1 text-slate-700 focus:outline-none"
          >
            <option value="ALL">All SAP Modules</option>
            <option value="SAP FI">SAP FI</option>
            <option value="SAP CO">SAP CO</option>
            <option value="SAP MM">SAP MM</option>
            <option value="SAP SD">SAP SD</option>
            <option value="SAP BASIS">SAP BASIS</option>
            <option value="SAP ABAP">SAP ABAP</option>
            <option value="SAP Fiori">SAP Fiori</option>
            <option value="SAP S/4HANA">SAP S/4HANA</option>
          </select>

          {isConsultant && (
            <label className="flex items-center gap-1.5 cursor-pointer ml-2 text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={assignedToMeOnly}
                onChange={e => setAssignedToMeOnly(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              Assigned to me
            </label>
          )}
        </div>

        <button
          onClick={loadTickets}
          className="text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 flex items-center gap-1 text-xs"
          title="Refresh List"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ticket Table */}
      <div className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Ticket ID</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Organization / SID</th>
                <th className="py-2.5 px-3">Module &amp; T-Code</th>
                <th className="py-2.5 px-3 max-w-sm">Subject &amp; Impact</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">SLA Status</th>
                <th className="py-2.5 px-3">Consultant</th>
                <th className="py-2.5 px-3 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No tickets match the selected criteria.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => onNavigate('ticket-detail', t.id)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-blue-700 group-hover:underline whitespace-nowrap">
                      {t.id}
                    </td>

                    <td className="py-3 px-3">
                      {getPriorityBadge(t.priority)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 truncate max-w-[140px]">{t.organizationName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SID: {t.sapSystemSid} • Mnd: {t.generalData?.sapClient || '100'}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{t.sapModule}</div>
                      <div className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded w-max mt-0.5">
                        {t.transactionCode || 'N/A'}
                      </div>
                    </td>

                    <td className="py-3 px-3 max-w-sm">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 truncate">
                        <span className="truncate">{t.subject}</span>
                        {(t.attachmentsCount || 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[10px] shrink-0 font-normal">
                            <Paperclip className="w-2.5 h-2.5" />
                            {t.attachmentsCount}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.description}</div>
                    </td>

                    <td className="py-3 px-3">
                      {getStatusBadge(t.status)}
                    </td>

                    <td className="py-3 px-3">
                      {getSLABadge(t)}
                    </td>

                    <td className="py-3 px-3">
                      {t.assignedConsultantName ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[9px]">
                            {t.assignedConsultantName.charAt(0)}
                          </div>
                          <span className="truncate max-w-[110px] font-medium">{t.assignedConsultantName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(t.createdDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
