// ===== DISPUTE TYPE DATA =====
const DISPUTE_TYPES = {
  1: {
    name: '重複請款',
    attachments: [
      { id: 'dup_1', name: '正確的簽單或收據', hint: '請提供顯示正確金額的簽單影本或收據', required: true },
      { id: 'dup_2', name: '與特店確認金額的信件紀錄', hint: '包含 Email 往返、書面信函等與商店溝通金額之紀錄', required: true },
      { id: 'dup_3', name: '其他補充文件', hint: '任何可輔助說明爭議情形的補充資料', required: false },
    ]
  },
  2: {
    name: '訂購商品未收到',
    attachments: [
      { id: 'nor_1', name: '特店聯繫紀錄', hint: '例如 Email 往返截圖、APP 對話紀錄等', required: true },
      { id: 'nor_2', name: '訂單畫面或訂購資訊', hint: '訂單確認頁面截圖、訂購確認信或訂單編號頁面', required: true },
      { id: 'nor_3', name: '其他補充文件', hint: '任何可輔助說明爭議情形的補充資料', required: false },
    ]
  },
  3: {
    name: '商店未提供服務（已搬遷或已倒閉）',
    attachments: [
      { id: 'cls_1', name: '訂單紀錄或合約', hint: '購買訂單、合約書或付款證明文件', required: true },
      { id: 'cls_2', name: '聯繫紀錄', hint: '與特約商店追蹤商品寄送紀錄，或未收到商品的 Email 往返紀錄', required: true },
      { id: 'cls_3', name: '剩餘課程或上課證明（預付型商品適用）', hint: '如健身房、補習班等預付型商品，請提供剩餘課程數量或上課證明文件', required: false },
      { id: 'cls_4', name: '其他補充文件', hint: '任何可輔助說明爭議情形的補充資料', required: false },
    ]
  },
  4: {
    name: '有退款退貨證明',
    attachments: [
      { id: 'ref_1', name: '特店同意取消交易之 Email 或憑證', hint: '特店發出的退款確認信或書面取消憑證', required: true },
      { id: 'ref_2', name: '退貨物流追蹤編號證明', hint: '貨運公司的追蹤號碼截圖或退貨收據', required: true },
      { id: 'ref_3', name: '其他補充文件', hint: '任何可輔助說明爭議情形的補充資料', required: false },
    ]
  },
  5: {
    name: '金額不符',
    attachments: [
      { id: 'amt_1', name: '正確的簽單或收據', hint: '請提供顯示正確金額的簽單影本或收據', required: true },
      { id: 'amt_2', name: '與特店確認金額的信件紀錄', hint: '包含 Email 往返或書面信函等與商店溝通金額之紀錄', required: true },
      { id: 'amt_3', name: '其他補充文件', hint: '任何可輔助說明爭議情形的補充資料', required: false },
    ]
  },
  6: {
    name: '消費以其他方式支付',
    attachments: [
      { id: 'pay_1', name: '正確的簽單或收據', hint: '請提供顯示正確金額的簽單影本或收據', required: true },
      { id: 'pay_2', name: '其他支付證明', hint: '例如行動支付訂單截圖（Apple Pay、Line Pay、街口支付等）', required: true },
      { id: 'pay_3', name: '其他補充文件', hint: '任何可輔助說明爭議情形的補充資料', required: false },
    ]
  }
};

// ===== STATE =====
// uploadedFiles stores actual File objects in memory
// draftMeta stores metadata (name, size, savedAt) in localStorage for persistence
const uploadedFiles = {}; // { fieldId: [File, ...] }
const draftMeta = {};     // { fieldId: [{name, size, savedAt}, ...] }

// ===== URL PARAMS =====
function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: parseInt(params.get('type')) || 2,
    case: params.get('case') || 'FEIB-2026-0323-0042',
    deadline: params.get('deadline') || '2026 / 04 / 06'
  };
}

function getDraftKey(caseNum) {
  return `feib_draft_${caseNum}`;
}

// ===== DRAFT: SAVE TO LOCALSTORAGE =====
function saveDraft() {
  const { case: caseNum } = getParams();
  const key = getDraftKey(caseNum);
  const snapshot = {};

  // Save metadata of uploaded files per field
  Object.keys(uploadedFiles).forEach(fieldId => {
    snapshot[fieldId] = uploadedFiles[fieldId].map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      savedAt: Date.now()
    }));
  });

  // Also merge existing draftMeta for fields not currently uploaded (still pending re-upload)
  Object.keys(draftMeta).forEach(fieldId => {
    if (!snapshot[fieldId] || snapshot[fieldId].length === 0) {
      snapshot[fieldId] = draftMeta[fieldId];
    }
  });

  try {
    localStorage.setItem(key, JSON.stringify({
      savedAt: Date.now(),
      fields: snapshot
    }));
    return true;
  } catch (e) {
    return false;
  }
}

// ===== DRAFT: LOAD FROM LOCALSTORAGE =====
function loadDraft() {
  const { case: caseNum } = getParams();
  const key = getDraftKey(caseNum);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// ===== DRAFT: CLEAR =====
function clearDraft() {
  const { case: caseNum } = getParams();
  localStorage.removeItem(getDraftKey(caseNum));
  Object.keys(draftMeta).forEach(k => delete draftMeta[k]);
  Object.keys(uploadedFiles).forEach(k => { uploadedFiles[k] = []; });
}

// ===== FORMAT FILE SIZE =====
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTime(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ===== INIT =====
function init() {
  const { type, case: caseNum, deadline } = getParams();
  const disputeData = DISPUTE_TYPES[type] || DISPUTE_TYPES[2];

  document.getElementById('caseNumber').textContent = caseNum;
  document.getElementById('disputeTypeBadge').textContent = disputeData.name;
  document.getElementById('disputeTypeInline').textContent = disputeData.name;
  document.getElementById('deadline').textContent = deadline;
  document.getElementById('modalCaseNum').textContent = caseNum;

  // Init file arrays
  uploadedFiles['auth'] = [];
  disputeData.attachments.forEach(a => { uploadedFiles[a.id] = []; });

  // Render attachment grid
  renderAttachments(disputeData.attachments);

  // Bind upload zones
  bindUploadZone('uploadAuth', 'auth');

  // Load draft
  const draft = loadDraft();
  if (draft && draft.fields) {
    let hasDraft = false;
    Object.keys(draft.fields).forEach(fieldId => {
      const meta = draft.fields[fieldId];
      if (meta && meta.length > 0) {
        draftMeta[fieldId] = meta;
        hasDraft = true;
      }
    });
    if (hasDraft) {
      document.getElementById('draftBanner').style.display = 'block';
      document.getElementById('draftStatus').style.display = 'flex';
      document.getElementById('draftStatusText').textContent =
        `草稿暫存於 ${formatTime(draft.savedAt)}`;

      // Render draft placeholders
      Object.keys(draftMeta).forEach(fieldId => {
        renderFileList(fieldId);
      });
    }
  }

  // Save draft button
  document.getElementById('saveDraftBtn').addEventListener('click', () => {
    const ok = saveDraft();
    const hint = document.getElementById('saveHint');
    const statusEl = document.getElementById('draftStatus');
    if (ok) {
      hint.textContent = '草稿已暫存，下次回到此頁面可繼續上傳。';
      hint.className = 'save-hint success';
      statusEl.style.display = 'flex';
      document.getElementById('draftStatusText').textContent = `草稿暫存於 ${formatTime(Date.now())}`;
    } else {
      hint.textContent = '暫存失敗，請確認瀏覽器設定。';
      hint.className = 'save-hint';
    }
    setTimeout(() => { hint.textContent = ''; hint.className = 'save-hint'; }, 4000);
  });

  // Clear draft button
  document.getElementById('clearDraftBtn').addEventListener('click', () => {
    if (!confirm('確定要清除所有暫存紀錄？此操作無法復原。')) return;
    clearDraft();
    document.getElementById('draftBanner').style.display = 'none';
    document.getElementById('draftStatus').style.display = 'none';
    // Re-render all file lists
    ['auth', ...disputeData.attachments.map(a => a.id)].forEach(id => renderFileList(id));
    updateProgress();
    updateSubmitState();
  });

  document.getElementById('confirmCheck').addEventListener('change', updateSubmitState);
  document.getElementById('submitBtn').addEventListener('click', handleSubmit);

  updateProgress();
}

// ===== RENDER ATTACHMENTS (two-column grid) =====
function renderAttachments(attachments) {
  const container = document.getElementById('attachmentFields');
  container.innerHTML = '';

  attachments.forEach(att => {
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div>
          <p class="attachment-upload-text">拖曳或<span>點擊選擇</span>（可多選）</p>
          <p class="attachment-upload-sub">PDF、PNG、JPG，≤ 10MB</p>
        </div>
        <input type="file" class="file-input" accept=".pdf,.png,.jpg,.jpeg" data-field="${att.id}" multiple />
      </div>
      <div class="file-list" id="fileList-${att.id}"></div>
      <div class="field-error" id="error-${att.id}"></div>
    `;
    container.appendChild(div);
    bindUploadZone(`zone-${att.id}`, att.id);
  });
}

// ===== BIND UPLOAD ZONE =====
function bindUploadZone(zoneId, fieldId) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  const input = zone.querySelector('.file-input');

  zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files), fieldId, zone);
  });
  input.addEventListener('change', () => {
    handleFiles(Array.from(input.files), fieldId, zone);
    input.value = '';
  });
}

// ===== HANDLE FILES =====
function handleFiles(files, fieldId, zone) {
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (!uploadedFiles[fieldId]) uploadedFiles[fieldId] = [];

  let hasError = false;
  files.forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
      errorEl.textContent = '檔案格式不支援，請上傳 PDF、PNG 或 JPG 格式。';
      hasError = true;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      errorEl.textContent = `「${file.name}」超過 10MB 限制，請壓縮後再上傳。`;
      hasError = true;
      return;
    }
    uploadedFiles[fieldId].push(file);
    // When user uploads new files, clear corresponding draft meta for this field
    // so we don't double-show
    if (draftMeta[fieldId]) {
      draftMeta[fieldId] = [];
    }
  });

  if (!hasError) errorEl.textContent = '';
  renderFileList(fieldId);
  updateProgress();
  updateSubmitState();
}

// ===== RENDER FILE LIST =====
// Shows actual uploaded files first, then draft meta placeholders
function renderFileList(fieldId) {
  const listEl = document.getElementById(`fileList-${fieldId}`);
  if (!listEl) return;

  const zone = document.getElementById(`zone-${fieldId}`) || document.getElementById('uploadAuth');
  const actualFiles = uploadedFiles[fieldId] || [];
  const draftFiles = (draftMeta[fieldId] || []).filter(m =>
    // Don't show draft entry if an actual file with same name already uploaded
    !actualFiles.some(f => f.name === m.name)
  );
  const total = actualFiles.length + draftFiles.length;

  listEl.innerHTML = '';

  if (zone) zone.classList.toggle('has-file', total > 0);
  const fieldEl = document.getElementById(`field-${fieldId}`);
  if (fieldEl) fieldEl.classList.toggle('has-file', total > 0);

  // Render actual uploaded files
  actualFiles.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-item-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <span class="file-item-name">${file.name}</span>
      <span class="file-item-size">${formatSize(file.size)}</span>
      <button class="file-item-remove" title="移除">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    item.querySelector('.file-item-remove').addEventListener('click', () => {
      uploadedFiles[fieldId].splice(idx, 1);
      renderFileList(fieldId);
      updateProgress();
      updateSubmitState();
    });
    listEl.appendChild(item);
  });

  // Render draft placeholder entries
  draftFiles.forEach((meta, idx) => {
    const item = document.createElement('div');
    item.className = 'file-item draft-item';
    item.innerHTML = `
      <div class="file-item-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <span class="file-item-name">${meta.name}</span>
      <span class="file-item-size">${formatSize(meta.size)}</span>
      <span class="file-item-draft-tag">暫存紀錄</span>
      <button class="file-item-remove" title="移除暫存紀錄">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    item.querySelector('.file-item-remove').addEventListener('click', () => {
      draftMeta[fieldId].splice(idx, 1);
      // Update localStorage
      saveDraft();
      renderFileList(fieldId);
      updateProgress();
      updateSubmitState();
    });
    listEl.appendChild(item);
  });
}

// ===== UPDATE PROGRESS =====
// Counts a field as "done" if it has actual files OR draft meta
function fieldHasContent(fieldId) {
  return ((uploadedFiles[fieldId] || []).length > 0) ||
         ((draftMeta[fieldId] || []).length > 0);
}

function updateProgress() {
  const { type } = getParams();
  const disputeData = DISPUTE_TYPES[type] || DISPUTE_TYPES[2];
  const required = disputeData.attachments.filter(a => a.required);

  const authDone = fieldHasContent('auth');
  const requiredAttDone = required.filter(a => fieldHasContent(a.id)).length;

  const totalRequired = 1 + required.length;
  const totalDone = (authDone ? 1 : 0) + requiredAttDone;

  const pct = totalRequired > 0 ? (totalDone / totalRequired) * 100 : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${totalDone} / ${totalRequired} 項完成`;

  updateSteps(authDone, requiredAttDone, required.length);
}

function updateSteps(authDone, attDone, totalReq) {
  ['step1','step2','step3','step4'].forEach(s => {
    document.getElementById(s).classList.remove('active','done');
  });
  if (!authDone) {
    document.getElementById('step1').classList.add('active');
  } else if (attDone < totalReq) {
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

// ===== UPDATE SUBMIT STATE =====
// Submit requires actual uploaded files (not just draft meta) for required fields
function updateSubmitState() {
  const { type } = getParams();
  const disputeData = DISPUTE_TYPES[type] || DISPUTE_TYPES[2];
  const required = disputeData.attachments.filter(a => a.required);

  const authOk = (uploadedFiles['auth'] || []).length > 0;
  const allRequiredOk = required.every(a => (uploadedFiles[a.id] || []).length > 0);
  const confirmed = document.getElementById('confirmCheck').checked;

  document.getElementById('submitBtn').disabled = !(authOk && allRequiredOk && confirmed);
}

// ===== HANDLE SUBMIT =====
function handleSubmit() {
  // Clear draft after successful submission
  clearDraft();
  document.getElementById('draftBanner').style.display = 'none';
  document.getElementById('draftStatus').style.display = 'none';

  const modal = document.getElementById('successModal');
  modal.classList.add('active');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
