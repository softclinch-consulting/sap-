import { db } from './db.ts';

export interface GoogleSheetConfig {
  webhookUrl: string;
  enabled: boolean;
  lastSync: string | null;
  totalSyncedCount?: number;
}

// Get current Google Sheets sync configuration
export function getGoogleSheetConfig(): GoogleSheetConfig {
  try {
    const urlRow = db.prepare("SELECT value FROM app_settings WHERE key = 'google_sheet_webhook_url'").get() as any;
    const lastSyncRow = db.prepare("SELECT value FROM app_settings WHERE key = 'google_sheet_last_sync'").get() as any;
    const webhookUrl = urlRow ? urlRow.value : '';

    return {
      webhookUrl,
      enabled: Boolean(webhookUrl && webhookUrl.startsWith('http')),
      lastSync: lastSyncRow ? lastSyncRow.value : null
    };
  } catch (err) {
    return {
      webhookUrl: '',
      enabled: false,
      lastSync: null
    };
  }
}

// Save Google Sheets webhook URL
export function saveGoogleSheetConfig(webhookUrl: string): GoogleSheetConfig {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO app_settings (key, value, updatedAt)
    VALUES ('google_sheet_webhook_url', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(webhookUrl.trim(), now);

  return getGoogleSheetConfig();
}

// Real-time synchronization of a single ticket (on create or update)
export async function syncTicketRealTime(ticketId: string): Promise<boolean> {
  const config = getGoogleSheetConfig();
  if (!config.enabled || !config.webhookUrl) return false;

  try {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return false;

    // Fire and forget or await without blocking main thread
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPSERT_TICKET',
        ticket: {
          id: ticket.id,
          createdDate: ticket.createdDate,
          updatedAt: ticket.updatedAt,
          organizationName: ticket.organizationName,
          clientContactName: ticket.clientContactName,
          sapModule: ticket.sapModule,
          sapSystemSid: ticket.sapSystemSid,
          transactionCode: ticket.transactionCode,
          subject: ticket.subject,
          priority: ticket.priority,
          status: ticket.status,
          assignedConsultantName: ticket.assignedConsultantName,
          resolutionDeadline: ticket.resolutionDeadline,
          resolutionDate: ticket.resolutionDate,
          rootCause: ticket.rootCause,
          resolutionSummary: ticket.resolutionSummary,
          timeSpentMinutes: ticket.timeSpentMinutes
        }
      }),
      redirect: 'follow'
    });

    return response.ok;
  } catch (err) {
    console.warn('[Google Sheets Sync] Real-time sync failed:', err);
    return false;
  }
}

// Real-time mass sync of all tickets to both sheets (Tickets & Solved)
export async function syncAllTicketsRealTime(): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetConfig();
  if (!config.enabled || !config.webhookUrl) {
    throw new Error('Google Sheets Webhook URL is not configured. Please paste your Google Apps Script URL.');
  }

  const allTickets = db.prepare('SELECT * FROM tickets ORDER BY createdDate DESC').all() as any[];

  const activeTickets = allTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  const solvedTickets = allTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');

  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'SYNC_ALL',
      activeTickets: activeTickets.map(formatForSync),
      solvedTickets: solvedTickets.map(formatForSync)
    }),
    redirect: 'follow'
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Google Sheets responded with HTTP ${response.status} (Unauthorized). In Apps Script, click Deploy > Manage deployments > Edit > set 'Who has access' to 'Anyone' so the app can store data.`);
    }
    throw new Error(`Google Sheets responded with HTTP status ${response.status}`);
  }

  const responseText = await response.text();
  let result: any = {};
  try {
    result = JSON.parse(responseText);
  } catch (_) {
    if (responseText.includes('accounts.google.com') || responseText.includes('signin')) {
      throw new Error("Google blocked access with login redirect. In Apps Script, set 'Who has access' to 'Anyone' (not 'Only myself').");
    }
    throw new Error(`Google Sheets returned non-JSON response: ${responseText.slice(0, 120)}`);
  }

  const now = new Date().toISOString();

  // Save last sync time
  db.prepare(`
    INSERT INTO app_settings (key, value, updatedAt)
    VALUES ('google_sheet_last_sync', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(now, now);

  return {
    success: true,
    message: result.message || `Successfully synced ${activeTickets.length} active tickets and ${solvedTickets.length} solved tickets.`
  };
}

function formatForSync(t: any) {
  return {
    id: t.id,
    createdDate: t.createdDate,
    updatedAt: t.updatedAt,
    organizationName: t.organizationName,
    clientContactName: t.clientContactName,
    sapModule: t.sapModule,
    sapSystemSid: t.sapSystemSid,
    transactionCode: t.transactionCode,
    subject: t.subject,
    priority: t.priority,
    status: t.status,
    assignedConsultantName: t.assignedConsultantName,
    resolutionDeadline: t.resolutionDeadline,
    resolutionDate: t.resolutionDate,
    rootCause: t.rootCause,
    resolutionSummary: t.resolutionSummary,
    timeSpentMinutes: t.timeSpentMinutes
  };
}
