// ============================================================
// data.js — shared localStorage data layer
// ============================================================

const DISPUTE_TYPES = {
  1: { name: '重複請款', attachments: [
    { id: 'dup_1', name: '正確的簽單或收據',         hint: '請提供顯示正確金額的簽單影本或收據',              required: true },
    { id: 'dup_2', name: '與特店確認金額的信件紀錄', hint: '包含 Email 往返、書面信函等與商店溝通金額之紀錄', required: true },
    { id: 'dup_3', name: '其他補充文件',              hint: '任何可輔助說明爭議情形的補充資料',               required: false },
  ]},
  2: { name: '訂購商品未收到', attachments: [
    { id: 'nor_1', name: '特店聯繫紀錄',       hint: '例如 Email 往返截圖、APP 對話紀錄等',        required: true },
    { id: 'nor_2', name: '訂單畫面或訂購資訊', hint: '訂單確認頁面截圖、訂購確認信或訂單編號頁面', required: true },
    { id: 'nor_3', name: '其他補充文件',        hint: '任何可輔助說明爭議情形的補充資料',           required: false },
  ]},
  3: { name: '商店未提供服務（已搬遷或已倒閉）', attachments: [
    { id: 'cls_1', name: '訂單紀錄或合約',                   hint: '購買訂單、合約書或付款證明文件',                                required: true },
    { id: 'cls_2', name: '聯繫紀錄',                         hint: '與特約商店追蹤商品寄送或未收到商品的 Email 往返紀錄',           required: true },
    { id: 'cls_3', name: '剩餘課程或上課證明（預付型適用）', hint: '如健身房、補習班等，請提供剩餘課程數量或上課證明文件',          required: false },
    { id: 'cls_4', name: '其他補充文件',                     hint: '任何可輔助說明爭議情形的補充資料',                              required: false },
  ]},
  4: { name: '有退款退貨證明', attachments: [
    { id: 'ref_1', name: '特店同意取消交易之 Email 或憑證', hint: '特店發出的退款確認信或書面取消憑證', required: true },
    { id: 'ref_2', name: '退貨物流追蹤編號證明',            hint: '貨運公司的追蹤號碼截圖或退貨收據', required: true },
    { id: 'ref_3', name: '其他補充文件',                    hint: '任何可輔助說明爭議情形的補充資料', required: false },
  ]},
  5: { name: '金額不符', attachments: [
    { id: 'amt_1', name: '正確的簽單或收據',         hint: '請提供顯示正確金額的簽單影本或收據',              required: true },
    { id: 'amt_2', name: '與特店確認金額的信件紀錄', hint: '包含 Email 往返或書面信函等與商店溝通金額之紀錄', required: true },
    { id: 'amt_3', name: '其他補充文件',              hint: '任何可輔助說明爭議情形的補充資料',               required: false },
  ]},
  6: { name: '消費以其他方式支付', attachments: [
    { id: 'pay_1', name: '正確的簽單或收據', hint: '請提供顯示正確金額的簽單影本或收據',                    required: true },
    { id: 'pay_2', name: '其他支付證明',     hint: '例如行動支付訂單截圖（Apple Pay、Line Pay、街口支付等）', required: true },
    { id: 'pay_3', name: '其他補充文件',     hint: '任何可輔助說明爭議情形的補充資料',                       required: false },
  ]},
};

// Case record schema:
// {
//   caseNum:      string
//   type:         number
//   deadline:     string
//   status:       'pending' | 'submitted' | 'return' | 'closed'
//   submittedAt:  ISO | null
//   resubmittedAt: ISO | null
//   closedAt:     ISO | null
//   files:        { fieldId: [{name, size}] }      // metadata only
//   summary:      string | null
//   summaryStatus:'idle'|'loading'|'done'|'error'
//   returnFields: [fieldId, ...]                   // fields admin wants re-uploaded
//   returnNote:   string                           // admin note
// }

const DB_KEY = 'feib_cases_v2';

function dbLoad() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; }
  catch { return {}; }
}
function dbSave(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) {}
}
function getCase(caseNum) { return dbLoad()[caseNum] || null; }
function setCase(record) {
  const db = dbLoad();
  db[record.caseNum] = record;
  dbSave(db);
}
function getAllCases() { return Object.values(dbLoad()); }

// Draft (pre-submission file metadata)
function draftKey(cn) { return `feib_draft_v2_${cn}`; }
function loadDraft(cn) { try { return JSON.parse(localStorage.getItem(draftKey(cn))); } catch { return null; } }
function saveDraftData(cn, data) {
  try { localStorage.setItem(draftKey(cn), JSON.stringify(data)); return true; }
  catch { return false; }
}
function clearDraftData(cn) { localStorage.removeItem(draftKey(cn)); }

// Helpers
function fmt(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
function fmtDatetime(iso) {
  if (!iso) return '';
  const d = new Date(iso), p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso), p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()} 年 ${p(d.getMonth()+1)} 月 ${p(d.getDate())} 日`;
}
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    type:    parseInt(p.get('type'))  || 2,
    caseNum: p.get('case')            || 'FEIB-2026-0323-0042',
    deadline:p.get('deadline')        || '2026 / 04 / 06',
  };
}

// ---- AI Summary via Gemini API ----
const GEMINI_API_KEY = 'AIzaSyCVNiMWZBsQ0xx0Lxl2oykWrUx-2gNftmw';
const GEMINI_MODEL   = 'gemini-1.5-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function generateSummary(caseRecord, fileContents) {
  // fileContents: { fieldId: [{name, base64, mimeType}] }
  const typeName = (DISPUTE_TYPES[caseRecord.type] || {}).name || '爭議款';

  const prompt = `你是銀行信用卡爭議款處理人員的 AI 助理。以下是客訴者上傳的佐證附件（圖片或 PDF 截圖），請仔細閱讀所有附件內容，然後根據附件中實際看到的資訊，用繁體中文撰寫一份約 300 字的案件摘要。

摘要必須包含以下要素（若附件中找不到某項資訊，請填「不詳」）：
- 交易日期
- 特約商店名稱
- 交易內容（購買商品或取得什麼服務）
- 交易金額
- 發生的爭議情況（例如：已繳付一年健身房課程費用，但商店突然停業）
- 訂單編號或其他交易證明

爭議款類型：${typeName}

請直接輸出摘要內文，不要加標題或條列式格式，以流暢的段落呈現。`;

  // Build Gemini parts array
  const parts = [{ text: prompt }];

  // Attach images / PDFs
  let hasMedia = false;
  if (fileContents) {
    for (const fieldId of Object.keys(fileContents)) {
      for (const f of (fileContents[fieldId] || [])) {
        if (f.base64 && f.mimeType) {
          hasMedia = true;
          parts.push({
            inline_data: {
              mime_type: f.mimeType,
              data: f.base64,
            },
          });
        }
      }
    }
  }

  // No real files — ask Gemini to simulate based on file names
  if (!hasMedia) {
    const fileNames = [];
    for (const fieldId of Object.keys(caseRecord.files || {})) {
      for (const f of (caseRecord.files[fieldId] || [])) fileNames.push(f.name);
    }
    parts[0].text += `\n\n（注意：本次測試未附上實際檔案內容，請根據以下檔案名稱模擬產出一份合理的示範摘要）\n上傳檔案：${fileNames.join('、') || '無'}`;
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  // Gemini response shape: data.candidates[0].content.parts[0].text
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
