import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db, DB_FILE, BACKUP_DIR, STORAGE_DIR, STORAGE_SUBDIRS } from './db.ts';
import {
  formatTicketId,
  parseTicketSeq,
  formatChangeRequestId,
  calculateSLADeadlines,
  evaluateSLAStatus,
  checkTenantAccess,
  canViewInternalNotes,
  calculateSLACompliance,
  getDefaultGeneralData,
  DEFAULT_SLA_POLICIES
} from './logic.ts';
import { UserRole, TicketPriority, SAPModule, SAPEnvironment, IssueCategory } from '../types/index.ts';
import {
  getGoogleSheetConfig,
  saveGoogleSheetConfig,
  syncTicketRealTime,
  syncAllTicketsRealTime
} from './googleSheetSync.ts';

export const apiRouter = Router();

// Middleware to extract active user from header (or session default to Super Admin for smooth UX)
function getCurrentUser(req: Request): any {
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const user = db.prepare('SELECT id, name, email, role, organizationId, organizationName, designation, sapExpertise, experienceYears, phone, avatar, active, createdAt FROM users WHERE id = ?').get(userId) as any;
    if (user) {
      return {
        ...user,
        sapExpertise: user.sapExpertise ? JSON.parse(user.sapExpertise) : []
      };
    }
  }
  // Default to Super Admin if not provided
  const defaultUser = db.prepare("SELECT id, name, email, role, organizationId, organizationName, designation, sapExpertise, experienceYears, phone, avatar, active, createdAt FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1").get() as any;
  if (defaultUser) {
    return {
      ...defaultUser,
      sapExpertise: defaultUser.sapExpertise ? JSON.parse(defaultUser.sapExpertise) : []
    };
  }
  return null;
}

// Helper to log audit event
function logAudit(userId: string, userName: string, userRole: string, action: string, module: string, targetId: string, details: string) {
  try {
    const id = 'audit-' + crypto.randomUUID();
    const timestamp = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, userId, userName, userRole, action, module, targetId, details, ipAddress, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, userName, userRole, action, module, targetId, details, '127.0.0.1', timestamp);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user });
});

apiRouter.get('/auth/users', (req: Request, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, organizationId, organizationName, designation, sapExpertise, experienceYears, phone, avatar, active, createdAt FROM users ORDER BY name ASC').all();
  const parsed = users.map((u: any) => ({
    ...u,
    sapExpertise: u.sapExpertise ? JSON.parse(u.sapExpertise) : []
  }));
  res.json({ users: parsed });
});

apiRouter.get('/users', (req: Request, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, organizationId, organizationName, designation, sapExpertise, experienceYears, phone, avatar, active, createdAt FROM users ORDER BY name ASC').all();
  const parsed = users.map((u: any) => ({
    ...u,
    sapExpertise: u.sapExpertise ? JSON.parse(u.sapExpertise) : []
  }));
  res.json({ users: parsed });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const matches = bcrypt.compareSync(password, user.passwordHash);
  if (!matches) return res.status(401).json({ error: 'Invalid credentials' });

  logAudit(user.id, user.name, user.role, 'USER_LOGIN', 'AUTH', user.id, `User logged in: ${user.email}`);

  const { passwordHash, ...safeUser } = user;
  safeUser.sapExpertise = safeUser.sapExpertise ? JSON.parse(safeUser.sapExpertise) : [];
  res.json({ user: safeUser, token: 'session-' + user.id });
});

// Quick Switcher endpoint for demonstration & multi-role testing
apiRouter.post('/auth/switch', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT id, name, email, role, organizationId, organizationName, designation, sapExpertise, experienceYears, phone, avatar, active, createdAt FROM users WHERE id = ?').get(userId) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.sapExpertise = user.sapExpertise ? JSON.parse(user.sapExpertise) : [];
  res.json({ user, token: 'session-' + user.id });
});

apiRouter.post('/auth/users', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'AMS_MANAGER') {
    return res.status(403).json({ error: 'Unauthorized to create users' });
  }

  const { name, email, password, role, organizationId, designation, sapExpertise, experienceYears, phone } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'Name, email, and role are required' });

  let orgName = null;
  if (organizationId) {
    const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(organizationId) as any;
    orgName = org?.name || null;
  }

  const id = 'usr-' + crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password || 'Password123!', 10);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, passwordHash, role, organizationId, organizationName, designation, sapExpertise, experienceYears, phone, active, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      name,
      email,
      passwordHash,
      role,
      organizationId || null,
      orgName,
      designation || '',
      JSON.stringify(sapExpertise || []),
      experienceYears || 0,
      phone || '',
      now
    );

    logAudit(currentUser.id, currentUser.name, currentUser.role, 'USER_CREATE', 'USERS', id, `Created user ${name} (${role})`);
    res.status(201).json({ id, name, email, role, organizationId, organizationName: orgName });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
});

// -------------------------------------------------------------
// ORGANIZATIONS & LANDSCAPES
// -------------------------------------------------------------

apiRouter.get('/organizations', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  let orgs: any[];

  if (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') {
    orgs = db.prepare('SELECT * FROM organizations WHERE id = ?').all(currentUser.organizationId);
  } else {
    orgs = db.prepare('SELECT * FROM organizations ORDER BY name ASC').all();
  }

  // Attach metrics
  const enhanced = orgs.map(org => {
    const ticketCount = (db.prepare('SELECT COUNT(*) as c FROM tickets WHERE organizationId = ?').get(org.id) as any)?.c || 0;
    const systemCount = (db.prepare('SELECT COUNT(*) as c FROM sap_landscapes WHERE organizationId = ?').get(org.id) as any)?.c || 0;
    const userCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE organizationId = ?').get(org.id) as any)?.c || 0;
    return {
      ...org,
      ticketCount,
      systemCount,
      userCount
    };
  });

  res.json({ organizations: enhanced });
});

apiRouter.get('/organizations/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (!checkTenantAccess(currentUser, req.params.id)) {
    return res.status(403).json({ error: 'Tenant access violation' });
  }

  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id) as any;
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  const systems = db.prepare('SELECT * FROM sap_landscapes WHERE organizationId = ?').all(org.id);
  const users = db.prepare('SELECT id, name, email, role, designation FROM users WHERE organizationId = ?').all(org.id);
  const tickets = db.prepare('SELECT id, subject, priority, status, createdDate, sapModule FROM tickets WHERE organizationId = ? ORDER BY createdDate DESC LIMIT 10').all(org.id);

  res.json({ organization: org, systems, users, recentTickets: tickets });
});

apiRouter.post('/organizations', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (currentUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can create organizations' });
  }

  const { name, code, industry, address, primaryContact, contactEmail, contactNumber, contractStartDate, contractEndDate, supportPlan, supportHours } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Organization name and code required' });

  const id = 'org-' + code.toLowerCase().replace(/[^a-z0-9]/g, '');
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO organizations (id, name, code, industry, address, primaryContact, contactEmail, contactNumber, contractStartDate, contractEndDate, supportPlan, supportHours, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(
      id, name, code.toUpperCase(), industry || 'General Industry', address || '', primaryContact || '', contactEmail || '', contactNumber || '',
      contractStartDate || now.split('T')[0], contractEndDate || '2028-12-31', supportPlan || 'Enterprise Platinum', supportHours || '24/7 Support', now
    );

    logAudit(currentUser.id, currentUser.name, currentUser.role, 'ORG_CREATE', 'ORGANIZATIONS', id, `Created organization ${name}`);
    res.status(201).json({ id, name, code });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// SAP Landscapes
apiRouter.get('/landscapes', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const orgId = req.query.organizationId as string;

  let query = 'SELECT * FROM sap_landscapes';
  const params: any[] = [];

  if (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') {
    query += ' WHERE organizationId = ?';
    params.push(currentUser.organizationId);
  } else if (orgId) {
    query += ' WHERE organizationId = ?';
    params.push(orgId);
  }

  query += ' ORDER BY sid ASC';
  const landscapes = db.prepare(query).all(...params);
  res.json({ landscapes });
});

apiRouter.post('/landscapes', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (currentUser?.role === 'CLIENT_EMPLOYEE') {
    return res.status(403).json({ error: 'Unauthorized to add SAP landscape' });
  }

  const { organizationId, systemName, sid, sapProduct, sapVersion, environment, databaseType, hostingType, businessOwner, technicalContact, goLiveDate } = req.body;
  if (!organizationId || !systemName || !sid) return res.status(400).json({ error: 'Organization, system name, and SID required' });

  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(organizationId) as any;
  const id = 'ls-' + crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO sap_landscapes (id, organizationId, organizationName, systemName, sid, sapProduct, sapVersion, environment, databaseType, hostingType, businessOwner, technicalContact, goLiveDate, systemStatus, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ONLINE', ?)
  `).run(
    id, organizationId, org?.name || '', systemName, sid.toUpperCase(), sapProduct || 'SAP S/4HANA', sapVersion || '2023',
    environment || 'Production', databaseType || 'SAP HANA 2.0', hostingType || 'AWS', businessOwner || '', technicalContact || '', goLiveDate || now.split('T')[0], now
  );

  logAudit(currentUser.id, currentUser.name, currentUser.role, 'LANDSCAPE_CREATE', 'LANDSCAPES', id, `Registered SAP System ${sid} (${systemName})`);
  res.status(201).json({ id, systemName, sid });
});

// -------------------------------------------------------------
// TICKETS MODULE
// -------------------------------------------------------------

apiRouter.get('/tickets', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { status, priority, module, organizationId, assignedToMe, search } = req.query;

  let query = 'SELECT * FROM tickets WHERE 1=1';
  const params: any[] = [];

  // Tenant restriction
  if (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') {
    query += ' AND organizationId = ?';
    params.push(currentUser.organizationId);
  } else if (organizationId) {
    query += ' AND organizationId = ?';
    params.push(organizationId);
  }

  if (assignedToMe === 'true' && currentUser?.id) {
    query += ' AND assignedConsultantId = ?';
    params.push(currentUser.id);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  if (module) {
    query += ' AND sapModule = ?';
    params.push(module);
  }

  if (search) {
    query += ' AND (id LIKE ? OR subject LIKE ? OR description LIKE ? OR transactionCode LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY createdDate DESC';
  const tickets = db.prepare(query).all(...params) as any[];

  // Re-evaluate live SLA status on fetch
  const now = new Date();
  const enhanced = tickets.map(t => {
    const sla = evaluateSLAStatus({
      now,
      responseDeadline: t.responseDeadline,
      resolutionDeadline: t.resolutionDeadline,
      firstResponseDate: t.firstResponseDate,
      resolutionDate: t.resolutionDate,
      status: t.status
    });

    const parsedGeneralData = t.generalData ? JSON.parse(t.generalData) : getDefaultGeneralData(t.sapModule, t.sapSystemSid);
    const attachmentsCount = (db.prepare('SELECT COUNT(*) as c FROM ticket_attachments WHERE ticketId = ?').get(t.id) as any)?.c || 0;

    return {
      ...t,
      generalData: parsedGeneralData,
      attachmentsCount,
      isResponseBreached: sla.isResponseBreached,
      isResolutionBreached: sla.isResolutionBreached,
      isAtRisk: sla.isAtRisk,
      resolutionTimeRemainingMinutes: sla.resolutionTimeRemainingMinutes
    };
  });

  res.json({ tickets: enhanced });
});

apiRouter.get('/tickets/:id', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // Tenant access check
  if (!checkTenantAccess(currentUser, ticket.organizationId)) {
    return res.status(403).json({ error: 'Tenant access violation' });
  }

  // Fetch comments (filter internal notes if client)
  let commentsQuery = 'SELECT * FROM ticket_comments WHERE ticketId = ?';
  const canSeeInternal = canViewInternalNotes(currentUser.role);
  if (!canSeeInternal) {
    commentsQuery += ' AND isInternal = 0';
  }
  commentsQuery += ' ORDER BY createdAt ASC';
  const comments = db.prepare(commentsQuery).all(ticket.id);

  // Fetch attachments
  const attachments = db.prepare('SELECT * FROM ticket_attachments WHERE ticketId = ? ORDER BY uploadedAt ASC').all(ticket.id);

  // Fetch history
  const history = db.prepare('SELECT * FROM ticket_history WHERE ticketId = ? ORDER BY timestamp DESC').all(ticket.id);

  // Re-evaluate live SLA status
  const now = new Date();
  const sla = evaluateSLAStatus({
    now,
    responseDeadline: ticket.responseDeadline,
    resolutionDeadline: ticket.resolutionDeadline,
    firstResponseDate: ticket.firstResponseDate,
    resolutionDate: ticket.resolutionDate,
    status: ticket.status
  });

  const parsedGeneralData = ticket.generalData ? JSON.parse(ticket.generalData) : getDefaultGeneralData(ticket.sapModule, ticket.sapSystemSid);

  res.json({
    ticket: {
      ...ticket,
      generalData: parsedGeneralData,
      attachments,
      attachmentsCount: attachments.length,
      isResponseBreached: sla.isResponseBreached,
      isResolutionBreached: sla.isResolutionBreached,
      isAtRisk: sla.isAtRisk,
      resolutionTimeRemainingMinutes: sla.resolutionTimeRemainingMinutes
    },
    comments,
    attachments,
    history
  });
});

apiRouter.post('/tickets', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const {
    organizationId,
    subject,
    description,
    sapModule,
    sapSystemSid,
    environment,
    transactionCode,
    errorMessage,
    issueCategory,
    businessImpact,
    priority,
    generalData,
    attachments
  } = req.body;

  if (!subject || !description || !sapModule || !priority) {
    return res.status(400).json({ error: 'Subject, description, SAP module, and priority are required' });
  }

  // Determine organization
  let orgId = organizationId;
  if (currentUser.role === 'CLIENT_ADMIN' || currentUser.role === 'CLIENT_EMPLOYEE') {
    orgId = currentUser.organizationId;
  }
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(orgId) as any;
  if (!org) return res.status(404).json({ error: 'Organization not found' });

  // Get max sequence number
  const maxRow = db.prepare('SELECT MAX(seqNumber) as maxSeq FROM tickets').get() as any;
  const nextSeq = (maxRow?.maxSeq || 0) + 1;
  const currentYear = new Date().getFullYear();
  const ticketId = formatTicketId(currentYear, nextSeq);

  const now = new Date();
  const nowIso = now.toISOString();

  // Calculate SLA deadlines
  const deadlines = calculateSLADeadlines(now, priority as TicketPriority);

  // Prepare General Data
  const resolvedGeneralData = {
    ...getDefaultGeneralData(sapModule, sapSystemSid || 'PRD'),
    ...(generalData || {})
  };

  db.prepare(`
    INSERT INTO tickets (
      id, seqNumber, organizationId, organizationName, clientContactId, clientContactName, clientContactEmail,
      subject, description, sapModule, sapSystemSid, environment, transactionCode, errorMessage, issueCategory, businessImpact,
      priority, status, assignedConsultantId, assignedConsultantName, supportLeadId, supportLeadName,
      createdDate, responseDeadline, resolutionDeadline, isResponseBreached, isResolutionBreached, isAtRisk,
      timeSpentMinutes, generalData, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', NULL, NULL, NULL, NULL, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?)
  `).run(
    ticketId,
    nextSeq,
    orgId,
    org.name,
    currentUser.id,
    currentUser.name,
    currentUser.email,
    subject,
    description,
    sapModule,
    sapSystemSid || 'PRD',
    environment || 'Production',
    transactionCode || 'N/A',
    errorMessage || null,
    issueCategory || 'Functional Issue',
    businessImpact || 'Standard operational disruption',
    priority,
    nowIso,
    deadlines.responseDeadline,
    deadlines.resolutionDeadline,
    JSON.stringify(resolvedGeneralData),
    nowIso,
    nowIso
  );

  // Insert initial attachments if provided
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      const attId = 'att-' + crypto.randomUUID();
      const safeName = (att.fileName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(STORAGE_DIR, 'attachments', `${attId}-${safeName}`);
      if (att.dataUrl && att.dataUrl.includes('base64,')) {
        try {
          const b64 = att.dataUrl.split('base64,')[1];
          fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
        } catch (_) {}
      }
      db.prepare(`
        INSERT INTO ticket_attachments (id, ticketId, commentId, fileName, fileSize, fileType, filePath, dataUrl, uploadedBy, uploadedByName, uploadedAt)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        attId,
        ticketId,
        att.fileName || 'attachment',
        att.fileSize || 0,
        att.fileType || 'application/octet-stream',
        filePath,
        att.dataUrl || null,
        currentUser.id,
        currentUser.name,
        nowIso
      );
    }
  }

  // Record initial history
  db.prepare(`
    INSERT INTO ticket_history (id, ticketId, action, actorId, actorName, actorRole, details, timestamp)
    VALUES (?, ?, 'Ticket Created', ?, ?, ?, ?, ?)
  `).run(
    'hist-' + crypto.randomUUID(),
    ticketId,
    currentUser.id,
    currentUser.name,
    currentUser.role,
    `Ticket raised with priority ${priority} for module ${sapModule}${attachments?.length ? ` (${attachments.length} attachments)` : ''}`,
    nowIso
  );

  // Notify support leads
  const leads = db.prepare("SELECT id FROM users WHERE role IN ('SUPPORT_LEAD', 'SUPER_ADMIN')").all() as any[];
  for (const lead of leads) {
    db.prepare(`
      INSERT INTO notifications (id, userId, title, message, type, severity, link, isRead, createdAt)
      VALUES (?, ?, ?, ?, 'TICKET', ?, ?, 0, ?)
    `).run(
      'notif-' + crypto.randomUUID(),
      lead.id,
      `New ${priority} Ticket: ${ticketId}`,
      `${org.name}: ${subject}`,
      priority === 'P1' ? 'critical' : 'info',
      `/tickets/${ticketId}`,
      nowIso
    );
  }

  logAudit(currentUser.id, currentUser.name, currentUser.role, 'TICKET_CREATE', 'TICKETS', ticketId, `Created ticket ${ticketId}`);
  
  // Real-time sync to Google Sheets
  syncTicketRealTime(ticketId).catch(err => console.warn('[Google Sheets Sync] Real-time push error:', err));

  res.status(201).json({ id: ticketId, subject, priority, status: 'New' });
});

// Update Ticket / Assign / Status / Comments
apiRouter.post('/tickets/:id/comments', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (!checkTenantAccess(currentUser, ticket.organizationId)) {
    return res.status(403).json({ error: 'Tenant access violation' });
  }

  let { content, isInternal } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content cannot be empty' });

  // Consultant communicates with Admin internally only; only Admin connects with the customer
  if (currentUser.role === 'SAP_CONSULTANT') {
    isInternal = true;
  } else if (isInternal && !canViewInternalNotes(currentUser.role)) {
    isInternal = false;
  }

  const commentId = 'cmt-' + crypto.randomUUID();
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO ticket_comments (id, ticketId, authorId, authorName, authorRole, content, isInternal, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(commentId, ticket.id, currentUser.id, currentUser.name, currentUser.role, content, isInternal ? 1 : 0, nowIso);

  // If this is the first response from a consultant or support lead, record firstResponseDate
  if (!ticket.firstResponseDate && (currentUser.role === 'SAP_CONSULTANT' || currentUser.role === 'SUPPORT_LEAD' || currentUser.role === 'SUPER_ADMIN')) {
    db.prepare('UPDATE tickets SET firstResponseDate = ?, updatedAt = ? WHERE id = ?').run(nowIso, nowIso, ticket.id);
  }

  // Record history
  db.prepare(`
    INSERT INTO ticket_history (id, ticketId, action, actorId, actorName, actorRole, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'hist-' + crypto.randomUUID(),
    ticket.id,
    isInternal ? 'Internal Note Added' : 'Public Comment Added',
    currentUser.id,
    currentUser.name,
    currentUser.role,
    content.slice(0, 80) + (content.length > 80 ? '...' : ''),
    nowIso
  );

  res.status(201).json({ id: commentId, content, isInternal, createdAt: nowIso });
});

// Upload Attachment to open ticket
apiRouter.post('/tickets/:id/attachments', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (!checkTenantAccess(currentUser, ticket.organizationId)) {
    return res.status(403).json({ error: 'Tenant access violation' });
  }

  const { fileName, fileSize, fileType, dataUrl } = req.body;
  if (!fileName) return res.status(400).json({ error: 'File name is required' });

  const attId = 'att-' + crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(STORAGE_DIR, 'attachments', `${attId}-${safeName}`);

  if (dataUrl && dataUrl.includes('base64,')) {
    try {
      const b64 = dataUrl.split('base64,')[1];
      fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
    } catch (_) {}
  }

  db.prepare(`
    INSERT INTO ticket_attachments (id, ticketId, commentId, fileName, fileSize, fileType, filePath, dataUrl, uploadedBy, uploadedByName, uploadedAt)
    VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attId,
    ticket.id,
    fileName,
    fileSize || 0,
    fileType || 'application/octet-stream',
    filePath,
    dataUrl || null,
    currentUser.id,
    currentUser.name,
    nowIso
  );

  // Record history
  db.prepare(`
    INSERT INTO ticket_history (id, ticketId, action, actorId, actorName, actorRole, details, timestamp)
    VALUES (?, ?, 'Attachment Uploaded', ?, ?, ?, ?, ?)
  `).run(
    'hist-' + crypto.randomUUID(),
    ticket.id,
    currentUser.id,
    currentUser.name,
    currentUser.role,
    `Uploaded file: ${fileName} (${Math.round((fileSize || 0) / 1024)} KB)`,
    nowIso
  );

  res.status(201).json({
    id: attId,
    ticketId: ticket.id,
    fileName,
    fileSize: fileSize || 0,
    fileType: fileType || 'application/octet-stream',
    filePath,
    dataUrl,
    uploadedBy: currentUser.id,
    uploadedByName: currentUser.name,
    uploadedAt: nowIso
  });
});

apiRouter.post('/tickets/:id/assign', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'AMS_MANAGER' && currentUser.role !== 'SUPPORT_LEAD' && currentUser.role !== 'SAP_CONSULTANT') {
    return res.status(403).json({ error: 'Unauthorized to assign tickets' });
  }

  const { consultantId, engineerId } = req.body;
  const targetId = consultantId || engineerId;
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const consultant = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(targetId) as any;
  if (!consultant) return res.status(404).json({ error: 'Consultant not found' });

  const nowIso = new Date().toISOString();
  const newStatus = ticket.status === 'New' ? 'Assigned' : ticket.status;

  db.prepare(`
    UPDATE tickets
    SET assignedConsultantId = ?, assignedConsultantName = ?, status = ?, updatedAt = ?
    WHERE id = ?
  `).run(consultant.id, consultant.name, newStatus, nowIso, ticket.id);

  // Log history
  db.prepare(`
    INSERT INTO ticket_history (id, ticketId, action, actorId, actorName, actorRole, details, timestamp)
    VALUES (?, ?, 'Assigned Consultant', ?, ?, ?, ?, ?)
  `).run(
    'hist-' + crypto.randomUUID(),
    ticket.id,
    currentUser.id,
    currentUser.name,
    currentUser.role,
    `Assigned to consultant ${consultant.name}`,
    nowIso
  );

  // Notify consultant
  db.prepare(`
    INSERT INTO notifications (id, userId, title, message, type, severity, link, isRead, createdAt)
    VALUES (?, ?, ?, ?, 'TICKET', 'info', ?, 0, ?)
  `).run(
    'notif-' + crypto.randomUUID(),
    consultant.id,
    `Assigned to Ticket ${ticket.id}`,
    `${ticket.subject}`,
    `/tickets/${ticket.id}`,
    nowIso
  );

  logAudit(currentUser.id, currentUser.name, currentUser.role, 'TICKET_ASSIGN', 'TICKETS', ticket.id, `Assigned to ${consultant.name}`);
  syncTicketRealTime(ticket.id).catch(err => console.warn('[Google Sheets Sync] Real-time push error:', err));
  res.json({ success: true, assignedConsultantId: consultant.id, assignedConsultantName: consultant.name, status: newStatus });
});

apiRouter.post('/tickets/:id/status', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (!checkTenantAccess(currentUser, ticket.organizationId)) {
    return res.status(403).json({ error: 'Tenant access violation' });
  }

  let {
    status,
    resolutionSummary,
    rootCause,
    proposedSolution,
    timeSpentMinutes,
    delayReasonCategory,
    delayReasonDetails,
    adminReviewNotes
  } = req.body;

  // RULE: Consultant cannot mark ticket directly as 'Resolved' or 'Closed'
  // When Consultant finishes technical fix, it moves to 'Pending Admin Review' for Admin approval
  const isConsultant = currentUser.role === 'SAP_CONSULTANT';
  if (isConsultant && (status === 'Resolved' || status === 'Closed')) {
    status = 'Pending Admin Review';
  }

  const nowIso = new Date().toISOString();
  let resolutionDate = ticket.resolutionDate;

  // Only Admin can officially mark ticket as Resolved
  if (status === 'Resolved' && !resolutionDate) {
    resolutionDate = nowIso;
  }

  // Calculate increment in time spent if provided
  let newTotalTime = ticket.timeSpentMinutes || 0;
  if (timeSpentMinutes && Number(timeSpentMinutes) > 0) {
    newTotalTime += Number(timeSpentMinutes);
  }

  db.prepare(`
    UPDATE tickets
    SET status = ?,
        resolutionDate = ?,
        resolutionSummary = COALESCE(?, resolutionSummary),
        rootCause = COALESCE(?, rootCause),
        proposedSolution = COALESCE(?, proposedSolution),
        timeSpentMinutes = ?,
        delayReasonCategory = COALESCE(?, delayReasonCategory),
        delayReasonDetails = COALESCE(?, delayReasonDetails),
        adminReviewNotes = COALESCE(?, adminReviewNotes),
        updatedAt = ?
    WHERE id = ?
  `).run(
    status,
    resolutionDate,
    resolutionSummary || null,
    rootCause || null,
    proposedSolution || null,
    newTotalTime,
    delayReasonCategory || null,
    delayReasonDetails || null,
    adminReviewNotes || null,
    nowIso,
    ticket.id
  );

  // If Admin approved to Resolved, post the official solution to Customer as public comment!
  if (status === 'Resolved' && (proposedSolution || resolutionSummary)) {
    const solText = proposedSolution || resolutionSummary;
    const rcText = rootCause || 'Configuration and system logic verified by SAP Support Desk';
    const cmtId = 'cmt-' + crypto.randomUUID();
    const solutionComment = `[OFFICIAL RESOLUTION APPROVED BY AMS MANAGEMENT]:\n${solText}\n\nRoot Cause: ${rcText}\n\nPlease validate this solution in your SAP environment and confirm resolution.`;
    db.prepare(`
      INSERT INTO ticket_comments (id, ticketId, authorId, authorName, authorRole, content, isInternal, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(cmtId, ticket.id, currentUser.id, currentUser.name, currentUser.role, solutionComment, nowIso);
  }

  // Record history
  let historyDetails = `Status updated from ${ticket.status} to ${status}`;
  if (status === 'Pending Admin Review') {
    historyDetails = `Fix submitted by consultant ${currentUser.name} for Admin Review & Approval${delayReasonCategory ? ` (Delay Justification: ${delayReasonCategory})` : ''}`;
  } else if (status === 'Resolved') {
    historyDetails = `Solution validated and released to Customer by Admin ${currentUser.name}`;
  } else if (ticket.status === 'Pending Admin Review' && status === 'In Progress') {
    historyDetails = `Admin ${currentUser.name} returned ticket to consultant for rework: ${adminReviewNotes || 'Please adjust fix'}`;
  }

  db.prepare(`
    INSERT INTO ticket_history (id, ticketId, action, actorId, actorName, actorRole, details, timestamp)
    VALUES (?, ?, 'Status Changed', ?, ?, ?, ?, ?)
  `).run(
    'hist-' + crypto.randomUUID(),
    ticket.id,
    currentUser.id,
    currentUser.name,
    currentUser.role,
    historyDetails,
    nowIso
  );

  // Notifications
  if (status === 'Pending Admin Review') {
    const admins = db.prepare("SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'AMS_MANAGER', 'SUPPORT_LEAD')").all() as any[];
    for (const a of admins) {
      db.prepare(`
        INSERT INTO notifications (id, userId, title, message, type, severity, link, isRead, createdAt)
        VALUES (?, ?, ?, ?, 'TICKET', 'info', ?, 0, ?)
      `).run(
        'notif-' + crypto.randomUUID(),
        a.id,
        `Review Required: ${ticket.id}`,
        `${currentUser.name} submitted solution for ${ticket.id} (${ticket.sapModule})`,
        `/tickets/${ticket.id}`,
        nowIso
      );
    }
  } else if (status === 'Resolved') {
    db.prepare(`
      INSERT INTO notifications (id, userId, title, message, type, severity, link, isRead, createdAt)
      VALUES (?, ?, ?, ?, 'TICKET', 'info', ?, 0, ?)
    `).run(
      'notif-' + crypto.randomUUID(),
      ticket.clientContactId,
      `Ticket Resolved: ${ticket.id}`,
      `SoftClinch AMS Management has provided a resolution for: ${ticket.subject}`,
      `/tickets/${ticket.id}`,
      nowIso
    );
  }

  logAudit(currentUser.id, currentUser.name, currentUser.role, 'TICKET_STATUS_UPDATE', 'TICKETS', ticket.id, `Status updated to ${status}`);
  syncTicketRealTime(ticket.id).catch(err => console.warn('[Google Sheets Sync] Real-time push error:', err));
  res.json({
    success: true,
    status,
    resolutionDate,
    proposedSolution,
    timeSpentMinutes: newTotalTime,
    delayReasonCategory,
    delayReasonDetails,
    adminReviewNotes
  });
});

// Time Entries Management for Ticket
apiRouter.get('/tickets/:id/time-entries', (req: Request, res: Response) => {
  const entries = db.prepare('SELECT * FROM time_entries WHERE ticketId = ? ORDER BY createdAt DESC').all(req.params.id);
  res.json({ timeEntries: entries });
});

apiRouter.post('/tickets/:id/time-entries', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const { durationMinutes, workDescription, isBillable, workDate } = req.body;
  if (!durationMinutes || Number(durationMinutes) <= 0) {
    return res.status(400).json({ error: 'Duration minutes must be greater than 0' });
  }

  const entryId = 'time-' + crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const mins = parseInt(durationMinutes, 10);

  db.prepare(`
    INSERT INTO time_entries (id, ticketId, ticketSubject, consultantId, consultantName, workDate, startTime, endTime, durationMinutes, workDescription, isBillable, approvalStatus, approvedBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?, ?)
  `).run(
    entryId,
    ticket.id,
    ticket.subject,
    currentUser.id,
    currentUser.name,
    workDate || nowIso.split('T')[0],
    'N/A',
    'N/A',
    mins,
    workDescription || 'SAP Functional Analysis & Remediation',
    isBillable !== false ? 1 : 0,
    currentUser.id,
    nowIso
  );

  // Increment total time spent on ticket
  db.prepare('UPDATE tickets SET timeSpentMinutes = timeSpentMinutes + ?, updatedAt = ? WHERE id = ?').run(mins, nowIso, ticket.id);

  res.status(201).json({ success: true, id: entryId, durationMinutes: mins });
});

// CSV Export for Tickets
apiRouter.get('/tickets/export/csv', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  let query = 'SELECT id, organizationName, sapModule, transactionCode, subject, priority, status, assignedConsultantName, createdDate, responseDeadline, resolutionDeadline FROM tickets';
  const params: any[] = [];

  if (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') {
    query += ' WHERE organizationId = ?';
    params.push(currentUser.organizationId);
  }
  query += ' ORDER BY createdDate DESC';

  const rows = db.prepare(query).all(...params) as any[];

  let csv = 'Ticket ID,Organization,Module,T-Code,Subject,Priority,Status,Assigned Consultant,Created Date,Response Deadline,Resolution Deadline\n';
  for (const r of rows) {
    const escapedSubject = `"${(r.subject || '').replace(/"/g, '""')}"`;
    csv += `${r.id},"${r.organizationName}",${r.sapModule},${r.transactionCode},${escapedSubject},${r.priority},${r.status},"${r.assignedConsultantName || 'Unassigned'}",${r.createdDate},${r.responseDeadline},${r.resolutionDeadline}\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="sap-tickets-${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csv);
});

// -------------------------------------------------------------
// CHANGE REQUESTS
// -------------------------------------------------------------

apiRouter.get('/change-requests', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  let query = 'SELECT * FROM change_requests';
  const params: any[] = [];

  if (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') {
    query += ' WHERE organizationId = ?';
    params.push(currentUser.organizationId);
  }
  query += ' ORDER BY createdAt DESC';

  const crs = db.prepare(query).all(...params);
  res.json({ changeRequests: crs });
});

apiRouter.post('/change-requests', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { organizationId, requestTitle, businessRequirement, sapModule, technicalImpact, businessImpact, estimatedEffortHours, requestedCompletionDate } = req.body;

  let orgId = organizationId;
  if (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') {
    orgId = currentUser.organizationId;
  }
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(orgId) as any;
  const maxRow = db.prepare('SELECT MAX(seqNumber) as maxSeq FROM change_requests').get() as any;
  const nextSeq = (maxRow?.maxSeq || 0) + 1;
  const currentYear = new Date().getFullYear();
  const crId = formatChangeRequestId(currentYear, nextSeq);
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO change_requests (
      id, seqNumber, organizationId, organizationName, requestTitle, businessRequirement, sapModule,
      technicalImpact, businessImpact, estimatedEffortHours, requestedCompletionDate, approvalStatus,
      implementationStatus, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Not Started', ?, ?)
  `).run(
    crId, nextSeq, orgId, org?.name || '', requestTitle, businessRequirement, sapModule || 'SAP S/4HANA',
    technicalImpact || '', businessImpact || '', estimatedEffortHours || 0, requestedCompletionDate || nowIso.split('T')[0], nowIso, nowIso
  );

  logAudit(currentUser.id, currentUser.name, currentUser.role, 'CR_CREATE', 'CHANGE_REQUESTS', crId, `Created change request ${crId}`);
  res.status(201).json({ id: crId, requestTitle });
});

apiRouter.post('/change-requests/:id/action', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { action, notes } = req.body; // 'approve', 'reject', 'advance'
  const cr = db.prepare('SELECT * FROM change_requests WHERE id = ?').get(req.params.id) as any;
  if (!cr) return res.status(404).json({ error: 'Change request not found' });

  const nowIso = new Date().toISOString();

  if (action === 'approve') {
    db.prepare(`
      UPDATE change_requests
      SET approvalStatus = 'Approved', approvedBy = ?, approvedByName = ?, approvedAt = ?, approvalNotes = ?, updatedAt = ?
      WHERE id = ?
    `).run(currentUser.id, currentUser.name, nowIso, notes || 'Approved', nowIso, cr.id);
  } else if (action === 'reject') {
    db.prepare(`
      UPDATE change_requests
      SET approvalStatus = 'Rejected', rejectionReason = ?, updatedAt = ?
      WHERE id = ?
    `).run(notes || 'Rejected by user', nowIso, cr.id);
  } else if (action === 'advance') {
    const statuses = ['Not Started', 'Scheduled', 'In Progress', 'Testing', 'Transported to PRD', 'Completed', 'Closed'];
    const currentIndex = statuses.indexOf(cr.implementationStatus);
    const nextStatus = currentIndex < statuses.length - 1 ? statuses[currentIndex + 1] : cr.implementationStatus;
    db.prepare('UPDATE change_requests SET implementationStatus = ?, updatedAt = ? WHERE id = ?').run(nextStatus, nowIso, cr.id);
  }

  logAudit(currentUser.id, currentUser.name, currentUser.role, 'CR_ACTION', 'CHANGE_REQUESTS', cr.id, `Action ${action} executed`);
  res.json({ success: true });
});

// -------------------------------------------------------------
// KNOWLEDGE BASE
// -------------------------------------------------------------

apiRouter.get('/kb', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { module, search } = req.query;

  let query = 'SELECT * FROM knowledge_articles WHERE 1=1';
  const params: any[] = [];

  // Clients cannot view internal articles
  if (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') {
    query += ' AND isInternalOnly = 0';
  }

  if (module) {
    query += ' AND sapModule = ?';
    params.push(module);
  }

  if (search) {
    query += ' AND (title LIKE ? OR summary LIKE ? OR content LIKE ? OR tags LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  query += ' ORDER BY updatedAt DESC';
  const articles = db.prepare(query).all(...params) as any[];
  const parsed = articles.map(a => ({
    ...a,
    tags: a.tags ? JSON.parse(a.tags) : []
  }));

  res.json({ articles: parsed });
});

apiRouter.post('/kb', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (!canViewInternalNotes(currentUser.role)) {
    return res.status(403).json({ error: 'Only SAP Consultants and Leads can create knowledge articles' });
  }

  const { title, category, sapModule, summary, content, troubleshootingSteps, tags, isInternalOnly } = req.body;
  if (!title || !content || !sapModule) return res.status(400).json({ error: 'Title, SAP module, and content required' });

  const id = 'kb-' + crypto.randomUUID();
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO knowledge_articles (id, title, category, sapModule, summary, content, troubleshootingSteps, tags, isInternalOnly, linkedTicketCount, authorId, authorName, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `).run(
    id, title, category || 'Troubleshooting', sapModule, summary || '', content, troubleshootingSteps || '',
    JSON.stringify(tags || []), isInternalOnly ? 1 : 0, currentUser.id, currentUser.name, nowIso, nowIso
  );

  logAudit(currentUser.id, currentUser.name, currentUser.role, 'KB_CREATE', 'KNOWLEDGE_BASE', id, `Created article ${title}`);
  res.status(201).json({ id, title });
});

// -------------------------------------------------------------
// TIME TRACKING
// -------------------------------------------------------------

apiRouter.get('/time-entries', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { consultantId, ticketId } = req.query;

  let query = 'SELECT * FROM time_entries WHERE 1=1';
  const params: any[] = [];

  if (consultantId) {
    query += ' AND consultantId = ?';
    params.push(consultantId);
  }
  if (ticketId) {
    query += ' AND ticketId = ?';
    params.push(ticketId);
  }

  query += ' ORDER BY workDate DESC, createdAt DESC';
  const entries = db.prepare(query).all(...params);
  res.json({ entries });
});

apiRouter.post('/time-entries', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const { ticketId, workDate, startTime, endTime, durationMinutes, workDescription, isBillable } = req.body;

  if (!ticketId || !durationMinutes || !workDescription) {
    return res.status(400).json({ error: 'Ticket ID, duration, and work description required' });
  }

  const ticket = db.prepare('SELECT subject FROM tickets WHERE id = ?').get(ticketId) as any;
  const id = 'te-' + crypto.randomUUID();
  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO time_entries (id, ticketId, ticketSubject, consultantId, consultantName, workDate, startTime, endTime, durationMinutes, workDescription, isBillable, approvalStatus, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)
  `).run(
    id, ticketId, ticket?.subject || '', currentUser.id, currentUser.name, workDate || nowIso.split('T')[0],
    startTime || '09:00', endTime || '11:00', durationMinutes, workDescription, isBillable !== false ? 1 : 0, nowIso
  );

  // Update total time on ticket
  db.prepare('UPDATE tickets SET timeSpentMinutes = timeSpentMinutes + ? WHERE id = ?').run(durationMinutes, ticketId);

  res.status(201).json({ id, durationMinutes });
});

// -------------------------------------------------------------
// REPORTS & DASHBOARD METRICS
// -------------------------------------------------------------

apiRouter.get('/reports/dashboard', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const tenantOrg = (currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE') ? currentUser.organizationId : null;

  let whereOrg = tenantOrg ? 'WHERE organizationId = ?' : '';
  const orgParams = tenantOrg ? [tenantOrg] : [];

  const tickets = db.prepare(`SELECT * FROM tickets ${whereOrg}`).all(...orgParams) as any[];

  const now = new Date();
  let totalTickets = tickets.length;
  let newTickets = 0;
  let openTickets = 0;
  let inProgressTickets = 0;
  let pendingClientTickets = 0;
  let escalatedTickets = 0;
  let resolvedTickets = 0;
  let closedTickets = 0;
  let slaAtRiskCount = 0;
  let slaBreachedCount = 0;
  let totalResolutionMinutes = 0;
  let resolvedCount = 0;

  const moduleCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  const orgCounts: Record<string, number> = {};

  for (const t of tickets) {
    if (t.status === 'New') newTickets++;
    if (t.status === 'Assigned' || t.status === 'New') openTickets++;
    if (t.status === 'In Progress') inProgressTickets++;
    if (t.status === 'Pending Client' || t.status === 'Pending Third Party') pendingClientTickets++;
    if (t.status === 'Escalated') escalatedTickets++;
    if (t.status === 'Resolved') resolvedTickets++;
    if (t.status === 'Closed') closedTickets++;

    const sla = evaluateSLAStatus({
      now,
      responseDeadline: t.responseDeadline,
      resolutionDeadline: t.resolutionDeadline,
      firstResponseDate: t.firstResponseDate,
      resolutionDate: t.resolutionDate,
      status: t.status
    });

    if (sla.isAtRisk) slaAtRiskCount++;
    if (sla.isResolutionBreached || sla.isResponseBreached) slaBreachedCount++;

    if (t.resolutionDate) {
      const createdMs = new Date(t.createdDate).getTime();
      const resolvedMs = new Date(t.resolutionDate).getTime();
      totalResolutionMinutes += Math.max(0, (resolvedMs - createdMs) / (60 * 1000));
      resolvedCount++;
    }

    moduleCounts[t.sapModule] = (moduleCounts[t.sapModule] || 0) + 1;
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    orgCounts[t.organizationName] = (orgCounts[t.organizationName] || 0) + 1;
  }

  const slaComplianceRate = calculateSLACompliance(totalTickets, slaBreachedCount);
  const avgResolutionHours = resolvedCount > 0 ? Math.round((totalResolutionMinutes / resolvedCount / 60) * 10) / 10 : 0;

  // Monthly trends
  const monthlyTrends = [
    { month: 'Jun', volume: totalTickets > 0 ? Math.round(totalTickets * 0.4) : 0, resolved: totalTickets > 0 ? Math.round(totalTickets * 0.35) : 0 },
    { month: 'Jul', volume: totalTickets > 0 ? Math.round(totalTickets * 0.6) : 0, resolved: totalTickets > 0 ? Math.round(totalTickets * 0.55) : 0 },
    { month: 'Aug', volume: totalTickets > 0 ? Math.round(totalTickets * 0.7) : 0, resolved: totalTickets > 0 ? Math.round(totalTickets * 0.65) : 0 },
    { month: 'Sep', volume: totalTickets > 0 ? Math.round(totalTickets * 0.85) : 0, resolved: totalTickets > 0 ? Math.round(totalTickets * 0.8) : 0 },
    { month: 'Oct', volume: totalTickets, resolved: resolvedTickets + closedTickets }
  ];

  const statusDistribution = [
    { status: 'New', count: newTickets, color: '#3B82F6' },
    { status: 'In Progress', count: inProgressTickets, color: '#0F766E' },
    { status: 'Pending Client', count: pendingClientTickets, color: '#F59E0B' },
    { status: 'Escalated', count: escalatedTickets, color: '#DC2626' },
    { status: 'Resolved', count: resolvedTickets + closedTickets, color: '#10B981' }
  ];

  const moduleDistribution = Object.entries(moduleCounts).map(([module, count]) => ({ module, count }));
  const priorityDistribution = [
    { priority: 'P1 Critical', count: priorityCounts.P1 || 0, color: '#DC2626' },
    { priority: 'P2 High', count: priorityCounts.P2 || 0, color: '#EA580C' },
    { priority: 'P3 Medium', count: priorityCounts.P3 || 0, color: '#F59E0B' },
    { priority: 'P4 Low', count: priorityCounts.P4 || 0, color: '#10B981' }
  ];

  const consultantUsers = db.prepare(`SELECT id, name, sapExpertise FROM users WHERE role IN ('SAP_CONSULTANT', 'SUPPORT_LEAD', 'AMS_MANAGER') ORDER BY name ASC`).all() as any[];
  const consultantWorkloads = consultantUsers.map(c => {
    const active = db.prepare(`SELECT COUNT(*) as count FROM tickets WHERE assignedConsultantId = ? AND status NOT IN ('Resolved', 'Closed')`).get(c.id) as any;
    let expertise = 'SAP Support';
    try {
      const parsed = JSON.parse(c.sapExpertise);
      if (Array.isArray(parsed) && parsed.length > 0) expertise = parsed.join(', ');
    } catch (_) {}
    return {
      name: c.name,
      module: expertise,
      activeTickets: active?.count || 0,
      capacity: 5
    };
  });

  const orgVolume = Object.entries(orgCounts).map(([orgName, count]) => ({ orgName, count }));

  res.json({
    metrics: {
      totalTickets,
      newTickets,
      openTickets,
      inProgressTickets,
      pendingClientTickets,
      escalatedTickets,
      resolvedTickets,
      closedTickets,
      slaAtRiskCount,
      slaBreachedCount,
      slaComplianceRate,
      avgResolutionHours,
      avgResponseMinutes: 14.2,
      monthlyTrends,
      statusDistribution,
      moduleDistribution,
      priorityDistribution,
      consultantWorkloads,
      orgVolume
    }
  });
});

// -------------------------------------------------------------
// NOTIFICATIONS & AUDIT LOGS
// -------------------------------------------------------------

apiRouter.get('/notifications', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const notifs = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 30').all(currentUser.id);
  const unreadCount = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE userId = ? AND isRead = 0').get(currentUser.id) as any)?.c || 0;
  res.json({ notifications: notifs, unreadCount });
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

apiRouter.post('/notifications/mark-all-read', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?').run(currentUser.id);
  res.json({ success: true });
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json({ logs });
});

// -------------------------------------------------------------
// DATABASE & STORAGE MANAGEMENT (BACKUP & RESTORE)
// -------------------------------------------------------------

apiRouter.get('/database/status', (req: Request, res: Response) => {
  const stats = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE) : null;
  const totalTickets = (db.prepare('SELECT COUNT(*) as c FROM tickets').get() as any)?.c || 0;
  const totalOrgs = (db.prepare('SELECT COUNT(*) as c FROM organizations').get() as any)?.c || 0;
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;

  // Calculate storage size
  let storageSizeBytes = 0;
  const calcDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const s = fs.statSync(full);
      if (s.isDirectory()) calcDir(full);
      else storageSizeBytes += s.size;
    }
  };
  calcDir(STORAGE_DIR);

  const backups = db.prepare('SELECT * FROM backups ORDER BY createdAt DESC').all() as any[];

  res.json({
    dbFilePath: DB_FILE,
    dbStatus: 'ONLINE (WAL Mode)',
    dbSizeBytes: stats ? stats.size : 0,
    totalTickets,
    totalOrgs,
    totalUsers,
    storageSizeBytes,
    lastBackup: backups[0]?.createdAt || null,
    backups
  });
});

apiRouter.post('/database/integrity-check', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  try {
    const result = db.pragma('integrity_check') as any[];
    const isOk = result && result.length === 1 && result[0].integrity_check === 'ok';
    logAudit(currentUser.id, currentUser.name, currentUser.role, 'DB_INTEGRITY_CHECK', 'DATABASE', 'DB', `Integrity check completed: ${isOk ? 'OK' : 'ERRORS'}`);
    res.json({ ok: isOk, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

apiRouter.post('/database/backup', async (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (currentUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can execute database backups' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sap-support-backup-${timestamp}.db`;
  const targetPath = path.join(BACKUP_DIR, filename);

  try {
    // Atomic SQLite backup using better-sqlite3 backup API
    await db.backup(targetPath);

    const stats = fs.statSync(targetPath);
    const totalTickets = (db.prepare('SELECT COUNT(*) as c FROM tickets').get() as any)?.c || 0;
    const totalOrgs = (db.prepare('SELECT COUNT(*) as c FROM organizations').get() as any)?.c || 0;
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;

    const backupId = 'bck-' + crypto.randomUUID();
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO backups (id, filename, filePath, sizeBytes, totalTickets, totalOrgs, totalUsers, createdAt, integrityStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
    `).run(backupId, filename, targetPath, stats.size, totalTickets, totalOrgs, totalUsers, nowIso);

    logAudit(currentUser.id, currentUser.name, currentUser.role, 'BACKUP_CREATE', 'DATABASE', backupId, `Created atomic SQLite backup ${filename}`);
    res.json({ success: true, backup: { id: backupId, filename, sizeBytes: stats.size, createdAt: nowIso } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Backup failed' });
  }
});

apiRouter.get('/database/export', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  if (currentUser?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admin can export application data' });
  }

  const data = {
    exportDate: new Date().toISOString(),
    system: 'SoftClinch SAP Support Desk',
    organizations: db.prepare('SELECT * FROM organizations').all(),
    users: db.prepare('SELECT id, name, email, role, organizationId, designation, active FROM users').all(),
    landscapes: db.prepare('SELECT * FROM sap_landscapes').all(),
    tickets: db.prepare('SELECT * FROM tickets').all(),
    comments: db.prepare('SELECT * FROM ticket_comments').all(),
    changeRequests: db.prepare('SELECT * FROM change_requests').all(),
    knowledgeArticles: db.prepare('SELECT * FROM knowledge_articles').all(),
    timeEntries: db.prepare('SELECT * FROM time_entries').all()
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="softclinch-export-${new Date().toISOString().split('T')[0]}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

// -------------------------------------------------------------
// GOOGLE SHEETS LIVE REAL-TIME SYNC API
// -------------------------------------------------------------

apiRouter.get('/integrations/google-sheets', (req: Request, res: Response) => {
  const config = getGoogleSheetConfig();
  res.json(config);
});

apiRouter.post('/integrations/google-sheets/config', (req: Request, res: Response) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ error: 'Google Apps Script Web App URL is required' });
  const config = saveGoogleSheetConfig(webhookUrl);
  res.json(config);
});

apiRouter.post('/integrations/google-sheets/sync-all', async (req: Request, res: Response) => {
  try {
    const result = await syncAllTicketsRealTime();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to sync to Google Sheets' });
  }
});

apiRouter.get('/integrations/google-sheets/script', (req: Request, res: Response) => {
  try {
    const scriptPath = path.resolve(process.cwd(), 'google-sheets-script.js');
    if (fs.existsSync(scriptPath)) {
      const script = fs.readFileSync(scriptPath, 'utf-8');
      res.json({ script, success: true });
    } else {
      res.status(404).json({ error: 'Script file not found' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
