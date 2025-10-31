/**
 * Simple historical data management - loads CSV data directly
 */

export interface SimpleHistoricalRow {
  date: string
  dswr: string
  frbd: string
  gzbd: string
  gali: string
  year: number
  month: number
  day: number
}

let historicalData: SimpleHistoricalRow[] = []

export function loadHistoricalDataFromCSV(csvContent: string): void {
  const lines = csvContent.trim().split(/\r?\n/)
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

  // Reset historicalData only if it's empty, otherwise append
  if (historicalData.length === 0) {
    historicalData = []
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Simple CSV parsing - split by comma and handle quoted fields
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
    values.push(current.trim())
    
    if (values.length < headers.length) continue

    const row: SimpleHistoricalRow = {
      date: values[dateIndex] || '',
      dswr: values[dswrIndex] || '',
      frbd: values[frbdIndex] || '',
      gzbd: values[gzbdIndex] || '',
      gali: values[galiIndex] || '',
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
      historicalData.push(row)
    }
  }
  
  // Historical data loaded successfully
}

export function getHistoricalDataForMonth(year: number, month: number): {
  [day: string]: {
    dswr: string
    frbd: string
    gzbd: string
    gali: string
  }
} {
  const result: { [day: string]: { dswr: string; frbd: string; gzbd: string; gali: string } } = {}
  
  for (const row of historicalData) {
    if (row.year === year && row.month === month) {
      result[row.day.toString()] = {
        dswr: row.dswr,
        frbd: row.frbd,
        gzbd: row.gzbd,
        gali: row.gali
      }
    }
  }
  
  return result
}

export function getHistoricalDataSummary(): {
  totalRows: number
  years: number[]
  monthsPerYear: { [year: string]: number }
} {
  const years = [...new Set(historicalData.map(r => r.year))].sort()
  const monthsPerYear: { [year: string]: number } = {}
  
  for (const year of years) {
    const yearData = historicalData.filter(r => r.year === year)
    const months = [...new Set(yearData.map(r => r.month))]
    monthsPerYear[year.toString()] = months.length
  }
  
  return {
    totalRows: historicalData.length,
    years,
    monthsPerYear
  }
}
