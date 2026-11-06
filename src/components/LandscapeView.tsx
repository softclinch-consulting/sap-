import React, { useState, useEffect } from 'react';
import { SAPLandscape, Organization, User } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Server,
  PlusCircle,
  Building2,
  Database,
  Cloud,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

interface LandscapeViewProps {
  currentUser: User | null;
  organizationIdParam?: string;
  onNavigate: (view: string, param?: string) => void;
}

export const LandscapeView: React.FC<LandscapeViewProps> = ({
  currentUser,
  organizationIdParam,
  onNavigate
}) => {
  const [landscapes, setLandscapes] = useState<SAPLandscape[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Landscape form states
  const [organizationId, setOrganizationId] = useState(organizationIdParam || '');
  const [systemName, setSystemName] = useState('');
  const [sid, setSid] = useState('');
  const [sapProduct, setSapProduct] = useState('SAP S/4HANA Enterprise');
  const [sapVersion, setSapVersion] = useState('2023 FPS01');
  const [environment, setEnvironment] = useState<'Production' | 'Quality Assurance' | 'Development' | 'Sandbox'>('Production');
  const [databaseType, setDatabaseType] = useState('SAP HANA 2.0 SPS07');
  const [hostingType, setHostingType] = useState('AWS');
  const [businessOwner, setBusinessOwner] = useState('');
  const [technicalContact, setTechnicalContact] = useState('');

  useEffect(() => {
    loadData();
  }, [currentUser, organizationIdParam]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [landRes, orgRes] = await Promise.all([
        api.getLandscapes(organizationIdParam),
        api.getOrganizations()
      ]);
      setLandscapes(landRes.landscapes);
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

  const handleCreateLandscape = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLandscape({
        organizationId,
        systemName,
        sid: sid.toUpperCase(),
        sapProduct,
        sapVersion,
        environment,
        databaseType,
        hostingType,
        businessOwner,
        technicalContact
      });
      setShowAddModal(false);
      setSystemName('');
      setSid('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const isClientEmployee = currentUser?.role === 'CLIENT_EMPLOYEE';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            SAP System Landscape Architecture &amp; SIDs
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Registered SAP instances (S/4HANA, ECC, BW, Solution Manager) across Production, QA, and Development tiers.
          </p>
        </div>

        {!isClientEmployee && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Register SAP System
          </button>
        )}
      </div>

      {/* Landscape Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading SAP landscape systems...</div>
        ) : (
          landscapes.map(sys => (
            <div key={sys.id} className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-5 space-y-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-[#101B2D] text-white px-2 py-0.5 rounded shadow-xs">
                      {sys.sid}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      sys.environment === 'Production' ? 'bg-red-50 text-red-700 border border-red-200' :
                      sys.environment === 'Quality Assurance' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {sys.environment}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 mt-2">{sys.systemName}</h2>
                  <div className="text-[11px] text-slate-500">{sys.organizationName}</div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {sys.systemStatus}
                </div>
              </div>

              {/* Technical Spec Box */}
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans">Product:</span>
                  <span className="font-bold text-slate-800">{sys.sapProduct}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans">Release:</span>
                  <span className="text-slate-700">{sys.sapVersion}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans">Database:</span>
                  <span className="text-blue-700 font-bold">{sys.databaseType}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans">Hosting:</span>
                  <span className="text-slate-700">{sys.hostingType}</span>
                </div>
              </div>

              {/* Ownership */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                <div><span className="font-semibold text-slate-700">Business Owner:</span> {sys.businessOwner || 'Enterprise Lead'}</div>
                <div><span className="font-semibold text-slate-700">Lead BASIS:</span> {sys.technicalContact || 'David Chen'}</div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onNavigate('tickets', sys.sid)}
                  className="text-xs text-[#2563EB] font-semibold hover:underline"
                >
                  View Active Tickets for {sys.sid} &rarr;
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add System */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              Register SAP System Instance
            </h3>

            <form onSubmit={handleCreateLandscape} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="font-bold text-slate-700 block mb-1">System SID (3 chars) *</label>
                  <input
                    required
                    maxLength={4}
                    type="text"
                    value={sid}
                    onChange={e => setSid(e.target.value.toUpperCase())}
                    placeholder="e.g. PRD, Q01"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">System Name *</label>
                <input
                  required
                  type="text"
                  value={systemName}
                  onChange={e => setSystemName(e.target.value)}
                  placeholder="e.g. S/4HANA 2023 Production Cluster"
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Environment</label>
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value as any)}
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  >
                    <option value="Production">Production</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Development">Development</option>
                    <option value="Sandbox">Sandbox</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Database Type</label>
                  <input
                    type="text"
                    value={databaseType}
                    onChange={e => setDatabaseType(e.target.value)}
                    placeholder="e.g. SAP HANA 2.0, Oracle 19c"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SAP Product</label>
                  <input
                    type="text"
                    value={sapProduct}
                    onChange={e => setSapProduct(e.target.value)}
                    placeholder="e.g. SAP S/4HANA"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hosting Platform</label>
                  <input
                    type="text"
                    value={hostingType}
                    onChange={e => setHostingType(e.target.value)}
                    placeholder="AWS, Azure, GCP, On-Prem"
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
                  Save System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
