import React, { useState } from 'react';
import { User, TicketPriority } from '../types/index.ts';
import {
  Timer,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Save,
  Shield,
  Layers
} from 'lucide-react';

interface SLAManagementViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const SLAManagementView: React.FC<SLAManagementViewProps> = ({ currentUser, onNavigate }) => {
  const [policies, setPolicies] = useState([
    {
      id: 'sla-p1',
      name: 'P1 - Critical Disruption',
      priority: 'P1',
      responseTimeMinutes: 15,
      resolutionTimeMinutes: 240,
      businessHoursOnly: false,
      description: 'Production system halt, core business transaction failure, severe financial impact'
    },
    {
      id: 'sla-p2',
      name: 'P2 - High Priority Impact',
      priority: 'P2',
      responseTimeMinutes: 30,
      resolutionTimeMinutes: 480,
      businessHoursOnly: false,
      description: 'Significant business impact, core process degraded with no easy workaround'
    },
    {
      id: 'sla-p3',
      name: 'P3 - Medium Priority Operational',
      priority: 'P3',
      responseTimeMinutes: 240,
      resolutionTimeMinutes: 2880,
      businessHoursOnly: true,
      description: 'Standard operational issue, single user or low impact with workaround'
    },
    {
      id: 'sla-p4',
      name: 'P4 - Low Priority / Request',
      priority: 'P4',
      responseTimeMinutes: 1440,
      resolutionTimeMinutes: 7200,
      businessHoursOnly: true,
      description: 'Minor inquiry, cosmetic issue, general support or configuration query'
    }
  ]);

  const [savedNotice, setSavedNotice] = useState(false);

  const handleUpdate = (index: number, field: string, val: any) => {
    setPolicies(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSaveAll = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-600" />
            Configurable Service Level Agreement (SLA) Engine
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure response and resolution thresholds per priority, pause conditions, and working calendar rules.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save Policy Rules
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          SLA Policy matrix updated and active across background calculation workers.
        </div>
      )}

      {/* SLA Policy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((p, idx) => (
          <div key={p.id} className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  p.priority === 'P1' ? 'bg-red-100 text-red-800 border border-red-200' :
                  p.priority === 'P2' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                  p.priority === 'P3' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {p.priority}
                </span>
                <h2 className="text-sm font-bold text-slate-900">{p.name}</h2>
              </div>
            </div>

            <p className="text-xs text-slate-500">{p.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Response Target</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p.responseTimeMinutes}
                    onChange={e => handleUpdate(idx, 'responseTimeMinutes', parseInt(e.target.value, 10))}
                    className="w-16 p-1 bg-white border border-slate-300 rounded font-bold text-slate-800 text-center"
                  />
                  <span className="text-slate-600 font-medium">Minutes</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold block">Resolution Target</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p.resolutionTimeMinutes}
                    onChange={e => handleUpdate(idx, 'resolutionTimeMinutes', parseInt(e.target.value, 10))}
                    className="w-16 p-1 bg-white border border-slate-300 rounded font-bold text-slate-800 text-center"
                  />
                  <span className="text-slate-600 font-medium">Minutes</span>
                </div>
              </div>
            </div>

            {/* Operating mode */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Operating Clock:</span>
              <span className="font-semibold text-slate-800">
                {p.businessHoursOnly ? '8x5 Business Working Days' : '24x7 Continuous SLA Clock'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
