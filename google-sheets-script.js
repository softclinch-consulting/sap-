/**
 * =========================================================================
 * SOFTCLINCH SAP SUPPORT DESK - REAL-TIME GOOGLE SHEETS SYNC SCRIPT
 * =========================================================================
 *
 * This Google Apps Script creates two separate real-time sheets:
 * 1. "Tickets" -> Real-time active & open tickets (New, In Progress, Pending Client, Escalated)
 * 2. "Solved"  -> Real-time resolved & closed tickets (Resolved, Closed with root cause & solution)
 *
 * HOW TO DEPLOY IN 60 SECONDS:
 * 1. Open your Google Sheet in Google Drive (or create a blank one).
 * 2. In Google Sheets top menu, click: Extensions > Apps Script.
 * 3. Delete any code in Code.gs, and PASTE THIS ENTIRE SCRIPT.
 * 4. At the top right, click "Deploy" > "New deployment".
 * 5. Click the gear icon (Select type) > Select "Web app".
 * 6. Set Description: "SoftClinch Live Sync"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 7. Click "Deploy", review permissions, click "Allow", and COPY the Web App URL.
 * 8. In SoftClinch, click "Real-time Google Sheet Sync", paste the URL, and click "Save & Sync Now".
 * =========================================================================
 */

// Custom spreadsheet menu on open
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("⚡ SoftClinch Desk")
    .addItem("📊 Initialize / Format Sheets", "menuInitializeSheets")
    .addItem("ℹ️ Webhook Status Check", "menuCheckStatus")
    .addToUi();
}

function menuInitializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, "Tickets", getTicketsHeaders(), "#0F766E");
  getOrCreateSheet(ss, "Solved", getSolvedHeaders(), "#107C41");
  SpreadsheetApp.getUi().alert("SoftClinch Desk: Sheets 'Tickets' and 'Solved' have been initialized and formatted successfully!");
}

function menuCheckStatus() {
  SpreadsheetApp.getUi().alert("SoftClinch Webhook is ready! Make sure this script is deployed as a Web App (Deploy > New deployment > Web app > Execute as Me > Access: Anyone).");
}

function doGet(e) {
  if (e && e.parameter && (e.parameter.action || e.parameter.payload)) {
    try {
      var p = e.parameter.payload ? JSON.parse(e.parameter.payload) : e.parameter;
      if (typeof p.ticket === 'string') p.ticket = JSON.parse(p.ticket);
      return handleRequest(p);
    } catch (err) {
      return jsonResponse({ success: false, error: err.toString() });
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "ONLINE",
    service: "SoftClinch SAP Support Desk Live Google Sheets Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var payload = null;
  if (e && e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (_) {
      payload = e.parameter;
    }
  } else if (e && e.parameter) {
    payload = e.parameter;
  }
  return handleRequest(payload);
}

function handleRequest(payload) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 10 second concurrency lock to prevent simultaneous write race conditions

  try {
    if (!payload) {
      return jsonResponse({ success: false, error: "Empty payload received" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Ensure the two sheets exist with styling
    var ticketsSheet = getOrCreateSheet(ss, "Tickets", getTicketsHeaders(), "#0F766E");
    var solvedSheet = getOrCreateSheet(ss, "Solved", getSolvedHeaders(), "#107C41");

    // Action 1: INIT
    if (payload.action === "INIT") {
      return jsonResponse({
        success: true,
        message: "Google Sheet initialized with two tabs: 'Tickets' and 'Solved'."
      });
    }

    // Action 2: SYNC_ALL (Mass sync of both active and solved tickets)
    if (payload.action === "SYNC_ALL") {
      var activeList = payload.activeTickets || [];
      var solvedList = payload.solvedTickets || [];

      // Populate Tickets tab
      clearAndPopulate(ticketsSheet, getTicketsHeaders(), activeList, formatTicketRow);
      // Populate Solved tab
      clearAndPopulate(solvedSheet, getSolvedHeaders(), solvedList, formatSolvedRow);

      return jsonResponse({
        success: true,
        message: "Synchronized " + activeList.length + " active tickets and " + solvedList.length + " solved tickets in real time."
      });
    }

    // Action 3: UPSERT_TICKET (Real-time single ticket create or status change)
    if (payload.action === "UPSERT_TICKET") {
      var ticket = payload.ticket;
      if (!ticket || !ticket.id) {
        return jsonResponse({ success: false, error: "Missing ticket object or ID" });
      }

      var isSolved = ticket.status === "Resolved" || ticket.status === "Closed";

      if (isSolved) {
        // Remove from active Tickets sheet if it previously existed there
        removeRowByTicketId(ticketsSheet, ticket.id);
        // Upsert into Solved sheet
        upsertRow(solvedSheet, ticket.id, formatSolvedRow(ticket));
      } else {
        // Remove from Solved sheet if it was reopened
        removeRowByTicketId(solvedSheet, ticket.id);
        // Upsert into active Tickets sheet
        upsertRow(ticketsSheet, ticket.id, formatTicketRow(ticket));
      }

      return jsonResponse({
        success: true,
        message: "Ticket " + ticket.id + " (" + ticket.status + ") synchronized in real time to " + (isSolved ? "Solved" : "Tickets") + " sheet."
      });
    }

    return jsonResponse({ success: false, error: "Unknown action: " + payload.action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// HELPER FUNCTIONS & FORMATTERS
// -------------------------------------------------------------

function getTicketsHeaders() {
  return [
    "Ticket ID",
    "Logged Date",
    "Organization",
    "Client Contact",
    "Module",
    "System SID",
    "T-Code",
    "Subject / Summary",
    "Priority",
    "Status",
    "Assigned Consultant",
    "SLA Resolution Deadline"
  ];
}

function getSolvedHeaders() {
  return [
    "Ticket ID",
    "Solved Date",
    "Organization",
    "Client Contact",
    "Module",
    "Subject / Summary",
    "Root Cause Analysis",
    "Resolution Summary",
    "Time Spent (Min)",
    "Solved By Consultant",
    "SLA Compliance Status"
  ];
}

function formatTicketRow(t) {
  return [
    t.id || "",
    t.createdDate ? formatDate(t.createdDate) : "",
    t.organizationName || "",
    t.clientContactName || "",
    t.sapModule || "",
    t.sapSystemSid || "",
    t.transactionCode || "N/A",
    t.subject || "",
    t.priority || "",
    t.status || "",
    t.assignedConsultantName || "Unassigned",
    t.resolutionDeadline ? formatDate(t.resolutionDeadline) : "N/A"
  ];
}

function formatSolvedRow(t) {
  return [
    t.id || "",
    t.resolutionDate ? formatDate(t.resolutionDate) : (t.updatedAt ? formatDate(t.updatedAt) : formatDate(new Date())),
    t.organizationName || "",
    t.clientContactName || "",
    t.sapModule || "",
    t.subject || "",
    t.rootCause || "Configuration verified and aligned with SAP standards",
    t.resolutionSummary || "Issue successfully investigated and resolved",
    t.timeSpentMinutes || 0,
    t.assignedConsultantName || "AMS Support Team",
    "Met Target"
  ];
}

function formatDate(isoStr) {
  try {
    var d = new Date(isoStr);
    return Utilities.formatDate(d, Session.getScriptTimeZone() || "UTC", "yyyy-MM-dd HH:mm");
  } catch (_) {
    return isoStr;
  }
}

function getOrCreateSheet(ss, sheetName, headers, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Remove blank rows beyond header
    setupHeaders(sheet, headers, headerColor);
  } else if (sheet.getLastRow() === 0) {
    setupHeaders(sheet, headers, headerColor);
  }
  return sheet;
}

function setupHeaders(sheet, headers, headerColor) {
  sheet.clear();
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(headerColor || "#0F766E");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
}

function clearAndPopulate(sheet, headers, items, formatter) {
  sheet.clear();
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground(sheet.getName() === "Tickets" ? "#0F766E" : "#107C41");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);

  if (items && items.length > 0) {
    var rows = items.map(function(item) {
      return formatter(item);
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.getRange(2, 1, rows.length, headers.length).setFontSize(9);
  }

  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }
}

function upsertRow(sheet, ticketId, rowValues) {
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == ticketId) {
      foundRow = i + 1; // 1-indexed in Sheets API
      break;
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    var newRowIdx = sheet.getLastRow();
    sheet.getRange(newRowIdx, 1, 1, rowValues.length).setFontSize(9);
  }
}

function removeRowByTicketId(sheet, ticketId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == ticketId) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
