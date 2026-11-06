import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Shield,
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  ChevronDown,
  RefreshCw,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { User, AppNotification } from '../types/index.ts';
import { api, setActiveUserId } from '../services/api.ts';

interface HeaderProps {
  currentUser: User | null;
  onUserChanged: (user: User) => void;
  onNavigate: (view: string, param?: string) => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChanged,
  onNavigate,
  activeView
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setActiveUserId(res.user.id);
      onUserChanged(res.user);
      setShowUserDropdown(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('tickets', searchQuery.trim());
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded font-medium">Super Admin</span>;
      case 'AMS_MANAGER':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5 rounded font-medium">AMS Manager</span>;
      case 'SUPPORT_LEAD':
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 rounded font-medium">Support Lead</span>;
      case 'SAP_CONSULTANT':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded font-medium">SAP Consultant</span>;
      case 'CLIENT_ADMIN':
        return <span className="bg-teal-50 text-teal-700 border border-teal-200 text-xs px-2 py-0.5 rounded font-medium">Client Admin</span>;
      case 'CLIENT_EMPLOYEE':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5 rounded font-medium">Client User</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">{role}</span>;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5EAF0] px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Search Bar & Breadcrumbs */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tickets by ID (SAP-2026-...), T-Code, or subject..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded-md text-sm text-[#172033] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
          />
        </form>

        {/* Tenant badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-700">
            {currentUser?.organizationName || 'SoftClinch AMS Global'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Local System Status indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">SQLite WAL: Online</span>
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5EAF0] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Operational Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-[#2563EB] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No recent notifications</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.link) {
                          const ticketId = n.link.replace('/tickets/', '');
                          onNavigate('ticket-detail', ticketId);
                          setShowNotifDropdown(false);
                        }
                      }}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {n.severity === 'critical' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Switcher / Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-slate-100 border border-transparent hover:border-[#E5EAF0] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#101B2D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
                {currentUser?.name}
              </div>
              <div className="text-[10px] text-slate-500">{currentUser?.designation || currentUser?.role}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5EAF0] rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900">{currentUser?.name}</div>
                <div className="text-xs text-slate-500">{currentUser?.email}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  {currentUser && getRoleBadge(currentUser.role)}
                  <span className="text-[11px] text-slate-400">{currentUser?.organizationName || 'SoftClinch Internal'}</span>
                </div>
              </div>

              {/* Quick Role Switcher section for demo & multi-tenant testing */}
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Switch Role / User</span>
                  <span className="text-[9px] text-[#2563EB] bg-blue-50 px-1.5 py-0.5 rounded">Demo Selector</span>
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSwitchUser(u.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                        u.id === currentUser?.id
                          ? 'bg-[#2563EB] text-white font-medium'
                          : 'hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium truncate">{u.name}</div>
                        <div className={`text-[10px] truncate ${u.id === currentUser?.id ? 'text-blue-100' : 'text-slate-400'}`}>
                          {u.designation || u.role} {u.organizationName ? `(${u.organizationName})` : ''}
                        </div>
                      </div>
                      {u.id === currentUser?.id && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-1">
                <button
                  onClick={() => {
                    onNavigate('database-management');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  Database &amp; Backup Center
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
