import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { loadHistoricalDataFromCSV, getHistoricalDataSummary } from '@/lib/simple-historical-data'

export async function POST(request: NextRequest) {
  try {
    // Combine both CSV files into one
    let combinedCsvData = ''
    
    // Read the main CSV file (2015-2024)
    try {
      const csvPath = join(process.cwd(), 'comprehensive_historical_data.csv')
      const csvData = readFileSync(csvPath, 'utf-8')
      const lines = csvData.trim().split(/\r?\n/)
      combinedCsvData = lines[0] + '\n' // Header
      combinedCsvData += lines.slice(1).join('\n') + '\n' // Data rows
    } catch (error) {
      console.log('Main historical data not found')
    }
    
    // Read and append 2025 data
    try {
      const csv2025Path = join(process.cwd(), 'satta_2025_simple.csv')
      const csv2025Data = readFileSync(csv2025Path, 'utf-8')
      const lines = csv2025Data.trim().split(/\r?\n/)
      if (combinedCsvData) {
        combinedCsvData += lines.slice(1).join('\n') + '\n' // Data rows only
      } else {
        combinedCsvData = csv2025Data // Use 2025 data as main if no main data
      }
    } catch (error) {
      console.log('2025 data not found')
    }
    
    // Load the combined data
    console.log('Combined CSV data length:', combinedCsvData.length)
    console.log('First 200 chars:', combinedCsvData.substring(0, 200))
    loadHistoricalDataFromCSV(combinedCsvData)
    
    // Get summary
    const summary = getHistoricalDataSummary()
    
    return NextResponse.json({
      success: true,
      message: 'Historical data loaded successfully (2015-2025)',
      summary
    })
  } catch (error) {
    console.error('Error loading historical data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load historical data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const summary = getHistoricalDataSummary()
    return NextResponse.json({
      success: true,
      summary
    })
  } catch (error) {
    console.error('Error getting historical data summary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get historical data summary' },
      { status: 500 }
    )
  }
}
