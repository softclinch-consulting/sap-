import React, { useState, useEffect } from 'react';
import { ChangeRequest, Organization, User, SAPModule } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  GitPullRequest,
  PlusCircle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Building2,
  FileText,
  AlertCircle,
  Sliders,
  Send
} from 'lucide-react';

interface ChangeRequestViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const ChangeRequestView: React.FC<ChangeRequestViewProps> = ({ currentUser, onNavigate }) => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New CR Form
  const [organizationId, setOrganizationId] = useState(currentUser?.organizationId || '');
  const [requestTitle, setRequestTitle] = useState('');
  const [businessRequirement, setBusinessRequirement] = useState('');
  const [sapModule, setSapModule] = useState<SAPModule>('SAP FI');
  const [technicalImpact, setTechnicalImpact] = useState('');
  const [businessImpact, setBusinessImpact] = useState('');
  const [estimatedEffortHours, setEstimatedEffortHours] = useState(40);
  const [requestedCompletionDate, setRequestedCompletionDate] = useState('2026-06-30');

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [crRes, orgRes] = await Promise.all([
        api.getChangeRequests(),
        api.getOrganizations()
      ]);
      setChangeRequests(crRes.changeRequests);
      setOrganizations(orgRes.organizations);
      if (!organizationId && orgRes.organizations.length > 0) {
        setOrganizationId(orgRes.organizations[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createChangeRequest({
        organizationId: organizationId || currentUser?.organizationId || undefined,
        requestTitle,
        businessRequirement,
        sapModule,
        technicalImpact,
        businessImpact,
        estimatedEffortHours,
        requestedCompletionDate
      });
      setShowAddModal(false);
      setRequestTitle('');
      setBusinessRequirement('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'advance', notes?: string) => {
    try {
      await api.executeCRAction(id, action, notes);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const isClient = currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-blue-600" />
            SAP Change Request (CR) Management &amp; Transport Governance
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Formal business enhancement intake, effort estimation, client CAB approval, and transport release workflow.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Submit Change Request
        </button>
      </div>

      {/* CR List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading change requests...</div>
        ) : changeRequests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-[#E5EAF0] text-center text-xs text-slate-400">
            No change requests logged. Submit an enhancement request to begin the approval process.
          </div>
        ) : (
          changeRequests.map(cr => (
            <div key={cr.id} className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-300">
                    {cr.id}
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{cr.requestTitle}</h2>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-slate-700">{cr.organizationName}</span>
                      <span>•</span>
                      <span className="font-medium text-blue-700">{cr.sapModule}</span>
                      <span>•</span>
                      <span>Effort: <strong>{cr.estimatedEffortHours} hrs</strong></span>
                      <span>•</span>
                      <span>Target: {cr.requestedCompletionDate}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                    cr.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    cr.approvalStatus === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    Approval: {cr.approvalStatus}
                  </span>

                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Stage: {cr.implementationStatus}
                  </span>
                </div>
              </div>

              {/* Requirement & Technical Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Business Requirement</span>
                  <p className="text-slate-800 leading-relaxed">{cr.businessRequirement}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Technical Impact / Transports</span>
                  <p className="text-slate-800 leading-relaxed">{cr.technicalImpact || 'Standard ABAP and IMG Customizing requests'}</p>
                </div>
              </div>

              {/* Approval information */}
              {cr.approvedBy && (
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Approved by {cr.approvedByName} on {new Date(cr.approvedAt || '').toLocaleDateString()} — "{cr.approvalNotes}"</span>
                </div>
              )}

              {/* Workflow Action Controls */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-[11px] text-slate-400">
                  Assigned Lead: <strong className="text-slate-700">{cr.assignedConsultantName || 'Priya Sharma'}</strong>
                </div>

                <div className="flex items-center gap-2">
                  {/* Client Approval Controls */}
                  {cr.approvalStatus === 'Client Review' && (
                    <>
                      <button
                        onClick={() => handleAction(cr.id, 'approve', 'Approved for PRD deployment schedule')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve CR
                      </button>
                      <button
                        onClick={() => handleAction(cr.id, 'reject', 'Scope exceeds quarterly budget')}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </>
                  )}

                  {/* Advance Implementation Phase */}
                  {cr.approvalStatus === 'Approved' && cr.implementationStatus !== 'Completed' && cr.implementationStatus !== 'Closed' && (
                    <button
                      onClick={() => handleAction(cr.id, 'advance')}
                      className="px-3 py-1 bg-[#0F766E] hover:bg-teal-800 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Advance Phase &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: New Change Request */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-blue-600" />
              Submit SAP Change Request
            </h3>

            <form onSubmit={handleCreateCR} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {!isClient ? (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Organization *</label>
                    <select
                      required
                      value={organizationId}
                      onChange={e => setOrganizationId(e.target.value)}
                      className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                    >
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Organization</label>
                    <div className="p-2 bg-slate-100 rounded text-slate-700 font-semibold border border-slate-200">
                      {currentUser?.organizationName}
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">SAP Module *</label>
                  <select
                    value={sapModule}
                    onChange={e => setSapModule(e.target.value as any)}
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  >
                    <option value="SAP FI">SAP FI - Financials</option>
                    <option value="SAP CO">SAP CO - Controlling</option>
                    <option value="SAP MM">SAP MM - Procurement</option>
                    <option value="SAP SD">SAP SD - Sales</option>
                    <option value="SAP BASIS">SAP BASIS</option>
                    <option value="SAP ABAP">SAP ABAP</option>
                    <option value="SAP S/4HANA">SAP S/4HANA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Enhancement Title *</label>
                <input
                  required
                  type="text"
                  value={requestTitle}
                  onChange={e => setRequestTitle(e.target.value)}
                  placeholder="e.g. Implement SAP SAF-T Poland & Electronic Invoicing Mandate"
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Business Requirement &amp; Scope *</label>
                <textarea
                  required
                  rows={3}
                  value={businessRequirement}
                  onChange={e => setBusinessRequirement(e.target.value)}
                  placeholder="Detail the operational objective, regulatory requirements, or efficiency improvements..."
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Technical Impact / Transports</label>
                <input
                  type="text"
                  value={technicalImpact}
                  onChange={e => setTechnicalImpact(e.target.value)}
                  placeholder="e.g. BAdI implementation, CDS View extension, new RFC connection"
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimated Effort (Hours)</label>
                  <input
                    type="number"
                    value={estimatedEffortHours}
                    onChange={e => setEstimatedEffortHours(parseFloat(e.target.value))}
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={requestedCompletionDate}
                    onChange={e => setRequestedCompletionDate(e.target.value)}
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2563EB] text-white rounded text-xs font-semibold hover:bg-blue-700"
                >
                  Submit Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
