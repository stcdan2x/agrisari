import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { type BookSheet } from './books'
import { booksFilename, booksToBlob } from './xlsx'

const sheets: BookSheet[] = [
  { name: 'Summary', columns: [{ header: 'Item', width: 40 }, { header: 'Amount', width: 16 }], rows: [['Store', 'AgriSari Tanauan'], ['Sales', { value: 2970, format: '#,##0.00' }]] },
  { name: 'Sales', columns: [{ header: 'Date', width: 12 }, { header: 'Total', width: 14 }], rows: [['2026-09-06', { value: 1750, format: '#,##0.00' }], ['2026-09-10', null]] },
]

describe('booksToBlob', () => {
  it('writes an xlsx zip with one worksheet per sheet, named and in order, headers first', async () => {
    const blob = await booksToBlob(sheets)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]) // PK
    const files = unzipSync(bytes)
    const workbook = strFromU8(files['xl/workbook.xml'])
    const names = [...workbook.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((x) => x[1])
    expect(names).toEqual(['Summary', 'Sales'])
    const sheet2 = strFromU8(files['xl/worksheets/sheet2.xml'])
    expect(sheet2).toContain('<row r="1"')
    expect(sheet2).toContain('1750')
    const strings = strFromU8(files['xl/sharedStrings.xml'] ?? new Uint8Array())
    expect(`${sheet2}${strings}`).toContain('Date')
    expect(`${sheet2}${strings}`).toContain('2026-09-06')
  })
})

describe('booksFilename', () => {
  it('names the file by the range', () => {
    expect(booksFilename({ from: '2026-07-01', to: '2026-09-30' })).toBe('agrisari-books-2026-07-01-to-2026-09-30.xlsx')
  })
})
