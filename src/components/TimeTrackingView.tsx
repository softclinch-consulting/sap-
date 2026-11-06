import React, { useState, useEffect } from 'react';
import { TimeEntry, Ticket, User } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Timer,
  Play,
  Square,
  PlusCircle,
  Calendar,
  Clock,
  CheckCircle,
  Building2,
  FileText
} from 'lucide-react';

interface TimeTrackingViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const TimeTrackingView: React.FC<TimeTrackingViewProps> = ({ currentUser, onNavigate }) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Entry Form
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [workDescription, setWorkDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  // Live Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (!timerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, timeRes] = await Promise.all([
        api.getTickets(),
        api.getTimeEntries()
      ]);
      setTickets(tRes.tickets);
      setEntries(timeRes.entries);
      if (tRes.tickets.length > 0 && !selectedTicketId) {
        setSelectedTicketId(tRes.tickets[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !workDescription) return;

    try {
      await api.createTimeEntry({
        ticketId: selectedTicketId,
        workDate,
        durationMinutes,
        workDescription,
        isBillable
      });
      setWorkDescription('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopTimer = async () => {
    setTimerRunning(false);
    const mins = Math.max(5, Math.round(timerSeconds / 60));
    setDurationMinutes(mins);
  };

  const totalMinutes = entries.reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Timer className="w-4 h-4 text-teal-600" />
            Support Time Tracking &amp; Consultant Timesheets
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Log billable hours against SAP incidents, monitor consultant utilization, and track client monthly effort.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-right">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Recorded Hours</div>
            <div className="text-base font-bold text-teal-800">
              {Math.round((totalMinutes / 60) * 10) / 10} hrs
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stopwatch & Entry Form */}
        <div className="space-y-6">
          {/* Live Stopwatch Card */}
          <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Interactive Session Timer</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                timerRunning ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-slate-100 text-slate-600'
              }`}>
                {timerRunning ? 'RUNNING' : 'STOPPED'}
              </span>
            </h2>

            <div className="text-center py-4 bg-slate-900 rounded-lg text-white">
              <div className="font-mono text-3xl font-bold tracking-widest text-emerald-400">
                {formatSeconds(timerSeconds)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Live active investigation clock</div>
            </div>

            <div className="flex gap-2">
              {!timerRunning ? (
                <button
                  type="button"
                  onClick={() => setTimerRunning(true)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" /> Start Timer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopTimer}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Square className="w-3.5 h-3.5" /> Stop &amp; Apply
                </button>
              )}
            </div>
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleManualSubmit} className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3.5 text-xs">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Log Effort Entry
            </h2>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Ticket *</label>
              <select
                required
                value={selectedTicketId}
                onChange={e => setSelectedTicketId(e.target.value)}
                className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono text-xs"
              >
                {tickets.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id} - {t.subject.slice(0, 40)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={workDate}
                  onChange={e => setWorkDate(e.target.value)}
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Duration (Mins) *</label>
                <input
                  type="number"
                  required
                  min="5"
                  step="5"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Work Description *</label>
              <textarea
                required
                rows={3}
                value={workDescription}
                onChange={e => setWorkDescription(e.target.value)}
                placeholder="Detail technical actions, program debugging, transport creation, or user training..."
                className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={e => setIsBillable(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-0"
                />
                Billable Effort
              </label>

              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Save Entry
              </button>
            </div>
          </form>
        </div>

        {/* Right: Timesheet History Table */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E5EAF0] shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recorded Consultant Timesheets
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {entries.length} entries recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/60 border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Consultant</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">Loading timesheets...</td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">No time recorded yet.</td>
                  </tr>
                ) : (
                  entries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {e.ticketId}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {e.consultantName}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {e.workDate}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {e.durationMinutes} mins ({Math.round((e.durationMinutes / 60) * 10) / 10}h)
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={e.workDescription}>
                        {e.workDescription}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          e.isBillable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {e.isBillable ? 'Billable' : 'Internal'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
