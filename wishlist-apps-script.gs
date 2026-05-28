// Google Apps Script for Inconceivable Crew Wishlist
// Backend: Google Sheet
//
// Setup:
// 1. Create a Google Sheet named Inconceivable Crew Wishlist
// 2. Add header row: id | createdAt | requestedBy | item | acquired | deleted
// 3. Extensions > Apps Script
// 4. Paste this file
// 5. Set SHEET_ID below
// 6. Deploy > New deployment > Web app
// 7. Execute as: Me
// 8. Who has access: Anyone with the link
// 9. Paste the deployed web app URL into WISHLIST_API_URL in wishlist.js

const SHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Wishlist';

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id', 'createdAt', 'requestedBy', 'item', 'acquired', 'deleted']);
  }
  return sheet;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowsToItems_(values) {
  const [header, ...rows] = values;
  if (!header || !rows.length) return [];
  return rows
    .filter(row => row[0])
    .map(row => ({
      id: String(row[0]),
      createdAt: String(row[1] || ''),
      requestedBy: String(row[2] || ''),
      item: String(row[3] || ''),
      acquired: String(row[4]).toLowerCase() === 'true',
      deleted: String(row[5]).toLowerCase() === 'true'
    }));
}

function findRowById_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      return i + 1;
    }
  }
  return -1;
}

function doGet() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const items = rowsToItems_(values)
    .filter(item => !item.deleted)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return json_({ ok: true, items });
}

function doPost(e) {
  const sheet = getSheet_();
  const body = JSON.parse(e.postData.contents || '{}');
  const action = body.action;

  if (action === 'add') {
    const id = body.id || Utilities.getUuid();
    const createdAt = body.createdAt || new Date().toISOString();
    sheet.appendRow([
      id,
      createdAt,
      body.requestedBy || 'Crew',
      body.item || '',
      false,
      false
    ]);
    return json_({ ok: true, id });
  }

  if (action === 'toggle') {
    const row = findRowById_(sheet, body.id);
    if (row < 0) return json_({ ok: false, error: 'Item not found' });
    sheet.getRange(row, 5).setValue(Boolean(body.acquired));
    return json_({ ok: true });
  }

  if (action === 'delete') {
    const row = findRowById_(sheet, body.id);
    if (row < 0) return json_({ ok: false, error: 'Item not found' });
    sheet.getRange(row, 6).setValue(true);
    return json_({ ok: true });
  }

  return json_({ ok: false, error: 'Unknown action' });
}
