import {
  User,
  Organization,
  SAPLandscape,
  Ticket,
  TicketComment,
  TicketAttachment,
  TicketHistory,
  ChangeRequest,
  KnowledgeArticle,
  TimeEntry,
  AppNotification,
  AuditLog,
  BackupRecord,
  DashboardMetrics,
  SLAPolicy
} from '../types/index.ts';
import { mockApi } from './mockStore.ts';

// Detect if running on static preview hosting (like GitHub Pages) with no Node backend
const isStaticPreview =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('github.io') || window.location.protocol === 'file:');

// Helper to get active user ID from localStorage or fallback
export function getActiveUserId(): string {
  return localStorage.getItem('softclinch_active_user_id') || 'usr-superadmin';
}

export function setActiveUserId(id: string) {
  localStorage.setItem('softclinch_active_user_id', id);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const activeUserId = getActiveUserId();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (activeUserId) {
    headers.set('x-user-id', activeUserId);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `API request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  getCurrentUser: async () => {
    if (isStaticPreview) return mockApi.getCurrentUser(getActiveUserId());
    try {
      return await request<{ user: User }>('/auth/me');
    } catch {
      return mockApi.getCurrentUser(getActiveUserId());
    }
  },
  getUsers: async () => {
    if (isStaticPreview) return mockApi.getUsers();
    try {
      return await request<{ users: User[] }>('/auth/users');
    } catch {
      return mockApi.getUsers();
    }
  },
  login: async (email: string, password: string) => {
    if (isStaticPreview) return mockApi.login(email);
    try {
      return await request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    } catch {
      return mockApi.login(email);
    }
  },
  switchUser: async (userId: string) => {
    if (isStaticPreview) return mockApi.switchUser(userId);
    try {
      return await request<{ user: User; token: string }>('/auth/switch', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    } catch {
      return mockApi.switchUser(userId);
    }
  },
  createUser: (data: Partial<User> & { password?: string }) =>
    request<{ id: string; name: string }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Organizations
  getOrganizations: async () => {
    if (isStaticPreview) return mockApi.getOrganizations();
    try {
      return await request<{ organizations: Organization[] }>('/organizations');
    } catch {
      return mockApi.getOrganizations();
    }
  },
  getOrganization: async (id: string) => {
    if (isStaticPreview) return mockApi.getOrganization(id) as any;
    try {
      return await request<{ organization: Organization; systems: SAPLandscape[]; users: User[]; recentTickets: any[] }>(`/organizations/${id}`);
    } catch {
      return mockApi.getOrganization(id) as any;
    }
  },
  createOrganization: (data: Partial<Organization>) =>
    request<{ id: string }>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // SAP Landscapes
  getLandscapes: async (organizationId?: string) => {
    if (isStaticPreview) return mockApi.getLandscapes(organizationId);
    try {
      return await request<{ landscapes: SAPLandscape[] }>(`/landscapes${organizationId ? `?organizationId=${organizationId}` : ''}`);
    } catch {
      return mockApi.getLandscapes(organizationId);
    }
  },
  createLandscape: (data: Partial<SAPLandscape>) =>
    request<{ id: string }>('/landscapes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Tickets
  getTickets: async (params?: { status?: string; priority?: string; module?: string; organizationId?: string; assignedToMe?: boolean; search?: string }) => {
    if (isStaticPreview) return mockApi.getTickets(params, getActiveUserId());
    try {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.priority) q.set('priority', params.priority);
      if (params?.module) q.set('module', params.module);
      if (params?.organizationId) q.set('organizationId', params.organizationId);
      if (params?.assignedToMe) q.set('assignedToMe', 'true');
      if (params?.search) q.set('search', params.search);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return await request<{ tickets: Ticket[] }>(`/tickets${queryStr}`);
    } catch {
      return mockApi.getTickets(params, getActiveUserId());
    }
  },
  getTicket: async (id: string) => {
    if (isStaticPreview) return mockApi.getTicket(id);
    try {
      return await request<{
        ticket: Ticket;
        comments: TicketComment[];
        attachments: TicketAttachment[];
        history: TicketHistory[];
      }>(`/tickets/${id}`);
    } catch {
      return mockApi.getTicket(id);
    }
  },
  createTicket: async (data: Omit<Partial<Ticket>, 'attachments'> & { attachments?: any[] }) => {
    if (isStaticPreview) return mockApi.createTicket(data, getActiveUserId());
    try {
      return await request<{ id: string; subject: string; priority: string; status: string }>('/tickets', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return mockApi.createTicket(data, getActiveUserId());
    }
  },
  addComment: async (ticketId: string, content: string, isInternal: boolean) => {
    if (isStaticPreview) return mockApi.addComment(ticketId, content, isInternal, getActiveUserId());
    try {
      return await request<TicketComment>(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, isInternal })
      });
    } catch {
      return mockApi.addComment(ticketId, content, isInternal, getActiveUserId());
    }
  },
  assignTicket: async (ticketId: string, consultantId: string) => {
    if (isStaticPreview) return mockApi.assignTicket(ticketId, consultantId);
    try {
      return await request<{ success: boolean; assignedConsultantId: string; assignedConsultantName: string; status: string }>(`/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ consultantId })
      });
    } catch {
      return mockApi.assignTicket(ticketId, consultantId);
    }
  },
  updateTicketStatus: async (
    ticketId: string,
    status: string,
    resolutionSummary?: string,
    rootCause?: string,
    proposedSolution?: string,
    timeSpentMinutes?: number,
    delayReasonCategory?: string,
    delayReasonDetails?: string,
    adminReviewNotes?: string
  ) => {
    if (isStaticPreview) return mockApi.updateTicketStatus(ticketId, status, resolutionSummary);
    try {
      return await request<{ success: boolean; status: string }>(`/tickets/${ticketId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          resolutionSummary,
          rootCause,
          proposedSolution,
          timeSpentMinutes,
          delayReasonCategory,
          delayReasonDetails,
          adminReviewNotes
        })
      });
    } catch {
      return mockApi.updateTicketStatus(ticketId, status, resolutionSummary);
    }
  },
  getTicketTimeEntries: async (ticketId: string) => {
    if (isStaticPreview) return mockApi.getTicketTimeEntries(ticketId);
    try {
      return await request<{ timeEntries: any[] }>(`/tickets/${ticketId}/time-entries`);
    } catch {
      return mockApi.getTicketTimeEntries(ticketId);
    }
  },
  addTimeEntry: async (ticketId: string, data: { durationMinutes: number; workDescription: string; isBillable?: boolean; workDate?: string }) => {
    if (isStaticPreview) return mockApi.addTimeEntry(ticketId, data, getActiveUserId());
    try {
      return await request<{ success: boolean; id: string; durationMinutes: number }>(`/tickets/${ticketId}/time-entries`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch {
      return mockApi.addTimeEntry(ticketId, data, getActiveUserId());
    }
  },
  uploadAttachment: (ticketId: string, attachment: { fileName: string; fileSize: number; fileType: string; dataUrl?: string }) =>
    request<TicketAttachment>(`/tickets/${ticketId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(attachment)
    }),

  // Change Requests
  getChangeRequests: () => request<{ changeRequests: ChangeRequest[] }>('/change-requests'),
  createChangeRequest: (data: Partial<ChangeRequest>) =>
    request<{ id: string }>('/change-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  executeCRAction: (id: string, action: 'approve' | 'reject' | 'advance', notes?: string) =>
    request<{ success: boolean }>(`/change-requests/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    }),

  // Knowledge Base
  getKBArticles: async (params?: { module?: string; search?: string }) => {
    if (isStaticPreview) return mockApi.getKBArticles();
    try {
      const q = new URLSearchParams();
      if (params?.module) q.set('module', params.module);
      if (params?.search) q.set('search', params.search);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return await request<{ articles: KnowledgeArticle[] }>(`/kb${queryStr}`);
    } catch {
      return mockApi.getKBArticles();
    }
  },
  createKBArticle: (data: Partial<KnowledgeArticle>) =>
    request<{ id: string; title: string }>('/kb', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Time Tracking
  getTimeEntries: async () => {
    if (isStaticPreview) return mockApi.getTimeEntries();
    try {
      return await request<{ entries: TimeEntry[] }>('/time-entries');
    } catch {
      return mockApi.getTimeEntries();
    }
  },
  createTimeEntry: (data: Partial<TimeEntry>) =>
    request<{ id: string; durationMinutes: number }>('/time-entries', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Reports & Dashboard
  getDashboardMetrics: async () => {
    if (isStaticPreview) return mockApi.getDashboardMetrics();
    try {
      return await request<{ metrics: DashboardMetrics }>('/reports/dashboard');
    } catch {
      return mockApi.getDashboardMetrics();
    }
  },

  // Notifications
  getNotifications: async () => {
    if (isStaticPreview) return mockApi.getNotifications();
    try {
      return await request<{ notifications: AppNotification[]; unreadCount: number }>('/notifications');
    } catch {
      return mockApi.getNotifications();
    }
  },
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/notifications/mark-all-read', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: async () => {
    if (isStaticPreview) return mockApi.getAuditLogs();
    try {
      return await request<{ logs: AuditLog[] }>('/audit-logs');
    } catch {
      return mockApi.getAuditLogs();
    }
  },

  // Database Management & Storage
  getDatabaseStatus: async () => {
    if (isStaticPreview) return mockApi.getDatabaseStatus() as any;
    try {
      return await request<{
        dbFilePath: string;
        dbStatus: string;
        dbSizeBytes: number;
        totalTickets: number;
        totalOrgs: number;
        totalUsers: number;
        storageSizeBytes: number;
        lastBackup: string | null;
        backups: BackupRecord[];
      }>('/database/status');
    } catch {
      return mockApi.getDatabaseStatus() as any;
    }
  },
  checkIntegrity: () => request<{ ok: boolean; result: any[] }>('/database/integrity-check', { method: 'POST' }),
  createBackup: () => request<{ success: boolean; backup: any }>('/database/backup', { method: 'POST' }),

  // Google Sheets Live Sync
  getGoogleSheetConfig: async () => {
    if (isStaticPreview) return mockApi.getGoogleSheetConfig();
    try {
      return await request<{ webhookUrl: string; enabled: boolean; lastSync: string | null }>('/integrations/google-sheets');
    } catch {
      return mockApi.getGoogleSheetConfig();
    }
  },
  saveGoogleSheetConfig: (webhookUrl: string) => request<{ webhookUrl: string; enabled: boolean; lastSync: string | null }>('/integrations/google-sheets/config', {
    method: 'POST',
    body: JSON.stringify({ webhookUrl })
  }),
  syncAllGoogleSheets: () => request<{ success: boolean; message: string }>('/integrations/google-sheets/sync-all', {
    method: 'POST'
  }),
  getGoogleSheetsScript: () => request<{ script: string }>('/integrations/google-sheets/script')
};
