import React, { useState, useEffect } from 'react';
import { User, DashboardMetrics } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ReportsViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser, onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('SLA_COMPLIANCE');

  useEffect(() => {
    loadMetrics();
  }, [currentUser]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardMetrics();
      setMetrics(res.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !metrics) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Aggregating operational report datasets...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Executive SAP AMS Reports &amp; SLA Auditing
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Contractual SLA compliance certifications, monthly ticket summaries, and SAP module distribution reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>

          <a
            href="/api/tickets/export/csv"
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Raw CSV
          </a>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold">
        <button
          onClick={() => setReportType('SLA_COMPLIANCE')}
          className={`pb-2.5 px-3 border-b-2 transition-colors ${
            reportType === 'SLA_COMPLIANCE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          SLA Compliance &amp; Breaches
        </button>
        <button
          onClick={() => setReportType('MODULE_DISTRIBUTION')}
          className={`pb-2.5 px-3 border-b-2 transition-colors ${
            reportType === 'MODULE_DISTRIBUTION'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          SAP Module Breakdown
        </button>
        <button
          onClick={() => setReportType('CONSULTANT_PERF')}
          className={`pb-2.5 px-3 border-b-2 transition-colors ${
            reportType === 'CONSULTANT_PERF'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Consultant Performance &amp; Capacity
        </button>
      </div>

      {/* Report 1: SLA Compliance */}
      {reportType === 'SLA_COMPLIANCE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">SLA Compliance Rate</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.slaComplianceRate}%</div>
              <span className="text-[10px] text-emerald-600 font-medium">Commitment: &gt; 95.0%</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Avg Response Time</span>
              <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.avgResponseMinutes} min</div>
              <span className="text-[10px] text-slate-400">P1 SLA standard: 15 min</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Avg Resolution Time</span>
              <div className="text-2xl font-bold text-teal-700 mt-1">{metrics.avgResolutionHours} hrs</div>
              <span className="text-[10px] text-slate-400">Mean time to restore service</span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-red-200 bg-red-50/20 shadow-2xs">
              <span className="text-[11px] font-semibold text-red-700 uppercase">SLA Breached Tickets</span>
              <div className="text-2xl font-bold text-red-600 mt-1">{metrics.slaBreachedCount}</div>
              <span className="text-[10px] text-red-500">Root-cause penalty review</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-[#172033]">SLA Policy Targets &amp; Historical Adherence</h2>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                    <th className="py-2.5 px-3">Priority Level</th>
                    <th className="py-2.5 px-3">Response SLA Commitment</th>
                    <th className="py-2.5 px-3">Resolution SLA Commitment</th>
                    <th className="py-2.5 px-3">Operating Hours</th>
                    <th className="py-2.5 px-3">Current Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 px-3 font-bold text-red-700">P1 – Critical Disruption</td>
                    <td className="py-3 px-3 font-mono font-bold">15 minutes</td>
                    <td className="py-3 px-3 font-mono font-bold">4 hours</td>
                    <td className="py-3 px-3">24x7 Continuous</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">100.0%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-orange-700">P2 – High Priority</td>
                    <td className="py-3 px-3 font-mono font-bold">30 minutes</td>
                    <td className="py-3 px-3 font-mono font-bold">8 hours</td>
                    <td className="py-3 px-3">24x7 Continuous</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">100.0%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-amber-700">P3 – Medium Operational</td>
                    <td className="py-3 px-3 font-mono font-bold">4 business hours</td>
                    <td className="py-3 px-3 font-mono font-bold">2 business days (48h)</td>
                    <td className="py-3 px-3">Business Hours (8x5)</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">100.0%</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-bold text-emerald-700">P4 – Low / Inquiry</td>
                    <td className="py-3 px-3 font-mono font-bold">1 business day (24h)</td>
                    <td className="py-3 px-3 font-mono font-bold">5 business days (120h)</td>
                    <td className="py-3 px-3">Business Hours (8x5)</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Report 2: Module Distribution */}
      {reportType === 'MODULE_DISTRIBUTION' && (
        <div className="bg-white p-6 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#172033]">Incident Volume by SAP Module</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.moduleDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="module" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101B2D', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }}
                  />
                  <Bar dataKey="count" name="Incidents" fill="#0F766E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs">
              {metrics.moduleDistribution.map(m => (
                <div key={m.module} className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-100">
                  <span className="font-bold text-slate-800">{m.module}</span>
                  <span className="font-semibold text-blue-700">{m.count} incidents</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report 3: Consultant Performance */}
      {reportType === 'CONSULTANT_PERF' && (
        <div className="bg-white p-6 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#172033]">Consultant Capacity &amp; Assigned Workload</h2>
          <div className="space-y-3">
            {metrics.consultantWorkloads.map(c => (
              <div key={c.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                  <div className="text-[11px] text-slate-500 font-medium">Expertise: {c.module}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">{c.activeTickets} / {c.capacity} Active Tickets</div>
                  <span className="text-[10px] text-emerald-700 font-semibold">Available for assignment</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
