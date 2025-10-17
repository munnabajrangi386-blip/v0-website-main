import type { NextRequest } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { getMonthlyResults, saveMonthlyResults, upsertResultRow } from "@/lib/content-store"
import type { MonthKey, MonthlyResults, ResultRow } from "@/lib/types"

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") as MonthKey | null
  if (!month) return new Response("month required", { status: 400 })
  const data = await getMonthlyResults(month)
  return Response.json(data ?? { month, fields: [], rows: [], updatedAt: new Date().toISOString() })
}

export async function POST(req: NextRequest) {
  const unauth = requireAuth()
  if (unauth) return unauth
  const body = await req.json()
  const action = body.action as string
  if (action === "upsertRow") {
    const month = body.month as MonthKey
    const row = body.row as ResultRow
    const merge = !!body.merge
    await upsertResultRow(month, row, merge)
    return Response.json({ ok: true })
  }
  if (action === "saveMonth") {
    const data = body.data as MonthlyResults
    await saveMonthlyResults(data)
    return Response.json({ ok: true })
  }
  return new Response("unknown action", { status: 400 })
}
