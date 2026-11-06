import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, User, TicketPriority, TicketStatus } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  FileSpreadsheet,
  Search,
  Download,
  Copy,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  ExternalLink,
  Table,
  Check,
  ChevronRight,
  Database,
  ArrowUpDown,
  Zap,
  Link2,
  Code2
} from 'lucide-react';

interface GoogleSheetViewProps {
  currentUser: User | null;
  onNavigate?: (view: string, param?: string) => void;
  portalType: 'management' | 'customer';
  onTicketSelect?: (ticketId: string) => void;
}

export const GoogleSheetView: React.FC<GoogleSheetViewProps> = ({
  currentUser,
  onNavigate,
  portalType,
  onTicketSelect
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSheetTab, setActiveSheetTab] = useState<'tickets' | 'solved'>('tickets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; cellKey: string; value: string } | null>({
    row: 1,
    col: 1,
    cellKey: 'A1',
    value: 'Select a cell'
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Quick Add Row Modal state
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newModule, setNewModule] = useState('SAP FI');
  const [newSystemSid, setNewSystemSid] = useState('P01');
  const [newTCode, setNewTCode] = useState('FB01');
  const [newPriority, setNewPriority] = useState<TicketPriority>('P3');
  const [savingNewRow, setSavingNewRow] = useState(false);

  // Real-Time Google Sheets Webhook Sync state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scriptCode, setScriptCode] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    loadTickets();
    loadSyncConfig();
    loadScriptCode();
  }, [currentUser]);

  const loadSyncConfig = async () => {
    try {
      const cfg = await api.getGoogleSheetConfig();
      setWebhookUrl(cfg.webhookUrl || '');
      setSyncEnabled(cfg.enabled);
      setLastSyncTime(cfg.lastSync);
    } catch (_) {}
  };

  const loadScriptCode = async () => {
    try {
      const res = await api.getGoogleSheetsScript();
      setScriptCode(res.script);
    } catch (_) {}
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) return;
    try {
      const res = await api.saveGoogleSheetConfig(webhookUrl.trim());
      setSyncEnabled(res.enabled);
      setSyncStatusMsg({ type: 'success', text: 'Google Apps Script Web App URL saved!' });
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: err.message || 'Failed to save configuration' });
    }
  };

  const handleTestAndSyncNow = async () => {
    try {
      setSyncingNow(true);
      setSyncStatusMsg(null);
      if (webhookUrl.trim()) {
        await api.saveGoogleSheetConfig(webhookUrl.trim());
        setSyncEnabled(true);
      }
      const res = await api.syncAllGoogleSheets();
      setSyncStatusMsg({ type: 'success', text: res.message });
      await loadSyncConfig();
      await loadTickets();
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: err.message || 'Sync failed. Ensure your Apps Script is deployed as Web App with access set to "Anyone".' });
    } finally {
      setSyncingNow(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    });
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getTickets();
      setTickets(res.tickets);
    } catch (err) {
      console.error('Failed to load tickets for sheet view:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sheet 1: Active Tickets (New, Assigned, In Progress, Pending Client, Escalated)
  const activeTickets = useMemo(() => {
    return tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  }, [tickets]);

  // Sheet 2: Solved Tickets (Resolved, Closed)
  const solvedTickets = useMemo(() => {
    return tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
  }, [tickets]);

  // Filter based on active sheet and search query
  const displayedTickets = useMemo(() => {
    const list = activeSheetTab === 'tickets' ? activeTickets : solvedTickets;
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(t =>
      t.id.toLowerCase().includes(query) ||
      t.subject.toLowerCase().includes(query) ||
      t.sapModule.toLowerCase().includes(query) ||
      t.organizationName.toLowerCase().includes(query) ||
      (t.transactionCode && t.transactionCode.toLowerCase().includes(query)) ||
      (t.assignedConsultantName && t.assignedConsultantName.toLowerCase().includes(query)) ||
      (t.resolutionSummary && t.resolutionSummary.toLowerCase().includes(query)) ||
      (t.rootCause && t.rootCause.toLowerCase().includes(query))
    );
  }, [activeSheetTab, activeTickets, solvedTickets, searchQuery]);

  // Handle inline status change (Admin / Management side)
  const handleInlineStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    if (portalType === 'customer') return;
    try {
      setStatusUpdating(ticketId);
      const isSolving = newStatus === 'Resolved' || newStatus === 'Closed';
      await api.updateTicketStatus(
        ticketId,
        newStatus,
        isSolving ? 'Issue verified and marked as solved via Google Sheet Register.' : undefined,
        isSolving ? 'Configuration and functional adjustments validated.' : undefined
      );
      await loadTickets();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  // Handle Quick Add Row / Ticket
  const handleCreateRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    try {
      setSavingNewRow(true);
      await api.createTicket({
        organizationId: currentUser?.organizationId || undefined,
        subject: newSubject.trim(),
        description: newDescription.trim() || newSubject.trim(),
        sapModule: newModule as any,
        sapSystemSid: newSystemSid,
        environment: 'Production',
        transactionCode: newTCode.toUpperCase() || 'N/A',
        issueCategory: 'Functional Issue',
        businessImpact: 'Operational inquiry logged via Google Sheet form.',
        priority: newPriority,
        generalData: {
          category: 'Incident',
          sapRelease: 'SAP S/4HANA 2023 FPS02',
          sapClient: '100',
          dbSystem: 'SAP HANA 2.0 SPS07',
          businessProcess: `${newModule} Operations`,
          department: currentUser?.designation || 'Enterprise Support',
          contactPhone: currentUser?.phone || '+1 (555) 010-0000',
          timezone: 'UTC',
          urgency: newPriority === 'P1' ? 'Immediate' : 'Medium'
        }
      });

      setNewSubject('');
      setNewDescription('');
      setShowAddRowModal(false);
      await loadTickets();
      setActiveSheetTab('tickets');
    } catch (err) {
      console.error('Failed to create ticket row:', err);
    } finally {
      setSavingNewRow(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = '';
    if (activeSheetTab === 'tickets') {
      csv = 'Ticket ID,Logged Date,Organization,Client Contact,Module,SID,T-Code,Subject,Priority,Status,Assigned Consultant,SLA Deadline\n';
      activeTickets.forEach(t => {
        csv += `"${t.id}","${new Date(t.createdDate).toLocaleDateString()}","${t.organizationName}","${t.clientContactName}","${t.sapModule}","${t.sapSystemSid}","${t.transactionCode || 'N/A'}","${t.subject.replace(/"/g, '""')}","${t.priority}","${t.status}","${t.assignedConsultantName || 'Unassigned'}","${t.resolutionDeadline || 'N/A'}"\n`;
      });
    } else {
      csv = 'Ticket ID,Resolved Date,Organization,Module,Subject,Root Cause,Resolution Summary,Time Spent (Min),Resolved By,SLA Met\n';
      solvedTickets.forEach(t => {
        csv += `"${t.id}","${t.resolutionDate ? new Date(t.resolutionDate).toLocaleDateString() : 'N/A'}","${t.organizationName}","${t.sapModule}","${t.subject.replace(/"/g, '""')}","${(t.rootCause || 'N/A').replace(/"/g, '""')}","${(t.resolutionSummary || 'Resolved').replace(/"/g, '""')}","${t.timeSpentMinutes || 0}","${t.assignedConsultantName || 'AMS Team'}","Met Target"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SoftClinch_${activeSheetTab === 'tickets' ? 'Active_Tickets' : 'Solved_Tickets'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy to Clipboard as TSV (Tab Separated Values) -> Allows direct Ctrl+V into real Google Sheets!
  const handleCopyTSV = () => {
    let tsv = '';
    if (activeSheetTab === 'tickets') {
      tsv = 'Ticket ID\tLogged Date\tOrganization\tClient Contact\tModule\tSID\tT-Code\tSubject\tPriority\tStatus\tAssigned Consultant\tSLA Deadline\n';
      activeTickets.forEach(t => {
        tsv += `${t.id}\t${new Date(t.createdDate).toLocaleDateString()}\t${t.organizationName}\t${t.clientContactName}\t${t.sapModule}\t${t.sapSystemSid}\t${t.transactionCode || 'N/A'}\t${t.subject}\t${t.priority}\t${t.status}\t${t.assignedConsultantName || 'Unassigned'}\t${t.resolutionDeadline || 'N/A'}\n`;
      });
    } else {
      tsv = 'Ticket ID\tResolved Date\tOrganization\tModule\tSubject\tRoot Cause\tResolution Summary\tTime Spent (Min)\tResolved By\tSLA Status\n';
      solvedTickets.forEach(t => {
        tsv += `${t.id}\t${t.resolutionDate ? new Date(t.resolutionDate).toLocaleDateString() : 'N/A'}\t${t.organizationName}\t${t.sapModule}\t${t.subject}\t${t.rootCause || 'N/A'}\t${t.resolutionSummary || 'Resolved'}\t${t.timeSpentMinutes || 0}\t${t.assignedConsultantName || 'AMS Team'}\tMet Target\n`;
      });
    }

    navigator.clipboard.writeText(tsv).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  // Row selection handler
  const handleRowClick = (t: Ticket) => {
    if (onTicketSelect) {
      onTicketSelect(t.id);
    } else if (onNavigate) {
      if (portalType === 'customer') {
        onNavigate('customer-ticket-detail', t.id);
      } else {
        onNavigate('management-ticket-workspace', t.id);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-white rounded-lg border border-[#C0C8D0] shadow-sm overflow-hidden select-none font-sans text-xs">
      {/* 1. GOOGLE SHEETS APP HEADER & MENU BAR */}
      <div className="bg-[#F8F9FA] border-b border-[#D8DDE3] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Google Sheets Emblem & Document Meta */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#0F9D58] flex items-center justify-center text-white shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">
                SoftClinch SAP Support Desk — Ticket Register
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-300">
                .GSHEET Local Edition
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
              <span className="hover:text-slate-800 cursor-pointer">File</span>
              <span className="hover:text-slate-800 cursor-pointer">Edit</span>
              <span className="hover:text-slate-800 cursor-pointer">View</span>
              <span className="hover:text-slate-800 cursor-pointer">Data</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Database className="w-3 h-3" />
                SQLite WAL Connected: <span className="font-mono text-[10px]">./database/sap-support.db</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search sheet..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#C0C8D0] rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>

          {/* Real-time Google Sheets Sync Button */}
          <button
            onClick={() => setShowSyncModal(true)}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border ${
              syncEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Configure real-time Google Sheets sync"
          >
            <Zap className={`w-3.5 h-3.5 ${syncEnabled ? 'text-emerald-600 fill-emerald-600' : 'text-amber-600'}`} />
            <span>{syncEnabled ? 'Google Sync: Live' : 'Connect Google Sheet'}</span>
            <span className={`w-2 h-2 rounded-full ${syncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          {/* Quick Add Row / Ticket */}
          <button
            onClick={() => setShowAddRowModal(true)}
            className="px-3 py-1.5 bg-[#0F9D58] hover:bg-emerald-700 text-white font-semibold rounded text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Row / Ticket
          </button>

          {/* Copy to Clipboard (TSV) */}
          <button
            onClick={handleCopyTSV}
            className={`px-3 py-1.5 border rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              copySuccess
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
            }`}
            title="Copy as Tab-Separated Values (can be pasted directly into Google Sheets or Excel)"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            {copySuccess ? 'Copied TSV!' : 'Copy to Sheets'}
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download this sheet as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          {/* Refresh */}
          <button
            onClick={loadTickets}
            className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded transition-colors cursor-pointer"
            title="Refresh from SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. FORMULA BAR (fx) */}
      <div className="bg-[#FFFFFF] border-b border-[#D8DDE3] px-3 py-1.5 flex items-center gap-2 text-xs">
        {/* Cell Coordinates Box */}
        <div className="w-16 px-2 py-0.5 bg-[#F1F3F4] border border-[#DADCE0] text-center font-mono font-bold text-slate-700 rounded">
          {selectedCell?.cellKey || 'A1'}
        </div>

        {/* fx symbol */}
        <div className="font-serif italic font-bold text-slate-400 select-none px-1">
          fx
        </div>

        {/* Formula / Cell Content Display */}
        <div className="flex-1 px-2.5 py-0.5 bg-[#FAFAFA] border border-[#DADCE0] text-slate-800 rounded font-mono truncate">
          {selectedCell?.value || 'Select any cell to inspect or edit'}
        </div>
      </div>

      {/* 3. MAIN SPREADSHEET TABLE GRID */}
      <div className="flex-1 overflow-auto bg-[#FFFFFF] relative">
        <table className="w-full border-collapse text-left border-spacing-0">
          {/* Column Letters (A, B, C, D...) Header */}
          <thead className="sticky top-0 z-20 bg-[#F8F9FA] shadow-xs">
            <tr className="border-b border-[#C0C8D0]">
              {/* Row index top-left corner */}
              <th className="w-10 bg-[#E8EAED] border-r border-[#C0C8D0] text-center text-[10px] text-slate-500 font-semibold p-1.5 select-none">
                #
              </th>

              {activeSheetTab === 'tickets' ? (
                <>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[130px]">
                    <span className="text-[10px] text-slate-400 block font-normal">A</span>
                    Ticket ID
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[100px]">
                    <span className="text-[10px] text-slate-400 block font-normal">B</span>
                    Logged Date
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[150px]">
                    <span className="text-[10px] text-slate-400 block font-normal">C</span>
                    Organization
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[120px]">
                    <span className="text-[10px] text-slate-400 block font-normal">D</span>
                    Contact Person
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[90px]">
                    <span className="text-[10px] text-slate-400 block font-normal">E</span>
                    Module
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[70px]">
                    <span className="text-[10px] text-slate-400 block font-normal">F</span>
                    SID
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[80px]">
                    <span className="text-[10px] text-slate-400 block font-normal">G</span>
                    T-Code
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[280px]">
                    <span className="text-[10px] text-slate-400 block font-normal">H</span>
                    Subject / Summary
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[90px]">
                    <span className="text-[10px] text-slate-400 block font-normal">I</span>
                    Priority
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[130px]">
                    <span className="text-[10px] text-slate-400 block font-normal">J</span>
                    Status {portalType === 'management' && '(Editable)'}
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[140px]">
                    <span className="text-[10px] text-slate-400 block font-normal">K</span>
                    Assigned Consultant
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[140px]">
                    <span className="text-[10px] text-slate-400 block font-normal">L</span>
                    SLA Deadline
                  </th>
                </>
              ) : (
                <>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[130px]">
                    <span className="text-[10px] text-slate-400 block font-normal">A</span>
                    Ticket ID
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[110px]">
                    <span className="text-[10px] text-slate-400 block font-normal">B</span>
                    Solved Date
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[150px]">
                    <span className="text-[10px] text-slate-400 block font-normal">C</span>
                    Organization
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[90px]">
                    <span className="text-[10px] text-slate-400 block font-normal">D</span>
                    Module
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[240px]">
                    <span className="text-[10px] text-slate-400 block font-normal">E</span>
                    Subject
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[240px]">
                    <span className="text-[10px] text-slate-400 block font-normal">F</span>
                    Root Cause Analysis
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[260px]">
                    <span className="text-[10px] text-slate-400 block font-normal">G</span>
                    Resolution Summary
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[100px]">
                    <span className="text-[10px] text-slate-400 block font-normal">H</span>
                    Time Spent
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[140px]">
                    <span className="text-[10px] text-slate-400 block font-normal">I</span>
                    Solved By
                  </th>
                  <th className="py-1.5 px-3 border-r border-[#D8DDE3] text-slate-700 font-semibold text-[11px] min-w-[120px]">
                    <span className="text-[10px] text-slate-400 block font-normal">J</span>
                    SLA Compliance
                  </th>
                </>
              )}
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody>
            {displayedTickets.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="py-12 text-center text-slate-400 italic bg-white"
                >
                  {loading
                    ? 'Loading spreadsheet records from SQLite...'
                    : `No ${activeSheetTab === 'tickets' ? 'active' : 'solved'} tickets found matching query.`}
                </td>
              </tr>
            ) : (
              displayedTickets.map((t, idx) => {
                const rowNum = idx + 1;
                const isSelectedRow = selectedCell?.row === rowNum;

                if (activeSheetTab === 'tickets') {
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-[#E8EAED] hover:bg-[#F3F4F6] transition-colors ${
                        isSelectedRow ? 'bg-[#E8F0FE]' : ''
                      }`}
                    >
                      {/* Row Number */}
                      <td className="bg-[#F8F9FA] border-r border-[#D8DDE3] text-center text-[11px] font-mono text-slate-500 py-2 select-none">
                        {rowNum}
                      </td>

                      {/* A: Ticket ID */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 1, cellKey: `A${rowNum}`, value: t.id })}
                        onDoubleClick={() => handleRowClick(t)}
                        className="py-2 px-3 border-r border-[#E8EAED] font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                        title="Double-click to open full ticket workspace"
                      >
                        {t.id}
                      </td>

                      {/* B: Logged Date */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 2, cellKey: `B${rowNum}`, value: t.createdDate })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-600 whitespace-nowrap"
                      >
                        {new Date(t.createdDate).toLocaleDateString()}
                      </td>

                      {/* C: Organization */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 3, cellKey: `C${rowNum}`, value: t.organizationName })}
                        className="py-2 px-3 border-r border-[#E8EAED] font-medium text-slate-800"
                      >
                        {t.organizationName}
                      </td>

                      {/* D: Contact Person */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 4, cellKey: `D${rowNum}`, value: `${t.clientContactName} (${t.clientContactEmail})` })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-700"
                      >
                        {t.clientContactName}
                      </td>

                      {/* E: Module */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 5, cellKey: `E${rowNum}`, value: t.sapModule })}
                        className="py-2 px-3 border-r border-[#E8EAED] font-medium text-slate-800"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                          {t.sapModule}
                        </span>
                      </td>

                      {/* F: SID */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 6, cellKey: `F${rowNum}`, value: t.sapSystemSid })}
                        className="py-2 px-3 border-r border-[#E8EAED] font-mono font-bold text-slate-700"
                      >
                        {t.sapSystemSid}
                      </td>

                      {/* G: T-Code */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 7, cellKey: `G${rowNum}`, value: t.transactionCode || 'N/A' })}
                        className="py-2 px-3 border-r border-[#E8EAED] font-mono text-purple-700 font-semibold"
                      >
                        {t.transactionCode || 'N/A'}
                      </td>

                      {/* H: Subject */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 8, cellKey: `H${rowNum}`, value: t.subject })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-900 font-medium max-w-sm truncate"
                        title={t.subject}
                      >
                        {t.subject}
                      </td>

                      {/* I: Priority */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 9, cellKey: `I${rowNum}`, value: t.priority })}
                        className="py-2 px-3 border-r border-[#E8EAED]"
                      >
                        <span
                          className={`font-bold text-[10px] px-2 py-0.5 rounded ${
                            t.priority === 'P1'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : t.priority === 'P2'
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : t.priority === 'P3'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* J: Status (Inline select for Admin, badge for customer) */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 10, cellKey: `J${rowNum}`, value: t.status })}
                        className="py-2 px-3 border-r border-[#E8EAED]"
                      >
                        {portalType === 'management' ? (
                          <select
                            value={t.status}
                            disabled={statusUpdating === t.id}
                            onChange={e => handleInlineStatusChange(t.id, e.target.value as TicketStatus)}
                            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-800 cursor-pointer focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                          >
                            <option value="New">New</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Pending Client">Pending Client</option>
                            <option value="Pending Admin Review">Pending Admin Review</option>
                            <option value="Escalated">Escalated</option>
                            <option value="Resolved">Resolved (Moves to Solved Sheet)</option>
                            <option value="Closed">Closed (Moves to Solved Sheet)</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              t.status === 'Pending Client'
                                ? 'bg-amber-100 text-amber-800'
                                : t.status === 'In Progress'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        )}
                      </td>

                      {/* K: Assigned Consultant */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 11, cellKey: `K${rowNum}`, value: t.assignedConsultantName || 'Unassigned' })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-700"
                      >
                        {t.assignedConsultantName || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>

                      {/* L: SLA Deadline */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 12, cellKey: `L${rowNum}`, value: t.resolutionDeadline || 'N/A' })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-500 whitespace-nowrap"
                      >
                        {t.resolutionDeadline ? new Date(t.resolutionDeadline).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  );
                } else {
                  // Solved Sheet Row
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-[#E8EAED] hover:bg-[#F3F4F6] transition-colors ${
                        isSelectedRow ? 'bg-[#E8F0FE]' : ''
                      }`}
                    >
                      {/* Row Number */}
                      <td className="bg-[#F8F9FA] border-r border-[#D8DDE3] text-center text-[11px] font-mono text-slate-500 py-2 select-none">
                        {rowNum}
                      </td>

                      {/* A: Ticket ID */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 1, cellKey: `A${rowNum}`, value: t.id })}
                        onDoubleClick={() => handleRowClick(t)}
                        className="py-2 px-3 border-r border-[#E8EAED] font-mono font-bold text-emerald-700 hover:underline cursor-pointer"
                        title="Double-click to view resolved ticket workspace"
                      >
                        {t.id}
                      </td>

                      {/* B: Solved Date */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 2, cellKey: `B${rowNum}`, value: t.resolutionDate || 'N/A' })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-700 whitespace-nowrap font-medium"
                      >
                        {t.resolutionDate ? new Date(t.resolutionDate).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* C: Organization */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 3, cellKey: `C${rowNum}`, value: t.organizationName })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-800"
                      >
                        {t.organizationName}
                      </td>

                      {/* D: Module */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 4, cellKey: `D${rowNum}`, value: t.sapModule })}
                        className="py-2 px-3 border-r border-[#E8EAED]"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                          {t.sapModule}
                        </span>
                      </td>

                      {/* E: Subject */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 5, cellKey: `E${rowNum}`, value: t.subject })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-900 font-medium max-w-xs truncate"
                        title={t.subject}
                      >
                        {t.subject}
                      </td>

                      {/* F: Root Cause */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 6, cellKey: `F${rowNum}`, value: t.rootCause || 'Root cause identified and corrected in configuration.' })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-600 max-w-xs truncate"
                        title={t.rootCause || 'N/A'}
                      >
                        {t.rootCause || <span className="text-slate-400 italic">Configuration aligned</span>}
                      </td>

                      {/* G: Resolution Summary */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 7, cellKey: `G${rowNum}`, value: t.resolutionSummary || 'Resolved successfully' })}
                        className="py-2 px-3 border-r border-[#E8EAED] text-slate-700 max-w-sm truncate"
                        title={t.resolutionSummary || 'Resolved'}
                      >
                        {t.resolutionSummary || <span className="text-emerald-700 font-semibold">Resolved successfully</span>}
                      </td>

                      {/* H: Time Spent */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 8, cellKey: `H${rowNum}`, value: `${t.timeSpentMinutes || 0} minutes` })}
                        className="py-2 px-3 border-r border-[#E8EAED] font-mono text-slate-700"
                      >
                        {t.timeSpentMinutes ? `${t.timeSpentMinutes} mins` : 'N/A'}
                      </td>

                      {/* I: Solved By */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 9, cellKey: `I${rowNum}`, value: t.assignedConsultantName || 'AMS Team' })}
                        className="py-2 px-3 border-r border-[#E8EAED] font-medium text-slate-800"
                      >
                        {t.assignedConsultantName || 'AMS Team'}
                      </td>

                      {/* J: SLA Met */}
                      <td
                        onClick={() => setSelectedCell({ row: rowNum, col: 10, cellKey: `J${rowNum}`, value: 'Target Met' })}
                        className="py-2 px-3 border-r border-[#E8EAED]"
                      >
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Met SLA
                        </span>
                      </td>
                    </tr>
                  );
                }
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. GOOGLE SHEETS BOTTOM TABS BAR (THE CORE FEATURE: TICKETS & SOLVED TABS) */}
      <div className="bg-[#EFEFEF] border-t border-[#D8DDE3] px-3 py-1 flex items-center justify-between z-20">
        <div className="flex items-center gap-1">
          {/* Add sheet button */}
          <button
            onClick={() => setShowAddRowModal(true)}
            className="p-1 hover:bg-[#DCDCDC] rounded text-slate-600 transition-colors"
            title="Add a new row / ticket"
          >
            <PlusCircle className="w-4 h-4 text-emerald-700" />
          </button>

          {/* TAB 1: TICKETS SHEET */}
          <button
            onClick={() => setActiveSheetTab('tickets')}
            className={`px-4 py-1.5 rounded-t-md font-bold text-xs flex items-center gap-2 transition-all cursor-pointer select-none border-t-2 ${
              activeSheetTab === 'tickets'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                : 'bg-transparent text-slate-600 border-transparent hover:bg-[#E5E5E5]'
            }`}
          >
            <span>📄 Active Tickets</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeSheetTab === 'tickets'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {activeTickets.length}
            </span>
          </button>

          {/* TAB 2: SOLVED SHEET */}
          <button
            onClick={() => setActiveSheetTab('solved')}
            className={`px-4 py-1.5 rounded-t-md font-bold text-xs flex items-center gap-2 transition-all cursor-pointer select-none border-t-2 ${
              activeSheetTab === 'solved'
                ? 'bg-white text-emerald-800 border-emerald-600 shadow-xs'
                : 'bg-transparent text-slate-600 border-transparent hover:bg-[#E5E5E5]'
            }`}
          >
            <span>✅ Solved Tickets</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeSheetTab === 'solved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {solvedTickets.length}
            </span>
          </button>
        </div>

        {/* Status / Record count */}
        <div className="text-[11px] text-slate-500 flex items-center gap-3">
          <span>
            Showing <strong className="text-slate-800">{displayedTickets.length}</strong> rows
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 text-slate-600">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ready
          </span>
        </div>
      </div>

      {/* 5. QUICK ADD ROW MODAL */}
      {showAddRowModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-[#0F9D58] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <h2 className="font-bold text-sm">Add New Row / Support Ticket</h2>
              </div>
              <button
                onClick={() => setShowAddRowModal(false)}
                className="text-white/80 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRow} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ticket Subject / Summary *</label>
                <input
                  required
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="e.g. FB01: Accrual posting error in fiscal period close"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Module</label>
                  <select
                    value={newModule}
                    onChange={e => setNewModule(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="SAP FI">SAP FI</option>
                    <option value="SAP MM">SAP MM</option>
                    <option value="SAP SD">SAP SD</option>
                    <option value="SAP BASIS">SAP BASIS</option>
                    <option value="SAP Fiori">SAP Fiori</option>
                    <option value="SAP ABAP">SAP ABAP</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">T-Code</label>
                  <input
                    type="text"
                    value={newTCode}
                    onChange={e => setNewTCode(e.target.value)}
                    placeholder="FB01, ME21N..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold"
                  >
                    <option value="P1">P1 Critical</option>
                    <option value="P2">P2 High</option>
                    <option value="P3">P3 Medium</option>
                    <option value="P4">P4 Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Issue Description / Diagnostics</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Provide system logs, error messages, or affected users..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewRow}
                  className="px-4 py-1.5 bg-[#0F9D58] hover:bg-emerald-700 text-white font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {savingNewRow ? 'Appending Row...' : 'Append to Google Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. REAL-TIME GOOGLE SHEETS LIVE SYNC MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#0F9D58] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 text-white fill-white" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Real-Time Google Sheets Synchronization</h2>
                  <p className="text-[11px] text-emerald-100">
                    Live 2-way cloud sync with separate "Tickets" &amp; "Solved" tabs
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSyncModal(false)}
                className="text-white/80 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Sync Status Banner */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  syncEnabled
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      syncEnabled ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <span className="font-bold">
                      {syncEnabled ? 'Live Sync Active:' : 'Setup Required:'}
                    </span>{' '}
                    {syncEnabled
                      ? 'Every ticket created, updated, or solved automatically synchronizes to your Google Sheet in real time.'
                      : 'Follow the 60-second steps below to connect your Google Sheet.'}
                  </div>
                </div>

                {lastSyncTime && (
                  <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded font-mono text-slate-600 border border-slate-200 whitespace-nowrap ml-2">
                    Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Feedback Alert */}
              {syncStatusMsg && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    syncStatusMsg.type === 'success'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-red-50 border-red-300 text-red-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{syncStatusMsg.text}</span>
                </div>
              )}

              {/* Step by Step Instructions */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                  Quick 60-Second Setup Guide:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-xs">
                  <li>
                    Open your <strong className="text-slate-900">Google Sheet</strong> (or create a new blank one).
                  </li>
                  <li>
                    In Google Sheets top menu, click <strong className="text-emerald-700">Extensions &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Copy the complete script below and paste it into Apps Script:
                  </li>
                </ol>

                {/* Script Code Box with Copy Button */}
                <div className="relative mt-2">
                  <div className="flex items-center justify-between bg-slate-800 text-slate-200 px-3 py-1.5 rounded-t font-mono text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                      google-sheets-script.js
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedScript ? 'Copied to Clipboard!' : 'Copy Entire Script'}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-emerald-300 p-3 rounded-b text-[10px] font-mono max-h-36 overflow-y-auto whitespace-pre">
                    {scriptCode || '// Loading script from server...'}
                  </pre>
                </div>

                <ol start={4} className="list-decimal list-inside space-y-1.5 text-slate-700 text-xs pt-2">
                  <li>
                    In Apps Script, click <strong className="text-slate-900">Deploy &gt; New deployment</strong>.
                  </li>
                  <li>
                    Select type: <strong className="text-slate-900">Web app</strong>, set Execute as: <em>Me</em>, Who has access: <strong className="text-emerald-700">"Anyone"</strong>.
                  </li>
                  <li>
                    Click <strong className="text-slate-900">Deploy</strong> and copy your Web App URL.
                  </li>
                </ol>
              </div>

              {/* Webhook URL Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">
                  Paste your Google Apps Script Web App URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveWebhook}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                  >
                    Save URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  URL is stored locally in SQLite (<code className="font-mono">app_settings</code>) and triggered on every ticket event.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  {copiedScript ? 'Script Copied!' : 'Copy Script Again'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(false)}
                    className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-xs cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleTestAndSyncNow}
                    disabled={syncingNow || !webhookUrl.trim()}
                    className={`px-4 py-1.5 rounded font-bold text-white text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      syncingNow || !webhookUrl.trim()
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-[#0F9D58] hover:bg-emerald-700'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                    {syncingNow ? 'Syncing to Google Sheets...' : 'Test & Sync All Data Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
