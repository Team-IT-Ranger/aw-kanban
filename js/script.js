  // ═══════════════════════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════════════════════
// 1. เอา URL จากเฟส 1 มาวางในเครื่องหมายคำพูด
const SERVER_URL = 'https://script.google.com/macros/s/AKfycbxkAhejwTR3i9RYz3ZosPL2ItsmHTCkRdylUghpEGkwGOL7DnY7BbNMczlye4Y8w6QgbA/exec'; 
let USER_EMAIL = ''; // 👈 ต้องมีบรรทัดนี้สแตนด์บายไว้ข้างบนสุดครับ

// 🚨 แก้ไข: เอา Client ID ที่ได้จากสเตปที่ 1 มาวางตรงนี้แทนตัวเก่าของผมนะพี่
const GOOGLE_CLIENT_ID = '137382760270-3v4vfgh682k3jf7h9a1iqjlhj7b121ar.apps.googleusercontent.com';

// ฟังก์ชันเริ่มต้นระบบล็อกอิน (จะทำงานทันทีที่โหลดหน้าเว็บ)
window.onload = function () {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse // ถ้าร็อกอินผ่าน ให้ไปทำงานที่ฟังก์ชันนี้
    });
    
    // สั่งให้วาดปุ่มล็อกอินของ Google ออกมา
    google.accounts.id.renderButton(
      document.getElementById("google-signin-btn"),
      { theme: "outline", size: "large", type: "standard", shape: "pill" }  
    );
    
    // (ออปชันเสริม) ดึงล็อกอินเก่าอัตโนมัติถ้าเคยเข้าไว้แล้ว
    google.accounts.id.prompt(); 
  }
};

// ฟังก์ชันรับข้อมูลหลังจากลูกน้องล็อกอินเสร็จ
function handleCredentialResponse(response) {
  // ถอดรหัส JSON Web Token (JWT) เพื่อดึงอีเมลออกมา
  const base64Url = response.credential.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  const profile = JSON.parse(jsonPayload);
  
  // 🎉 ดึงอีเมลสำเร็จแล้ว! เอาไปใส่ในตัวแปรหลักของระบบพี่ได้เลย
  USER_EMAIL = profile.email; 
  console.log("Logged in as: " + USER_EMAIL);

  // ซ่อนหน้าจอเข้าสู่ระบบ แล้วสั่งโหลดข้อมูลงานจริงมาแสดงผล
  document.getElementById('login-screen').style.display = 'none';
  
  // 🚀 สั่งรันฟังก์ชันโหลดข้อมูลตัวเดิมของพี่ต่อได้เลย (เช่น loadDashboardData() หรือ init())
  loadData(); 
}


  let jobs = [];
  let lang = 'th';
  let view = 'kanban';
  let activeStatFilter = null; // for quick stat filter
  let settings = {
    designers: ['Sasitorn','นัท','Designer 3'],
    holidays: [
      "2026-01-01","2026-01-02","2026-02-17","2026-03-03",
      "2026-04-13","2026-04-14","2026-04-15",
      "2026-05-01","2026-06-01","2026-06-03",
      "2026-07-28","2026-07-29",
      "2026-10-13","2026-10-23","2026-12-07","2026-12-31",
    ],
    role: 'manager',
    userName: '',
  };
  let dragJob = null;
  let currentUser = { email: '', accessRight: 'none' };

  const STATUS_FLOW = ['new','Start','Progress50','Progress80','Review','Done'];
  const STATUS_LABELS = {
    th: { new:'งานใหม่', Start:'เริ่มทำ', 'Progress50':'คืบหน้า 50%', 'Progress80':'คืบหน้า 80%', Review:'รอตรวจ', Done:'เสร็จแล้ว', Pending:'รอบรีฟ', Reject:'ยกเลิก' },
    en: { new:'New', Start:'Start', 'Progress50':'Progress 50%', 'Progress80':'Progress 80%', Review:'Review', Done:'Done', Pending:'Pending', Reject:'Reject' }
  };
  const STATUS_COLORS = {
    new:'#2563eb', Start:'#d97706', 'Progress50':'#0ea5e9',
    'Progress80':'#7c3aed', Review:'#7c3aed', Done:'#059669', Pending:'#dc2626', Reject:'#dc2626'
  };
  const PILL_CLASS = {
    new:'pill-new', Start:'pill-start', 'Progress50':'pill-inprogress50',
    'Progress80':'pill-inprogress80', Review:'pill-review', Done:'pill-done',
    Pending:'pill-pending', Reject:'pill-reject'
  };

  // ═══════════════════════════════════════════════════════════
  //  QUICK STAT FILTER — click stat bar to filter by group
  // ═══════════════════════════════════════════════════════════
  function filterByStatus(group) {
    if (activeStatFilter === group) {
      activeStatFilter = null;
    } else {
      activeStatFilter = group;
    }
    // Update active highlight
    ['new','inprogress','review','done','overdue','due-today'].forEach(g => {
      document.getElementById('stat-' + g)?.classList.toggle('active', g === activeStatFilter);
    });
    renderAll();
  }

  function updateStats(filteredJobs) {
    const today = todayStr();
    const overdue = filteredJobs.filter(j => {
      const due = j.estimatedDueDate || j.finalDueDate || j.expectedDate || '';
      return due && due < today && j.status !== 'Done' && j.status !== 'Reject';
    });
    const dueToday = filteredJobs.filter(j => {
      const due = j.estimatedDueDate || j.finalDueDate || j.expectedDate || '';
      return due === today && j.status !== 'Done' && j.status !== 'Reject';
    });
    document.getElementById('sn-new').textContent = jobs.filter(j => j.status === 'new').length;
    document.getElementById('sn-inprogress').textContent = jobs.filter(j => ['Start','Progress50','Progress80'].includes(j.status)).length;
    document.getElementById('sn-review').textContent = jobs.filter(j => j.status === 'Review').length;
    document.getElementById('sn-done').textContent = jobs.filter(j => j.status === 'Done').length;
    document.getElementById('sn-overdue').textContent = overdue.length;
    document.getElementById('sn-due-today').textContent = dueToday.length;
  }

  // ═══════════════════════════════════════════════════════════
  //  SERVER FETCH
  // ═══════════════════════════════════════════════════════════
  function serverFetch(action, extra) {
    const body = Object.assign({ action, email: USER_EMAIL }, extra || {});
    return fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
      redirect: 'follow',
    }).then(r => r.json());
  }

  // ═══════════════════════════════════════════════════════════
  //  SORTING
  // ═══════════════════════════════════════════════════════════
  function saveSort() {
    const field = document.getElementById('sort-field').value;
    const dir = document.getElementById('sort-dir').value;
    try { localStorage.setItem('aw_sort', JSON.stringify({ field, dir })); } catch(e) {}
  }
  function loadSort() {
    try {
      const s = JSON.parse(localStorage.getItem('aw_sort') || '{}');
      if (s.field) document.getElementById('sort-field').value = s.field;
      if (s.dir)   document.getElementById('sort-dir').value = s.dir;
    } catch(e) {}
  }
  function getSorted(arr) {
    const field = document.getElementById('sort-field')?.value || 'no';
    const dir = document.getElementById('sort-dir')?.value || 'asc';
    return [...arr].sort((a, b) => {
      let av = a[field] || '', bv = b[field] || '';
      if (field === 'no') { av = Number(av)||0; bv = Number(bv)||0; return dir==='asc' ? av-bv : bv-av; }
      return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  GANTT VIEW
  // ═══════════════════════════════════════════════════════════
  let ganttRange = 'month';

  function renderGantt(filtered) {
    const el = document.getElementById('gantt-view');
    const days = ganttRange === 'week' ? 7 : 30;
    const today = new Date(); today.setHours(0,0,0,0);
    const cols = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i - (ganttRange==='week'?0:2));
      cols.push(d);
    }
    const colStart = cols[0], colEnd = cols[cols.length-1];
    const groups = {};
    getSorted(filtered).forEach(j => {
      const key = j.assignee || (lang==='th'?'ยังไม่มอบหมาย':'Unassigned');
      if (!groups[key]) groups[key] = [];
      groups[key].push(j);
    });

    const headerHTML = cols.map(d => {
      const isToday = dateToStr(d) === dateToStr(today);
      const isWE = d.getDay()===0 || d.getDay()===6;
      const label = ganttRange==='week'
        ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] + '<br>' + d.getDate()
        : d.getDate();
      return `<div class="gantt-day-label${isToday?' today':''}${isWE?' weekend':''}">${label}</div>`;
    }).join('');

    let rowsHTML = '';
    Object.entries(groups).forEach(([designer, djobs], gi) => {
      const av = `<span class="avatar" style="flex-shrink:0;">${designer.charAt(0)}</span>`;
      const cellsHTML = cols.map(d => {
        const isToday = dateToStr(d) === dateToStr(today);
        const isWE = d.getDay()===0 || d.getDay()===6;
        return `<div class="gantt-cell${isToday?' today-col':''}${isWE?' weekend-col':''}"></div>`;
      }).join('');
      const barsHTML = djobs.map(j => {
        const startStr = j.startedDate || j.requestDate || '';
        const dueStr = j.estimatedDueDate || j.finalDueDate || j.expectedDate || '';
        if (!dueStr) return '';
        const startD = startStr ? new Date(startStr+'T00:00:00') : today;
        const dueD = new Date(dueStr+'T00:00:00');
        if (dueD < colStart || startD > colEnd) return '';
        const clampedStart = startD < colStart ? colStart : startD;
        const clampedEnd = dueD > colEnd ? colEnd : dueD;
        const totalMs = colEnd - colStart || 1;
        const leftPct = ((clampedStart - colStart) / totalMs) * 100;
        const widthPct = Math.max(((clampedEnd - clampedStart) / totalMs) * 100, 2);
        const oc = getOverdueClass(j);
        const barClass = j.status==='Done' ? 'done' : oc==='overdue' ? 'overdue' : oc==='due-today' ? 'due-today' : '';
        return `<div class="gantt-bar ${barClass}" style="left:${leftPct.toFixed(2)}%;width:${widthPct.toFixed(2)}%" onclick="openDetail(${j.rowNum})" title="#${j.no} ${j.projectName} | ${dueStr}">#${j.no} ${j.projectName}</div>`;
      }).join('');
      const totalMs = colEnd - colStart || 1;
      const todayPct = ((today - colStart) / totalMs) * 100;
      const todayLine = todayPct >= 0 && todayPct <= 100 ? `<div class="gantt-today-line" style="left:${todayPct.toFixed(2)}%"></div>` : '';
      rowsHTML += `<div class="gantt-row" style="animation-delay:${gi*0.04}s">
        <div class="gantt-label">${av} ${esc(designer)}</div>
        <div class="gantt-track">${cellsHTML}${barsHTML}${todayLine}</div>
      </div>`;
    });

    if (!rowsHTML) { el.innerHTML = `<div class="gantt-empty">📭 ${lang==='th'?'ไม่มีงานในช่วงนี้':'No jobs in this range'}</div>`; return; }

    el.innerHTML = `<div class="gantt-wrap">
      <div class="gantt-toolbar">
        <strong style="font-size:13px;">${lang==='th'?'📅 ไทม์ไลน์งาน':'📅 Job Timeline'}</strong>
        <button class="gantt-range-btn ${ganttRange==='week'?'active':''}" onclick="setGanttRange('week')">${lang==='th'?'7 วัน':'7 Days'}</button>
        <button class="gantt-range-btn ${ganttRange==='month'?'active':''}" onclick="setGanttRange('month')">${lang==='th'?'30 วัน':'30 Days'}</button>
        <div class="gantt-legend">
          <div class="gantt-legend-item"><div class="gantt-legend-dot" style="background:linear-gradient(90deg,var(--ocean1),var(--ocean2))"></div>${lang==='th'?'กำลังทำ':'In Progress'}</div>
          <div class="gantt-legend-item"><div class="gantt-legend-dot" style="background:#ef4444"></div>${lang==='th'?'เกินกำหนด':'Overdue'}</div>
          <div class="gantt-legend-item"><div class="gantt-legend-dot" style="background:var(--amber)"></div>${lang==='th'?'ครบกำหนดวันนี้':'Due Today'}</div>
          <div class="gantt-legend-item"><div class="gantt-legend-dot" style="background:#34d399;opacity:.65"></div>${lang==='th'?'เสร็จแล้ว':'Done'}</div>
        </div>
      </div>
      <div class="gantt-header-row">${headerHTML}</div>
      ${rowsHTML}
    </div>`;
  }

  function setGanttRange(r) { ganttRange = r; renderAll(); }

  // ═══════════════════════════════════════════════════════════
  //  REVIEW MODAL
  // ═══════════════════════════════════════════════════════════
  function openReview(rowNum) {
    const j = jobs.find(x => x.rowNum === rowNum);
    if (!j) return;
    const existingUrls = [j.outputLink1, j.outputLink2, j.outputLink3, j.outputLink4, j.outputLink5];
    const inputRows = existingUrls.map((url, i) =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:11px;color:var(--muted);width:16px;font-family:var(--mono);">${i+1}.</span>
        <input class="modal-input" id="file-url-${i}" type="url" value="${esc(url||'')}" placeholder="วาง Google Drive link ที่นี่..." style="flex:1;font-size:12px;">
        ${url ? `<a href="${url}" target="_blank" title="เปิดไฟล์" style="font-size:18px;text-decoration:none;flex-shrink:0;">👁</a>` : ''}
      </div>`
    ).join('');

    showModal(`
      <div class="modal-title">📤 ${lang==='th'?'ส่งงานให้ตรวจสอบ':'Send for Review'} — #${j.no}</div>
      <div class="modal-section">
        <div class="modal-label">${lang==='th'?'ชื่องาน':'Project'}</div>
        <div class="modal-value">${esc(j.projectName)}</div>
      </div>
      <div class="modal-section">
        <div class="modal-label">📎 ${lang==='th'?'ลิ้งค์ไฟล์งาน (สูงสุด 5 ไฟล์)':'Output file links (max 5)'}
          <span style="font-size:10px;color:var(--muted);margin-left:6px;">(Google Drive → Share → Copy link)</span>
        </div>
        ${inputRows}
      </div>
      <div class="modal-section">
        <div class="modal-label">${lang==='th'?'หมายเหตุถึง Requester':'Note to Requester'}</div>
        <textarea class="modal-input" id="review-note" rows="3" placeholder="${lang==='th'?'หมายเหตุ เช่น จุดที่ต้องการ feedback...':'Notes for reviewer...'}">${esc(j.completionNote||'')}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeModal()">${lang==='th'?'ยกเลิก':'Cancel'}</button>
        <button class="btn-primary" onclick="confirmReview(${j.rowNum})">✅ ${lang==='th'?'บันทึก + เปลี่ยนสถานะ Review':'Save & Set Review'}</button>
      </div>`);
  }

  function confirmReview(rowNum) {
    const j = jobs.find(x => x.rowNum === rowNum);
    const note = document.getElementById('review-note').value;
    const files = [0,1,2,3,4].map(i => {
      const el = document.getElementById('file-url-' + i);
      if (!el) return null;
      const url = (el.value || '').trim();
      if (!url) return null;
      const fileId = extractDriveId(url);
      return fileId ? { fileId, fileName: 'ไฟล์ ' + (i+1), fileUrl: url } : null;
    }).filter(Boolean);
    closeModal();

    serverPost({ action: 'reviewJob', rowNum, completionNote: note }, function() {
      if (files.length > 0) {
        serverPost({ action: 'attachFiles', rowNum, files }, function(attachRes) {
          if (attachRes && attachRes.links) {
            attachRes.links.forEach((l, i) => { j['outputLink' + (i+1)] = l.url; });
          }
          toast(lang==='th'?'บันทึกแล้ว ✅':'Saved ✅', 'success');
          openSendEmailModal(rowNum, attachRes.links || []);
        });
      } else {
        toast(lang==='th'?'เปลี่ยนสถานะ Review แล้ว':'Status set to Review', 'success');
        openSendEmailModal(rowNum, []);
      }
    });
  }

  function openSendEmailModal(rowNum, links) {
    const j = jobs.find(x => x.rowNum === rowNum);
    if (!j) return;
    const toEmail = j.requesterEmail || '';
    const ccEmail = [j.assigneeEmail, USER_EMAIL].filter(Boolean).join(', ');
    const linkPreview = links.map(l =>
      `<div style="margin:4px 0;"><a href="${l.url}" target="_blank" style="color:var(--cyan);font-size:12px;">📄 ${esc(l.fileName)}</a></div>`
    ).join('') || '<span style="color:var(--muted);font-size:12px;">ไม่มีไฟล์แนบ</span>';

    showModal(`
      <div class="modal-title">✉️ ${lang==='th'?'ส่งอีเมลแจ้ง Requester':'Notify Requester'}</div>
      <div class="modal-section">
        <div class="modal-label">To</div>
        <input class="modal-input" id="email-to" type="email" value="${esc(toEmail)}" placeholder="requester@email.com">
      </div>
      <div class="modal-section">
        <div class="modal-label">CC</div>
        <input class="modal-input" id="email-cc" value="${esc(ccEmail)}" placeholder="creator@email.com">
      </div>
      <div class="modal-section">
        <div class="modal-label">📎 ไฟล์ที่แนบ</div>
        <div>${linkPreview}</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--r);padding:12px;font-size:12px;color:var(--muted);margin-top:8px;border:1px solid var(--line);">
        📧 Subject: <strong style="color:var(--text);">Artwork พร้อมตรวจสอบ #${j.no} ${esc(j.projectName)}</strong>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeModal()">${lang==='th'?'ข้ามการส่งอีเมล':'Skip email'}</button>
        <button class="btn-primary" onclick="confirmSendEmail(${rowNum})">✉️ ${lang==='th'?'ส่งอีเมล':'Send Email'}</button>
      </div>`);
    window._pendingEmailLinks = links;
    window._pendingEmailJob = j;
  }

  function confirmSendEmail(rowNum) {
    const toEmail = document.getElementById('email-to').value.trim();
    const ccEmail = document.getElementById('email-cc').value.trim();
    const j = window._pendingEmailJob;
    const links = window._pendingEmailLinks || [];
    if (!toEmail) { toast(lang==='th'?'กรุณาใส่ email ผู้รับ':'Please enter recipient email', 'error'); return; }
    closeModal();
    google.script.run
      .withSuccessHandler(() => toast(lang==='th'?'ส่งอีเมลแล้ว ✉️':'Email sent ✉️', 'success'))
      .withFailureHandler(err => toast('Email error: ' + err.message, 'error'))
      .sendReviewEmail({ toEmail, ccEmail, jobNo: j.no, jobName: j.projectName, links });
  }

  function extractDriveId(url) {
    //const m = (url || '').match(/\/d\/([a-zA-Z0-9_-]+)/);
    const m = (url || '').match(/\/(?:d|folders)\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : '';
  }

  // ═══════════════════════════════════════════════════════════
  //  AUTH — logout
  // ═══════════════════════════════════════════════════════════
  function logoutUser() {
    if (!confirm(lang==='th' ? 'ต้องการออกจากระบบใช่ไหม?' : 'Are you sure you want to logout?')) return;
    google.script.run
      .withSuccessHandler(appUrl => {
        window.top.location.href = 'https://accounts.google.com/Logout?continue=' + encodeURIComponent(appUrl);
      })
      .getLoginUrl();
  }

  // ═══════════════════════════════════════════════════════════
  //  INIT — skeleton + fast parallel load
  // ═══════════════════════════════════════════════════════════
  function init() {
    loadLocalSettings();
    populateSettingsUI();
    loadSort();
    setApiStatus('loading');

    // Show skeleton immediately
    document.getElementById('kanban-view').innerHTML = STATUS_FLOW.map(() =>
      `<div class="kanban-col" style="opacity:.5;">
        <div class="kanban-header">
          <span class="kanban-status-dot" style="background:var(--line2)"></span>
          <span class="kanban-title" style="background:var(--bg4);border-radius:4px;color:transparent;width:80px;">........</span>
        </div>
        <div class="kanban-cards">
          ${[1,2].map(() => `<div class="job-card" style="animation:shimmer 1.5s infinite;">
            <div style="background:var(--bg4);border-radius:4px;height:10px;margin-bottom:8px;"></div>
            <div style="background:var(--bg4);border-radius:4px;height:32px;margin-bottom:8px;"></div>
            <div style="background:var(--bg4);border-radius:4px;height:10px;width:60%;"></div>
          </div>`).join('')}
        </div>
      </div>`
    ).join('');

    // ─── KEY IMPROVEMENT: inject email from GAS template directly ─
    // If USER_EMAIL is already set from template (fast path), skip google.script.run
    if (USER_EMAIL && USER_EMAIL !== '') {
      document.getElementById('user-email-display').textContent = USER_EMAIL;
      loadData(); // single call — server returns jobs + userAccess together
    } else {
      // Fallback: request email from GAS (slower path, only if template injection failed)
      if (typeof google !== 'undefined' && google.script) {
        google.script.run
          .withSuccessHandler(email => {
            USER_EMAIL = email || '';
            document.getElementById('user-email-display').textContent = USER_EMAIL;
            loadData();
          })
          .withFailureHandler(() => loadData())
          .getUserEmail();
      } else {
        // No GAS context (e.g. local preview) — load anyway
        loadData();
      }
    }

    setInterval(checkAlerts, 60000);
  }

  function canEdit() {
    return currentUser.accessRight === 'Editor' || currentUser.accessRight === 'Admin';
  }

  function updateAccessBadge() {
    const old = document.getElementById('access-badge');
    if (old) old.remove();
    const topbar = document.getElementById('topbar');
    const spacer = topbar.querySelector('.topbar-spacer');
    const badge = document.createElement('span');
    badge.id = 'access-badge';
    if (currentUser.accessRight === 'Admin') {
      badge.style.cssText = 'font-size:11px;padding:3px 10px;border-radius:99px;background:rgba(124,58,237,.12);color:var(--pink);border:1px solid rgba(124,58,237,.25);';
      badge.textContent = '👑 Admin';
    } else if (currentUser.accessRight === 'Editor') {
      badge.style.cssText = 'font-size:11px;padding:3px 10px;border-radius:99px;background:rgba(5,150,105,.10);color:var(--green);border:1px solid rgba(5,150,105,.25);';
      badge.textContent = '✏️ Editor';
    } else {
      badge.style.cssText = 'font-size:11px;padding:3px 10px;border-radius:99px;background:rgba(217,119,6,.10);color:var(--amber);border:1px solid rgba(217,119,6,.25);';
      badge.textContent = '👁 View Only';
    }
    topbar.insertBefore(badge, spacer);
    document.getElementById('user-email-display').textContent = currentUser.email || '';
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.style.display = currentUser.email ? 'inline-block' : 'none';
  }

  // ═══════════════════════════════════════════════════════════
  //  DATA LOAD — single round-trip, returns jobs + userAccess
  // ═══════════════════════════════════════════════════════════
  function loadData() {
    setApiStatus('loading');
    serverFetch('getJobsAndMeta')
      .then(result => {
        if (result && result.jobs) {
          jobs = result.jobs;
          if (result.designers) settings.designers = result.designers;
          if (result.holidays)  settings.holidays  = result.holidays;
          if (result.userAccess) {
            currentUser = Object.assign({ email: USER_EMAIL }, result.userAccess);
            updateAccessBadge();
          }
          setApiStatus('connected');
          populateFilters();
          renderAll();
          checkAlerts();
        } else {
          setApiStatus('disconnected');
          const errMsg = (result && result.error) ? result.error : 'Unknown error';
          toast('โหลดข้อมูลไม่สำเร็จ: ' + errMsg, 'error');
        }
      })
      .catch(err => {
        setApiStatus('disconnected');
        toast('เชื่อมต่อ server ไม่ได้: ' + err.message, 'error');
      });
  }

  // ─── server call wrapper ──────────────────────────────────
  function serverPost(payload, onSuccess) {
    if (!canEdit()) {
      toast(lang==='th' ? '🔒 คุณมีสิทธิ์ดูข้อมูลเท่านั้น' : '🔒 View-only access.', 'error');
      return;
    }
    applyLocalChange(payload);
    renderAll();

    serverFetch('handleAction', { innerAction: payload.action, payload })
      .then(result => {
        if (result && result.error) {
          toast((lang==='th' ? 'บันทึกล้มเหลว: ' : 'Save failed: ') + result.error, 'error');
          loadData();
        } else if (onSuccess) {
          onSuccess(result);
        }
      })
      .catch(err => {
        toast((lang==='th' ? 'เกิดข้อผิดพลาด: ' : 'Error: ') + err.message, 'error');
        loadData();
      });
  }


  // Apply optimistic update locally
  function applyLocalChange(payload) {
    const j = jobs.find(x => x.rowNum === payload.rowNum);
    if (!j) return;

    // 🛠️ 💡 จุดดักช่องโหว่: ถ้างานนี้ยังไม่มีวันเริ่มทำ (startedDate ว่าง, เป็น null หรือเป็น '—')
    // และกำลังจะทำแอคชันเปลี่ยนสถานะใด ๆ (ยกเว้นแค่การอัปเดต Priority) ให้แสตมป์วันที่วันนี้ทันที
    if (payload.action !== 'updatePriority' && (!j.startedDate || j.startedDate === '—' || j.startedDate === '')) {
      const today = todayStr();
      j.startedDate = today;
      payload.startedDate = today; // 🔥 แปะตัวแปรนี้เข้าไปใน payload เพื่อส่งไปให้เซิร์ฟเวอร์หลังบ้านบันทึกด้วย
    }

    // --- โค้ดเงื่อนไขเดิมด้านล่างปล่อยไว้เหมือนเดิมเลยครับ ---
    if (payload.action === 'advanceStatus' || payload.action === 'updateStatus') {
      j.status = payload.status;
      if (payload.assignee)         j.assignee = payload.assignee;
      if (payload.estimatedDueDate) j.estimatedDueDate = payload.estimatedDueDate;
      if (payload.startedDate)      j.startedDate = payload.startedDate;
    }
    if (payload.action === 'assignJob')   { j.status = 'Start'; j.assignee = payload.assignee; j.estimatedDueDate = payload.estimatedDueDate; j.startedDate = todayStr(); }
    if (payload.action === 'jobUpdate')   { j.status = 'Progress50'; j.assignee = payload.assignee; j.estimatedDueDate = payload.estimatedDueDate; }
    if (payload.action === 'jobUpdate80') { j.status = 'Progress80'; j.assignee = payload.assignee; j.estimatedDueDate = payload.estimatedDueDate; }
    if (payload.action === 'reviewJob')   { j.status = 'Review'; }
    if (payload.action === 'completeJob') { j.status = 'Done'; j.deliveredDate = todayStr(); j.completionNote = payload.completionNote || ''; j.completedDate = todayStr(); if (j.estimatedDueDate) j.mbo = dayDiff(j.estimatedDueDate, todayStr()); }
    if (payload.action === 'updatePriority') { (payload.updates||[]).forEach(u => { const jj = jobs.find(x=>x.rowNum===u.rowNum); if (jj) jj.priority = u.priority; }); }
  }


  // ═══════════════════════════════════════════════════════════
  //  FILTERS
  // ═══════════════════════════════════════════════════════════
  function populateFilters() {
    fillSelect('f-dept',      [...new Set(jobs.map(j=>j.department).filter(Boolean))].sort());
    fillSelect('f-format',    [...new Set(jobs.map(j=>j.format).filter(Boolean))].sort());
    fillSelect('f-type',      [...new Set(jobs.map(j=>j.type).filter(Boolean))].sort());
    fillSelect('f-requester', [...new Set(jobs.map(j=>j.requestedBy).filter(Boolean))].sort());
    fillSelect('f-assignee',  [...new Set(jobs.map(j=>j.assignee).filter(Boolean))].sort());

    const years = [...new Set(jobs.map(j=>(j.requestDate||'').slice(0,4)).filter(Boolean))].sort().reverse();
    fillSelect('f-year', years);

    const MONTH_NAMES = { th:['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'], en:['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
    const monthNums = [...new Set(jobs.map(j=>(j.requestDate||'').slice(5,7)).filter(Boolean))].sort();
    const el = document.getElementById('f-month');
    const cur = el.value;
    while(el.options.length>1) el.remove(1);
    monthNums.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = MONTH_NAMES[lang][Number(m)] + ' (' + m + ')'; el.appendChild(o); });
    if (monthNums.includes(cur)) el.value = cur;
  }

  function fillSelect(id, vals) {
    const el = document.getElementById(id); const cur = el.value;
    while(el.options.length>1) el.remove(1);
    vals.forEach(v => { const o=document.createElement('option'); o.value=v; o.textContent=v; el.appendChild(o); });
    if (vals.includes(cur)) el.value = cur;
  }

  function getFiltered() {
    const today = todayStr();
    const q = document.getElementById('search').value.toLowerCase();
    const dept = document.getElementById('f-dept').value;
    const fmt = document.getElementById('f-format').value;
    const type = document.getElementById('f-type').value;
    const req = document.getElementById('f-requester').value;
    const asgn = document.getElementById('f-assignee').value;
    const year = document.getElementById('f-year').value;
    const month = document.getElementById('f-month').value;

    return jobs.filter(j => {
      if (q    && !j.projectName.toLowerCase().includes(q)) return false;
      if (dept && j.department !== dept) return false;
      if (fmt  && j.format !== fmt) return false;
      if (type && j.type !== type) return false;
      if (req  && j.requestedBy !== req) return false;
      if (asgn && j.assignee !== asgn) return false;
      if (year  && (j.requestDate||'').slice(0,4) !== year) return false;
      if (month && (j.requestDate||'').slice(5,7) !== month) return false;

      // Quick stat filter
      if (activeStatFilter) {
        const due = j.estimatedDueDate || j.finalDueDate || j.expectedDate || '';
        if (activeStatFilter === 'new' && j.status !== 'new') return false;
        if (activeStatFilter === 'inprogress' && !['Start','Progress50','Progress80'].includes(j.status)) return false;
        if (activeStatFilter === 'review' && j.status !== 'Review') return false;
        if (activeStatFilter === 'done' && j.status !== 'Done') return false;
        if (activeStatFilter === 'overdue' && !(due && due < today && j.status !== 'Done' && j.status !== 'Reject')) return false;
        if (activeStatFilter === 'due-today' && !(due === today && j.status !== 'Done' && j.status !== 'Reject')) return false;
      }
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  function renderAll() {
    const filtered = getFiltered();
    document.getElementById('total-badge').textContent = filtered.length + ' jobs';
    updateStats(filtered);

    if (view === 'kanban') renderKanban(filtered);
    else if (view === 'list') renderList(filtered);
    else if (view === 'gantt') renderGantt(filtered);
    
    renderDashboard(filtered);
    renderKPIDashboard(filtered);    
  }

  // ── KANBAN ────────────────────────────────────────────────
  /*
    function renderKanban(filtered) {
    const kv = document.getElementById('kanban-view');
    kv.innerHTML = '';
    STATUS_FLOW.forEach(status => {
      const colJobs = getSorted(filtered.filter(j => j.status === status));
      const col = document.createElement('div');
      col.className = 'kanban-col';
      col.dataset.status = status;
      col.innerHTML = `
        <div class="kanban-header">
          <span class="kanban-status-dot" style="background:${STATUS_COLORS[status]||'#888'}"></span>
          <span class="kanban-title">${slabel(status)}</span>
          <span class="kanban-count">${colJobs.length}</span>
        </div>
        <div class="kanban-cards" id="col-${status.replace(/\s/g,'_')}"
            ondragover="onColDragOver(event,'${status}')"
            ondrop="onColDrop(event,'${status}')"
            ondragleave="onColDragLeave(event)">
        </div>`;
      const cardsDiv = col.querySelector('.kanban-cards');
      colJobs.forEach(j => cardsDiv.appendChild(makeCard(j)));
      kv.appendChild(col);
    });
  }
  */
  // ── KANBAN (LAZY RENDER VERSION) ──────────────────────────────────
  function renderKanban(filtered) {
    const kv = document.getElementById('kanban-view');
    kv.innerHTML = ''; // ล้างกระดานเก่า

    // 1. วาดแค่ "โครงสร้างกล่องเปล่า" ขึ้นมาก่อน (เสร็จในเสี้ยววินาที)
    STATUS_FLOW.forEach(status => {
      const colJobs = getSorted(filtered.filter(j => j.status === status));
      const col = document.createElement('div');
      col.className = 'kanban-col';
      col.dataset.status = status;
      col.innerHTML = `
        <div class="kanban-header">
          <span class="kanban-status-dot" style="background:${STATUS_COLORS[status]||'#888'}"></span>
          <span class="kanban-title">${slabel(status)}</span>
          <span class="kanban-count" id="count-${status.replace(/\s/g,'_')}">
            <span style="font-size:10px; opacity:0.6;">กำลังโหลด... </span>${colJobs.length}
          </span>
        </div>
        <div class="kanban-cards" id="col-${status.replace(/\s/g,'_')}"
            ondragover="onColDragOver(event,'${status}')"
            ondrop="onColDrop(event,'${status}')"
            ondragleave="onColDragLeave(event)">
        </div>`;
      kv.appendChild(col);
    });

    // 2. เอาการ์ดทั้งหมดมาเข้าคิวรอวาด
    let allCardsToRender = [];
    STATUS_FLOW.forEach(status => {
       const colJobs = getSorted(filtered.filter(j => j.status === status));
       colJobs.forEach(j => allCardsToRender.push({ job: j, status: status }));
    });

    let currentIndex = 0;
    const CHUNK_SIZE = 15; // 🚀 ความลับอยู่ที่นี่! วาดทีละ 15 ใบไม่ให้เบราว์เซอร์ช็อก

    // 3. ฟังก์ชันทยอยวาดการ์ด (แอบทำเบื้องหลัง)
    function renderNextChunk() {
       const fragmentMap = {}; // ตัวช่วยแพ็กของ (DocumentFragment) ลดการรีเฟรชจอซ้ำซ้อน
       let renderedCount = 0;

       while (currentIndex < allCardsToRender.length && renderedCount < CHUNK_SIZE) {
          const item = allCardsToRender[currentIndex];
          const colId = 'col-' + item.status.replace(/\s/g,'_');

          if (!fragmentMap[colId]) {
              fragmentMap[colId] = document.createDocumentFragment();
          }
          fragmentMap[colId].appendChild(makeCard(item.job));

          currentIndex++;
          renderedCount++;
       }

       // เอาการ์ดที่แพ็กเสร็จ แปะลงแต่ละกล่องทีเดียว
       for (const colId in fragmentMap) {
          const cardsDiv = document.getElementById(colId);
          if (cardsDiv) cardsDiv.appendChild(fragmentMap[colId]);
       }

       // 4. ถ้าการ์ดยังเหลือ ให้เบราว์เซอร์พักหายใจ 1 เฮือก แล้วค่อยวาดต่อ
       if (currentIndex < allCardsToRender.length) {
          requestAnimationFrame(renderNextChunk);
       } else {
          // 🎉 วาดเสร็จหมดแล้ว! เอาข้อความ "กำลังโหลด..." ออก
          STATUS_FLOW.forEach(status => {
             const countEl = document.getElementById('count-' + status.replace(/\s/g,'_'));
             const total = getSorted(filtered.filter(j => j.status === status)).length;
             if (countEl) countEl.textContent = total;
          });
       }
    }

    // 5. สั่งเริ่มเดินเครื่องวาดการ์ดชุดแรก!
    if (allCardsToRender.length > 0) {
        requestAnimationFrame(renderNextChunk);
    }
  }  


  function makeCard(j) {
    // สกัดตัวแปรออกมาเลย ไม่ต้องพิมพ์ j. ตลอดเวลา
    const { 
      rowNum, no, requestDate, projectName, department, format, type, 
      referenceLink, outputLink1, outputLink2, outputLink3, outputLink4, outputLink5,
      status, assignee, mbo, estimatedDueDate, finalDueDate, expectedDate 
    } = j;

    const div = document.createElement('div');
    const overdueClass = getOverdueClass(j);
    
    div.className = `job-card ${overdueClass}`;
    div.dataset.rowNum = rowNum;

    const isDone = (status === 'Done');
    div.draggable = canEdit() && !isDone; 
    //if (isDone) div.style.cursor = 'not-allowed';
    //if (isDone) div.style.cursor = 'zoom-in';
    //if (isDone) {div.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="20" font-size="32">✨</text></svg>') 12 12, auto`;}

    // ✋ 1. ถ้าการ์ดลากได้ (ย้ายได้) ให้เป็นรูปมือแบสีเหลือง
    if (div.draggable) {
      div.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><text y="32" font-size="32">✋</text></svg>') 16 16, grab`;
    } 
    // 🔒 2. ถ้าการ์ดเสร็จแล้ว (สถานะ Done) ให้ใช้โค้ดเดิมที่พี่เลือกไว้
    else if (isDone) {
      // ปรับขนาดความเบิ้มเป็น 32px และขยับแกน y ให้ตรงกลาง
      div.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text y="32" font-size="32">🔒</text></svg>') 20 20, auto`;
    }

    div.addEventListener('dragstart', e => onCardDragStart(e, j));
    div.addEventListener('dragend', onCardDragEnd);

    // หา Due Date 
    const dueStr = estimatedDueDate || finalDueDate || expectedDate || '';
    const dueDisp = dueStr ? formatDateDisp(dueStr) : (lang === 'th' ? 'ยังไม่มีกำหนด' : 'No due date');
    const dueClass = dueStr ? overdueClass : 'ok';
    
    // ตรวจสอบข้อมูลต่างๆ
    const mboStr = mbo !== '' && mbo !== undefined ? (mbo >= 0 ? `+${mbo}d` : `${mbo}d`) : '';
    const hasRef = !!referenceLink;
    const hasOutput = !!(outputLink1 || outputLink2 || outputLink3 || outputLink4 || outputLink5);

    // ใช้ Template Literals ประกอบ HTML อ่านง่ายกว่าต่อ String ด้วยเครื่องหมาย +
    div.innerHTML = `
      <div class="card-no">#${no} · ${requestDate || ''}</div>
      <div class="card-name" title="${esc(projectName)}">${esc(projectName)}</div>
      <div class="card-meta">
        ${department ? `<span class="tag tag-dept">${department}</span>` : ''}
        ${format     ? `<span class="tag tag-format">${format}</span>` : ''}
        ${type       ? `<span class="tag tag-type">${type}</span>` : ''}
        ${hasRef     ? `<span class="ref-indicator">📎 Ref</span>` : ''}
        ${hasOutput  ? `<span class="ref-indicator" style="background:rgba(5,150,105,.10);color:var(--green);border-color:rgba(5,150,105,.2);">📁 ไฟล์งาน</span>` : ''}
      </div>
      ${dueStr ? `<div class="status-flow">${STATUS_FLOW.map(s => `<div class="sf-step ${getStepClass(status, s)}">${slabel(s).charAt(0)}</div>`).join('')}</div>` : ''}
      <div class="card-footer">
        <div class="card-assignee">
          ${assignee ? `<div class="avatar">${assignee.charAt(0)}</div><span>${assignee}</span>` : `<span style="color:var(--muted)">${lang === 'th' ? 'ยังไม่ได้มอบหมาย' : 'Unassigned'}</span>`}
        </div>
        <div class="card-due ${dueClass}">${dueDisp}${mboStr ? ` <small>(${mboStr})</small>` : ''}</div>
      </div>
      <div class="card-actions">${makeCardActions(j)}</div>
    `;
    return div;
  }



  function makeCardActions(j) {
    let btns = `<button class="card-btn" onclick="openDetail(${j.rowNum})">${lang==='th'?'ดูรายละเอียด':'Detail'}</button>`;
    if (!canEdit()) return btns;
    if (j.status === 'new')         btns += `<button class="card-btn primary" onclick="openAssign(${j.rowNum})">${lang==='th'?'มอบหมาย':'Assign'}</button>`;
    else if (j.status === 'Start')  btns += `<button class="card-btn primary" onclick="updateProgress(${j.rowNum},'Progress50')">${lang==='th'?'คืบหน้า →':'Progress →'}</button>`;
    else if (j.status === 'Progress50') btns += `<button class="card-btn primary" onclick="updateProgress80(${j.rowNum},'Progress80')">${lang==='th'?'80% →':'80% →'}</button>`;
    else if (j.status === 'Progress80') btns += `<button class="card-btn primary" onclick="openReview(${j.rowNum})">${lang==='th'?'ส่งตรวจ →':'Review →'}</button>`;
    else if (j.status === 'Review') btns += `<button class="card-btn primary" onclick="openComplete(${j.rowNum})">${lang==='th'?'✓ เสร็จ':'✓ Done'}</button>`;
    return btns;
  }

  function getStepClass(currentStatus, stepStatus) {
    const ci = STATUS_FLOW.indexOf(currentStatus), si = STATUS_FLOW.indexOf(stepStatus);
    if (si < ci) return 'done'; if (si === ci) return 'active'; return '';
  }

  // ── LIST VIEW ─────────────────────────────────────────────
  function renderList(filtered) {
    const sorted = getSorted(filtered);
    document.getElementById('list-view').innerHTML = `
      <table class="list-table">
        <thead><tr>
          <th>#</th>
          <th>${lang==='th'?'ชื่องาน':'Project Name'}</th>
          <th>Dept</th><th>Format</th><th>Type</th>
          <th>${lang==='th'?'ผู้รับผิดชอบ':'Assignee'}</th>
          <th>${lang==='th'?'สถานะ':'Status'}</th>
          <th>${lang==='th'?'กำหนดส่ง':'Due Date'}</th>
          <th>MBO</th>
          <th>${lang==='th'?'ไฟล์':'Files'}</th>
          <th>${lang==='th'?'Action':'Action'}</th>
        </tr></thead>
        <tbody>${sorted.map(j => listRow(j)).join('')}</tbody>
      </table>`;
  }

  function listRow(j) {
    const oc = getOverdueClass(j);
    const due = j.estimatedDueDate||j.finalDueDate||j.expectedDate||'';
    const mboVal = j.mbo !== '' && j.mbo !== undefined ? j.mbo : '';
    const mboClass = mboVal === '' ? '' : (mboVal > 0 ? 'mbo-pos' : mboVal < 0 ? 'mbo-neg' : 'mbo-zero');

    // Build output file links for list
    const outputLinks = [j.outputLink1,j.outputLink2,j.outputLink3,j.outputLink4,j.outputLink5]
      .filter(Boolean)
      .map((url,i) => `<a href="${url}" target="_blank" title="ไฟล์ ${i+1}" style="margin-right:4px;font-size:14px;">📄</a>`)
      .join('');
    const refLink = j.referenceLink ? `<a href="${j.referenceLink}" target="_blank" title="Reference File" style="font-size:14px;">🔗</a>` : '';

    return `<tr class="${oc}" onclick="openDetail(${j.rowNum})" style="cursor:pointer;">
      <td style="font-family:var(--mono);font-size:11px;color:var(--muted);">${j.no}</td>
      <td><div class="pname" title="${esc(j.projectName)}">${esc(j.projectName)}</div></td>
      <td>${j.department||''}</td>
      <td>${j.format||''}</td>
      <td>${j.type||''}</td>
      <td>${j.assignee ? `<span style="display:flex;align-items:center;gap:5px;"><span class="avatar">${j.assignee.charAt(0)}</span>${j.assignee}</span>` : '<span style="color:var(--muted)">—</span>'}</td>
      <td><span class="status-pill ${PILL_CLASS[j.status]||''}">${slabel(j.status)}</span></td>
      <td style="font-family:var(--mono);font-size:12px;" class="${oc==='overdue'?'card-due overdue':oc==='due-today'?'card-due due-today':''}">${due?formatDateDisp(due):'—'}</td>
      <td class="${mboClass}" style="font-family:var(--mono);font-size:12px;">${mboVal !== '' ? (mboVal>=0?'+':'')+mboVal+'d' : '—'}</td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap;">${refLink}${outputLinks}</td>
      <td onclick="event.stopPropagation()">
        ${canEdit() && j.status==='new' ? `<button class="card-btn primary" style="white-space:nowrap;" onclick="openAssign(${j.rowNum})">${lang==='th'?'มอบหมาย':'Assign'}</button>` : ''}
        ${canEdit() && j.status==='Start' ? `<button class="card-btn primary" style="white-space:nowrap;" onclick="updateProgress(${j.rowNum})">${lang==='th'?'คืบหน้า 50%':'Progress 50%'}</button>` : ''}
        ${canEdit() && j.status==='Progress50' ? `<button class="card-btn primary" style="white-space:nowrap;" onclick="updateProgress80(${j.rowNum})">${lang==='th'?'คืบหน้า 80%':'Progress 80%'}</button>` : ''}
        ${canEdit() && j.status==='Progress80' ? `<button class="card-btn primary" style="white-space:nowrap;" onclick="openReview(${j.rowNum})">${lang==='th'?'ส่งตรวจ':'Review'}</button>` : ''}
        ${canEdit() && j.status==='Review' ? `<button class="card-btn primary" style="white-space:nowrap;" onclick="openComplete(${j.rowNum})">${lang==='th'?'เสร็จ':'Done'}</button>` : ''}
      </td>
    </tr>`;
  }

  // ═══════════════════════════════════════════════════════════
  //  DRAG & DROP
  // ═══════════════════════════════════════════════════════════
  function onCardDragStart(e, j) { dragJob = j; setTimeout(() => e.target.classList.add('dragging'), 0); e.dataTransfer.effectAllowed = 'move'; }

  function onCardDragEnd(e) { const card = e.currentTarget; if (card && card.classList) card.classList.remove('dragging'); dragJob = null; document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over')); }

  function onColDragOver(e, status) {
    e.preventDefault();
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
    const col = document.getElementById('col-' + status.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,''));
    if (col) col.classList.add('drag-over');
  }

  function onColDragLeave(e) { e.currentTarget.querySelector('.kanban-cards')?.classList.remove('drag-over'); }

  /*
  function onColDrop(e, status) {
    e.preventDefault();
    if (!dragJob) return;
    if (!canEdit()) { toast(lang==='th'?'🔒 คุณมีสิทธิ์ดูข้อมูลเท่านั้น':'🔒 View-only access', 'error'); return; }
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
    const oldStatus = dragJob.status;
    if (status === oldStatus) return;
    if (status === 'Start') { openAssignWithStatus(dragJob.rowNum, status); return; }
    if (status === 'Progress50') { updateProgressWithStatus(dragJob.rowNum, status); return; }
    if (status === 'Progress80') { updateProgress80WithStatus(dragJob.rowNum, status); return; }
    if (status === 'Review') { openReview(dragJob.rowNum); return; }
    if (status === 'Done') { openComplete(dragJob.rowNum); return; }
    const captured = dragJob;
    serverPost({ action: 'advanceStatus', rowNum: captured.rowNum, status }, () => toast(lang==='th'?'อัปเดตสถานะแล้ว':'Status updated', 'success'));
  }
  */
  function onColDrop(e, status) {
    e.preventDefault();
    if (!dragJob) return;
    if (!canEdit()) { toast(lang==='th'?'🔒 คุณมีสิทธิ์ดูข้อมูลเท่านั้น':'🔒 View-only access', 'error'); return; }

    // 🛑 กฎเหล็ก: ถ้าการ์ดที่กำลังลาก (dragJob) มีสถานะเป็น Done ให้บล็อกทันที
    if (dragJob.status === 'Done') {
      toast(lang==='th'?'🔒 ไม่อนุญาตให้เปลี่ยนสถานะงานที่ "เสร็จสิ้น" ไปแล้ว':'🔒 Cannot move completed jobs', 'warning');
      document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
      return; 
    }

    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
    const oldStatus = dragJob.status;
    if (status === oldStatus) return;

    if (status === 'Start') { openAssignWithStatus(dragJob.rowNum, status); return; }
    if (status === 'Progress50') { updateProgressWithStatus(dragJob.rowNum, status); return; }
    if (status === 'Progress80') { updateProgress80WithStatus(dragJob.rowNum, status); return; }
    if (status === 'Review') { openReview(dragJob.rowNum); return; }
    if (status === 'Done') { openComplete(dragJob.rowNum); return; }

    const captured = dragJob;
    serverPost({ action: 'advanceStatus', rowNum: captured.rowNum, status }, () => toast(lang==='th'?'อัปเดตสถานะแล้ว':'Status updated', 'success'));
  }  

  // ═══════════════════════════════════════════════════════════
  //  MODALS
  // ═══════════════════════════════════════════════════════════
  function showModal(html) {
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `<div class="modal">${html}</div>`;
    //bd.addEventListener('click', e => { if (e.target === bd) closeModal(); });
    document.body.appendChild(bd);
    return bd;
  }

  function closeModal() { document.querySelectorAll('.modal-backdrop').forEach(m => m.remove()); }

  // ── DETAIL MODAL — with reference link + output files ─────
  function detailNextAction(j) {
    var r = j.rowNum;
    var s = j.status;
    if (s === 'new')         return 'openAssign(' + r + ')';
    if (s === 'Start')       return 'updateProgress(' + r + ')';
    if (s === 'Progress50')  return 'updateProgress80(' + r + ')';
    if (s === 'Progress80')  return 'openReview(' + r + ')';
    if (s === 'Review')      return 'openComplete(' + r + ')';
    return 'advanceStatus(' + r + ',\'' + nextStatus(s) + '\')';
  }
  function detailNextLabel(j) {
    if (j.status === 'new')    return lang==='th' ? 'มอบหมายงาน' : 'Assign';
    if (j.status === 'Review') return lang==='th' ? 'ทำเครื่องหมายเสร็จ' : 'Mark Complete';
    return lang==='th' ? 'ขั้นต่อไป →' : 'Next Step →';
  }

  function openDetail(rowNum) {
    const j = jobs.find(x => x.rowNum === rowNum);
    if (!j) return;
    const due = j.estimatedDueDate || j.finalDueDate || j.expectedDate || '';

    const fileLinks = [j.outputLink1,j.outputLink2,j.outputLink3,j.outputLink4,j.outputLink5]
      .filter(Boolean)
      .map(function(url, i) {
        return '<a href="' + url + '" target="_blank" class="file-chip" style="text-decoration:none;">' +
          '<span>📄</span><span>' + (lang==='th' ? 'ไฟล์ '+(i+1) : 'File '+(i+1)) + '</span>' +
          '<span style="font-size:10px;color:var(--muted);">↗</span></a>';
      }).join('');

    const refSection = j.referenceLink
      ? '<div class="modal-section">' +
          '<div class="modal-label">🔗 ' + (lang==='th' ? 'ไฟล์ตัวอย่าง / Reference จากผู้ขอ' : 'Requester Reference File') + '</div>' +
          '<div class="ref-link-box"><span style="font-size:20px;">📎</span>' +
          '<a href="' + esc(j.referenceLink) + '" target="_blank">' +
          (lang==='th' ? 'เปิดไฟล์ตัวอย่าง' : 'Open Reference File') + ' ↗</a></div></div>'
      : '';

    const nextBtn = (canEdit() && j.status !== 'Done' && j.status !== 'Reject')
      ? '<button class="btn-primary" onclick="closeModal();' + detailNextAction(j) + '">' + detailNextLabel(j) + '</button>'
      : '';

    showModal(
      '<div class="modal-title">#' + esc(j.no) + ' — ' + esc(j.projectName) + '</div>' +
      '<div class="status-flow" style="margin-bottom:16px;">' +
        STATUS_FLOW.map(function(s) { return '<div class="sf-step ' + getStepClass(j.status,s) + '">' + slabel(s) + '</div>'; }).join('') +
      '</div>' +
      '<div class="info-grid">' +
        '<div class="info-row"><div class="modal-label">' + (lang==='th'?'สถานะ':'Status') + '</div><span class="status-pill ' + (PILL_CLASS[j.status]||'') + '">' + slabel(j.status) + '</span></div>' +
        '<div class="info-row"><div class="modal-label">Priority</div><div class="modal-value">' + (j.priority||5) + '</div></div>' +
        '<div class="info-row"><div class="modal-label">' + (lang==='th'?'ผู้ขอ':'Requested By') + '</div><div class="modal-value">' + (j.requestedBy||'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">Department</div><div class="modal-value">' + (j.department||'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">Format</div><div class="modal-value">' + (j.format||'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">Type</div><div class="modal-value">' + (j.type||'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">Qty</div><div class="modal-value">' + (j.qtyRequired||'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">Est. Hours</div><div class="modal-value">' + (j.estimatedWorkhours||'—') + ' hrs</div></div>' +
        '<div class="info-row"><div class="modal-label">' + (lang==='th'?'วันเริ่ม':'Start Date') + '</div><div class="modal-value">' + (j.startedDate||'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">' + (lang==='th'?'กำหนดส่ง':'Due Date') + '</div><div class="modal-value" style="color:' + (due&&isOverdue(j)?'var(--red)':'inherit') + '">' + (due?formatDateDisp(due):'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">' + (lang==='th'?'ผู้รับผิดชอบ':'Assignee') + '</div><div class="modal-value">' + (j.assignee||'—') + '</div></div>' +
        '<div class="info-row"><div class="modal-label">MBO</div><div class="modal-value ' + (j.mbo>=0?'mbo-pos':j.mbo<0?'mbo-neg':'') + '">' + (j.mbo!==''&&j.mbo!==undefined?(j.mbo>=0?'+':'')+j.mbo+'d':'—') + '</div></div>' +
      '</div>' +
      (j.jobDetail ? '<div class="modal-section" style="margin-top:14px;"><div class="modal-label">รายละเอียดงาน</div><div class="modal-value" style="background:var(--bg3);padding:10px;border-radius:var(--r);font-size:12px;line-height:1.7;border:1px solid var(--line);">' + esc(j.jobDetail) + '</div></div>' : '') +
      refSection +
      (j.link ? (function(){
        var raw = j.link;
        var urls = raw.split(/[,\n\r]+/).map(function(u){return u.trim();}).filter(Boolean);
        var chips = urls.map(function(u, i){
          return '<a href="' + esc(u) + '" target="_blank" class="file-chip" style="text-decoration:none;max-width:260px;">' +
                '<span>🌐</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(u) + '</span>' +
                '<span style="font-size:10px;flex-shrink:0;">↗</span></a>';
        }).join('');
        return '<div class="modal-section"><div class="modal-label">🌐 ' +
              (lang==='th' ? 'ลิ้งค์ตัวอย่างจาก Requester' : 'Requester Sample Links') +
              '</div><div class="file-chips" style="margin-top:6px;">' + chips + '</div></div>';
      })() : '') +
      (j.completionNote ? '<div class="modal-section"><div class="modal-label">' + (lang==='th'?'หมายเหตุ':'Note') + '</div><div class="modal-value" style="background:var(--bg3);padding:10px;border-radius:var(--r);font-size:12px;border:1px solid var(--line);">' + esc(j.completionNote) + '</div></div>' : '') +
      (fileLinks ? '<div class="modal-section" style="margin-top:14px;"><div class="modal-label">📁 ' + (lang==='th'?'ไฟล์งาน Output':'Output Files') + '</div><div class="file-chips">' + fileLinks + '</div></div>' : '') +
      
      // ✅ เพิ่มกล่องซ่อนประวัติจำลองรอไว้ใต้กล่องข้อมูลอื่นๆ ของโมดอล
      '<div id="history-box-' + j.no + '" style="margin-top:14px; display:none;"></div>' +

      (function(){
        var editBtn = '';
        if ((j.status === 'Done' || j.status === 'Review') && canEdit()) {
          editBtn = '<button class="btn-primary" style="background:linear-gradient(135deg,#059669,#0891b2);" onclick="closeModal();openEditOutputFiles(' + j.rowNum + ')">📁 ' + (lang==='th' ? 'แก้ไขไฟล์แนบ' : 'Edit Output Files') + '</button>';
        }

        var rejectBtn = '';
        var userEmail  = (currentUser.email || USER_EMAIL || '').toLowerCase().trim();
        var reqEmail   = (j.requesterEmail  || '').toLowerCase().trim();
        var canReject  = currentUser.accessRight === 'Admin' || (reqEmail && userEmail && reqEmail === userEmail);
        if (j.status !== 'Done' && j.status !== 'Reject' && canReject) {
          rejectBtn = '<button class="btn-danger-full" onclick="closeModal();openRejectModal(' + j.rowNum + ')">🚫 ' + (lang==='th' ? 'ยกเลิกงาน' : 'Reject') + '</button>';
        }

        // 🕒 สร้างปุ่มประวัติงานสีชมพูพาสเทลสวยๆ (เพิ่ม margin-right: auto;)
        // 1. ประกอบแถวปุ่ม Footer ก่อน
        var historyBtn = '<button class="btn-cancel" style="border-color:var(--pink); color:var(--pink); margin-right: auto;" onclick="toggleJobHistory(\'' + j.no + '\')">🕒 ประวัติงาน</button>';

        var footer = '<div class="modal-footer">' + historyBtn + rejectBtn + editBtn + nextBtn + '<button class="btn-cancel" onclick="closeModal()">' + (lang==='th'?'ปิด':'Close') + '</button></div>';

        // 2. เอาประวัติงานมาต่อท้าย Footer อีกทีหนึ่ง
        var historyBox = '<div id="history-box-' + j.no + '" style="margin-top:14px; display:none; padding-top:14px; border-top:1px dashed var(--line2);"></div>';

        // จัดเรียงตำแหน่งใหม่: เอา historyBtn ไปไว้หน้าสุด เพื่อให้มันดันปุ่มที่เหลือไปชิดขวา
        // return '<div class="modal-footer">' + historyBtn + rejectBtn + editBtn + nextBtn + '<button class="btn-cancel" onclick="closeModal()">' + (lang==='th'?'ปิด':'Close') + '</button></div>';

        return footer + historyBox;
      })()

    );
  }


  // ── EDIT OUTPUT FILES (for Done jobs) ────────────────────
  function openEditOutputFiles(rowNum) {
    const j = jobs.find(x => x.rowNum === rowNum);
    if (!j) return;
    const existingUrls = [j.outputLink1, j.outputLink2, j.outputLink3, j.outputLink4, j.outputLink5];
    const inputRows = existingUrls.map(function(url, i) {
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="font-size:11px;color:var(--muted);width:16px;font-family:var(--mono);">' + (i+1) + '.</span>' +
        '<input class="modal-input" id="edit-file-url-' + i + '" type="url" value="' + esc(url||'') + '" placeholder="วาง Google Drive link..." style="flex:1;font-size:12px;">' +
        (url ? '<a href="' + url + '" target="_blank" title="เปิดไฟล์" style="font-size:18px;text-decoration:none;flex-shrink:0;">👁</a>' : '') +
      '</div>';
    }).join('');

    showModal(
      '<div class="modal-title">📁 ' + (lang==='th' ? 'แก้ไขไฟล์งาน Output' : 'Edit Output Files') + ' — #' + j.no + '</div>' +
      '<div class="modal-section" style="margin-bottom:14px;">' +
        '<div class="modal-label">' + esc(j.projectName) + '</div>' +
      '</div>' +
      '<div class="modal-section">' +
        '<div class="modal-label">📎 ' + (lang==='th' ? 'ลิ้งค์ไฟล์งาน (สูงสุด 5 ไฟล์)' : 'Output file links (max 5)') +
        ' <span style="font-size:10px;color:var(--muted);margin-left:6px;">(Google Drive → Share → Copy link)</span></div>' +
        inputRows +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn-cancel" onclick="closeModal()">' + (lang==='th' ? 'ยกเลิก' : 'Cancel') + '</button>' +
        '<button class="btn-primary" onclick="confirmEditOutputFiles(' + rowNum + ')">💾 ' + (lang==='th' ? 'บันทึก' : 'Save') + '</button>' +
      '</div>'
    );
  }


  function confirmEditOutputFiles(rowNum) {
    const j = jobs.find(x => x.rowNum === rowNum);
    if (!j) return;
    const files = [0,1,2,3,4].map(function(i) {
      const el = document.getElementById('edit-file-url-' + i);
      if (!el) return null;
      const url = (el.value || '').trim();
      return url || null;
    });
    // optimistic update
    files.forEach(function(url, i) { j['outputLink' + (i+1)] = url || ''; });
    closeModal();
    serverPost({ action: 'updateOutputFiles', rowNum: rowNum,
      outputLink1: files[0]||'', outputLink2: files[1]||'', outputLink3: files[2]||'',
      outputLink4: files[3]||'', outputLink5: files[4]||''
    }, function() {
      toast(lang==='th' ? 'บันทึกไฟล์งานแล้ว ✅' : 'Output files saved ✅', 'success');
    });
  }


// ── ASSIGN MODAL ──────────────────────────────────────────
  function openAssign(rowNum) { openAssignWithStatus(rowNum, 'Start'); }
  
  function openAssignWithStatus(rowNum, targetStatus) {
    const j = jobs.find(x=>x.rowNum===rowNum); if (!j) return;
    const hrs = j.estimatedWorkhours || 8;
    const expDate = j.expectedDate || null;
    
    // คำนวณวันกำหนดส่ง
    const due = calcDueDate(todayStr(), hrs, settings.holidays, expDate);

    const designerOpts = settings.designers.map(d=>`<option value="${d}" ${d===settings.userName?'selected':''}>${d}</option>`).join('');
    showModal(`
      <div class="modal-title">🎨 ${lang==='th'?'มอบหมายงาน':'Assign Job'}</div>
      <div class="modal-section"><div class="modal-label">${lang==='th'?'ชื่องาน':'Project'}</div><div class="modal-value">${esc(j.projectName)}</div></div>
      <div class="modal-section">
        <div class="modal-label">${lang==='th'?'มอบหมายให้':'Assign to'}</div>
        <select class="modal-input" id="assign-designer" onchange="updateDuePreview(${rowNum})">${designerOpts}</select>
      </div>
      <div class="modal-section">
        <div class="modal-label">${lang==='th'?'ชั่วโมงทำงาน':'Est. Hours'}</div>
        <input type="number" class="modal-input" id="assign-hrs" value="${hrs}" min="1" max="200" oninput="updateDuePreview(${rowNum})">
      </div>
      <div class="due-preview" id="due-preview">
        📅 ${lang==='th'?'กำหนดส่งโดยประมาณ:':'Est. due:'} <strong id="due-calc-result">${formatDateDisp(due)}</strong>
        <span style="font-size:11px;color:var(--muted);">(${lang==='th'?'ข้ามวันหยุด':'skip weekends & holidays'})</span>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeModal()">${lang==='th'?'ยกเลิก':'Cancel'}</button>
        <button class="btn-primary" onclick="confirmAssign(${rowNum},'${targetStatus}')">${lang==='th'?'✓ ยืนยัน':'✓ Confirm'}</button>
      </div>`);
  }

  function updateProgress(rowNum) { updateProgressWithStatus(rowNum, 'Progress50'); }
  
  function updateProgressWithStatus(rowNum, targetStatus) {
    const j = jobs.find(x=>x.rowNum===rowNum); if (!j) return;
    const hrs = j.estimatedWorkhours || 8;
    const expDate = j.expectedDate || null;
    
    // คำนวณวันกำหนดส่ง
    const due = calcDueDate(todayStr(), hrs, settings.holidays, expDate);

    const designerOpts = settings.designers.map(d=>`<option value="${d}" ${d===settings.userName?'selected':''}>${d}</option>`).join('');
    showModal(`
      <div class="modal-title">🎨 ${lang==='th'?'แจ้งงานคืบหน้า ±50%':'Update Progress 50%'}</div>
      <div class="modal-section"><div class="modal-label">Project</div><div class="modal-value">${esc(j.projectName)}</div></div>
      <div class="modal-section"><div class="modal-label">Assign to</div><select class="modal-input" id="assign-designer" onchange="updateDuePreview(${rowNum})">${designerOpts}</select></div>
      <div class="modal-section"><div class="modal-label">Est. Hours</div><input type="number" class="modal-input" id="assign-hrs" value="${hrs}" min="1" max="200" oninput="updateDuePreview(${rowNum})"></div>
      <div class="due-preview" id="due-preview">📅 ${lang==='th'?'กำหนดส่ง:':'Est. due:'} <strong id="due-calc-result">${formatDateDisp(due)}</strong></div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeModal()">${lang==='th'?'ยกเลิก':'Cancel'}</button>
        <button class="btn-primary" onclick="confirmJobUpdate(${rowNum},'${targetStatus}')">${lang==='th'?'✓ ยืนยัน':'✓ Confirm'}</button>
      </div>`);
  }

  function updateProgress80(rowNum) { updateProgress80WithStatus(rowNum, 'Progress80'); }
  
  function updateProgress80WithStatus(rowNum, targetStatus) {
    const j = jobs.find(x=>x.rowNum===rowNum); if (!j) return;
    const hrs = j.estimatedWorkhours || 8;
    const expDate = j.expectedDate || null;
    
    // คำนวณวันกำหนดส่ง
    const due = calcDueDate(todayStr(), hrs, settings.holidays, expDate);

    const designerOpts = settings.designers.map(d=>`<option value="${d}" ${d===settings.userName?'selected':''}>${d}</option>`).join('');
    showModal(`
      <div class="modal-title">🎨 ${lang==='th'?'แจ้งงานคืบหน้า ±80%':'Update Progress 80%'}</div>
      <div class="modal-section"><div class="modal-label">Project</div><div class="modal-value">${esc(j.projectName)}</div></div>
      <div class="modal-section"><div class="modal-label">Assign to</div><select class="modal-input" id="assign-designer" onchange="updateDuePreview(${rowNum})">${designerOpts}</select></div>
      <div class="modal-section"><div class="modal-label">Est. Hours</div><input type="number" class="modal-input" id="assign-hrs" value="${hrs}" min="1" max="200" oninput="updateDuePreview(${rowNum})"></div>
      <div class="due-preview" id="due-preview">📅 ${lang==='th'?'กำหนดส่ง:':'Est. due:'} <strong id="due-calc-result">${formatDateDisp(due)}</strong></div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeModal()">${lang==='th'?'ยกเลิก':'Cancel'}</button>
        <button class="btn-primary" onclick="confirmJobUpdate80(${rowNum},'${targetStatus}')">${lang==='th'?'✓ ยืนยัน':'✓ Confirm'}</button>
      </div>`);
  }


  function updateDuePreview(rowNum) {
    const hrs = Number(document.getElementById('assign-hrs').value) || 8;

    // ค้นหาข้อมูลงานปัจจุบันจากอาร์เรย์ (สมมติว่า rowNum คือเลขแถวของการ์ดที่กำลังกดอยู่)
    const currentJob = jobs.find(j => j.rowNum === rowNum);
    const expDate = currentJob ? currentJob.expectedDate : null;
    // โยน expDate เข้าไปในฟังก์ชันด้วยเป็นตัวที่ 4
    const due = calcDueDate(todayStr(), hrs, settings.holidays, expDate);

    document.getElementById('due-calc-result').textContent = formatDateDisp(due);
  }

  function confirmAssign(rowNum, targetStatus) {
    const designer = document.getElementById('assign-designer').value;
    const hrs = Number(document.getElementById('assign-hrs').value)||8;

    // ค้นหาข้อมูลงานปัจจุบันจากอาร์เรย์ (สมมติว่า rowNum คือเลขแถวของการ์ดที่กำลังกดอยู่)
    const currentJob = jobs.find(j => j.rowNum === rowNum);
    const expDate = currentJob ? currentJob.expectedDate : null;
    // โยน expDate เข้าไปในฟังก์ชันด้วยเป็นตัวที่ 4
    const due = calcDueDate(todayStr(), hrs, settings.holidays, expDate);

    closeModal();
    serverPost({ action:'assignJob', rowNum, assignee:designer, estimatedDueDate:due, status:targetStatus }, () => toast(lang==='th'?'มอบหมายงานสำเร็จ':'Job assigned!', 'success'));
  }

  function confirmJobUpdate(rowNum, targetStatus) {
    const designer = document.getElementById('assign-designer').value;
    const hrs = Number(document.getElementById('assign-hrs').value)||8;

    // ค้นหาข้อมูลงานปัจจุบันจากอาร์เรย์ (สมมติว่า rowNum คือเลขแถวของการ์ดที่กำลังกดอยู่)
    const currentJob = jobs.find(j => j.rowNum === rowNum);
    const expDate = currentJob ? currentJob.expectedDate : null;
    // โยน expDate เข้าไปในฟังก์ชันด้วยเป็นตัวที่ 4
    const due = calcDueDate(todayStr(), hrs, settings.holidays, expDate);

    closeModal();

    serverPost({ 
      action:'jobUpdate', 
      rowNum, 
      assignee:designer, 
      estimatedWorkhours: hrs, // 👈 ส่งชั่วโมงไปเซฟ
      estimatedDueDate:due,    // 👈 ส่งวันดีลไลน์ไปเซฟ 
      status:targetStatus 
    }, () => toast(lang==='th'?'อัปเดตแล้ว':'Updated!', 'success'));
  }

  function confirmJobUpdate80(rowNum, targetStatus) {
    const designer = document.getElementById('assign-designer').value;
    const hrs = Number(document.getElementById('assign-hrs').value)||8;

    // ค้นหาข้อมูลงานปัจจุบันจากอาร์เรย์ (สมมติว่า rowNum คือเลขแถวของการ์ดที่กำลังกดอยู่)
    const currentJob = jobs.find(j => j.rowNum === rowNum);
    const expDate = currentJob ? currentJob.expectedDate : null;
    // โยน expDate เข้าไปในฟังก์ชันด้วยเป็นตัวที่ 4
    const due = calcDueDate(todayStr(), hrs, settings.holidays, expDate);

    closeModal();
    serverPost({ 
      action:'jobUpdate80', 
      rowNum, 
      assignee:designer, 
      estimatedWorkhours: hrs, // 👈 ส่งชั่วโมงไปเซฟ
      estimatedDueDate:due,    // 👈 ส่งวันดีลไลน์ไปเซฟ, 
      status:targetStatus 
    }, () => toast(lang==='th'?'อัปเดตแล้ว':'Updated!', 'success'));
  }

  // ── COMPLETE MODAL ─────────────────────────────────────────
  function openComplete(rowNum) {
    const j = jobs.find(x=>x.rowNum===rowNum); if (!j) return;
    const due = j.estimatedDueDate||j.finalDueDate||j.expectedDate||'';
    const mbo = due ? dayDiff(due, todayStr()) : null;
    const mboColor = mbo===null?'var(--muted)':mbo>=0?'var(--green)':'var(--red)';
    showModal(`
      <div class="modal-title">✅ ${lang==='th'?'ยืนยันงานเสร็จแล้ว':'Mark as Complete'}</div>
      <div class="modal-section"><div class="modal-label">Project</div><div class="modal-value">${esc(j.projectName)}</div></div>
      ${due?`<div class="due-preview">MBO: <strong style="color:${mboColor};font-family:var(--mono);">${mbo!==null?(mbo>=0?'+':'')+mbo+'d':'—'}</strong><span style="font-size:11px;color:var(--muted);">${lang==='th'?'(+ = ก่อนกำหนด, - = เกินกำหนด)':'(+ = early, - = late)'}</span></div>`:''}
      <div class="modal-section" style="margin-top:12px;">
        <div class="modal-label">${lang==='th'?'หมายเหตุ':'Note'}</div>
        <textarea class="modal-input" id="complete-note" placeholder="${lang==='th'?'หมายเหตุ...':'Notes...'}">${esc(j.completionNote||'')}</textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closeModal()">${lang==='th'?'ยกเลิก':'Cancel'}</button>
        <button class="btn-primary" onclick="confirmComplete(${rowNum})">✅ ${lang==='th'?'ยืนยัน':'Confirm'}</button>
      </div>`);
  }

  function confirmComplete(rowNum) {
    const note = document.getElementById('complete-note').value;
    closeModal();
    serverPost({ action:'completeJob', rowNum, completionNote:note }, () => toast(lang==='th'?'งานเสร็จแล้ว 🎉':'Job completed! 🎉', 'success'));
  }

  function advanceStatus(rowNum, status) {
    serverPost({ action:'advanceStatus', rowNum, status }, () => toast(lang==='th'?'อัปเดตสถานะแล้ว':'Status updated', 'success'));
  }



  function openRejectModal(rowNum) {
    const j = jobs.find(x => x.rowNum === rowNum);
    if (!j) return;
    showModal(
      '<div class="modal-title">🚫 ' + (lang==='th' ? 'ยกเลิกงาน' : 'Reject Job') + ' — #' + esc(j.no) + '</div>' +
      '<div class="modal-section"><div class="modal-label">' + (lang==='th' ? 'ชื่องาน' : 'Project') + '</div><div class="modal-value">' + esc(j.projectName) + '</div></div>' +
      '<div class="modal-section">' +
        '<div class="modal-label">' + (lang==='th' ? 'เหตุผลการยกเลิก' : 'Reason for rejection') + '</div>' +
        '<textarea class="modal-input" id="reject-reason" rows="3" placeholder="' + (lang==='th' ? 'ระบุเหตุผล...' : 'Enter reason...') + '"></textarea>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn-cancel" onclick="closeModal()">' + (lang==='th' ? 'ยกเลิก' : 'Cancel') + '</button>' +
        '<button class="btn-danger-full" onclick="confirmReject(' + rowNum + ')">🚫 ' + (lang==='th' ? 'ยืนยันยกเลิกงาน' : 'Confirm Reject') + '</button>' +
      '</div>'
    );
  }

  function confirmReject(rowNum) {
    const reason = document.getElementById('reject-reason').value.trim();
    closeModal();
    serverPost({ action: 'advanceStatus', rowNum, status: 'Reject', completionNote: reason }, function() {
      toast(lang==='th' ? 'ยกเลิกงานแล้ว' : 'Job rejected', 'error');
    });
  }


  // ═══════════════════════════════════════════════════════════
  //  ALERTS
  // ═══════════════════════════════════════════════════════════
  function checkAlerts() {
    const today = todayStr();
    const dueTodayJobs = jobs.filter(j => (j.estimatedDueDate||j.finalDueDate||j.expectedDate||'') === today && j.status !== 'Done' && j.status !== 'Reject');
    const banner = document.getElementById('alert-banner');
    if (dueTodayJobs.length > 0) {
      document.getElementById('alert-text').textContent = (lang==='th'?'⚠ มีงานกำหนดส่งวันนี้ ':'⚠ Jobs due today: ') + dueTodayJobs.map(j=>`#${j.no} ${j.projectName.substring(0,20)}`).join(', ');
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  DUE DATE CALCULATION
  // ═══════════════════════════════════════════════════════════
  /*
  function calcDueDate(startStr, workhours, holidays) {
    const days = Math.ceil(workhours / 8);
    let date = new Date(startStr + 'T00:00:00');
    let added = 0;
    const hset = new Set(holidays);
    while (added < days) {
      date.setDate(date.getDate() + 1);
      const ds = dateToStr(date);
      const dow = date.getDay();
      if (dow !== 0 && dow !== 6 && !hset.has(ds)) added++;
    }
    return dateToStr(date);
  }*/
  // =========================================================================
  // 🗓️ ฟังก์ชันคำนวณวันส่งงาน (อัปเกรดใหม่รองรับ Expected Date)
  // =========================================================================
  function calcDueDate(startDateStr, workhours, holidaysArray, expectedDateRaw) {
    if (!startDateStr || workhours <= 0) return startDateStr;
    
    let d = new Date(startDateStr);
    if (isNaN(d.getTime())) d = new Date();
    d.setHours(0,0,0,0);

    let days = Math.ceil(workhours / 8) + 1; // +1 เผื่อคิวเสมอ
    let safety = 0;
    
    // 1. คำนวณวันส่งตามมาตรฐาน (ข้ามวันหยุด เสาร์-อาทิตย์)
    while (days > 0 && safety < 365) {
      d.setDate(d.getDate() + 1);
      safety++;
      let dow = d.getDay();
      // แปลงวันที่กำลังเช็กเป็น string "YYYY-MM-DD" เพื่อเทียบกับ Array วันหยุด
      let offsetDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
      let ds = offsetDate.toISOString().split('T')[0]; 
      
      if (dow !== 0 && dow !== 6 && !(holidaysArray && holidaysArray.includes(ds))) {
        days--;
      }
    }

    // 🚀 2. ลอจิกใหม่: นำ Expected Date มาเทียบ ถ้าลูกค้าระบุเวลาไว้ให้ยาวกว่า ให้ขยับวันพรีวิวตามลูกค้าระบุเลย
    if (expectedDateRaw) {
      let expDate = new Date(expectedDateRaw);
      expDate.setHours(0,0,0,0);
      if (!isNaN(expDate.getTime()) && expDate > d) {
        // ถ้า Expected ไกลกว่า ให้ใช้วัน Expected
        let offsetExp = new Date(expDate.getTime() - (expDate.getTimezoneOffset() * 60000));
        return offsetExp.toISOString().split('T')[0]; 
      }
    }

    // ถ้า Expected สั้นกว่าหรือไม่มี ให้ใช้วันที่ระบบคำนวณได้
    let finalOffset = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return finalOffset.toISOString().split('T')[0];
  }  

  // ═══════════════════════════════════════════════════════════
  //  SETTINGS
  // ═══════════════════════════════════════════════════════════
  function toggleSettings() { document.getElementById('settings-panel').classList.toggle('open'); }
  function saveSettings() {
    settings.designers = document.getElementById('designers-input').value.split('\n').map(s=>s.trim()).filter(Boolean);
    settings.holidays = document.getElementById('holidays-input').value.split('\n').map(s=>s.trim()).filter(Boolean);
    settings.role = document.getElementById('user-role').value;
    settings.userName = document.getElementById('user-name').value.trim();
    try { localStorage.setItem('artwork_settings', JSON.stringify(settings)); } catch(e) {}
  }
  function loadLocalSettings() {
    try { const s = JSON.parse(localStorage.getItem('artwork_settings')||'{}'); Object.assign(settings, s); } catch(e) {}
  }
  function populateSettingsUI() {
    document.getElementById('designers-input').value = settings.designers.join('\n');
    document.getElementById('holidays-input').value = settings.holidays.join('\n');
    document.getElementById('user-role').value = settings.role||'manager';
    document.getElementById('user-name').value = settings.userName||'';
  }
  function applySettings() { saveSettings(); toggleSettings(); toast(lang==='th'?'บันทึกการตั้งค่าแล้ว':'Settings saved', 'success'); }

  // ═══════════════════════════════════════════════════════════
  //  VIEW / LANG / UI HELPERS
  // ═══════════════════════════════════════════════════════════
  function setView(v) {
    view = v;
    document.getElementById('kanban-view').style.display = v==='kanban'?'flex':'none';
    document.getElementById('list-view').style.display   = v==='list'?'block':'none';
    document.getElementById('gantt-view').style.display  = v==='gantt'?'block':'none';

    // เพิ่มบรรทัดนี้
    document.getElementById('dashboard-view').style.display = v==='dashboard'?'flex':'none';
    document.getElementById('kpi-view').style.display = v==='kpi'?'flex':'none';

    // เพิ่ม 'dashboard' เข้าไปใน loop นี้
    ['kanban','list','gantt','dashboard','kpi'].forEach(vv => document.getElementById('vbtn-'+vv).classList.toggle('active', vv===v));
    //['kanban','list','gantt'].forEach(vv => document.getElementById('vbtn-'+vv).classList.toggle('active', vv===v));
    renderAll();
  }

  function toggleLang() {
    lang = lang==='th'?'en':'th';
    document.getElementById('lang-toggle').textContent = lang==='th'?'EN':'TH';
    document.getElementById('search').placeholder = lang==='th'?'ค้นหาชื่องาน...':'Search job name...';
    renderAll(); checkAlerts();
  }

  function setApiStatus(s) {
    const el = document.getElementById('api-status');
    el.className = s;
    el.id = 'api-status';
    const labels = {
      connected: {th:'● เชื่อมต่อแล้ว', en:'● Connected'},
      disconnected: {th:'✕ ไม่ได้เชื่อมต่อ', en:'✕ Disconnected'},
      loading: {th:'◌ กำลังโหลด...', en:'◌ Loading...'},
    };
    el.textContent = (labels[s]||labels.disconnected)[lang];
    el.id = 'api-status';
    el.className = s;
  }

  function toast(msg, type='info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }


  // ============================================================
  // 📦 HELPER FUNCTION: เตรียมข้อมูลสำหรับ Export (ลดการเขียนโค้ดซ้ำซ้อน)
  // ============================================================
  function getExportData() {
    const dataToExport = getFiltered().filter(j => j.status !== 'Reject'); 
    
    if (dataToExport.length === 0) return null;
    dataToExport.sort(function(a,b) {
      return (Number(a.no) || 0) - (Number(b.no) || 0);
    });

    const headers = [
      'Job No', 'Project Name', 'Status', 'Priority', 'Requested By',
      'Department', 'Type', 'Format', 'Qty Required', 'Est. Hours',
      'Submitted Date', 'Expected Date',
      'Assignee',
      'Start Date', 'Agreed Due Date', 'Delivered Date', 'Completed Date',
      'Days Early+/Late-'
    ];

    const rows = dataToExport.map(function(j) {
      const agreedDue = j.finalDueDate || j.estimatedDueDate || j.expectedDate || '';
      const diffDays = (j.completedDate && agreedDue) ? dayDiff(agreedDue, j.completedDate) : '—';
      
      return [
        j.no, j.projectName, slabel(j.status), j.priority || 5, j.requestedBy,
        j.department, j.type, j.format, j.qtyRequired, j.estimatedWorkhours,
        j.requestDate || '', j.expectedDate || '', 
        j.assignee || '',
        j.startedDate || '', agreedDue, j.deliveredDate || '', j.completedDate || '', 
        diffDays
      ];
    });

    return [headers].concat(rows); // ส่งกลับเป็น Array ก้อนเดียวที่มีทั้งหัวตารางและข้อมูล
  }


  // ═══════════════════════════════════════════════════════════
  //  EXPORT TO GOOGLE SHEET (เวอร์ชันแก้ปัญหา Popup Blocker + ตรวจสอบ Error)
  // ═══════════════════════════════════════════════════════════
  function exportToSheet() {
    const sheetData = getExportData();
    
    if (!sheetData) {
      toast(lang === 'th' ? '❌ ไม่มีข้อมูลให้ Export' : '❌ No data to export', 'error');
      return;
    }

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast(lang === 'th' ? '❌ เบราว์เซอร์บล็อกป็อปอัป กรุณาอนุญาตให้เปิดป็อปอัป' : '❌ Popup blocked! Please allow popups.', 'error');
      return;
    }
    
    newWindow.document.write(`<div style="font-family:sans-serif; text-align:center; padding-top:100px; color:#555;">
      <h2>⏳ กำลังสร้าง Google Sheet...</h2>
      <p>ระบบกำลังประมวลผลข้อมูล โปรดรอสักครู่ หน้าต่างนี้จะเปลี่ยนไปยังไฟล์ชีตโดยอัตโนมัติ</p>
    </div>`);

    toast(lang === 'th' ? '⏳ กำลังสร้าง Google Sheet...' : '⏳ Creating Google Sheet...', 'info');

    // ส่งข้อมูลไปที่ Server เลย ไม่ต้องมานั่ง Map ข้อมูลใหม่แล้ว
    serverFetch('exportToSheet', { sheetData: sheetData })
      .then(function(result) {
        if (result && result.url) {
          toast(lang === 'th' ? '✅ สร้างไฟล์สำเร็จ!' : '✅ Created successfully!', 'success');
          newWindow.location.href = result.url;
        } else {
          const errMsg = result && result.error ? result.error : 'Unknown error';
          toast((lang === 'th' ? '❌ สร้างไม่สำเร็จ: ' : '❌ Error: ') + errMsg, 'error');
          newWindow.close(); 
        }
      })
      .catch(function(err) {
        toast('Error: ' + err.message, 'error');
        newWindow.close();
      });
  }


  // ═══════════════════════════════════════════════════════════
  //  EXPORT TO CSV FUNCTION (สำหรับหัวหน้างานนำไปประมวลผลต่อ)
  // ═══════════════════════════════════════════════════════════
  function exportToCSV() {
    const sheetData = getExportData();
    
    if (!sheetData) {
      toast(lang === 'th' ? '❌ ไม่มีข้อมูลให้ Export' : '❌ No data to export', 'error');
      return;
    }

    let csvContent = "";
    
    // แปลง Array เป็น CSV String
    sheetData.forEach(function(rowArray) {
      let row = rowArray.map(function(v) { 
        return '"' + String(v || '').replace(/"/g, '""') + '"'; 
      }).join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", "artwork_export_" + dateStr + ".csv");
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast(lang === 'th' ? 'Export ข้อมูลสำเร็จเรียบร้อย! 📥' : 'Data exported successfully! 📥', 'success');
  }

  function slabel(s) { return STATUS_LABELS[lang][s] || s; }
  function nextStatus(s) { const i = STATUS_FLOW.indexOf(s); return i < STATUS_FLOW.length-1 ? STATUS_FLOW[i+1] : s; }
  function getOverdueClass(j) {
    const due = j.estimatedDueDate||j.finalDueDate||j.expectedDate||'';
    if (!due || j.status==='Done' || j.status==='Reject') return '';
    const today = todayStr();
    if (due < today) return 'overdue'; if (due === today) return 'due-today'; return '';
  }
  function isOverdue(j) { return getOverdueClass(j) === 'overdue'; }
  function todayStr() { return dateToStr(new Date()); }
  function dateToStr(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function dayDiff(dateA, dateB) { return Math.round((new Date(dateA)-new Date(dateB))/86400000); }
  function formatDateDisp(s) {
    if (!s) return '—';
    try {
      const d = new Date(s+'T00:00:00');
      if (lang==='th') {
        const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543}`;
      }
      return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    } catch(e) { return s; }
  }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ═══════════════════════════════════════════════════════════
  //  THEME
  // ═══════════════════════════════════════════════════════════
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    ['dark','grey','light'].forEach(function(k) {
      var btn = document.getElementById('tbtn-' + k);
      if (btn) btn.classList.toggle('active', k === t);
    });
    try { localStorage.setItem('aw_theme', t); } catch(e) {}
  }
  function loadTheme() {
    try {
      var t = localStorage.getItem('aw_theme') || 'dark';
      setTheme(t);
    } catch(e) { setTheme('dark'); }
  }

  // ═══════════════════════════════════════════════════════════
  //  START
  // ═══════════════════════════════════════════════════════════
  loadTheme();
  //init();
  document.addEventListener("DOMContentLoaded", function() {
    init();
  });
  
  // ═══════════════════════════════════════════════════════════
  //  DASHBOARD RENDERER
  // ═══════════════════════════════════════════════════════════
  let dashCharts = {}; // เก็บ object กราฟ

  function renderDashboard(filtered) {
    // 1. อัปเดตตัวเลข Top Cards
    const countTotal = filtered.length;
    const countNew = filtered.filter(j => j.status === 'new').length;
    const countProg = filtered.filter(j => ['Start','Progress50','Progress80'].includes(j.status)).length;
    const countRev = filtered.filter(j => j.status === 'Review').length;
    const countDone = filtered.filter(j => j.status === 'Done').length;
    const countRej = filtered.filter(j => j.status === 'Reject').length;

    document.getElementById('d-val-total').textContent = countTotal;
    document.getElementById('d-val-new').textContent = countNew;
    document.getElementById('d-val-prog').textContent = countProg;
    document.getElementById('d-val-review').textContent = countRev;
    document.getElementById('d-val-done').textContent = countDone;
    document.getElementById('d-val-reject').textContent = countRej;

    // วาดกราฟเฉพาะตอนที่กำลังเปิดดูหน้านี้ เพื่อประหยัดทรัพยากรเครื่อง
    if (view !== 'dashboard') return;

    // ลบกราฟเก่าทิ้งก่อนวาดใหม่ (ป้องกันบั๊กเวลากดสลับฟิลเตอร์ไปมา)
    Object.values(dashCharts).forEach(c => c.destroy());
    dashCharts = {};

    // ดึงค่าสีพื้นฐานตาม Theme ปัจจุบัน (Dark/Light)
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#e8eaf0' : '#1a2133';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const themeMode = isDark ? 'dark' : 'light';
    const palette = ['#0ea5e9', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#2563eb', '#ec4899'];

    // ฟังก์ชันช่วยนับจำนวนข้อมูล
    function countBy(data, key) {
      return data.reduce((acc, curr) => {
        const val = curr[key] || 'ไม่ระบุ';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
    }

    // ฟังก์ชันจัดกลุ่มกราฟแท่งซ้อน (Stacked Bar) รองรับการใส่ฟีลด์สำหรับใช้เรียงลำดับ
    function aggStacked(data, xField, seriesField, sortField = null) {
      let xVals = [];
      if (sortField) {
        // 💡 ถ้ามีการระบุฟีลด์สำหรับเรียงลำดับ (เช่น เรียงเดือนตามลำดับเวลาตัวเลข)
        let uniquePairs = [];
        let seen = new Set();
        data.forEach(d => {
          let xVal = d[xField] || (lang === 'th' ? 'ไม่ระบุ' : 'Unknown');
          let sVal = d[sortField] || '9999-99';
          if (!seen.has(xVal)) {
            seen.add(xVal);
            uniquePairs.push({ x: xVal, s: sVal });
          }
        });
        // เรียงลำดับตาม Key ของเวลาแทนตัวอักษร (e.g., "2026-01" มาก่อน "2026-02")
        uniquePairs.sort((a, b) => a.s.localeCompare(b.s));
        xVals = uniquePairs.map(p => p.x);
      } else {
        // ถ้าไม่มี ให้เรียงตามตัวอักษรปกติ (เช่น ชื่อแผนก)
        xVals = [...new Set(data.map(d => d[xField] || (lang === 'th' ? 'ไม่ระบุ' : 'Unknown')))].sort();
      }
      
      let sVals = [...new Set(data.map(d => d[seriesField] || (lang === 'th' ? 'ไม่ระบุ' : 'Unknown')))].sort();
      let series = sVals.map(s => {
        return {
          name: s,
          data: xVals.map(x => data.filter(d => (d[xField]||(lang === 'th' ? 'ไม่ระบุ' : 'Unknown')) === x && (d[seriesField]||(lang === 'th' ? 'ไม่ระบุ' : 'Unknown')) === s).length)
        };
      });
      return { categories: xVals, series: series };
    }


    // สกัดเดือนจาก Request Date พร้อมสร้าง Key สำหรับเรียงตามลำดับเวลา (Chronological Sort Key)
    const filteredWithMonth = filtered.map(j => {
      let m = lang === 'th' ? 'ไม่ระบุ' : 'Unknown';
      let sortKey = '9999-99'; // สำหรับงานที่ไม่มีวันที่ ให้ไปต่อท้ายสุด
      if (j.requestDate && j.requestDate.length >= 7) {
        sortKey = j.requestDate.slice(0, 7); // จะได้ค่าตัวเลข เช่น "2026-01", "2026-02" นำไปเรียงเวลาได้แม่นยำ
        const year = j.requestDate.slice(0, 4);
        const monthNum = parseInt(j.requestDate.slice(5, 7), 10);
        const months = lang === 'th' ? ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'] : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        m = months[monthNum - 1] + ' ' + year.slice(-2);
      }
      return { ...j, reqMonth: m, monthSortKey: sortKey };
    });


    const commonOptions = {
      chart: { background: 'transparent', foreColor: textColor, toolbar: { show: false }, animations: { speed: 400 } },
      theme: { mode: themeMode, palette: 'palette1' },
      colors: palette,
      dataLabels: { style: { colors: [isDark ? '#fff' : '#000'] } }
    };

    // --- 1. กราฟโดนัท สถานะ ---
    const statusData = countBy(filtered, 'status');
    dashCharts.status = new ApexCharts(document.querySelector("#chart-status"), {
      ...commonOptions, series: Object.values(statusData),
      chart: { type: 'donut', height: 280, background: 'transparent' },
      labels: Object.keys(statusData).map(s => slabel(s)),
      stroke: { colors: [isDark ? '#22262f' : '#ffffff'] }
    });
    dashCharts.status.render();

    // --- 2. กราฟโดนัท Format ---
    const formatData = countBy(filtered, 'format');
    dashCharts.format = new ApexCharts(document.querySelector("#chart-format"), {
      ...commonOptions, series: Object.values(formatData),
      chart: { type: 'donut', height: 280, background: 'transparent' },
      labels: Object.keys(formatData),
      stroke: { colors: [isDark ? '#22262f' : '#ffffff'] }
    });
    dashCharts.format.render();

    // --- 3. กราฟโดนัท Department ---
    const deptData = countBy(filtered, 'department');
    dashCharts.dept = new ApexCharts(document.querySelector("#chart-dept"), {
      ...commonOptions, series: Object.values(deptData),
      chart: { type: 'donut', height: 280, background: 'transparent' },
      labels: Object.keys(deptData),
      stroke: { colors: [isDark ? '#22262f' : '#ffffff'] }
    });
    dashCharts.dept.render();

    // --- 4. กราฟแท่งซ้อน เทรนด์รายเดือน ---
    const monthlyAgg = aggStacked(filteredWithMonth, 'reqMonth', 'type', 'monthSortKey');
    dashCharts.monthly = new ApexCharts(document.querySelector("#chart-monthly"), {
      ...commonOptions, series: monthlyAgg.series,
      chart: { type: 'bar', height: 350, stacked: true, background: 'transparent', toolbar: { show: true } },
      xaxis: { categories: monthlyAgg.categories, labels: { style: { colors: textColor } } },
      yaxis: { labels: { style: { colors: textColor } } },
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      fill: { opacity: 0.9 }
    });
    dashCharts.monthly.render();


    // --- 5. กราฟแท่งซ้อน ปริมาณงานรายแผนก ---
    const deptAgg = aggStacked(filtered, 'department', 'type');
    dashCharts.deptBar = new ApexCharts(document.querySelector("#chart-dept-bar"), {
      ...commonOptions, series: deptAgg.series,
      chart: { type: 'bar', height: 350, stacked: true, background: 'transparent', toolbar: { show: true } },
      xaxis: { categories: deptAgg.categories, labels: { style: { colors: textColor } } },
      yaxis: { labels: { style: { colors: textColor } } },
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      fill: { opacity: 0.9 },
      plotOptions: { bar: { horizontal: false, columnWidth: '40%' } }
    });
    dashCharts.deptBar.render();
  }


  // ============================================================
  // 🧹 FUNCTION: ล้างค่าตัวกรองทั้งหมดกลับเป็นค่าเริ่มต้น (Reset Filters)
  // ============================================================
  function resetFilters() {
    // 1. ล้างช่องค้นหา (Search Box)
    const searchInput = document.getElementById('search');
    if (searchInput) searchInput.value = '';
    
    // 2. รายชื่อ ID ของ Dropdown ฟิลเตอร์ทั้งหมดในระบบ
    const filterIds = ['f-year', 'f-month', 'f-dept', 'f-type', 'f-format', 'f-requester', 'f-assignee'];
    
    // วนลูปตั้งค่า Dropdown ทุกช่องกลับเป็นค่าว่างแรกสุด
    filterIds.forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    
    // 3. ล้างค่าการกดฟิลเตอร์กลุ่มด่วนบน Quick Stat Bar (ถ้ามีเลือกไว้)
    activeStatFilter = null;
    ['new','inprogress','review','done','overdue','due-today'].forEach(function(group) {
      const statEl = document.getElementById('stat-' + group);
      if (statEl) statEl.classList.remove('active');
    });
    
    // 4. สั่งประมวลผลวาดการ์ดและแดชบอร์ดใหม่ทั้งหมดทันที
    renderAll();
    
    // 5. พ่นข้อความแจ้งเตือนความสำเร็จสวยๆ ด้านมุมขวา
    toast(lang === 'th' ? '🧹 ล้างตัวกรองทั้งหมดเรียบร้อยแล้ว' : '🧹 All filters cleared', 'info');
  }

/*
  // ═══════════════════════════════════════════════════════════
  //  🎯 KPI PERFORMANCE DASHBOARD RENDERER
  // ═══════════════════════════════════════════════════════════
  let kpiCharts = {}; 

  function renderKPIDashboard(filtered) {
    if (view !== 'kpi') return; // ทำงานเฉพาะตอนเปิดหน้า KPI เท่านั้น

    // ล้างกราฟเก่าก่อนวาดใหม่ป้องกันหน่วยความจำซ้อน
    Object.values(kpiCharts).forEach(c => c.destroy());
    kpiCharts = {};

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#e8eaf0' : '#1a2133';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const themeMode = isDark ? 'dark' : 'light';

    // 1. ดึงรายชื่อนักออกแบบทั้งหมดจากระบบมาคำนวณ
    const designers = [...settings.designers];
    
    const perfData = designers.map(name => {
      const dJobs = filtered.filter(j => j.assignee === name);
      const doneJobs = dJobs.filter(j => j.status === 'Done');
      const activeJobs = dJobs.filter(j => ['Start','Progress50','Progress80','Review'].includes(j.status));
      const rejectJobs = dJobs.filter(j => j.status === 'Reject');
      
      // รวมชั่วโมงงานสร้างสรรค์ที่ปิดจ๊อบสำเร็จ
      const totalHours = doneJobs.reduce((sum, j) => sum + (Number(j.estimatedWorkhours) || 0), 0);
      
      // คำนวณวันส่งก่อน/หลังกำหนด (MBO)
      const mboValues = doneJobs.map(j => j.mbo).filter(v => v !== '' && v !== undefined).map(Number);
      const avgMBO = mboValues.length > 0 ? (mboValues.reduce((s, v) => s + v, 0) / mboValues.length).toFixed(1) : 0;
      
      // อัตราการรักษาเวลาสำเร็จ
      const onTimeCount = mboValues.filter(v => v >= 0).length;
      const onTimeRate = mboValues.length > 0 ? Math.round((onTimeCount / mboValues.length) * 100) : 0;

      // แตกแจงสเตตัสงานในมือปัจจุบัน เพื่อตรวจสอบคอขวดกระจายงาน
      const loadStart = activeJobs.filter(j => j.status === 'Start').length;
      const loadP50 = activeJobs.filter(j => j.status === 'Progress50').length;
      const loadP80 = activeJobs.filter(j => j.status === 'Progress80').length;
      const loadRev = activeJobs.filter(j => j.status === 'Review').length;

      return {
        name, doneCount: doneJobs.length, totalHours, avgMBO: Number(avgMBO), onTimeRate,
        activeCount: activeJobs.length, rejectCount: rejectJobs.length,
        load: { loadStart, loadP50, loadP80, loadRev }
      };
    });

    // 2. คำนวณขีดความสามารถภาพรวมของทีม (Team Averages)
    const teamDoneJobs = filtered.filter(j => j.status === 'Done');
    const teamMboValues = teamDoneJobs.map(j => j.mbo).filter(v => v !== '' && v !== undefined).map(Number);
    
    const teamOnTimeRate = teamMboValues.length > 0 ? Math.round((teamMboValues.filter(v => v >= 0).length / teamMboValues.length) * 100) : 0;
    const teamTotalHours = teamDoneJobs.reduce((sum, j) => sum + (Number(j.estimatedWorkhours) || 0), 0);
    const teamAvgMBO = teamMboValues.length > 0 ? (teamMboValues.reduce((s, v) => s + v, 0) / teamMboValues.length).toFixed(1) : 0;

    // ผลักตัวเลขขึ้นการ์ดด้านบน
    document.getElementById('k-val-ontime').textContent = teamOnTimeRate + '%';
    document.getElementById('k-val-hours').textContent = teamTotalHours + ' hrs';
    document.getElementById('k-val-mbo').textContent = (teamAvgMBO >= 0 ? '+' : '') + teamAvgMBO + ' วัน';

    // 3. วาดตาราง Leaderboard พร้อมประเมินเฉดสีความเสี่ยงประสิทธิภาพ (KPI Indicators)
    const tbody = document.querySelector('#kpi-table tbody');
    tbody.innerHTML = perfData.map(d => {
      const mboClass = d.avgMBO > 0 ? 'mbo-pos' : d.avgMBO < 0 ? 'mbo-neg' : '';
      const rateClass = d.onTimeRate >= 80 ? 'mbo-pos' : (d.doneCount > 0 && d.onTimeRate < 60) ? 'mbo-neg' : '';
      const loadPillClass = d.activeCount >= 5 ? 'pill-reject' : d.activeCount > 0 ? 'pill-start' : 'pill-pending';
      return `<tr>
        <td><span style="display:flex;align-items:center;gap:6px;"><span class="avatar">${d.name.charAt(0)}</span><strong>${d.name}</strong></span></td>
        <td style="font-family:var(--mono);">${d.doneCount} งาน</td>
        <td style="font-family:var(--mono); font-weight:500; color:var(--cyan);">${d.totalHours} hrs</td>
        <td class="${mboClass}" style="font-family:var(--mono);">${d.doneCount > 0 ? (d.avgMBO >= 0 ? '+' : '') + d.avgMBO + ' วัน' : '—'}</td>
        <td class="${rateClass}" style="font-family:var(--mono); font-weight:600;">${d.doneCount > 0 ? d.onTimeRate + '%' : '—'}</td>
        <td style="font-family:var(--mono); text-align:center;"><span class="status-pill ${loadPillClass}">${d.activeCount} งาน</span></td>
        <td style="font-family:var(--mono); color:var(--muted);">${d.rejectCount}</td>
      </tr>`;
    }).join('');

    // 4. วาดกราฟหลักแบบผสม (Mixed Chart): แท่งแสดงจำนวนงานที่จบได้ + เส้นความเร็ว MBO ดูกราฟแล้วรู้ทันทีว่าใคร "ทำไวแต่เลท" หรือ "งานเยอะแต่เป๊ะ"
    kpiCharts.main = new ApexCharts(document.querySelector("#chart-kpi-main"), {
      chart: { height: 320, type: 'line', background: 'transparent', foreColor: textColor, toolbar: { show: false } },
      theme: { mode: themeMode },
      stroke: { width: [0, 4], curve: 'smooth' },
      colors: ['#0ea5e9', '#059669'],
      series: [
        { name: 'จำนวนงานที่เสร็จ (Done Jobs)', type: 'column', data: perfData.map(d => d.doneCount) },
        { name: 'เฉลี่ยวันส่งก่อนกำหนด (Avg MBO Days)', type: 'line', data: perfData.map(d => d.avgMBO) }
      ],
      xaxis: { categories: perfData.map(d => d.name) },
      yaxis: [
        { title: { text: 'จำนวนงาน (ปริมาณงาน)' } },
        { opposite: true, title: { text: 'ประสิทธิภาพเวลา MBO (วัน)' } }
      ],
      grid: { borderColor: gridColor, strokeDashArray: 4 }
    });
    kpiCharts.main.render();

    // 5. วาดกราฟแท่งซ้อนแนวนอน (Horizontal Stacked Bar) เพื่อตรวจเช็กการกระจายงาน (Workload Balance) ช่วยหัวหน้าประเมินความเสี่ยงทีมงานเกิดอาการ Burnout
    kpiCharts.load = new ApexCharts(document.querySelector("#chart-kpi-load"), {
      chart: { height: 320, type: 'bar', stacked: true, background: 'transparent', foreColor: textColor, toolbar: { show: false } },
      theme: { mode: themeMode },
      plotOptions: { bar: { horizontal: true, barHeight: '40%', borderRadius: 4 } },
      colors: ['#d97706', '#0ea5e9', '#7c3aed', '#ec4899'],
      series: [
        { name: 'เริ่มทำ (Start)', data: perfData.map(d => d.load.loadStart) },
        { name: 'คืบหน้า 50% (P50)', data: perfData.map(d => d.load.loadP50) },
        { name: 'คืบหน้า 80% (P80)', data: perfData.map(d => d.load.loadP80) },
        { name: 'รอตรวจ (Review)', data: perfData.map(d => d.load.loadRev) }
      ],
      xaxis: { categories: perfData.map(d => d.name), labels: { formatter: val => Math.round(val) } },
      grid: { borderColor: gridColor, strokeDashArray: 4 }
    });
    kpiCharts.load.render();
  }
*/
  // ═══════════════════════════════════════════════════════════
  //  🎯 KPI PERFORMANCE DASHBOARD RENDERER (ตัดคอลัมน์ REJECT ออก)
  // ═══════════════════════════════════════════════════════════
  let kpiCharts = {}; 

  function renderKPIDashboard(filtered) {
    if (view !== 'kpi') return; 

    Object.values(kpiCharts).forEach(c => c.destroy());
    kpiCharts = {};

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#e8eaf0' : '#1a2133';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const themeMode = isDark ? 'dark' : 'light';

    const designers = [...settings.designers];
    
    const perfData = designers.map(name => {
      const dJobs = filtered.filter(j => j.assignee === name);
      const doneJobs = dJobs.filter(j => j.status === 'Done');
      const activeJobs = dJobs.filter(j => ['Start','Progress50','Progress80','Review'].includes(j.status));
      
      const totalHours = doneJobs.reduce((sum, j) => sum + (Number(j.estimatedWorkhours) || 0), 0);
      
      const mboValues = doneJobs.map(j => {
        const agreedDue = j.finalDueDate || j.estimatedDueDate || j.expectedDate || '';
        return (j.completedDate && agreedDue) ? dayDiff(agreedDue, j.completedDate) : null;
      }).filter(v => v !== null);

      const avgMBO = mboValues.length > 0 ? (mboValues.reduce((s, v) => s + v, 0) / mboValues.length).toFixed(1) : 0;
      
      const onTimeCount = mboValues.filter(v => v >= 0).length;
      const onTimeRate = mboValues.length > 0 ? Math.round((onTimeCount / mboValues.length) * 100) : 0;

      const earlyCount = mboValues.filter(v => v > 0).length;
      const earlyRate = mboValues.length > 0 ? Math.round((earlyCount / mboValues.length) * 100) : 0;

      const loadStart = activeJobs.filter(j => j.status === 'Start').length;
      const loadP50 = activeJobs.filter(j => j.status === 'Progress50').length;
      const loadP80 = activeJobs.filter(j => j.status === 'Progress80').length;
      const loadRev = activeJobs.filter(j => j.status === 'Review').length;

      return {
        name, doneCount: doneJobs.length, totalHours, avgMBO: Number(avgMBO), onTimeRate, earlyRate,
        activeCount: activeJobs.length,
        load: { loadStart, loadP50, loadP80, loadRev }
      };
    });

    // --- ส่วนคำนวณภาพรวมทีม ---
    const teamDoneJobs = filtered.filter(j => j.status === 'Done');
    const teamMboValues = teamDoneJobs.map(j => {
      const agreedDue = j.finalDueDate || j.estimatedDueDate || j.expectedDate || '';
      return (j.completedDate && agreedDue) ? dayDiff(agreedDue, j.completedDate) : null;
    }).filter(v => v !== null);
    
    // 1. การ์ดใหม่: งานที่ส่งมอบแล้ว (พ่นจำนวนจาก array teamDoneJobs)
    const elDone = document.getElementById('k-val-jobdone');

    // 2. อัตราตรงเวลาภาพรวม (Agreed Due)
    const teamOnTimeRate = teamMboValues.length > 0 ? Math.round((teamMboValues.filter(v => v >= 0).length / teamMboValues.length) * 100) : 0;
    
    // 3. ชั่วโมงสะสมรวม
    const teamTotalHours = teamDoneJobs.reduce((sum, j) => sum + (Number(j.estimatedWorkhours) || 0), 0);
    
    // 🚀 4. อัตราส่งเร็วภาพรวม (MBO > 0)
    const teamEarlyCount = teamMboValues.filter(v => v > 0).length;
    const teamEarlyRate = teamMboValues.length > 0 ? Math.round((teamEarlyCount / teamMboValues.length) * 100) : 0;


    // --- พ่นตัวเลขลงบนการ์ดด้านบน ---
    //document.getElementById('k-val-jobdone').textContent = teamDoneJobs.toLocaleString() + ' งาน';
    if (elDone) elDone.textContent = teamDoneJobs.length.toLocaleString() + ' งาน';
    
    document.getElementById('k-val-hours').textContent = teamTotalHours.toLocaleString() + ' hrs';
    document.getElementById('k-val-ontime').textContent = teamOnTimeRate + '%';
    document.getElementById('k-val-early').textContent = teamEarlyRate + '%'; // พ่นค่า % Early แทน MBO เดิม

    // 3. วาดตาราง Leaderboard (ตัดแถว td ส่วนของ d.rejectCount ออกไป)
    const tbody = document.querySelector('#kpi-table tbody');
    if (tbody) {
      tbody.innerHTML = perfData.map(d => {
        const mboClass = d.avgMBO > 0 ? 'mbo-pos' : d.avgMBO < 0 ? 'mbo-neg' : '';
        const rateClass = d.onTimeRate >= 80 ? 'mbo-pos' : (d.doneCount > 0 && d.onTimeRate < 60) ? 'mbo-neg' : '';
        const earlyClass = d.earlyRate >= 50 ? 'mbo-pos' : ''; 
        const loadPillClass = d.activeCount >= 5 ? 'pill-reject' : d.activeCount > 0 ? 'pill-start' : 'pill-pending';
        
        return `<tr>
          <td><span style="display:flex;align-items:center;gap:6px;"><span class="avatar">${d.name.charAt(0)}</span><strong>${d.name}</strong></span></td>
          <td style="font-family:var(--mono);">${d.doneCount} งาน</td>
          <td style="font-family:var(--mono); font-weight:500; color:var(--cyan);">${d.totalHours} hrs</td>
          <td class="${mboClass}" style="font-family:var(--mono);">${d.doneCount > 0 ? (d.avgMBO >= 0 ? '+' : '') + d.avgMBO + ' วัน' : '—'}</td>
          <td class="${rateClass}" style="font-family:var(--mono); font-weight:600;">${d.doneCount > 0 ? d.onTimeRate + '%' : '—'}</td>
          <td class="${earlyClass}" style="font-family:var(--mono); font-weight:600; color:var(--ocean1);">${d.doneCount > 0 ? d.earlyRate + '%' : '—'}</td>
          <td style="font-family:var(--mono); text-align:center;"><span class="status-pill ${loadPillClass}">${d.activeCount} งาน</span></td>
          </tr>`;
      }).join('');
    }

    // 4. วาดกราฟหลักแบบผสม (Mixed Chart)
    if (document.querySelector("#chart-kpi-main")) {
      kpiCharts.main = new ApexCharts(document.querySelector("#chart-kpi-main"), {
        chart: { height: 320, type: 'line', background: 'transparent', foreColor: textColor, toolbar: { show: false } },
        theme: { mode: themeMode },
        stroke: { width: [0, 4], curve: 'smooth' },
        colors: ['#0ea5e9', '#059669'],
        series: [
          { name: 'จำนวนงานที่เสร็จ (Done Jobs)', type: 'column', data: perfData.map(d => d.doneCount) },
          { name: 'เฉลี่ยวันส่งก่อนกำหนด (Avg MBO Days)', type: 'line', data: perfData.map(d => d.avgMBO) }
        ],
        xaxis: { categories: perfData.map(d => d.name) },
        yaxis: [
          { title: { text: 'จำนวนงาน (ปริมาณงาน)' } },
          { opposite: true, title: { text: 'ประสิทธิภาพเวลา MBO (วัน)' } }
        ],
        grid: { borderColor: gridColor, strokeDashArray: 4 }
      });
      kpiCharts.main.render();
    }

    // 5. วาดกราฟแท่งซ้อนแนวนอน
    if (document.querySelector("#chart-kpi-load")) {
      kpiCharts.load = new ApexCharts(document.querySelector("#chart-kpi-load"), {
        chart: { height: 320, type: 'bar', stacked: true, background: 'transparent', foreColor: textColor, toolbar: { show: false } },
        theme: { mode: themeMode },
        plotOptions: { bar: { horizontal: true, barHeight: '40%', borderRadius: 4 } },
        colors: ['#d97706', '#0ea5e9', '#7c3aed', '#ec4899'],
        series: [
          { name: 'เริ่มทำ (Start)', data: perfData.map(d => d.load.loadStart) },
          { name: 'คืบหน้า 50% (P50)', data: perfData.map(d => d.load.loadP50) },
          { name: 'คืบหน้า 80% (P80)', data: perfData.map(d => d.load.loadP80) },
          { name: 'รอตรวจ (Review)', data: perfData.map(d => d.load.loadRev) }
        ],
        xaxis: { categories: perfData.map(d => d.name), labels: { formatter: val => Math.round(val) } },
        grid: { borderColor: gridColor, strokeDashArray: 4 }
      });
      kpiCharts.load.render();
    }
  }


  // ============================================================
  // 🕒 TOGGLE & RENDER JOB HISTORY (AUDIT TRAIL)
  // ============================================================
  function toggleJobHistory(jobNo) {
    const box = document.getElementById('history-box-' + jobNo);
    if (!box) return;
    
    // ถ้าเปิดอยู่แล้วให้กดปิดสลับไปมา
    if (box.style.display === 'block') {
      box.style.display = 'none';
      return;
    }
    
    box.style.display = 'block';
    box.innerHTML = `<div style="color:var(--muted); font-size:12px; padding:10px; text-align:center;">⏳ กำลังดึงประวัติไทม์ไลน์งานจากเซิร์ฟเวอร์...</div>`;
    
    /*
    // เรียกใช้ API ข้าม Tier ไปดึงข้อมูล Log สดๆ
    serverFetch('getJobHistory', { jobNo: jobNo })
      .then(function(result) {
        if (result && result.history) {
          if (result.history.length === 0) {
    */
    // เรียกใช้ API ข้าม Tier ไปดึงข้อมูล Log สดๆ
    serverFetch('getJobHistory', { jobNo: jobNo })
      .then(function(result) {
        if (result && result.history) {        
          // ✅ 1. ค้นหาข้อมูลตั้งต้นของงานชิ้นนี้จากหน่วยความจำ
          const j = jobs.find(x => String(x.no) === String(jobNo));
          
          // ✅ 2. แทรกลงไปเป็นประวัติบรรทัดแรกสุดเสมอ (จุดเริ่มต้นของไทม์ไลน์)
          if (j) {
            result.history.unshift({
              timestamp: j.requestDate || '-', 
              action: 'ส่งคำของาน (Request Submitted)',
              statusBefore: '-',
              statusAfter: 'new',
              changedBy: j.requestedBy || 'Requester',
              assignee: '',
              note: 'สร้างคำของานใหม่เข้าสู่ระบบ'
            });
          }
          if (result.history.length === 0) {
            box.innerHTML = `<div class="modal-section" style="margin-top:14px;"><div class="modal-label">🕒 ประวัติการแก้ไขงาน</div><div style="color:var(--muted); font-size:12px; background:var(--bg3); padding:12px; border-radius:var(--r); border:1px solid var(--line);">📭 งานชิ้นนี้ยังไม่มีประวัติการบันทึกในระบบภาพรวม</div></div>`;
            return;
          }
          
          // ประกอบร่างรายการไทม์ไลน์เป็น HTML
          let timelineHTML = result.history.map(function(h) {
            let noteHTML = h.note ? `<div class="tl-note">💬 หมายเหตุ: ${esc(h.note)}</div>` : '';
            return `<div class="timeline-item">
              <div class="tl-time">📅 ${h.timestamp} น.</div>
              <div class="tl-action">🎬 ดำเนินการ: <span style="color:var(--accent);">${esc(h.action)}</span> 
                (<span style="color:var(--muted); font-weight:normal;">${slabel(h.statusBefore)}</span> ➡️ <span style="color:var(--green);">${slabel(h.statusAfter)}</span>)
              </div>
              <div class="tl-meta">👤 โดย: <code>${esc(h.changedBy)}</code> ${h.assignee ? `| ผู้รับผิดชอบขณะนั้น: <b>${esc(h.assignee)}</b>` : ''}</div>
              ${noteHTML}
            </div>`;
          }).join('');
          
          box.innerHTML = `<div class="modal-section" style="margin-top:14px;">
            <div class="modal-label">🕒 ประวัติการแก้ไขงาน (Audit Trail)</div>
            <div class="timeline" style="max-height:220px; overflow-y:auto; background:var(--bg3); padding:14px 14px 14px 25px; border-radius:var(--r); border:1px solid var(--line);">
              ${timelineHTML}
            </div>
          </div>`;
          
          // สั่งให้กล่องเลื่อนโฟกัสลงมาให้เห็นชัดๆ ทันทีที่โหลดเสร็จ
          // box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          // เลื่อนหน้าต่าง Modal ลงไปข้างล่างสุดเพื่อให้เห็นประวัติที่เพิ่งโผล่มา
          const modal = box.closest('.modal');
          if (modal) {
            setTimeout(() => {
              modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
            }, 100);
          }

        } else {
          box.innerHTML = `<div style="color:var(--red); font-size:12px; padding:10px;">❌ เกิดข้อผิดพลาด: ${result.error || 'Unknown error'}</div>`;
        }
      })
      .catch(function(err) {
        box.innerHTML = `<div style="color:var(--red); font-size:12px; padding:10px;">❌ ไม่สามารถเชื่อมต่อระบบได้: ${err.message}</div>`;
      });
  }
