// ============================================================
// app.js — customer page logic
// ============================================================

const uFiles   = {};   // fieldId -> [File]
const dMeta    = {};   // fieldId -> [{name,size,savedAt}]
const uBase64  = {};   // fieldId -> [{name,base64,mimeType}]  for AI

let params, disputeData, caseRecord;

document.addEventListener('DOMContentLoaded', async () => {
  params      = getParams();
  disputeData = DISPUTE_TYPES[params.type] || DISPUTE_TYPES[2];

  // ?reset=1 — clear this case record and draft, then reload without the param
  if (new URLSearchParams(window.location.search).get('reset') === '1') {
    const db = (() => { try { return JSON.parse(localStorage.getItem('feib_cases_v2')) || {}; } catch { return {}; } })();
    delete db[params.caseNum];
    localStorage.setItem('feib_cases_v2', JSON.stringify(db));
    clearDraftData(params.caseNum);
    const clean = new URLSearchParams(window.location.search);
    clean.delete('reset');
    const newUrl = window.location.pathname + (clean.toString() ? '?' + clean.toString() : '');
    window.location.replace(newUrl);
    return;
  }

  caseRecord  = getCase(params.caseNum);

  // Seed a new record if first visit
  if (!caseRecord) {
    caseRecord = {
      caseNum:       params.caseNum,
      type:          params.type,
      deadline:      params.deadline,
      status:        'pending',
      submittedAt:   null,
      resubmittedAt: null,
      closedAt:      null,
      files:         {},
      summary:       null,
      summaryStatus: 'idle',
      returnFields:  [],
      returnNote:    '',
    };
    setCase(caseRecord);
  }

  // Fill hero
  document.getElementById('caseNumber').textContent      = params.caseNum;
  document.getElementById('disputeTypeBadge').textContent = disputeData.name;
  document.getElementById('disputeTypeInline').textContent = disputeData.name;
  document.getElementById('deadline').textContent         = params.deadline;
  document.getElementById('modalCaseNum').textContent     = params.caseNum;

  // Route by status
  renderByStatus();
});

// ---- ROUTE ----
function renderByStatus() {
  caseRecord = getCase(params.caseNum);

  document.getElementById('uploadView').style.display    = 'none';
  document.getElementById('submittedView').style.display = 'none';
  document.getElementById('returnView').style.display    = 'none';

  if (caseRecord.status === 'pending') {
    document.getElementById('uploadView').style.display = 'block';
    initUploadView();
  } else if (caseRecord.status === 'return') {
    document.getElementById('returnView').style.display = 'block';
    initReturnView();
  } else {
    // submitted / closed
    document.getElementById('submittedView').style.display = 'block';
    renderSubmittedView();
  }
}

// ============================================================
// SUBMITTED VIEW
// ============================================================
function renderSubmittedView() {
  const card    = document.getElementById('statusCard');
  const iconWrap = document.getElementById('statusIconWrap');
  const title   = document.getElementById('statusTitle');
  const desc    = document.getElementById('statusDesc');
  const meta    = document.getElementById('statusMeta');

  if (caseRecord.status === 'closed') {
    card.classList.add('status-closed');
    iconWrap.innerHTML = `<div class="status-icon closed-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    </div>`;
    title.textContent = '案件已結案';
    desc.textContent  = '您的爭議款申請已完成審核，結果已通知至您的聯絡方式。';
    meta.innerHTML    = `<div class="meta-row"><span>結案時間</span><strong>${fmtDatetime(caseRecord.closedAt)}</strong></div>`;
  } else {
    // submitted
    card.classList.add('status-submitted');
    iconWrap.innerHTML = `<div class="status-icon submitted-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    </div>`;
    title.textContent = '文件已送出，審核中';
    desc.textContent  = '您的文件已成功送出。我們將於 5–7 個工作天內完成審核，並以 Email 或簡訊通知您結果。';
    meta.innerHTML    = `
      <div class="meta-row"><span>送出時間</span><strong>${fmtDatetime(caseRecord.submittedAt)}</strong></div>
      <div class="meta-row"><span>目前狀態</span><strong class="status-tag processing">處理中</strong></div>
      <div class="meta-row"><span>案件編號</span><strong>${caseRecord.caseNum}</strong></div>
    `;
  }

  meta.innerHTML += `<div class="meta-row contact-row"><span>如有疑問請電洽客服</span><strong>0800-888-168</strong></div>`;
}

// ============================================================
// RETURN VIEW
// ============================================================
function initReturnView() {
  caseRecord = getCase(params.caseNum);

  // Banner note
  const noteEl = document.getElementById('returnNoteText');
  noteEl.textContent = caseRecord.returnNote ? `：${caseRecord.returnNote}` : '';

  // Render only the fields admin selected
  const container = document.getElementById('returnFields');
  container.innerHTML = '';

  const allAtts = [
    { id: 'auth', name: '爭議款處理授權書', hint: '請重新簽署後掃描或拍照上傳', required: true },
    ...disputeData.attachments,
  ];

  const returnIds = new Set(caseRecord.returnFields || []);
  const fieldsToShow = allAtts.filter(a => returnIds.has(a.id));

  if (fieldsToShow.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">無指定補件項目。</p>';
    return;
  }

  fieldsToShow.forEach(att => {
    uFiles[att.id]  = [];
    uBase64[att.id] = [];

    const div = document.createElement('div');
    div.className = 'attachment-field';
    div.id = `retfield-${att.id}`;
    div.innerHTML = `
      <div class="attachment-field-header">
        <span class="attachment-field-name">${att.name}</span>
        <span class="badge-required">必填</span>
      </div>
      <p class="attachment-hint">${att.hint}</p>
      <div class="attachment-upload-zone" id="retzone-${att.id}">
        <div class="attachment-upload-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <div>
          <p class="attachment-upload-text">拖曳或<span>點擊選擇</span></p>
          <p class="attachment-upload-sub">PDF、PNG、JPG，≤ 10MB</p>
        </div>
        <input type="file" class="file-input" accept=".pdf,.png,.jpg,.jpeg" data-field="${att.id}" multiple/>
      </div>
      <div class="file-list" id="fileList-retzone-${att.id}"></div>
      <div class="field-error" id="error-retzone-${att.id}"></div>
    `;
    container.appendChild(div);
    bindUploadZone(`retzone-${att.id}`, att.id, `fileList-retzone-${att.id}`, `error-retzone-${att.id}`);
  });

  document.getElementById('returnConfirmCheck').addEventListener('change', updateReturnSubmit);
  document.getElementById('returnSubmitBtn').addEventListener('click', handleReturnSubmit);

  function updateReturnSubmit() {
    const allFilled = fieldsToShow.every(a => (uFiles[a.id] || []).length > 0);
    const confirmed = document.getElementById('returnConfirmCheck').checked;
    document.getElementById('returnSubmitBtn').disabled = !(allFilled && confirmed);
  }

  // Expose so file handlers can call it
  window._updateReturnSubmit = updateReturnSubmit;
}

async function handleReturnSubmit() {
  const btn = document.getElementById('returnSubmitBtn');
  btn.disabled = true;
  btn.textContent = '送出中…';

  // Collect new file metadata
  const newFiles = {};
  for (const fieldId of Object.keys(uFiles)) {
    newFiles[fieldId] = (uFiles[fieldId] || []).map(f => ({ name: f.name, size: f.size }));
  }

  // Merge with existing files
  const merged = { ...(caseRecord.files || {}), ...newFiles };

  caseRecord = {
    ...caseRecord,
    status:        'submitted',
    resubmittedAt: new Date().toISOString(),
    files:         merged,
    returnFields:  [],
    returnNote:    '',
    summary:       null,
    summaryStatus: 'loading',
  };
  setCase(caseRecord);

  // Trigger AI summary
  triggerSummary(params.caseNum, uBase64);

  renderByStatus();
}

// ============================================================
// UPLOAD VIEW
// ============================================================
function initUploadView() {
  // Init arrays
  uFiles['auth']  = []; uBase64['auth'] = [];
  disputeData.attachments.forEach(a => { uFiles[a.id] = []; uBase64[a.id] = []; });

  renderAttachments();
  bindUploadZone('uploadAuth', 'auth', 'fileList-auth', 'error-auth');
  loadDraftData();

  document.getElementById('saveDraftBtn').addEventListener('click', handleSaveDraft);
  document.getElementById('clearDraftBtn').addEventListener('click', handleClearDraft);
  document.getElementById('confirmCheck').addEventListener('change', updateSubmitState);
  document.getElementById('submitBtn').addEventListener('click', handleSubmit);

  updateProgress();
}

function renderAttachments() {
  const container = document.getElementById('attachmentFields');
  container.innerHTML = '';
  disputeData.attachments.forEach(att => {
    const div = document.createElement('div');
    div.className = 'attachment-field';
    div.id = `field-${att.id}`;
    div.innerHTML = `
      <div class="attachment-field-header">
        <span class="attachment-field-name">${att.name}</span>
        <span class="${att.required ? 'badge-required' : 'badge-optional'}">${att.required ? '必填' : '選填'}</span>
      </div>
      <p class="attachment-hint">${att.hint}</p>
      <div class="attachment-upload-zone" id="zone-${att.id}">
        <div class="attachment-upload-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <div>
          <p class="attachment-upload-text">拖曳或<span>點擊選擇</span>（可多選）</p>
          <p class="attachment-upload-sub">PDF、PNG、JPG，≤ 10MB</p>
        </div>
        <input type="file" class="file-input" accept=".pdf,.png,.jpg,.jpeg" data-field="${att.id}" multiple/>
      </div>
      <div class="file-list" id="fileList-${att.id}"></div>
      <div class="field-error" id="error-${att.id}"></div>
    `;
    container.appendChild(div);
    bindUploadZone(`zone-${att.id}`, att.id, `fileList-${att.id}`, `error-${att.id}`);
  });
}

// ---- Upload zone binding ----
function bindUploadZone(zoneId, fieldId, listId, errorId) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  const input = zone.querySelector('.file-input');

  zone.addEventListener('click', e => { if (e.target !== input) input.click(); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files), fieldId, zoneId, listId, errorId);
  });
  input.addEventListener('change', () => {
    handleFiles(Array.from(input.files), fieldId, zoneId, listId, errorId);
    input.value = '';
  });
}

function handleFiles(files, fieldId, zoneId, listId, errorId) {
  const errorEl = document.getElementById(errorId);
  if (!uFiles[fieldId])  uFiles[fieldId]  = [];
  if (!uBase64[fieldId]) uBase64[fieldId] = [];
  if (dMeta[fieldId])    dMeta[fieldId]   = [];

  let hasError = false;
  files.forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','png','jpg','jpeg'].includes(ext)) {
      errorEl.textContent = '格式不支援，請上傳 PDF、PNG 或 JPG。'; hasError = true; return;
    }
    if (file.size > 10 * 1024 * 1024) {
      errorEl.textContent = `「${file.name}」超過 10MB 限制。`; hasError = true; return;
    }
    uFiles[fieldId].push(file);

    // Read file to base64 for AI
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      const base64  = dataUrl.split(',')[1];
      const mime    = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      uBase64[fieldId].push({ name: file.name, base64, mimeType: mime });
    };
    reader.readAsDataURL(file);
  });

  if (!hasError) errorEl.textContent = '';
  renderFileList(fieldId, zoneId, listId);
  if (typeof updateProgress === 'function' && document.getElementById('progressFill')) updateProgress();
  updateSubmitState();
  if (window._updateReturnSubmit) window._updateReturnSubmit();
}

function renderFileList(fieldId, zoneId, listId) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  const zone     = document.getElementById(zoneId);
  const actual   = uFiles[fieldId]  || [];
  const drafts   = (dMeta[fieldId]  || []).filter(m => !actual.some(f => f.name === m.name));
  const total    = actual.length + drafts.length;

  listEl.innerHTML = '';
  if (zone) zone.classList.toggle('has-file', total > 0);
  const fieldEl = document.getElementById(`field-${fieldId}`);
  if (fieldEl) fieldEl.classList.toggle('has-file', total > 0);

  actual.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = fileItemHTML(file.name, fmt(file.size), false);
    item.querySelector('.file-item-remove').addEventListener('click', () => {
      uFiles[fieldId].splice(idx, 1);
      uBase64[fieldId] = (uBase64[fieldId] || []).filter(f => f.name !== file.name);
      renderFileList(fieldId, zoneId, listId);
      updateProgress(); updateSubmitState();
    });
    listEl.appendChild(item);
  });

  drafts.forEach((meta, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item draft-item';
    item.innerHTML = fileItemHTML(meta.name, fmt(meta.size), true);
    item.querySelector('.file-item-remove').addEventListener('click', () => {
      dMeta[fieldId].splice(idx, 1);
      saveDraftData(params.caseNum, buildDraftSnapshot());
      renderFileList(fieldId, zoneId, listId);
      updateProgress(); updateSubmitState();
    });
    listEl.appendChild(item);
  });
}

function fileItemHTML(name, size, isDraft) {
  return `
    <div class="file-item-icon">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    </div>
    <span class="file-item-name">${name}</span>
    <span class="file-item-size">${size}</span>
    ${isDraft ? '<span class="file-item-draft-tag">暫存紀錄</span>' : ''}
    <button class="file-item-remove" title="移除">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
}

// ---- Progress ----
function fieldHasContent(fieldId) {
  return ((uFiles[fieldId]  || []).length > 0) || ((dMeta[fieldId] || []).length > 0);
}

function updateProgress() {
  const required = disputeData.attachments.filter(a => a.required);
  const authDone = fieldHasContent('auth');
  const reqDone  = required.filter(a => fieldHasContent(a.id)).length;
  const total    = 1 + required.length;
  const done     = (authDone ? 1 : 0) + reqDone;
  const pct      = total > 0 ? (done / total) * 100 : 0;

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${done} / ${total} 項完成`;

  ['step1','step2','step3','step4'].forEach(s => document.getElementById(s).classList.remove('active','done'));
  if (!authDone) {
    document.getElementById('step1').classList.add('active');
  } else if (reqDone < required.length) {
    document.getElementById('step1').classList.add('done');
    document.getElementById('step2').classList.add('done');
    document.getElementById('step3').classList.add('active');
  } else {
    document.getElementById('step1').classList.add('done');
    document.getElementById('step2').classList.add('done');
    document.getElementById('step3').classList.add('done');
    document.getElementById('step4').classList.add('active');
  }
}

function updateSubmitState() {
  const required = disputeData.attachments.filter(a => a.required);
  const authOk   = (uFiles['auth'] || []).length > 0;
  const reqOk    = required.every(a => (uFiles[a.id] || []).length > 0);
  const checked  = document.getElementById('confirmCheck')?.checked;
  const btn      = document.getElementById('submitBtn');
  if (btn) btn.disabled = !(authOk && reqOk && checked);
}

// ---- Draft ----
function buildDraftSnapshot() {
  const snap = {};
  Object.keys(uFiles).forEach(fid => {
    snap[fid] = uFiles[fid].map(f => ({ name: f.name, size: f.size, savedAt: Date.now() }));
  });
  Object.keys(dMeta).forEach(fid => {
    if (!snap[fid] || snap[fid].length === 0) snap[fid] = dMeta[fid];
  });
  return { savedAt: Date.now(), fields: snap };
}

function handleSaveDraft() {
  const ok   = saveDraftData(params.caseNum, buildDraftSnapshot());
  const hint = document.getElementById('saveHint');
  const ds   = document.getElementById('draftStatus');
  if (ok) {
    hint.textContent = '草稿已暫存，下次回到此頁面可繼續上傳。';
    hint.className   = 'save-hint success';
    ds.style.display = 'flex';
    document.getElementById('draftStatusText').textContent = `草稿暫存於 ${new Date().toLocaleTimeString('zh-TW')}`;
  } else {
    hint.textContent = '暫存失敗，請確認瀏覽器設定。';
    hint.className   = 'save-hint';
  }
  setTimeout(() => { hint.textContent = ''; hint.className = 'save-hint'; }, 4000);
}

function handleClearDraft() {
  if (!confirm('確定要清除所有暫存紀錄？此操作無法復原。')) return;
  clearDraftData(params.caseNum);
  Object.keys(dMeta).forEach(k => delete dMeta[k]);
  Object.keys(uFiles).forEach(k => { uFiles[k] = []; });
  document.getElementById('draftBanner').style.display = 'none';
  document.getElementById('draftStatus').style.display = 'none';
  ['auth', ...disputeData.attachments.map(a => a.id)].forEach(id => {
    renderFileList(id, `zone-${id}`, `fileList-${id}`);
  });
  // auth zone special
  renderFileList('auth', 'uploadAuth', 'fileList-auth');
  updateProgress(); updateSubmitState();
}

function loadDraftData() {
  const draft = loadDraft(params.caseNum);
  if (!draft || !draft.fields) return;
  let hasDraft = false;
  Object.keys(draft.fields).forEach(fid => {
    const m = draft.fields[fid];
    if (m && m.length > 0) { dMeta[fid] = m; hasDraft = true; }
  });
  if (!hasDraft) return;

  document.getElementById('draftBanner').style.display = 'block';
  document.getElementById('draftStatus').style.display = 'flex';
  const ts = new Date(draft.savedAt);
  document.getElementById('draftStatusText').textContent =
    `草稿暫存於 ${(ts.getMonth()+1)}/${ts.getDate()} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;

  // Render draft placeholders
  Object.keys(dMeta).forEach(fid => {
    const listId = fid === 'auth' ? 'fileList-auth' : `fileList-${fid}`;
    const zoneId = fid === 'auth' ? 'uploadAuth'    : `zone-${fid}`;
    renderFileList(fid, zoneId, listId);
  });
  updateProgress(); updateSubmitState();
}

// ---- Submit ----
async function handleSubmit() {
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '送出中…';

  // Collect file metadata
  const fileMeta = {};
  Object.keys(uFiles).forEach(fid => {
    fileMeta[fid] = uFiles[fid].map(f => ({ name: f.name, size: f.size }));
  });

  caseRecord = {
    ...caseRecord,
    status:        'submitted',
    submittedAt:   new Date().toISOString(),
    files:         fileMeta,
    summary:       null,
    summaryStatus: 'loading',
  };
  setCase(caseRecord);
  clearDraftData(params.caseNum);

  // Show modal briefly then switch view
  const modal = document.getElementById('successModal');
  modal.classList.add('active');
  setTimeout(() => {
    modal.classList.remove('active');
    renderByStatus();
  }, 2800);

  // Trigger AI summary in background
  triggerSummary(params.caseNum, uBase64);
}

// ---- AI Summary ----
async function triggerSummary(caseNum, fileContents) {
  try {
    const rec     = getCase(caseNum);
    const summary = await generateSummary(rec, fileContents);
    const updated = getCase(caseNum);
    updated.summary       = summary || '（摘要產生失敗，請稍後重試）';
    updated.summaryStatus = summary ? 'done' : 'error';
    setCase(updated);
  } catch (e) {
    const updated = getCase(caseNum);
    updated.summary       = '（AI 摘要服務暫時無法使用）';
    updated.summaryStatus = 'error';
    setCase(updated);
  }
}
