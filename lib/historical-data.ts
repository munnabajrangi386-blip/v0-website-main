/**
 * Historical data management for monthly table
 */

export interface HistoricalDataRow {
  date: string
  dswr: string
  frbd: string
  gzbd: string
  gali: string
  source_url: string
  year: number
  month: number
  day: number
}

export interface MonthlyHistoricalData {
  [year: string]: {
    [month: string]: {
      [day: string]: {
        dswr: string
        frbd: string
        gzbd: string
        gali: string
      }
    }
  }
}

let historicalData: MonthlyHistoricalData | null = null

export function loadHistoricalData(): MonthlyHistoricalData {
  if (historicalData) {
    return historicalData
  }

  // For now, we'll use a simple in-memory structure
  // In production, this would load from a database or file
  historicalData = {}
  
  return historicalData
}

export function addHistoricalDataRow(row: HistoricalDataRow): void {
  if (!historicalData) {
    historicalData = {}
  }

  const year = row.year.toString()
  const month = row.month.toString()
  const day = row.day.toString()

  if (!historicalData[year]) {
    historicalData[year] = {}
  }
  if (!historicalData[year][month]) {
    historicalData[year][month] = {}
  }

  historicalData[year][month][day] = {
    dswr: row.dswr,
    frbd: row.frbd,
    gzbd: row.gzbd,
    gali: row.gali
  }
}

export function getHistoricalData(year: number, month: number, day: number): {
  dswr: string
  frbd: string
  gzbd: string
  gali: string
} | null {
  if (!historicalData) {
    loadHistoricalData()
  }

  const yearStr = year.toString()
  const monthStr = month.toString()
  const dayStr = day.toString()

  return historicalData?.[yearStr]?.[monthStr]?.[dayStr] || null
}

export function getHistoricalDataForMonth(year: number, month: number): {
  [day: string]: {
    dswr: string
    frbd: string
    gzbd: string
    gali: string
  }
} {
  if (!historicalData) {
    loadHistoricalData()
  }

  const yearStr = year.toString()
  const monthStr = month.toString()

  return historicalData?.[yearStr]?.[monthStr] || {}
}

export function loadHistoricalDataFromCSV(csvData: string): void {
  const lines = csvData.trim().split('\n')
  const headers = lines[0].split(',')
  
  // Find column indices
  const dateIndex = headers.indexOf('date')
  const dswrIndex = headers.indexOf('dswr')
  const frbdIndex = headers.indexOf('frbd')
  const gzbdIndex = headers.indexOf('gzbd')
  const galiIndex = headers.indexOf('gali')
  const yearIndex = headers.indexOf('year')
  const monthIndex = headers.indexOf('month')
  const dayIndex = headers.indexOf('day')

  if (dateIndex === -1 || dswrIndex === -1 || frbdIndex === -1 || gzbdIndex === -1 || galiIndex === -1) {
    throw new Error('Invalid CSV format: missing required columns')
  }

  // Process each row with proper CSV parsing
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Simple CSV parsing that handles quoted fields
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Add the last field
    
    if (values.length < headers.length) continue

    const row: HistoricalDataRow = {
      date: values[dateIndex] || '',
      dswr: values[dswrIndex] || '',
      frbd: values[frbdIndex] || '',
      gzbd: values[gzbdIndex] || '',
      gali: values[galiIndex] || '',
      source_url: values[headers.indexOf('source_url')] || '',
      year: yearIndex !== -1 ? parseInt(values[yearIndex]) || 0 : 0,
      month: monthIndex !== -1 ? parseInt(values[monthIndex]) || 0 : 0,
      day: dayIndex !== -1 ? parseInt(values[dayIndex]) || 0 : 0
    }

    // Parse date if year/month/day are not available
    if (row.year === 0 && row.date) {
      const dateMatch = row.date.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (dateMatch) {
        row.year = parseInt(dateMatch[1])
        row.month = parseInt(dateMatch[2])
        row.day = parseInt(dateMatch[3])
      }
    }

    if (row.year > 0 && row.month > 0 && row.day > 0) {
      addHistoricalDataRow(row)
    }
  }
}

export function getHistoricalDataSummary(): {
  totalRows: number
  years: number[]
  monthsPerYear: { [year: string]: number }
} {
  if (!historicalData) {
    loadHistoricalData()
  }

  const years = Object.keys(historicalData || {}).map(Number).sort()
  const monthsPerYear: { [year: string]: number } = {}
  let totalRows = 0

  for (const year of years) {
    const yearStr = year.toString()
    const months = Object.keys(historicalData?.[yearStr] || {})
    monthsPerYear[yearStr] = months.length
    
    // Count total rows for this year
    for (const month of months) {
      const days = Object.keys(historicalData?.[yearStr]?.[month] || {})
      totalRows += days.length
    }
  }

  return {
    totalRows,
    years,
    monthsPerYear
  }
}
