import React, { useState, useEffect } from 'react';
import { Ticket } from '../types/index.ts';
import { formatElapsedTime, formatCountdown } from '../server/logic.ts';
import {
  Clock,
  Calendar,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  Layers,
  ChevronUp,
  ChevronDown,
  Info
} from 'lucide-react';

interface TicketBottomWindowProps {
  ticket: Ticket;
  onViewAttachments?: () => void;
  onViewGeneralData?: () => void;
}

export const TicketBottomWindow: React.FC<TicketBottomWindowProps> = ({
  ticket,
  onViewAttachments,
  onViewGeneralData
}) => {
  const [elapsedString, setElapsedString] = useState<string>('');
  const [slaCountdown, setSlaCountdown] = useState<{ isOverdue: boolean; text: string; totalSeconds: number }>({
    isOverdue: false,
    text: '',
    totalSeconds: 0
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Update timer every second
  useEffect(() => {
    const updateTimers = () => {
      // If ticket is resolved or closed, elapsed time is fixed between createdDate and resolutionDate
      const isFinished = ticket.status === 'Resolved' || ticket.status === 'Closed';
      const endDate = isFinished && ticket.resolutionDate ? ticket.resolutionDate : undefined;

      setElapsedString(formatElapsedTime(ticket.createdDate, endDate));
      setSlaCountdown(formatCountdown(ticket.resolutionDeadline));
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [ticket.createdDate, ticket.resolutionDeadline, ticket.status, ticket.resolutionDate]);

  const createdDateObj = new Date(ticket.createdDate);
  const formattedCreatedDate = createdDateObj.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const formattedCreatedTime = createdDateObj.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  const isResolvedOrClosed = ticket.status === 'Resolved' || ticket.status === 'Closed';

  return (
    <div className="bg-slate-900 text-white border-t-2 border-blue-500 shadow-2xl rounded-t-lg transition-all">
      {/* Top Bar of the Bottom Window */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Created Date & Time */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-medium text-slate-400">Created:</span>
            <span className="font-semibold text-slate-100 font-mono">
              {formattedCreatedDate} at {formattedCreatedTime}
            </span>
          </div>

          <div className="hidden sm:block text-slate-600">|</div>

          {/* Center-Left: LIVE RUNNING ELAPSED TIMER */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded border border-slate-700/80">
            <Timer className={`w-3.5 h-3.5 ${isResolvedOrClosed ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
            <span className="text-[11px] text-slate-400">
              {isResolvedOrClosed ? 'Resolution Age:' : 'Elapsed Age:'}
            </span>
            <span className="font-mono font-bold text-amber-300 text-[12px] tracking-wide">
              {elapsedString || '00h 00m 00s'}
            </span>
          </div>
        </div>

        {/* Center-Right: SLA TARGET COUNTDOWN */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] ${
            ticket.isResolutionBreached || slaCountdown.isOverdue
              ? 'bg-red-950/70 border-red-500/80 text-red-200'
              : ticket.isAtRisk
              ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
              : 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200'
          }`}>
            <Clock className="w-3 h-3" />
            <span className="text-[10px] uppercase font-bold tracking-wider">
              {ticket.isResolutionBreached || slaCountdown.isOverdue ? 'SLA Breached By:' : 'SLA Target Window:'}
            </span>
            <span className="font-bold">
              {ticket.isResolutionBreached || slaCountdown.isOverdue
                ? slaCountdown.text
                : `${slaCountdown.text} remaining`}
            </span>
          </div>

          {/* Quick Buttons for Attachments & General Data */}
          <div className="flex items-center gap-1.5">
            {onViewAttachments && (
              <button
                type="button"
                onClick={onViewAttachments}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 text-[11px]"
                title="View Attachments"
              >
                <Paperclip className="w-3 h-3 text-blue-400" />
                <span>Files ({ticket.attachmentsCount ?? ticket.attachments?.length ?? 0})</span>
              </button>
            )}

            {onViewGeneralData && (
              <button
                type="button"
                onClick={onViewGeneralData}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 text-[11px]"
                title="View SAP General Data"
              >
                <Layers className="w-3 h-3 text-teal-400" />
                <span>General Data</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title={isExpanded ? 'Collapse Bottom Window' : 'Expand Diagnostics'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Technical Information Tray */}
      {isExpanded && (
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
          <div>
            <span className="text-slate-500 uppercase text-[9px] font-bold block">First Response SLA</span>
            <div className="text-slate-300 font-mono mt-0.5">
              {ticket.firstResponseDate ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Logged {new Date(ticket.firstResponseDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : ticket.isResponseBreached ? (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> First Response Breached
                </span>
              ) : (
                <span className="text-amber-400">Within 15-30m target</span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Target: {new Date(ticket.responseDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div>
            <span className="text-slate-500 uppercase text-[9px] font-bold block">Resolution Deadline</span>
            <div className="text-slate-300 font-mono mt-0.5">
              {new Date(ticket.resolutionDeadline).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Priority policy: {ticket.priority} (Full SLA Tracking)
            </div>
          </div>

          <div>
            <span className="text-slate-500 uppercase text-[9px] font-bold block">System Mandant &amp; SID</span>
            <div className="text-slate-300 font-mono mt-0.5">
              SID: <strong className="text-teal-400">{ticket.sapSystemSid}</strong> | Mandant: <strong className="text-blue-400">{ticket.generalData?.sapClient || '100'}</strong>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate" title={ticket.generalData?.sapRelease || 'SAP S/4HANA'}>
              Release: {ticket.generalData?.sapRelease || 'SAP S/4HANA 2023'}
            </div>
          </div>

          <div>
            <span className="text-slate-500 uppercase text-[9px] font-bold block">Business Impact</span>
            <div className="text-slate-300 truncate mt-0.5" title={ticket.businessImpact}>
              {ticket.businessImpact || 'Standard operational disruption'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Process: {ticket.generalData?.businessProcess || 'Standard'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
