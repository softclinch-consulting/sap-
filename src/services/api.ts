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
  getCurrentUser: () => request<{ user: User }>('/auth/me'),
  getUsers: () => request<{ users: User[] }>('/auth/users'),
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  switchUser: (userId: string) =>
    request<{ user: User; token: string }>('/auth/switch', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
  createUser: (data: Partial<User> & { password?: string }) =>
    request<{ id: string; name: string }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Organizations
  getOrganizations: () => request<{ organizations: Organization[] }>('/organizations'),
  getOrganization: (id: string) =>
    request<{ organization: Organization; systems: SAPLandscape[]; users: User[]; recentTickets: any[] }>(`/organizations/${id}`),
  createOrganization: (data: Partial<Organization>) =>
    request<{ id: string }>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // SAP Landscapes
  getLandscapes: (organizationId?: string) =>
    request<{ landscapes: SAPLandscape[] }>(`/landscapes${organizationId ? `?organizationId=${organizationId}` : ''}`),
  createLandscape: (data: Partial<SAPLandscape>) =>
    request<{ id: string }>('/landscapes', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Tickets
  getTickets: (params?: { status?: string; priority?: string; module?: string; organizationId?: string; assignedToMe?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.module) q.set('module', params.module);
    if (params?.organizationId) q.set('organizationId', params.organizationId);
    if (params?.assignedToMe) q.set('assignedToMe', 'true');
    if (params?.search) q.set('search', params.search);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request<{ tickets: Ticket[] }>(`/tickets${queryStr}`);
  },
  getTicket: (id: string) =>
    request<{
      ticket: Ticket;
      comments: TicketComment[];
      attachments: TicketAttachment[];
      history: TicketHistory[];
    }>(`/tickets/${id}`),
  createTicket: (data: Omit<Partial<Ticket>, 'attachments'> & { attachments?: any[] }) =>
    request<{ id: string; subject: string; priority: string; status: string }>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  addComment: (ticketId: string, content: string, isInternal: boolean) =>
    request<TicketComment>(`/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, isInternal })
    }),
  assignTicket: (ticketId: string, consultantId: string) =>
    request<{ success: boolean; assignedConsultantId: string; assignedConsultantName: string; status: string }>(`/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ consultantId })
    }),
  updateTicketStatus: (
    ticketId: string,
    status: string,
    resolutionSummary?: string,
    rootCause?: string,
    proposedSolution?: string,
    timeSpentMinutes?: number,
    delayReasonCategory?: string,
    delayReasonDetails?: string,
    adminReviewNotes?: string
  ) =>
    request<{ success: boolean; status: string }>(`/tickets/${ticketId}/status`, {
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
    }),
  getTicketTimeEntries: (ticketId: string) =>
    request<{ timeEntries: any[] }>(`/tickets/${ticketId}/time-entries`),
  addTimeEntry: (ticketId: string, data: { durationMinutes: number; workDescription: string; isBillable?: boolean; workDate?: string }) =>
    request<{ success: boolean; id: string; durationMinutes: number }>(`/tickets/${ticketId}/time-entries`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
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
  getKBArticles: (params?: { module?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.module) q.set('module', params.module);
    if (params?.search) q.set('search', params.search);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request<{ articles: KnowledgeArticle[] }>(`/kb${queryStr}`);
  },
  createKBArticle: (data: Partial<KnowledgeArticle>) =>
    request<{ id: string; title: string }>('/kb', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Time Tracking
  getTimeEntries: (params?: { consultantId?: string; ticketId?: string }) => {
    const q = new URLSearchParams();
    if (params?.consultantId) q.set('consultantId', params.consultantId);
    if (params?.ticketId) q.set('ticketId', params.ticketId);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return request<{ entries: TimeEntry[] }>(`/time-entries${queryStr}`);
  },
  createTimeEntry: (data: Partial<TimeEntry>) =>
    request<{ id: string; durationMinutes: number }>('/time-entries', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Reports & Dashboard
  getDashboardMetrics: () => request<{ metrics: DashboardMetrics }>('/reports/dashboard'),

  // Notifications
  getNotifications: () => request<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/notifications/mark-all-read', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request<{ logs: AuditLog[] }>('/audit-logs'),

  // Database Management & Storage
  getDatabaseStatus: () =>
    request<{
      dbFilePath: string;
      dbStatus: string;
      dbSizeBytes: number;
      totalTickets: number;
      totalOrgs: number;
      totalUsers: number;
      storageSizeBytes: number;
      lastBackup: string | null;
      backups: BackupRecord[];
    }>('/database/status'),
  checkIntegrity: () => request<{ ok: boolean; result: any[] }>('/database/integrity-check', { method: 'POST' }),
  createBackup: () => request<{ success: boolean; backup: any }>('/database/backup', { method: 'POST' }),

  // Google Sheets Live Sync
  getGoogleSheetConfig: () => request<{ webhookUrl: string; enabled: boolean; lastSync: string | null }>('/integrations/google-sheets'),
  saveGoogleSheetConfig: (webhookUrl: string) => request<{ webhookUrl: string; enabled: boolean; lastSync: string | null }>('/integrations/google-sheets/config', {
    method: 'POST',
    body: JSON.stringify({ webhookUrl })
  }),
  syncAllGoogleSheets: () => request<{ success: boolean; message: string }>('/integrations/google-sheets/sync-all', {
    method: 'POST'
  }),
  getGoogleSheetsScript: () => request<{ script: string }>('/integrations/google-sheets/script')
};
