# SoftClinch SAP Support Desk
### Enterprise Local-First SAP AMS Ticket Management System

**Company:** SoftClinch Consulting Services  
**Application:** SoftClinch SAP Support Desk  
**Version:** 2.4.0 (LTS Local-First Edition)  

---

## 1. System Architecture Overview

SoftClinch SAP Support Desk is a local-first enterprise IT Service Management (ITSM) system built for SAP Application Management Services (AMS). It operates with zero dependencies on external cloud backends, storing all client organizations, confidential SAP ticket logs, consultants, SLA matrices, and file attachments directly on the local machine.

- **Frontend:** React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend:** Node.js, Express, Vite Dev Middleware
- **Database:** SQLite (`./database/sap-support.db`) with Write-Ahead Logging (WAL) and enforced Foreign Keys
- **File Storage:** Local filesystem storage (`./storage/`) with isolated directories for tickets, attachments, client-documents, reports, and profile images
- **Backups:** Atomic SQLite snapshot backups (`./backups/`) with `PRAGMA integrity_check` verification

---

## 2. Directory Structure

```
softclinch-sap-support/
├── database/
│   └── sap-support.db             # Local SQLite database
├── storage/
│   ├── tickets/                   # Ticket attachments & system dumps
│   ├── attachments/               # General document uploads
│   ├── client-documents/          # Client SLA contracts & agreements
│   ├── reports/                   # Monthly PDF/CSV audit reports
│   └── profile-images/            # Consultant profile photos
├── backups/                       # Timestamped verified atomic backups
├── src/
│   ├── components/                # Modular UI components (Dashboard, Tickets, Landscapes, etc.)
│   ├── server/                    # Express API router, SQLite schema, pure logic, & seed data
│   ├── services/                  # Frontend API client
│   └── types/                     # Enterprise TypeScript interfaces
├── server.ts                      # Express & Vite unified entrypoint
├── package.json
└── README.md
```

---

## 3. Installation & Local Execution

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Database Initialization & Seeding
The database tables and master data are automatically initialized on server startup, or you can run:
```bash
npx tsx server.ts
```

The database will be created at `./database/sap-support.db` with sample enterprise data:
- **Client Organizations:** Acme Industrial Corp, Global Retail Logistics, PharmaCare Solutions
- **SAP Landscapes:** S/4HANA 2023 PRD/QAS/DEV (SID: P01, Q01, D01), SAP ECC 6.0 EHP8 (SID: ERP), SAP BW/4HANA (SID: BWP)
- **Consultants:** FI/CO Senior Consultant, MM/SD Lead, BASIS Architect

### Step 3: Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### Step 4: Production Build
```bash
npm run build
npm start
```

---

## 4. User Roles & Pre-configured Accounts

Use the **Role / User Switcher** in the top-right header or the **Select Demo Credentials** shortcuts on the login screen:

### Management & Internal Staff (Password for all: `Password123!`)
| Role | Name | Email | Default Password | Permissions |
|---|---|---|---|---|
| **SUPER_ADMIN** | Muthu | `muthu.admin@softclinch.com` | `Password123!` | Complete administrative access, backups, audit logs, all organizations |
| **AMS_MANAGER** | Krishnan | `krishnan.ams@softclinch.com` | `Password123!` | Client oversight, consultant assignment, CR approval |
| **SUPPORT_LEAD** | Venkat | `venkat.lead@softclinch.com` | `Password123!` | Incident triage, engineer reassignments, escalation reviews |
| **SAP_CONSULTANT** | Anand | `anand.consultant@softclinch.com` | `Password123!` | Principal SAP Solutions Architect, BASIS & HANA tuning |
| **SAP_CONSULTANT** | Mahendran 2 | `mahendran2.consultant@softclinch.com` | `Password123!` | Senior FI/CO & MM Consultant, timesheets, internal notes |

### Client Organizations (Password for all: `Password123!`)
| Role | Name | Organization | Email | Default Password | Permissions |
|---|---|---|---|---|---|
| **CLIENT_ADMIN** | Pradeep | Acme Industrial Corp | `pradeep.admin@acmeind.com` | `Password123!` | Acme Industrial tickets, change requests, approvals |
| **CLIENT_EMPLOYEE**| Ashwin | Acme Industrial Corp | `ashwin@acmeind.com` | `Password123!` | Raise Acme tickets, view permitted tickets, comment |
| **CLIENT_ADMIN** | Madan | Global Retail Logistics | `madan.admin@globalretail.com` | `Password123!` | Global Retail tickets, change requests, approvals |
| **CLIENT_EMPLOYEE**| Mahendran | Global Retail Logistics | `mahendran@globalretail.com` | `Password123!` | Raise Global Retail tickets, view permitted tickets |

---

## 4.1 Google Sheets Format Ticket Register (Two Sheets: Tickets & Solved)

SoftClinch includes an interactive **Google Sheets-style tabular register** accessible from both the **Customer Portal** and the **Management Portal**:

- **Sheet 1 (`Active Tickets`):** Displays all open and active incidents (`New`, `Assigned`, `In Progress`, `Pending Client`, `Escalated`) with real-time columns: Ticket ID, Date, Client Organization, Contact, Module, System SID, T-Code, Subject, Priority, Status, Consultant, and SLA Deadline.
- **Sheet 2 (`Solved Tickets`):** Displays all resolved and closed tickets (`Resolved`, `Closed`) with resolution details: Ticket ID, Solved Date, Organization, Module, Subject, Root Cause, Resolution Summary, Time Spent, Solved By, and SLA Met compliance.
- **Interactive features:**
  - **Inline Status Transition:** Marking an active ticket as `Resolved` in Sheet 1 instantly transitions and moves it to the `Solved` sheet.
  - **Add Row / Quick Form:** Click `Add Row / Ticket` to submit a new ticket directly into the SQLite database and spreadsheet.
  - **Export CSV & Copy TSV:** Click `Copy to Sheets` to copy tab-separated values ready to paste (Ctrl+V) directly into Google Sheets or Microsoft Excel.

---

## 5. Backup & Restore Procedures

### Running an Atomic Backup
1. Navigate to **Administration > Database & Backups** in the sidebar (Super Admin).
2. Click **Backup Database Now**.
3. An atomic SQLite backup is written to `./backups/sap-support-backup-<timestamp>.db`.

### Database Integrity Verification
Click **Run PRAGMA integrity_check** on the Database Management screen. The system runs SQLite's native validation against page allocation and indexes to confirm zero corruption.

### Exporting Application Data
Click **Export JSON Dump** to download an immutable snapshot of all database tables.

---

## 6. SLA Engine Policies

Default SLA targets configured according to ITIL best practices:
- **P1 Critical:** 15-minute response | 4-hour resolution (24x7 Continuous)
- **P2 High:** 30-minute response | 8-hour resolution (24x7 Continuous)
- **P3 Medium:** 4-hour response | 2 business days (8x5 Working Hours)
- **P4 Low:** 1 business day | 5 business days (8x5 Working Hours)

*Tickets in "Pending Client" status automatically pause active resolution countdowns.*

---

## 7. Troubleshooting

- **Database Locked (`SQLITE_BUSY`):** SoftClinch enables SQLite Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) by default to allow concurrent readers while writing.
- **Port 3000 In Use:** Set custom port via `PORT=3001 npm run dev`.
- **Reset Database to Fresh Seed:** Delete `./database/sap-support.db` and restart the application.
