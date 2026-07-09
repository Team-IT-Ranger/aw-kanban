// ============================================================
//  ARTWORK MANAGER — SERVER PROJECT (Project B)
//  Deploy settings:
//    Execute as:   Me (owner)
//    Who has access: Anyone
//
//  This project has NO index.html.
//  It exposes a JSON API via doPost() that the Client project calls.
//  Because it runs as "Me", it always has full Sheet read/write access.
// ============================================================

/*
function set_ScriptProperties() {
  PropertiesService.getScriptProperties().setProperty('DESTINATION_FILEID', '1GEmrEzF0hZzpxgkdM6oqSyAAsEsilEJd-ew7Z8ryFoY');
}
*/

const DESTINATION_FILEID = PropertiesService.getScriptProperties().getProperty('DESTINATION_FILEID');
const SHEET_NAME = "Job Line 2026";
/*
function getRequestSheet(sheetname) {
  return SpreadsheetApp.openById(DESTINATION_FILEID).getSheetByName(sheetname);
}
*/
// สร้าง AppContext เก็บ Cache ของไฟล์ เพื่อไม่ให้ Server โหลดไฟล์ใหม่ทุกครั้งที่เรียก
const AppContext = {
  _ss: null,
  get ss() {
    if (!this._ss) this._ss = SpreadsheetApp.openById(DESTINATION_FILEID);
    return this._ss;
  },
  getSheet(name) {
    return this.ss.getSheetByName(name);
  }
};

// ใช้ชื่อฟังก์ชันเดิม เพื่อให้โค้ดเก่าทั้งหมดยังทำงานได้โดยไม่ต้องไปตามแก้
function getRequestSheet(sheetname) {
  return AppContext.getSheet(sheetname);
}


// ── Column map (1-based) ──────────────────────────────────────
const COL = {
  TIMESTAMP:              1,
  STATUS:                 2,
  NO:                     3,
  PROJECT_NAME:           4,
  TYPE:                   5,
  FORMAT:                 6,
  QTY_REQUIRED:           7,
  REQUESTED_BY:           8,
  DEPARTMENT:             9,
  REQUEST_SUBMITTED_DATE: 10,
  BRIEF_APPOINTMENT_DATE: 11,
  BRIEF_COMPLETE_DATE:    12,
  EXPECTED_DATE:          13,
  QTY_COMMITTED:          14,
  ESTIMATED_WORKHOURS:    15,
  ESTIMATED_DUE_DATE:     16,
  ESTIMATED_DUE_AMPM:     17,
  REVISED_DUE_DATE:       18,
  REVISED_DUE_AMPM:       19,
  FINAL_DUE_DATE:         20,
  FINAL_AMPM:             21,
  MBO:                    22,
  DELIVERED_DATE:         23,
  LINK:                   24,
  NOTE:                   25,
  PRIORITY:               26,
  REQUESTER_EMAIL:        27,
  JOB_DETAIL:             28,
  REFERENCE_LINK:         29,
  ASSIGNEE:               30,
  STARTED_DATE:           31,
  COMPLETED_DATE:         32,
  COMPLETION_NOTE:        33,
  OutputLink_File1:       34,
  OutputLink_File2:       35,
  OutputLink_File3:       36,
  OutputLink_File4:       37,
  OutputLink_File5:       38,
};

const HOLIDAYS_2026 = [
  "2026-01-01","2026-01-02","2026-02-17","2026-03-03",
  "2026-04-13","2026-04-14","2026-04-15",
  "2026-05-01","2026-06-01","2026-06-03",
  "2026-07-28","2026-07-29",
  "2026-10-13","2026-10-23","2026-12-07","2026-12-31",
];

const DESIGNERS = [
  "sasitorn@thanatkorn.com",
  "Designer2",
  "Designer3",
];

// ─────────────────────────────────────────────────────────────
//  CORS HELPER
// ─────────────────────────────────────────────────────────────
function corsOutput(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ─────────────────────────────────────────────────────────────
//  doGet — health check endpoint
//  GET  /exec  → { status: "ok", project: "AW Manager Server" }
// ─────────────────────────────────────────────────────────────
function doGet(e) {
  return corsOutput({ status: "ok", project: "AW Manager Server v3" });
}

// ─────────────────────────────────────────────────────────────
//  doPost — main JSON API
//  The client sends:  { action: "...", email: "...", ...payload }
//  POST body is JSON, read from e.postData.contents
// ─────────────────────────────────────────────────────────────
/*
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").trim();
    const callerEmail = (body.email || "").toLowerCase().trim();

    // ── Route ────────────────────────────────────────────────
    //if (action === "getJobsAndMeta")      return corsOutput(api_getJobsAndMeta());
    if (action === "getJobsAndMeta")      return corsOutput(api_getJobsAndMeta(callerEmail));    
    if (action === "getUserAccess")       return corsOutput(api_getUserAccess(callerEmail));
    if (action === "handleAction")        return corsOutput(api_handleAction(body, callerEmail));
    
    if (action === "exportToSheet")       return corsOutput(api_exportToSheet(body, callerEmail)); // 👈 เพิ่มบรรทัดนี้

    return corsOutput({ error: "Unknown action: " + action });
  } catch(err) {
    return corsOutput({ error: err.message + "\n" + err.stack });
  }
}
*/
// ประกาศตัวแปรเก็บ Route ไว้ที่เดียว ดูแลง่ายมาก
const API_ROUTES = {
  getJobsAndMeta: (body, email) => api_getJobsAndMeta(email),
  getUserAccess:  (body, email) => api_getUserAccess(email),
  handleAction:   (body, email) => api_handleAction(body, email),
  exportToSheet:  (body, email) => api_exportToSheet(body, email),
  getJobHistory:  (body, email) => api_getJobHistory(body) // 👈 เพิ่มบรรทัดนี้ลงไป  
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = (body.action || "").trim();
    const callerEmail = (body.email || "").toLowerCase().trim();

    const handler = API_ROUTES[action];
    if (!handler) return corsOutput({ error: "Unknown action: " + action });

    return corsOutput(handler(body, callerEmail));
  } catch(err) {
    return corsOutput({ error: err.message + "\n" + err.stack });
  }
}


// ─────────────────────────────────────────────────────────────
//  API HANDLERS
// ─────────────────────────────────────────────────────────────
function api_getJobsAndMeta(callerEmail) {
  const result     = getAllJobs_();
  const emailMap   = getDesignerEmailMap_();
  result.jobs      = result.jobs.map(function(j) {
    j.assigneeEmail = emailMap[j.assignee] || j.assignee || '';
    return j;
  });
  result.holidays  = HOLIDAYS_2026;
  result.designers = DESIGNERS;
  // ส่ง access right กลับมาพร้อมกันเลย ไม่ต้อง round trip แยก
  result.userAccess = callerEmail ? api_getUserAccess(callerEmail) : { accessRight: 'none' };
  return result;
}


function api_getUserAccess(callerEmail) {
  if (!callerEmail) return { email: callerEmail, accessRight: "none", error: "No email provided" };

  const authSheet = getRequestSheet("authorized user");
  if (!authSheet) return { email: callerEmail, accessRight: "none", error: "Auth sheet not found" };

  const data = authSheet.getDataRange().getValues();
  if (data.length < 2) return { email: callerEmail, accessRight: "none" };

  const headers  = data[0].map(h => String(h).toLowerCase().trim());
  const emailCol = headers.indexOf("email");
  const accessCol = headers.findIndex(h => h.includes("access right"));

  if (emailCol === -1 || accessCol === -1) {
    return { email: callerEmail, accessRight: "none", error: "Columns not found in auth sheet" };
  }

  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][emailCol]).toLowerCase().trim();
    if (rowEmail === callerEmail) {
      return { email: callerEmail, accessRight: String(data[i][accessCol]).trim() };
    }
  }
  return { email: callerEmail, accessRight: "none" };
}


/*
function api_handleAction(body, callerEmail) {
  // ── Server-side authorization guard ──────────────────────
  const auth  = api_getUserAccess(callerEmail);
  const right = (auth.accessRight || "").trim();
  if (right !== "Editor" && right !== "Admin") {
    return { error: "UNAUTHORIZED: view-only access." };
  }

  const action = (body.action || "").trim();
  // body.payload contains the actual action parameters
  const payload = body.payload || body;

  if (action === "handleAction") {
    // nested dispatch from client
    const innerAction = (payload.innerAction || "").trim();
    return dispatch_(innerAction, payload);
  }
  return dispatch_(action, payload);
}

function api_handleAction(body, callerEmail) {
  const auth  = api_getUserAccess(callerEmail);
  const right = (auth.accessRight || "").trim();
  if (right !== "Editor" && right !== "Admin") {
    return { error: "UNAUTHORIZED: view-only access." };
  }

  // innerAction is the real action (assignJob, completeJob, etc.)
  // payload is the job data
  const innerAction = (body.innerAction || body.action || "").trim();
  const payload     = body.payload || body;
  return dispatch_(innerAction, payload);
}
*/

function api_handleAction(body, callerEmail) {
  const auth  = api_getUserAccess(callerEmail);
  const right = (auth.accessRight || "").trim();

  // ── Log failed attempts (unauthorized) ───────────────────
  if (right !== "Editor" && right !== "Admin") {
    const snap = getJobSnapshot_((body.payload || body).rowNum);
    writeProgressLog_({
      no:           snap.no,
      projectName:  snap.projectName,
      statusBefore: snap.status,
      statusAfter:  snap.status,
      action:       body.innerAction || body.action || "unknown",
      assignee:     snap.assignee,
      changedBy:    callerEmail,
      dueDate:      snap.dueDate,
      result:       "failed",
      note:         "UNAUTHORIZED — view-only access",
    });
    return { error: "UNAUTHORIZED: view-only access." };
  }

  const innerAction = (body.innerAction || body.action || "").trim();
  const payload     = body.payload || body;

  // ── Snapshot BEFORE the change ────────────────────────────
  const before = getJobSnapshot_(payload.rowNum);

  // ── Execute the action ────────────────────────────────────
  let result;
  try {
    result = dispatch_(innerAction, payload);
  } catch(err) {
    writeProgressLog_({
      no:           before.no,
      projectName:  before.projectName,
      statusBefore: before.status,
      statusAfter:  before.status,
      action:       innerAction,
      assignee:     before.assignee,
      changedBy:    callerEmail,
      dueDate:      before.dueDate,
      result:       "failed",
      note:         err.message,
    });
    return { error: err.message };
  }

  // ── Snapshot AFTER the change ─────────────────────────────
  const after = getJobSnapshot_(payload.rowNum);

  // ── Log success ───────────────────────────────────────────
  writeProgressLog_({
    no:           before.no,
    projectName:  before.projectName,
    statusBefore: before.status,
    statusAfter:  after.status,
    action:       innerAction,
    assignee:     after.assignee || before.assignee,
    changedBy:    callerEmail,
    dueDate:      after.dueDate || before.dueDate,
    result:       result && result.error ? "failed" : "success",
    note:         (result && result.error) ? result.error : (payload.completionNote || ""),
  });

  return result;
}

/*
function dispatch_(action, payload) {
  if (action === "updateStatus")   return updateStatus_(payload);
  if (action === "assignJob")      return assignJob_(payload);
  if (action === "jobUpdate")      return jobUpdate_(payload);
  if (action === "jobUpdate80")    return jobUpdate80_(payload);
  if (action === "updatePriority") return updatePriority_(payload);
  if (action === "advanceStatus")  return advanceStatus_(payload);
  if (action === "reviewJob")      return reviewJob_(payload);

  //if (action === "completeJob")    return completeJob_(payload);
  //return { error: "Unknown inner action: " + action };
  
  if (action === "completeJob")    return completeJob_(payload);
  if (action === "attachFiles")    return attachFiles_(payload);
  //if (action === "sendReviewEmail") return sendReviewEmail_(payload);
  if (action === "updateOutputFiles") return updateOutputFiles_(payload); // ← เพิ่มบรรทัดนี้
  return { error: "Unknown inner action: " + action };
}
*/
// แมปป์ฟังก์ชันเข้ากับชื่อ Action
const JOB_ACTIONS = {
  updateStatus:      updateStatus_,
  assignJob:         assignJob_,
  jobUpdate:         jobUpdate_,
  jobUpdate80:       jobUpdate80_,
  updatePriority:    updatePriority_,
  advanceStatus:     advanceStatus_,
  reviewJob:         reviewJob_,
  completeJob:       completeJob_,
  attachFiles:       attachFiles_,
  updateOutputFiles: updateOutputFiles_
};

function dispatch_(action, payload) {
  const handler = JOB_ACTIONS[action];
  if (!handler) return { error: "Unknown inner action: " + action };
  return handler(payload);
}


// ─────────────────────────────────────────────────────────────
//  READ
// ─────────────────────────────────────────────────────────────
function getAllJobs_() {
  const sheet = getRequestSheet(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  const jobs  = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[COL.NO - 1] && !row[COL.PROJECT_NAME - 1]) continue;
    jobs.push(toJob_(row, i + 1));
  }
  return { jobs };
}

function toJob_(row, rowNum) {
  return {
    rowNum,
    status:               String(row[COL.STATUS - 1]               || "new"),
    no:                   row[COL.NO - 1]                          || "",
    projectName:          String(row[COL.PROJECT_NAME - 1]         || ""),
    type:                 String(row[COL.TYPE - 1]                 || ""),
    format:               String(row[COL.FORMAT - 1]               || ""),
    qtyRequired:          row[COL.QTY_REQUIRED - 1]                || "",
    requestedBy:          String(row[COL.REQUESTED_BY - 1]         || ""),
    department:           String(row[COL.DEPARTMENT - 1]           || ""),
    requestDate:          fmtDate_(row[COL.REQUEST_SUBMITTED_DATE - 1]),
    briefAppointmentDate: fmtDate_(row[COL.BRIEF_APPOINTMENT_DATE - 1]),
    briefDate:            fmtDate_(row[COL.BRIEF_COMPLETE_DATE - 1]),
    expectedDate:         fmtDate_(row[COL.EXPECTED_DATE - 1]),
    estimatedWorkhours:   Number(row[COL.ESTIMATED_WORKHOURS - 1]  || 0),
    estimatedDueDate:     fmtDate_(row[COL.ESTIMATED_DUE_DATE - 1]),
    revisedDueDate:       fmtDate_(row[COL.REVISED_DUE_DATE - 1]),
    finalDueDate:         fmtDate_(row[COL.FINAL_DUE_DATE - 1]),
    mbo:                  row[COL.MBO - 1]                         || "",
    deliveredDate:        fmtDate_(row[COL.DELIVERED_DATE - 1]),
    link:                 String(row[COL.LINK - 1]                 || ""),
    note:                 String(row[COL.NOTE - 1]                 || ""),
    priority:             Number(row[COL.PRIORITY - 1]             || 5),
    requesterEmail:       String(row[COL.REQUESTER_EMAIL - 1]      || ""),
    jobDetail:            String(row[COL.JOB_DETAIL - 1]           || ""),
    referenceLink:        String(row[COL.REFERENCE_LINK - 1]       || ""),
    assignee:             String(row[COL.ASSIGNEE - 1]       || ''),
    assigneeEmail:        String(row[COL.ASSIGNEE - 1]       || ''), // same col — will be email if stored as email
    startedDate:          fmtDate_(row[COL.STARTED_DATE - 1]),
    completedDate:        fmtDate_(row[COL.COMPLETED_DATE - 1]),
    completionNote:       String(row[COL.COMPLETION_NOTE - 1]      || ""),
    outputLink1:          String(row[COL.OutputLink_File1 - 1] || ''),
    outputLink2:          String(row[COL.OutputLink_File2 - 1] || ''),
    outputLink3:          String(row[COL.OutputLink_File3 - 1] || ''),
    outputLink4:          String(row[COL.OutputLink_File4 - 1] || ''),
    outputLink5:          String(row[COL.OutputLink_File5 - 1] || ''),    
  };
}

function fmtDate_(v) {
  if (!v) return "";
  if (v instanceof Date) return Utilities.formatDate(v, "Asia/Bangkok", "yyyy-MM-dd");
  return String(v);
}


function getDesignerEmailMap_() {
  try {
    const sheet = getRequestSheet("authorized user");
    if (!sheet) return {};
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const nameCol  = headers.findIndex(h => h.includes('name') || h.includes('ชื่อ'));
    const emailCol = headers.indexOf('email');
    if (emailCol === -1) return {};
    const map = {};
    for (let i = 1; i < data.length; i++) {
      const email = String(data[i][emailCol] || '').trim();
      // ถ้ามี name column ใช้ name เป็น key, ถ้าไม่มีใช้ email เป็นทั้ง key และ value
      const name  = nameCol !== -1
        ? String(data[i][nameCol] || '').trim()
        : email;
      if (name && email) map[name] = email;
      // เพิ่ม email เป็น key ด้วย (กรณี assignee เก็บเป็น email อยู่แล้ว)
      if (email) map[email] = email;
    }
    return map;
  } catch(e) {
    console.error('getDesignerEmailMap_ error:', e.message);
    return {};
  }
}


// ─────────────────────────────────────────────────────────────
//  PROGRESS LOG
//  Appends a row to the "Progress Log" sheet on every action.
//  Creates the sheet with headers automatically if missing.
// ─────────────────────────────────────────────────────────────
function writeProgressLog_(entry) {
  try {
    const ss = SpreadsheetApp.openById(DESTINATION_FILEID);
    let logSheet = ss.getSheetByName("Progress Log");

    // Auto-create sheet with headers if it doesn't exist
    if (!logSheet) {
      logSheet = ss.insertSheet("Progress Log");
      logSheet.appendRow([
        "Timestamp", "Job No", "Project Name",
        "Status Before", "Status After",
        "Action", "Assignee", "Changed By",
        "Due Date", "Result", "Note"
      ]);
      logSheet.setFrozenRows(1);
      logSheet.getRange(1, 1, 1, 11).setFontWeight("bold");
    }

    logSheet.appendRow([
      new Date(),                          // Timestamp
      entry.no           || "",            // Job No
      entry.projectName  || "",            // Project Name
      entry.statusBefore || "",            // Status Before
      entry.statusAfter  || "",            // Status After
      entry.action       || "",            // Action type
      entry.assignee     || "",            // Assignee at time of change
      entry.changedBy    || "",            // User email
      entry.dueDate      || "",            // Estimated Due Date
      entry.result       || "success",     // success / failed
      entry.note         || "",            // Error message or completion note
    ]);
  } catch(logErr) {
    // Never let logging crash the main action
    console.error("Progress log error:", logErr.message);
  }
}


function getJobSnapshot_(rowNum) {
  try {
    const sheet = getRequestSheet(SHEET_NAME);
    const row   = sheet.getRange(rowNum, 1, 1, 33).getValues()[0];
    return {
      no:           row[COL.NO - 1]               || "",
      projectName:  row[COL.PROJECT_NAME - 1]      || "",
      status:       row[COL.STATUS - 1]            || "",
      assignee:     row[COL.ASSIGNEE - 1]          || "",
      dueDate:      fmtDate_(row[COL.ESTIMATED_DUE_DATE - 1]),
    };
  } catch(e) {
    return {};
  }
}


// ─────────────────────────────────────────────────────────────
//  WRITE
// ─────────────────────────────────────────────────────────────
function updateStatus_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r = body.rowNum;
  sheet.getRange(r, COL.STATUS).setValue(body.status);
  if (body.assignee         !== undefined) sheet.getRange(r, COL.ASSIGNEE).setValue(body.assignee);
  if (body.estimatedDueDate !== undefined) sheet.getRange(r, COL.ESTIMATED_DUE_DATE).setValue(body.estimatedDueDate);
  if (body.startedDate      !== undefined) sheet.getRange(r, COL.STARTED_DATE).setValue(body.startedDate);
  return { success: true };
}


function assignJob_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r = body.rowNum;
  const workhours = Number(sheet.getRange(r, COL.ESTIMATED_WORKHOURS).getValue()) || 0;

  sheet.getRange(r, COL.STATUS).setValue('Start');
  sheet.getRange(r, COL.ASSIGNEE).setValue(body.assignee || '');

  // Sets started date once-only + recalculates due date if newly started
  applyStartedAndDueDate_(sheet, r, workhours);

  return { success: true };
}


function jobUpdate_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r = body.rowNum;
  const workhours = Number(sheet.getRange(r, COL.ESTIMATED_WORKHOURS).getValue()) || 0;

  sheet.getRange(r, COL.STATUS).setValue('Progress50');
  sheet.getRange(r, COL.ASSIGNEE).setValue(body.assignee || '');

  applyStartedAndDueDate_(sheet, r, workhours);

  return { success: true };
}


function jobUpdate80_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r = body.rowNum;
  const workhours = Number(sheet.getRange(r, COL.ESTIMATED_WORKHOURS).getValue()) || 0;

  sheet.getRange(r, COL.STATUS).setValue('Progress80');
  sheet.getRange(r, COL.ASSIGNEE).setValue(body.assignee || '');

  applyStartedAndDueDate_(sheet, r, workhours);

  return { success: true };
}


function advanceStatus_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  sheet.getRange(body.rowNum, COL.STATUS).setValue(body.status);
  return { success: true };
}

function updatePriority_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  (body.updates || []).forEach(u => {
    sheet.getRange(u.rowNum, COL.PRIORITY).setValue(u.priority);
  });
  return { success: true };
}

function reviewJob_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r     = body.rowNum;
  const today = fmtDate_(new Date());
  sheet.getRange(r, COL.STATUS).setValue("Review");
  sheet.getRange(r, COL.DELIVERED_DATE).setValue("");
  sheet.getRange(r, COL.COMPLETED_DATE).setValue("");
  sheet.getRange(r, COL.COMPLETION_NOTE).setValue(body.completionNote || "");
  const estCell = sheet.getRange(r, COL.ESTIMATED_DUE_DATE).getValue();
  if (estCell) {
    const mbo = Math.round((new Date(estCell) - new Date(today)) / 86400000);
    sheet.getRange(r, COL.MBO).setValue(mbo);
  }
  return { success: true };
}

function completeJob_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r     = body.rowNum;
  const today = fmtDate_(new Date());
  sheet.getRange(r, COL.STATUS).setValue("Done");
  sheet.getRange(r, COL.DELIVERED_DATE).setValue(today);
  sheet.getRange(r, COL.COMPLETED_DATE).setValue(today);
  sheet.getRange(r, COL.COMPLETION_NOTE).setValue(body.completionNote || "");
  const estCell = sheet.getRange(r, COL.ESTIMATED_DUE_DATE).getValue();
  if (estCell) {
    const mbo = Math.round((new Date(estCell) - new Date(today)) / 86400000);
    sheet.getRange(r, COL.MBO).setValue(mbo);
  }
  return { success: true };
}


// ─────────────────────────────────────────────────────────────
//  ATTACH FILES
//  รับ array ของ { fileId, fileName, fileUrl } จาก Picker
//  ตั้ง Drive permission viewer อัตโนมัติ
//  บันทึก link ลง OutputLink_File1-5
// ─────────────────────────────────────────────────────────────
function attachFiles_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r     = body.rowNum;
  const files = body.files || []; // array of { fileId, fileName, fileUrl }

  if (files.length === 0) return { error: "No files provided" };
  if (files.length > 5)   return { error: "Maximum 5 files allowed" };

  const outputCols = [
    COL.OutputLink_File1, COL.OutputLink_File2, COL.OutputLink_File3,
    COL.OutputLink_File4, COL.OutputLink_File5,
  ];

  // ── ตั้ง viewer permission + บันทึก link ──────────────────
  const savedLinks = [];
  files.forEach(function(file, idx) {

    var viewUrl;

    try {
      var driveFile = DriveApp.getFileById(file.fileId);
      var mime = driveFile.getMimeType();

      if (mime === 'application/vnd.google-apps.folder') {
        // เป็น folder จริงๆ
        DriveApp.getFolderById(file.fileId)
                .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        viewUrl = "https://drive.google.com/drive/folders/" + file.fileId;
      } else {
        // เป็นไฟล์ปกติ
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        viewUrl = "https://drive.google.com/file/d/" + file.fileId + "/view";
      }
    } catch(e) {
      console.warn("setSharing failed for " + file.fileId + ": " + e.message);
      viewUrl = file.fileUrl || "https://drive.google.com/file/d/" + file.fileId + "/view";
    }

    sheet.getRange(r, outputCols[idx]).setValue(viewUrl);
    savedLinks.push({ fileName: file.fileName, url: viewUrl });
  });

  // ── Clear slots ที่เหลือ (กรณีแนบน้อยกว่าครั้งก่อน) ────────
  for (let i = files.length; i < 5; i++) {
    sheet.getRange(r, outputCols[i]).setValue("");
  }

  return { success: true, links: savedLinks };
}


// ─────────────────────────────────────────────────────────────
//  UPDATE OUTPUT FILES
//  Creator แก้ไขลิ้งค์ไฟล์งานภายหลัง (เฉพาะงาน Done)
//  รับ outputLink1–outputLink5 แล้วเขียนตรงลง Sheet
// ─────────────────────────────────────────────────────────────
function updateOutputFiles_(body) {
  const sheet = getRequestSheet(SHEET_NAME);
  const r     = body.rowNum;

  // ตรวจสอบว่างานนี้ Status = Done ก่อนแก้
  const currentStatus = sheet.getRange(r, COL.STATUS).getValue();
  if (currentStatus !== 'Done' && currentStatus !== 'Review') {
    return { error: 'updateOutputFiles: job is not Review or Done (status = ' + currentStatus + ')' };
  }

  const outputCols = [
    COL.OutputLink_File1,
    COL.OutputLink_File2,
    COL.OutputLink_File3,
    COL.OutputLink_File4,
    COL.OutputLink_File5,
  ];

  const links = [
    body.outputLink1 || '',
    body.outputLink2 || '',
    body.outputLink3 || '',
    body.outputLink4 || '',
    body.outputLink5 || '',
  ];

  // ✅ ใน updateOutputFiles_() — เก็บ URL ตามที่ user paste มาเลย ไม่แปลง
  links.forEach(function(url, i) {
    sheet.getRange(r, outputCols[i]).setValue(url); // เก็บ URL ดิบ ไม่แตะ

    if (url) {
      try {
        var idMatch = url.match(/\/(?:d|folders)\/([a-zA-Z0-9_-]+)/);
        if (idMatch) {
          try {
            var driveFile = DriveApp.getFileById(idMatch[1]);
            var mime = driveFile.getMimeType();
            if (mime === 'application/vnd.google-apps.folder') {
              DriveApp.getFolderById(idMatch[1])
                      .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } else {
              driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            }
          } catch(e) {
            console.warn('setSharing failed: ' + e.message);
          }        }
      } catch(e) {
        console.warn('setSharing failed: ' + e.message);
      }
    }
  });

  return { success: true };
}


// ─────────────────────────────────────────────────────────────
//  SEND REVIEW EMAIL
//  ส่งอีเมลแจ้ง Requester พร้อมลิ้งค์ไฟล์งาน
//  to: requester email, cc: creator email
// ─────────────────────────────────────────────────────────────
/*
function sendReviewEmail_(body) {
  const toEmail  = (body.toEmail  || "").trim();
  const ccEmail  = (body.ccEmail  || "").trim();
  const jobNo    = body.jobNo    || "";
  const jobName  = body.jobName  || "";
  const links    = body.links    || []; // [{ fileName, url }]

  if (!toEmail) return { error: "No recipient email" };

  // ── สร้าง link list ───────────────────────────────────────
  const linkRows = links.map(function(f, i) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#666;">' + (i+1) + '.</td>' +
           '<td><a href="' + f.url + '" style="color:#0ea5e9;">' + f.fileName + '</a></td></tr>';
  }).join('');

  const htmlBody =
    '<div style="font-family:sans-serif;max-width:600px;">' +
    '<div style="background:linear-gradient(135deg,#0ea5e9,#06e6d6);padding:24px;border-radius:12px 12px 0 0;">' +
    '<h2 style="color:#fff;margin:0;">🎨 งานพร้อมให้ตรวจสอบแล้ว</h2></div>' +
    '<div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">' +
    '<p>เรียน คุณ ' + toEmail + ',</p>' +
    '<p>งาน <strong>#' + jobNo + ' — ' + jobName + '</strong> พร้อมให้ท่านตรวจสอบแล้วครับ/ค่ะ</p>' +
    '<h4 style="color:#0ea5e9;">📎 ไฟล์งาน</h4>' +
    '<table>' + linkRows + '</table>' +
    '<p style="margin-top:20px;color:#666;font-size:13px;">กรุณากด Review และแจ้งผลการตรวจสอบกลับมาด้วยนะครับ/ค่ะ</p>' +
    '</div></div>';

  GmailApp.sendEmail(toEmail, 
    '[Artwork] #' + jobNo + ' ' + jobName + ' — พร้อมตรวจสอบ',
    // plaintext fallback
    'งาน #' + jobNo + ' — ' + jobName + ' พร้อมให้ท่านตรวจสอบแล้วครับ\n\nไฟล์งาน:\n' +
    links.map(function(f) { return '• ' + f.fileName + '\n  ' + f.url; }).join('\n'),
    {
      htmlBody: htmlBody,
      cc: ccEmail || '',
    }
  );

  return { success: true };
}
*/


// ─────────────────────────────────────────────────────────────
//  STARTED DATE + DUE DATE HELPER
//  - Sets STARTED_DATE only if currently blank (once only)
//  - Recalculates ESTIMATED_DUE_DATE from startedDate + workhours
//    only when startedDate was just set (was blank before)
// ─────────────────────────────────────────────────────────────
function applyStartedAndDueDate_(sheet, r, workhours) {
  const existingStarted = sheet.getRange(r, COL.STARTED_DATE).getValue();
  const wasBlank = !existingStarted;

  // Only write STARTED_DATE if it's blank
  const today = fmtDate_(new Date());
  if (wasBlank) {
    sheet.getRange(r, COL.STARTED_DATE).setValue(today);
  }

  // Recalculate ESTIMATED_DUE_DATE only when started date just changed
  if (wasBlank && workhours > 0) {
    const startStr  = today;
    const dueDate   = calcDueDate_(startStr, workhours);
    sheet.getRange(r, COL.ESTIMATED_DUE_DATE).setValue(dueDate);
    return dueDate;
  }

  // Started date already existed — don't touch due date
  return null;
}

// Calculates due date by adding workhours as workdays, skipping weekends & holidays
function calcDueDate_(startStr, workhours) {
  const hset    = new Set(HOLIDAYS_2026);
  let workdays  = Math.ceil(workhours / 8);
  let date      = new Date(startStr + 'T00:00:00');
  let safety    = 0;
  while (workdays > 0 && safety < 365) {
    date.setDate(date.getDate() + 1);
    safety++;
    const dow = date.getDay();
    const ds  = Utilities.formatDate(date, 'Asia/Bangkok', 'yyyy-MM-dd');
    if (dow !== 0 && dow !== 6 && !hset.has(ds)) workdays--;
  }
  return Utilities.formatDate(date, 'Asia/Bangkok', 'yyyy-MM-dd');
}


// ═══════════════════════════════════════════════════════════
//  EXPORT TO GOOGLE SHEET (API HANDLER)
// ═══════════════════════════════════════════════════════════
function api_exportToSheet(body, callerEmail) {
  try {
    const data = body.sheetData || [];
    if (data.length === 0) return { error: "No data provided" };

    // 1. สร้างไฟล์ Spreadsheet ใหม่
    const timestamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm");
    const ss = SpreadsheetApp.create("Artwork_Export_" + timestamp);
    const sheet = ss.getActiveSheet();

    // 2. วางข้อมูลทั้งหมดในครั้งเดียว (เร็วและมีประสิทธิภาพกว่าการ loop)
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);

    // 3. ตกแต่ง Header นิดหน่อยให้ดูง่าย
    sheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold").setBackground("#f0f4f8");
    sheet.setFrozenRows(1);

    // 4. ***สำคัญมาก*** แชร์สิทธิ์ให้ผู้ที่กด Export (callerEmail) เข้าถึงไฟล์นี้ได้
    // (เนื่องจากไฟล์ถูกสร้างใน Drive ของเจ้าของระบบ)
    const driveFile = DriveApp.getFileById(ss.getId());
    if (callerEmail) {
      driveFile.addViewer(callerEmail); // ให้สิทธิ์ดูไฟล์
      // ถ้าต้องการให้หัวหน้าแก้ไขไฟล์ได้เลย ให้เปลี่ยนเป็น driveFile.addEditor(callerEmail);
    } else {
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    // ส่ง URL ของชีตใหม่กลับไปให้ฝั่งหน้าเว็บ
    return { success: true, url: ss.getUrl() };
  } catch(err) {
    return { error: err.message };
  }
}


// ============================================================
// 🕒 API: ดึงประวัติการแก้ไขงานรายชิ้น (Audit Trail)
// ============================================================
function api_getJobHistory(body) {
  try {
    const jobNo = String(body.jobNo || "").trim();
    if (!jobNo) return { history: [] };

    const sheet = AppContext.getSheet("Progress Log");
    if (!sheet) return { history: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { history: [] };

    const history = [];
    // วนลูปอ่าน Log ตั้งแต่บรรทัดแรกขึ้นมา เพื่อเรียงไทม์ไลน์จากเก่าไปใหม่
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // ตรวจสอบว่าคอลัมน์ Job No (Index 1) ตรงกับที่เราตามหาไหม
      if (String(row[1]).trim() === jobNo) {
        history.push({
          timestamp: row[0] instanceof Date ? Utilities.formatDate(row[0], "Asia/Bangkok", "yyyy-MM-dd HH:mm") : String(row[0]),
          statusBefore: String(row[3]),
          statusAfter: String(row[4]),
          action: String(row[5]),
          assignee: String(row[6]),
          changedBy: String(row[7]),
          note: String(row[10])
        });
      }
    }
    return { history: history };
  } catch(err) {
    return { error: err.message };
  }
}
