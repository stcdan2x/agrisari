import writeXlsxFile, { type Cell as XlsxCell } from 'write-excel-file/universal'
import type { Period } from '../engine/finance'
import type { BookSheet, Cell } from './books'

// The workbook writer behind the books export (TASK 003): one worksheet per BookSheet, a
// bold sticky header row, the column widths from the sheet, money cells with their format.
// `write-excel-file/universal` returns a Blob in the browser and in Node alike, so the
// test can unzip what the page will share or download.

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const cell = (c: Cell): XlsxCell => (c !== null && typeof c === 'object' ? { value: c.value, format: c.format } : c)

export function booksToBlob(sheets: BookSheet[]): Promise<Blob> {
  return writeXlsxFile(
    sheets.map((s) => ({
      sheet: s.name,
      columns: s.columns.map((c) => ({ width: c.width })),
      stickyRowsCount: 1,
      data: [s.columns.map((c): XlsxCell => ({ value: c.header, fontWeight: 'bold' })), ...s.rows.map((r) => r.map(cell))],
    })),
  ).toBlob()
}

export const booksFilename = ({ from, to }: Period) => `agrisari-books-${from}-to-${to}.xlsx`
