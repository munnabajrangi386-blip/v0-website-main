import * as cheerio from "cheerio"

export type MonthlyResult = {
  month: number
  year: number
  columns: string[]
  rows: Array<{ day: number; values: Array<number | null> }>
}

export type LiveResult = {
  title: string
  time: string
  jodi: string
  result: string
  status: string
  yesterdayResult?: string // Yesterday's result (left of globe)
  todayResult?: string    // Today's result (in curly braces)
}

export type LiveResults = {
  results: LiveResult[]
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

  const dataRows: Array<{ 
    day: number
    values: Array<number | null>
  }> = []
  
  rows.slice(1).each((_, tr) => {
    const tds = $(tr).find("td")
    if (tds.length < columns.length + 1) return

    // Extract day from first column - look for valid day numbers (1-31)
    const dayText = $(tds[0]).text().trim()
    const day = Number.parseInt(dayText, 10)
    
    // Only process rows with valid day numbers (1-31)
    if (!day || day < 1 || day > 31) return

    const values: Array<number | null> = []
    const rowData: any = { day, values }
    
    for (let i = 1; i < tds.length && i <= columns.length; i++) {
      const raw = $(tds[i]).text().trim()
      const clean = raw.replace(/[^\d-]+/g, "").trim()
      const value = (clean === "" || clean === "--" || clean === "XX") ? null : clean
      
      values.push(value ? Number.parseInt(value, 10) : null)
    }

    dataRows.push(rowData)
  })

  dataRows.sort((a, b) => a.day - b.day)
  return { month, year, columns, rows: dataRows }
}

export function parseLiveResults(html: string): LiveResults {
  const $ = cheerio.load(html)
  const results: LiveResult[] = []

  // Find all the game cards with the correct selector
  $('.col-6.karan').each((_, element) => {
    const $card = $(element)
    
    // Get the title from the blue span
    const title = $card.find('span[style*="color:blue"]').text().trim()
    
    // Get the time from the website div
    const timeText = $card.find('.website').text().trim()
    const time = timeText.replace('TIME- ', '')
    
    // Get the jodi from the green span
    const jodiText = $card.find('span[style*="color:green"]').text().trim()
    const jodi = jodiText.replace('🌐', '').trim()
    
    // Get the result from the red span
    const resultText = $card.find('span[style*="color:red"]').text().trim()
    
    // Extract result from { XX } format
    const resultMatch = resultText.match(/\{\s*(\d+)\s*\}/)
    const result = resultMatch ? resultMatch[1] : '--'
    
    // Determine status based on result
    const status = result !== '--' ? 'pass' : 'wait'

    if (title && time) {
      results.push({
        title,
        time,
        jodi,
        result,
        status
      })
    }
  })

  // Live results parsed successfully
  return { results }
}

// New scraper for satta-king-fast.com
export function parseLiveResultsFast(html: string): LiveResults {
  const $ = cheerio.load(html)
  const results: LiveResult[] = []

  // Find all game result rows
  $('tr[class*="game-result"]').each((_, row) => {
    const $row = $(row)
    const cells = $row.find('td')
    
    if (cells.length >= 3) {
      // Extract game name from first cell
      const gameNameElement = cells.eq(0).find('.game-name')
      const gameTimeElement = cells.eq(0).find('.game-time')
      
      const title = gameNameElement.text().trim()
      const timeText = gameTimeElement.text().trim()
      
      // Extract time from "at XX:XX PM/AM" format
      const timeMatch = timeText.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i)
      const time = timeMatch ? timeMatch[1] : ''
      
      // Extract yesterday's result (second column)
      const yesterdayResult = cells.eq(1).text().trim()
      
      // Extract today's result (third column) 
      const todayResult = cells.eq(2).text().trim()
      
      // Clean and validate results
      const cleanYesterdayResult = yesterdayResult && yesterdayResult !== 'XX' && yesterdayResult !== '--' && !isNaN(parseInt(yesterdayResult)) ? yesterdayResult : '--'
      const cleanTodayResult = todayResult && todayResult !== 'XX' && todayResult !== '--' && !isNaN(parseInt(todayResult)) ? todayResult : '--'
      
      // Determine which result to use for main display and status
      let result = '--'
      let status = 'wait'
      let jodi = '--'
      
      // Use today's result if available, otherwise yesterday's
      if (cleanTodayResult !== '--') {
        result = cleanTodayResult
        status = 'pass'
        jodi = cleanTodayResult
      } else if (cleanYesterdayResult !== '--') {
        result = cleanYesterdayResult
        status = 'pass'
        jodi = cleanYesterdayResult
      }
      
      // Include all games from the scraper
      if (title) {
        results.push({
          title: title.toUpperCase(),
          time: time || 'N/A',
          jodi: jodi,
          result: result,
          status: status,
          yesterdayResult: cleanYesterdayResult,
          todayResult: cleanTodayResult
        })
      }
    }
  })

  // Live results from satta-king-fast.com parsed successfully
  return { results }
}
