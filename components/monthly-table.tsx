import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MonthlyData } from "@/hooks/use-scrape"
import { useState, useEffect } from "react"

type Props = {
  data?: MonthlyData | null
  loading?: boolean
  error?: string | null
}

export function MonthlyTable({ data, loading, error }: Props) {
  // Show error state
  if (error) {
    return <div className="text-sm text-destructive p-4">Failed to load monthly results: {error}</div>
  }
  
  // Show loading GIF on first load (no data yet)
  if (loading && !data) {
    return (
      <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <div className="w-full min-w-[600px] sm:min-w-[800px] bg-white rounded-lg shadow-sm p-8 flex justify-center items-center">
          <img 
            src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNGJldHdvYnZ2bXkyMXVyMWZjaXR2djQxNWN0NGw1OHlkeGFxbDhhaCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/L05HgB2h6qICDs5Sms/giphy.gif" 
            alt="Loading..." 
            className="w-24 h-24 sm:w-32 sm:h-32"
          />
        </div>
      </div>
    )
  }
  
  if (!data) {
    // Show empty state when no data (not loading)
    return (
      <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <div className="w-full min-w-[600px] sm:min-w-[800px] bg-white rounded-lg shadow-sm p-8 text-center text-gray-400">
          <p className="text-sm">Choose a month and year, then click "Show Result"</p>
        </div>
      </div>
    )
  }
  
  // If loading but we have data, show the data (optimistic rendering)
  // The loading prop here is ignored when data exists to show cached/previous data

  // Use dynamic columns: admin categories (from API) are already at the left, followed by API columns
  const columns = data.columns || []

  // Generate rows for the month - only show days that have at least some data
  const generateMonthRows = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()
    
    const isCurrentMonth = data.year === currentYear && data.month === currentMonth
    const isPastMonth = data.year < currentYear || (data.year === currentYear && data.month < currentMonth)
    const isFutureMonth = data.year > currentYear || (data.year === currentYear && data.month > currentMonth)
    
    const daysInMonth = new Date(data.year, data.month, 0).getDate()
    const rows: Array<{ day: number; hasData: boolean }> = []
    
    // Get all days that have at least one non-null value
    const daysWithData = new Set<number>()
    data.rows.forEach(row => {
      const hasAnyData = row.values && row.values.some(val => val !== null && val !== undefined)
      if (hasAnyData && row.day >= 1 && row.day <= daysInMonth) {
        daysWithData.add(row.day)
      }
    })
    
    if (isCurrentMonth) {
      // For current month: show days 1 through today (even if blank), plus any future days with data
      for (let day = 1; day <= Math.min(currentDay, daysInMonth); day++) {
        rows.push({ day, hasData: daysWithData.has(day) })
      }
      // Add future days only if they have data
      for (let day = currentDay + 1; day <= daysInMonth; day++) {
        if (daysWithData.has(day)) {
          rows.push({ day, hasData: true })
        }
      }
    } else if (isPastMonth) {
      // For past months: show only days that have data
      for (let day = 1; day <= daysInMonth; day++) {
        if (daysWithData.has(day)) {
          rows.push({ day, hasData: true })
        }
      }
    } else {
      // For future months: show only days that have data
      for (let day = 1; day <= daysInMonth; day++) {
        if (daysWithData.has(day)) {
          rows.push({ day, hasData: true })
        }
      }
    }
    
    // Sort by day number
    return rows.sort((a, b) => a.day - b.day)
  }

  const monthRows = generateMonthRows()

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
      <table className="newghaziabad-table w-full min-w-[600px] sm:min-w-[800px]">
        <thead>
                 {/* Yellow header row with current month & year */}
                 <tr className="bg-yellow-500">
            <td colSpan={columns.length + 1} className="text-center py-2 sm:py-3 md:py-4 px-2">
              <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-gray-800">
                {new Date(0, data.month - 1).toLocaleString('default', { month: 'long' })} {data.year}
              </div>
              <div className="text-xs sm:text-sm font-bold text-gray-700 mt-1">
                MONTHLY RESULTS CHART
              </div>
            </td>
          </tr>
          {/* Column headers */}
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--table-header-bg)] text-xs sm:text-sm px-1 sm:px-2">Date</th>
            {columns.map((label, idx) => (
              <th key={`${label}-${idx}`} className="whitespace-nowrap bg-[var(--table-header-bg)] text-xs sm:text-sm px-1 sm:px-2">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthRows.map((r, rowIndex) => (
            <tr key={`${r.day}-${rowIndex}`}>
              <td className="font-medium sticky left-0 z-10 bg-[var(--table-cell-bg)] text-xs sm:text-sm px-1 sm:px-2">{r.day}</td>
              {columns.map((_, colIdx) => {
                const dayRow = data.rows.find(row => row.day === r.day)
                const value = dayRow?.values?.[colIdx]
                const display = value == null
                  ? '--'
                  : (typeof value === 'number' 
                      ? value.toString().padStart(2, '0') 
                      : String(value))
                return (
                  <td key={`${r.day}-${rowIndex}-${colIdx}`} className="font-mono text-[10px] sm:text-xs md:text-sm text-center px-1 sm:px-2">
                    {display}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
