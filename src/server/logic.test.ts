import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTicketId,
  parseTicketSeq,
  formatChangeRequestId,
  calculateSLADeadlines,
  evaluateSLAStatus,
  checkTenantAccess,
  canViewInternalNotes,
  calculateSLACompliance,
  formatElapsedTime,
  formatCountdown,
  getDefaultGeneralData
} from './logic.ts';

test('formatTicketId formats sequential IDs properly', () => {
  assert.equal(formatTicketId(2026, 1), 'SAP-2026-00001');
  assert.equal(formatTicketId(2026, 42), 'SAP-2026-00042');
  assert.equal(formatTicketId(2026, 99999), 'SAP-2026-99999');
});

test('parseTicketSeq parses numeric sequence correctly', () => {
  assert.equal(parseTicketSeq('SAP-2026-00123'), 123);
  assert.equal(parseTicketSeq('INVALID-ID'), 0);
});

test('formatChangeRequestId formats CR IDs properly', () => {
  assert.equal(formatChangeRequestId(2026, 1), 'CR-2026-0001');
  assert.equal(formatChangeRequestId(2026, 75), 'CR-2026-0075');
});

test('calculateSLADeadlines computes correct response & resolution deadlines', () => {
  const baseDate = new Date('2026-01-01T10:00:00.000Z');
  const p1Deadlines = calculateSLADeadlines(baseDate, 'P1');
  // P1: 15 mins response, 240 mins (4 hrs) resolution
  assert.equal(p1Deadlines.responseDeadline, '2026-01-01T10:15:00.000Z');
  assert.equal(p1Deadlines.resolutionDeadline, '2026-01-01T14:00:00.000Z');

  const p2Deadlines = calculateSLADeadlines(baseDate, 'P2');
  // P2: 30 mins response, 480 mins (8 hrs) resolution
  assert.equal(p2Deadlines.responseDeadline, '2026-01-01T10:30:00.000Z');
  assert.equal(p2Deadlines.resolutionDeadline, '2026-01-01T18:00:00.000Z');
});

test('evaluateSLAStatus detects at-risk and breached conditions', () => {
  const base = new Date('2026-01-01T10:00:00.000Z');
  const respDeadline = '2026-01-01T10:15:00.000Z';
  const resDeadline = '2026-01-01T14:00:00.000Z';

  // 10 minutes in: response not breached, not at risk
  const check1 = evaluateSLAStatus({
    now: new Date('2026-01-01T10:10:00.000Z'),
    responseDeadline: respDeadline,
    resolutionDeadline: resDeadline,
    status: 'In Progress'
  });
  assert.equal(check1.isResponseBreached, false);
  assert.equal(check1.isResolutionBreached, false);
  assert.equal(check1.isAtRisk, false);

  // 20 minutes in with NO response yet: response breached!
  const check2 = evaluateSLAStatus({
    now: new Date('2026-01-01T10:20:00.000Z'),
    responseDeadline: respDeadline,
    resolutionDeadline: resDeadline,
    status: 'In Progress'
  });
  assert.equal(check2.isResponseBreached, true);

  // 3 hours 20 mins in (40 mins left until resolution): AT RISK!
  const check3 = evaluateSLAStatus({
    now: new Date('2026-01-01T13:20:00.000Z'),
    responseDeadline: respDeadline,
    resolutionDeadline: resDeadline,
    firstResponseDate: '2026-01-01T10:10:00.000Z',
    status: 'In Progress'
  });
  assert.equal(check3.isResponseBreached, false);
  assert.equal(check3.isAtRisk, true);
  assert.equal(check3.isResolutionBreached, false);

  // 4 hours 10 mins in: resolution breached!
  const check4 = evaluateSLAStatus({
    now: new Date('2026-01-01T14:10:00.000Z'),
    responseDeadline: respDeadline,
    resolutionDeadline: resDeadline,
    firstResponseDate: '2026-01-01T10:10:00.000Z',
    status: 'In Progress'
  });
  assert.equal(check4.isResolutionBreached, true);
});

test('checkTenantAccess enforces strict multi-tenant boundaries', () => {
  const superAdmin = { role: 'SUPER_ADMIN' as const, organizationId: null };
  const consultant = { role: 'SAP_CONSULTANT' as const, organizationId: null };
  const acmeClient = { role: 'CLIENT_ADMIN' as const, organizationId: 'org-acme' };
  const globalRetailClient = { role: 'CLIENT_EMPLOYEE' as const, organizationId: 'org-global' };

  // Admins & consultants can access any client
  assert.equal(checkTenantAccess(superAdmin, 'org-acme'), true);
  assert.equal(checkTenantAccess(consultant, 'org-acme'), true);

  // Client admin can only access their own org
  assert.equal(checkTenantAccess(acmeClient, 'org-acme'), true);
  assert.equal(checkTenantAccess(acmeClient, 'org-global'), false);

  // Client employee can only access their own org
  assert.equal(checkTenantAccess(globalRetailClient, 'org-global'), true);
  assert.equal(checkTenantAccess(globalRetailClient, 'org-acme'), false);
});

test('canViewInternalNotes restricts access to SoftClinch staff only', () => {
  assert.equal(canViewInternalNotes('SUPER_ADMIN'), true);
  assert.equal(canViewInternalNotes('AMS_MANAGER'), true);
  assert.equal(canViewInternalNotes('SUPPORT_LEAD'), true);
  assert.equal(canViewInternalNotes('SAP_CONSULTANT'), true);
  assert.equal(canViewInternalNotes('CLIENT_ADMIN'), false);
  assert.equal(canViewInternalNotes('CLIENT_EMPLOYEE'), false);
});

test('calculateSLACompliance computes accurate percentage', () => {
  assert.equal(calculateSLACompliance(100, 5), 95);
  assert.equal(calculateSLACompliance(10, 0), 100);
  assert.equal(calculateSLACompliance(20, 2), 90);
});

test('formatElapsedTime returns formatted live duration hours, minutes and seconds', () => {
  const start = new Date('2026-01-01T10:00:00.000Z');
  // 2 hours, 15 minutes, 30 seconds later
  const end = new Date('2026-01-01T12:15:30.000Z');
  assert.equal(formatElapsedTime(start, end), '02h 15m 30s');

  // Multi-day duration: 2 days, 3 hours, 4 minutes, 5 seconds
  const endMultiDay = new Date(start.getTime() + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
  assert.equal(formatElapsedTime(start, endMultiDay), '2d 03h 04m 05s');
});

test('formatCountdown calculates remaining time and overdue detection', () => {
  const target = new Date('2026-01-01T14:00:00.000Z');
  const before = new Date('2026-01-01T12:30:15.000Z');
  const res1 = formatCountdown(target, before);
  assert.equal(res1.isOverdue, false);
  assert.equal(res1.text, '01h 29m 45s');

  const after = new Date('2026-01-01T14:15:30.000Z');
  const res2 = formatCountdown(target, after);
  assert.equal(res2.isOverdue, true);
  assert.equal(res2.text, '00h 15m 30s');
});

test('getDefaultGeneralData furnishes standard SAP ITSM parameters', () => {
  const fiData = getDefaultGeneralData('SAP FI', 'P01');
  assert.equal(fiData.category, 'Incident');
  assert.equal(fiData.sapClient, '100');
  assert.equal(fiData.dbSystem, 'SAP HANA 2.0 SPS07');
  assert.ok(fiData.businessProcess.includes('Record-to-Report'));

  const devData = getDefaultGeneralData('SAP MM', 'DEV');
  assert.equal(devData.sapClient, '300');
  assert.ok(devData.businessProcess.includes('Procure-to-Pay'));
});
