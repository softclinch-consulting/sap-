export type UserRole =
  | 'SUPER_ADMIN'
  | 'AMS_MANAGER'
  | 'SUPPORT_LEAD'
  | 'SAP_CONSULTANT'
  | 'CLIENT_ADMIN'
  | 'CLIENT_EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string | null;
  organizationName?: string | null;
  designation?: string;
  sapExpertise?: string[];
  experienceYears?: number;
  phone?: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  logo?: string;
  industry: string;
  address: string;
  primaryContact: string;
  contactEmail: string;
  contactNumber: string;
  contractStartDate: string;
  contractEndDate: string;
  supportPlan: 'Enterprise Platinum' | 'Standard Gold' | 'Dedicated Silver';
  supportHours: string;
  assignedManagerId?: string;
  assignedManagerName?: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'TERMINATED';
  createdAt: string;
}

export type SAPEnvironment = 'Production' | 'Quality Assurance' | 'Development' | 'Sandbox';

export interface SAPLandscape {
  id: string;
  organizationId: string;
  organizationName?: string;
  systemName: string;
  sid: string; // e.g. PRD, QAS, DEV
  sapProduct: string; // e.g. SAP S/4HANA 2023, SAP ECC 6.0 EHP8, SAP BW/4HANA
  sapVersion: string;
  environment: SAPEnvironment;
  databaseType: string; // e.g. SAP HANA 2.0, Oracle 19c, MS SQL Server
  hostingType: string; // e.g. AWS, Azure, On-Premise, GCP
  businessOwner: string;
  technicalContact: string;
  goLiveDate: string;
  systemStatus: 'ONLINE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  createdAt: string;
}

export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type TicketStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Pending Client'
  | 'Pending Third Party'
  | 'Escalated'
  | 'Pending Admin Review'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export type SAPModule =
  | 'SAP FI'
  | 'SAP CO'
  | 'SAP MM'
  | 'SAP SD'
  | 'SAP PP'
  | 'SAP QM'
  | 'SAP PM'
  | 'SAP HCM'
  | 'SAP BASIS'
  | 'SAP ABAP'
  | 'SAP Fiori'
  | 'SAP S/4HANA'
  | 'SAP BW'
  | 'Other';

export type IssueCategory =
  | 'Functional Issue'
  | 'Technical Issue'
  | 'Configuration'
  | 'Authorization'
  | 'Performance'
  | 'Integration'
  | 'Data Issue'
  | 'System Downtime'
  | 'Enhancement Request'
  | 'General Support';

export interface TicketGeneralData {
  category: string; // e.g. "Incident" | "Service Request" | "Problem" | "RFC"
  sapRelease: string; // e.g. "SAP S/4HANA 2023 FPS02" | "SAP ECC 6.0 EHP8"
  sapClient: string; // e.g. "100" (Mandant)
  dbSystem: string; // e.g. "SAP HANA 2.0 SPS07"
  businessProcess: string; // e.g. "Record-to-Report (FI-GL)"
  department?: string;
  contactPhone?: string;
  timezone?: string;
  urgency?: string;
  serverHost?: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  commentId?: string | null;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath?: string;
  dataUrl?: string; // base64 preview & download
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  isInternal: boolean; // true = SoftClinch staff only; false = public for client
  createdAt: string;
  attachments?: TicketAttachment[];
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  details: string;
  timestamp: string;
}

export interface Ticket {
  id: string; // e.g. SAP-2026-00001
  seqNumber: number;
  organizationId: string;
  organizationName: string;
  clientContactId: string;
  clientContactName: string;
  clientContactEmail: string;
  subject: string;
  description: string;
  sapModule: SAPModule;
  sapSystemSid: string;
  environment: SAPEnvironment;
  transactionCode: string; // e.g. ME21N, FB01, ST22
  errorMessage?: string;
  issueCategory: IssueCategory;
  businessImpact: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedConsultantId?: string | null;
  assignedConsultantName?: string | null;
  supportLeadId?: string | null;
  supportLeadName?: string | null;
  createdDate: string;
  firstResponseDate?: string | null;
  resolutionDate?: string | null;
  responseDeadline: string;
  resolutionDeadline: string;
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
  isAtRisk: boolean;
  resolutionSummary?: string | null;
  rootCause?: string | null;
  proposedSolution?: string | null;
  timeSpentMinutes: number;
  delayReasonCategory?: string | null;
  delayReasonDetails?: string | null;
  adminReviewNotes?: string | null;
  generalData?: TicketGeneralData;
  attachments?: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
  commentsCount?: number;
  attachmentsCount?: number;
}

export interface SLAPolicy {
  id: string;
  name: string;
  priority: TicketPriority;
  responseTimeMinutes: number; // e.g. 15 mins for P1
  resolutionTimeMinutes: number; // e.g. 240 mins (4h) for P1
  businessHoursOnly: boolean;
  description: string;
}

export type ChangeRequestApprovalStatus =
  | 'Pending'
  | 'Assessing'
  | 'Client Review'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

export type ChangeRequestImplStatus =
  | 'Not Started'
  | 'Scheduled'
  | 'In Progress'
  | 'Testing'
  | 'Transported to PRD'
  | 'Completed'
  | 'Closed';

export interface ChangeRequest {
  id: string; // CR-2026-0001
  seqNumber: number;
  organizationId: string;
  organizationName: string;
  requestTitle: string;
  businessRequirement: string;
  sapModule: SAPModule;
  technicalImpact: string;
  businessImpact: string;
  estimatedEffortHours: number;
  requestedCompletionDate: string;
  assignedConsultantId?: string;
  assignedConsultantName?: string;
  approvalStatus: ChangeRequestApprovalStatus;
  implementationStatus: ChangeRequestImplStatus;
  approvalNotes?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  sapModule: SAPModule;
  summary: string;
  content: string; // Markdown or rich text
  troubleshootingSteps: string;
  tags: string[];
  isInternalOnly: boolean;
  linkedTicketCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  ticketId: string;
  ticketSubject?: string;
  consultantId: string;
  consultantName: string;
  workDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  workDescription: string;
  isBillable: boolean;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TICKET' | 'SLA_ALERT' | 'CHANGE_REQUEST' | 'SYSTEM';
  severity: 'info' | 'warning' | 'critical' | 'success';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  targetId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  filePath: string;
  sizeBytes: number;
  totalTickets: number;
  totalOrgs: number;
  totalUsers: number;
  createdAt: string;
  integrityStatus: 'VERIFIED' | 'FAILED' | 'UNKNOWN';
}

export interface DashboardMetrics {
  totalTickets: number;
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  pendingClientTickets: number;
  escalatedTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  slaAtRiskCount: number;
  slaBreachedCount: number;
  slaComplianceRate: number;
  avgResolutionHours: number;
  avgResponseMinutes: number;
  monthlyTrends: { month: string; volume: number; resolved: number }[];
  statusDistribution: { status: string; count: number; color: string }[];
  moduleDistribution: { module: string; count: number }[];
  priorityDistribution: { priority: string; count: number; color: string }[];
  consultantWorkloads: { name: string; module: string; activeTickets: number; capacity: number }[];
  orgVolume: { orgName: string; count: number }[];
}
