import { getJSON, putJSON } from "./blob"
import type { SiteContent, ActivityEntry, ScheduleItem, MonthKey, MonthlyResults, ResultRow } from "./types"

const CONTENT_PATH = "content/site.json"
const ACTIVITY_PATH = "content/activity.json"
const SCHEDULES_PATH = "content/schedules.json"
function monthPath(month: MonthKey) {
  return `content/results/${month}.json`
}

const DEFAULT_RESULT_FIELDS = [
  "disawar",
  "newDisawar",
  "taj",
  "delhiNoon",
  "gali",
  "ghaziabad",
  "faridabad",
  "haridwar",
]

export async function getSiteContent(): Promise<SiteContent> {
  const now = new Date().toISOString()
  const c = await getJSON<SiteContent>(CONTENT_PATH)
  if (c) {
    // ensure categories exists for older payloads
    if (!c.categories) {
      c.categories = [
        { key: "disawar", label: "DESAWAR", showInToday: true },
        { key: "newDisawar", label: "NEW DESAWAR", showInToday: true },
        { key: "taj", label: "TAJ", showInToday: true },
        { key: "delhiNoon", label: "DELHI NOON", showInToday: true },
        { key: "gali", label: "GALI", showInToday: true },
        { key: "ghaziabad", label: "GHAZIABAD", showInToday: true },
        { key: "faridabad", label: "FARIDABAD", showInToday: true },
        { key: "haridwar", label: "HARIDWAR", showInToday: true },
      ]
    }
    return c
  }
  const initial: SiteContent = {
    banners: [
      {
        id: crypto.randomUUID(),
        text: "Direct disawar company — honesty first. Whatsapp for secure play.",
        kind: "warning",
      },
      { id: crypto.randomUUID(), text: "Welcome to Satta King. Play responsibly. Avoid fraud. ✅✅✅", kind: "info" },
    ],
    headerHighlight: { enabled: false },
    ads: [
      {
        id: crypto.randomUUID(),
        title: "Sample Ad",
        imageUrl: "/sample-casino-banner.jpg",
        href: "#",
        active: true,
        createdAt: now,
      },
    ],
    categories: [
      { key: "disawar", label: "DESAWAR", showInToday: true },
      { key: "newDisawar", label: "NEW DESAWAR", showInToday: true },
      { key: "taj", label: "TAJ", showInToday: true },
      { key: "delhiNoon", label: "DELHI NOON", showInToday: true },
      { key: "gali", label: "GALI", showInToday: true },
      { key: "ghaziabad", label: "GHAZIABAD", showInToday: true },
      { key: "faridabad", label: "FARIDABAD", showInToday: true },
      { key: "haridwar", label: "HARIDWAR", showInToday: true },
    ],
    updatedAt: now,
  }
  await putJSON(CONTENT_PATH, initial)
  await appendActivity({ action: "bootstrap_site_content", meta: { path: CONTENT_PATH } })
  return initial
}

export async function saveSiteContent(content: SiteContent) {
  content.updatedAt = new Date().toISOString()
  await putJSON(CONTENT_PATH, content)
  await appendActivity({ action: "save_site_content", meta: { updatedAt: content.updatedAt } })
}

export async function appendActivity(entry: Omit<ActivityEntry, "id" | "at" | "by"> & { by?: string }) {
  const existing = (await getJSON<ActivityEntry[]>(ACTIVITY_PATH)) ?? []
  const log: ActivityEntry = {
    id: crypto.randomUUID(),
    action: entry.action,
    by: entry.by ?? "admin",
    at: new Date().toISOString(),
    meta: entry.meta,
  }
  existing.unshift(log)
  await putJSON(ACTIVITY_PATH, existing.slice(0, 1000))
}

export async function getActivity(): Promise<ActivityEntry[]> {
  return (await getJSON<ActivityEntry[]>(ACTIVITY_PATH)) ?? []
}

export async function getSchedules(): Promise<ScheduleItem[]> {
  const s = await getJSON<ScheduleItem[]>(SCHEDULES_PATH)
  if (s) return s
  await putJSON(SCHEDULES_PATH, [])
  await appendActivity({ action: "bootstrap_schedules", meta: { path: SCHEDULES_PATH } })
  return []
}

export async function saveSchedules(items: ScheduleItem[]) {
  await putJSON(SCHEDULES_PATH, items)
}

export async function runDueSchedules() {
  const items = await getSchedules()
  const now = Date.now()
  const remaining: ScheduleItem[] = []
  for (const it of items) {
    const due = Date.parse(it.publishAt) <= now
    if (!due) {
      remaining.push(it)
      continue
    }
    await upsertResultRow(it.month, it.row, !!it.merge)
    await appendActivity({
      action: "publish_scheduled",
      meta: { scheduleId: it.id, month: it.month, date: it.row.date },
    })
  }
  if (remaining.length !== items.length) await saveSchedules(remaining)
}

export async function getMonthlyResults(month: MonthKey): Promise<MonthlyResults | null> {
  const existing = await getJSON<MonthlyResults>(monthPath(month))
  if (existing) return existing
  const seed: MonthlyResults = {
    month,
    fields: [...DEFAULT_RESULT_FIELDS],
    rows: [],
    updatedAt: new Date().toISOString(),
  }
  await putJSON(monthPath(month), seed)
  await appendActivity({ action: "bootstrap_month", meta: { month } })
  return seed
}

export async function saveMonthlyResults(data: MonthlyResults) {
  data.updatedAt = new Date().toISOString()
  await putJSON(monthPath(data.month), data)
  await appendActivity({ action: "save_month", meta: { month: data.month, rows: data.rows.length } })
}

export async function upsertResultRow(month: MonthKey, row: ResultRow, merge = false) {
  const existing = (await getMonthlyResults(month)) ?? {
    month,
    fields: [],
    rows: [],
    updatedAt: new Date().toISOString(),
  }
  // track dynamic fields
  for (const k of Object.keys(row)) {
    if (k !== "date" && !existing.fields.includes(k)) existing.fields.push(k)
  }
  const idx = existing.rows.findIndex((r) => r.date === row.date)
  if (idx === -1) existing.rows.push(row)
  else existing.rows[idx] = merge ? { ...existing.rows[idx], ...row } : row
  existing.rows.sort((a, b) => a.date.localeCompare(b.date))
  await saveMonthlyResults(existing)
}
