import React, { useState, useEffect } from 'react';
import { AuditLog, User } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  FileText,
  Search,
  Shield,
  Clock,
  User as UserIcon,
  RefreshCw
} from 'lucide-react';

interface AuditLogViewProps {
  currentUser: User | null;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, [currentUser]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    l =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.module.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Security &amp; Operational Audit Trail
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Immutable log of system logins, ticket state changes, consultant reassignments, and administrative actions.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold border border-slate-300 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Audit Trail
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs text-xs">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search audit trail by actor, action, or keyword..."
            className="w-full pl-8 pr-4 py-1.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor / Role</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading audit trail logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No matching audit logs found.</td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{l.userName}</div>
                      <div className="text-[10px] text-slate-400">{l.userRole}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-blue-700">
                      {l.module}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-md">
                      {l.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
