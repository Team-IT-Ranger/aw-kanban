// ============================================================
//  ARTWORK MANAGER — CLIENT PROJECT (Project A)
//  Deploy settings:
//    Execute as:   User accessing the web app
//    Who has access: Anyone with a Google Account
//
//  This project ONLY serves the UI and identifies the user.
//  All data read/write goes to the Server project via fetch().
// ============================================================

// ── Paste your Server project's deployed /exec URL here ──────
  const SERVER_URL = PropertiesService.getScriptProperties().getProperty('SERVER_URL');

// ─────────────────────────────────────────────────────────────
//  doGet — serve the web app UI
// ─────────────────────────────────────────────────────────────
function doGet(e) {
  const tmpl = HtmlService.createTemplateFromFile('index');
  // Inject the server URL and current user email into the page
  tmpl.serverUrl  = SERVER_URL;
  tmpl.userEmail  = Session.getActiveUser().getEmail().toLowerCase().trim();
  return tmpl.evaluate()
    .setTitle('Artwork Request Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─────────────────────────────────────────────────────────────
//  getUserEmail — called via google.script.run as a fallback
//  (in case template injection didn't work)
// ─────────────────────────────────────────────────────────────
function getUserEmail() {
  return Session.getActiveUser().getEmail().toLowerCase().trim();
}


/*
function set_ScriptProperties() {
  PropertiesService.getScriptProperties().setProperty('SERVER_URL', 'https://script.google.com/macros/s/AKfycbyajnxdz1agJe_Nd9MjsEowMQWK2u-n7xUAaEryT18PL4ODITYKr3GQOpXcp8Rh3HS3/exec');
}
*/

// เพิ่มใน Client_Code.gs
function getPickerOAuthToken() {
  return ScriptApp.getOAuthToken();
}



function sendReviewEmail(params) {
  const links = params.links || [];

  const linkRows = links.map(function(f, i) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#666;">' + (i+1) + '.</td>' +
           '<td><a href="' + f.url + '" style="color:#0ea5e9;">' + f.fileName + '</a></td></tr>';
  }).join('');

  const htmlBody =
    '<div style="font-family:sans-serif;max-width:600px;">' +
    '<div style="background:linear-gradient(135deg,#0ea5e9,#06e6d6);padding:24px;border-radius:12px 12px 0 0;">' +
    '<h2 style="color:#fff;margin:0;">งานพร้อมให้ตรวจสอบแล้ว</h2></div>' +
    '<div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">' +
    '<p>งาน <strong>#' + params.jobNo + ' — ' + params.jobName + '</strong> พร้อมให้ตรวจสอบแล้ว</p>' +
    '<h4 style="color:#0ea5e9;">ไฟล์งาน</h4>' +
    '<table>' + linkRows + '</table>' +
    '</div></div>';

  GmailApp.sendEmail(
    params.toEmail,
    '[Artwork] #' + params.jobNo + ' ' + params.jobName + ' — พร้อมตรวจสอบ',
    links.map(function(f) { return '• ' + f.fileName + '\n  ' + f.url; }).join('\n'),
    { htmlBody: htmlBody, cc: params.ccEmail || '' }
  );

  return { success: true };
}