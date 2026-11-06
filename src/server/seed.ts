import bcrypt from 'bcryptjs';
import { db } from './db.ts';

export async function seedDatabase(force = false) {
  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0 && !force) {
    return;
  }

  // Clear existing if force
  if (force) {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM notifications;
      DELETE FROM time_entries;
      DELETE FROM knowledge_articles;
      DELETE FROM change_requests;
      DELETE FROM ticket_history;
      DELETE FROM ticket_attachments;
      DELETE FROM ticket_comments;
      DELETE FROM tickets;
      DELETE FROM sla_policies;
      DELETE FROM sap_landscapes;
      DELETE FROM users;
      DELETE FROM organizations;
    `);
  }

  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);
  const now = new Date();
  const nowIso = now.toISOString();

  // Organizations
  const insertOrg = db.prepare(`
    INSERT INTO organizations (
      id, name, code, industry, address, primaryContact, contactEmail, contactNumber,
      contractStartDate, contractEndDate, supportPlan, supportHours, status, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertOrg.run(
    'org-acme',
    'Acme Industrial Corp',
    'ACME',
    'Heavy Machinery & Industrial Equipment',
    '100 Enterprise Way, Suite 400, Chicago, IL',
    'Pradeep',
    'pradeep.admin@acmeind.com',
    '+1 (312) 555-0142',
    '2025-01-01',
    '2027-12-31',
    'Enterprise Platinum',
    '24/7 Premium Support (15m P1 SLA)',
    'ACTIVE',
    nowIso
  );

  insertOrg.run(
    'org-grl',
    'Global Retail Logistics',
    'GRL',
    'Retail, Warehousing & Supply Chain',
    '850 Harbor Blvd, Long Beach, CA',
    'Madan',
    'madan.admin@globalretail.com',
    '+1 (562) 555-0199',
    '2024-06-01',
    '2026-12-31',
    'Standard Gold',
    '16/5 Business Support (30m P1 SLA)',
    'ACTIVE',
    nowIso
  );

  insertOrg.run(
    'org-pharma',
    'PharmaCare Solutions',
    'PHARMA',
    'Pharmaceuticals & Medical Devices',
    '45 BioTech Parkway, Cambridge, MA',
    'Dr. Elena Rostova',
    'elena.rostova@pharmacare.com',
    '+1 (617) 555-0187',
    '2025-03-01',
    '2028-02-28',
    'Enterprise Platinum',
    '24/7 GxP Validated Support',
    'ACTIVE',
    nowIso
  );

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, passwordHash, role, organizationId, organizationName,
      designation, sapExpertise, experienceYears, phone, active, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // --- INTERNAL / AMS TEAM (4 Users + Admin) ---
  // 1. Super Admin: Muthu
  insertUser.run(
    'usr-superadmin',
    'Muthu',
    'muthu.admin@softclinch.com',
    defaultPasswordHash,
    'SUPER_ADMIN',
    null,
    'SoftClinch Global',
    'Director of SAP AMS Operations (Super Admin)',
    JSON.stringify(['SAP S/4HANA', 'SAP BASIS', 'SAP FI', 'SAP MM', 'SAP Architecture']),
    18,
    '+1 (555) 010-0001',
    1,
    nowIso
  );

  // 2. AMS Manager: Krishnan
  insertUser.run(
    'usr-manager',
    'Krishnan',
    'krishnan.ams@softclinch.com',
    defaultPasswordHash,
    'AMS_MANAGER',
    null,
    'SoftClinch Global',
    'Senior AMS Engagement Manager',
    JSON.stringify(['SAP S/4HANA', 'SAP SD', 'SAP MM', 'ITIL V4', 'SLA Governance']),
    12,
    '+1 (555) 010-0002',
    1,
    nowIso
  );

  // 3. Support Lead: Venkat
  insertUser.run(
    'usr-lead',
    'Venkat',
    'venkat.lead@softclinch.com',
    defaultPasswordHash,
    'SUPPORT_LEAD',
    null,
    'SoftClinch Global',
    'SAP Technical Support Lead',
    JSON.stringify(['SAP BASIS', 'SAP ABAP', 'SAP Integration Suite', 'Performance Tuning']),
    10,
    '+1 (555) 010-0003',
    1,
    nowIso
  );

  // 4. Principal Consultant: Anand
  insertUser.run(
    'usr-anand',
    'Anand',
    'anand.consultant@softclinch.com',
    defaultPasswordHash,
    'SAP_CONSULTANT',
    null,
    'SoftClinch Global',
    'Principal SAP Solutions Architect',
    JSON.stringify(['SAP BASIS', 'SAP HANA', 'SAP ABAP', 'System Security', 'Solution Manager']),
    14,
    '+1 (555) 010-0006',
    1,
    nowIso
  );

  // --- CONSULTANT ---
  // 5. SAP Consultant: Mahendran 2
  insertUser.run(
    'usr-mahendran2',
    'Mahendran 2',
    'mahendran2.consultant@softclinch.com',
    defaultPasswordHash,
    'SAP_CONSULTANT',
    null,
    'SoftClinch Global',
    'Senior SAP FI/CO & MM Consultant',
    JSON.stringify(['SAP FI', 'SAP CO', 'SAP MM', 'New GL', 'Asset Accounting', 'Inventory']),
    9,
    '+1 (555) 010-0004',
    1,
    nowIso
  );

  // --- CLIENT USERS (4 Users) ---
  // 6. Client Admin: Pradeep (Acme Industrial)
  insertUser.run(
    'usr-client-acme-admin',
    'Pradeep',
    'pradeep.admin@acmeind.com',
    defaultPasswordHash,
    'CLIENT_ADMIN',
    'org-acme',
    'Acme Industrial Corp',
    'IT Director & SAP Product Owner',
    JSON.stringify(['Client IT', 'ERP Operations']),
    15,
    '+1 (312) 555-0142',
    1,
    nowIso
  );

  // 7. Client Employee: Ashwin (Acme Industrial)
  insertUser.run(
    'usr-client-acme-user',
    'Ashwin',
    'ashwin@acmeind.com',
    defaultPasswordHash,
    'CLIENT_EMPLOYEE',
    'org-acme',
    'Acme Industrial Corp',
    'Procurement & Operations Lead',
    JSON.stringify(['Procurement', 'Material Requirements']),
    6,
    '+1 (312) 555-0143',
    1,
    nowIso
  );

  // 8. Client Admin: Madan (Global Retail Logistics)
  insertUser.run(
    'usr-client-grl-admin',
    'Madan',
    'madan.admin@globalretail.com',
    defaultPasswordHash,
    'CLIENT_ADMIN',
    'org-grl',
    'Global Retail Logistics',
    'Head of Enterprise Systems',
    JSON.stringify(['Retail Systems', 'Logistics']),
    11,
    '+1 (562) 555-0199',
    1,
    nowIso
  );

  // 9. Client Employee: Mahendran (Global Retail Logistics)
  insertUser.run(
    'usr-client-grl-user',
    'Mahendran',
    'mahendran@globalretail.com',
    defaultPasswordHash,
    'CLIENT_EMPLOYEE',
    'org-grl',
    'Global Retail Logistics',
    'Logistics & Warehouse Operations Lead',
    JSON.stringify(['Logistics', 'Warehouse Operations']),
    7,
    '+1 (562) 555-0210',
    1,
    nowIso
  );

  // SLA Policies
  const insertSla = db.prepare(`
    INSERT INTO sla_policies (id, name, priority, responseTimeMinutes, resolutionTimeMinutes, businessHoursOnly, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertSla.run('sla-p1', 'P1 - Critical Business Disruption', 'P1', 15, 240, 0, 'Production halt, core business transaction failure, severe impact');
  insertSla.run('sla-p2', 'P2 - High Priority Impact', 'P2', 30, 480, 0, 'Significant business impact, core process degraded with no easy workaround');
  insertSla.run('sla-p3', 'P3 - Medium Priority Operational', 'P3', 240, 2880, 1, 'Standard operational issue, single user or low impact with workaround');
  insertSla.run('sla-p4', 'P4 - Low Priority / Request', 'P4', 1440, 7200, 1, 'Minor inquiry, cosmetic issue, general support or configuration query');

  // SAP Landscapes
  const insertLandscape = db.prepare(`
    INSERT INTO sap_landscapes (
      id, organizationId, organizationName, systemName, sid, sapProduct, sapVersion,
      environment, databaseType, hostingType, businessOwner, technicalContact, goLiveDate, systemStatus, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLandscape.run('ls-acme-p01', 'org-acme', 'Acme Industrial Corp', 'Acme S/4HANA Production', 'P01', 'SAP S/4HANA Enterprise', '2023 FPS01', 'Production', 'SAP HANA 2.0 SPS07', 'AWS (us-east-1)', 'Pradeep', 'Anand', '2023-04-15', 'ONLINE', nowIso);
  insertLandscape.run('ls-acme-q01', 'org-acme', 'Acme Industrial Corp', 'Acme S/4HANA Quality Assurance', 'Q01', 'SAP S/4HANA Enterprise', '2023 FPS01', 'Quality Assurance', 'SAP HANA 2.0 SPS07', 'AWS (us-east-1)', 'Pradeep', 'Anand', '2023-02-10', 'ONLINE', nowIso);
  insertLandscape.run('ls-acme-d01', 'org-acme', 'Acme Industrial Corp', 'Acme S/4HANA Development', 'D01', 'SAP S/4HANA Enterprise', '2023 FPS01', 'Development', 'SAP HANA 2.0 SPS07', 'AWS (us-east-1)', 'Pradeep', 'Anand', '2022-11-01', 'ONLINE', nowIso);
  insertLandscape.run('ls-grl-erp', 'org-grl', 'Global Retail Logistics', 'GRL Core ERP Production', 'ERP', 'SAP ECC 6.0 EHP8', 'EHP8 for SAP ERP 6.0', 'Production', 'Oracle 19c Enterprise', 'Microsoft Azure', 'Madan', 'Anand', '2021-09-01', 'ONLINE', nowIso);
  insertLandscape.run('ls-grl-bwp', 'org-grl', 'Global Retail Logistics', 'GRL Enterprise Analytics BW', 'BWP', 'SAP BW/4HANA 2021', 'BW/4HANA 2.0 SP09', 'Production', 'SAP HANA 2.0', 'Microsoft Azure', 'Madan', 'Anand', '2022-03-20', 'ONLINE', nowIso);
  insertLandscape.run('ls-pha-pha', 'org-pharma', 'PharmaCare Solutions', 'PharmaCare Validated PRD', 'PHA', 'SAP S/4HANA Life Sciences', '2022 FPS02', 'Production', 'SAP HANA 2.0', 'On-Premise Private Cloud', 'Dr. Elena Rostova', 'Anand', '2023-11-15', 'ONLINE', nowIso);

  // Knowledge Articles
  const insertKB = db.prepare(`
    INSERT INTO knowledge_articles (
      id, title, category, sapModule, summary, content, resolutionSteps,
      tags, isPublic, helpfulCount, authorId, authorName, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertKB.run(
    'kb-101',
    'Resolving ABAP Dump TSV_TNEW_PAGE_ALLOC_FAILED in SAP ECC and S/4HANA',
    'SAP BASIS Administration',
    'SAP BASIS',
    'Comprehensive guide on diagnosing roll memory exhaustion, tuning extended memory parameters, and optimizing heavy internal tables.',
    'ABAP runtime error TSV_TNEW_PAGE_ALLOC_FAILED occurs when an internal table requests additional storage from the operating system or SAP roll buffer, but no virtual memory is available within the session quote.',
    '1. Open transaction ST22 and locate the dump.\n2. Review section "Information on where terminated" to pinpoint the exact line in ABAP code.\n3. Check transaction ST02 (Tune Summary) -> Extended Memory & Roll Area usage.\n4. If occurring in custom code (Z* program), inspect for SELECT * without WHERE clause or missing FREE/CLEAR on large internal tables.\n5. If standard transaction, check SAP Note 146289 for kernel memory limits.',
    JSON.stringify(['ST22', 'MEMORY_LEAK', 'ST02', 'BASIS', 'HANA']),
    0,
    3,
    'usr-anand',
    'Anand',
    new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    nowIso
  );

  insertKB.run(
    'kb-102',
    'SAP FI: Fixing Foreign Currency Document Balance Discrepancies (F5 022)',
    'SAP FI Troubleshooting',
    'SAP FI',
    'Step-by-step resolution for document balance not zero errors during multi-currency postings and ledger group adjustments.',
    'Error F5 022 happens when sum of debits does not equal credits in transaction currency, local currency, or group currency. In S/4HANA Universal Journal (ACDOCA), rounding rules in FINSC_LD_CMP must align with currency precision.',
    '1. Verify currency configuration in T-code OB22 / FINSC_LEDGER.\n2. In T-code OB08, verify valid quotation rates for the document posting date.\n3. Check account determination for exchange rate differences in T-code OBA1 (transaction KDF).\n4. In case of clearing transactions (F-03 / F-32), ensure residual items carry matching tolerance keys.',
    JSON.stringify(['FB01', 'F5 022', 'FINANCIALS', 'CURRENCY', 'OB08']),
    0,
    5,
    'usr-mahendran2',
    'Mahendran 2',
    new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    nowIso
  );

  insertKB.run(
    'kb-103',
    'Fiori Launchpad Gateway Cache Clearing & Service Registration Checklist',
    'SAP Fiori & UX Support',
    'SAP Fiori',
    'Standard procedure for resolving blank Fiori tiles, metadata cache mismatches, and OData 403/500 errors after system upgrades.',
    'Following kernel patches or UI5 library upgrades, browser clients and SAP Web Dispatcher may retain stale UI2 catalog cache.',
    '1. Execute T-code /IWFND/CACHE_CLEANUP on Front-End Server.\n2. Execute T-code /UI2/INVAL_CACHES.\n3. Run transaction /UI2/DELETE_CACHE with scope ALL.\n4. Verify OData service status in /IWFND/MAINT_SERVICE.\n5. Test service gateway in /IWFND/GW_CLIENT.',
    JSON.stringify(['FIORI', 'GATEWAY', 'ODATA', 'CACHE', 'UI2']),
    1,
    2,
    'usr-anand',
    'Anand',
    new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    nowIso
  );

  // System Initialization Audit Log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, userId, userName, userRole, action, module, targetId, details, ipAddress, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    'audit-1',
    'usr-superadmin',
    'Muthu',
    'SUPER_ADMIN',
    'SYSTEM_INITIALIZATION',
    'SYSTEM',
    'SYSTEM',
    'SoftClinch SAP Support Desk database seeded with baseline master data',
    '127.0.0.1',
    nowIso
  );
}
