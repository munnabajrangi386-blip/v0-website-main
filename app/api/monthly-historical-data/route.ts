import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalDataForMonth } from '@/lib/simple-historical-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '10')
    const year = parseInt(searchParams.get('year') || '2025')

    // Use cached in-memory function – super fast
    const data = getHistoricalDataForMonth(year, month)

    return NextResponse.json({
      success: true,
      month,
      year,
      data
    })
  } catch (error) {
    console.error('Error loading monthly historical data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load monthly historical data' },
      { status: 500 }
    )
  }
}
