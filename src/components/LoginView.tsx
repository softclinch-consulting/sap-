import React, { useState } from 'react';
import { ShieldCheck, UserCheck, ArrowRight, Lock, Mail, Building2, HelpCircle } from 'lucide-react';
import { api, setActiveUserId } from '../services/api.ts';
import { User } from '../types/index.ts';

interface LoginViewProps {
  portalType: 'management' | 'customer';
  onLoginSuccess: (user: User) => void;
  onSwitchPortal: (portal: 'management' | 'customer') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ portalType, onLoginSuccess, onSwitchPortal }) => {
  const isManagement = portalType === 'management';

  // Preset demo accounts for convenience
  const defaultEmail = isManagement ? 'muthu.admin@softclinch.com' : 'pradeep.admin@acmeind.com';
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(email.trim(), password);
      // Validate portal match
      const isClientRole = res.user.role === 'CLIENT_ADMIN' || res.user.role === 'CLIENT_EMPLOYEE';
      if (isManagement && isClientRole) {
        throw new Error('Access Denied: Customer accounts cannot access the Management Portal. Please use Customer Login.');
      }
      if (!isManagement && !isClientRole) {
        throw new Error('Access Denied: Management & Support accounts must log in via the Management Portal.');
      }

      setActiveUserId(res.user.id);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#E5EAF0] overflow-hidden">
        {/* Top Header Banner */}
        <div className={`p-6 text-white text-center ${isManagement ? 'bg-[#101B2D]' : 'bg-[#0F766E]'}`}>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-3 backdrop-blur-xs">
            {isManagement ? <ShieldCheck className="w-6 h-6 text-blue-400" /> : <Building2 className="w-6 h-6 text-teal-200" />}
          </div>
          <div className="text-xl font-bold tracking-tight">SoftClinch SAP Support Desk</div>
          <div className="text-xs text-white/80 mt-1 uppercase tracking-wider font-semibold">
            {isManagement ? 'Management & Support Portal' : 'Customer Self-Service Portal'}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Corporate Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-md text-xs font-bold text-white shadow-xs flex items-center justify-center gap-2 transition-colors ${
                isManagement ? 'bg-[#2563EB] hover:bg-blue-700' : 'bg-[#0F766E] hover:bg-teal-800'
              }`}
            >
              {loading ? 'Authenticating...' : `Sign in to ${isManagement ? 'Management' : 'Customer'} Portal`}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Sign-in Helper */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Select Demo Credentials (Password: Password123!)
            </span>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {isManagement ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('muthu.admin@softclinch.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Muthu (Super Admin)</div>
                      <div className="text-[10px] text-slate-500">muthu.admin@softclinch.com</div>
                    </div>
                    <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('krishnan.ams@softclinch.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Krishnan (AMS Manager)</div>
                      <div className="text-[10px] text-slate-500">krishnan.ams@softclinch.com</div>
                    </div>
                    <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">Manager</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('venkat.lead@softclinch.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Venkat (Support Lead)</div>
                      <div className="text-[10px] text-slate-500">venkat.lead@softclinch.com</div>
                    </div>
                    <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">Lead</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('anand.consultant@softclinch.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Anand (SAP Solutions Architect)</div>
                      <div className="text-[10px] text-slate-500">anand.consultant@softclinch.com</div>
                    </div>
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Architect</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('mahendran2.consultant@softclinch.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Mahendran 2 (SAP Consultant - FI/CO & MM)</div>
                      <div className="text-[10px] text-slate-500">mahendran2.consultant@softclinch.com</div>
                    </div>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Consultant</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('pradeep.admin@acmeind.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Pradeep (Acme Industrial - Admin)</div>
                      <div className="text-[10px] text-slate-500">pradeep.admin@acmeind.com</div>
                    </div>
                    <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">Customer Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('ashwin@acmeind.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Ashwin (Acme Industrial - Operations Staff)</div>
                      <div className="text-[10px] text-slate-500">ashwin@acmeind.com</div>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded">Employee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('madan.admin@globalretail.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Madan (Global Retail - Admin)</div>
                      <div className="text-[10px] text-slate-500">madan.admin@globalretail.com</div>
                    </div>
                    <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">Customer Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('mahendran@globalretail.com')}
                    className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">Mahendran (Global Retail - Warehouse Lead)</div>
                      <div className="text-[10px] text-slate-500">mahendran@globalretail.com</div>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded">Employee</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Switch Portal Link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onSwitchPortal(isManagement ? 'customer' : 'management')}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {isManagement
                ? 'Are you a customer? Go to Customer Portal Login →'
                : 'SoftClinch Staff? Switch to Management Portal Login →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
