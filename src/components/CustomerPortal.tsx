import React, { useState, useEffect, useRef } from 'react';
import { Ticket, User, TicketPriority } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Ticket as TicketIcon,
  PlusCircle,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  ArrowRight,
  MessageSquare,
  Building2,
  FileText,
  Paperclip,
  Upload,
  X,
  Layers,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';
import { TicketAttachmentsPanel } from './TicketAttachmentsPanel.tsx';
import { TicketGeneralDataPanel } from './TicketGeneralDataPanel.tsx';
import { TicketBottomWindow } from './TicketBottomWindow.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';

interface CustomerPortalProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
  activeView: string;
  viewParam?: string;
  onLogout: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  currentUser,
  onNavigate,
  activeView,
  viewParam,
  onLogout
}) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New ticket form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sapModule, setSapModule] = useState('SAP FI');
  const [sapSystemSid, setSapSystemSid] = useState('P01');
  const [environment, setEnvironment] = useState<'Production' | 'Quality Assurance' | 'Development' | 'Sandbox'>('Production');
  const [transactionCode, setTransactionCode] = useState('');
  const [issueCategory, setIssueCategory] = useState('Functional Issue');
  const [businessImpact, setBusinessImpact] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('P3');
  const [submitting, setSubmitting] = useState(false);

  // General Data form fields
  const [ticketCategory, setTicketCategory] = useState('Incident');
  const [sapClient, setSapClient] = useState('100');
  const [sapRelease, setSapRelease] = useState('SAP S/4HANA 2023 FPS02');
  const [department, setDepartment] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Staged attachments for new ticket
  const [stagedFiles, setStagedFiles] = useState<Array<{ fileName: string; fileSize: number; fileType: string; dataUrl: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected ticket for customer details view
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [customerReply, setCustomerReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadCustomerTickets();
  }, [currentUser]);

  useEffect(() => {
    if (viewParam && (activeView === 'customer-ticket-detail')) {
      loadTicketDetails(viewParam);
    }
  }, [viewParam, activeView]);

  const loadCustomerTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getTickets();
      setTickets(res.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetails = async (id: string) => {
    try {
      const res = await api.getTicket(id);
      setSelectedTicket(res.ticket);
      // Ensure only customer-visible comments are displayed
      setComments(res.comments.filter(c => !Boolean(c.isInternal)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setStagedFiles(prev => [
        ...prev,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          dataUrl
        }
      ]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.createTicket({
        organizationId: currentUser?.organizationId || undefined,
        subject,
        description,
        errorMessage,
        sapModule: sapModule as any,
        sapSystemSid: sapSystemSid.toUpperCase(),
        environment,
        transactionCode: transactionCode.toUpperCase() || 'N/A',
        issueCategory: issueCategory as any,
        businessImpact,
        priority,
        generalData: {
          category: ticketCategory,
          sapRelease: sapRelease || 'SAP S/4HANA 2023 FPS02',
          sapClient: sapClient || '100',
          dbSystem: 'SAP HANA 2.0 SPS07',
          businessProcess: `${sapModule} Standard Process`,
          department: department || currentUser?.designation || 'Enterprise Operations',
          contactPhone: contactPhone || currentUser?.phone || '+1 (555) 010-4420',
          timezone: 'UTC',
          urgency: priority === 'P1' ? 'Immediate' : priority === 'P2' ? 'High' : 'Medium'
        },
        attachments: stagedFiles
      });

      // Reset form and navigate to ticket details
      setSubject('');
      setDescription('');
      setErrorMessage('');
      setBusinessImpact('');
      setStagedFiles([]);
      await loadCustomerTickets();
      onNavigate('customer-ticket-detail', res.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendCustomerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !customerReply.trim()) return;

    try {
      setSendingReply(true);
      await api.addComment(selectedTicket.id, customerReply.trim(), false);
      setCustomerReply('');
      await loadTicketDetails(selectedTicket.id);
      await loadCustomerTickets();
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!selectedTicket) return;
    try {
      await api.updateTicketStatus(selectedTicket.id, 'Closed');
      await api.addComment(selectedTicket.id, 'Customer verified and confirmed that the issue is fully resolved. Closing ticket.', false);
      await loadTicketDetails(selectedTicket.id);
      await loadCustomerTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.updateTicketStatus(selectedTicket.id, 'Reopened');
      await api.addComment(selectedTicket.id, 'Customer reports that the proposed resolution did not solve the issue. Ticket reopened for further investigation.', false);
      await loadTicketDetails(selectedTicket.id);
      await loadCustomerTickets();
    } catch (err) {
      console.error(err);
    }
  };

  // KPI metrics for Customer Dashboard
  const total = tickets.length;
  const openCount = tickets.filter(t => t.status === 'New' || t.status === 'Assigned').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress' || t.status === 'Escalated').length;
  const waitingResponseCount = tickets.filter(t => t.status === 'Pending Client').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
  const closedCount = tickets.filter(t => t.status === 'Closed').length;

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (search && !t.id.toLowerCase().includes(search.toLowerCase()) && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* Customer Header */}
      <header className="h-16 bg-[#0F766E] text-white px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-base">
            SC
          </div>
          <div>
            <div className="font-bold text-sm leading-tight flex items-center gap-2">
              <span>SoftClinch Customer Portal</span>
              <span className="text-[10px] bg-teal-800/80 text-teal-200 px-2 py-0.5 rounded font-medium border border-teal-600/40">
                {currentUser?.organizationName || 'Customer Organization'}
              </span>
            </div>
            <div className="text-[10px] text-teal-100">SAP Application Management Services Desk</div>
          </div>
        </div>

        {/* Customer Nav Links */}
        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => onNavigate('customer-dashboard')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeView === 'customer-dashboard' ? 'bg-white text-teal-900' : 'hover:bg-teal-700/60 text-white'
            }`}
          >
            My Dashboard
          </button>
          <button
            onClick={() => onNavigate('customer-tickets')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeView === 'customer-tickets' ? 'bg-white text-teal-900' : 'hover:bg-teal-700/60 text-white'
            }`}
          >
            My Tickets
          </button>
          <button
            onClick={() => onNavigate('customer-create-ticket')}
            className="px-3.5 py-1.5 bg-white text-teal-900 font-bold rounded-md hover:bg-teal-50 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-teal-700" />
            Raise New Ticket
          </button>

          <button
            onClick={onLogout}
            className="text-teal-100 hover:text-white px-2 py-1 text-xs font-medium ml-2"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <ErrorBoundary onReset={() => onNavigate('customer-dashboard')}>
          {/* VIEW 1: CUSTOMER DASHBOARD */}
        {activeView === 'customer-dashboard' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  Welcome back, {currentUser?.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor your organization's SAP support tickets, track resolutions, and respond to SoftClinch AMS inquiries.
                </p>
              </div>

              <button
                onClick={() => onNavigate('customer-create-ticket')}
                className="px-4 py-2 bg-[#0F766E] hover:bg-teal-800 text-white font-bold rounded-md text-xs shadow-xs flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Submit Incident
              </button>
            </div>

            {/* Customer KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tickets</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{total}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Open</span>
                <div className="text-xl font-bold text-blue-600 mt-1">{openCount}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
                <span className="text-[10px] font-bold text-teal-700 uppercase">In Progress</span>
                <div className="text-xl font-bold text-teal-700 mt-1">{inProgressCount}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/40 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Waiting on You</span>
                <div className="text-xl font-bold text-amber-700 mt-1">{waitingResponseCount}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Resolved</span>
                <div className="text-xl font-bold text-emerald-600 mt-1">{resolvedCount}</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Closed</span>
                <div className="text-xl font-bold text-slate-700 mt-1">{closedCount}</div>
              </div>
            </div>

            {/* Waiting for Response Alert Banner if tickets require info */}
            {waitingResponseCount > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Action Required: </span>
                    {waitingResponseCount} ticket(s) are currently waiting for your feedback or diagnostic details.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('Pending Client');
                    onNavigate('customer-tickets');
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs"
                >
                  View Waiting Tickets
                </button>
              </div>
            )}

            {/* Recent Tickets Table */}
            <div className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-900">Recent Support Requests</h2>
                <button
                  onClick={() => onNavigate('customer-tickets')}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  View All &rarr;
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {tickets.length === 0 ? (
                  <div className="text-slate-400 py-8 text-center space-y-2">
                    <p>No support requests raised yet.</p>
                    <button
                      onClick={() => onNavigate('customer-create-ticket')}
                      className="px-3.5 py-1.5 bg-[#0F766E] text-white font-bold rounded text-xs shadow-xs"
                    >
                      Raise First Ticket
                    </button>
                  </div>
                ) : (
                  tickets.slice(0, 5).map(t => (
                    <div
                      key={t.id}
                      onClick={() => onNavigate('customer-ticket-detail', t.id)}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 p-2 rounded cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700">{t.id}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            {t.sapModule}
                          </span>
                          <span className="font-bold text-slate-900">{t.subject}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Created on {new Date(t.createdDate).toLocaleDateString()} • System SID: {t.sapSystemSid}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                          t.status === 'Pending Client' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'In Progress' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {t.status === 'Pending Client' ? 'Waiting on You' : t.status}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CUSTOMER TICKET LIST */}
        {activeView === 'customer-tickets' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by ID or keywords..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded focus:outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-[#F5F7FA] border border-[#E5EAF0] rounded px-3 py-1.5 font-medium text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending Client">Waiting on You</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('customer-create-ticket')}
                  className="px-3.5 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Raise Ticket
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#E5EAF0] text-slate-500 font-semibold text-[10px] uppercase">
                      <th className="py-2.5 px-3">Ticket ID</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No support tickets found matching your filter. Click "Raise Ticket" above to submit an issue.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map(t => (
                        <tr
                          key={t.id}
                          onClick={() => onNavigate('customer-ticket-detail', t.id)}
                          className="hover:bg-teal-50/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3 font-mono font-bold text-teal-800 whitespace-nowrap">
                            {t.id}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              t.priority === 'P1' ? 'bg-red-100 text-red-800' :
                              t.priority === 'P2' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-800">{t.sapModule}</td>
                          <td className="py-3 px-3 font-semibold text-slate-900 max-w-md truncate">{t.subject}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              t.status === 'Pending Client' ? 'bg-amber-100 text-amber-800' :
                              t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {t.status === 'Pending Client' ? 'Waiting on You' : t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400 whitespace-nowrap">
                            {new Date(t.createdDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: RAISE NEW TICKET */}
        {activeView === 'customer-create-ticket' && (
          <div className="max-w-3xl mx-auto space-y-4 text-xs">
            <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-teal-700" />
                  Raise SAP Support Ticket
                </h1>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Submit a detailed report to the SoftClinch SAP Consulting and AMS Support Desk.
                </p>
              </div>

              <form onSubmit={handleRaiseTicket} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Company / Organization</label>
                    <div className="p-2 bg-slate-100 rounded text-slate-700 font-semibold border border-slate-200">
                      {currentUser?.organizationName || 'Acme Industrial Corp'}
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                    <div className="p-2 bg-slate-100 rounded text-slate-700 border border-slate-200">
                      {currentUser?.name} ({currentUser?.email})
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ticket Subject / Summary *</label>
                  <input
                    required
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. ME21N: Tax calculation failed during PO creation"
                    className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">SAP Module *</label>
                    <select
                      value={sapModule}
                      onChange={e => setSapModule(e.target.value)}
                      className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                    >
                      <option value="SAP FI">SAP FI - Financials</option>
                      <option value="SAP CO">SAP CO - Controlling</option>
                      <option value="SAP MM">SAP MM - Procurement</option>
                      <option value="SAP SD">SAP SD - Sales</option>
                      <option value="SAP BASIS">SAP BASIS</option>
                      <option value="SAP ABAP">SAP ABAP</option>
                      <option value="SAP Fiori">SAP Fiori</option>
                      <option value="SAP S/4HANA">SAP S/4HANA</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">SAP System (SID) *</label>
                    <input
                      required
                      type="text"
                      value={sapSystemSid}
                      onChange={e => setSapSystemSid(e.target.value)}
                      placeholder="e.g. P01"
                      className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono font-bold text-teal-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Environment</label>
                    <select
                      value={environment}
                      onChange={e => setEnvironment(e.target.value as any)}
                      className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                    >
                      <option value="Production">Production (PRD)</option>
                      <option value="Quality Assurance">Quality Assurance (QAS)</option>
                      <option value="Development">Development (DEV)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Transaction Code (T-Code)</label>
                    <input
                      type="text"
                      value={transactionCode}
                      onChange={e => setTransactionCode(e.target.value)}
                      placeholder="e.g. FB01, ME21N, VF01"
                      className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Priority *</label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as TicketPriority)}
                      className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-bold"
                    >
                      <option value="P1">P1 - Critical (Production Halted)</option>
                      <option value="P2">P2 - High (Major Impact)</option>
                      <option value="P3">P3 - Medium (Operational Disruption)</option>
                      <option value="P4">P4 - Low (General Inquiry)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Error Message / Error Number</label>
                  <input
                    type="text"
                    value={errorMessage}
                    onChange={e => setErrorMessage(e.target.value)}
                    placeholder="e.g. Message no. F5 022 Document balance not zero"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono text-red-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Detailed Issue Description *</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Detail the steps taken, user actions, document numbers, and expected vs actual behavior..."
                    className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded leading-relaxed focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Business Impact Statement *</label>
                  <input
                    required
                    type="text"
                    value={businessImpact}
                    onChange={e => setBusinessImpact(e.target.value)}
                    placeholder="e.g. Month-end financial close halted for North American entities"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>

                {/* SAP ITSM GENERAL DATA SECTION */}
                <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>SAP ITSM General Data (System &amp; Reporter Parameters)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 block mb-1 text-[11px]">Ticket Category</label>
                      <select
                        value={ticketCategory}
                        onChange={e => setTicketCategory(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs"
                      >
                        <option value="Incident">Incident (Disruption / Error)</option>
                        <option value="Service Request">Service Request</option>
                        <option value="Problem">Problem Investigation</option>
                        <option value="Enhancement Request">Enhancement Request (RFC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 block mb-1 text-[11px]">SAP Client / Mandant</label>
                      <input
                        type="text"
                        value={sapClient}
                        onChange={e => setSapClient(e.target.value)}
                        placeholder="e.g. 100, 200, 300"
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs font-mono font-bold text-teal-800"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 block mb-1 text-[11px]">SAP Release / Kernel</label>
                      <input
                        type="text"
                        value={sapRelease}
                        onChange={e => setSapRelease(e.target.value)}
                        placeholder="e.g. SAP S/4HANA 2023 FPS02"
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-bold text-slate-600 block mb-1 text-[11px]">Reporter Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        placeholder="e.g. Corporate Finance &amp; Accounting"
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 block mb-1 text-[11px]">Contact Telephone / Ext</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={e => setContactPhone(e.target.value)}
                        placeholder="e.g. +1 (312) 555-0142 ext 401"
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* ATTACHMENT FIELD (Screenshots, Logs, Dumps) */}
                <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span>Attachments &amp; Error Diagnostic Files (Screenshots, Logs, ST22 Dumps)</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {stagedFiles.length} file(s) attached
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.svg,.txt,.log,.pdf,.xlsx,.csv"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-slate-300 hover:border-teal-500 bg-white rounded-lg text-center cursor-pointer transition-colors space-y-1.5"
                  >
                    <Upload className="w-6 h-6 text-teal-600 mx-auto" />
                    <div className="text-xs font-bold text-slate-700">
                      Click to upload or drag &amp; drop files
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Supports PNG, JPG, PDF, ST22 ABAP dumps (.txt), RFC traces (.log), and Excel logs up to 25MB
                    </div>
                  </div>

                  {stagedFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {stagedFiles.map((f, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white border border-slate-200 rounded flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {f.fileType.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <div className="truncate">
                              <div className="font-bold text-slate-800 truncate" title={f.fileName}>{f.fileName}</div>
                              <div className="text-[10px] text-slate-400">{Math.round(f.fileSize / 1024)} KB</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(idx);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Remove File"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onNavigate('customer-tickets')}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#0F766E] hover:bg-teal-800 text-white font-bold rounded shadow-xs"
                  >
                    {submitting ? 'Submitting to SoftClinch...' : 'Submit Support Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 4: CUSTOMER TICKET DETAILS & RESOLUTION CONFIRMATION */}
        {activeView === 'customer-ticket-detail' && (
          !selectedTicket ? (
            <div className="bg-white p-12 rounded-lg border border-[#E5EAF0] shadow-2xs text-center text-xs text-slate-500 max-w-lg mx-auto mt-8 space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="font-bold text-slate-800 text-sm">Loading Support Incident #{viewParam || ''}...</div>
              <p className="text-slate-400 text-[11px]">Retrieving ticket details, message logs, and resolution status.</p>
              <button
                onClick={() => onNavigate('customer-tickets')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs mt-2"
              >
                &larr; Return to My Tickets
              </button>
            </div>
          ) : (
          <div className="space-y-5 text-xs max-w-5xl mx-auto">
            {/* Top Bar */}
            <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs flex items-center justify-between">
              <button
                onClick={() => onNavigate('customer-tickets')}
                className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5"
              >
                &larr; Back to My Tickets
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-teal-800 text-sm">{selectedTicket.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  selectedTicket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                  selectedTicket.status === 'Pending Client' ? 'bg-amber-100 text-amber-800' :
                  selectedTicket.status === 'Closed' ? 'bg-slate-100 text-slate-700' : 'bg-teal-100 text-teal-800'
                }`}>
                  {selectedTicket.status === 'Pending Client' ? 'Waiting on You' : selectedTicket.status}
                </span>
              </div>
            </div>

            {/* RESOLUTION VALIDATION CARD (If status is Resolved) */}
            {selectedTicket.status === 'Resolved' && (
              <div className="p-5 bg-emerald-50 border-2 border-emerald-400 rounded-lg shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Proposed Solution Submitted by Support Team</span>
                </div>
                <div className="p-3 bg-white rounded border border-emerald-200 text-slate-800 leading-relaxed">
                  {selectedTicket.proposedSolution || selectedTicket.resolutionSummary || 'Please review the resolution instructions and test the fix in your system.'}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-emerald-900 font-medium">
                    Has this solved your issue? Please confirm or reopen:
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleReopenTicket}
                      className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded border border-red-300"
                    >
                      Issue Persists (Reopen)
                    </button>
                    <button
                      onClick={handleConfirmResolution}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
                    >
                      Confirm Resolution &amp; Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Ticket Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-5">
                <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3">
                  <h2 className="text-sm font-bold text-slate-900">{selectedTicket.subject}</h2>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded border border-slate-100 whitespace-pre-line">
                    {selectedTicket.description}
                  </p>

                  {selectedTicket.errorMessage && (
                    <div className="p-2.5 bg-red-50/60 rounded border border-red-200 font-mono text-[11px] text-red-900">
                      <strong>System Error:</strong> {selectedTicket.errorMessage}
                    </div>
                  )}
                </div>

                {/* Communication History (Customer View - Zero Internal Notes) */}
                <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                    Communication &amp; Updates History
                  </h3>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <div className="text-slate-400 py-6 text-center">No messages yet.</div>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900">{c.authorName}</span>
                            <span className="text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-line text-slate-700 leading-relaxed">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Customer Reply Box */}
                  {selectedTicket.status !== 'Closed' && (
                    <form onSubmit={handleSendCustomerReply} className="pt-3 border-t border-slate-100 space-y-2">
                      <textarea
                        required
                        rows={3}
                        value={customerReply}
                        onChange={e => setCustomerReply(e.target.value)}
                        placeholder="Reply to SoftClinch SAP Support Desk or provide requested details..."
                        className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded focus:outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={sendingReply}
                          className="px-4 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white font-bold rounded shadow-xs"
                        >
                          {sendingReply ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* SAP ITSM General Data Section */}
                <TicketGeneralDataPanel ticket={selectedTicket} />

                {/* Attachments & System Diagnostic Traces */}
                <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
                  <TicketAttachmentsPanel
                    ticketId={selectedTicket.id}
                    attachments={selectedTicket.attachments || []}
                    onAttachmentUploaded={() => loadTicketDetails(selectedTicket.id)}
                    canUpload={selectedTicket.status !== 'Closed'}
                  />
                </div>
              </div>

              {/* Right Side Info Box */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3">
                  <span className="font-bold text-slate-400 text-[10px] uppercase block border-b border-slate-100 pb-1.5">
                    Ticket Technical Details
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SAP Module</span>
                    <span className="font-bold text-slate-800">{selectedTicket.sapModule}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">System SID</span>
                    <span className="font-mono font-bold text-teal-800">{selectedTicket.sapSystemSid}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Environment</span>
                    <span className="font-semibold text-slate-700">{selectedTicket.environment}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Transaction Code</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                      {selectedTicket.transactionCode || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3">
                  <span className="font-bold text-slate-400 text-[10px] uppercase block border-b border-slate-100 pb-1.5">
                    Service Level Agreement (SLA)
                  </span>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Priority Level</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedTicket.priority} Priority</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Support Channel</span>
                    <span className="text-teal-800 font-bold text-xs">SoftClinch SAP Support Desk (SPOC)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 mt-6 shadow-2xl">
              <TicketBottomWindow ticket={selectedTicket} />
            </div>
          </div>
        )
      )}

          {/* Fallback if view doesn't match */}
          {![
            'customer-dashboard',
            'customer-tickets',
            'customer-create-ticket',
            'customer-ticket-detail'
          ].includes(activeView) && (
            <div className="p-8 text-center text-xs text-slate-500 space-y-3">
              <div className="font-bold text-slate-800 text-sm">View Not Found</div>
              <p className="text-slate-500">The requested screen does not exist or has been relocated.</p>
              <button
                onClick={() => onNavigate('customer-dashboard')}
                className="px-4 py-2 bg-[#0F766E] text-white font-bold rounded shadow-xs cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};
