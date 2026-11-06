import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Organization,
  SAPLandscape,
  SAPModule,
  SAPEnvironment,
  IssueCategory,
  TicketPriority
} from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Ticket,
  PlusCircle,
  Building2,
  Server,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  Paperclip,
  Upload,
  X,
  Layers,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';

interface CreateTicketViewProps {
  currentUser: User | null;
  onBack: () => void;
  onTicketCreated: (ticketId: string) => void;
}

export const CreateTicketView: React.FC<CreateTicketViewProps> = ({
  currentUser,
  onBack,
  onTicketCreated
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [landscapes, setLandscapes] = useState<SAPLandscape[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [organizationId, setOrganizationId] = useState(currentUser?.organizationId || '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sapModule, setSapModule] = useState<SAPModule>('SAP FI');
  const [sapSystemSid, setSapSystemSid] = useState('P01');
  const [environment, setEnvironment] = useState<SAPEnvironment>('Production');
  const [transactionCode, setTransactionCode] = useState('');
  const [issueCategory, setIssueCategory] = useState<IssueCategory>('Functional Issue');
  const [businessImpact, setBusinessImpact] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('P3');

  // General Data form fields
  const [ticketCategory, setTicketCategory] = useState('Incident');
  const [sapClient, setSapClient] = useState('100');
  const [sapRelease, setSapRelease] = useState('SAP S/4HANA 2023 FPS02');
  const [department, setDepartment] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Staged attachments
  const [stagedFiles, setStagedFiles] = useState<Array<{ fileName: string; fileSize: number; fileType: string; dataUrl: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPrerequisites();
  }, [currentUser]);

  const loadPrerequisites = async () => {
    try {
      const orgRes = await api.getOrganizations();
      setOrganizations(orgRes.organizations);
      if (!organizationId && orgRes.organizations.length > 0) {
        setOrganizationId(orgRes.organizations[0].id);
      }

      const landRes = await api.getLandscapes();
      setLandscapes(landRes.landscapes);
      if (landRes.landscapes.length > 0) {
        setSapSystemSid(landRes.landscapes[0].sid);
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !description.trim()) {
      setError('Subject and detailed issue description are required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createTicket({
        organizationId: organizationId || currentUser?.organizationId || undefined,
        subject: subject.trim(),
        description: description.trim(),
        sapModule,
        sapSystemSid: sapSystemSid.toUpperCase(),
        environment,
        transactionCode: transactionCode.trim().toUpperCase() || 'N/A',
        issueCategory,
        businessImpact: businessImpact.trim() || 'Standard operational issue',
        priority,
        generalData: {
          category: ticketCategory,
          sapRelease: sapRelease || 'SAP S/4HANA 2023 FPS02',
          sapClient: sapClient || '100',
          dbSystem: 'SAP HANA 2.0 SPS07',
          businessProcess: `${sapModule} Standard Process`,
          department: department || 'IT Operations',
          contactPhone: contactPhone || '+1 (555) 010-4420',
          timezone: 'UTC',
          urgency: priority === 'P1' ? 'Immediate' : priority === 'P2' ? 'High' : 'Medium'
        },
        attachments: stagedFiles
      });

      onTicketCreated(res.id);
    } catch (err: any) {
      setError(err.message || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const isClient = currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-600" />
              Raise SAP Support Incident or Service Request
            </h1>
            <p className="text-xs text-[#64748B]">
              Logged tickets are tracked in SQLite database with immediate SLA response clock initialization.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-5 text-xs">
        {/* Organization & SID Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {!isClient ? (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Client Organization *</label>
              <select
                required
                value={organizationId}
                onChange={e => setOrganizationId(e.target.value)}
                className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Client Organization</label>
              <div className="p-2 bg-slate-100 rounded text-slate-700 font-semibold border border-slate-200">
                {currentUser?.organizationName}
              </div>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">SAP System (SID) *</label>
            <input
              type="text"
              required
              value={sapSystemSid}
              onChange={e => setSapSystemSid(e.target.value)}
              placeholder="e.g. P01, ERP, PHA, Q01"
              className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono font-bold text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Environment *</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value as SAPEnvironment)}
              className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Production">Production (PRD)</option>
              <option value="Quality Assurance">Quality Assurance (QAS)</option>
              <option value="Development">Development (DEV)</option>
              <option value="Sandbox">Sandbox (SBX)</option>
            </select>
          </div>
        </div>

        {/* SAP Module, T-Code, Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-bold text-slate-700 block mb-1">SAP Module *</label>
            <select
              value={sapModule}
              onChange={e => setSapModule(e.target.value as SAPModule)}
              className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="SAP FI">SAP FI - Financial Accounting</option>
              <option value="SAP CO">SAP CO - Controlling</option>
              <option value="SAP MM">SAP MM - Materials Management</option>
              <option value="SAP SD">SAP SD - Sales &amp; Distribution</option>
              <option value="SAP PP">SAP PP - Production Planning</option>
              <option value="SAP QM">SAP QM - Quality Management</option>
              <option value="SAP PM">SAP PM - Plant Maintenance</option>
              <option value="SAP HCM">SAP HCM - Human Capital</option>
              <option value="SAP BASIS">SAP BASIS - System Administration</option>
              <option value="SAP ABAP">SAP ABAP - Development</option>
              <option value="SAP Fiori">SAP Fiori &amp; UI5</option>
              <option value="SAP S/4HANA">SAP S/4HANA Core</option>
              <option value="SAP BW">SAP BW / Analytics</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">SAP Transaction Code (T-Code)</label>
            <input
              type="text"
              value={transactionCode}
              onChange={e => setTransactionCode(e.target.value)}
              placeholder="e.g. ME21N, FB01, ST22, SM21, VF01"
              className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Issue Category *</label>
            <select
              value={issueCategory}
              onChange={e => setIssueCategory(e.target.value as IssueCategory)}
              className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Functional Issue">Functional Issue</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Configuration">Configuration</option>
              <option value="Authorization">Authorization</option>
              <option value="Performance">Performance</option>
              <option value="Integration">Integration</option>
              <option value="Data Issue">Data Issue</option>
              <option value="System Downtime">System Downtime</option>
              <option value="Enhancement Request">Enhancement Request</option>
              <option value="General Support">General Support</option>
            </select>
          </div>
        </div>

        {/* Priority Selector with SLA policy details */}
        <div>
          <label className="font-bold text-slate-700 block mb-2">Priority Level (Contractual SLA Commitments) *</label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                priority === 'P1'
                  ? 'bg-red-50 border-red-500 text-red-950 ring-1 ring-red-500'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="priority"
                value="P1"
                checked={priority === 'P1'}
                onChange={() => setPriority('P1')}
                className="sr-only"
              />
              <div className="font-bold text-red-700 text-xs">P1 – Critical Disruption</div>
              <div className="text-[11px] text-slate-600 mt-0.5">Response: 15m | Resolution: 4h</div>
              <div className="text-[10px] text-slate-400 mt-1">Halt of core production / business operations</div>
            </label>

            <label
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                priority === 'P2'
                  ? 'bg-orange-50 border-orange-500 text-orange-950 ring-1 ring-orange-500'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="priority"
                value="P2"
                checked={priority === 'P2'}
                onChange={() => setPriority('P2')}
                className="sr-only"
              />
              <div className="font-bold text-orange-700 text-xs">P2 – High Impact</div>
              <div className="text-[11px] text-slate-600 mt-0.5">Response: 30m | Resolution: 8h</div>
              <div className="text-[10px] text-slate-400 mt-1">Major process affected, no quick workaround</div>
            </label>

            <label
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                priority === 'P3'
                  ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="priority"
                value="P3"
                checked={priority === 'P3'}
                onChange={() => setPriority('P3')}
                className="sr-only"
              />
              <div className="font-bold text-amber-700 text-xs">P3 – Medium Operational</div>
              <div className="text-[11px] text-slate-600 mt-0.5">Response: 4h | Resolution: 2 days</div>
              <div className="text-[10px] text-slate-400 mt-1">Limited impact or single user affected</div>
            </label>

            <label
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                priority === 'P4'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="priority"
                value="P4"
                checked={priority === 'P4'}
                onChange={() => setPriority('P4')}
                className="sr-only"
              />
              <div className="font-bold text-emerald-700 text-xs">P4 – Low / Request</div>
              <div className="text-[11px] text-slate-600 mt-0.5">Response: 1 day | Resolution: 5 days</div>
              <div className="text-[10px] text-slate-400 mt-1">Minor inquiry or cosmetic configuration issue</div>
            </label>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">Ticket Subject / Title *</label>
          <input
            type="text"
            required
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. ME21N: Tax calculation failed during PO creation for Plant 1100"
            className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">Detailed Technical &amp; Functional Description *</label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the steps leading to error, error message number (e.g. F5 022, ME 013), affected users, test documents..."
            className="w-full p-2.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Business Impact */}
        <div>
          <label className="font-bold text-slate-700 block mb-1">Business Impact Statement *</label>
          <input
            type="text"
            required
            value={businessImpact}
            onChange={e => setBusinessImpact(e.target.value)}
            placeholder="Describe how operations, shipments, billing, or closing are impeded..."
            className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* SAP ITSM GENERAL DATA SECTION */}
        <div className="p-4 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
            <Layers className="w-4 h-4 text-blue-600" />
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
                className="w-full p-2 bg-white border border-[#E5EAF0] rounded text-xs font-mono font-bold text-blue-800"
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
              <label className="font-bold text-slate-600 block mb-1 text-[11px]">Department</label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Finance &amp; Controlling / Supply Chain"
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
            className="p-5 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-lg text-center cursor-pointer transition-colors space-y-1.5"
          >
            <Upload className="w-6 h-6 text-blue-600 mx-auto" />
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

        {/* Submit button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Generating Ticket & Initializing SLA...' : 'Log Support Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
};
