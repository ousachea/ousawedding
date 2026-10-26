// Receives RSVPs from the wedding site and appends them to this spreadsheet.
// Setup steps are in the README.

const SHEET_NAME = 'RSVPs'
const HEADERS = ['Timestamp', 'Name', 'Attending', 'Guests', 'Message']

function doPost(e) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const data = JSON.parse(e.postData.contents)
    const name = clean(data.name, 100)
    if (!name) return json({ ok: false, error: 'Name is required' })

    const attending = data.attending === 'yes'
    const guests = attending ? Math.min(Math.max(parseInt(data.guests, 10) || 1, 1), 10) : 0

    const ss = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME)
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS)

    sheet.appendRow([new Date(), name, attending ? 'Yes' : 'No', guests, clean(data.note, 1000)])
    return json({ ok: true })
  } catch (err) {
    return json({ ok: false, error: String(err) })
  } finally {
    lock.releaseLock()
  }
}

// Trim, cap length, and stop guest input from being interpreted as a spreadsheet formula.
function clean(value, maxLength) {
  const text = String(value || '').trim().slice(0, maxLength)
  return /^[=+\-@]/.test(text) ? "'" + text : text
}

function json(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON)
}
