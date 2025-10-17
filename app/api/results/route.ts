import type { NextRequest } from "next/server"
import { getMonthlyResults, runDueSchedules } from "@/lib/content-store"
import type { MonthKey } from "@/lib/types"

export async function GET(req: NextRequest) {
  await runDueSchedules()
  const month = req.nextUrl.searchParams.get("month") as MonthKey | null
  if (!month) return new Response("month required", { status: 400 })
  const data = await getMonthlyResults(month)
  // Optional: fallback to scraper when no data exists
  // if (!data && month === `${new Date().getFullYear()}-${new Date().getMonth()+1}` as any) { ... }
  return Response.json(data ?? { month, fields: [], rows: [], updatedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "no-store" },
  })
}
