import React, { useState, useEffect } from 'react';
import { User, DashboardMetrics } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Ticket,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  ShieldAlert
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

interface ManagementDashboardViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const ManagementDashboardView: React.FC<ManagementDashboardViewProps> = ({
  currentUser,
  onNavigate
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, tRes] = await Promise.all([
        api.getDashboardMetrics(),
        api.getTickets()
      ]);
      setMetrics(mRes.metrics);
      setTickets(tRes.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Calculating Real-Time SAP AMS Operational Metrics...
      </div>
    );
  }

  // Exact metrics required by spec for Management Dashboard:
  // Total Tickets, New Tickets, Unassigned Tickets, Assigned Tickets, In Progress, Waiting for Customer, Escalated, Resolved, SLA At Risk, SLA Breached
  const total = tickets.length;
  const newCount = tickets.filter(t => t.status === 'New').length;
  const unassignedCount = tickets.filter(t => !t.assignedConsultantId).length;
  const assignedCount = tickets.filter(t => t.assignedConsultantId && t.status !== 'Resolved' && t.status !== 'Closed').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
  const waitingCustomerCount = tickets.filter(t => t.status === 'Pending Client' || t.status === 'Pending Third Party').length;
  const escalatedCount = tickets.filter(t => t.status === 'Escalated').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const atRiskCount = metrics.slaAtRiskCount;
  const breachedCount = metrics.slaBreachedCount;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <span>SoftClinch SAP Support Desk – Operations Command Center</span>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              Live Production
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Operational Service Level Agreement (SLA) status, incident telemetry, and workload distribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('management-tickets')}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded text-xs shadow-xs flex items-center gap-1.5"
          >
            <Ticket className="w-3.5 h-3.5" />
            View All Tickets
          </button>
        </div>
      </div>

      {/* 10 Management KPI Cards Specified */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 1. Total Tickets */}
        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tickets</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{total}</div>
          <span className="text-[10px] text-slate-400">All lifecycles</span>
        </div>

        {/* 2. New Tickets */}
        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase">New Tickets</span>
          <div className="text-xl font-bold text-blue-600 mt-1">{newCount}</div>
          <span className="text-[10px] text-slate-400">Awaiting triage</span>
        </div>

        {/* 3. Unassigned Tickets */}
        <div className="bg-white p-3.5 rounded-lg border border-purple-200 bg-purple-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase">Unassigned</span>
          <div className="text-xl font-bold text-purple-700 mt-1">{unassignedCount}</div>
          <span className="text-[10px] text-purple-500 font-medium">Needs assignment</span>
        </div>

        {/* 4. Assigned Tickets */}
        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[10px] font-bold text-indigo-600 uppercase">Assigned</span>
          <div className="text-xl font-bold text-indigo-700 mt-1">{assignedCount}</div>
          <span className="text-[10px] text-slate-400">Under engineer review</span>
        </div>

        {/* 5. In Progress */}
        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[10px] font-bold text-teal-700 uppercase">In Progress</span>
          <div className="text-xl font-bold text-teal-700 mt-1">{inProgressCount}</div>
          <span className="text-[10px] text-slate-400">Active investigation</span>
        </div>

        {/* 6. Waiting for Customer */}
        <div className="bg-white p-3.5 rounded-lg border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase">Waiting on Customer</span>
          <div className="text-xl font-bold text-amber-600 mt-1">{waitingCustomerCount}</div>
          <span className="text-[10px] text-amber-600 font-medium">Paused in SLA</span>
        </div>

        {/* 7. Escalated */}
        <div className="bg-white p-3.5 rounded-lg border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase">Escalated</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{escalatedCount}</div>
          <span className="text-[10px] text-slate-400">Support lead focus</span>
        </div>

        {/* 8. Resolved */}
        <div className="bg-white p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Resolved</span>
          <div className="text-xl font-bold text-emerald-600 mt-1">{resolvedCount}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Solutions provided</span>
        </div>

        {/* 9. SLA At Risk */}
        <div className="bg-white p-3.5 rounded-lg border border-amber-300 bg-amber-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-600 animate-pulse" />
            SLA At Risk
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1">{atRiskCount}</div>
          <span className="text-[10px] text-amber-600 font-semibold">&lt; 60 min remaining</span>
        </div>

        {/* 10. SLA Breached */}
        <div className="bg-white p-3.5 rounded-lg border border-red-200 bg-red-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-red-700 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            SLA Breached
          </span>
          <div className="text-xl font-bold text-red-600 mt-1">{breachedCount}</div>
          <span className="text-[10px] text-red-500 font-semibold">Contractual breach</span>
        </div>
      </div>

      {/* Interactive Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Volume */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">Monthly SAP Support Incident Velocity</h2>
              <p className="text-[11px] text-[#64748B]">Ticket inflow volume vs resolution closures</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" /> Total Volume
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]" /> Resolved
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101B2D', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="volume" name="Incoming Volume" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Ring */}
        <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172033]">Priority Distribution</h2>
            <p className="text-[11px] text-[#64748B] mb-2">P1 Critical through P4 Low proportions</p>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.priorityDistribution}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="priority"
                  >
                    {metrics.priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101B2D', borderRadius: '6px', color: '#fff', fontSize: '11px', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {metrics.priorityDistribution.map(p => (
              <div key={p.priority} className="flex items-center justify-between p-1.5 bg-slate-50 rounded">
                <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.priority}
                </span>
                <span className="font-bold text-slate-800">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Support Engineer Workload Table */}
      <div className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">SAP Support Engineer Workload &amp; Specialization</h2>
            <p className="text-xs text-slate-500">Active tickets allocated vs capacity</p>
          </div>
          <button
            onClick={() => onNavigate('management-team')}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Manage Team &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.consultantWorkloads.map(c => (
            <div key={c.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#101B2D] text-white flex items-center justify-center font-bold text-xs">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{c.name}</div>
                  <div className="text-[11px] text-slate-500">{c.module}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">{c.activeTickets} / {c.capacity}</div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  Available
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
