import React, { useState, useEffect } from 'react';
import { Organization, SAPLandscape, User } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Building2,
  PlusCircle,
  Server,
  Users,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Mail,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface OrganizationsViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({ currentUser, onNavigate }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [industry, setIndustry] = useState('');
  const [primaryContact, setPrimaryContact] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [supportPlan, setSupportPlan] = useState<'Enterprise Platinum' | 'Standard Gold' | 'Dedicated Silver'>('Enterprise Platinum');
  const [supportHours, setSupportHours] = useState('24/7 Dedicated Support');

  useEffect(() => {
    loadOrganizations();
  }, [currentUser]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const res = await api.getOrganizations();
      setOrganizations(res.organizations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createOrganization({
        name,
        code,
        industry,
        primaryContact,
        contactEmail,
        contactNumber,
        supportPlan,
        supportHours
      });
      setShowAddModal(false);
      setName('');
      setCode('');
      await loadOrganizations();
    } catch (err) {
      console.error(err);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Client Organizations &amp; Multi-Tenant SLA Contracts
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Isolated tenant database boundaries, authorized client contacts, and SAP landscape mappings.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Onboard New Client
          </button>
        )}
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading organizations...</div>
        ) : (
          organizations.map((org: any) => (
            <div key={org.id} className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-5 space-y-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    {org.code}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 mt-1.5">{org.name}</h2>
                  <div className="text-[11px] text-slate-500">{org.industry}</div>
                </div>

                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  {org.status}
                </span>
              </div>

              {/* Support Plan Details */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">SLA Tier:</span>
                  <span className="font-bold text-slate-800">{org.supportPlan}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Coverage:</span>
                  <span className="text-slate-700 font-medium">{org.supportHours}</span>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                <div className="p-2 bg-[#F5F7FA] rounded">
                  <div className="font-bold text-slate-800 text-sm">{org.ticketCount || 0}</div>
                  <div className="text-[10px] text-slate-400">Tickets</div>
                </div>
                <div className="p-2 bg-[#F5F7FA] rounded">
                  <div className="font-bold text-slate-800 text-sm">{org.systemCount || 0}</div>
                  <div className="text-[10px] text-slate-400">Systems</div>
                </div>
                <div className="p-2 bg-[#F5F7FA] rounded">
                  <div className="font-bold text-slate-800 text-sm">{org.userCount || 0}</div>
                  <div className="text-[10px] text-slate-400">Users</div>
                </div>
              </div>

              {/* Contact info */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{org.primaryContact}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{org.contactEmail}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => onNavigate('tickets', org.name)}
                  className="text-xs text-[#2563EB] font-semibold hover:underline"
                >
                  View Tickets &rarr;
                </button>
                <button
                  onClick={() => onNavigate('landscapes', org.id)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  SAP Systems &rarr;
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Add Organization */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Onboard Client Organization
            </h3>

            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company Name *</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Acme Industrial Corp"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Client Code *</label>
                  <input
                    required
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ACME"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="e.g. Manufacturing, Chemicals, Retail"
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Primary Contact</label>
                  <input
                    type="text"
                    value={primaryContact}
                    onChange={e => setPrimaryContact(e.target.value)}
                    placeholder="e.g. Robert Miller"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="robert@company.com"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Support Plan Tier</label>
                  <select
                    value={supportPlan}
                    onChange={e => setSupportPlan(e.target.value as any)}
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  >
                    <option value="Enterprise Platinum">Enterprise Platinum (15m P1 SLA)</option>
                    <option value="Standard Gold">Standard Gold (30m P1 SLA)</option>
                    <option value="Dedicated Silver">Dedicated Silver (1h P1 SLA)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Support Hours</label>
                  <input
                    type="text"
                    value={supportHours}
                    onChange={e => setSupportHours(e.target.value)}
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
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
