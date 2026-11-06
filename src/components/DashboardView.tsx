import React, { useState, useEffect } from 'react';
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
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Ticket as TicketIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Server,
  Layers,
  ArrowRight,
  Filter,
  Flame,
  Users,
  ShieldCheck
} from 'lucide-react';
import { DashboardMetrics, User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface DashboardViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('Last 30 Days');

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

  if (loading || !metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Calculating SAP Operational Metrics from SQLite...</span>
        </div>
      </div>
    );
  }

  const isClient = currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE';

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-[#172033] flex items-center gap-2">
            <span>{isClient ? `${currentUser?.organizationName} Support Portal` : 'SAP AMS Operations Command Center'}</span>
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              Live Production
            </span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Operational Service Level Agreement (SLA) status, incident telemetry, and workload distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="text-xs bg-[#F5F7FA] border border-[#E5EAF0] rounded-md px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option>Today</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Current Fiscal Quarter</option>
          </select>

          <button
            onClick={() => onNavigate('create-ticket')}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <TicketIcon className="w-3.5 h-3.5" />
            Raise Ticket
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Tickets</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.totalTickets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All lifecycles</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="text-[11px] font-semibold text-blue-600 uppercase">New</div>
          <div className="text-xl font-bold text-blue-600 mt-1">{metrics.newTickets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting triage</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="text-[11px] font-semibold text-teal-600 uppercase">In Progress</div>
          <div className="text-xl font-bold text-teal-700 mt-1">{metrics.inProgressTickets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Investigating</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="text-[11px] font-semibold text-amber-600 uppercase">Pending Client</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{metrics.pendingClientTickets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Paused in SLA</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-red-200 bg-red-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-red-700 uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-red-600 animate-pulse" />
            SLA At Risk
          </div>
          <div className="text-xl font-bold text-red-600 mt-1">{metrics.slaAtRiskCount}</div>
          <div className="text-[10px] text-red-500 mt-0.5">&lt; 60 min to breach</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="text-[11px] font-semibold text-purple-700 uppercase">Escalated</div>
          <div className="text-xl font-bold text-purple-700 mt-1">{metrics.escalatedTickets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Lead review</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase">Resolved</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{metrics.resolvedTickets + metrics.closedTickets}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Confirmed solutions</div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-700 uppercase">SLA Compliance</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{metrics.slaComplianceRate}%</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Target: 95.0%</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Volume */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">Monthly SAP Ticket Volume &amp; Resolution Trend</h2>
              <p className="text-[11px] text-[#64748B]">Inflow vs closure velocity over past 5 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
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
              <BarChart data={metrics.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* Priority Breakdown & SLA Compliance Ring */}
        <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172033]">Priority Distribution</h2>
            <p className="text-[11px] text-[#64748B] mb-3">P1 Critical through P4 Low proportions</p>

            <div className="h-44 flex items-center justify-center">
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

      {/* Secondary Row: Module Distribution & Consultant Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module breakdown */}
        <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">SAP Module Issue Distribution</h2>
              <p className="text-[11px] text-[#64748B]">Incidents categorized by SAP functional &amp; technical areas</p>
            </div>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-xs text-[#2563EB] font-medium hover:underline flex items-center gap-1"
            >
              View tickets <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics.moduleDistribution.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No module metrics recorded yet</div>
            ) : (
              metrics.moduleDistribution.map(m => {
                const pct = metrics.totalTickets > 0 ? Math.round((m.count / metrics.totalTickets) * 100) : 0;
                return (
                  <div key={m.module} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{m.module}</span>
                      <span className="text-slate-500 font-semibold">{m.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0F766E] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Consultant Workload & Capacity */}
        <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">Consultant Workload &amp; Bandwidth</h2>
              <p className="text-[11px] text-[#64748B]">Active ticket allocations vs assigned operational capacity</p>
            </div>
            <button
              onClick={() => onNavigate('support-team')}
              className="text-xs text-[#2563EB] font-medium hover:underline flex items-center gap-1"
            >
              Team details <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {metrics.consultantWorkloads.map(c => {
              const utilPct = Math.round((c.activeTickets / c.capacity) * 100);
              const isHeavy = utilPct >= 80;
              return (
                <div key={c.name} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.module}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {c.activeTickets} / {c.capacity} tickets
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        isHeavy ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {utilPct}% Utilized
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
