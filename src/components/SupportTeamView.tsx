import React, { useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Users,
  Award,
  Layers,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  Shield,
  PlusCircle
} from 'lucide-react';

interface SupportTeamViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const SupportTeamView: React.FC<SupportTeamViewProps> = ({ currentUser, onNavigate }) => {
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeam();
  }, [currentUser]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      // Filter SoftClinch consulting staff
      const staff = res.users.filter(
        u => u.role === 'SUPER_ADMIN' || u.role === 'AMS_MANAGER' || u.role === 'SUPPORT_LEAD' || u.role === 'SAP_CONSULTANT'
      );
      setTeam(staff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            SAP AMS Consultant Roster &amp; Skill Competencies
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            SoftClinch SAP certified consultants, module specialties (FI/CO, MM/SD, BASIS, ABAP), and availability statuses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading support team...</div>
        ) : (
          team.map(member => (
            <div key={member.id} className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-5 space-y-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#101B2D] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{member.name}</h2>
                    <div className="text-[11px] text-slate-500 font-medium">{member.designation}</div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {member.role.replace('_', ' ')}
                </span>
              </div>

              {/* Skills */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">SAP Module Expertise</span>
                <div className="flex flex-wrap gap-1.5">
                  {member.sapExpertise?.map(exp => (
                    <span key={exp} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact info */}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{member.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{member.phone || '+1 (555) 019-2000'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Experience: <strong>{member.experienceYears || 8} yrs</strong></span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Active Roster
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
