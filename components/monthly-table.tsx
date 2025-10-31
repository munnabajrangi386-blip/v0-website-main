import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MonthlyData } from "@/hooks/use-scrape"
import { useState, useEffect } from "react"

type Props = {
  data?: MonthlyData | null
  loading?: boolean
  error?: string | null
}

export function MonthlyTable({ data, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading monthly results…</div>
  }
  if (error) {
    return <div className="text-sm text-destructive">Failed to load monthly results: {error}</div>
  }
  if (!data) {
    return <div className="text-sm text-muted-foreground">Choose a month and year, then click "Show Result".</div>
  }

  // Use dynamic columns: admin categories (from API) are already at the left, followed by API columns
  const columns = data.columns || []

  // Generate rows for the month (1-31 days)
  const generateMonthRows = () => {
    const daysInMonth = new Date(data.year, data.month, 0).getDate()
    const rows = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      rows.push({ day })
    }
    
    return rows
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
