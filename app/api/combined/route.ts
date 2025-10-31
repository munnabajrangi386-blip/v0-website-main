import { NextResponse } from "next/server"
import { getSiteContent, getActiveLiveSchedules, publishLiveSchedule, getSchedules, runDueSchedules } from "@/lib/local-content-store"
import { parseMonthlyTable, parseLiveResults, parseLiveResultsFast } from "@/lib/scrape"

const DEFAULT_CATEGORIES = [
  { key: "ghaziabad1", label: "GHAZIABAD1", showInToday: true },
  { key: "gali1", label: "GALI1", showInToday: true },
  { key: "faridabad1", label: "FARIDABAD1", showInToday: true },
  { key: "desawar1", label: "DESAWAR1", showInToday: true },
]

const CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
}

export async function GET(req: Request) {
  try {
    const { month, year } = getParams(req)
    const content = await getContentWithFallback()
    
    const scraperData = await scrapeData(month, year, true) // Use fast scraper for live results
    
    // Get active live schedules for today
    const liveSchedules = await getActiveLiveSchedules()
    
    // Get scheduled items for today
    const scheduledItems = await getSchedules()
    const today = new Date().toISOString().split('T')[0]
    const todayScheduledItems = scheduledItems.filter(item => item.row.date === today)
    
    // Auto-publish due live schedules
    const now = new Date()
    for (const schedule of liveSchedules) {
      const scheduleTime = new Date(schedule.scheduledTime)
      if (now >= scheduleTime && schedule.status === 'scheduled') {
        await publishLiveSchedule(schedule.id)
      }
    }
    
    // Auto-execute due scheduled items
    await runDueSchedules()
    
    // Get updated schedules after auto-publishing
    const updatedLiveSchedules = await getActiveLiveSchedules()
    
    const adminCategories = getAdminCategories(content)
    const hybridData = createHybridData(adminCategories, scraperData.monthly, scheduledItems, updatedLiveSchedules)
    const todayData = createTodayData(adminCategories, scraperData.monthly, scraperData.live, updatedLiveSchedules, todayScheduledItems)
    
    return NextResponse.json({
      content: getContentData(content),
      monthlyData: hybridData,
      todayData
    }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('Combined API error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

function getParams(req: Request) {
  const url = new URL(req.url)
  return {
    month: parseInt(url.searchParams.get('month') || '10'),
    year: parseInt(url.searchParams.get('year') || '2025')
  }
}

async function getContentWithFallback() {
  try {
    return await getSiteContent()
  } catch {
    return {
      banners: [],
      runningBanner: {
        id: "running-1",
        text: "SATTA KING, SATTAKING, SATTA RESULT, GALI RESULT, GALI SATTA, SATTA BAZAR, GALI SATTA RESULT, SATTA KING 2024 SATTA KING 2025, SATTA KING RESULT, SATTA KING UP, SATTA GAME TODAY RESULT, SATTA RESULT CHART, SATTA KING LIVE, DESAWAR SATTA, FARIDABAD SATTA, FARIDABAD RESULT, BLACK SATTA KING",
        speed: 50,
        active: true,
        backgroundColor: "#dc2626",
        textColor: "#ffffff"
      },
      fullWidthBanners: [
        {
          id: "fw-banner-1",
          title: "आज की लीक जोड़ी यहां मिलेगी",
          content: "FARIDABAD GAZIYABAD GALI DS - कन्फर्म गेम लेने के लिए जल्दी Telegram पे मैसेज कीजिए सिंगल जोड़ी में काम होगा fb.gb.gl.ds",
          backgroundColor: "linear-gradient(to right, #134e4a, #0f172a)",
          textColor: "#ffffff",
          active: true,
          order: 1
        },
        {
          id: "fw-banner-2", 
          title: "Satta king | Satta result | सत्ता किंग",
          content: "",
          backgroundColor: "#fbbf24",
          textColor: "#000000",
          active: true,
          order: 2
        },
        {
          id: "fw-banner-3",
          title: "Diwali Special Dhamaka",
          content: "Single Jodi Mein Game Milegi Faridabad Ghaziabad Gali Disawar - Proof Ke Sath Kam Hoga Leak Jodi Milegi Head Department Se",
          backgroundColor: "#134e4a",
          textColor: "#ffffff",
          active: true,
          order: 3,
          showBorder: true,
          borderColor: "#3b82f6"
        }
      ],
      ads: [],
      categories: DEFAULT_CATEGORIES,
      headerHighlight: { enabled: false },
      updatedAt: new Date().toISOString()
    }
  }
}

async function scrapeData(month: number, year: number, useFastScraper: boolean = true) {
  const urls = {
    fast: 'https://satta-king-fast.com/',
    original: 'https://newghaziabad.com'
  }
  
  // Always use original scraper for monthly table
  const monthlyResponse = await fetch(urls.original, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  const monthlyHtml = await monthlyResponse.text()
  
  // Use fast scraper for live results
  const liveUrl = useFastScraper ? urls.fast : urls.original
  const liveResponse = await fetch(liveUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  const liveHtml = await liveResponse.text()
  
  return {
    monthly: parseMonthlyTable(monthlyHtml, month, year),
    live: useFastScraper ? parseLiveResultsFast(liveHtml) : parseLiveResults(liveHtml)
  }
}

function getAdminCategories(content: any) {
  return content.categories?.filter((cat: any) => 
    !["disawar", "newDisawar", "taj", "delhiNoon", "gali", "ghaziabad", "faridabad", "haridwar"].includes(cat.key)
  ) || []
}

function createHybridData(adminCategories: any[], scraperData: any, scheduledItems: any[] = [], liveSchedules: any[] = []) {
  // Normalize helpers
  const norm = (s: string) => (s || '').toUpperCase().trim()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const isCurrentMonth = scraperData.year === currentYear && scraperData.month === currentMonth

  // Load admin category values from simple CSV file for HISTORICAL dates only (before today)
  const adminDataByDay: Record<number, { GALI1?: string; DESAWAR1?: string; FARIDABAD1?: string; GHAZIABAD1?: string }> = {}
  try {
    const { readFileSync } = require('fs')
    const { join } = require('path')
    const csvPath = join(process.cwd(), 'dummy_gali1_2015_to_today.csv')
    const raw = readFileSync(csvPath, 'utf-8')
    const lines = raw.trim().split(/\r?\n/)
    const headers = lines[0].split(',')
    
    const idxDate = headers.indexOf('date')
    const idxGali1 = headers.indexOf('GALI1')
    const idxDesawar1 = headers.indexOf('DESAWAR1')
    const idxFaridabad1 = headers.indexOf('FARIDABAD1')
    const idxGhaziabad1 = headers.indexOf('GHAZIABAD1')
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const parts = line.split(',')
      if (parts.length < 2 || idxDate === -1) continue
      
      const dateStr = parts[idxDate]?.trim()
      if (!dateStr) continue
      
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!dateMatch) continue
      
      const y = parseInt(dateMatch[1], 10)
      const m = parseInt(dateMatch[2], 10)
      const d = parseInt(dateMatch[3], 10)
      const rowDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      
      // Only load CSV for HISTORICAL dates (before today)
      if (y === scraperData.year && m === scraperData.month && d >= 1 && d <= 31 && rowDate < todayStr) {
        const data: any = {}
        if (idxGali1 !== -1 && parts[idxGali1]?.trim() && parts[idxGali1].trim() !== '--') {
          data.GALI1 = parts[idxGali1].trim().padStart(2, '0')
        }
        if (idxDesawar1 !== -1 && parts[idxDesawar1]?.trim() && parts[idxDesawar1].trim() !== '--') {
          data.DESAWAR1 = parts[idxDesawar1].trim().padStart(2, '0')
        }
        if (idxFaridabad1 !== -1 && parts[idxFaridabad1]?.trim() && parts[idxFaridabad1].trim() !== '--') {
          data.FARIDABAD1 = parts[idxFaridabad1].trim().padStart(2, '0')
        }
        if (idxGhaziabad1 !== -1 && parts[idxGhaziabad1]?.trim() && parts[idxGhaziabad1].trim() !== '--') {
          data.GHAZIABAD1 = parts[idxGhaziabad1].trim().padStart(2, '0')
        }
        if (Object.keys(data).length > 0) {
          adminDataByDay[d] = data
        }
      }
    }
  } catch (e) {
    // ignore file errors
  }

  // Load schedule data for today and future dates (admin columns from schedules)
  const scheduleDataByDay: Record<number, { GALI1?: string; DESAWAR1?: string; FARIDABAD1?: string; GHAZIABAD1?: string }> = {}
  
  // Load from scheduled items (for any date in the selected month)
  // Process schedules in order of publish time (earliest first) so latest schedules override earlier ones
  const sortedSchedules = [...scheduledItems].sort((a, b) => {
    const timeA = new Date(a.publishAt).getTime()
    const timeB = new Date(b.publishAt).getTime()
    return timeA - timeB // Earliest first, so latest overwrites
  })
  
  sortedSchedules.forEach(schedule => {
    const scheduleDate = schedule.row.date
    if (!scheduleDate) return
    
    const dateMatch = scheduleDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!dateMatch) return
    
    const y = parseInt(dateMatch[1], 10)
    const m = parseInt(dateMatch[2], 10)
    const d = parseInt(dateMatch[3], 10)
    
    // Check if schedule is for the selected month/year
    if (y === scraperData.year && m === scraperData.month && d >= 1 && d <= 31) {
      const publishTime = new Date(schedule.publishAt)
      const now = new Date()
      
      // Include if:
      // 1. Schedule is executed, OR
      // 2. Publish time has passed (even if not yet executed by auto-run)
      if (schedule.executed || now >= publishTime) {
        // Find which admin category this schedule is for
        const scheduleKey = Object.keys(schedule.row).find(key => key !== 'date')
        if (!scheduleKey) return
        const categoryKey = norm(scheduleKey)
        const value = schedule.row[scheduleKey]?.toString()?.trim()
        
        // Only set if value exists and is not empty/--
        if (value && value !== '--' && value !== '') {
          if (!scheduleDataByDay[d]) scheduleDataByDay[d] = {}
          
          // Set the value for the matching category (will overwrite if multiple schedules exist)
          if (categoryKey === 'GALI1') {
            scheduleDataByDay[d].GALI1 = value.padStart(2, '0')
          } else if (categoryKey === 'DESAWAR1') {
            scheduleDataByDay[d].DESAWAR1 = value.padStart(2, '0')
          } else if (categoryKey === 'FARIDABAD1') {
            scheduleDataByDay[d].FARIDABAD1 = value.padStart(2, '0')
          } else if (categoryKey === 'GHAZIABAD1') {
            scheduleDataByDay[d].GHAZIABAD1 = value.padStart(2, '0')
          }
        }
      }
    }
  })
  
  // Also check live schedules (for the selected month)
  liveSchedules.forEach(schedule => {
    if (schedule.status !== 'published') return
    const scheduleTime = new Date(schedule.scheduledTime)
    const scheduleYear = scheduleTime.getFullYear()
    const scheduleMonth = scheduleTime.getMonth() + 1
    const scheduleDay = scheduleTime.getDate()
    
    // Include if it's in the selected month and publish time has passed
    if (scheduleYear === scraperData.year && scheduleMonth === scraperData.month && scheduleDay >= 1 && scheduleDay <= 31) {
      const publishTime = scheduleTime.getTime()
      const now = new Date().getTime()
      
      // Only include if publish time has passed
      if (now >= publishTime) {
        const categoryKey = norm(schedule.category)
        const value = schedule.result?.toString()
        
        if (value && value !== '--') {
          if (!scheduleDataByDay[scheduleDay]) scheduleDataByDay[scheduleDay] = {}
          if (categoryKey === 'GALI1') scheduleDataByDay[scheduleDay].GALI1 = value.padStart(2, '0')
          if (categoryKey === 'DESAWAR1') scheduleDataByDay[scheduleDay].DESAWAR1 = value.padStart(2, '0')
          if (categoryKey === 'FARIDABAD1') scheduleDataByDay[scheduleDay].FARIDABAD1 = value.padStart(2, '0')
          if (categoryKey === 'GHAZIABAD1') scheduleDataByDay[scheduleDay].GHAZIABAD1 = value.padStart(2, '0')
        }
      }
    }
  })

  // Build a lookup for API column indices
  const apiIndex: Record<string, number> = {}
  scraperData.columns.forEach((label: string, idx: number) => {
    apiIndex[norm(label)] = idx
  })

  // Find admin labels (case-insensitive)
  const adminLabelMap: Record<string, string | undefined> = {
    FARIDABAD1: adminCategories.find(c => norm(c.label) === 'FARIDABAD1')?.label,
    GHAZIABAD1: adminCategories.find(c => norm(c.label) === 'GHAZIABAD1')?.label,
    GALI1: adminCategories.find(c => norm(c.label) === 'GALI1')?.label,
    DESAWAR1: adminCategories.find(c => norm(c.label) === 'DESAWAR1')?.label,
  }

  // Desired order (API base then admin twin)
  const desiredOrder: string[] = []
  const pushIf = (label?: string) => { if (label) desiredOrder.push(label) }

  // Always include only these API base columns (if present in the source)
  const baseApi = ['FARIDABAD', 'GHAZIABAD', 'GALI', 'DESAWAR']
  const baseApiPretty: Record<string, string> = {
    FARIDABAD: 'Faridabad',
    GHAZIABAD: 'Ghaziabad',
    GALI: 'Gali',
    DESAWAR: 'Desawar',
  }

  // Build the ordered columns list
  for (const base of baseApi) {
    // Base API column label to display (pretty-cased)
    const baseLabel = baseApiPretty[base]
    // Only include if API has this column
    if (apiIndex[base] !== undefined) {
      desiredOrder.push(baseLabel)
    }
    // Then its admin twin
    const twinKey = `${base}1` as 'FARIDABAD1' | 'GHAZIABAD1' | 'GALI1' | 'DESAWAR1'
    pushIf(adminLabelMap[twinKey])
  }

  // Append any extra admin categories (not the 4 twins), to the right
  const reservedAdmin = new Set(['FARIDABAD1','GHAZIABAD1','GALI1','DESAWAR1'])
  const extraAdmins = adminCategories
    .map((c: any) => c.label)
    .filter((label: string) => !reservedAdmin.has(norm(label)))
  desiredOrder.push(...extraAdmins)

  // Build lookup for scraper data by day
  const scraperByDay: Record<number, any> = {}
  scraperData.rows.forEach((row: any) => {
    if (row.day >= 1 && row.day <= 31) {
      scraperByDay[row.day] = row
    }
  })

  // Generate rows for ALL days of the month (1-31)
  const daysInMonth = new Date(scraperData.year, scraperData.month, 0).getDate()
  const rows = []
  
  for (let day = 1; day <= daysInMonth; day++) {
    const scraperRow = scraperByDay[day]
    const values = desiredOrder.map((label) => {
      const key = norm(label)
      // Base API columns from scraper (if available for this day)
      if (key === 'FARIDABAD' || key === 'GHAZIABAD' || key === 'GALI' || key === 'DESAWAR') {
        if (scraperRow) {
          const idx = apiIndex[key]
          return idx !== undefined ? scraperRow.values[idx] ?? null : null
        }
        return null
      }
      // Admin categories: Use schedule data (priority) for today/future, CSV for historical
      const scheduleDayData = scheduleDataByDay[day]
      const csvDayData = adminDataByDay[day]
      
      if (key === 'GALI1') {
        return scheduleDayData?.GALI1 || csvDayData?.GALI1 || null
      }
      if (key === 'DESAWAR1') {
        return scheduleDayData?.DESAWAR1 || csvDayData?.DESAWAR1 || null
      }
      if (key === 'FARIDABAD1') {
        return scheduleDayData?.FARIDABAD1 || csvDayData?.FARIDABAD1 || null
      }
      if (key === 'GHAZIABAD1') {
        return scheduleDayData?.GHAZIABAD1 || csvDayData?.GHAZIABAD1 || null
      }
      // Other admin columns remain null
      return null
    })
    rows.push({ day, values })
  }
  
  return {
    month: scraperData.month,
    year: scraperData.year,
    columns: desiredOrder,
    rows
  }
}

function createTodayData(adminCategories: any[], scraperData: any, liveResults: any, liveSchedules: any[] = [], scheduledItems: any[] = []) {
  // Create items from admin categories (empty placeholders)
  const adminItems = adminCategories.map(cat => ({ 
    category: cat.label, 
    value: "--",
    time: cat.defaultTime || "TBD", // Use default time from category
    jodi: "--",
    status: "wait",
    yesterdayResult: "--",
    todayResult: "--"
  }))
  
  // Create items from live results
  const liveItems = liveResults.results.map((result: any) => ({
    category: result.title,
    value: result.result,
    time: result.time,
    jodi: result.jodi,
    status: result.status,
    yesterdayResult: result.yesterdayResult,
    todayResult: result.todayResult
  }))
  
  // Merge live results with admin categories where there's a match (schedules/exec take priority)
  const mergedAdminItems = adminItems.map(adminItem => {
    // First, check for a scheduled live result (highest priority)
    const matchingSchedule = liveSchedules.find(schedule => {
      const adminName = adminItem.category.toUpperCase()
      const scheduleName = schedule.category.toUpperCase()
      return adminName === scheduleName
    })
    
    if (matchingSchedule) {
      const now = new Date()
      const scheduleTime = new Date(matchingSchedule.scheduledTime)
      if (now >= scheduleTime || matchingSchedule.status === 'published') {
        return {
          ...adminItem,
          value: matchingSchedule.result,
          time: adminItem.time,
          jodi: matchingSchedule.result,
          status: 'pass',
          yesterdayResult: matchingSchedule.yesterdayResult || '--',
          todayResult: matchingSchedule.todayResult || matchingSchedule.result,
        }
      } else {
        const timeUntil = Math.ceil((scheduleTime.getTime() - now.getTime()) / (1000 * 60))
        return { ...adminItem, time: `In ${timeUntil}m`, status: 'wait' }
      }
    }
    
    // Check for scheduled items from Schedule section (for Live Results)
    // Only show schedules that are for TODAY in Live Results
    const now = new Date()
    const today = new Date().toISOString().split('T')[0]
    
    const matchingScheduledItem = scheduledItems.find(schedule => {
      const adminName = adminItem.category.toUpperCase()
      const scheduleKey = Object.keys(schedule.row).find(key => key !== 'date')
      const scheduleName = scheduleKey?.toUpperCase()
      const scheduleDate = schedule.row.date
      
      // Only match if: category matches AND schedule is for TODAY
      return scheduleName === adminName && scheduleDate === today
    })
    
    if (matchingScheduledItem) {
      const scheduleKey = Object.keys(matchingScheduledItem.row).find(key => key !== 'date')
      const scheduleValue = matchingScheduledItem.row[scheduleKey!]
      const publishTime = new Date(matchingScheduledItem.publishAt)
      
      // If publish time has passed or schedule is executed, show the result in Live Results
      if (now >= publishTime || matchingScheduledItem.executed) {
        return {
          ...adminItem,
          value: scheduleValue,
          time: adminItem.time, // Keep default time from category
          jodi: scheduleValue,
          status: 'pass',
          yesterdayResult: '--',
          todayResult: scheduleValue,
        }
      } else {
        // Schedule is pending, show countdown
        const timeUntil = Math.ceil((publishTime.getTime() - now.getTime()) / (1000 * 60))
        const hours = Math.floor(timeUntil / 60)
        const mins = timeUntil % 60
        const timeDisplay = hours > 0 ? `In ${hours}h ${mins}m` : `In ${mins}m`
        return {
          ...adminItem,
          value: '--',
          time: timeDisplay,
          jodi: '--',
          status: 'wait',
          yesterdayResult: '--',
          todayResult: '--',
        }
      }
    }
    
    // Default admin-managed placeholder
    return adminItem
  })
  
  // Put admin-created categories at the TOP, then all scraper results
  const ordered: any[] = []
  
  // First: Add all admin categories at the top
  for (const adminItem of mergedAdminItems) {
    ordered.push(adminItem)
  }
  
  // Then: Add all scraper results after admin categories
  for (const item of liveItems) {
    ordered.push(item)
  }
  
  return {
    date: new Date().toISOString().split('T')[0],
    items: ordered
  }
}

function getContentData(content: any) {
  return {
    banners: content.banners || [],
    runningBanner: content.runningBanner,
    fullWidthBanners: content.fullWidthBanners || [],
    banner2: content.banner2 || [], // Added
    banner3: content.banner3 || [], // Added
    ads: content.ads || [],
    categories: content.categories || [], // Added categories
    headerImage: content.headerImage,
    leftTextColumn: content.leftTextColumn,
    rightTextColumn: content.rightTextColumn,
    footerBanner: content.footerBanner || [], // Added
    footerNote: content.footerNote
  }
}
