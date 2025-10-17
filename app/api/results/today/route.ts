import { NextResponse } from "next/server"
import { getMonthlyResults, runDueSchedules, getSiteContent } from "@/lib/supabase-content-store"

const DEFAULT_ORDER = ["disawar", "newDisawar", "taj", "delhiNoon", "gali", "ghaziabad", "faridabad", "haridwar"]

export async function GET() {
  // Process any due schedules so today's row reflects newly scheduled values
  await runDueSchedules()

  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const monthKey = `${yyyy}-${mm}` as const
  const today = `${yyyy}-${mm}-${dd}`

  const site = await getSiteContent()
  const categories = site.categories ?? []

  const monthly = await getMonthlyResults(monthKey)
  const row = monthly?.rows.find((r) => r.date === today) ?? null

  // Helper: derive a safe key from label if key is missing
  const slugFromLabel = (label: string) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-")

  const items = categories.map((cat, i) => {
    const key = (cat.key && String(cat.key)) || slugFromLabel(cat.label || "")
    const v = row ? (row as any)[key] : undefined
    const value = v == null || String(v).trim() === "" ? "-" : String(v)
    const label = cat.label || key.toUpperCase()
    const color = ["blue", "red", "green"][i % 3] as "blue" | "red" | "green"
    return { key, label, value, color }
  })

  return NextResponse.json({ date: today, items })
}
