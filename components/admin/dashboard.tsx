"use client"

import type React from "react"
import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import type { SiteContent, BannerBlock, AdItem, ScheduleItem, ResultRow, MonthKey } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Field, FieldSet, FieldLegend, FieldContent, FieldDescription, FieldSeparator } from "@/components/ui/field"

const fetcher = (u: string) => fetch(u, { cache: "no-store", credentials: "include" }).then((r) => r.json())

type ContentPayload = { content: SiteContent }

const EMPTY_CONTENT: SiteContent = {
  banners: [],
  headerHighlight: { enabled: false },
  ads: [],
  categories: [],
  updatedAt: "",
}

export default function AdminDashboard() {
  const { data, mutate } = useSWR<ContentPayload>("/api/admin/content", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    dedupingInterval: 10_000, // Prevent duplicate requests
  })
  const content = (data?.content ?? EMPTY_CONTENT) as SiteContent

  const [active, setActive] = useState<"ads" | "banners" | "categories" | "schedule" | "scheduled" | "header-image" | "footer-note">("ads")
  const [adsDraft, setAdsDraft] = useState(content.ads ?? [])
  const [categoriesDraft, setCategoriesDraft] = useState(content.categories ?? [])
  const [bannerText, setBannerText] = useState("")
  const [bannerColor, setBannerColor] = useState("#000000")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data?.content?.ads) setAdsDraft(data.content.ads)
  }, [data?.content?.ads])
  useEffect(() => {
    if (data?.content?.categories) setCategoriesDraft(data.content.categories)
  }, [data?.content?.categories])

  async function persist(next: SiteContent) {
    setIsSaving(true)
    try {
      mutate({ content: next }, { revalidate: false })
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      if (!res.ok) {
        alert("Failed to save content")
      } else {
        const json = (await res.json()) as ContentPayload
        mutate(json, { revalidate: false })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Ads
  async function uploadAd(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return
    const fd = new FormData()
    fd.set("file", e.target.files[0])
    const r = await fetch("/api/blob/upload", { method: "POST", body: fd })
    const j = await r.json()
    if (j?.url) {
      const ad: AdItem = {
        id: crypto.randomUUID(),
        title: "New Ad",
        imageUrl: j.url,
        href: "",
        active: true,
        createdAt: new Date().toISOString(),
      }
      setAdsDraft((prev) => [ad, ...prev])
    }
    e.target.value = ""
  }

  const patchAdDraft = (id: string, patch: Partial<AdItem>) =>
    setAdsDraft((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const removeAdDraft = (id: string) => setAdsDraft((prev) => prev.filter((a) => a.id !== id))
  const saveAds = () => persist({ ...content, ads: adsDraft })

  // Categories helpers
  const [catKey, setCatKey] = useState("")
  const [catLabel, setCatLabel] = useState("")

  const addCategory = () => {
    if (!catKey.trim() || !catLabel.trim()) return
    const exists = (categoriesDraft ?? []).some((c) => c.key === catKey.trim())
    if (exists) return alert("Key must be unique")
    setCategoriesDraft([{ key: catKey.trim(), label: catLabel.trim() }, ...(categoriesDraft ?? [])])
    setCatKey("")
    setCatLabel("")
  }

  const updateCategoryDraft = (key: string, patch: { label?: string }) =>
    setCategoriesDraft((prev) => (prev ?? []).map((c) => (c.key === key ? { ...c, ...patch } : c)))
  const removeCategoryDraft = (key: string) => setCategoriesDraft((prev) => (prev ?? []).filter((c) => c.key !== key))

  const saveCategories = () => persist({ ...content, categories: categoriesDraft })

  // Schedule
  const cats = content.categories ?? []
  const [schedCat, setSchedCat] = useState(cats[0]?.key || "")
  const [schedValue, setSchedValue] = useState("")
  const [schedDate, setSchedDate] = useState("")
  const [schedTime, setSchedTime] = useState("10:00")

  useEffect(() => {
    if (!schedCat && (content.categories?.length ?? 0) > 0) {
      setSchedCat(content.categories![0]!.key)
    }
  }, [content.categories])

  function normalizeDateInput(input: string): string | null {
    // Accept "YYYY-MM-DD" or "DD/MM/YYYY" and return "YYYY-MM-DD"
    if (!input) return null
    const t = input.trim()
    // already ISO date from <input type="date">
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
    // common locale format "DD/MM/YYYY"
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) {
      const [dd, mm, yyyy] = t.split("/")
      return `${yyyy}-${mm}-${dd}`
    }
    return null
  }

  function normalizeTimeInput(input: string): string | null {
    // Accept "HH:mm" (24h) or "h:mm AM/PM" and return "HH:mm" (24h)
    if (!input) return null
    const t = input.trim().toUpperCase()
    // 24h
    if (/^\d{2}:\d{2}$/.test(t)) return t
    // 12h "h:mm AM" or "hh:mm PM"
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
    if (m) {
      let hh = Number.parseInt(m[1], 10)
      const mm = m[2]
      const ap = m[3]
      if (ap === "AM") {
        if (hh === 12) hh = 0
      } else if (ap === "PM") {
        if (hh !== 12) hh += 12
      }
      return `${String(hh).padStart(2, "0")}:${mm}`
    }
    return null
  }

  // Helper functions for schedule validation
  function isFutureISO(iso: string) {
    try {
      const ts = Date.parse(iso)
      if (Number.isNaN(ts)) return false
      return ts > Date.now()
    } catch {
      return false
    }
  }
  function toIntOrNull(v: string | number | null | undefined) {
    if (v === null || v === undefined) return null
    const n = typeof v === "number" ? v : Number.parseInt(String(v).trim(), 10)
    return Number.isFinite(n) ? n : null
  }

  async function addSchedule() {
    if (!schedCat) {
      alert("Please choose a Field Key (category).")
      return
    }

    const val = toIntOrNull(schedValue as any)
    if (val === null) {
      alert("Value must be a number.")
      return
    }

    if (!schedDate) {
      alert("Please choose a date.")
      return
    }

    const safeDate = normalizeDateInput(schedDate)
    const safeTime = normalizeTimeInput(schedTime)
    if (!safeDate || !safeTime) {
      alert("Invalid date/time. Please select a valid date and time.")
      return
    }

    // Combine to local Date then convert to ISO; reject past datetimes
    const local = new Date(`${safeDate}T${safeTime}:00`)
    const publishAt = local.toISOString()
    if (!isFutureISO(publishAt)) {
      alert("You cannot schedule for a past date/time.")
      return
    }

    const [y, m] = safeDate.split("-")
    const month = `${y}-${m}` as MonthKey
    const row: ResultRow = { date: safeDate, [schedCat]: String(val) }

    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", item: { month, row, publishAt } }),
      })
      const j = await res.json().catch(() => ({}))

      if (res.status === 401) {
        alert("Your admin session has expired. Please log in again from /admin/login.")
        return
      }
      if (!res.ok) {
        alert(j?.error || `Failed to save schedule (${res.status}).`)
        return
      }
      await schedMutate()
      setSchedValue("")
      setActive("scheduled") // jump user to the Scheduled list
    } catch (err: any) {
      alert(`Network error while saving schedule: ${err?.message || "unknown error"}`)
    }
  }


  // Scheduled list + search
  const { data: schedData, mutate: schedMutate } = useSWR<{ items: ScheduleItem[] }>("/api/admin/schedules", fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    dedupingInterval: 5_000, // Prevent duplicate requests
  })

  // Removed console.log for performance

  const [search, setSearch] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editCat, setEditCat] = useState("")
  const [editValue, setEditValue] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("10:00")

  const scheduled = useMemo(() => {
    const items = (schedData?.items ?? []).slice().sort((a, b) => {
      return Date.parse(b.publishAt) - Date.parse(a.publishAt)
    })
    const q = search.trim().toLowerCase()
    return !q
      ? items
      : items.filter((i) => {
          const v = JSON.stringify(i).toLowerCase()
          return v.includes(q)
        })
  }, [schedData, search]) ?? []

  function startEdit(it: ScheduleItem) {
    setEditId(it.id)
    const k = Object.keys(it.row).find((x) => x !== "date") || ""
    setEditCat(k)
    setEditValue(k ? it.row[k] || "" : "")
    setEditDate(it.row.date)
    const dt = new Date(it.publishAt)
    const hh = `${dt.getHours()}`.padStart(2, "0")
    const mm = `${dt.getMinutes()}`.padStart(2, "0")
    setEditTime(`${hh}:${mm}`)
  }

  function cancelEdit() {
    setEditId(null)
    setEditCat("")
    setEditValue("")
    setEditDate("")
    setEditTime("10:00")
  }

  async function saveEdit(it: ScheduleItem) {
    if (!editId || !editCat || !editValue || !editDate) return
    const safeDate = normalizeDateInput(editDate)
    const safeTime = normalizeTimeInput(editTime)
    if (!safeDate || !safeTime) {
      alert("Invalid date/time for edit. Please use a valid date and time.")
      return
    }
    const intVal = Number.parseInt(String(editValue).trim(), 10)
    if (!Number.isFinite(intVal)) {
      alert("Value must be a number.")
      return
    }
    const publishAt = new Date(`${safeDate}T${safeTime}:00`).toISOString()
    const [y, m] = safeDate.split("-")
    const month = `${y}-${m}` as MonthKey
    const row: ResultRow = { date: safeDate, [editCat]: String(intVal) }
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", item: { id: editId, month, row, publishAt } }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) {
        alert(j?.error || `Failed to update schedule (${res.status})`)
        return
      }
      cancelEdit()
      await schedMutate()
    } catch (err: any) {
      alert(`Network error while updating schedule: ${err?.message || "unknown error"}`)
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Are you sure you want to delete this schedule?")) return
    
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) {
        alert(j?.error || `Failed to delete schedule (${res.status})`)
        return
      }
      await schedMutate()
    } catch (err: any) {
      alert(`Network error while deleting schedule: ${err?.message || "unknown error"}`)
    }
  }

  const addBanner = () => {
    if (!bannerText.trim()) return
    const banner: BannerBlock = {
      id: crypto.randomUUID(),
      text: bannerText,
      color: bannerColor,
    }
    const nextContent = { ...content, banners: [...(content.banners ?? []), banner] }
    persist(nextContent)
    setBannerText("")
    setBannerColor("#000000")
  }

  const removeBanner = (id: string) => {
    const nextContent = { ...content, banners: (content.banners ?? []).filter((b) => b.id !== id) }
    persist(nextContent)
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-[220px_1fr] min-h-dvh">
      <aside className="border-b md:border-b-0 md:border-r bg-white text-black p-2 sm:p-3">
        <div className="text-xs font-semibold mb-2">Admin</div>
        <nav className="grid grid-cols-2 md:grid-cols-1 gap-1 text-xs">
          {(["ads", "banners", "categories", "schedule", "scheduled", "header-image", "footer-note"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              className={`text-left px-2 h-8 rounded border transition-colors ${
                active === k ? "bg-neutral-100" : "hover:bg-neutral-50"
              }`}
            >
              {k === "ads" && "Ads"}
              {k === "banners" && "Banners"}
              {k === "categories" && "Categories"}
              {k === "schedule" && "Schedule"}
              {k === "scheduled" && "Scheduled"}
              {k === "header-image" && "Header Image"}
              {k === "footer-note" && "Footer Note"}
            </button>
          ))}
        </nav>
      </aside>

      <section className="p-3 sm:p-5 bg-white text-black">
        {/* ADS */}
        {active === "ads" && (
          <FieldSet className="max-w-4xl">
            <FieldLegend>Advertisements</FieldLegend>
            <Field>
              <Label>Upload Image</Label>
              <FieldContent>
                <Input type="file" accept="image/*" onChange={uploadAd} />
                <FieldDescription>Upload creates a new ad draft. Click "Save Changes" to publish.</FieldDescription>
              </FieldContent>
            </Field>
            <div className="mt-2">
              <Button 
                onClick={saveAds} 
                variant="secondary"
                disabled={isSaving}
                className={isSaving ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            <FieldSeparator>Existing Ads</FieldSeparator>
            <div className="grid gap-4">
              {(adsDraft ?? []).map((ad) => (
                <div key={ad.id} className="border rounded p-3 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Field>
                      <Label>Title</Label>
                      <FieldContent>
                        <Input value={ad.title} onChange={(e) => patchAdDraft(ad.id, { title: e.target.value })} />
                      </FieldContent>
                    </Field>
                    <Field>
                      <Label>Link</Label>
                      <FieldContent>
                        <Input value={ad.href ?? ""} onChange={(e) => patchAdDraft(ad.id, { href: e.target.value })} />
                      </FieldContent>
                    </Field>
                    <Field className="flex items-center gap-2">
                      <Label>Active</Label>
                      <Switch checked={ad.active} onCheckedChange={(v) => patchAdDraft(ad.id, { active: !!v })} />
                    </Field>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={() => removeAdDraft(ad.id)}>
                        Remove (draft)
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <img
                      src={ad.imageUrl || "/placeholder.svg"}
                      alt={ad.title}
                      className="max-h-40 rounded border"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              ))}
            </div>
          </FieldSet>
        )}

        {/* BANNERS */}
        {active === "banners" && (
          <FieldSet className="max-w-3xl">
            <FieldLegend>Add Banner</FieldLegend>
            <div className="grid gap-3 items-end sm:grid-cols-[1fr_120px]">
              <Field>
                <Label>Banner Text</Label>
                <FieldContent>
                  <Input
                    required
                    aria-required="true"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Button onClick={addBanner} disabled={!bannerText.trim()}>
                Add
              </Button>
            </div>
            <FieldSeparator>Existing Banners</FieldSeparator>
            <div className="grid gap-3">
              {(content.banners ?? []).map((b) => (
                <div key={b.id} className="border rounded p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{b.text}</div>
                  </div>
                  <Button variant="destructive" onClick={() => removeBanner(b.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </FieldSet>
        )}

        {/* CATEGORIES */}
        {active === "categories" && (
          <FieldSet className="max-w-3xl">
            <FieldLegend>Categories</FieldLegend>
            <FieldDescription>
              Key = machine name (e.g., ghaziabad). Label = what users see (e.g., GHAZIABAD). Changes are saved only
              when you click Update Categories.
            </FieldDescription>
            <div className="grid gap-3 items-end mt-2 sm:grid-cols-[200px_1fr_120px]">
              <Field>
                <Label>Key</Label>
                <FieldContent>
                  <Input
                    required
                    aria-required="true"
                    value={catKey}
                    onChange={(e) => setCatKey(e.target.value)}
                    placeholder="e.g., ghaziabad"
                  />
                </FieldContent>
              </Field>
              <Field>
                <Label>Label</Label>
                <FieldContent>
                  <Input
                    required
                    aria-required="true"
                    value={catLabel}
                    onChange={(e) => setCatLabel(e.target.value)}
                    placeholder="e.g., GHAZIABAD"
                  />
                </FieldContent>
              </Field>
              <Button onClick={addCategory} disabled={!catKey.trim() || !catLabel.trim()}>
                Add
              </Button>
            </div>
            <div className="mt-3">
              <Button 
                variant="secondary" 
                onClick={saveCategories}
                disabled={isSaving}
                className={isSaving ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isSaving ? "Saving..." : "Update Categories"}
              </Button>
            </div>
            <FieldSeparator>Existing</FieldSeparator>
            <div className="grid gap-3">
              {(categoriesDraft ?? []).map((c) => (
                <div key={c.key} className="border rounded p-3 grid gap-3 items-center sm:grid-cols-[1fr_120px]">
                  <Field>
                    <Label>Label</Label>
                    <FieldContent>
                      <Input value={c.label} onChange={(e) => updateCategoryDraft(c.key, { label: e.target.value })} />
                    </FieldContent>
                  </Field>
                  <Button variant="destructive" onClick={() => removeCategoryDraft(c.key)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </FieldSet>
        )}

        {/* SCHEDULE */}
        {active === "schedule" && (
          <FieldSet className="max-w-3xl">
            <FieldLegend>Create Schedule</FieldLegend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <Label>Field Key</Label>
                <FieldContent>
                  <select
                    className="h-9 w-full rounded border px-2"
                    required
                    aria-required="true"
                    value={schedCat}
                    onChange={(e) => setSchedCat(e.target.value)}
                  >
                    {(content.categories ?? []).map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({c.key})
                      </option>
                    ))}
                  </select>
                  <FieldDescription>Choose from Categories. Only these keys are valid.</FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <Label>Value</Label>
                <FieldContent>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={0}
                    required
                    aria-required="true"
                    value={schedValue}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "")
                      setSchedValue(v)
                    }}
                  />
                </FieldContent>
              </Field>
              <Field>
                <Label>Date</Label>
                <FieldContent>
                  <Input
                    type="date"
                    required
                    aria-required="true"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                  />
                </FieldContent>
              </Field>
              <Field>
                <Label>Time</Label>
                <FieldContent>
                  <Input
                    type="time"
                    required
                    aria-required="true"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                  />
                </FieldContent>
              </Field>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Button onClick={addSchedule} disabled={!schedCat || !schedValue || !schedDate}>
                Add Schedule
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  if (!confirm("This will force execute ALL scheduled items immediately, regardless of their date/time. This action cannot be undone. Continue?")) {
                    return
                  }
                  
                  try {
                    const res = await fetch("/api/admin/schedules", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ action: "force-run" }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      schedMutate()
                      alert(`Force executed ${data.executed} scheduled items successfully!`)
                    } else {
                      alert("Failed to force execute schedules")
                    }
                  } catch (error) {
                    console.error("Error force executing schedules:", error)
                    alert("Error force executing schedules")
                  }
                }}
                className="text-xs sm:text-sm"
              >
                Run Due Now (Force)
              </Button>
            </div>
          </FieldSet>
        )}

        {/* SCHEDULED LIST */}
        {active === "scheduled" && (
          <FieldSet className="max-w-4xl">
            <FieldLegend>Scheduled Results</FieldLegend>
            <Field>
              <Label>Search</Label>
              <FieldContent>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="name, number, category, date…"
                />
              </FieldContent>
            </Field>
            <div className="mt-3 grid gap-2">
              {(scheduled || []).map((it) => {
                const due = Date.parse(it.publishAt) <= Date.now()
                const isEditing = editId === it.id
                const isExecuted = it.executed || false
                return (
                  <div key={it.id} className="border rounded p-3 flex flex-col gap-3">
                    {!isEditing ? (
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <div className="font-medium">
                            {Object.keys(it.row)
                              .filter((k) => k !== "date")
                              .map((k) => `${k}: ${it.row[k]}`)
                              .join(", ")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Date {it.row.date} • Month {it.month} • Publish {new Date(it.publishAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              isExecuted 
                                ? "bg-green-100 text-green-900" 
                                : due 
                                  ? "bg-yellow-100 text-yellow-900" 
                                  : "bg-blue-100 text-blue-900"
                            }`}
                          >
                            {isExecuted ? "Published" : due ? "Due / Unpublished" : "Scheduled"}
                          </span>
                          <Button size="sm" variant="secondary" onClick={() => startEdit(it)}>
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => deleteSchedule(it.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
                        <div className="md:col-span-2">
                          <Label>Field Key</Label>
                          <select
                            className="h-9 w-full rounded border px-2"
                            value={editCat}
                            onChange={(e) => setEditCat(e.target.value)}
                          >
                            {(content.categories ?? []).map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label} ({c.key})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Value</Label>
                          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                        </div>
                        <div>
                          <Label>Date</Label>
                          <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                        </div>
                        <div>
                          <Label>Time</Label>
                          <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                        </div>
                        <div className="md:col-span-5 flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(it)}>
                            Save
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {!scheduled?.length && <div className="text-xs text-muted-foreground">No schedules.</div>}
            </div>
          </FieldSet>
        )}

        {/* HEADER IMAGE */}
        {active === "header-image" && (
          <FieldSet className="max-w-4xl">
            <FieldLegend>Header Image</FieldLegend>
            <Field>
              <Label>Current Header Image</Label>
              <FieldContent>
                {content.headerImage?.imageUrl ? (
                  <div className="space-y-3">
                    <img 
                      src={content.headerImage.imageUrl} 
                      alt={content.headerImage.alt || "Header Image"}
                      className="max-w-full sm:max-w-md h-auto rounded border"
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={content.headerImage?.active || false}
                        onCheckedChange={(checked) => {
                          const nextContent = {
                            ...content,
                            headerImage: {
                              ...content.headerImage!,
                              active: checked
                            }
                          }
                          persist(nextContent)
                        }}
                      />
                      <Label className="text-sm">Show on website</Label>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No header image set</div>
                )}
              </FieldContent>
            </Field>
            <Field>
              <Label>Upload New Header Image</Label>
              <FieldContent>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    const formData = new FormData()
                    formData.append("file", file)
                    
                    try {
                      const res = await fetch("/api/blob/upload", {
                        method: "POST",
                        body: formData,
                        credentials: "include",
                      })
                      const { url } = await res.json()
                      
                      const nextContent = {
                        ...content,
                        headerImage: {
                          id: crypto.randomUUID(),
                          imageUrl: url,
                          alt: "Header Image",
                          active: true
                        }
                      }
                      await persist(nextContent)
                    } catch (error) {
                      console.error("Upload failed:", error)
                    }
                  }}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </FieldContent>
            </Field>
          </FieldSet>
        )}

        {/* FOOTER NOTE */}
        {active === "footer-note" && (
          <FieldSet className="max-w-4xl">
            <FieldLegend>Footer Note</FieldLegend>
            <Field>
              <Label>Footer Text</Label>
              <FieldContent>
                <textarea
                  value={content.footerNote?.text || ""}
                  onChange={(e) => {
                    const nextContent = {
                      ...content,
                      footerNote: {
                        text: e.target.value,
                        active: content.footerNote?.active || false
                      }
                    }
                    persist(nextContent)
                  }}
                  placeholder="Enter footer text..."
                  className="w-full min-h-[120px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                />
              </FieldContent>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={content.footerNote?.active || false}
                  onCheckedChange={(checked) => {
                    const nextContent = {
                      ...content,
                      footerNote: {
                        text: content.footerNote?.text || "",
                        active: checked
                      }
                    }
                    persist(nextContent)
                  }}
                />
                <Label className="text-sm">Show on website</Label>
              </div>
            </Field>
          </FieldSet>
        )}
      </section>
    </div>
  )
}
