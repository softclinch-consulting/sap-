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
  DashboardMetrics,
  SLAPolicy
} from '../types/index.ts';

const INITIAL_USERS: User[] = [
  {
    id: 'usr-superadmin',
    name: 'Muthu',
    email: 'muthu.admin@softclinch.com',
    role: 'SUPER_ADMIN',
    organizationName: 'SoftClinch Global',
    designation: 'Director of SAP AMS Operations (Super Admin)',
    sapExpertise: ['SAP S/4HANA', 'SAP BASIS', 'SAP FI', 'SAP MM', 'SAP Architecture'],
    experienceYears: 18,
    phone: '+1 (555) 010-0001',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-manager',
    name: 'Krishnan',
    email: 'krishnan.ams@softclinch.com',
    role: 'AMS_MANAGER',
    organizationName: 'SoftClinch Global',
    designation: 'Senior AMS Engagement Manager',
    sapExpertise: ['SAP S/4HANA', 'SAP SD', 'SAP MM', 'ITIL V4', 'SLA Governance'],
    experienceYears: 12,
    phone: '+1 (555) 010-0002',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-lead',
    name: 'Venkat',
    email: 'venkat.lead@softclinch.com',
    role: 'SUPPORT_LEAD',
    organizationName: 'SoftClinch Global',
    designation: 'SAP Technical Support Lead',
    sapExpertise: ['SAP BASIS', 'SAP ABAP', 'SAP Integration Suite', 'Performance Tuning'],
    experienceYears: 10,
    phone: '+1 (555) 010-0003',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-anand',
    name: 'Anand',
    email: 'anand.consultant@softclinch.com',
    role: 'SAP_CONSULTANT',
    organizationName: 'SoftClinch Global',
    designation: 'Principal SAP Solutions Architect',
    sapExpertise: ['SAP BASIS', 'SAP HANA', 'SAP ABAP', 'System Security', 'Solution Manager'],
    experienceYears: 14,
    phone: '+1 (555) 010-0006',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-mahendran2',
    name: 'Mahendran 2',
    email: 'mahendran2.consultant@softclinch.com',
    role: 'SAP_CONSULTANT',
    organizationName: 'SoftClinch Global',
    designation: 'Senior SAP FI/CO & MM Consultant',
    sapExpertise: ['SAP FI', 'SAP CO', 'SAP MM', 'New GL', 'Asset Accounting', 'Inventory'],
    experienceYears: 9,
    phone: '+1 (555) 010-0004',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-client-acme-admin',
    name: 'Pradeep',
    email: 'pradeep.admin@acmeind.com',
    role: 'CLIENT_ADMIN',
    organizationId: 'org-acme',
    organizationName: 'Acme Industrial Corp',
    designation: 'IT Director & SAP Product Owner',
    sapExpertise: ['Client IT', 'ERP Operations'],
    experienceYears: 15,
    phone: '+1 (312) 555-0142',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-client-acme-user',
    name: 'Ashwin',
    email: 'ashwin@acmeind.com',
    role: 'CLIENT_EMPLOYEE',
    organizationId: 'org-acme',
    organizationName: 'Acme Industrial Corp',
    designation: 'Procurement & Operations Lead',
    sapExpertise: ['Procurement', 'Material Requirements'],
    experienceYears: 6,
    phone: '+1 (312) 555-0143',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-client-grl-admin',
    name: 'Madan',
    email: 'madan.admin@globalretail.com',
    role: 'CLIENT_ADMIN',
    organizationId: 'org-grl',
    organizationName: 'Global Retail Logistics',
    designation: 'Head of Enterprise Systems',
    sapExpertise: ['Retail Systems', 'Logistics'],
    experienceYears: 11,
    phone: '+1 (562) 555-0199',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr-client-grl-user',
    name: 'Mahendran',
    email: 'mahendran@globalretail.com',
    role: 'CLIENT_EMPLOYEE',
    organizationId: 'org-grl',
    organizationName: 'Global Retail Logistics',
    designation: 'Logistics & Warehouse Operations Lead',
    sapExpertise: ['Logistics', 'Warehouse Operations'],
    experienceYears: 7,
    phone: '+1 (562) 555-0210',
    active: true,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_ORGS: Organization[] = [
  {
    id: 'org-acme',
    name: 'Acme Industrial Corp',
    code: 'ACME',
    industry: 'Heavy Machinery & Industrial Equipment',
    address: '100 Enterprise Way, Suite 400, Chicago, IL',
    primaryContact: 'Pradeep',
    contactEmail: 'pradeep.admin@acmeind.com',
    contactNumber: '+1 (312) 555-0142',
    contractStartDate: '2025-01-01',
    contractEndDate: '2027-12-31',
    supportPlan: 'Enterprise Platinum',
    supportHours: '24/7 Premium Support (15m P1 SLA)',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'org-grl',
    name: 'Global Retail Logistics',
    code: 'GRL',
    industry: 'Retail, Warehousing & Supply Chain',
    address: '850 Harbor Blvd, Long Beach, CA',
    primaryContact: 'Madan',
    contactEmail: 'madan.admin@globalretail.com',
    contactNumber: '+1 (562) 555-0199',
    contractStartDate: '2024-06-01',
    contractEndDate: '2026-12-31',
    supportPlan: 'Standard Gold',
    supportHours: '16/5 Business Support (30m P1 SLA)',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'org-pharma',
    name: 'PharmaCare Solutions',
    code: 'PHARMA',
    industry: 'Pharmaceuticals & Medical Devices',
    address: '45 BioTech Parkway, Cambridge, MA',
    primaryContact: 'Dr. Elena Rostova',
    contactEmail: 'elena.rostova@pharmacare.com',
    contactNumber: '+1 (617) 555-0187',
    contractStartDate: '2025-03-01',
    contractEndDate: '2028-02-28',
    supportPlan: 'Enterprise Platinum',
    supportHours: '24/7 GxP Validated Support',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_LANDSCAPES: SAPLandscape[] = [
  { id: 'ls-acme-p01', organizationId: 'org-acme', organizationName: 'Acme Industrial Corp', systemName: 'Acme S/4HANA Production', sid: 'P01', sapProduct: 'SAP S/4HANA Enterprise', sapVersion: '2023 FPS01', environment: 'Production', databaseType: 'SAP HANA 2.0 SPS07', hostingType: 'AWS (us-east-1)', businessOwner: 'Pradeep', technicalContact: 'Anand', goLiveDate: '2023-04-15', systemStatus: 'ONLINE', createdAt: new Date().toISOString() },
  { id: 'ls-acme-q01', organizationId: 'org-acme', organizationName: 'Acme Industrial Corp', systemName: 'Acme S/4HANA Quality Assurance', sid: 'Q01', sapProduct: 'SAP S/4HANA Enterprise', sapVersion: '2023 FPS01', environment: 'Quality Assurance', databaseType: 'SAP HANA 2.0 SPS07', hostingType: 'AWS (us-east-1)', businessOwner: 'Pradeep', technicalContact: 'Anand', goLiveDate: '2023-02-10', systemStatus: 'ONLINE', createdAt: new Date().toISOString() },
  { id: 'ls-acme-d01', organizationId: 'org-acme', organizationName: 'Acme Industrial Corp', systemName: 'Acme S/4HANA Development', sid: 'D01', sapProduct: 'SAP S/4HANA Enterprise', sapVersion: '2023 FPS01', environment: 'Development', databaseType: 'SAP HANA 2.0 SPS07', hostingType: 'AWS (us-east-1)', businessOwner: 'Pradeep', technicalContact: 'Anand', goLiveDate: '2022-11-01', systemStatus: 'ONLINE', createdAt: new Date().toISOString() },
  { id: 'ls-grl-erp', organizationId: 'org-grl', organizationName: 'Global Retail Logistics', systemName: 'GRL Core ERP Production', sid: 'ERP', sapProduct: 'SAP ECC 6.0 EHP8', sapVersion: 'EHP8 for SAP ERP 6.0', environment: 'Production', databaseType: 'Oracle 19c Enterprise', hostingType: 'Microsoft Azure', businessOwner: 'Madan', technicalContact: 'Anand', goLiveDate: '2021-09-01', systemStatus: 'ONLINE', createdAt: new Date().toISOString() },
  { id: 'ls-grl-bwp', organizationId: 'org-grl', organizationName: 'Global Retail Logistics', systemName: 'GRL Enterprise Analytics BW', sid: 'BWP', sapProduct: 'SAP BW/4HANA 2021', sapVersion: 'BW/4HANA 2.0 SP09', environment: 'Production', databaseType: 'SAP HANA 2.0', hostingType: 'Microsoft Azure', businessOwner: 'Madan', technicalContact: 'Anand', goLiveDate: '2022-03-20', systemStatus: 'ONLINE', createdAt: new Date().toISOString() },
  { id: 'ls-pha-pha', organizationId: 'org-pharma', organizationName: 'PharmaCare Solutions', systemName: 'PharmaCare Validated PRD', sid: 'PHA', sapProduct: 'SAP S/4HANA Life Sciences', sapVersion: '2022 FPS02', environment: 'Production', databaseType: 'SAP HANA 2.0', hostingType: 'On-Premise Private Cloud', businessOwner: 'Dr. Elena Rostova', technicalContact: 'Anand', goLiveDate: '2023-11-15', systemStatus: 'ONLINE', createdAt: new Date().toISOString() }
];

const INITIAL_SLA: SLAPolicy[] = [
  { id: 'sla-p1', name: 'P1 - Critical Business Disruption', priority: 'P1', responseTimeMinutes: 15, resolutionTimeMinutes: 240, businessHoursOnly: false, description: 'Production halt, core business transaction failure, severe impact' },
  { id: 'sla-p2', name: 'P2 - High Priority Impact', priority: 'P2', responseTimeMinutes: 30, resolutionTimeMinutes: 480, businessHoursOnly: false, description: 'Significant business impact, core process degraded with no easy workaround' },
  { id: 'sla-p3', name: 'P3 - Medium Priority Operational', priority: 'P3', responseTimeMinutes: 240, resolutionTimeMinutes: 2880, businessHoursOnly: true, description: 'Standard operational issue, single user or low impact with workaround' },
  { id: 'sla-p4', name: 'P4 - Low Priority / Request', priority: 'P4', responseTimeMinutes: 1440, resolutionTimeMinutes: 7200, businessHoursOnly: true, description: 'Minor inquiry, cosmetic issue, general support or configuration query' }
];

const INITIAL_KB: KnowledgeArticle[] = [
  {
    id: 'kb-101',
    title: 'Resolving ABAP Dump TSV_TNEW_PAGE_ALLOC_FAILED in SAP ECC and S/4HANA',
    category: 'SAP BASIS Administration',
    sapModule: 'SAP BASIS',
    summary: 'Comprehensive guide on diagnosing roll memory exhaustion, tuning extended memory parameters, and optimizing heavy internal tables.',
    content: 'ABAP runtime error TSV_TNEW_PAGE_ALLOC_FAILED occurs when an internal table requests additional storage from the operating system or SAP roll buffer, but no virtual memory is available within the session quote.',
    troubleshootingSteps: '1. Open transaction ST22 and locate the dump.\n2. Review section "Information on where terminated" to pinpoint the exact line in ABAP code.\n3. Check transaction ST02 (Tune Summary) -> Extended Memory & Roll Area usage.\n4. If occurring in custom code (Z* program), inspect for SELECT * without WHERE clause or missing FREE/CLEAR on large internal tables.\n5. If standard transaction, check SAP Note 146289 for kernel memory limits.',
    tags: ['ST22', 'MEMORY_LEAK', 'ST02', 'BASIS', 'HANA'],
    isInternalOnly: true,
    linkedTicketCount: 3,
    authorId: 'usr-anand',
    authorName: 'Anand',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kb-102',
    title: 'SAP FI: Fixing Foreign Currency Document Balance Discrepancies (F5 022)',
    category: 'SAP FI Troubleshooting',
    sapModule: 'SAP FI',
    summary: 'Step-by-step resolution for document balance not zero errors during multi-currency postings and ledger group adjustments.',
    content: 'Error F5 022 happens when sum of debits does not equal credits in transaction currency, local currency, or group currency.',
    troubleshootingSteps: '1. Verify currency configuration in T-code OB22 / FINSC_LEDGER.\n2. In T-code OB08, verify valid quotation rates for the document posting date.\n3. Check account determination for exchange rate differences in T-code OBA1 (transaction KDF).\n4. In case of clearing transactions (F-03 / F-32), ensure residual items carry matching tolerance keys.',
    tags: ['FB01', 'F5 022', 'FINANCIALS', 'CURRENCY', 'OB08'],
    isInternalOnly: false,
    linkedTicketCount: 5,
    authorId: 'usr-mahendran2',
    authorName: 'Mahendran 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'kb-103',
    title: 'Fiori Launchpad Gateway Cache Clearing & Service Registration Checklist',
    category: 'SAP Fiori & UX Support',
    sapModule: 'SAP Fiori',
    summary: 'Standard procedure for resolving blank Fiori tiles, metadata cache mismatches, and OData 403/500 errors after system upgrades.',
    content: 'Following kernel patches or UI5 library upgrades, browser clients and SAP Web Dispatcher may retain stale UI2 catalog cache.',
    troubleshootingSteps: '1. Execute T-code /IWFND/CACHE_CLEANUP on Front-End Server.\n2. Execute T-code /UI2/INVAL_CACHES.\n3. Run transaction /UI2/DELETE_CACHE with scope ALL.\n4. Verify OData service status in /IWFND/MAINT_SERVICE.\n5. Test service gateway in /IWFND/GW_CLIENT.',
    tags: ['FIORI', 'GATEWAY', 'ODATA', 'CACHE', 'UI2'],
    isInternalOnly: false,
    linkedTicketCount: 2,
    authorId: 'usr-anand',
    authorName: 'Anand',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

class MockStorage {
  private get<T>(key: string, defaultVal: T): T {
    try {
      const val = localStorage.getItem(`softclinch_mock_${key}`);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private set<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`softclinch_mock_${key}`, JSON.stringify(val));
    } catch (_) {}
  }

  get users(): User[] {
    return this.get('users', INITIAL_USERS);
  }

  set users(val: User[]) {
    this.set('users', val);
  }

  get organizations(): Organization[] {
    return this.get('orgs', INITIAL_ORGS);
  }

  get landscapes(): SAPLandscape[] {
    return this.get('landscapes', INITIAL_LANDSCAPES);
  }

  get tickets(): Ticket[] {
    return this.get('tickets', []);
  }

  set tickets(val: Ticket[]) {
    this.set('tickets', val);
  }

  get comments(): TicketComment[] {
    return this.get('comments', []);
  }

  set comments(val: TicketComment[]) {
    this.set('comments', val);
  }

  get attachments(): TicketAttachment[] {
    return this.get('attachments', []);
  }

  set attachments(val: TicketAttachment[]) {
    this.set('attachments', val);
  }

  get history(): TicketHistory[] {
    return this.get('history', []);
  }

  set history(val: TicketHistory[]) {
    this.set('history', val);
  }

  get timeEntries(): TimeEntry[] {
    return this.get('time_entries', []);
  }

  set timeEntries(val: TimeEntry[]) {
    this.set('time_entries', val);
  }

  get changeRequests(): ChangeRequest[] {
    return this.get('change_requests', []);
  }

  get kb(): KnowledgeArticle[] {
    return this.get('kb', INITIAL_KB);
  }

  get notifications(): AppNotification[] {
    return this.get('notifications', []);
  }

  get auditLogs(): AuditLog[] {
    return this.get('audit_logs', [
      {
        id: 'audit-init',
        userId: 'usr-superadmin',
        userName: 'Muthu',
        userRole: 'SUPER_ADMIN',
        action: 'SYSTEM_INITIALIZATION',
        module: 'SYSTEM',
        targetId: 'SYSTEM',
        details: 'SoftClinch SAP Support Desk initialized on GitHub Pages Static Preview',
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString()
      }
    ]);
  }
}

export const mockStorage = new MockStorage();

export const mockApi = {
  getCurrentUser: (activeId: string) => {
    const user = mockStorage.users.find(u => u.id === activeId) || mockStorage.users[0];
    return { user };
  },

  getUsers: () => ({ users: mockStorage.users }),

  login: (email: string) => {
    const user = mockStorage.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('User not found. Try muthu.admin@softclinch.com or pradeep.admin@acmeind.com');
    }
    return { user, token: 'demo-token-' + user.id };
  },

  switchUser: (userId: string) => {
    const user = mockStorage.users.find(u => u.id === userId) || mockStorage.users[0];
    return { user, token: 'demo-token-' + user.id };
  },

  getOrganizations: () => ({ organizations: mockStorage.organizations }),

  getOrganization: (id: string) => {
    const org = mockStorage.organizations.find(o => o.id === id) || mockStorage.organizations[0];
    const systems = mockStorage.landscapes.filter(l => l.organizationId === id);
    const users = mockStorage.users.filter(u => u.organizationId === id);
    const recentTickets = mockStorage.tickets.filter(t => t.organizationId === id);
    return { organization: org, systems, users, recentTickets };
  },

  getLandscapes: (organizationId?: string) => {
    const list = organizationId
      ? mockStorage.landscapes.filter(l => l.organizationId === organizationId)
      : mockStorage.landscapes;
    return { landscapes: list };
  },

  getTickets: (params?: any, currentUserId?: string) => {
    const user = mockStorage.users.find(u => u.id === currentUserId) || mockStorage.users[0];
    let list = [...mockStorage.tickets];

    if (user.role === 'CLIENT_ADMIN' || user.role === 'CLIENT_EMPLOYEE') {
      list = list.filter(t => t.organizationId === user.organizationId);
    }
    if (params?.status) list = list.filter(t => t.status === params.status);
    if (params?.priority) list = list.filter(t => t.priority === params.priority);
    if (params?.module) list = list.filter(t => t.sapModule === params.module);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(t => t.subject.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    return { tickets: list };
  },

  getTicket: (id: string) => {
    const ticket = mockStorage.tickets.find(t => t.id === id);
    if (!ticket) throw new Error('Ticket not found');
    const comments = mockStorage.comments.filter(c => c.ticketId === id);
    const attachments = mockStorage.attachments.filter(a => a.ticketId === id);
    const history = mockStorage.history.filter(h => h.ticketId === id);
    return { ticket, comments, attachments, history };
  },

  createTicket: (data: any, currentUserId?: string) => {
    const user = mockStorage.users.find(u => u.id === currentUserId) || mockStorage.users[0];
    const seq = mockStorage.tickets.length + 1;
    const year = new Date().getFullYear();
    const id = `SAP-${year}-${String(seq).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      id,
      seqNumber: seq,
      organizationId: data.organizationId || user.organizationId || 'org-acme',
      organizationName: data.organizationName || user.organizationName || 'Acme Industrial Corp',
      clientContactId: user.id,
      clientContactName: user.name,
      clientContactEmail: user.email,
      subject: data.subject,
      description: data.description,
      sapModule: data.sapModule,
      sapSystemSid: data.sapSystemSid || 'P01',
      environment: data.environment || 'Production',
      transactionCode: data.transactionCode,
      issueCategory: data.issueCategory || 'Standard',
      businessImpact: data.businessImpact || 'Medium',
      priority: data.priority || 'P3',
      status: 'New',
      createdDate: now,
      responseDeadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      resolutionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      isResponseBreached: false,
      isResolutionBreached: false,
      isAtRisk: false,
      timeSpentMinutes: 0,
      createdAt: now,
      updatedAt: now
    };

    mockStorage.tickets = [newTicket, ...mockStorage.tickets];

    const hist: TicketHistory = {
      id: 'hist-' + Math.random().toString(36).substring(2, 9),
      ticketId: id,
      action: 'Ticket Created',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      details: `Ticket created with priority ${newTicket.priority}`,
      timestamp: now
    };
    mockStorage.history = [hist, ...mockStorage.history];

    return { id, subject: newTicket.subject, priority: newTicket.priority, status: newTicket.status };
  },

  addComment: (ticketId: string, content: string, isInternal: boolean, currentUserId?: string) => {
    const user = mockStorage.users.find(u => u.id === currentUserId) || mockStorage.users[0];
    const now = new Date().toISOString();
    const comment: TicketComment = {
      id: 'comm-' + Math.random().toString(36).substring(2, 9),
      ticketId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      content,
      isInternal,
      createdAt: now
    };
    mockStorage.comments = [...mockStorage.comments, comment];
    return comment;
  },

  assignTicket: (ticketId: string, consultantId: string) => {
    const consultant = mockStorage.users.find(u => u.id === consultantId);
    const tickets = mockStorage.tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          assignedConsultantId: consultantId,
          assignedConsultantName: consultant?.name,
          status: 'In Progress' as const
        };
      }
      return t;
    });
    mockStorage.tickets = tickets;
    return {
      success: true,
      assignedConsultantId: consultantId,
      assignedConsultantName: consultant?.name || 'Assigned',
      status: 'In Progress'
    };
  },

  updateTicketStatus: (ticketId: string, status: any, resolutionSummary?: string) => {
    const tickets = mockStorage.tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status,
          resolutionSummary: resolutionSummary || t.resolutionSummary
        };
      }
      return t;
    });
    mockStorage.tickets = tickets;
    return { success: true, status };
  },

  getTicketTimeEntries: (ticketId: string) => {
    return { timeEntries: mockStorage.timeEntries.filter(t => t.ticketId === ticketId) };
  },

  getTimeEntries: () => {
    return { entries: mockStorage.timeEntries };
  },

  addTimeEntry: (ticketId: string, data: any, currentUserId?: string) => {
    const user = mockStorage.users.find(u => u.id === currentUserId) || mockStorage.users[0];
    const id = 'te-' + Math.random().toString(36).substring(2, 9);
    const entry: TimeEntry = {
      id,
      ticketId,
      ticketSubject: data.workDescription,
      consultantId: user.id,
      consultantName: user.name,
      workDate: data.workDate || new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: data.durationMinutes || 60,
      workDescription: data.workDescription,
      isBillable: data.isBillable !== false,
      approvalStatus: 'Pending',
      createdAt: new Date().toISOString()
    };
    mockStorage.timeEntries = [entry, ...mockStorage.timeEntries];
    return { success: true, id, durationMinutes: entry.durationMinutes };
  },

  getKBArticles: () => ({ articles: mockStorage.kb }),

  getDashboardMetrics: (): { metrics: DashboardMetrics } => {
    const tickets = mockStorage.tickets;
    return {
      metrics: {
        totalTickets: tickets.length,
        newTickets: tickets.filter(t => t.status === 'New').length,
        openTickets: tickets.filter(t => t.status === 'Assigned' || t.status === 'In Progress').length,
        inProgressTickets: tickets.filter(t => t.status === 'In Progress').length,
        pendingClientTickets: tickets.filter(t => t.status === 'Pending Client').length,
        escalatedTickets: tickets.filter(t => t.status === 'Escalated').length,
        resolvedTickets: tickets.filter(t => t.status === 'Resolved').length,
        closedTickets: tickets.filter(t => t.status === 'Closed').length,
        slaAtRiskCount: 0,
        slaBreachedCount: 0,
        slaComplianceRate: 100,
        avgResolutionHours: 0,
        avgResponseMinutes: 14.2,
        monthlyTrends: [
          { month: 'Jun', volume: 0, resolved: 0 },
          { month: 'Jul', volume: 0, resolved: 0 },
          { month: 'Aug', volume: 0, resolved: 0 },
          { month: 'Sep', volume: 0, resolved: 0 },
          { month: 'Oct', volume: 0, resolved: 0 }
        ],
        statusDistribution: [
          { status: 'New', count: 0, color: '#3B82F6' },
          { status: 'In Progress', count: 0, color: '#0F766E' },
          { status: 'Pending Client', count: 0, color: '#F59E0B' },
          { status: 'Escalated', count: 0, color: '#DC2626' },
          { status: 'Resolved', count: 0, color: '#10B981' }
        ],
        moduleDistribution: [],
        priorityDistribution: [
          { priority: 'P1 Critical', count: 0, color: '#DC2626' },
          { priority: 'P2 High', count: 0, color: '#EA580C' },
          { priority: 'P3 Medium', count: 0, color: '#F59E0B' },
          { priority: 'P4 Low', count: 0, color: '#10B981' }
        ],
        consultantWorkloads: [
          { name: 'Anand', module: 'SAP BASIS, SAP HANA, SAP ABAP', activeTickets: 0, capacity: 5 },
          { name: 'Krishnan', module: 'SAP S/4HANA, SAP SD, SAP MM', activeTickets: 0, capacity: 5 },
          { name: 'Mahendran 2', module: 'SAP FI, SAP CO, SAP MM', activeTickets: 0, capacity: 5 },
          { name: 'Venkat', module: 'SAP BASIS, SAP ABAP', activeTickets: 0, capacity: 5 }
        ],
        orgVolume: []
      }
    };
  },

  getNotifications: () => ({ notifications: mockStorage.notifications, unreadCount: 0 }),
  getAuditLogs: () => ({ logs: mockStorage.auditLogs }),
  getDatabaseStatus: () => ({
    dbFilePath: 'GitHub Pages Browser Client Store (Local-First Indexed / Storage)',
    dbStatus: 'ONLINE (Static Preview Mode)',
    dbSizeBytes: 1572864,
    totalTickets: mockStorage.tickets.length,
    totalOrgs: mockStorage.organizations.length,
    totalUsers: mockStorage.users.length,
    storageSizeBytes: 1048576,
    lastBackup: new Date().toISOString(),
    backups: []
  }),
  getGoogleSheetConfig: () => ({ webhookUrl: '', enabled: false, lastSync: null })
};
