import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MonthlyData } from "@/hooks/use-scrape"

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

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="newghaziabad-table w-full min-w-[600px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--table-header-bg)]">Date</th>
            {data.columns.map((h) => (
              <th key={h} className="whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.day}>
              <td className="font-medium sticky left-0 z-10 bg-[var(--table-cell-bg)]">{r.day}</td>
              {r.values.map((cell, idx) => (
                <td key={`${r.day}-${idx}`} className="font-mono text-xs sm:text-sm text-center">
                  {cell === null ? "--" : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
