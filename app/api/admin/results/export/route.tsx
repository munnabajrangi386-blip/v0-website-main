import type { NextRequest } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { getMonthlyResults } from "@/lib/content-store"
import type { MonthKey } from "@/lib/types"

function toCSV(objArr: any[], headers?: string[]) {
  const keys = headers ?? Array.from(new Set(objArr.flatMap((o) => Object.keys(o))))
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const lines = [keys.join(",")].concat(objArr.map((o) => keys.map((k) => esc(o[k])).join(",")))
  return lines.join("\n")
}

export async function GET(req: NextRequest) {
  const unauth = requireAuth()
  if (unauth) return unauth
  const month = req.nextUrl.searchParams.get("month") as MonthKey | null
  const format = (req.nextUrl.searchParams.get("format") || "csv").toLowerCase()
  if (!month) return new Response("month required", { status: 400 })
  const data = await getMonthlyResults(month)
  if (!data) return new Response("no data", { status: 404 })

  if (format === "csv") {
    const csv = toCSV(data.rows, ["date", ...data.fields])
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="results-${month}.csv"`,
      },
    })
  }

  const html = `
    <html><head><meta charset="utf-8"><title>Results ${month}</title></head>
    <body>
      <h1>Results ${month}</h1>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr>${["date", ...data.fields].map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${data.rows.map((r) => `<tr>${["date", ...data.fields].map((k) => `<td>${r[k] ?? ""}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
      <script>window.print?.()</script>
    </body></html>`
  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="results-${month}.html"`,
    },
  })
}
