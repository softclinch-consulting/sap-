import { TicketPriority, UserRole } from '../types/index.ts';

export const DEFAULT_SLA_POLICIES: Record<TicketPriority, { responseTimeMinutes: number; resolutionTimeMinutes: number }> = {
  P1: { responseTimeMinutes: 15, resolutionTimeMinutes: 240 }, // 15 mins response, 4 hours resolution
  P2: { responseTimeMinutes: 30, resolutionTimeMinutes: 480 }, // 30 mins response, 8 hours resolution
  P3: { responseTimeMinutes: 240, resolutionTimeMinutes: 2880 }, // 4 hours response, 2 days (48 hrs)
  P4: { responseTimeMinutes: 1440, resolutionTimeMinutes: 7200 } // 24 hours (1 day), 5 days (120 hrs)
};

/**
 * Generates enterprise SAP ticket IDs in format SAP-YYYY-00001
 */
export function formatTicketId(year: number, sequenceNumber: number): string {
  if (sequenceNumber < 1) sequenceNumber = 1;
  const padded = String(sequenceNumber).padStart(5, '0');
  return `SAP-${year}-${padded}`;
}

/**
 * Extracts sequence number from ticket ID
 */
export function parseTicketSeq(ticketId: string): number {
  const match = ticketId.match(/SAP-\d+-(\d+)/);
  if (!match) return 0;
  return parseInt(match[1], 10);
}

/**
 * Generates SAP Change Request IDs in format CR-YYYY-0001
 */
export function formatChangeRequestId(year: number, sequenceNumber: number): string {
  if (sequenceNumber < 1) sequenceNumber = 1;
  const padded = String(sequenceNumber).padStart(4, '0');
  return `CR-${year}-${padded}`;
}

/**
 * Calculates response and resolution deadlines from creation timestamp and priority
 */
export function calculateSLADeadlines(
  createdDate: Date,
  priority: TicketPriority,
  policies = DEFAULT_SLA_POLICIES
): { responseDeadline: string; resolutionDeadline: string } {
  const policy = policies[priority] || DEFAULT_SLA_POLICIES.P3;
  const createdMs = createdDate.getTime();

  const responseDeadlineMs = createdMs + policy.responseTimeMinutes * 60 * 1000;
  const resolutionDeadlineMs = createdMs + policy.resolutionTimeMinutes * 60 * 1000;

  return {
    responseDeadline: new Date(responseDeadlineMs).toISOString(),
    resolutionDeadline: new Date(resolutionDeadlineMs).toISOString()
  };
}

/**
 * Evaluates real-time SLA metrics for a ticket
 */
export function evaluateSLAStatus(params: {
  now: Date;
  responseDeadline: string;
  resolutionDeadline: string;
  firstResponseDate?: string | null;
  resolutionDate?: string | null;
  status: string;
}): {
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
  isAtRisk: boolean;
  resolutionTimeRemainingMinutes: number;
} {
  const { now, responseDeadline, resolutionDeadline, firstResponseDate, resolutionDate, status } = params;
  const nowMs = now.getTime();
  const respDeadlineMs = new Date(responseDeadline).getTime();
  const resDeadlineMs = new Date(resolutionDeadline).getTime();

  // Response breach check
  let isResponseBreached = false;
  if (firstResponseDate) {
    isResponseBreached = new Date(firstResponseDate).getTime() > respDeadlineMs;
  } else {
    isResponseBreached = nowMs > respDeadlineMs;
  }

  // Resolution breach check
  let isResolutionBreached = false;
  const isTerminalStatus = status === 'Resolved' || status === 'Closed';
  if (resolutionDate) {
    isResolutionBreached = new Date(resolutionDate).getTime() > resDeadlineMs;
  } else if (!isTerminalStatus) {
    isResolutionBreached = nowMs > resDeadlineMs;
  }

  // Paused status (Pending Client / Pending Third Party does not trigger at-risk alert)
  const isPaused = status === 'Pending Client' || status === 'Pending Third Party';

  // At risk: unresolved, not breached yet, but less than 25% or within 60 minutes
  const remainingMs = resDeadlineMs - nowMs;
  const remainingMinutes = Math.round(remainingMs / (60 * 1000));
  const isAtRisk = !isTerminalStatus && !isPaused && !isResolutionBreached && remainingMinutes > 0 && remainingMinutes <= 60;

  return {
    isResponseBreached,
    isResolutionBreached,
    isAtRisk,
    resolutionTimeRemainingMinutes: remainingMinutes
  };
}

/**
 * Strict tenant isolation check:
 * Client users can ONLY access tickets belonging to their organization.
 */
export function checkTenantAccess(
  user: { role: UserRole; organizationId?: string | null },
  targetOrgId: string
): boolean {
  if (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'AMS_MANAGER' ||
    user.role === 'SUPPORT_LEAD' ||
    user.role === 'SAP_CONSULTANT'
  ) {
    return true; // SoftClinch staff can access enterprise clients
  }

  // Client Admin and Client Employee must match organizationId
  if (!user.organizationId) return false;
  return user.organizationId === targetOrgId;
}

/**
 * Internal comments permission check:
 * Client users cannot view or post internal notes.
 */
export function canViewInternalNotes(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'AMS_MANAGER' || role === 'SUPPORT_LEAD' || role === 'SAP_CONSULTANT';
}

/**
 * Computes SLA compliance percentage
 */
export function calculateSLACompliance(totalTickets: number, breachedTickets: number): number {
  if (totalTickets <= 0) return 100;
  const compliant = Math.max(0, totalTickets - breachedTickets);
  return Math.round((compliant / totalTickets) * 100 * 10) / 10;
}

/**
 * Formats elapsed time since ticket creation into a human-readable live duration string:
 * e.g. "02h 45m 18s" or "2d 04h 12m 30s"
 */
export function formatElapsedTime(startDate: Date | string, endDate?: Date | string): string {
  const startMs = typeof startDate === 'string' ? new Date(startDate).getTime() : startDate.getTime();
  const endMs = endDate ? (typeof endDate === 'string' ? new Date(endDate).getTime() : endDate.getTime()) : Date.now();
  let diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));

  const days = Math.floor(diffSec / 86400);
  diffSec %= 86400;
  const hours = Math.floor(diffSec / 3600);
  diffSec %= 3600;
  const minutes = Math.floor(diffSec / 60);
  const seconds = diffSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Formats countdown or breach elapsed duration towards a target deadline
 */
export function formatCountdown(targetDate: Date | string, fromDate?: Date | string): { isOverdue: boolean; text: string; totalSeconds: number } {
  const targetMs = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
  const currentMs = fromDate ? (typeof fromDate === 'string' ? new Date(fromDate).getTime() : fromDate.getTime()) : Date.now();
  const diffMs = targetMs - currentMs;
  const isOverdue = diffMs < 0;
  let absSec = Math.floor(Math.abs(diffMs) / 1000);

  const days = Math.floor(absSec / 86400);
  absSec %= 86400;
  const hours = Math.floor(absSec / 3600);
  absSec %= 3600;
  const minutes = Math.floor(absSec / 60);
  const seconds = absSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatted = days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s` : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return {
    isOverdue,
    text: formatted,
    totalSeconds: Math.floor(diffMs / 1000)
  };
}

/**
 * Provides standardized SAP ITSM General Data defaults for tickets
 */
export function getDefaultGeneralData(sapModule: string, systemSid = 'PRD') {
  const moduleProcesses: Record<string, string> = {
    'SAP FI': 'Record-to-Report (FI-GL & AP/AR)',
    'SAP CO': 'Cost Center & Profitability Analysis (CO-PA)',
    'SAP MM': 'Procure-to-Pay & Inventory (MM-P2P)',
    'SAP SD': 'Order-to-Cash & Billing (SD-O2C)',
    'SAP PP': 'Plan-to-Produce & Shop Floor (PP-SFC)',
    'SAP QM': 'Quality Inspection & Notifications (QM-IM)',
    'SAP PM': 'Plant Maintenance & Asset Care (PM-EAM)',
    'SAP HCM': 'Hire-to-Retire & Payroll Processing (HCM)',
    'SAP BASIS': 'Landscape Architecture, Kernel & ST03N',
    'SAP ABAP': 'Custom Enhancement, BAdI & IDoc Interfaces',
    'SAP Fiori': 'Fiori Launchpad, OData & UI5 Gateway',
    'SAP S/4HANA': 'Enterprise Management & Universal Journal',
    'SAP BW': 'Data Warehousing, HANA Views & SAC'
  };

  return {
    category: 'Incident',
    sapRelease: 'SAP S/4HANA 2023 FPS02',
    sapClient: systemSid === 'DEV' ? '300' : systemSid === 'QAS' ? '200' : '100',
    dbSystem: 'SAP HANA 2.0 SPS07',
    businessProcess: moduleProcesses[sapModule] || 'Standard Business Process',
    department: 'Enterprise Operations',
    contactPhone: '+1 (555) 010-4420',
    timezone: 'UTC',
    urgency: 'Medium',
    serverHost: `sap-${systemSid.toLowerCase()}-app01.internal`
  };
}
