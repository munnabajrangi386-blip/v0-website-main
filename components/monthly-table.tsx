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

  // Custom column order: API data + admin categories
  const customColumns = [
    { key: 'faridabad', label: 'Faridabad', source: 'api' },
    { key: 'faridabad1', label: 'Faridabad1', source: 'admin' },
    { key: 'ghaziabad', label: 'Ghaziabad', source: 'api' },
    { key: 'ghaziabad1', label: 'Ghaziabad1', source: 'admin' },
    { key: 'gali', label: 'Gali', source: 'api' },
    { key: 'gali1', label: 'Gali1', source: 'admin' },
    { key: 'desawar', label: 'DESAWAR', source: 'api' },
    { key: 'desawar1', label: 'Desawar1', source: 'admin' }
  ]

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="newghaziabad-table w-full min-w-[800px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--table-header-bg)]">Date</th>
            {customColumns.map((col) => (
              <th key={col.key} className="whitespace-nowrap bg-[var(--table-header-bg)]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, rowIndex) => (
            <tr key={`${r.day}-${rowIndex}`}>
              <td className="font-medium sticky left-0 z-10 bg-[var(--table-cell-bg)]">{r.day}</td>
              {customColumns.map((col) => (
                <td key={`${r.day}-${rowIndex}-${col.key}`} className="font-mono text-xs sm:text-sm text-center">
                  --
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
