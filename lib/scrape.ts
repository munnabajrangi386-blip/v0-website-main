import * as cheerio from "cheerio"

export type MonthlyResult = {
  month: number
  year: number
  columns: string[]
  rows: Array<{ day: number; values: Array<number | null> }>
}

export function parseMonthlyTable(html: string, month: number, year: number): MonthlyResult {

  const $ = cheerio.load(html)

  const tables = $("table")
  if (tables.length === 0) throw new Error("No tables found in source HTML")

  // Try to find the monthly table by header cues; otherwise fallback to first table.
  let targetTable: cheerio.Cheerio<cheerio.Element> | null = null
  tables.each((_, el) => {
    const firstRowCells = $(el).find("tr").first().find("td")
    if (firstRowCells.length >= 7) {
      const secondCellText = firstRowCells.eq(1).text().trim().toLowerCase()
      const candidates = ["desawar", "disawar", "firozabad", "faridabad", "ghaziabad", "gali"]
      if (candidates.some((c) => secondCellText.includes(c))) {
        targetTable = $(el)
        return false
      }
    }
    return true
  })

  const table = targetTable ?? tables.first()
  const rows = table.find("tr")
  if (rows.length < 2) throw new Error("Monthly table structure not recognized")

  // Header
  const headerTds = rows.eq(0).find("td")
  const columns: string[] = []
  headerTds.each((i, td) => {
    if (i === 0) return
    const label = $(td).text().replace(/\s+/g, " ").trim()
    if (label) columns.push(label)
  })

  const dataRows: Array<{ day: number; values: Array<number | null> }> = []
  rows.slice(1).each((_, tr) => {
    const tds = $(tr).find("td")
    if (tds.length < columns.length + 1) return

    const dayText = $(tds[0])
      .text()
      .replace(/[^\d]+/g, "")
      .trim()
    const day = Number.parseInt(dayText, 10)
    if (!Number.isFinite(day)) return

    const values: Array<number | null> = []
    for (let i = 1; i < tds.length && i <= columns.length; i++) {
      const raw = $(tds[i]).text().trim()
      const clean = raw.replace(/[^\d-]+/g, "").trim()
      if (clean === "" || clean === "--") {
        values.push(null)
      } else {
        const num = Number.parseInt(clean, 10)
        values.push(Number.isFinite(num) ? num : null)
      }
    }

    dataRows.push({ day, values })
  })

  dataRows.sort((a, b) => a.day - b.day)
  return { month, year, columns, rows: dataRows }
}
