import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root
const PROJECT_ROOT = path.resolve(__dirname, '../../');
export const DB_DIR = path.join(PROJECT_ROOT, 'database');
export const DB_FILE = path.join(DB_DIR, 'sap-support.db');
export const STORAGE_DIR = path.join(PROJECT_ROOT, 'storage');
export const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

export const STORAGE_SUBDIRS = [
  path.join(STORAGE_DIR, 'tickets'),
  path.join(STORAGE_DIR, 'attachments'),
  path.join(STORAGE_DIR, 'client-documents'),
  path.join(STORAGE_DIR, 'reports'),
  path.join(STORAGE_DIR, 'profile-images')
];

// Ensure required directories exist
export function initDirectories() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const dir of STORAGE_SUBDIRS) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

initDirectories();

export const db = new Database(DB_FILE);

// Set PRAGMA for reliability and speed
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    -- Organizations
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      logo TEXT,
      industry TEXT NOT NULL,
      address TEXT NOT NULL,
      primaryContact TEXT NOT NULL,
      contactEmail TEXT NOT NULL,
      contactNumber TEXT NOT NULL,
      contractStartDate TEXT NOT NULL,
      contractEndDate TEXT NOT NULL,
      supportPlan TEXT NOT NULL,
      supportHours TEXT NOT NULL,
      assignedManagerId TEXT,
      assignedManagerName TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      createdAt TEXT NOT NULL
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      organizationId TEXT,
      organizationName TEXT,
      designation TEXT,
      sapExpertise TEXT, -- JSON array
      experienceYears INTEGER DEFAULT 0,
      phone TEXT,
      avatar TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE SET NULL
    );

    -- SAP Landscape Systems
    CREATE TABLE IF NOT EXISTS sap_landscapes (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      organizationName TEXT,
      systemName TEXT NOT NULL,
      sid TEXT NOT NULL,
      sapProduct TEXT NOT NULL,
      sapVersion TEXT NOT NULL,
      environment TEXT NOT NULL,
      databaseType TEXT NOT NULL,
      hostingType TEXT NOT NULL,
      businessOwner TEXT NOT NULL,
      technicalContact TEXT NOT NULL,
      goLiveDate TEXT NOT NULL,
      systemStatus TEXT NOT NULL DEFAULT 'ONLINE',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- SLA Policies
    CREATE TABLE IF NOT EXISTS sla_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      priority TEXT NOT NULL UNIQUE,
      responseTimeMinutes INTEGER NOT NULL,
      resolutionTimeMinutes INTEGER NOT NULL,
      businessHoursOnly INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL
    );

    -- Tickets
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      seqNumber INTEGER NOT NULL UNIQUE,
      organizationId TEXT NOT NULL,
      organizationName TEXT NOT NULL,
      clientContactId TEXT NOT NULL,
      clientContactName TEXT NOT NULL,
      clientContactEmail TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      sapModule TEXT NOT NULL,
      sapSystemSid TEXT NOT NULL,
      environment TEXT NOT NULL,
      transactionCode TEXT NOT NULL,
      errorMessage TEXT,
      issueCategory TEXT NOT NULL,
      businessImpact TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      assignedConsultantId TEXT,
      assignedConsultantName TEXT,
      supportLeadId TEXT,
      supportLeadName TEXT,
      createdDate TEXT NOT NULL,
      firstResponseDate TEXT,
      resolutionDate TEXT,
      responseDeadline TEXT NOT NULL,
      resolutionDeadline TEXT NOT NULL,
      isResponseBreached INTEGER NOT NULL DEFAULT 0,
      isResolutionBreached INTEGER NOT NULL DEFAULT 0,
      isAtRisk INTEGER NOT NULL DEFAULT 0,
      resolutionSummary TEXT,
      rootCause TEXT,
      proposedSolution TEXT,
      timeSpentMinutes INTEGER NOT NULL DEFAULT 0,
      generalData TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (assignedConsultantId) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Ticket Comments (public vs internal)
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      authorRole TEXT NOT NULL,
      content TEXT NOT NULL,
      isInternal INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );

    -- Ticket Attachments
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      commentId TEXT,
      fileName TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      fileType TEXT NOT NULL,
      filePath TEXT NOT NULL,
      dataUrl TEXT,
      uploadedBy TEXT NOT NULL,
      uploadedByName TEXT NOT NULL,
      uploadedAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );

    -- Ticket History / Activity Timeline
    CREATE TABLE IF NOT EXISTS ticket_history (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      action TEXT NOT NULL,
      actorId TEXT NOT NULL,
      actorName TEXT NOT NULL,
      actorRole TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE
    );

    -- Change Requests
    CREATE TABLE IF NOT EXISTS change_requests (
      id TEXT PRIMARY KEY,
      seqNumber INTEGER NOT NULL UNIQUE,
      organizationId TEXT NOT NULL,
      organizationName TEXT NOT NULL,
      requestTitle TEXT NOT NULL,
      businessRequirement TEXT NOT NULL,
      sapModule TEXT NOT NULL,
      technicalImpact TEXT NOT NULL,
      businessImpact TEXT NOT NULL,
      estimatedEffortHours REAL NOT NULL DEFAULT 0,
      requestedCompletionDate TEXT NOT NULL,
      assignedConsultantId TEXT,
      assignedConsultantName TEXT,
      approvalStatus TEXT NOT NULL DEFAULT 'Pending',
      implementationStatus TEXT NOT NULL DEFAULT 'Not Started',
      approvalNotes TEXT,
      approvedBy TEXT,
      approvedByName TEXT,
      approvedAt TEXT,
      rejectionReason TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
    );

    -- Knowledge Base Articles
    CREATE TABLE IF NOT EXISTS knowledge_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      sapModule TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      troubleshootingSteps TEXT NOT NULL,
      tags TEXT NOT NULL, -- JSON array
      isInternalOnly INTEGER NOT NULL DEFAULT 0,
      linkedTicketCount INTEGER NOT NULL DEFAULT 0,
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Time Entries
    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      ticketId TEXT NOT NULL,
      ticketSubject TEXT,
      consultantId TEXT NOT NULL,
      consultantName TEXT NOT NULL,
      workDate TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      workDescription TEXT NOT NULL,
      isBillable INTEGER NOT NULL DEFAULT 1,
      approvalStatus TEXT NOT NULL DEFAULT 'Pending',
      approvedBy TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (consultantId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      link TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      userRole TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      targetId TEXT,
      details TEXT NOT NULL,
      ipAddress TEXT,
      timestamp TEXT NOT NULL
    );

    -- Backups
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      filePath TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      totalTickets INTEGER NOT NULL,
      totalOrgs INTEGER NOT NULL,
      totalUsers INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      integrityStatus TEXT NOT NULL DEFAULT 'VERIFIED'
    );

    -- Indices for high performance
    CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(organizationId);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_consultant ON tickets(assignedConsultantId);
    CREATE INDEX IF NOT EXISTS idx_comments_ticket ON ticket_comments(ticketId);
    CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticketId);
    CREATE INDEX IF NOT EXISTS idx_time_consultant ON time_entries(consultantId);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, isRead);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

    -- Application Configuration & Integrations Settings
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Migration safeguard for existing databases
  try {
    db.exec(`ALTER TABLE tickets ADD COLUMN errorMessage TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE tickets ADD COLUMN proposedSolution TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE tickets ADD COLUMN generalData TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE tickets ADD COLUMN delayReasonCategory TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE tickets ADD COLUMN delayReasonDetails TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE tickets ADD COLUMN adminReviewNotes TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE ticket_attachments ADD COLUMN dataUrl TEXT;`);
  } catch (_) {}
}

// Initialize tables
initSchema();
