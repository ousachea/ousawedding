// The smallest .xlsx that Excel, Google Sheets and phone viewers open: one sheet of text and numbers,
// the first row bold and kept in view. An .xlsx is a zip of a few XML files; they are stored without
// compression, so no zip library is needed.

type Cell = string | number

const xml = (v: string) => v
  // Characters XML can't hold at all (control characters) are dropped
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const column = (i: number): string => (i >= 26 ? column(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26))

function sheetXml(rows: Cell[][], widths: number[]) {
  const cells = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => {
    const ref = `${column(c)}${r + 1}`
    const style = r === 0 ? ' s="1"' : ''
    return typeof v === 'number'
      ? `<c r="${ref}"${style}><v>${v}</v></c>`
      : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(v)}</t></is></c>`
  }).join('')}</row>`).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${cells}</sheetData></worksheet>`
}

const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
  + '</styleSheet>'

/** One sheet called `name`: the first row is the bold header; `widths` are column widths in characters. */
export function xlsx(name: string, rows: Cell[][], widths: number[] = []): Uint8Array {
  const ns = 'http://schemas.openxmlformats.org'
  return zip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + `<Types xmlns="${ns}/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + `<Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + `<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships">`
      // Sheet names: at most 31 characters, none of : \ / ? * [ ]
      + `<sheets><sheet name="${xml(name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + `<Relationships xmlns="${ns}/package/2006/relationships">`
      + `<Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`
      + `<Relationship Id="rId2" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + '</Relationships>',
    'xl/worksheets/sheet1.xml': sheetXml(rows, widths),
    'xl/styles.xml': STYLES,
  })
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (b: Uint8Array) => {
  let c = 0xFFFFFFFF
  for (const x of b) c = CRC[(c ^ x) & 0xFF]! ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// A zip with every file stored as-is (no compression)
function zip(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const header = (size: number) => { const b = new Uint8Array(size); return { b, v: new DataView(b.buffer) } }
  for (const [path, content] of Object.entries(files)) {
    const name = enc.encode(path)
    const data = enc.encode(content)
    const crc = crc32(data)
    const local = header(30 + name.length)
    local.v.setUint32(0, 0x04034B50, true)
    local.v.setUint16(4, 20, true)
    local.v.setUint16(6, 0x0800, true) // names are UTF-8
    local.v.setUint16(12, 0x21, true) // 1 Jan 1980
    local.v.setUint32(14, crc, true)
    local.v.setUint32(18, data.length, true)
    local.v.setUint32(22, data.length, true)
    local.v.setUint16(26, name.length, true)
    local.b.set(name, 30)
    const entry = header(46 + name.length)
    entry.v.setUint32(0, 0x02014B50, true)
    entry.v.setUint16(4, 20, true)
    entry.v.setUint16(6, 20, true)
    entry.v.setUint16(8, 0x0800, true)
    entry.v.setUint16(14, 0x21, true)
    entry.v.setUint32(16, crc, true)
    entry.v.setUint32(20, data.length, true)
    entry.v.setUint32(24, data.length, true)
    entry.v.setUint16(28, name.length, true)
    entry.v.setUint32(42, offset, true)
    entry.b.set(name, 46)
    parts.push(local.b, data)
    central.push(entry.b)
    offset += local.b.length + data.length
  }
  const size = central.reduce((n, b) => n + b.length, 0)
  const end = header(22)
  end.v.setUint32(0, 0x06054B50, true)
  end.v.setUint16(8, central.length, true)
  end.v.setUint16(10, central.length, true)
  end.v.setUint32(12, size, true)
  end.v.setUint32(16, offset, true)
  const out = new Uint8Array(offset + size + 22)
  let at = 0
  for (const b of [...parts, ...central, end.b]) { out.set(b, at); at += b.length }
  return out
}
