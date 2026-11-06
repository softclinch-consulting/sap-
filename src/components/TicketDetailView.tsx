import React, { useState, useEffect } from 'react';
import {
  Ticket,
  TicketComment,
  TicketAttachment,
  TicketHistory,
  User,
  TicketPriority,
  TicketStatus
} from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle,
  Building2,
  Server,
  UserCheck,
  Send,
  Lock,
  Globe,
  FileText,
  History,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  Timer
} from 'lucide-react';
import { canViewInternalNotes } from '../server/logic.ts';

interface TicketDetailViewProps {
  ticketId: string;
  currentUser: User | null;
  onBack: () => void;
  onNavigate: (view: string, param?: string) => void;
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  ticketId,
  currentUser,
  onBack,
  onNavigate
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultants, setConsultants] = useState<User[]>([]);

  // Form states
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status & Resolution modal states
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [rootCause, setRootCause] = useState('');

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState('');

  // Time entry modal state
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [timeDescription, setTimeDescription] = useState('');

  useEffect(() => {
    loadTicketData();
    loadConsultants();
  }, [ticketId, currentUser]);

  const loadTicketData = async () => {
    try {
      setLoading(true);
      const res = await api.getTicket(ticketId);
      setTicket(res.ticket);
      setComments(res.comments);
      setHistory(res.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConsultants = async () => {
    try {
      const res = await api.getUsers();
      setConsultants(res.users.filter(u => u.role === 'SAP_CONSULTANT' || u.role === 'SUPPORT_LEAD'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;

    try {
      setSubmittingComment(true);
      await api.addComment(ticket.id, newComment.trim(), isInternalNote);
      setNewComment('');
      setIsInternalNote(false);
      await loadTicketData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    if (newStatus === 'Resolved') {
      setShowResolveModal(true);
      return;
    }
    try {
      await api.updateTicketStatus(ticket.id, newStatus);
      await loadTicketData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    try {
      await api.updateTicketStatus(ticket.id, 'Resolved', resolutionSummary, rootCause);
      setShowResolveModal(false);
      await loadTicketData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !selectedConsultantId) return;
    try {
      await api.assignTicket(ticket.id, selectedConsultantId);
      setShowAssignModal(false);
      await loadTicketData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !timeDescription) return;
    try {
      await api.createTimeEntry({
        ticketId: ticket.id,
        durationMinutes: timeMinutes,
        workDescription: timeDescription,
        isBillable: true
      });
      setShowTimeModal(false);
      setTimeDescription('');
      await loadTicketData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading ticket details...</span>
        </div>
      </div>
    );
  }

  const userCanInternal = currentUser ? canViewInternalNotes(currentUser.role) : false;
  const isClient = currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE';
  const isManagerOrLead = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'AMS_MANAGER' || currentUser?.role === 'SUPPORT_LEAD';

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
            title="Back to Tickets"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-blue-700">{ticket.id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                ticket.priority === 'P1' ? 'bg-red-100 text-red-800 border border-red-200' :
                ticket.priority === 'P2' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                ticket.priority === 'P3' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {ticket.priority}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {ticket.status}
              </span>
            </div>
            <h1 className="text-base font-bold text-[#172033] mt-1">{ticket.subject}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Update Status:</span>
            <select
              value={ticket.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="text-xs bg-[#F5F7FA] border border-[#E5EAF0] rounded-md px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Client">Pending Client</option>
              <option value="Pending Third Party">Pending Third Party</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

          {/* Assign Consultant button */}
          {isManagerOrLead && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {ticket.assignedConsultantName ? 'Reassign' : 'Assign'}
            </button>
          )}

          {/* Time Tracking button (Consultants) */}
          {!isClient && (
            <button
              onClick={() => setShowTimeModal(true)}
              className="px-3 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Timer className="w-3.5 h-3.5" />
              Log Time
            </button>
          )}

          {/* Client Confirm Resolution */}
          {isClient && ticket.status === 'Resolved' && (
            <button
              onClick={() => handleStatusChange('Closed')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm &amp; Close Ticket
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Details & Right SLA / Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Issue Details + Conversation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Issue Information */}
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Issue Description &amp; Technical Context
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{ticket.organizationName}</span>
              </div>
            </div>

            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded border border-slate-100">
              {ticket.description}
            </p>

            {/* Technical Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">SAP Module</span>
                <span className="font-bold text-slate-800">{ticket.sapModule}</span>
              </div>
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">System SID</span>
                <span className="font-mono font-bold text-blue-700">{ticket.sapSystemSid}</span>
              </div>
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Environment</span>
                <span className="font-semibold text-slate-700">{ticket.environment}</span>
              </div>
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Transaction Code</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                  {ticket.transactionCode || 'N/A'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded border border-blue-100 text-xs">
              <span className="font-bold text-blue-900 block mb-0.5">Business Impact:</span>
              <span className="text-blue-800 leading-relaxed">{ticket.businessImpact}</span>
            </div>

            {/* Resolution info if resolved */}
            {ticket.resolutionSummary && (
              <div className="p-3.5 bg-emerald-50 rounded border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Resolution Summary &amp; Root Cause
                </div>
                <p className="text-emerald-800">{ticket.resolutionSummary}</p>
                {ticket.rootCause && (
                  <div className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200/60">
                    <span className="font-bold">Root Cause:</span> {ticket.rootCause}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section B: Conversation (Public vs Internal Notes) */}
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span>Discussion Thread</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded-full font-bold">
                  {comments.length}
                </span>
              </h2>

              {userCanInternal && (
                <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Internal Notes Enabled</span>
                </div>
              )}
            </div>

            {/* Comment Stream */}
            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No comments posted yet. Start the investigation below.
                </div>
              ) : (
                comments.map(c => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-lg text-xs leading-relaxed border ${
                      c.isInternal
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-[#F5F7FA] border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.authorName}</span>
                        <span className="text-[10px] text-slate-500 font-medium bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {c.authorRole.replace('_', ' ')}
                        </span>
                        {Boolean(c.isInternal) && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded border border-amber-300 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> INTERNAL NOTE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="whitespace-pre-line">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Form */}
            <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Add Response:</span>
                {userCanInternal && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={e => setIsInternalNote(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <Lock className="w-3 h-3 text-amber-600" />
                    Internal Staff Note (Hidden from Client)
                  </label>
                )}
              </div>

              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={
                  isInternalNote
                    ? "Add internal technical analysis or consultant notes (client will not see this)..."
                    : "Post public reply or troubleshooting question to client..."
                }
                rows={3}
                className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingComment ? 'Posting...' : isInternalNote ? 'Post Internal Note' : 'Send Public Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: SLA Dashboard, Assignment, Activity Timeline */}
        <div className="space-y-6">
          {/* Section D: SLA Engine Panel */}
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
              <span>SLA Commitments</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                ITIL Standard
              </span>
            </h2>

            {/* SLA countdown timers */}
            <div className="space-y-3 text-xs">
              {/* Response Target */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700">Initial Response SLA:</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    ticket.isResponseBreached ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {ticket.isResponseBreached ? 'Breached' : 'Within Target'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Deadline: {new Date(ticket.responseDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {ticket.firstResponseDate && (
                  <div className="text-[10px] text-emerald-700 mt-1">
                    First response logged: {new Date(ticket.firstResponseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* Resolution Target */}
              <div className={`p-3 rounded-lg border ${
                ticket.isResolutionBreached
                  ? 'bg-red-50 border-red-200'
                  : ticket.isAtRisk
                  ? 'bg-amber-50 border-amber-300 animate-pulse'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    {ticket.isAtRisk && <Flame className="w-3.5 h-3.5 text-amber-600" />}
                    Resolution SLA:
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    ticket.isResolutionBreached ? 'bg-red-200 text-red-900' :
                    ticket.isAtRisk ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'Resolved' :
                     ticket.isResolutionBreached ? 'Breached' :
                     ticket.isAtRisk ? 'At Risk (< 60m)' : 'On Schedule'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Target: {new Date(ticket.resolutionDeadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Time spent counter */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Recorded Effort:</span>
              <span className="font-bold text-slate-800">{Math.round((ticket.timeSpentMinutes / 60) * 10) / 10} hours</span>
            </div>
          </div>

          {/* Section C: Assignment details */}
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3 text-xs">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Assignment &amp; Contacts
            </h2>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Consultant</span>
                <span className="font-semibold text-slate-800">
                  {ticket.assignedConsultantName || <span className="text-slate-400 italic">Not Assigned</span>}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Support Lead</span>
                <span className="font-semibold text-slate-800">
                  {ticket.supportLeadName || 'Marcus Thorne (Support Lead)'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Client Contact</span>
                <span className="font-semibold text-slate-800">{ticket.clientContactName}</span>
                <span className="text-[10px] text-slate-400 block">{ticket.clientContactEmail}</span>
              </div>
            </div>
          </div>

          {/* Section E: Activity Timeline */}
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3 text-xs">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <History className="w-3.5 h-3.5 text-slate-500" />
              Activity Audit Trail
            </h2>

            <div className="space-y-3 max-h-60 overflow-y-auto pl-2 border-l-2 border-slate-200">
              {history.map(h => (
                <div key={h.id} className="relative pl-3">
                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-blue-600" />
                  <div className="font-semibold text-slate-800 text-[11px]">{h.action}</div>
                  <div className="text-[10px] text-slate-500">{h.details}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {h.actorName} • {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Resolve Ticket */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Resolve Ticket {ticket.id}
            </h3>
            <p className="text-xs text-slate-500">
              Provide formal solution documentation and root cause analysis for client confirmation.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Resolution Summary *</label>
                <textarea
                  required
                  value={resolutionSummary}
                  onChange={e => setResolutionSummary(e.target.value)}
                  placeholder="Detail the technical or functional solution applied..."
                  rows={3}
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Root Cause *</label>
                <input
                  required
                  type="text"
                  value={rootCause}
                  onChange={e => setRootCause(e.target.value)}
                  placeholder="e.g. Inconsistent currency translation ratio in OBBS table"
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                >
                  Submit Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assign Consultant */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Assign Consultant to {ticket.id}
            </h3>

            <form onSubmit={handleAssignConsultant} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Consultant ({ticket.sapModule})</label>
                <select
                  required
                  value={selectedConsultantId}
                  onChange={e => setSelectedConsultantId(e.target.value)}
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Choose Consultant --</option>
                  {consultants.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.designation} (Skills: {c.sapExpertise?.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedConsultantId}
                  className="px-4 py-1.5 bg-[#2563EB] disabled:opacity-50 text-white rounded text-xs font-semibold hover:bg-blue-700"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Time Logging */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Timer className="w-4 h-4 text-teal-600" />
              Record Support Time on {ticket.id}
            </h3>

            <form onSubmit={handleAddTimeEntry} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min="5"
                  step="5"
                  value={timeMinutes}
                  onChange={e => setTimeMinutes(parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Description *</label>
                <textarea
                  required
                  rows={3}
                  value={timeDescription}
                  onChange={e => setTimeDescription(e.target.value)}
                  placeholder="Detail the analysis, config changes, or testing performed..."
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0F766E] text-white rounded text-xs font-semibold hover:bg-teal-800"
                >
                  Save Time Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
