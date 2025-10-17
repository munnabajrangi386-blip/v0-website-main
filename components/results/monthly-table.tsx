"use client"

import type { MonthlyData } from "@/hooks/use-scrape"

type Props = {
  data?: MonthlyData | null
  loading?: boolean
  error?: string | null
}

export function MonthlyTable({ data, loading, error }: Props) {
  if (error) {
    return <div className="mt-3 text-sm text-red-600">{error}</div>
  }
  if (!data && loading) {
    return <div className="mt-3 text-sm text-muted-foreground">Loading table…</div>
  }
  if (!data) {
    return null
  }

  const monthName = new Date(data.year, data.month - 1, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  })

  return (
    <section aria-labelledby="monthly-results-title" className="w-full overflow-x-auto">
      <h2 id="monthly-results-title" className="mt-4 mb-2 text-lg font-semibold text-pretty">
        {monthName} Results
      </h2>

      <table className="newghaziabad-table">
        <thead>
          <tr>
            <th>Date</th>
            {data.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.day}>
              <td className="font-medium">{r.day}</td>
              {r.values.map((v, i) => (
                <td key={`${r.day}-${i}`} className="font-mono text-sm">
                  {v === null ? "--" : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
