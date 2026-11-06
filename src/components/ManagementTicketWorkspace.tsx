import React, { useState, useEffect } from 'react';
import {
  Ticket,
  TicketComment,
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
  MessageSquare,
  History,
  CheckCircle2,
  HelpCircle,
  FileText,
  AlertCircle,
  Timer,
  ChevronRight,
  Layers,
  Paperclip,
  Play,
  RotateCcw,
  Check,
  Briefcase
} from 'lucide-react';
import { TicketAttachmentsPanel } from './TicketAttachmentsPanel.tsx';
import { TicketGeneralDataPanel } from './TicketGeneralDataPanel.tsx';
import { TicketBottomWindow } from './TicketBottomWindow.tsx';

interface ManagementTicketWorkspaceProps {
  ticketId: string;
  currentUser: User | null;
  onBack: () => void;
  onNavigate: (view: string, param?: string) => void;
}

export const ManagementTicketWorkspace: React.FC<ManagementTicketWorkspaceProps> = ({
  ticketId,
  currentUser,
  onBack,
  onNavigate
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState<User[]>([]);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'AMS_MANAGER' || currentUser?.role === 'SUPPORT_LEAD';
  const isConsultant = currentUser?.role === 'SAP_CONSULTANT';

  // Active tab: 'internal' | 'customer' | 'solution' | 'time' | 'general'
  const [activeTab, setActiveTab] = useState<'internal' | 'customer' | 'solution' | 'time' | 'general'>('internal');

  // Input forms
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [isRequestInfo, setIsRequestInfo] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Solution proposal / review state
  const [solutionText, setSolutionText] = useState('');
  const [rootCauseText, setRootCauseText] = useState('');
  const [additionalTimeMins, setAdditionalTimeMins] = useState<number>(30);
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [submittingSolution, setSubmittingSolution] = useState(false);
  const [reviewingAction, setReviewingAction] = useState(false);

  // Time Management state
  const [durationMins, setDurationMins] = useState<number>(30);
  const [workDesc, setWorkDesc] = useState<string>('');
  const [isBillable, setIsBillable] = useState<boolean>(true);
  const [submittingTime, setSubmittingTime] = useState<boolean>(false);

  // Delay / Late Module Reason state
  const [delayCategory, setDelayCategory] = useState<string>('None / On Schedule');
  const [delayDetails, setDelayDetails] = useState<string>('');
  const [savingDelay, setSavingDelay] = useState<boolean>(false);
  const [delaySavedMsg, setDelaySavedMsg] = useState(false);

  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');

  // Priority change
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>('P3');

  useEffect(() => {
    loadTicket();
    loadEngineers();
    loadTimeEntries();
  }, [ticketId, currentUser]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await api.getTicket(ticketId);
      setTicket(res.ticket);
      setComments(res.comments);
      setHistory(res.history);
      setSelectedPriority(res.ticket.priority);

      if (res.ticket.proposedSolution) {
        setSolutionText(res.ticket.proposedSolution);
      }
      if (res.ticket.rootCause) {
        setRootCauseText(res.ticket.rootCause);
      }
      if (res.ticket.delayReasonCategory) {
        setDelayCategory(res.ticket.delayReasonCategory);
      }
      if (res.ticket.delayReasonDetails) {
        setDelayDetails(res.ticket.delayReasonDetails);
      }
      if (res.ticket.adminReviewNotes) {
        setAdminReviewNotes(res.ticket.adminReviewNotes);
      }

      // If pending admin review, open the solution tab for admin
      if (res.ticket.status === 'Pending Admin Review' && isAdmin) {
        setActiveTab('solution');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEngineers = async () => {
    try {
      const res = await api.getUsers();
      const engList = res.users.filter(u => u.role === 'SAP_CONSULTANT' || u.role === 'SUPPORT_LEAD' || u.role === 'AMS_MANAGER');
      setEngineers(engList);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTimeEntries = async () => {
    try {
      const res = await api.getTicketTimeEntries(ticketId);
      setTimeEntries(res.timeEntries || []);
    } catch (_) {}
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      let content = newComment.trim();
      if (isRequestInfo && isAdmin) {
        content = `[ADDITIONAL INFORMATION REQUESTED BY AMS SUPPORT]:\n${content}`;
      }

      // If consultant, always post internally
      const postAsInternal = isConsultant ? true : isInternalNote;

      await api.addComment(ticket.id, content, postAsInternal);
      setNewComment('');
      setIsRequestInfo(false);

      if (isRequestInfo && isAdmin && ticket.status !== 'Pending Client') {
        await api.updateTicketStatus(ticket.id, 'Pending Client');
      }

      await loadTicket();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Consultant submits technical fix for Admin Review & Approval
  const handleConsultantSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !solutionText.trim()) return;

    try {
      setSubmittingSolution(true);
      // Consultant submits to Pending Admin Review
      await api.updateTicketStatus(
        ticket.id,
        'Pending Admin Review',
        solutionText.trim(),
        rootCauseText.trim(),
        solutionText.trim(),
        additionalTimeMins || 0,
        delayCategory !== 'None / On Schedule' ? delayCategory : undefined,
        delayDetails.trim() || undefined
      );

      // Add internal note informing Admin
      await api.addComment(
        ticket.id,
        `[TECHNICAL FIX SUBMITTED FOR ADMIN REVIEW]:\nRoot Cause: ${rootCauseText.trim()}\n\nRemediation Details:\n${solutionText.trim()}${
          delayCategory !== 'None / On Schedule' ? `\n\nDelay Justification: ${delayCategory} - ${delayDetails.trim()}` : ''
        }`,
        true
      );

      await loadTicket();
      await loadTimeEntries();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingSolution(false);
    }
  };

  // Admin approves solution and officially delivers it to the customer
  const handleAdminApproveSolution = async () => {
    if (!ticket) return;

    try {
      setReviewingAction(true);
      const finalSol = solutionText.trim() || ticket.proposedSolution || 'Issue diagnosed and resolved successfully';
      const finalRc = rootCauseText.trim() || ticket.rootCause || 'SAP system configuration aligned with standard best practices';

      await api.updateTicketStatus(
        ticket.id,
        'Resolved',
        finalSol,
        finalRc,
        finalSol,
        0,
        delayCategory !== 'None / On Schedule' ? delayCategory : ticket.delayReasonCategory || undefined,
        delayDetails.trim() || ticket.delayReasonDetails || undefined,
        adminReviewNotes.trim()
      );

      await loadTicket();
      setActiveTab('customer');
    } catch (err) {
      console.error(err);
    } finally {
      setReviewingAction(false);
    }
  };

  // Admin returns ticket to consultant for rework
  const handleAdminReturnForRework = async () => {
    if (!ticket) return;

    try {
      setReviewingAction(true);
      const feedback = adminReviewNotes.trim() || 'Please re-investigate root cause and adjust the technical fix.';

      await api.updateTicketStatus(
        ticket.id,
        'In Progress',
        undefined,
        undefined,
        undefined,
        0,
        undefined,
        undefined,
        feedback
      );

      // Post internal note for consultant
      await api.addComment(
        ticket.id,
        `[ADMIN REVIEW: REWORK REQUIRED BY ${currentUser?.name}]:\n${feedback}`,
        true
      );

      await loadTicket();
      setActiveTab('internal');
    } catch (err) {
      console.error(err);
    } finally {
      setReviewingAction(false);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || durationMins <= 0) return;

    try {
      setSubmittingTime(true);
      await api.addTimeEntry(ticket.id, {
        durationMinutes: durationMins,
        workDescription: workDesc.trim() || 'SAP Functional Analysis & Remediation',
        isBillable
      });

      setWorkDesc('');
      await loadTimeEntries();
      await loadTicket();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingTime(false);
    }
  };

  const handleSaveDelayJustification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    try {
      setSavingDelay(true);
      await api.updateTicketStatus(
        ticket.id,
        ticket.status,
        undefined,
        undefined,
        undefined,
        0,
        delayCategory,
        delayDetails.trim()
      );

      setDelaySavedMsg(true);
      setTimeout(() => setDelaySavedMsg(false), 3000);
      await loadTicket();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDelay(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      await api.updateTicketStatus(ticket.id, newStatus);
      await loadTicket();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (newPri: TicketPriority) => {
    if (!ticket) return;
    setSelectedPriority(newPri);
    await api.createTicket({ ...ticket, priority: newPri });
    await loadTicket();
  };

  const handleAssignEngineer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !selectedEngineerId) return;
    try {
      await api.assignTicket(ticket.id, selectedEngineerId);
      setShowAssignModal(false);
      await loadTicket();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimTicket = async () => {
    if (!ticket || !currentUser) return;
    try {
      await api.assignTicket(ticket.id, currentUser.id);
      await loadTicket();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading Management Ticket Workspace...
      </div>
    );
  }

  // Filter comments based on active tab
  const internalComments = comments.filter(c => Boolean(c.isInternal));
  const customerComments = comments.filter(c => !Boolean(c.isInternal));

  return (
    <div className="space-y-4">
      {/* Workspace Top Toolbar */}
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
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  ticket.priority === 'P1'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : ticket.priority === 'P2'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : ticket.priority === 'P3'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {ticket.priority}
              </span>

              {/* Status Badge */}
              {ticket.status === 'Pending Admin Review' ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Pending Admin Review
                </span>
              ) : ticket.status === 'Resolved' ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Resolved
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {ticket.status}
                </span>
              )}

              {ticket.delayReasonCategory && ticket.delayReasonCategory !== 'None / On Schedule' && (
                <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-medium">
                  Delay: {ticket.delayReasonCategory}
                </span>
              )}
            </div>
            <h1 className="text-base font-bold text-[#172033] mt-1">{ticket.subject}</h1>
          </div>
        </div>

        {/* Quick action buttons tailored to Admin vs Consultant */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {currentUser && !ticket.assignedConsultantId && (
            <button
              onClick={handleClaimTicket}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded border border-blue-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              Claim &amp; Assign to Me
            </button>
          )}

          {(ticket.status === 'New' || ticket.status === 'Assigned') && (
            <button
              onClick={() => handleStatusChange('In Progress')}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Start Progress
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              {ticket.assignedConsultantName ? 'Reassign' : 'Assign Engineer'}
            </button>
          )}

          {/* Solution & Review Action */}
          {ticket.status === 'Pending Admin Review' && isAdmin ? (
            <button
              onClick={() => setActiveTab('solution')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Review &amp; Deliver Solution
            </button>
          ) : isConsultant && ticket.status !== 'Resolved' && ticket.status !== 'Closed' ? (
            <button
              onClick={() => setActiveTab('solution')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Submit Fix for Admin Review
            </button>
          ) : null}

          {/* Quick Time Tab Button */}
          <button
            onClick={() => setActiveTab('time')}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Timer className="w-3.5 h-3.5 text-indigo-600" />
            Time: {ticket.timeSpentMinutes || 0}m
          </button>
        </div>
      </div>

      {/* 3-COLUMN MANAGEMENT WORKSPACE SPEC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMN 1 (LEFT - 3.5 cols): Customer Issue Details, SAP Module, T-Code, Error, Business Impact */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Customer Issue Details
              </span>
              <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {ticket.organizationName}
              </span>
            </div>

            {/* Description */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Issue Description</span>
              <p className="p-3 bg-slate-50/80 rounded border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line">
                {ticket.description}
              </p>
            </div>

            {/* Error Message Box */}
            <div>
              <span className="text-[10px] text-red-600 uppercase font-bold block mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> System Error Message
              </span>
              <div className="p-2.5 bg-red-50/50 border border-red-200 text-red-900 font-mono text-[11px] rounded">
                {ticket.errorMessage || 'No specific error dump provided.'}
              </div>
            </div>

            {/* SAP Technical Parameters */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">SAP Module</span>
                <span className="font-bold text-slate-900">{ticket.sapModule}</span>
              </div>
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">System SID</span>
                <span className="font-mono font-bold text-blue-700">{ticket.sapSystemSid}</span>
              </div>
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Environment</span>
                <span className="font-semibold text-slate-800">{ticket.environment}</span>
              </div>
              <div className="p-2.5 bg-[#F5F7FA] rounded border border-slate-200">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Transaction Code</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.2 rounded border border-slate-300 inline-block">
                  {ticket.transactionCode || 'N/A'}
                </span>
              </div>
            </div>

            {/* Business Impact */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Business Impact</span>
              <p className="p-2.5 bg-blue-50/50 rounded border border-blue-100 text-blue-900 leading-relaxed">
                {ticket.businessImpact}
              </p>
            </div>

            {/* Customer Contact Card */}
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Customer Contact (Direct SPOC)
              </div>
              <div className="text-slate-700">{ticket.clientContactName} ({ticket.clientContactEmail})</div>
              <div className="text-[10px] text-slate-500">
                AMS Governance: Only AMS Admin/Leads connect directly with this contact.
              </div>
            </div>
          </div>

          {/* Ticket Attachments Panel */}
          <TicketAttachmentsPanel
            ticketId={ticket.id}
            attachments={ticket.attachments || []}
            onAttachmentUploaded={loadTicket}
            canUpload={ticket.status !== 'Closed'}
          />
        </div>

        {/* COLUMN 2 (CENTER - 5 cols): Internal Chat, Customer Comms, Solution Review, Time Management */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
            {/* Conversation Header & Tab Filters */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold flex-wrap">
                {/* 1. Internal Conversation Tab */}
                <button
                  onClick={() => setActiveTab('internal')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'internal'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  Internal Conversation ({internalComments.length})
                </button>

                {/* 2. Customer Communications Tab */}
                <button
                  onClick={() => setActiveTab('customer')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'customer'
                      ? 'bg-[#0F766E] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  Customer Comms ({customerComments.length})
                </button>

                {/* 3. Solution & Admin Review */}
                <button
                  onClick={() => setActiveTab('solution')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'solution'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : ticket.status === 'Pending Admin Review'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  Solution &amp; Review
                  {ticket.status === 'Pending Admin Review' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  )}
                </button>

                {/* 4. Time Management & Delay Tracking */}
                <button
                  onClick={() => setActiveTab('time')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'time'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  Time &amp; Delays
                </button>

                {/* 5. General Data */}
                <button
                  onClick={() => setActiveTab('general')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                    activeTab === 'general' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  General
                </button>
              </div>
            </div>

            {/* TAB 1: INTERNAL CONVERSATION (ADMIN <-> CONSULTANT CHAT) */}
            {activeTab === 'internal' && (
              <div className="space-y-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Internal Team Collaboration:</strong> Only Admin &amp; Assigned Consultants see this thread. Client is 100% blind to this channel.
                    </span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-amber-300 font-bold text-amber-800">
                    Private Channel
                  </span>
                </div>

                {/* Messages stream */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {internalComments.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No internal collaboration messages yet. Post a note below to discuss root cause, SAP OSS notes, or transport blocks with the Admin.
                    </div>
                  ) : (
                    internalComments.map(c => (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-lg text-xs leading-relaxed border ${
                          c.authorRole === 'SUPER_ADMIN' || c.authorRole === 'AMS_MANAGER'
                            ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                            : 'bg-amber-50/70 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{c.authorName}</span>
                            <span className="text-[10px] text-slate-500 font-semibold bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              {c.authorRole.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> INTERNAL
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-line text-slate-700">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Post Internal Message */}
                <form onSubmit={handlePostMessage} className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                  <textarea
                    required
                    rows={3}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={
                      isConsultant
                        ? 'Message to Admin: Report progress, roadblocks, transport lock, or request client info...'
                        : 'Message to Consultant: Provide technical directives, client updates, or priorities...'
                    }
                    className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Encrypted internal note
                    </span>
                    <button
                      type="submit"
                      disabled={submittingComment}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingComment ? 'Sending...' : 'Post Internal Note'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: CUSTOMER COMMUNICATIONS (ADMIN <-> CLIENT SPOC ONLY) */}
            {activeTab === 'customer' && (
              <div className="space-y-3">
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-[11px] text-teal-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>
                      <strong>Customer-Facing Channel:</strong> Customer ({ticket.organizationName}) sees all messages here. Direct SPOC model.
                    </span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-teal-300 font-bold text-teal-800">
                    Public to Client
                  </span>
                </div>

                {/* Messages stream */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {customerComments.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No public messages exchanged with the client yet.
                    </div>
                  ) : (
                    customerComments.map(c => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-lg text-xs leading-relaxed border bg-slate-50 border-slate-200 text-slate-800"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{c.authorName}</span>
                            <span className="text-[10px] text-slate-500 font-semibold bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              {c.authorRole.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-line text-slate-700">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* If Consultant: Gatekeeper Protected */}
                {isConsultant ? (
                  <div className="p-3 bg-slate-100 rounded border border-slate-300 text-xs text-slate-600 flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <strong className="text-slate-800 block">Customer Connection Gatekeeper:</strong>
                      Direct communication with the client is restricted to AMS Admin &amp; Delivery Leads. Please use the <strong>Internal Conversation</strong> tab to request info or submit updates.
                    </div>
                  </div>
                ) : (
                  /* If Admin: Can send customer-facing message or request info */
                  <form onSubmit={handlePostMessage} className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        <input
                          type="checkbox"
                          checked={isRequestInfo}
                          onChange={e => setIsRequestInfo(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-0"
                        />
                        <HelpCircle className="w-3 h-3 text-teal-600" />
                        Formal Info Request (Sets status to Waiting on Client)
                      </label>
                    </div>

                    <textarea
                      required
                      rows={3}
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Type official message to customer (e.g. status update, test instructions, or inquiry)..."
                      className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="px-4 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white rounded font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {submittingComment ? 'Sending...' : 'Send to Customer'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: SOLUTION & ADMIN REVIEW GATEKEEPER */}
            {activeTab === 'solution' && (
              <div className="space-y-4 text-xs">
                {/* Scenario A: Ticket is in Pending Admin Review -> Admin Review Surface */}
                {ticket.status === 'Pending Admin Review' && isAdmin ? (
                  <div className="bg-amber-50/60 p-4 rounded-lg border-2 border-amber-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                        <CheckCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>Action Required: Admin Quality Gate &amp; Customer Delivery</span>
                      </div>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                        Submitted by {ticket.assignedConsultantName || 'Consultant'}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px]">
                      The consultant has submitted their technical fix. As Admin, please review the root cause and remediation details. You can approve and deliver the solution to the customer (moving it to Resolved and Google Sheets), or return it for rework.
                    </p>

                    {/* Consultant's Root Cause */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 block">Consultant's Root Cause Analysis:</label>
                      <div className="p-2.5 bg-white rounded border border-slate-200 text-slate-800 font-medium">
                        {ticket.rootCause || rootCauseText || 'Root cause identified and remediated.'}
                      </div>
                    </div>

                    {/* Consultant's Proposed Solution */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 block">Proposed Resolution &amp; Test Instructions:</label>
                      <div className="p-3 bg-white rounded border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {ticket.proposedSolution || solutionText || 'Solution instructions prepared.'}
                      </div>
                    </div>

                    {/* Delay justification if any */}
                    {ticket.delayReasonCategory && ticket.delayReasonCategory !== 'None / On Schedule' && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-900 text-[11px] space-y-1">
                        <strong>Consultant Delay Justification:</strong> {ticket.delayReasonCategory}
                        {ticket.delayReasonDetails && <p className="text-red-800">{ticket.delayReasonDetails}</p>}
                      </div>
                    )}

                    {/* Admin Review Feedback input */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800 block">Admin QA Notes / Customer Preface:</label>
                      <textarea
                        rows={2}
                        value={adminReviewNotes}
                        onChange={e => setAdminReviewNotes(e.target.value)}
                        placeholder="Optional feedback for consultant if returning, or preface for the customer..."
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded focus:outline-none"
                      />
                    </div>

                    {/* Action buttons: Approve vs Return */}
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                      <button
                        type="button"
                        onClick={handleAdminReturnForRework}
                        disabled={reviewingAction}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded border border-red-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {reviewingAction ? 'Processing...' : 'Return to Consultant for Rework'}
                      </button>

                      <button
                        type="button"
                        onClick={handleAdminApproveSolution}
                        disabled={reviewingAction}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        {reviewingAction ? 'Approving...' : 'Approve & Deliver Solution to Customer'}
                      </button>
                    </div>
                  </div>
                ) : ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                  /* Scenario B: Already Resolved -> Show Solution Stamp */
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-300 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Resolution Officially Delivered to Client</span>
                    </div>
                    <div className="p-3 bg-white rounded border border-emerald-200 text-slate-800 leading-relaxed whitespace-pre-line">
                      <strong>Root Cause:</strong> {ticket.rootCause || 'N/A'}
                      <div className="mt-2">
                        <strong>Solution:</strong> {ticket.proposedSolution || ticket.resolutionSummary}
                      </div>
                    </div>
                    <div className="text-[11px] text-emerald-800 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Resolved on {ticket.resolutionDate ? new Date(ticket.resolutionDate).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                ) : (
                  /* Scenario C: Consultant or Admin authoring the fix */
                  <form
                    onSubmit={isConsultant ? handleConsultantSubmitForReview : handleAdminApproveSolution}
                    className="space-y-4 text-xs bg-slate-50/80 p-4 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      {isConsultant
                        ? 'Submit Technical Fix for Admin Review & Approval'
                        : 'Submit Solution & Deliver to Customer'}
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {isConsultant
                        ? 'Provide technical root cause, SAP config changes, and validation instructions. The AMS Admin will review and officially deliver the solution to the client.'
                        : 'As Admin, this solution will be published directly to the customer and marked Resolved in Google Sheets.'}
                    </p>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Root Cause Analysis *</label>
                      <input
                        type="text"
                        required
                        value={rootCauseText}
                        onChange={e => setRootCauseText(e.target.value)}
                        placeholder="e.g. Missing valuation class mapping in OBYC or incorrect tax condition table"
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Proposed Resolution &amp; Test Instructions *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={solutionText}
                        onChange={e => setSolutionText(e.target.value)}
                        placeholder="Detail configuration steps, transport request number (TR), and user testing steps..."
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded leading-relaxed focus:outline-none"
                      />
                    </div>

                    {/* Delay Justification if ticket took longer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded border border-slate-200">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                          Reason for Delay / Late Module (If Applicable):
                        </label>
                        <select
                          value={delayCategory}
                          onChange={e => setDelayCategory(e.target.value)}
                          className="w-full p-1.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs"
                        >
                          <option value="None / On Schedule">None / On Schedule</option>
                          <option value="SAP OSS Note / Standard Bug">SAP Standard OSS Note Required</option>
                          <option value="Client Authorization / Dump Pending">Client SU53 Dump / Authorization Pending</option>
                          <option value="Transport Freeze / Production Lock">Transport Request Freeze / Landscape Lock</option>
                          <option value="Complex ABAP / Custom Exit Debugging">Complex ABAP User Exit Debugging</option>
                          <option value="Third-Party Interface / Middleware Downtime">Third-Party Interface Downtime (PI/PO/BTP)</option>
                          <option value="UAT / Client Testing Delay">Client UAT Testing Turnaround Delay</option>
                          <option value="Scope Creep / RFC Required">Scope Creep / Additional RFC Needed</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                          Delay Justification Notes:
                        </label>
                        <input
                          type="text"
                          value={delayDetails}
                          onChange={e => setDelayDetails(e.target.value)}
                          placeholder="e.g. Waiting on SAP support response for OSS 29104..."
                          className="w-full p-1.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-slate-700 text-[11px]">Time to Add (min):</label>
                        <input
                          type="number"
                          min={0}
                          value={additionalTimeMins}
                          onChange={e => setAdditionalTimeMins(parseInt(e.target.value, 10) || 0)}
                          className="w-20 p-1 bg-white border border-[#E5EAF0] rounded text-center text-xs font-bold"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingSolution}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {submittingSolution
                          ? 'Submitting...'
                          : isConsultant
                          ? 'Submit Fix for Admin Review'
                          : 'Approve & Deliver to Customer'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 4: TIME MANAGEMENT & REASON FOR LATE MODULE TRACKING */}
            {activeTab === 'time' && (
              <div className="space-y-4 text-xs">
                {/* Time Summary Banner */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Timer className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-700 block">Total Recorded Effort</span>
                      <div className="text-xl font-bold text-indigo-950">
                        {ticket.timeSpentMinutes || 0} Minutes{' '}
                        <span className="text-xs font-medium text-indigo-700">
                          ({((ticket.timeSpentMinutes || 0) / 60).toFixed(1)} Hours)
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] bg-white px-2.5 py-1 rounded font-bold text-slate-600 border border-indigo-200">
                    {timeEntries.length} logged sessions
                  </span>
                </div>

                {/* Log New Time Entry Form */}
                <form onSubmit={handleLogTime} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">Log Support Effort Session:</span>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-600 text-[11px] font-medium">Quick Select:</span>
                    {[15, 30, 45, 60, 90, 120].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMins(m)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer transition-colors ${
                          durationMins === m
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        +{m}m
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Duration (Minutes) *</label>
                      <input
                        type="number"
                        min={5}
                        required
                        value={durationMins}
                        onChange={e => setDurationMins(parseInt(e.target.value, 10) || 0)}
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded font-bold text-indigo-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Work Description *</label>
                      <input
                        type="text"
                        required
                        value={workDesc}
                        onChange={e => setWorkDesc(e.target.value)}
                        placeholder="e.g. Debugging user exit in SE38, checking OBBS currency rates..."
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={isBillable}
                        onChange={e => setIsBillable(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0"
                      />
                      <span>Billable Support Effort</span>
                    </label>

                    <button
                      type="submit"
                      disabled={submittingTime}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      {submittingTime ? 'Logging...' : 'Record Time Entry'}
                    </button>
                  </div>
                </form>

                {/* DELAY REASON & LATE MODULE TRACKING MODULE */}
                <form
                  onSubmit={handleSaveDelayJustification}
                  className="p-4 bg-amber-50/50 rounded-lg border border-amber-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Reason for Delay / Late Module Tracking:</span>
                    </div>
                    {delaySavedMsg && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        Saved!
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    If this ticket breached SLA or took longer than targeted, record the official root reason for delivery governance and client reporting.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Delay Classification Category:</label>
                      <select
                        value={delayCategory}
                        onChange={e => setDelayCategory(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs font-semibold"
                      >
                        <option value="None / On Schedule">None / On Schedule</option>
                        <option value="SAP OSS Note / Standard Bug">SAP Standard OSS Note Required</option>
                        <option value="Client Authorization / Dump Pending">Client SU53 Dump / Authorization Pending</option>
                        <option value="Transport Freeze / Production Lock">Transport Request Freeze / Landscape Lock</option>
                        <option value="Complex ABAP / Custom Exit Debugging">Complex ABAP User Exit Debugging</option>
                        <option value="Third-Party Interface / Middleware Downtime">Third-Party Interface Downtime (PI/PO/BTP)</option>
                        <option value="UAT / Client Testing Delay">Client UAT Testing Turnaround Delay</option>
                        <option value="Scope Creep / RFC Required">Scope Creep / Additional RFC Needed</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Detailed Delay Justification Notes:</label>
                      <input
                        type="text"
                        value={delayDetails}
                        onChange={e => setDelayDetails(e.target.value)}
                        placeholder="e.g. Client BASIS team had locked the transport queue for PRD migration..."
                        className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingDelay}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs cursor-pointer shadow-xs"
                    >
                      {savingDelay ? 'Saving...' : 'Save Delay Classification'}
                    </button>
                  </div>
                </form>

                {/* Logged Work Sessions Table */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                    Recorded Support Sessions History:
                  </span>
                  <div className="bg-white rounded border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Consultant</th>
                          <th className="py-2 px-3">Work Summary</th>
                          <th className="py-2 px-3 text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {timeEntries.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                              No time entries logged yet. Record sessions above.
                            </td>
                          </tr>
                        ) : (
                          timeEntries.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                {entry.workDate}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {entry.consultantName}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {entry.workDescription}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                                {entry.durationMinutes} min
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

            {/* TAB 5: GENERAL DATA */}
            {activeTab === 'general' && <TicketGeneralDataPanel ticket={ticket} />}
          </div>
        </div>

        {/* COLUMN 3 (RIGHT - 3 cols): Lifecycle, SLA Countdown, Consultant Assignment, Timeline */}
        <div className="lg:col-span-3 space-y-4 text-xs">
          {/* Status & Priority Card */}
          <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3">
            <span className="text-[10px] text-slate-400 uppercase font-bold block border-b border-slate-100 pb-1.5">
              Lifecycle &amp; SLA Controls
            </span>

            {/* Status Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Ticket Status</label>
              <select
                value={ticket.status}
                onChange={e => handleStatusChange(e.target.value)}
                className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-semibold text-slate-800 focus:outline-none"
              >
                {isAdmin ? (
                  <>
                    <option value="New">New</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Client">Waiting for Customer</option>
                    <option value="Pending Admin Review">Pending Admin Review</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </>
                ) : (
                  <>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Admin Review">Submit for Admin Review</option>
                    <option value="Pending Client">Waiting for Customer</option>
                  </>
                )}
              </select>
            </div>

            {/* Priority Selector */}
            {isAdmin && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Priority</label>
                <select
                  value={selectedPriority}
                  onChange={e => handlePriorityChange(e.target.value as TicketPriority)}
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-bold text-slate-800 focus:outline-none"
                >
                  <option value="P1">P1 - Critical</option>
                  <option value="P2">P2 - High</option>
                  <option value="P3">P3 - Medium</option>
                  <option value="P4">P4 - Low</option>
                </select>
              </div>
            )}

            {/* SLA Countdown Timer */}
            <div
              className={`p-3 rounded border space-y-1 ${
                ticket.isResolutionBreached
                  ? 'bg-red-50 border-red-200'
                  : ticket.isAtRisk
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  SLA Target:
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    ticket.isResolutionBreached
                      ? 'bg-red-200 text-red-900'
                      : ticket.isAtRisk
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {ticket.isResolutionBreached ? 'BREACHED' : ticket.isAtRisk ? 'AT RISK' : 'ON SCHEDULE'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                Deadline:{' '}
                {new Date(ticket.resolutionDeadline).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Assigned Engineer Card */}
          <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3">
            <span className="text-[10px] text-slate-400 uppercase font-bold block border-b border-slate-100 pb-1.5">
              Support Engineer Assignment
            </span>

            <div>
              <div className="font-bold text-slate-900 text-sm">
                {ticket.assignedConsultantName || <span className="text-slate-400 italic">Unassigned</span>}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Support Lead: Venkat (Senior Support Lead)
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Change Assignment
              </button>
            )}
          </div>

          {/* Ticket Timeline / Activity Audit Trail */}
          <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold block border-b border-slate-100 pb-1.5 flex items-center gap-1">
              <History className="w-3 h-3 text-slate-500" /> Complete Ticket History
            </span>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pl-2 border-l-2 border-slate-200">
              {history.map(h => (
                <div key={h.id} className="relative pl-2.5">
                  <div className="font-bold text-slate-800 text-[11px]">{h.action}</div>
                  <div className="text-[10px] text-slate-500">{h.details}</div>
                  <div className="text-[9px] text-slate-400">
                    {h.actorName} •{' '}
                    {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DOCKED BOTTOM WINDOW: Created Date, Time & Live Running Elapsed Timer */}
      <div className="sticky bottom-0 z-20 mt-6 shadow-2xl">
        <TicketBottomWindow
          ticket={ticket}
          onViewAttachments={() => {
            const attSection = document.querySelector('input[type="file"]')?.parentElement;
            attSection?.scrollIntoView({ behavior: 'smooth' });
          }}
          onViewGeneralData={() => setActiveTab('general')}
        />
      </div>

      {/* Assign Engineer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Assign Support Engineer ({ticket.sapModule})
            </h3>

            <form onSubmit={handleAssignEngineer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Certified SAP Engineer</label>
                <select
                  required
                  value={selectedEngineerId}
                  onChange={e => setSelectedEngineerId(e.target.value)}
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-medium text-slate-800"
                >
                  <option value="">-- Choose Engineer --</option>
                  {engineers.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} - {e.designation} (Skills: {e.sapExpertise?.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedEngineerId}
                  className="px-4 py-1.5 bg-[#2563EB] disabled:opacity-50 text-white rounded font-bold cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
