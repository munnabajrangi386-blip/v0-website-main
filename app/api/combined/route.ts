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
    const hybridData = createHybridData(adminCategories, scraperData.monthly)
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
  
  const url = useFastScraper ? urls.fast : urls.original
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  const html = await response.text()
  
  return {
    monthly: parseMonthlyTable(html, month, year), // Always use original scraper for monthly table
    live: useFastScraper ? parseLiveResultsFast(html) : parseLiveResults(html) // Use fast scraper for live results
  }
}

function getAdminCategories(content: any) {
  return content.categories?.filter((cat: any) => 
    !["disawar", "newDisawar", "taj", "delhiNoon", "gali", "ghaziabad", "faridabad", "haridwar"].includes(cat.key)
  ) || []
}

function createHybridData(adminCategories: any[], scraperData: any) {
  const columns = [
    ...adminCategories.map(cat => cat.label),
    ...scraperData.columns
  ]
  
  const rows = scraperData.rows.map((row: any) => ({
    day: row.day,
    values: [
      ...new Array(adminCategories.length).fill(null),
      ...row.values
    ]
  }))
  
  return {
    month: scraperData.month,
    year: scraperData.year,
    columns,
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
  
  // Merge live results with admin categories where there's a match
  const mergedItems = adminItems.map(adminItem => {
    // First, check for a scheduled live result (highest priority)
    const matchingSchedule = liveSchedules.find(schedule => {
      const adminName = adminItem.category.toUpperCase()
      const scheduleName = schedule.category.toUpperCase()
      return adminName === scheduleName
    })
    
    // If we have a scheduled result, use it
    if (matchingSchedule) {
      const now = new Date()
      const scheduleTime = new Date(matchingSchedule.scheduledTime)
      
      // Check if it's time to publish this schedule or if it's already published
      if (now >= scheduleTime || matchingSchedule.status === 'published') {
        return {
          ...adminItem,
          value: matchingSchedule.result,
          time: adminItem.time, // Use default time from category (8:45 PM)
          jodi: matchingSchedule.result,
          status: 'pass',
          yesterdayResult: matchingSchedule.yesterdayResult || '--',
          todayResult: matchingSchedule.todayResult || matchingSchedule.result,
          category: adminItem.category // Keep the admin category name
        }
      } else {
        // Schedule is not yet due, show countdown
        const timeUntil = Math.ceil((scheduleTime.getTime() - now.getTime()) / (1000 * 60))
        return {
          ...adminItem,
          time: `In ${timeUntil}m`,
          status: 'wait',
          category: adminItem.category
        }
      }
    }
    
    // Check for executed scheduled items
    const today = new Date().toISOString().split('T')[0]
    const executedSchedule = scheduledItems.find(schedule => {
      const adminName = adminItem.category.toUpperCase()
      const scheduleKey = Object.keys(schedule.row).find(key => key !== 'date')
      const scheduleName = scheduleKey?.toUpperCase()
      return scheduleName === adminName && schedule.row.date === today && schedule.executed
    })
    
    if (executedSchedule) {
      const scheduleKey = Object.keys(executedSchedule.row).find(key => key !== 'date')
      const scheduleValue = executedSchedule.row[scheduleKey!]
      return {
        ...adminItem,
        value: scheduleValue,
        time: adminItem.time,
        jodi: scheduleValue,
        status: 'pass',
        yesterdayResult: '--',
        todayResult: scheduleValue,
        category: adminItem.category
      }
    }
    
    // Admin-managed categories: Use admin settings only, ignore scraper
    // Only use scraper for categories NOT managed in admin
    return adminItem
  })
  
  // Show ALL live results from scraper (no filtering)
  // Admin categories are managed separately and take priority
  const allItems = [...mergedItems, ...liveItems]
  
  return {
    date: new Date().toISOString().split('T')[0],
    items: allItems
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
