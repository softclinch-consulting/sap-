import React, { useState, useEffect } from 'react';
import { User, BackupRecord } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  Database,
  HardDrive,
  ShieldCheck,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Server,
  Layers,
  FolderArchive
} from 'lucide-react';

interface DatabaseManagementViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const DatabaseManagementView: React.FC<DatabaseManagementViewProps> = ({ currentUser, onNavigate }) => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [integrityResult, setIntegrityResult] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, [currentUser]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getDatabaseStatus();
      setStatus(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrityCheck = async () => {
    try {
      setIntegrityResult('Running PRAGMA integrity_check on SQLite storage...');
      const res = await api.checkIntegrity();
      if (res.ok) {
        setIntegrityResult('PASSED: PRAGMA integrity_check returned "ok". Database pages and B-trees intact.');
      } else {
        setIntegrityResult('FAILED: Corruption detected or check error.');
      }
    } catch (err: any) {
      setIntegrityResult('Error executing integrity check: ' + err.message);
    }
  };

  const handleBackupNow = async () => {
    try {
      setIsBackingUp(true);
      setMessage(null);
      const res = await api.createBackup();
      if (res.success) {
        setMessage(`Successfully created atomic SQLite backup: ${res.backup.filename}`);
        await loadStatus();
      }
    } catch (err: any) {
      setMessage('Backup failed: ' + err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  if (loading || !status) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading SQLite database metadata...</div>;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Local-First Database &amp; Atomic Backup Management
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Verified local SQLite storage persistence, PRAGMA integrity audit, and snapshot archive retention.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/database/export"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium border border-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON Dump
          </a>

          <button
            onClick={handleBackupNow}
            disabled={isBackingUp}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            {isBackingUp ? 'Creating Atomic Snapshot...' : 'Backup Database Now'}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Database Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Database File Size</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatBytes(status.dbSizeBytes)}</div>
          <span className="text-[10px] font-mono text-slate-400 truncate block mt-0.5">{status.dbFilePath}</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Engine Status</span>
          <div className="text-xl font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {status.dbStatus}
          </div>
          <span className="text-[10px] text-slate-400">Zero cloud latency</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Persistent Records</span>
          <div className="text-xl font-bold text-blue-700 mt-1">
            {status.totalTickets} Tickets • {status.totalOrgs} Orgs
          </div>
          <span className="text-[10px] text-slate-400">{status.totalUsers} registered users</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E5EAF0] shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Attachment Storage</span>
          <div className="text-xl font-bold text-slate-800 mt-1">{formatBytes(status.storageSizeBytes)}</div>
          <span className="text-[10px] font-mono text-slate-400">./storage/attachments</span>
        </div>
      </div>

      {/* Integrity Check Panel */}
      <div className="bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              SQLite Database Integrity Verification
            </h2>
            <p className="text-[11px] text-slate-500">
              Validates database structural integrity, B-Tree leaf consistency, and index coherence.
            </p>
          </div>

          <button
            onClick={handleIntegrityCheck}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold border border-slate-300 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Run PRAGMA integrity_check
          </button>
        </div>

        {integrityResult && (
          <div className={`p-3 rounded text-xs font-mono ${
            integrityResult.startsWith('PASSED')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {integrityResult}
          </div>
        )}
      </div>

      {/* Backup History Table */}
      <div className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Verified Atomic Backups ({status.backups?.length || 0})
          </h2>
          <span className="text-[11px] text-slate-500">
            Stored in: <code className="text-slate-700 font-mono">./backups/</code>
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-[#E5EAF0] text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Backup Filename</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Snapshot Metrics</th>
                <th className="py-2.5 px-3">Integrity</th>
                <th className="py-2.5 px-3 text-right">Created Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {status.backups?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No backups generated yet. Click "Backup Database Now" above to create your first verified snapshot.
                  </td>
                </tr>
              ) : (
                status.backups?.map((b: BackupRecord) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {b.filename}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {formatBytes(b.sizeBytes)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {b.totalTickets} Tickets • {b.totalOrgs} Orgs • {b.totalUsers} Users
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {b.integrityStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {new Date(b.createdAt).toLocaleString()}
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
