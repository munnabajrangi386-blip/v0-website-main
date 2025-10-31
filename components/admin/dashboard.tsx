"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import type { SiteContent, BannerBlock, AdItem, ScheduleItem, ResultRow, MonthKey, TextColumn, TextColumnLine, LiveSchedule } from "@/lib/types"
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
    dedupingInterval: 10_000,
  })
  
  const content = (data?.content ?? EMPTY_CONTENT) as SiteContent
  
  // Debug logging
  useEffect(() => {
    if (data?.content) {
      // Admin dashboard data loaded successfully
    }
  }, [data?.content])
  const [active, setActive] = useState<"ads" | "banners" | "banner2" | "banner3" | "footer-banner" | "categories" | "schedule" | "scheduled" | "header-image" | "footer-note" | "running-banner" | "text-columns" | "live-schedules">("ads")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [adsDraft, setAdsDraft] = useState(content.ads ?? [])
  const [categoriesDraft, setCategoriesDraft] = useState(content.categories ?? [])
  const [bannerText, setBannerText] = useState("")
  const [bannerColor, setBannerColor] = useState("#000000")
  const [bannerCompleteRow, setBannerCompleteRow] = useState(false)
  const [bannerBackgroundColor, setBannerBackgroundColor] = useState("#dc2626")
  const [bannerMultiColor, setBannerMultiColor] = useState(false)
  const [bannerBold, setBannerBold] = useState(false)
  const [bannerGifUrl, setBannerGifUrl] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [customColorPalette, setCustomColorPalette] = useState<string[]>([]) // Store custom color palette
  
  // Banner2 state variables
  const [banner2Text, setBanner2Text] = useState("")
  const [banner2Color, setBanner2Color] = useState("#000000")
  const [banner2CompleteRow, setBanner2CompleteRow] = useState(false)
  const [banner2BackgroundColor, setBanner2BackgroundColor] = useState("#dc2626")
  const [banner2MultiColor, setBanner2MultiColor] = useState(false)
  const [banner2Bold, setBanner2Bold] = useState(false)
  const [banner2GifUrl, setBanner2GifUrl] = useState("")
  const [customColorPalette2, setCustomColorPalette2] = useState<string[]>([]) // Store custom color palette for banner2

  // Banner3 state
  const [banner3Text, setBanner3Text] = useState("")
  const [banner3Color, setBanner3Color] = useState("#000000")
  const [banner3CompleteRow, setBanner3CompleteRow] = useState(false)
  const [banner3BackgroundColor, setBanner3BackgroundColor] = useState("#f3f4f6")
  const [banner3MultiColor, setBanner3MultiColor] = useState(false)
  const [banner3Bold, setBanner3Bold] = useState(false)
  const [banner3GifUrl, setBanner3GifUrl] = useState("")
  const [customColorPalette3, setCustomColorPalette3] = useState<string[]>([]) // Store custom color palette for banner3

  // Footer Banner state
  const [footerBannerText, setFooterBannerText] = useState("")
  const [footerBannerColor, setFooterBannerColor] = useState("#000000")
  const [footerBannerCompleteRow, setFooterBannerCompleteRow] = useState(false)
  const [footerBannerBackgroundColor, setFooterBannerBackgroundColor] = useState("#f3f4f6")
  const [footerBannerMultiColor, setFooterBannerMultiColor] = useState(false)
  const [footerBannerBold, setFooterBannerBold] = useState(false)
  const [footerBannerGifUrl, setFooterBannerGifUrl] = useState("")
  const [customColorPaletteFooter, setCustomColorPaletteFooter] = useState<string[]>([]) // Store custom color palette for footer banner
  
  // Live Schedules state
  const [liveSchedules, setLiveSchedules] = useState<LiveSchedule[]>([])
  const [newScheduleCategory, setNewScheduleCategory] = useState("GHAZIABAD1")
  const [newScheduleTime, setNewScheduleTime] = useState("")
  const [newScheduleResult, setNewScheduleResult] = useState("")
  const [newScheduleYesterdayResult, setNewScheduleYesterdayResult] = useState("")
  
  // Category editing state
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryLabel, setEditCategoryLabel] = useState("")
  const [editCategoryDefaultTime, setEditCategoryDefaultTime] = useState("")

  const [editingBanner, setEditingBanner] = useState<BannerBlock | null>(null)
  const [editingBanner2, setEditingBanner2] = useState<BannerBlock | null>(null)
  const [editingBanner3, setEditingBanner3] = useState<BannerBlock | null>(null)
  const [editingFooterBanner, setEditingFooterBanner] = useState<BannerBlock | null>(null)

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
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      
      if (!response.ok) {
        alert("Failed to save content")
        return
      }
      
      const result = await response.json() as ContentPayload
      mutate(result, { revalidate: false })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Save error:", error)
      alert("Failed to save content")
    } finally {
      setIsSaving(false)
    }
  }

  async function uploadAd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      const formData = new FormData()
      formData.set("file", file)
      const response = await fetch("/api/blob/upload", { method: "POST", body: formData })
      const result = await response.json()
      
      if (result?.url) {
        const ad: AdItem = {
          id: crypto.randomUUID(),
          title: "New Ad",
          imageUrl: result.url,
          href: "",
          active: true,
          createdAt: new Date().toISOString(),
        }
        setAdsDraft(prev => [ad, ...prev])
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to upload image")
    } finally {
      e.target.value = ""
    }
  }

  const patchAdDraft = (id: string, patch: Partial<AdItem>) =>
    setAdsDraft((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const removeAdDraft = (id: string) => setAdsDraft((prev) => prev.filter((a) => a.id !== id))
  const saveAds = () => persist({ ...content, ads: adsDraft })

  // Categories helpers
  const [catKey, setCatKey] = useState("")
  const [catLabel, setCatLabel] = useState("")
  const [catDefaultTime, setCatDefaultTime] = useState("")

  const addCategory = () => {
    if (!catKey.trim() || !catLabel.trim()) return
    const exists = (categoriesDraft ?? []).some((c) => c.key === catKey.trim())
    if (exists) return alert("Key must be unique")
    setCategoriesDraft([{ 
      key: catKey.trim(), 
      label: catLabel.trim(),
      defaultTime: catDefaultTime || undefined
    }, ...(categoriesDraft ?? [])])
    setCatKey("")
    setCatLabel("")
    setCatDefaultTime("")
  }

  const updateCategoryDraft = (key: string, patch: { label?: string; defaultTime?: string }) =>
    setCategoriesDraft((prev) => (prev ?? []).map((c) => (c.key === key ? { ...c, ...patch } : c)))
  const removeCategoryDraft = (key: string) => setCategoriesDraft((prev) => (prev ?? []).filter((c) => c.key !== key))

  const saveCategories = () => persist({ ...content, categories: categoriesDraft })

  // Category editing functions
  const startEditCategory = (category: any) => {
    setEditingCategory(category.key)
    setEditCategoryLabel(category.label)
    setEditCategoryDefaultTime(category.defaultTime || "")
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setEditCategoryLabel("")
    setEditCategoryDefaultTime("")
  }

  const saveEditCategory = () => {
    if (!editingCategory) return
    
    updateCategoryDraft(editingCategory, {
      label: editCategoryLabel,
      defaultTime: editCategoryDefaultTime || undefined
    })
    
    cancelEditCategory()
  }

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
      // Stay on the same page after adding schedule
    } catch (err: any) {
      alert(`Network error while saving schedule: ${err?.message || "unknown error"}`)
    }
  }


  // Scheduled list + search - refresh every 10 seconds to catch executed schedules
  const { data: schedData, mutate: schedMutate } = useSWR<{ items: ScheduleItem[] }>("/api/admin/schedules", fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
    revalidateOnFocus: true, // Refresh when window regains focus
    dedupingInterval: 5_000, // Prevent duplicate requests
  })

  // Performance optimized

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

  // Live Schedule functions
  async function loadLiveSchedules() {
    try {
      const response = await fetch("/api/admin/live-schedules", { credentials: "include" })
      const data = await response.json()
      if (response.ok) {
        setLiveSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error("Error loading live schedules:", error)
    }
  }

  async function addLiveSchedule() {
    if (!newScheduleCategory || !newScheduleTime || !newScheduleResult) {
      alert("Please fill in all required fields")
      return
    }

    // Create ISO datetime for today with the specified time
    const today = new Date()
    const [hours, minutes] = newScheduleTime.split(':').map(Number)
    const scheduledTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
    
    // Check if the time is in the future
    if (scheduledTime <= new Date()) {
      alert("Scheduled time must be in the future")
      return
    }

    try {
      const response = await fetch("/api/admin/live-schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          schedule: {
            category: newScheduleCategory,
            scheduledTime: scheduledTime.toISOString(),
            result: newScheduleResult,
            yesterdayResult: newScheduleYesterdayResult || undefined,
            todayResult: newScheduleResult,
            status: "scheduled"
          }
        })
      })

      const data = await response.json()
      if (response.ok) {
        await loadLiveSchedules()
        setNewScheduleCategory("GHAZIABAD1")
        setNewScheduleTime("")
        setNewScheduleResult("")
        setNewScheduleYesterdayResult("")
        alert("Live schedule added successfully!")
      } else {
        alert(data.error || "Failed to add live schedule")
      }
    } catch (error) {
      console.error("Error adding live schedule:", error)
      alert("Failed to add live schedule")
    }
  }

  async function deleteLiveSchedule(id: string) {
    if (!confirm("Are you sure you want to delete this live schedule?")) return

    try {
      const response = await fetch("/api/admin/live-schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id })
      })

      const data = await response.json()
      if (response.ok) {
        await loadLiveSchedules()
        alert("Live schedule deleted successfully!")
      } else {
        alert(data.error || "Failed to delete live schedule")
      }
    } catch (error) {
      console.error("Error deleting live schedule:", error)
      alert("Failed to delete live schedule")
    }
  }

  async function publishLiveSchedule(id: string) {
    try {
      const response = await fetch("/api/admin/live-schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id })
      })

      const data = await response.json()
      if (response.ok) {
        await loadLiveSchedules()
        alert("Live schedule published successfully!")
      } else {
        alert(data.error || "Failed to publish live schedule")
      }
    } catch (error) {
      console.error("Error publishing live schedule:", error)
      alert("Failed to publish live schedule")
    }
  }

  // Load live schedules when component mounts and when active tab changes
  useEffect(() => {
    if (active === "live-schedules") {
      loadLiveSchedules()
    }
  }, [active])

  const addBanner = () => {
    if (!bannerText.trim()) return
    const banner: BannerBlock = {
      id: crypto.randomUUID(),
      text: bannerText,
      color: bannerColor,
      completeRow: bannerCompleteRow,
      backgroundColor: bannerBackgroundColor,
      multiColor: bannerMultiColor,
      bold: bannerBold,
      gifUrl: bannerGifUrl.trim() || undefined, // Add GIF URL
      customColorPalette: customColorPalette.length > 0 ? customColorPalette : undefined, // Add custom palette
      kind: "info" // Default kind
    }
    const nextContent = { ...content, banners: [...(content.banners ?? []), banner] }
    persist(nextContent)
    setBannerText("")
    setBannerColor("#000000")
    setBannerCompleteRow(false)
    setBannerBackgroundColor("#dc2626")
    setBannerMultiColor(false)
    setBannerBold(false)
    setBannerGifUrl("") // Reset GIF URL
    setCustomColorPalette([]) // Reset custom palette
  }

  const removeBanner = (id: string) => {
    const nextContent = { ...content, banners: (content.banners ?? []).filter((b) => b.id !== id) }
    persist(nextContent)
  }

  const startEditBanner = (banner: BannerBlock) => {
    setEditingBanner(banner)
    setEditBannerText(banner.text)
    setEditBannerColor(banner.color || "#000000")
    setEditBannerCompleteRow(banner.completeRow || false)
    setEditBannerBackgroundColor(banner.backgroundColor || "#dc2626")
    setEditBannerMultiColor(banner.multiColor || false)
    setEditBannerBold(banner.bold || false)
    setEditBannerGifUrl(banner.gifUrl || "") // Load existing GIF URL
    setCustomColorPalette(banner.customColorPalette || []) // Load existing custom palette
  }

  const cancelEditBanner = () => {
    setEditingBanner(null)
    setEditBannerText("")
    setEditBannerColor("#000000")
    setEditBannerCompleteRow(false)
    setEditBannerBackgroundColor("#dc2626")
    setEditBannerMultiColor(false)
    setEditBannerBold(false)
    setEditBannerGifUrl("") // Reset GIF URL
    setCustomColorPalette([]) // Reset custom palette
  }

  const saveEditBanner = () => {
    if (!editingBanner || !editBannerText.trim()) return
    
    const updatedBanner: BannerBlock = {
      ...editingBanner,
      text: editBannerText,
      color: editBannerColor,
      completeRow: editBannerCompleteRow,
      backgroundColor: editBannerBackgroundColor,
      multiColor: editBannerMultiColor,
      bold: editBannerBold,
      gifUrl: editBannerGifUrl.trim() || undefined, // Add GIF URL
      customColorPalette: customColorPalette.length > 0 ? customColorPalette : editingBanner.customColorPalette
    }
    
    const nextContent = {
      ...content,
      banners: (content.banners ?? []).map(b => 
        b.id === editingBanner.id ? updatedBanner : b
      )
    }
    persist(nextContent)
    cancelEditBanner()
  }

  // Banner2 functions
  const addBanner2 = () => {
    if (!banner2Text.trim()) return
    const banner: BannerBlock = {
      id: crypto.randomUUID(),
      text: banner2Text,
      color: banner2Color,
      completeRow: banner2CompleteRow,
      backgroundColor: banner2BackgroundColor,
      multiColor: banner2MultiColor,
      bold: banner2Bold,
      gifUrl: banner2GifUrl.trim() || undefined,
      customColorPalette: customColorPalette2.length > 0 ? customColorPalette2 : undefined,
      kind: "info"
    }
    const nextContent = { ...content, banner2: [...(content.banner2 ?? []), banner] }
    persist(nextContent)
    setBanner2Text("")
    setBanner2Color("#000000")
    setBanner2CompleteRow(false)
    setBanner2BackgroundColor("#dc2626")
    setBanner2MultiColor(false)
    setBanner2Bold(false)
    setBanner2GifUrl("")
    setCustomColorPalette2([])
  }

  const removeBanner2 = (id: string) => {
    const nextContent = { ...content, banner2: (content.banner2 ?? []).filter((b) => b.id !== id) }
    persist(nextContent)
  }

  const startEditBanner2 = (banner: BannerBlock) => {
    setEditingBanner2(banner)
    setEditBanner2Text(banner.text)
    setEditBanner2Color(banner.color || "#000000")
    setEditBanner2CompleteRow(banner.completeRow || false)
    setEditBanner2BackgroundColor(banner.backgroundColor || "#dc2626")
    setEditBanner2MultiColor(banner.multiColor || false)
    setEditBanner2Bold(banner.bold || false)
    setEditBanner2GifUrl(banner.gifUrl || "")
    setCustomColorPalette2(banner.customColorPalette || [])
  }

  const cancelEditBanner2 = () => {
    setEditingBanner2(null)
    setEditBanner2Text("")
    setEditBanner2Color("#000000")
    setEditBanner2CompleteRow(false)
    setEditBanner2BackgroundColor("#dc2626")
    setEditBanner2MultiColor(false)
    setEditBanner2Bold(false)
    setEditBanner2GifUrl("")
    setCustomColorPalette2([])
  }

  const saveEditBanner2 = () => {
    if (!editingBanner2 || !editBanner2Text.trim()) return
    
    const updatedBanner: BannerBlock = {
      ...editingBanner2,
      text: editBanner2Text,
      color: editBanner2Color,
      completeRow: editBanner2CompleteRow,
      backgroundColor: editBanner2BackgroundColor,
      multiColor: editBanner2MultiColor,
      bold: editBanner2Bold,
      gifUrl: editBanner2GifUrl.trim() || undefined,
      customColorPalette: customColorPalette2.length > 0 ? customColorPalette2 : editingBanner2.customColorPalette
    }
    
    const nextContent = {
      ...content,
      banner2: (content.banner2 ?? []).map(b => 
        b.id === editingBanner2.id ? updatedBanner : b
      )
    }
    persist(nextContent)
    cancelEditBanner2()
  }

  // Banner3 functions
  const addBanner3 = () => {
    if (!banner3Text.trim()) return
    const banner: BannerBlock = {
      id: crypto.randomUUID(),
      text: banner3Text,
      color: banner3Color,
      completeRow: banner3CompleteRow,
      backgroundColor: banner3BackgroundColor,
      multiColor: banner3MultiColor,
      bold: banner3Bold,
      gifUrl: banner3GifUrl.trim() || undefined,
      customColorPalette: customColorPalette3.length > 0 ? customColorPalette3 : undefined
    }
    
    const nextContent = {
      ...content,
      banner3: [banner, ...(content.banner3 ?? [])]
    }
    persist(nextContent)
    setBanner3Text("")
    setBanner3Color("#000000")
    setBanner3CompleteRow(false)
    setBanner3BackgroundColor("#f3f4f6")
    setBanner3MultiColor(false)
    setBanner3Bold(false)
    setBanner3GifUrl("")
    setCustomColorPalette3([])
  }

  const removeBanner3 = (id: string) => {
    const nextContent = {
      ...content,
      banner3: (content.banner3 ?? []).filter(b => b.id !== id)
    }
    persist(nextContent)
  }

  const startEditBanner3 = (banner: BannerBlock) => {
    setEditingBanner3(banner)
    setEditBanner3Text(banner.text)
    setEditBanner3Color(banner.color || "#000000")
    setEditBanner3CompleteRow(banner.completeRow || false)
    setEditBanner3BackgroundColor(banner.backgroundColor || "#f3f4f6")
    setEditBanner3MultiColor(banner.multiColor || false)
    setEditBanner3Bold(banner.bold || false)
    setEditBanner3GifUrl(banner.gifUrl || "")
    setEditCustomColorPalette3(banner.customColorPalette || [])
  }

  const cancelEditBanner3 = () => {
    setEditingBanner3(null)
    setEditBanner3Text("")
    setEditBanner3Color("#000000")
    setEditBanner3CompleteRow(false)
    setEditBanner3BackgroundColor("#f3f4f6")
    setEditBanner3MultiColor(false)
    setEditBanner3Bold(false)
    setEditBanner3GifUrl("")
    setCustomColorPalette3([])
  }

  const saveEditBanner3 = () => {
    if (!editingBanner3 || !editBanner3Text.trim()) return
    
    const updatedBanner: BannerBlock = {
      ...editingBanner3,
      text: editBanner3Text,
      color: editBanner3Color,
      completeRow: editBanner3CompleteRow,
      backgroundColor: editBanner3BackgroundColor,
      multiColor: editBanner3MultiColor,
      bold: editBanner3Bold,
      gifUrl: editBanner3GifUrl.trim() || undefined,
      customColorPalette: customColorPalette3.length > 0 ? customColorPalette3 : editingBanner3.customColorPalette
    }
    
    const nextContent = {
      ...content,
      banner3: (content.banner3 ?? []).map(b => 
        b.id === editingBanner3.id ? updatedBanner : b
      )
    }
    persist(nextContent)
    cancelEditBanner3()
  }

  // Footer Banner functions
  const addFooterBanner = () => {
    if (!footerBannerText.trim()) return
    const banner: BannerBlock = {
      id: crypto.randomUUID(),
      text: footerBannerText,
      color: footerBannerColor,
      completeRow: footerBannerCompleteRow,
      backgroundColor: footerBannerBackgroundColor,
      multiColor: footerBannerMultiColor,
      bold: footerBannerBold,
      gifUrl: footerBannerGifUrl.trim() || undefined,
      customColorPalette: customColorPaletteFooter.length > 0 ? customColorPaletteFooter : undefined
    }
    
    const nextContent = {
      ...content,
      footerBanner: [banner, ...(content.footerBanner ?? [])]
    }
    persist(nextContent)
    setFooterBannerText("")
    setFooterBannerColor("#000000")
    setFooterBannerCompleteRow(false)
    setFooterBannerBackgroundColor("#f3f4f6")
    setFooterBannerMultiColor(false)
    setFooterBannerBold(false)
    setFooterBannerGifUrl("")
    setCustomColorPaletteFooter([])
  }

  const removeFooterBanner = (id: string) => {
    const nextContent = {
      ...content,
      footerBanner: (content.footerBanner ?? []).filter(b => b.id !== id)
    }
    persist(nextContent)
  }

  const startEditFooterBanner = (banner: BannerBlock) => {
    setEditingFooterBanner(banner)
    setEditFooterBannerText(banner.text)
    setEditFooterBannerColor(banner.color || "#000000")
    setEditFooterBannerCompleteRow(banner.completeRow || false)
    setEditFooterBannerBackgroundColor(banner.backgroundColor || "#f3f4f6")
    setEditFooterBannerMultiColor(banner.multiColor || false)
    setEditFooterBannerBold(banner.bold || false)
    setEditFooterBannerGifUrl(banner.gifUrl || "")
    setEditCustomColorPaletteFooter(banner.customColorPalette || [])
  }

  const cancelEditFooterBanner = () => {
    setEditingFooterBanner(null)
    setEditFooterBannerText("")
    setEditFooterBannerColor("#000000")
    setEditFooterBannerCompleteRow(false)
    setEditFooterBannerBackgroundColor("#f3f4f6")
    setEditFooterBannerMultiColor(false)
    setEditFooterBannerBold(false)
    setEditFooterBannerGifUrl("")
    setEditCustomColorPaletteFooter([])
  }

  const saveEditFooterBanner = () => {
    if (!editingFooterBanner || !editFooterBannerText.trim()) return
    
    const updatedBanner: BannerBlock = {
      ...editingFooterBanner,
      text: editFooterBannerText,
      color: editFooterBannerColor,
      completeRow: editFooterBannerCompleteRow,
      backgroundColor: editFooterBannerBackgroundColor,
      multiColor: editFooterBannerMultiColor,
      bold: editFooterBannerBold,
      gifUrl: editFooterBannerGifUrl.trim() || undefined,
      customColorPalette: editCustomColorPaletteFooter.length > 0 ? editCustomColorPaletteFooter : editingFooterBanner.customColorPalette
    }
    
    const nextContent = {
      ...content,
      footerBanner: (content.footerBanner ?? []).map(b => 
        b.id === editingFooterBanner.id ? updatedBanner : b
      )
    }
    persist(nextContent)
    cancelEditFooterBanner()
  }

  const saveScraperConfig = () => {
    const nextContent = {
      ...content,
      scraperConfig: {
        useFastScraper,
        fastScraperUrl,
        originalScraperUrl
      }
    }
    persist(nextContent)
  }

  // Footer Banner edit modal fields
  const [editFooterBannerText, setEditFooterBannerText] = useState("")
  const [editFooterBannerColor, setEditFooterBannerColor] = useState("#000000")
  const [editFooterBannerCompleteRow, setEditFooterBannerCompleteRow] = useState(false)
  const [editFooterBannerBackgroundColor, setEditFooterBannerBackgroundColor] = useState("#f3f4f6")
  const [editFooterBannerMultiColor, setEditFooterBannerMultiColor] = useState(false)
  const [editFooterBannerBold, setEditFooterBannerBold] = useState(false)
  const [editFooterBannerGifUrl, setEditFooterBannerGifUrl] = useState("")
  const [editCustomColorPaletteFooter, setEditCustomColorPaletteFooter] = useState<string[]>([])

  // ... after banner state variables
  const [editBannerText, setEditBannerText] = useState("")
  const [editBannerColor, setEditBannerColor] = useState("#000000")
  const [editBannerCompleteRow, setEditBannerCompleteRow] = useState(false)
  const [editBannerBackgroundColor, setEditBannerBackgroundColor] = useState("#dc2626")
  const [editBannerMultiColor, setEditBannerMultiColor] = useState(false)
  const [editBannerBold, setEditBannerBold] = useState(false)
  const [editBannerGifUrl, setEditBannerGifUrl] = useState("")

  // Banner2 edit fields
  const [editBanner2Text, setEditBanner2Text] = useState("")
  const [editBanner2Color, setEditBanner2Color] = useState("#000000")
  const [editBanner2CompleteRow, setEditBanner2CompleteRow] = useState(false)
  const [editBanner2BackgroundColor, setEditBanner2BackgroundColor] = useState("#dc2626")
  const [editBanner2MultiColor, setEditBanner2MultiColor] = useState(false)
  const [editBanner2Bold, setEditBanner2Bold] = useState(false)
  const [editBanner2GifUrl, setEditBanner2GifUrl] = useState("")

  // Banner3 edit fields
  const [editBanner3Text, setEditBanner3Text] = useState("")
  const [editBanner3Color, setEditBanner3Color] = useState("#000000")
  const [editBanner3CompleteRow, setEditBanner3CompleteRow] = useState(false)
  const [editBanner3BackgroundColor, setEditBanner3BackgroundColor] = useState("#dc2626")
  const [editBanner3MultiColor, setEditBanner3MultiColor] = useState(false)
  const [editBanner3Bold, setEditBanner3Bold] = useState(false)
  const [editBanner3GifUrl, setEditBanner3GifUrl] = useState("")

  // ... after Banner edit fields
  const [editCustomColorPalette, setEditCustomColorPalette] = useState<string[]>([])
  // ... after Banner2 edit fields
  const [editCustomColorPalette2, setEditCustomColorPalette2] = useState<string[]>([])
  // ... after Banner3 edit fields
  const [editCustomColorPalette3, setEditCustomColorPalette3] = useState<string[]>([])

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Left Sidebar - Compact */}
      <aside className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 p-4 transition-transform duration-300 ease-in-out overflow-y-auto`}>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
          <p className="text-xs text-gray-500">Manage your website content</p>
        </div>
        
        <nav className="space-y-2 mb-6">
                 {(["ads", "banners", "banner2", "banner3", "footer-banner", "categories", "schedule", "scheduled", "header-image", "footer-note", "running-banner", "text-columns", "live-schedules"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setActive(k)
                setMobileMenuOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active === k 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {k === "ads" && "📢 Ads"}
              {k === "banners" && "🎯 Banners"}
              {k === "banner2" && "🎯 Banner2"}
              {k === "banner3" && "🎯 Banner3"}
              {k === "footer-banner" && "🎯 Footer Banner"}
              {k === "categories" && "📊 Categories"}
              {k === "schedule" && "⏰ Schedule"}
              {k === "scheduled" && "📅 Past Results"}
              {k === "header-image" && "🖼️ Header Image"}
              {k === "footer-note" && "📝 Footer Note"}
                     {k === "running-banner" && "🏃 Running Banner"}
                     {k === "text-columns" && "📝 Text Columns"}
                     {k === "live-schedules" && "⏰ Live Schedules"}
            </button>
          ))}
        </nav>
        
        {/* Quick Stats - Compact */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs font-semibold text-gray-600 mb-2">Quick Stats</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Ads: {(adsDraft ?? []).length}</div>
            <div>Banners: {(content.banners ?? []).length}</div>
            <div>Categories: {(categoriesDraft ?? []).length}</div>
            <div>Past Results: {(schedData?.items ?? []).length}</div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area - Properly Sized */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 bg-gray-50 overflow-auto mt-12 lg:mt-0">
        {/* ADS */}
        {active === "ads" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
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
          </div>
        )}

        {/* BANNERS */}
        {active === "banners" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Add Banner</FieldLegend>
            
            {/* Banner Text */}
              <Field>
                <Label>Banner Text</Label>
                <FieldContent>
                <textarea
                    required
                    aria-required="true"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                  placeholder="Enter banner text... Press Enter for new lines"
                  className="w-full min-h-[80px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                  rows={3}
                  />
                </FieldContent>
              <FieldDescription>
                Press Enter to create line breaks in your banner text
              </FieldDescription>
              </Field>

            {/* Complete Row Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={bannerCompleteRow}
                  onCheckedChange={setBannerCompleteRow}
                />
                <Label className="text-sm">Complete Row (Full Width)</Label>
              </div>
              <FieldDescription>
                When enabled, banner will span the full width of the section. When disabled, it will appear as a button.
              </FieldDescription>
            </Field>

            {/* Background Color Selection */}
            <Field>
              <Label>Background Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={bannerBackgroundColor}
                    onChange={(e) => setBannerBackgroundColor(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={bannerBackgroundColor}
                    onChange={(e) => setBannerBackgroundColor(e.target.value)}
                    placeholder="#dc2626"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Text Color Selection */}
            <Field>
              <Label>Text Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={bannerColor}
                    onChange={(e) => setBannerColor(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={bannerColor}
                    onChange={(e) => setBannerColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

                   {/* Multi-Color Text Toggle */}
                   <Field>
                     <div className="flex items-center gap-2">
                       <Switch
                         checked={bannerMultiColor}
                         onCheckedChange={setBannerMultiColor}
                       />
                       <Label className="text-sm">Multi-Color Text (Auto Rainbow)</Label>
                     </div>
                     <FieldDescription>
                       When enabled, text will automatically use multiple colors for visual appeal.
                     </FieldDescription>
                   </Field>

                   {/* Refresh Colors Button */}
                   {bannerMultiColor && (
                     <Field>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           // Generate new random colors for better visibility
                           const newColors = [
                             '#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffd700',
                             '#adff2f', '#32cd32', '#00ff7f', '#00ced1', '#1e90ff',
                             '#4169e1', '#8a2be2', '#ff1493', '#dc143c', '#b22222',
                             '#8b0000', '#006400', '#000080', '#800080', '#ff6347'
                           ]
                           // Shuffle the colors array
                           const shuffledColors = newColors.sort(() => Math.random() - 0.5)
                           setCustomColorPalette(shuffledColors)
                           // New color palette generated
                           alert(`New color palette generated! Colors will be applied when you save the banner.`)
                         }}
                         className="w-full"
                       >
                         🎨 Refresh Color Palette
                       </Button>
                       <FieldDescription>
                         Click to generate new random colors for better visibility on different backgrounds.
                       </FieldDescription>
                     </Field>
                   )}

            {/* Bold Text Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={bannerBold}
                  onCheckedChange={setBannerBold}
                />
                <Label className="text-sm">Bold Text</Label>
              </div>
              <FieldDescription>
                When enabled, banner text will be displayed in bold.
              </FieldDescription>
            </Field>

            {/* GIF URL Input */}
            <Field>
              <Label>GIF URL (Optional)</Label>
              <FieldContent>
                <Input
                  value={bannerGifUrl}
                  onChange={(e) => setBannerGifUrl(e.target.value)}
                  placeholder="https://media.giphy.com/media/..."
                  className="w-full"
                />
              </FieldContent>
              <FieldDescription>
                Add a GIF URL to display a small animated image next to the banner text.
              </FieldDescription>
            </Field>

            {/* Add Button */}
            <div className="flex justify-end">
              <Button onClick={addBanner} disabled={!bannerText.trim()}>
                Add Banner
              </Button>
            </div>

            <FieldSeparator>Existing Banners ({content.banners?.length || 0} total)</FieldSeparator>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Text Preview
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Background
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Text Color
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GIF
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const banners = content.banners ?? []
                    // Rendering banners table
                    return banners
                  })().map((b, index) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div 
                          className="max-w-xs text-ellipsis overflow-hidden leading-tight" 
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.2',
                            maxHeight: '2.4em'
                          }}
                          title={b.text}
                        >
                          {b.text}
                  </div>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          b.completeRow 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {b.completeRow ? "Full Width Row" : "Button"}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border" 
                            style={{ backgroundColor: b.backgroundColor || "#dc2626" }}
                          ></div>
                          <span className="text-xs font-mono">{b.backgroundColor || "#dc2626"}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border" 
                            style={{ backgroundColor: b.color || "#000000" }}
                          ></div>
                          <span className="text-xs font-mono">{b.color || "#000000"}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        {b.gifUrl ? (
                          <img 
                            src={b.gifUrl} 
                            alt="Banner GIF" 
                            className="w-6 h-6 object-cover rounded"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No GIF</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => startEditBanner(b)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => removeBanner(b.id)}
                          >
                    Remove
                  </Button>
                </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => {
                    setIsSaving(true)
                    setTimeout(() => {
                      setIsSaving(false)
                      setLastSaved(new Date())
                    }, 1000)
                  }}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? "Saving..." : "Save All Changes"}
                </Button>
                {lastSaved && (
                  <span className="text-xs text-gray-500">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BANNER2 */}
        {active === "banner2" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Add Banner2</FieldLegend>
            
            {/* Banner Text */}
            <Field>
              <Label>Banner Text</Label>
              <FieldContent>
                <textarea
                  required
                  aria-required="true"
                  value={banner2Text}
                  onChange={(e) => setBanner2Text(e.target.value)}
                  placeholder="Enter banner text... Press Enter for new lines"
                  className="w-full min-h-[80px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                  rows={3}
                />
              </FieldContent>
              <FieldDescription>
                Press Enter to create line breaks in your banner text
              </FieldDescription>
            </Field>

            {/* Complete Row Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={banner2CompleteRow}
                  onCheckedChange={setBanner2CompleteRow}
                />
                <Label className="text-sm">Complete Row (Full Width)</Label>
              </div>
              <FieldDescription>
                When enabled, banner will span the full width of the section. When disabled, it will appear as a button.
              </FieldDescription>
            </Field>

            {/* Background Color Selection */}
            <Field>
              <Label>Background Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={banner2BackgroundColor}
                    onChange={(e) => setBanner2BackgroundColor(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={banner2BackgroundColor}
                    onChange={(e) => setBanner2BackgroundColor(e.target.value)}
                    placeholder="#dc2626"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Text Color Selection */}
            <Field>
              <Label>Text Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={banner2Color}
                    onChange={(e) => setBanner2Color(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={banner2Color}
                    onChange={(e) => setBanner2Color(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Multi-Color Text Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={banner2MultiColor}
                  onCheckedChange={setBanner2MultiColor}
                />
                <Label className="text-sm">Multi-Color Text (Auto Rainbow)</Label>
              </div>
              <FieldDescription>
                When enabled, text will automatically use multiple colors for visual appeal.
              </FieldDescription>
            </Field>

            {/* Refresh Colors Button */}
            {banner2MultiColor && (
              <Field>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Generate new random colors for better visibility
                    const newColors = [
                      '#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffd700',
                      '#adff2f', '#32cd32', '#00ff7f', '#00ced1', '#1e90ff',
                      '#4169e1', '#8a2be2', '#ff1493', '#dc143c', '#b22222',
                      '#8b0000', '#006400', '#000080', '#800080', '#ff6347'
                    ]
                    // Shuffle the colors array
                    const shuffledColors = newColors.sort(() => Math.random() - 0.5)
                    setCustomColorPalette2(shuffledColors)
                    console.log('🎨 New color palette for banner2 stored:', shuffledColors)
                    alert(`New color palette generated! Colors will be applied when you save the banner.`)
                  }}
                  className="w-full"
                >
                  🎨 Refresh Color Palette
                </Button>
                <FieldDescription>
                  Click to generate new random colors for better visibility on different backgrounds.
                </FieldDescription>
              </Field>
            )}

            {/* Bold Text Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={banner2Bold}
                  onCheckedChange={setBanner2Bold}
                />
                <Label className="text-sm">Bold Text</Label>
              </div>
              <FieldDescription>
                When enabled, banner text will be displayed in bold.
              </FieldDescription>
            </Field>

            {/* GIF URL Input */}
            <Field>
              <Label>GIF URL (Optional)</Label>
              <FieldContent>
                <Input
                  value={banner2GifUrl}
                  onChange={(e) => setBanner2GifUrl(e.target.value)}
                  placeholder="https://media.giphy.com/media/..."
                  className="w-full"
                />
              </FieldContent>
              <FieldDescription>
                Add a GIF URL to display a small animated image next to the banner text.
              </FieldDescription>
            </Field>

            {/* Add Button */}
            <div className="flex justify-end">
              <Button onClick={addBanner2} disabled={!banner2Text.trim()}>
                Add Banner2
              </Button>
            </div>

            <FieldSeparator>Existing Banner2 ({content.banner2?.length || 0} total)</FieldSeparator>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Text Preview
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Background
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Text Color
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GIF
                    </th>
                    <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(content.banner2 ?? []).map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div 
                          className="max-w-xs text-ellipsis overflow-hidden leading-tight" 
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.2',
                            maxHeight: '2.4em'
                          }}
                          title={b.text}
                        >
                          {b.text}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          b.completeRow 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {b.completeRow ? "Full Width Row" : "Button"}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border" 
                            style={{ backgroundColor: b.backgroundColor || "#dc2626" }}
                          ></div>
                          <span className="text-xs font-mono">{b.backgroundColor || "#dc2626"}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border" 
                            style={{ backgroundColor: b.color || "#000000" }}
                          ></div>
                          <span className="text-xs font-mono">{b.color || "#000000"}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        {b.gifUrl ? (
                          <img 
                            src={b.gifUrl} 
                            alt="Banner GIF" 
                            className="w-6 h-6 object-cover rounded"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No GIF</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => startEditBanner2(b)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => removeBanner2(b.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Button 
                  onClick={() => {
                    setIsSaving(true)
                    setTimeout(() => {
                      setIsSaving(false)
                      setLastSaved(new Date())
                    }, 1000)
                  }}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? "Saving..." : "Save All Changes"}
                </Button>
                {lastSaved && (
                  <span className="text-xs text-gray-500">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BANNER3 */}
        {active === "banner3" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Add Banner3</FieldLegend>
            
            {/* Banner Text */}
            <Field>
              <Label>Banner Text</Label>
              <FieldContent>
                <textarea
                  required
                  aria-required="true"
                  value={banner3Text}
                  onChange={(e) => setBanner3Text(e.target.value)}
                  placeholder="Enter banner text... Press Enter for new lines"
                  className="w-full min-h-[80px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                  rows={3}
                />
              </FieldContent>
            </Field>

            {/* Complete Row Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={banner3CompleteRow}
                  onCheckedChange={setBanner3CompleteRow}
                />
                <Label className="text-sm">Complete Row (Full Width)</Label>
              </div>
              <FieldDescription>
                When enabled, banner will span the full width of the section. When disabled, it will appear as a button.
              </FieldDescription>
            </Field>

            {/* Background Color */}
            <Field>
              <Label>Background Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={banner3BackgroundColor}
                    onChange={(e) => setBanner3BackgroundColor(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={banner3BackgroundColor}
                    onChange={(e) => setBanner3BackgroundColor(e.target.value)}
                    placeholder="#f3f4f6"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Text Color */}
            <Field>
              <Label>Text Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={banner3Color}
                    onChange={(e) => setBanner3Color(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={banner3Color}
                    onChange={(e) => setBanner3Color(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Multi-Color Text Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={banner3MultiColor}
                  onCheckedChange={setBanner3MultiColor}
                />
                <Label className="text-sm">Multi-Color Text (Auto Rainbow)</Label>
              </div>
              <FieldDescription>
                When enabled, text will automatically use multiple colors for visual appeal.
              </FieldDescription>
            </Field>

            {/* Refresh Color Palette Button */}
            {banner3MultiColor && (
              <Field>
                <Button
                  type="button"
                  onClick={() => {
                    const colors = [
                      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
                      "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
                    ]
                    setCustomColorPalette3(colors)
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Refresh Color Palette
                </Button>
                <FieldDescription>
                  Click to generate new random colors for better visibility.
                </FieldDescription>
              </Field>
            )}

            {/* Bold Text Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={banner3Bold}
                  onCheckedChange={setBanner3Bold}
                />
                <Label className="text-sm">Bold Text</Label>
              </div>
              <FieldDescription>
                When enabled, banner text will be displayed in bold.
              </FieldDescription>
            </Field>

            {/* GIF URL Input */}
            <Field>
              <Label>GIF URL (Optional)</Label>
              <FieldContent>
                <Input
                  value={banner3GifUrl}
                  onChange={(e) => setBanner3GifUrl(e.target.value)}
                  placeholder="https://media.giphy.com/media/..."
                  className="w-full"
                />
              </FieldContent>
            </Field>

            {/* Add Button */}
            <div className="flex gap-2">
              <Button onClick={addBanner3} disabled={!banner3Text.trim()}>
                Add Banner3
              </Button>
            </div>

            {/* Banner3 List */}
            <div className="mt-6">
              <FieldLegend>Existing Banner3 ({(content.banner3 || []).length} total)</FieldLegend>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 bg-white">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">TEXT PREVIEW</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">TYPE</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">BACKGROUND</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">TEXT COLOR</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">GIF</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(content.banner3 || []).map((banner) => (
                      <tr key={banner.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={banner.text}>
                            {banner.text.length > 50 ? `${banner.text.substring(0, 50)}...` : banner.text}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            banner.completeRow 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {banner.completeRow ? 'Full Width Row' : 'Button'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 border border-gray-300 rounded"
                              style={{ backgroundColor: banner.backgroundColor || '#f3f4f6' }}
                            ></div>
                            <span className="text-xs font-mono text-gray-600">
                              {banner.backgroundColor || '#f3f4f6'}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 border border-gray-300 rounded"
                              style={{ backgroundColor: banner.color || '#000000' }}
                            ></div>
                            <span className="text-xs font-mono text-gray-600">
                              {banner.color || '#000000'}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-500">
                          {banner.gifUrl ? 'Has GIF' : 'No GIF'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditBanner3(banner)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeBanner3(banner.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Banner3 Edit Modal */}
            {editingBanner3 && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-3 sm:p-4 md:p-6 w-full max-w-md mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Edit Banner3</h3>
                  
                  <Field>
                    <Label>Banner Text</Label>
                    <FieldContent>
                      <textarea
                        value={editBanner3Text}
                        onChange={(e) => setEditBanner3Text(e.target.value)}
                        placeholder="Enter banner text..."
                        className="w-full min-h-[80px] p-2 border rounded-md resize-vertical"
                        rows={3}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editBanner3CompleteRow}
                        onCheckedChange={setEditBanner3CompleteRow}
                      />
                      <Label className="text-sm">Complete Row (Full Width)</Label>
                    </div>
                  </Field>

                  <Field>
                    <Label>Background Color</Label>
                    <FieldContent>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editBanner3BackgroundColor}
                          onChange={(e) => setEditBanner3BackgroundColor(e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={editBanner3BackgroundColor}
                          onChange={(e) => setEditBanner3BackgroundColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </FieldContent>
                  </Field>

                  <Field>
                    <Label>Text Color</Label>
                    <FieldContent>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editBanner3Color}
                          onChange={(e) => setEditBanner3Color(e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={editBanner3Color}
                          onChange={(e) => setEditBanner3Color(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </FieldContent>
                  </Field>

                  <Field>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editBanner3MultiColor}
                        onCheckedChange={setEditBanner3MultiColor}
                      />
                      <Label className="text-sm">Multi-Color Text</Label>
                    </div>
                  </Field>

                  <Field>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editBanner3Bold}
                        onCheckedChange={setEditBanner3Bold}
                      />
                      <Label className="text-sm">Bold Text</Label>
                    </div>
                  </Field>

                  <Field>
                    <Label>GIF URL (Optional)</Label>
                    <FieldContent>
                      <Input
                        value={editBanner3GifUrl}
                        onChange={(e) => setEditBanner3GifUrl(e.target.value)}
                        placeholder="https://media.giphy.com/media/..."
                        className="w-full"
                      />
                    </FieldContent>
                  </Field>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={saveEditBanner3}>Save</Button>
                    <Button variant="outline" onClick={cancelEditBanner3}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FOOTER BANNER */}
        {active === "footer-banner" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Add Footer Banner</FieldLegend>
            
            {/* Banner Text */}
            <Field>
              <Label>Banner Text</Label>
              <FieldContent>
                <textarea
                  required
                  aria-required="true"
                  value={footerBannerText}
                  onChange={(e) => setFooterBannerText(e.target.value)}
                  placeholder="Enter banner text... Press Enter for new lines"
                  className="w-full min-h-[80px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                  rows={3}
                />
              </FieldContent>
            </Field>

            {/* Complete Row Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={footerBannerCompleteRow}
                  onCheckedChange={setFooterBannerCompleteRow}
                />
                <Label className="text-sm">Complete Row (Full Width)</Label>
              </div>
              <FieldDescription>
                When enabled, banner will span the full width of the section. When disabled, it will appear as a button.
              </FieldDescription>
            </Field>

            {/* Background Color */}
            <Field>
              <Label>Background Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={footerBannerBackgroundColor}
                    onChange={(e) => setFooterBannerBackgroundColor(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={footerBannerBackgroundColor}
                    onChange={(e) => setFooterBannerBackgroundColor(e.target.value)}
                    placeholder="#f3f4f6"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Text Color */}
            <Field>
              <Label>Text Color</Label>
              <FieldContent>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={footerBannerColor}
                    onChange={(e) => setFooterBannerColor(e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={footerBannerColor}
                    onChange={(e) => setFooterBannerColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Multi-Color Text Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={footerBannerMultiColor}
                  onCheckedChange={setFooterBannerMultiColor}
                />
                <Label className="text-sm">Multi-Color Text (Auto Rainbow)</Label>
              </div>
              <FieldDescription>
                When enabled, text will automatically use multiple colors for visual appeal.
              </FieldDescription>
            </Field>

            {/* Refresh Color Palette Button */}
            {footerBannerMultiColor && (
              <Field>
                <Button
                  type="button"
                  onClick={() => {
                    const colors = [
                      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
                      "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
                    ]
                    setCustomColorPaletteFooter(colors)
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Refresh Color Palette
                </Button>
                <FieldDescription>
                  Click to generate new random colors for better visibility.
                </FieldDescription>
              </Field>
            )}

            {/* Bold Text Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={footerBannerBold}
                  onCheckedChange={setFooterBannerBold}
                />
                <Label className="text-sm">Bold Text</Label>
              </div>
              <FieldDescription>
                When enabled, banner text will be displayed in bold.
              </FieldDescription>
            </Field>

            {/* GIF URL Input */}
            <Field>
              <Label>GIF URL (Optional)</Label>
              <FieldContent>
                <Input
                  value={footerBannerGifUrl}
                  onChange={(e) => setFooterBannerGifUrl(e.target.value)}
                  placeholder="https://media.giphy.com/media/..."
                  className="w-full"
                />
              </FieldContent>
            </Field>

            {/* Add Button */}
            <div className="flex gap-2">
              <Button onClick={addFooterBanner} disabled={!footerBannerText.trim()}>
                Add Footer Banner
              </Button>
            </div>

            {/* Footer Banner List */}
            <div className="mt-6">
              <FieldLegend>Existing Footer Banner ({(content.footerBanner || []).length} total)</FieldLegend>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 bg-white">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">TEXT PREVIEW</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">TYPE</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">BACKGROUND</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">TEXT COLOR</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">GIF</th>
                      <th className="border border-gray-300 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm font-medium text-gray-700">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(content.footerBanner || []).map((banner) => (
                      <tr key={banner.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={banner.text}>
                            {banner.text.length > 50 ? `${banner.text.substring(0, 50)}...` : banner.text}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            banner.completeRow 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {banner.completeRow ? 'Full Width Row' : 'Button'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 border border-gray-300 rounded"
                              style={{ backgroundColor: banner.backgroundColor || '#f3f4f6' }}
                            ></div>
                            <span className="text-xs font-mono text-gray-600">
                              {banner.backgroundColor || '#f3f4f6'}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 border border-gray-300 rounded"
                              style={{ backgroundColor: banner.color || '#000000' }}
                            ></div>
                            <span className="text-xs font-mono text-gray-600">
                              {banner.color || '#000000'}
                            </span>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-gray-500">
                          {banner.gifUrl ? 'Has GIF' : 'No GIF'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditFooterBanner(banner)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFooterBanner(banner.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Banner Edit Modal */}
            {editingFooterBanner && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-3 sm:p-4 md:p-6 w-full max-w-md mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold mb-4">Edit Footer Banner</h3>
                  
                  <Field>
                    <Label>Banner Text</Label>
                    <FieldContent>
                      <textarea
                        value={editFooterBannerText}
                        onChange={(e) => setEditFooterBannerText(e.target.value)}
                        placeholder="Enter banner text..."
                        className="w-full min-h-[80px] p-2 border rounded-md resize-vertical"
                        rows={3}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editFooterBannerCompleteRow}
                        onCheckedChange={setEditFooterBannerCompleteRow}
                      />
                      <Label className="text-sm">Complete Row (Full Width)</Label>
                    </div>
                  </Field>

                  <Field>
                    <Label>Background Color</Label>
                    <FieldContent>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editFooterBannerBackgroundColor}
                          onChange={(e) => setEditFooterBannerBackgroundColor(e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={editFooterBannerBackgroundColor}
                          onChange={(e) => setEditFooterBannerBackgroundColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </FieldContent>
                  </Field>

                  <Field>
                    <Label>Text Color</Label>
                    <FieldContent>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editFooterBannerColor}
                          onChange={(e) => setEditFooterBannerColor(e.target.value)}
                          className="w-16 h-10 p-1 border rounded"
                        />
                        <Input
                          value={editFooterBannerColor}
                          onChange={(e) => setEditFooterBannerColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </FieldContent>
                  </Field>

                  <Field>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editFooterBannerMultiColor}
                        onCheckedChange={setEditFooterBannerMultiColor}
                      />
                      <Label className="text-sm">Multi-Color Text</Label>
                    </div>
                  </Field>

                  <Field>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editFooterBannerBold}
                        onCheckedChange={setEditFooterBannerBold}
                      />
                      <Label className="text-sm">Bold Text</Label>
                    </div>
                  </Field>

                  <Field>
                    <Label>GIF URL (Optional)</Label>
                    <FieldContent>
                      <Input
                        value={editFooterBannerGifUrl}
                        onChange={(e) => setEditFooterBannerGifUrl(e.target.value)}
                        placeholder="https://media.giphy.com/media/..."
                        className="w-full"
                      />
                    </FieldContent>
                  </Field>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={saveEditFooterBanner}>Save</Button>
                    <Button variant="outline" onClick={cancelEditFooterBanner}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES */}
        {active === "categories" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Categories Management</FieldLegend>
            <FieldDescription>
              Manage categories with default times. Key = machine name (e.g., ghaziabad). Label = what users see (e.g., GHAZIABAD). 
              Default Time = when results are typically published (e.g., 15:59 for 3:59 PM).
            </FieldDescription>
            
            {/* Add New Category */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
              <div className="grid gap-3 items-end sm:grid-cols-[200px_1fr_120px_120px]">
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
                <Field>
                  <Label>Default Time</Label>
                  <FieldContent>
                    <Input
                      type="time"
                      value={catDefaultTime}
                      onChange={(e) => setCatDefaultTime(e.target.value)}
                      placeholder="15:59"
                  />
                </FieldContent>
              </Field>
              <Button onClick={addCategory} disabled={!catKey.trim() || !catLabel.trim()}>
                Add
              </Button>
            </div>
            </div>

            {/* Save Button */}
            <div className="mb-6">
              <Button 
                variant="secondary" 
                onClick={saveCategories}
                disabled={isSaving}
                className={isSaving ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isSaving ? "Saving..." : "Update Categories"}
              </Button>
            </div>

            {/* Existing Categories */}
            <FieldSeparator>Existing Categories</FieldSeparator>
            <div className="space-y-4">
              {(categoriesDraft ?? []).map((c) => (
                <div key={c.key} className="border rounded-lg p-4 bg-gray-50">
                  {editingCategory === c.key ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
                  <Field>
                    <Label>Label</Label>
                    <FieldContent>
                            <Input 
                              value={editCategoryLabel} 
                              onChange={(e) => setEditCategoryLabel(e.target.value)}
                              placeholder="e.g., GHAZIABAD"
                            />
                    </FieldContent>
                  </Field>
                        <Field>
                          <Label>Default Time</Label>
                          <FieldContent>
                            <Input
                              type="time"
                              value={editCategoryDefaultTime}
                              onChange={(e) => setEditCategoryDefaultTime(e.target.value)}
                              placeholder="15:59"
                            />
                          </FieldContent>
                        </Field>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditCategory} className="bg-green-600 hover:bg-green-700">
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditCategory}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{c.label}</div>
                        <div className="text-sm text-gray-600">Key: {c.key}</div>
                        <div className="text-sm text-gray-600">
                          Default Time: {c.defaultTime || "Not set"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => startEditCategory(c)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeCategoryDraft(c.key)}>
                    Remove
                  </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {active === "schedule" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
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
          </div>
        )}

        {/* SCHEDULED LIST */}
        {active === "scheduled" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Past Results</FieldLegend>
            <Field>
              <Label>Search</Label>
              <FieldContent>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by category, value, date..."
                />
              </FieldContent>
            </Field>
            
            {/* Tabular View */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Value</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Publish Time</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
              {(scheduled || []).map((it) => {
                const due = Date.parse(it.publishAt) <= Date.now()
                const isExecuted = it.executed || false
                    const categoryKey = Object.keys(it.row).find(k => k !== "date")
                    const categoryValue = categoryKey ? it.row[categoryKey] : "--"
                    const categoryLabel = (content.categories ?? []).find(c => c.key === categoryKey)?.label || categoryKey
                    
                return (
                      <tr key={it.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{categoryLabel}</div>
                          <div className="text-xs text-gray-500">({categoryKey})</div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm font-mono text-gray-900">
                          {categoryValue}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                          {it.row.date}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                          {new Date(it.publishAt).toLocaleString()}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              isExecuted 
                                ? "bg-green-100 text-green-800" 
                                : due 
                                  ? "bg-yellow-100 text-yellow-800" 
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isExecuted ? "Published" : due ? "Due / Unpublished" : "Scheduled"}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => startEdit(it)}
                              className="text-xs"
                            >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => deleteSchedule(it.id)}
                              className="text-xs"
                          >
                            Delete
                          </Button>
                        </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!scheduled?.length && (
                    <tr>
                      <td colSpan={6} className="border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                        No scheduled items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
                      </div>

            {/* Edit Modal */}
            {editId && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Edit Schedule</h3>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <Label>Category</Label>
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
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => saveEdit(scheduled?.find(s => s.id === editId))}>
                    Save Changes
                          </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
          </div>
        )}

        {/* HEADER IMAGE */}
        {active === "header-image" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Header Image Management</FieldLegend>
            
            {/* Current Header Image */}
            <Field>
              <Label>Current Header Image</Label>
              <FieldContent>
                {content.headerImage?.imageUrl ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img 
                        src={content.headerImage.imageUrl} 
                        alt={content.headerImage.alt || "Header Image"}
                        className="max-w-full sm:max-w-lg h-auto rounded border mx-auto block"
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to remove the header image? This action cannot be undone.")) {
                            const nextContent = {
                              ...content,
                              headerImage: null
                            }
                            persist(nextContent)
                          }
                        }}
                      >
                        Remove Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">🖼️</div>
                    <div className="text-sm">No header image set</div>
                    <div className="text-xs text-gray-500 mt-1">Upload an image below to get started</div>
                  </div>
                )}
              </FieldContent>
            </Field>
            
            <FieldSeparator>Upload New Header Image</FieldSeparator>
            
            {/* Upload Section */}
            <Field>
              <Label>Choose Image File</Label>
              <FieldContent>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      alert("File size must be less than 5MB")
                      return
                    }
                    
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                      alert("Please select a valid image file")
                      return
                    }
                    
                    const formData = new FormData()
                    formData.append("file", file)
                    
                    try {
                      const res = await fetch("/api/blob/upload", {
                        method: "POST",
                        body: formData,
                        credentials: "include",
                      })
                      
                      if (!res.ok) {
                        throw new Error(`Upload failed: ${res.status}`)
                      }
                      
                      const { url } = await res.json()
                      
                      const nextContent = {
                        ...content,
                        headerImage: {
                          id: crypto.randomUUID(),
                          imageUrl: url,
                          alt: file.name.replace(/\.[^/.]+$/, ""), // Use filename without extension as alt text
                          active: true
                        }
                      }
                      await persist(nextContent)
                      
                      // Reset file input
                      e.target.value = ""
                      
                    } catch (error) {
                      console.error("Upload failed:", error)
                      alert("Failed to upload image. Please try again.")
                    }
                  }}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <FieldDescription>
                  Supported formats: JPG, PNG, GIF, WebP. Maximum file size: 5MB.
                </FieldDescription>
              </FieldContent>
            </Field>
            
            {/* Save Changes Button */}
            <div className="mt-4">
              <Button 
                onClick={() => {
                  // Force save current state
                  persist(content)
                }}
                disabled={isSaving}
                className={isSaving ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}

        {/* RUNNING BANNER */}
        {active === "running-banner" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Running Banner Management</FieldLegend>
            
            {/* Banner Text */}
            <Field>
              <Label>Banner Text</Label>
              <FieldContent>
                <textarea
                  value={content.runningBanner?.text || ""}
                  onChange={(e) => {
                    const nextContent = {
                      ...content,
                      runningBanner: {
                        ...content.runningBanner,
                        id: content.runningBanner?.id || "running-1",
                        text: e.target.value,
                        speed: content.runningBanner?.speed || 30,
                        active: content.runningBanner?.active || false,
                        backgroundColor: content.runningBanner?.backgroundColor || "#dc2626",
                        textColor: content.runningBanner?.textColor || "#ffffff"
                      }
                    }
                    persist(nextContent)
                  }}
                  placeholder="Enter running banner text..."
                  className="w-full min-h-[80px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                />
                <FieldDescription>
                  This text will scroll across the top of the page
                </FieldDescription>
              </FieldContent>
            </Field>

            {/* Speed Control */}
            <Field>
              <Label>Scroll Speed (seconds)</Label>
              <FieldContent>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={content.runningBanner?.speed || 30}
                  onChange={(e) => {
                    const speed = Math.max(5, Math.min(120, parseInt(e.target.value) || 30))
                    const nextContent = {
                      ...content,
                      runningBanner: {
                        ...content.runningBanner,
                        id: content.runningBanner?.id || "running-1",
                        text: content.runningBanner?.text || "",
                        speed: speed,
                        active: content.runningBanner?.active || false,
                        backgroundColor: content.runningBanner?.backgroundColor || "#dc2626",
                        textColor: content.runningBanner?.textColor || "#ffffff"
                      }
                    }
                    persist(nextContent)
                  }}
                  className="w-24"
                />
                <FieldDescription>
                  Lower values = faster scrolling (5-120 seconds)
                </FieldDescription>
              </FieldContent>
            </Field>

            {/* Background Color */}
            <Field>
              <Label>Background Color</Label>
              <FieldContent>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={content.runningBanner?.backgroundColor || "#dc2626"}
                    onChange={(e) => {
                      const nextContent = {
                        ...content,
                        runningBanner: {
                          ...content.runningBanner,
                          id: content.runningBanner?.id || "running-1",
                          text: content.runningBanner?.text || "",
                          speed: content.runningBanner?.speed || 30,
                          active: content.runningBanner?.active || false,
                          backgroundColor: e.target.value,
                          textColor: content.runningBanner?.textColor || "#ffffff"
                        }
                      }
                      persist(nextContent)
                    }}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={content.runningBanner?.backgroundColor || "#dc2626"}
                    onChange={(e) => {
                      const nextContent = {
                        ...content,
                        runningBanner: {
                          ...content.runningBanner,
                          id: content.runningBanner?.id || "running-1",
                          text: content.runningBanner?.text || "",
                          speed: content.runningBanner?.speed || 30,
                          active: content.runningBanner?.active || false,
                          backgroundColor: e.target.value,
                          textColor: content.runningBanner?.textColor || "#ffffff"
                        }
                      }
                      persist(nextContent)
                    }}
                    placeholder="#dc2626"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Text Color */}
            <Field>
              <Label>Text Color</Label>
              <FieldContent>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={content.runningBanner?.textColor || "#ffffff"}
                    onChange={(e) => {
                      const nextContent = {
                        ...content,
                        runningBanner: {
                          ...content.runningBanner,
                          id: content.runningBanner?.id || "running-1",
                          text: content.runningBanner?.text || "",
                          speed: content.runningBanner?.speed || 30,
                          active: content.runningBanner?.active || false,
                          backgroundColor: content.runningBanner?.backgroundColor || "#dc2626",
                          textColor: e.target.value
                        }
                      }
                      persist(nextContent)
                    }}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    value={content.runningBanner?.textColor || "#ffffff"}
                    onChange={(e) => {
                      const nextContent = {
                        ...content,
                        runningBanner: {
                          ...content.runningBanner,
                          id: content.runningBanner?.id || "running-1",
                          text: content.runningBanner?.text || "",
                          speed: content.runningBanner?.speed || 30,
                          active: content.runningBanner?.active || false,
                          backgroundColor: content.runningBanner?.backgroundColor || "#dc2626",
                          textColor: e.target.value
                        }
                      }
                      persist(nextContent)
                    }}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </FieldContent>
            </Field>

            {/* Active Toggle */}
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  checked={content.runningBanner?.active || false}
                  onCheckedChange={(checked) => {
                    const nextContent = {
                      ...content,
                      runningBanner: {
                        ...content.runningBanner,
                        id: content.runningBanner?.id || "running-1",
                        text: content.runningBanner?.text || "",
                        speed: content.runningBanner?.speed || 30,
                        active: checked,
                        backgroundColor: content.runningBanner?.backgroundColor || "#dc2626",
                        textColor: content.runningBanner?.textColor || "#ffffff"
                      }
                    }
                    persist(nextContent)
                  }}
                />
                <Label className="text-sm">Show running banner on website</Label>
              </div>
            </Field>

            {/* Save Button */}
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => {
                    // Force save current running banner state
                    persist(content)
                  }}
                  disabled={isSaving}
                  className={isSaving ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {isSaving ? "Saving..." : "Save Running Banner Changes"}
                </Button>
                {lastSaved && (
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <span>✓</span>
                    <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
              <FieldDescription className="mt-2">
                Changes are automatically saved as you type, but you can also save manually here. 
                Changes are published to the website immediately.
              </FieldDescription>
            </div>

            {/* Preview */}
            {content.runningBanner?.active && content.runningBanner?.text && (
              <FieldSeparator>Preview</FieldSeparator>
            )}
            {content.runningBanner?.active && content.runningBanner?.text && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div 
                  className="w-full py-2 overflow-hidden rounded"
                  style={{
                    backgroundColor: content.runningBanner.backgroundColor,
                    color: content.runningBanner.textColor,
                    '--scroll-duration': `${content.runningBanner.speed || 30}s`
                  } as React.CSSProperties}
                >
                  <div 
                    className="animate-scroll whitespace-nowrap font-bold"
                    style={{
                      animationDuration: `${content.runningBanner.speed || 30}s`
                    }}
                  >
                    {content.runningBanner.text}
                  </div>
                </div>
                <FieldDescription className="mt-2">
                  This is how the running banner will appear on your website
                </FieldDescription>
              </div>
            )}
          </div>
        )}

        {/* TEXT COLUMNS */}
        {active === "text-columns" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Header Text Columns Management</FieldLegend>
            
            {/* Left Text Column */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Left Text Column</h3>
              <Field>
                <div className="flex items-center gap-2 mb-4">
                  <Switch
                    checked={content.leftTextColumn?.active || false}
                    onCheckedChange={(checked) => {
                      const nextContent = {
                        ...content,
                        leftTextColumn: {
                          ...content.leftTextColumn,
                          active: checked,
                          lines: content.leftTextColumn?.lines || []
                        }
                      }
                      persist(nextContent)
                    }}
                  />
                  <Label className="text-sm">Show left text column</Label>
                </div>
              </Field>
              
              {content.leftTextColumn?.active && (
                <div className="space-y-4">
                  {content.leftTextColumn.lines?.map((line: TextColumnLine, index: number) => (
                    <div key={index} className="border rounded p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field>
                          <Label>Text</Label>
                          <FieldContent>
                            <Input
                              value={line.text}
                              onChange={(e) => {
                                const newLines = [...(content.leftTextColumn?.lines || [])]
                                newLines[index] = { ...line, text: e.target.value }
                                const nextContent = {
                                  ...content,
                                  leftTextColumn: {
                                    ...content.leftTextColumn,
                                    lines: newLines
                                  }
                                }
                                persist(nextContent)
                              }}
                              placeholder="Enter text..."
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <Label>Color</Label>
                          <FieldContent>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={line.color || "#000000"}
                                onChange={(e) => {
                                  const newLines = [...(content.leftTextColumn?.lines || [])]
                                  newLines[index] = { ...line, color: e.target.value }
                                  const nextContent = {
                                    ...content,
                                    leftTextColumn: {
                                      ...content.leftTextColumn,
                                      lines: newLines
                                    }
                                  }
                                  persist(nextContent)
                                }}
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input
                                value={line.color || "#000000"}
                                onChange={(e) => {
                                  const newLines = [...(content.leftTextColumn?.lines || [])]
                                  newLines[index] = { ...line, color: e.target.value }
                                  const nextContent = {
                                    ...content,
                                    leftTextColumn: {
                                      ...content.leftTextColumn,
                                      lines: newLines
                                    }
                                  }
                                  persist(nextContent)
                                }}
                                placeholder="#000000"
                                className="flex-1"
                              />
                            </div>
                          </FieldContent>
                        </Field>
                        <Field>
                          <Label>Size</Label>
                          <FieldContent>
                            <select
                              value={line.size || "text-lg"}
                              onChange={(e) => {
                                const newLines = [...(content.leftTextColumn?.lines || [])]
                                newLines[index] = { ...line, size: e.target.value }
                                const nextContent = {
                                  ...content,
                                  leftTextColumn: {
                                    ...content.leftTextColumn,
                                    lines: newLines
                                  }
                                }
                                persist(nextContent)
                              }}
                              className="w-full h-9 rounded border px-2"
                            >
                              <option value="text-xs">Extra Small</option>
                              <option value="text-sm">Small</option>
                              <option value="text-base">Base</option>
                              <option value="text-lg">Large</option>
                              <option value="text-xl">Extra Large</option>
                              <option value="text-2xl">2X Large</option>
                            </select>
                          </FieldContent>
                        </Field>
                      </div>
                      <div className="mt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newLines = (content.leftTextColumn?.lines || []).filter((_, i) => i !== index)
                            const nextContent = {
                              ...content,
                              leftTextColumn: {
                                ...content.leftTextColumn,
                                lines: newLines
                              }
                            }
                            persist(nextContent)
                          }}
                        >
                          Remove Line
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      const newLines = [...(content.leftTextColumn?.lines || []), { text: "", color: "#000000", size: "text-lg" }]
                      const nextContent = {
                        ...content,
                        leftTextColumn: {
                          ...content.leftTextColumn,
                          lines: newLines
                        }
                      }
                      persist(nextContent)
                    }}
                    className="w-full"
                  >
                    Add New Line
                  </Button>
                </div>
              )}
            </div>

            <FieldSeparator />

            {/* Right Text Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Right Text Column</h3>
              <Field>
                <div className="flex items-center gap-2 mb-4">
                  <Switch
                    checked={content.rightTextColumn?.active || false}
                    onCheckedChange={(checked) => {
                      const nextContent = {
                        ...content,
                        rightTextColumn: {
                          ...content.rightTextColumn,
                          active: checked,
                          lines: content.rightTextColumn?.lines || []
                        }
                      }
                      persist(nextContent)
                    }}
                  />
                  <Label className="text-sm">Show right text column</Label>
                </div>
              </Field>
              
              {content.rightTextColumn?.active && (
                <div className="space-y-4">
                  {content.rightTextColumn.lines?.map((line: TextColumnLine, index: number) => (
                    <div key={index} className="border rounded p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field>
                          <Label>Text</Label>
                          <FieldContent>
                            <Input
                              value={line.text}
                              onChange={(e) => {
                                const newLines = [...(content.rightTextColumn?.lines || [])]
                                newLines[index] = { ...line, text: e.target.value }
                                const nextContent = {
                                  ...content,
                                  rightTextColumn: {
                                    ...content.rightTextColumn,
                                    lines: newLines
                                  }
                                }
                                persist(nextContent)
                              }}
                              placeholder="Enter text..."
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <Label>Color</Label>
                          <FieldContent>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={line.color || "#000000"}
                                onChange={(e) => {
                                  const newLines = [...(content.rightTextColumn?.lines || [])]
                                  newLines[index] = { ...line, color: e.target.value }
                                  const nextContent = {
                                    ...content,
                                    rightTextColumn: {
                                      ...content.rightTextColumn,
                                      lines: newLines
                                    }
                                  }
                                  persist(nextContent)
                                }}
                                className="w-16 h-10 p-1 border rounded"
                              />
                              <Input
                                value={line.color || "#000000"}
                                onChange={(e) => {
                                  const newLines = [...(content.rightTextColumn?.lines || [])]
                                  newLines[index] = { ...line, color: e.target.value }
                                  const nextContent = {
                                    ...content,
                                    rightTextColumn: {
                                      ...content.rightTextColumn,
                                      lines: newLines
                                    }
                                  }
                                  persist(nextContent)
                                }}
                                placeholder="#000000"
                                className="flex-1"
                              />
                            </div>
                          </FieldContent>
                        </Field>
                        <Field>
                          <Label>Size</Label>
                          <FieldContent>
                            <select
                              value={line.size || "text-lg"}
                              onChange={(e) => {
                                const newLines = [...(content.rightTextColumn?.lines || [])]
                                newLines[index] = { ...line, size: e.target.value }
                                const nextContent = {
                                  ...content,
                                  rightTextColumn: {
                                    ...content.rightTextColumn,
                                    lines: newLines
                                  }
                                }
                                persist(nextContent)
                              }}
                              className="w-full h-9 rounded border px-2"
                            >
                              <option value="text-xs">Extra Small</option>
                              <option value="text-sm">Small</option>
                              <option value="text-base">Base</option>
                              <option value="text-lg">Large</option>
                              <option value="text-xl">Extra Large</option>
                              <option value="text-2xl">2X Large</option>
                            </select>
                          </FieldContent>
                        </Field>
                      </div>
                      <div className="mt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newLines = (content.rightTextColumn?.lines || []).filter((_, i) => i !== index)
                            const nextContent = {
                              ...content,
                              rightTextColumn: {
                                ...content.rightTextColumn,
                                lines: newLines
                              }
                            }
                            persist(nextContent)
                          }}
                        >
                          Remove Line
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      const newLines = [...(content.rightTextColumn?.lines || []), { text: "", color: "#000000", size: "text-lg" }]
                      const nextContent = {
                        ...content,
                        rightTextColumn: {
                          ...content.rightTextColumn,
                          lines: newLines
                        }
                      }
                      persist(nextContent)
                    }}
                    className="w-full"
                  >
                    Add New Line
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIVE SCHEDULES */}
        {active === "live-schedules" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
            <FieldLegend>Live Results Scheduling</FieldLegend>
            <FieldDescription>
              Schedule live results to be published at specific times today. These will override scraper data.
            </FieldDescription>
            
            {/* Add New Schedule Form */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Add New Live Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <Label>Category</Label>
                  <FieldContent>
                    <select
                      value={newScheduleCategory}
                      onChange={(e) => setNewScheduleCategory(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="GHAZIABAD1">GHAZIABAD1</option>
                      <option value="FARIDABAD1">FARIDABAD1</option>
                      <option value="GALI1">GALI1</option>
                      <option value="DESAWAR1">DESAWAR1</option>
                      <option value="GHAZIABAD">GHAZIABAD</option>
                      <option value="FARIDABAD">FARIDABAD</option>
                      <option value="GALI">GALI</option>
                      <option value="DESAWAR">DESAWAR</option>
                    </select>
                  </FieldContent>
                </Field>
                
                <Field>
                  <Label>Time (24h format)</Label>
                  <FieldContent>
                    <Input
                      type="time"
                      value={newScheduleTime}
                      onChange={(e) => setNewScheduleTime(e.target.value)}
                      placeholder="15:59"
                    />
                  </FieldContent>
                </Field>
                
                <Field>
                  <Label>Today's Result</Label>
                  <FieldContent>
                    <Input
                      value={newScheduleResult}
                      onChange={(e) => setNewScheduleResult(e.target.value)}
                      placeholder="56"
                    />
                  </FieldContent>
                </Field>
                
                <Field>
                  <Label>Yesterday's Result (Optional)</Label>
                  <FieldContent>
                    <Input
                      value={newScheduleYesterdayResult}
                      onChange={(e) => setNewScheduleYesterdayResult(e.target.value)}
                      placeholder="88"
                    />
                  </FieldContent>
                </Field>
              </div>
              
              <div className="mt-4">
                <Button onClick={addLiveSchedule} className="w-full">
                  Add Live Schedule
                </Button>
              </div>
            </div>

            {/* Current Schedules */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Current Live Schedules</h3>
              {liveSchedules.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No live schedules found. Add one above to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {liveSchedules.map((schedule) => {
                    const scheduleTime = new Date(schedule.scheduledTime)
                    const now = new Date()
                    const isDue = now >= scheduleTime
                    const timeUntil = Math.ceil((scheduleTime.getTime() - now.getTime()) / (1000 * 60))
                    
                    return (
                      <div key={schedule.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-lg">{schedule.category}</div>
                            <div className="text-sm text-gray-600">
                              Scheduled: {scheduleTime.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              Result: {schedule.result}
                              {schedule.yesterdayResult && ` | Yesterday: ${schedule.yesterdayResult}`}
                            </div>
                            <div className="text-sm">
                              Status: 
                              <span className={`ml-1 font-semibold ${
                                schedule.status === 'published' ? 'text-green-600' :
                                isDue ? 'text-blue-600' : 'text-yellow-600'
                              }`}>
                                {schedule.status === 'published' ? 'Published' :
                                 isDue ? 'Due Now' : `In ${timeUntil}m`}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {!isDue && schedule.status === 'scheduled' && (
                              <Button
                                size="sm"
                                onClick={() => publishLiveSchedule(schedule.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Publish Now
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteLiveSchedule(schedule.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER NOTE */}
        {active === "footer-note" && (
          <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
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
          </div>
        )}
      </main>

      {/* Edit Banner Modal */}
      {editingBanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Banner</h3>
              
              {/* Banner Text */}
              <Field>
                <Label>Banner Text</Label>
                <FieldContent>
                  <textarea
                    required
                    aria-required="true"
                    value={editBannerText}
                    onChange={(e) => setEditBannerText(e.target.value)}
                    placeholder="Enter banner text... Press Enter for new lines"
                    className="w-full min-h-[80px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                    rows={3}
                  />
                </FieldContent>
                <FieldDescription>
                  Press Enter to create line breaks in your banner text
                </FieldDescription>
              </Field>

              {/* Complete Row Toggle */}
              <Field>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editBannerCompleteRow}
                    onCheckedChange={setEditBannerCompleteRow}
                  />
                  <Label className="text-sm">Complete Row (Full Width)</Label>
                </div>
                <FieldDescription>
                  When enabled, banner will span the full width of the section. When disabled, it will appear as a button.
                </FieldDescription>
              </Field>

              {/* Background Color Selection */}
              <Field>
                <Label>Background Color</Label>
                <FieldContent>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editBannerBackgroundColor}
                      onChange={(e) => setEditBannerBackgroundColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={editBannerBackgroundColor}
                      onChange={(e) => setEditBannerBackgroundColor(e.target.value)}
                      placeholder="#dc2626"
                      className="flex-1"
                    />
                  </div>
                </FieldContent>
              </Field>

              {/* Text Color Selection */}
              <Field>
                <Label>Text Color</Label>
                <FieldContent>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editBannerColor}
                      onChange={(e) => setEditBannerColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={editBannerColor}
                      onChange={(e) => setEditBannerColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </FieldContent>
              </Field>

                     {/* Multi-Color Text Toggle */}
                     <Field>
                       <div className="flex items-center gap-2">
                         <Switch
                           checked={editBannerMultiColor}
                           onCheckedChange={setEditBannerMultiColor}
                         />
                         <Label className="text-sm">Multi-Color Text (Auto Rainbow)</Label>
                       </div>
                       <FieldDescription>
                         When enabled, text will automatically use multiple colors for visual appeal.
                       </FieldDescription>
                     </Field>

                     {/* Refresh Colors Button */}
                     {editBannerMultiColor && (
                       <Field>
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => {
                             // Generate new random colors for better visibility
                             const newColors = [
                               '#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffd700',
                               '#adff2f', '#32cd32', '#00ff7f', '#00ced1', '#1e90ff',
                               '#4169e1', '#8a2be2', '#ff1493', '#dc143c', '#b22222',
                               '#8b0000', '#006400', '#000080', '#800080', '#ff6347'
                             ]
                             // Shuffle the colors array
                             const shuffledColors = newColors.sort(() => Math.random() - 0.5)
                             setCustomColorPalette(shuffledColors)
                             console.log('🎨 New color palette for edit stored:', shuffledColors)
                             alert(`New color palette generated! Colors will be applied when you save the banner.`)
                           }}
                           className="w-full"
                         >
                           🎨 Refresh Color Palette
                         </Button>
                         <FieldDescription>
                           Click to generate new random colors for better visibility on different backgrounds.
                         </FieldDescription>
                       </Field>
                     )}

              {/* Bold Text Toggle */}
              <Field>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editBannerBold}
                    onCheckedChange={setEditBannerBold}
                  />
                  <Label className="text-sm">Bold Text</Label>
                </div>
                <FieldDescription>
                  When enabled, banner text will be displayed in bold.
                </FieldDescription>
              </Field>

              {/* GIF URL Input */}
              <Field>
                <Label>GIF URL (Optional)</Label>
                <FieldContent>
                  <Input
                    value={editBannerGifUrl}
                    onChange={(e) => setEditBannerGifUrl(e.target.value)}
                    placeholder="https://media.giphy.com/media/..."
                    className="w-full"
                  />
                </FieldContent>
                <FieldDescription>
                  Add a GIF URL to display a small animated image next to the banner text.
                </FieldDescription>
              </Field>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={cancelEditBanner}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveEditBanner} 
                  disabled={!editBannerText.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Banner2 Modal */}
      {editingBanner2 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Banner2</h3>
              
              {/* Banner Text */}
              <Field>
                <Label>Banner Text</Label>
                <FieldContent>
                  <textarea
                    required
                    aria-required="true"
                    value={editBanner2Text}
                    onChange={(e) => setEditBanner2Text(e.target.value)}
                    placeholder="Enter banner text... Press Enter for new lines"
                    className="w-full min-h-[80px] p-2 sm:p-3 border rounded-md resize-vertical text-sm sm:text-base"
                    rows={3}
                  />
                </FieldContent>
                <FieldDescription>
                  Press Enter to create line breaks in your banner text
                </FieldDescription>
              </Field>

              {/* Complete Row Toggle */}
              <Field>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editBanner2CompleteRow}
                    onCheckedChange={setEditBanner2CompleteRow}
                  />
                  <Label className="text-sm">Complete Row (Full Width)</Label>
                </div>
                <FieldDescription>
                  When enabled, banner will span the full width of the section. When disabled, it will appear as a button.
                </FieldDescription>
              </Field>

              {/* Background Color Selection */}
              <Field>
                <Label>Background Color</Label>
                <FieldContent>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editBanner2BackgroundColor}
                      onChange={(e) => setEditBanner2BackgroundColor(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={editBanner2BackgroundColor}
                      onChange={(e) => setEditBanner2BackgroundColor(e.target.value)}
                      placeholder="#dc2626"
                      className="flex-1"
                    />
                  </div>
                </FieldContent>
              </Field>

              {/* Text Color Selection */}
              <Field>
                <Label>Text Color</Label>
                <FieldContent>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editBanner2Color}
                      onChange={(e) => setEditBanner2Color(e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={editBanner2Color}
                      onChange={(e) => setEditBanner2Color(e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </FieldContent>
              </Field>

              {/* Multi-Color Text Toggle */}
              <Field>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editBanner2MultiColor}
                    onCheckedChange={setEditBanner2MultiColor}
                  />
                  <Label className="text-sm">Multi-Color Text (Auto Rainbow)</Label>
                </div>
                <FieldDescription>
                  When enabled, text will automatically use multiple colors for visual appeal.
                </FieldDescription>
              </Field>

              {/* Refresh Colors Button */}
              {editBanner2MultiColor && (
                <Field>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Generate new random colors for better visibility
                      const newColors = [
                        '#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffd700',
                        '#adff2f', '#32cd32', '#00ff7f', '#00ced1', '#1e90ff',
                        '#4169e1', '#8a2be2', '#ff1493', '#dc143c', '#b22222',
                        '#8b0000', '#006400', '#000080', '#800080', '#ff6347'
                      ]
                      // Shuffle the colors array
                      const shuffledColors = newColors.sort(() => Math.random() - 0.5)
                      setCustomColorPalette2(shuffledColors)
                      console.log('🎨 New color palette for edit banner2 stored:', shuffledColors)
                      alert(`New color palette generated! Colors will be applied when you save the banner.`)
                    }}
                    className="w-full"
                  >
                    🎨 Refresh Color Palette
                  </Button>
                  <FieldDescription>
                    Click to generate new random colors for better visibility on different backgrounds.
                  </FieldDescription>
                </Field>
              )}

              {/* Bold Text Toggle */}
              <Field>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editBanner2Bold}
                    onCheckedChange={setEditBanner2Bold}
                  />
                  <Label className="text-sm">Bold Text</Label>
                </div>
                <FieldDescription>
                  When enabled, banner text will be displayed in bold.
                </FieldDescription>
              </Field>

              {/* GIF URL Input */}
              <Field>
                <Label>GIF URL (Optional)</Label>
                <FieldContent>
                  <Input
                    value={editBanner2GifUrl}
                    onChange={(e) => setEditBanner2GifUrl(e.target.value)}
                    placeholder="https://media.giphy.com/media/..."
                    className="w-full"
                  />
                </FieldContent>
                <FieldDescription>
                  Add a GIF URL to display a small animated image next to the banner text.
                </FieldDescription>
              </Field>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={cancelEditBanner2}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveEditBanner2} 
                  disabled={!editBanner2Text.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
