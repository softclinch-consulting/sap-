import React from 'react';
import { Ticket, TicketGeneralData } from '../types/index.ts';
import {
  Server,
  Layers,
  Database,
  Building2,
  Phone,
  Clock,
  ShieldAlert,
  Cpu,
  Workflow,
  Globe,
  Tag
} from 'lucide-react';

interface TicketGeneralDataPanelProps {
  ticket: Ticket;
}

export const TicketGeneralDataPanel: React.FC<TicketGeneralDataPanelProps> = ({ ticket }) => {
  const gd: TicketGeneralData = ticket.generalData || {
    category: ticket.issueCategory || 'Incident',
    sapRelease: 'SAP S/4HANA 2023 FPS02',
    sapClient: ticket.sapSystemSid === 'DEV' ? '300' : ticket.sapSystemSid === 'QAS' ? '200' : '100',
    dbSystem: 'SAP HANA 2.0 SPS07',
    businessProcess: `${ticket.sapModule} Standard Process`,
    department: 'Enterprise IT & Business Systems',
    contactPhone: '+1 (555) 010-4420',
    timezone: 'UTC',
    urgency: ticket.priority === 'P1' ? 'Immediate' : ticket.priority === 'P2' ? 'High' : 'Medium',
    serverHost: `sap-${(ticket.sapSystemSid || 'prd').toLowerCase()}-app01.local`
  };

  return (
    <div className="bg-white rounded-lg border border-[#E5EAF0] p-4 space-y-4 text-xs shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            SAP ITSM General Data &amp; System Landscape Context
          </span>
        </div>
        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
          Client Mandant: {gd.sapClient}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Classification & Category */}
        <div className="p-3 bg-[#F8FAFC] rounded-md border border-slate-200/70 space-y-2">
          <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
            <Tag className="w-3.5 h-3.5 text-blue-500" />
            <span>Ticket Classification</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Category:</span>
              <span className="font-semibold text-slate-800">{gd.category || ticket.issueCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Priority:</span>
              <span className="font-bold text-slate-900">{ticket.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Urgency:</span>
              <span className="font-semibold text-amber-700">{gd.urgency || 'Operational'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Module:</span>
              <span className="font-bold text-blue-700">{ticket.sapModule}</span>
            </div>
          </div>
        </div>

        {/* 2. SAP Technical Architecture */}
        <div className="p-3 bg-[#F8FAFC] rounded-md border border-slate-200/70 space-y-2">
          <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
            <Server className="w-3.5 h-3.5 text-teal-600" />
            <span>SAP Landscape Architecture</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">System SID:</span>
              <span className="font-mono font-bold text-teal-800">{ticket.sapSystemSid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SAP Release:</span>
              <span className="font-semibold text-slate-800">{gd.sapRelease}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mandant / Client:</span>
              <span className="font-mono font-bold text-blue-800">{gd.sapClient}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Database:</span>
              <span className="font-semibold text-slate-700">{gd.dbSystem}</span>
            </div>
          </div>
        </div>

        {/* 3. Business Process & T-Code */}
        <div className="p-3 bg-[#F8FAFC] rounded-md border border-slate-200/70 space-y-2">
          <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
            <Workflow className="w-3.5 h-3.5 text-purple-600" />
            <span>Business Process &amp; T-Code</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Transaction:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                {ticket.transactionCode || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sub-process:</span>
              <span className="font-semibold text-slate-800 text-right truncate max-w-[140px]" title={gd.businessProcess}>
                {gd.businessProcess}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Environment:</span>
              <span className="font-semibold text-slate-700">{ticket.environment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Host:</span>
              <span className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]" title={gd.serverHost}>
                {gd.serverHost || 'sapapp01.local'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reporter Contact & Organization Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-slate-100 text-[11px]">
        <div className="flex items-center gap-2 text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Org: <strong className="text-slate-800">{ticket.organizationName}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Contact: <strong className="text-slate-800">{ticket.clientContactName} ({gd.contactPhone || 'ext. 4420'})</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Dept &amp; Timezone: <strong className="text-slate-800">{gd.department || 'Operations'} ({gd.timezone || 'UTC'})</strong></span>
        </div>
      </div>
    </div>
  );
};
