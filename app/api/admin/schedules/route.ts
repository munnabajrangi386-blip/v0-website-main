import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { appendActivity, getSchedules, runDueSchedules, saveSchedules, upsertResultRow } from "@/lib/local-content-store"
import { deleteSchedule as deleteScheduleDb, runDueSchedules as runDueSchedulesDb } from "@/lib/supabase-db"
import { deleteAdminResultCompletely } from "@/lib/admin-result-deletion"
import type { ScheduleItem } from "@/lib/types"

export async function GET() {
  const items = await getSchedules()
  items.sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt))
  // Removed console.log for performance
  return NextResponse.json({ items }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  })
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
    
    // Check for duplicates (same date, category, and value) before adding
    const categoryKey = Object.keys(withId.row || {}).find(k => k !== 'date')
    const isDuplicate = items.some(existing => {
      const existingCategoryKey = Object.keys(existing.row || {}).find(k => k !== 'date')
      return existing.row.date === withId.row.date &&
             existingCategoryKey === categoryKey &&
             existing.row[existingCategoryKey] === withId.row[categoryKey]
    })
    
    if (isDuplicate) {
      return NextResponse.json(
        { error: "A schedule with the same date, category, and value already exists." },
        { status: 400 }
      )
    }
    
    await saveSchedules([withId, ...items])
    await appendActivity({
      action: "add_schedule",
      meta: { id: withId.id, publishAt: withId.publishAt, month: withId.month },
    })
    
    // Return the updated list immediately to ensure fresh data
    const updatedItems = await getSchedules()
    // Remove duplicates just in case
    const uniqueItems = updatedItems.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    )
    
    return NextResponse.json({ 
      ok: true, 
      item: withId,
      items: uniqueItems.sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt))
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    })
  }

  if (action === "update") {
    const next = body?.item as Partial<ScheduleItem> & { id: string }
    if (
      !next?.id ||
      !isValidISO(next.publishAt) ||
      !isValidMonth(next.month) ||
      !isValidRow(next.row) ||
      !rowHasOnlyNumericValue(next.row)
    ) {
      // Removed console.log for performance
      return NextResponse.json(
        { error: "Invalid update payload (month/date/time malformed, or non-numeric value)" },
        { status: 400 },
      )
    }
    // Allow past dates for updates (schedules may be for historical dates or already executed)
    // Removed isFuture check for updates
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
    await runDueSchedulesDb()
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
    
    // Get the schedule to be deleted to extract date and category info
    const items = await getSchedules()
    const scheduleToDelete = items.find(item => item.id === id)
    
    // Delete from database
    try {
      await deleteScheduleDb(id)
    } catch (error) {
      console.error('Error deleting schedule from database:', error)
      // Continue with local delete even if database delete fails
    }
    
    // Always remove the data if schedule exists (even if not executed, it might have been published)
    // This ensures that deleting a schedule removes its data from the table
    if (scheduleToDelete && scheduleToDelete.row.date) {
      try {
        // Get category from row keys or categoryLabel
        let categoryToDelete = scheduleToDelete.categoryLabel
        
        // If no categoryLabel, try to get from row keys
        if (!categoryToDelete) {
          const categoryKey = Object.keys(scheduleToDelete.row || {}).find(k => k !== 'date')
          if (categoryKey) {
            // Map common keys to labels
            const keyNorm = categoryKey.toLowerCase()
            if (keyNorm.includes('gali') && !keyNorm.includes('luxmi')) {
              categoryToDelete = 'GALI2'
            } else if (keyNorm.includes('desawar')) {
              categoryToDelete = 'DESAWAR2'
            } else if (keyNorm.includes('faridabad')) {
              categoryToDelete = 'FARIDABAD2'
            } else if (keyNorm.includes('ghaziabad')) {
              categoryToDelete = 'GHAZIABAD2'
            } else if (keyNorm.includes('luxmi') || keyNorm.includes('kuber')) {
              categoryToDelete = 'LUXMI KUBER'
            } else {
              categoryToDelete = categoryKey.toUpperCase()
            }
          }
        }
        
        if (categoryToDelete) {
          // Use the new centralized deletion function
          await deleteAdminResultCompletely(scheduleToDelete.row.date, categoryToDelete)
        } else {
          console.warn(`⚠️ Could not determine category for deletion. Row keys: ${Object.keys(scheduleToDelete.row || {}).join(', ')}, categoryLabel: ${scheduleToDelete.categoryLabel}`)
        }
      } catch (error) {
        console.error('❌ Error removing admin result data:', error)
        // Continue even if removal fails - at least the schedule will be deleted
      }
    }
    
    const filtered = items.filter(item => item.id !== id)
    await saveSchedules(filtered)
    await appendActivity({ action: "delete_schedule", meta: { id } })
    
    // Return the updated list immediately to avoid cache issues
    return NextResponse.json({ 
      ok: true, 
      items: filtered.sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt))
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    })
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
