import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { appendActivity, getSchedules, runDueSchedules, saveSchedules, upsertResultRow } from "@/lib/supabase-content-store"
import type { ScheduleItem } from "@/lib/types"

export async function GET() {
  const items = await getSchedules()
  items.sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt))
  // Removed console.log for performance
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) {
    // Removed console.log for performance
    return unauth
  }
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // Removed console.log for performance
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const action = body?.action as string | undefined
  // Removed console.log for performance

  // Basic shape guard
  const isValidRow = (r: any) => r && typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
  const isValidMonth = (m: any) => typeof m === "string" && /^\d{4}-\d{2}$/.test(m)
  const isValidISO = (s: any) => typeof s === "string" && !Number.isNaN(Date.parse(s))

  // Helper validations: enforce future publishAt and numeric-only result values
  const isFuture = (iso: string) =>
    typeof iso === "string" && !Number.isNaN(Date.parse(iso)) && Date.parse(iso) > Date.now()
  const rowHasOnlyNumericValue = (row: any) => {
    if (!row || typeof row !== "object") return false
    const entries = Object.entries(row).filter(([k]) => k !== "date")
    if (entries.length !== 1) return false
    const [, v] = entries[0]
    const s = String(v)
    return /^\d+$/.test(s)
  }

  if (action === "add") {
    const item = body?.item as ScheduleItem
    if (
      !item ||
      !isValidISO(item.publishAt) ||
      !isValidMonth(item.month) ||
      !isValidRow(item.row) ||
      !rowHasOnlyNumericValue(item.row) ||
      !isFuture(item.publishAt)
    ) {
      // Removed console.log for performance
      return NextResponse.json(
        { error: "Invalid schedule item (month/date/time malformed, past datetime, or non-numeric value)" },
        { status: 400 },
      )
    }
    const withId: ScheduleItem = { ...item, id: crypto.randomUUID() }
    const items = await getSchedules()
    await saveSchedules([withId, ...items])
    await appendActivity({
      action: "add_schedule",
      meta: { id: withId.id, publishAt: withId.publishAt, month: withId.month },
    })
    return NextResponse.json({ ok: true, item: withId })
  }

  if (action === "update") {
    const next = body?.item as Partial<ScheduleItem> & { id: string }
    if (
      !next?.id ||
      !isValidISO(next.publishAt) ||
      !isValidMonth(next.month) ||
      !isValidRow(next.row) ||
      !rowHasOnlyNumericValue(next.row) ||
      !isFuture(next.publishAt as string)
    ) {
      // Removed console.log for performance
      return NextResponse.json(
        { error: "Invalid update payload (month/date/time malformed, past datetime, or non-numeric value)" },
        { status: 400 },
      )
    }
    const items = await getSchedules()
    const idx = items.findIndex((x) => x.id === next.id)
    if (idx === -1) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }
    const updated: ScheduleItem = {
      ...items[idx],
      month: next.month,
      row: next.row as any,
      publishAt: next.publishAt,
      merge: next.merge ?? items[idx].merge, // ignored in UI but safe to keep
    }
    items[idx] = updated
    await saveSchedules(items)
    await appendActivity({ action: "update_schedule", meta: { id: updated.id } })
    return NextResponse.json({ ok: true, item: updated })
  }

  if (action === "run") {
    await runDueSchedules()
    return NextResponse.json({ ok: true })
  }

  if (action === "force-run") {
    const items = await getSchedules()
    const executedCount = items.length
    
    // Execute all scheduled items regardless of date/time
    for (const item of items) {
      await upsertResultRow(item.month, item.row, !!item.merge)
      await appendActivity({
        action: "force_publish_scheduled",
        meta: { scheduleId: item.id, month: item.month, date: item.row.date },
      })
    }
    
    // Clear all schedules after force execution
    await saveSchedules([])
    
    return NextResponse.json({ ok: true, executed: executedCount })
  }

  if (action === "delete") {
    const id = body?.id as string | undefined
    if (!id) {
      return NextResponse.json({ error: "Missing schedule ID" }, { status: 400 })
    }
    
    const items = await getSchedules()
    const filtered = items.filter(item => item.id !== id)
    await saveSchedules(filtered)
    await appendActivity({ action: "delete_schedule", meta: { id } })
    return NextResponse.json({ ok: true })
  }

  if (action === "execute-now") {
    const month = body?.month as MonthKey | undefined
    const row = body?.row as ResultRow | undefined
    const merge = body?.merge as boolean | undefined

    if (!month || !row || !isValidRow(row) || !rowHasOnlyNumericValue(row)) {
      return NextResponse.json(
        { error: "Invalid execute payload (month/row malformed or non-numeric value)" },
        { status: 400 },
      )
    }

    await upsertResultRow(month, row, !!merge)
    await appendActivity({
      action: "execute_now",
      meta: { month, date: row.date, merge: !!merge },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "execute-now-force") {
    const month = body?.month as MonthKey | undefined
    const row = body?.row as ResultRow | undefined
    const merge = body?.merge as boolean | undefined

    if (!month || !row || !isValidRow(row) || !rowHasOnlyNumericValue(row)) {
      return NextResponse.json(
        { error: "Invalid force execute payload (month/row malformed or non-numeric value)" },
        { status: 400 },
      )
    }

    await upsertResultRow(month, row, true) // Always force merge
    await appendActivity({
      action: "execute_now_force",
      meta: { month, date: row.date, force: true },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
}
