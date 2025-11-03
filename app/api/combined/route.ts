import { NextResponse } from "next/server"
import { getSiteContent, getActiveLiveSchedules, publishLiveSchedule, getSchedules, runDueSchedules, getMonthlyResults, saveMonthlyResults } from "@/lib/local-content-store"
import { parseMonthlyTable, parseLiveResults, parseLiveResultsFast } from "@/lib/scrape"
import type { MonthlyResults } from "@/lib/types"

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
    
    // Check for cached monthly data first (use cache if less than 1 hour old)
    const monthKey = `${year}-${String(month).padStart(2, '0')}` as `${number}-${number}`
    let cachedData: MonthlyResults | null = null
    try {
      cachedData = await getMonthlyResults(monthKey)
      if (cachedData) {
        const cacheAge = new Date().getTime() - new Date(cachedData.updatedAt).getTime()
        const oneHour = 60 * 60 * 1000
        // Use cache if it's less than 1 hour old
        if (cacheAge < oneHour) {
          console.log(`Using cached monthly data for ${monthKey} (${Math.round(cacheAge / 1000 / 60)} minutes old)`)
        } else {
          // Cache is stale, clear it so we'll scrape fresh
          cachedData = null
        }
      }
    } catch (e) {
      // If cache read fails, continue with scraping
      console.error('Error reading cached data:', e)
    }
    
    const scraperData = await scrapeData(month, year, true) // Use fast scraper for live results
    
    // Always check cached data and merge it with scraper data
    // This ensures we use cached data even if scraper returns partial/empty results
    let monthlyDataToUse = scraperData.monthly
    if (cachedData) {
      console.log(`Found cached data for ${monthKey}, merging with scraped data`)
      // Convert cached MonthlyResults back to scraper format
      const cachedScraperFormat = convertCachedToScraperFormat(cachedData, month, year)
      
      // If cached data has rows, use it (even if scraper also has data, we'll merge)
      if (cachedScraperFormat.rows.length > 0) {
        // Merge: use scraper data where available, fallback to cached data
        if (scraperData.monthly && scraperData.monthly.rows.length > 0) {
        // Merge: combine columns and merge row data
        const allColumns = [...new Set([...scraperData.monthly.columns, ...cachedScraperFormat.columns])]
        const mergedRowsByDay: Record<number, { day: number; values: Array<number | null> }> = {}
        
        // First add cached data
        cachedScraperFormat.rows.forEach(row => {
          if (row.day >= 1 && row.day <= 31) {
            const cachedValues: Array<number | null> = new Array(allColumns.length).fill(null)
            cachedScraperFormat.columns.forEach((col, idx) => {
              const colIdx = allColumns.indexOf(col)
              if (colIdx !== -1 && row.values[idx] !== null) {
                cachedValues[colIdx] = row.values[idx]
              }
            })
            mergedRowsByDay[row.day] = { day: row.day, values: cachedValues }
          }
        })
        
        // Then override with fresh scraper data where available
        scraperData.monthly.rows.forEach(row => {
          if (row.day >= 1 && row.day <= 31) {
            const mergedValues: Array<number | null> = mergedRowsByDay[row.day]?.values || new Array(allColumns.length).fill(null)
            scraperData.monthly.columns.forEach((col, idx) => {
              const colIdx = allColumns.indexOf(col)
              if (colIdx !== -1 && row.values[idx] !== null) {
                mergedValues[colIdx] = row.values[idx]
              }
            })
            mergedRowsByDay[row.day] = { day: row.day, values: mergedValues }
          }
        })
        
          monthlyDataToUse = {
            month: scraperData.monthly.month,
            year: scraperData.monthly.year,
            columns: allColumns,
            rows: Object.values(mergedRowsByDay).sort((a, b) => a.day - b.day)
          }
        } else {
          // Scraper returned empty, use cached data
          console.log(`Using cached data for ${monthKey} (scraper returned empty)`)
          monthlyDataToUse = cachedScraperFormat
        }
      } else {
        // Cached data conversion failed or empty, fallback to scraper
        console.log(`Cached data conversion returned empty, using scraper data for ${monthKey}`)
        monthlyDataToUse = scraperData.monthly
      }
    } else if ((!scraperData.monthly || scraperData.monthly.rows.length === 0)) {
      console.log(`No cached data and scraper returned empty for ${monthKey}`)
    }
    
    // Save scraped monthly data to storage for future use (if we got fresh data)
    // Also merge with existing cached data to preserve any data we already have
    if (scraperData.monthly && scraperData.monthly.rows.length > 0) {
      try {
        const scrapedMonthlyData = convertScraperDataToMonthlyResults(scraperData.monthly, monthKey)
        
        // If we have cached data, merge it with scraped data to preserve all existing data
        if (cachedData && cachedData.rows.length > 0) {
          // Merge: combine rows from both sources, with scraped data taking priority
          const mergedRowsByDate: Record<string, any> = {}
          
          // First add all cached rows
          cachedData.rows.forEach(row => {
            mergedRowsByDate[row.date] = { ...row }
          })
          
          // Then merge/override with scraped data
          scrapedMonthlyData.rows.forEach(row => {
            if (mergedRowsByDate[row.date]) {
              // Merge: keep existing data, add/override with scraped data
              Object.assign(mergedRowsByDate[row.date], row)
            } else {
              // New row from scraper
              mergedRowsByDate[row.date] = row
            }
          })
          
          scrapedMonthlyData.rows = Object.values(mergedRowsByDate).sort((a, b) => 
            a.date.localeCompare(b.date)
          )
          
          // Merge fields/columns too
          const allFields = [...new Set([...cachedData.fields, ...scrapedMonthlyData.fields])]
          scrapedMonthlyData.fields = allFields
        }
        
        await saveMonthlyResults(scrapedMonthlyData)
        console.log(`Saved scraped monthly data for ${monthKey} (${scrapedMonthlyData.rows.length} rows)`)
      } catch (e) {
        console.error('Error saving scraped data:', e)
        // Continue even if save fails
      }
    }
    
    // Get active live schedules for today
    const liveSchedules = await getActiveLiveSchedules()
    
    // Auto-publish due live schedules
    const now = new Date()
    for (const schedule of liveSchedules) {
      const scheduleTime = new Date(schedule.scheduledTime)
      if (now >= scheduleTime && schedule.status === 'scheduled') {
        await publishLiveSchedule(schedule.id)
      }
    }
    
    // Auto-execute due scheduled items (this updates monthly results)
    await runDueSchedules()
    
    // Get updated schedules AFTER execution (to get fresh executed status)
    const updatedScheduledItems = await getSchedules()
    const today = new Date().toISOString().split('T')[0]
    const todayScheduledItems = updatedScheduledItems.filter(item => item.row.date === today)
    const updatedLiveSchedules = await getActiveLiveSchedules()
    
    // Reload monthly results after schedule execution (schedules may have updated the table)
    try {
      const monthKey = `${year}-${String(month).padStart(2, '0')}` as `${number}-${number}`
      const updatedCachedData = await getMonthlyResults(monthKey)
      
      if (updatedCachedData && updatedCachedData.rows.length > 0) {
        // Convert updated cached data to scraper format and merge with existing monthlyDataToUse
        const updatedScraperFormat = convertCachedToScraperFormat(updatedCachedData, month, year)
        
        if (updatedScraperFormat.rows.length > 0) {
          // Merge: combine columns and merge row data
          const allColumns = [...new Set([...monthlyDataToUse.columns, ...updatedScraperFormat.columns])]
          const mergedRowsByDay: Record<number, { day: number; values: Array<number | null> }> = {}
          
          // First add existing monthlyDataToUse data
          monthlyDataToUse.rows.forEach(row => {
            if (row.day >= 1 && row.day <= 31) {
              const existingValues: Array<number | null> = new Array(allColumns.length).fill(null)
              monthlyDataToUse.columns.forEach((col, idx) => {
                const colIdx = allColumns.indexOf(col)
                if (colIdx !== -1 && row.values[idx] !== null) {
                  existingValues[colIdx] = row.values[idx]
                }
              })
              mergedRowsByDay[row.day] = { day: row.day, values: existingValues }
            }
          })
          
          // Then override/add with updated cached data (includes executed schedules)
          updatedScraperFormat.rows.forEach(row => {
            if (row.day >= 1 && row.day <= 31) {
              const mergedValues: Array<number | null> = mergedRowsByDay[row.day]?.values || new Array(allColumns.length).fill(null)
              updatedScraperFormat.columns.forEach((col, idx) => {
                const colIdx = allColumns.indexOf(col)
                if (colIdx !== -1 && row.values[idx] !== null) {
                  mergedValues[colIdx] = row.values[idx]
                }
              })
              mergedRowsByDay[row.day] = { day: row.day, values: mergedValues }
            }
          })
          
          monthlyDataToUse = {
            month: monthlyDataToUse.month,
            year: monthlyDataToUse.year,
            columns: allColumns,
            rows: Object.values(mergedRowsByDay).sort((a, b) => a.day - b.day)
          }
        }
      }
    } catch (e) {
      // Continue if reload fails - schedule data will still show via scheduleDataByDay in createHybridData
    }
    
    const adminCategories = getAdminCategories(content)
    const hybridData = createHybridData(adminCategories, monthlyDataToUse, updatedScheduledItems, updatedLiveSchedules)
    const todayData = createTodayData(adminCategories, monthlyDataToUse, scraperData.live, updatedLiveSchedules, todayScheduledItems)
    
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
  
  // Default empty structures with proper types
  const emptyMonthly: { month: number; year: number; columns: string[]; rows: Array<{ day: number; values: Array<number | null> }> } = {
    month,
    year,
    columns: ['Faridabad', 'Ghaziabad', 'Gali', 'Desawar'],
    rows: []
  }
  
  const emptyLive: { results: Array<{ title: string; time: string; jodi: string; result: string; status: string; yesterdayResult?: string; todayResult?: string }> } = {
    results: []
  }
  
  // Try to fetch monthly data with error handling
  // For newghaziabad.com, we need to POST form data to get specific month/year data
  let monthlyData = emptyMonthly
  try {
    // Simulate the site's form POST (like /api/scrape does)
    const form = new URLSearchParams()
    form.set("dd_month", String(month))
    form.set("dd_year", String(year))
    form.set("bt_showresult", "Show Result")
    
    const targetUrl = "https://newghaziabad.com/index.php"
    const monthlyResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; v0-scraper/1.0; +https://v0.app)',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      body: form.toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })
    
    if (monthlyResponse.ok) {
      const monthlyHtml = await monthlyResponse.text()
      monthlyData = parseMonthlyTable(monthlyHtml, month, year)
      console.log(`Successfully scraped monthly data for ${year}-${month}: ${monthlyData.rows.length} rows`)
    } else {
      console.error(`Failed to fetch monthly data: ${monthlyResponse.status} ${monthlyResponse.statusText}`)
    }
  } catch (error: any) {
    console.error('Error fetching/parsing monthly data:', error.message)
    // Use empty data structure - don't throw
  }
  
  // Try to fetch live data with error handling
  let liveData = emptyLive
  try {
    const liveUrl = useFastScraper ? urls.fast : urls.original
    const liveResponse = await fetch(liveUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (liveResponse.ok) {
      const liveHtml = await liveResponse.text()
      liveData = useFastScraper ? parseLiveResultsFast(liveHtml) : parseLiveResults(liveHtml)
    } else {
      console.error(`Failed to fetch live data: ${liveResponse.status} ${liveResponse.statusText}`)
    }
  } catch (error: any) {
    console.error('Error fetching/parsing live data:', error.message)
    // Use empty data structure - don't throw
  }
  
  return {
    monthly: monthlyData,
    live: liveData
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

  // Ensure scraperData has required properties
  if (!scraperData || !scraperData.year || !scraperData.month) {
    // Return empty structure if scraperData is invalid
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1
    const defaultMonth = scraperData?.month || currentMonth
    const defaultYear = scraperData?.year || currentYear
    const daysInMonth = new Date(defaultYear, defaultMonth, 0).getDate()
    
    const adminLabels = adminCategories.map((c: any) => c.label).filter(Boolean)
    const columns = ['Faridabad', 'Ghaziabad', 'Gali', 'Desawar', ...adminLabels]
    const rows = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      rows.push({ day, values: columns.map(() => null) })
    }
    
    return {
      month: defaultMonth,
      year: defaultYear,
      columns,
      rows
    }
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const isCurrentMonth = scraperData.year === currentYear && scraperData.month === currentMonth

  // Load admin category values from simple CSV file for HISTORICAL dates only (before today)
  const adminDataByDay: Record<number, { GALI2?: string; DESAWAR2?: string; FARIDABAD2?: string; GHAZIABAD2?: string; 'LUXMI KUBER'?: string }> = {}
  try {
    const { readFileSync } = require('fs')
    const { join } = require('path')
    const csvPath = join(process.cwd(), 'dummy_gali1_2015_to_today.csv')
    const raw = readFileSync(csvPath, 'utf-8')
    const lines = raw.trim().split(/\r?\n/)
    const headers = lines[0].split(',')
    
    const idxDate = headers.indexOf('date')
    const idxGali2 = headers.indexOf('GALI2')
    const idxDesawar2 = headers.indexOf('DESAWAR2')
    const idxFaridabad2 = headers.indexOf('FARIDABAD2')
    const idxGhaziabad2 = headers.indexOf('GHAZIABAD2')
    const idxLuxmiKuber = headers.indexOf('LUXMI KUBER')
    
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
      
      // Load CSV for dates in the selected month (regardless of whether it's before today or not)
      // This ensures we have data even if scraper fails
      if (y === scraperData.year && m === scraperData.month && d >= 1 && d <= 31) {
        const data: any = {}
        if (idxGali2 !== -1 && parts[idxGali2]?.trim() && parts[idxGali2].trim() !== '--') {
          data.GALI2 = parts[idxGali2].trim().padStart(2, '0')
        }
        if (idxDesawar2 !== -1 && parts[idxDesawar2]?.trim() && parts[idxDesawar2].trim() !== '--') {
          data.DESAWAR2 = parts[idxDesawar2].trim().padStart(2, '0')
        }
        if (idxFaridabad2 !== -1 && parts[idxFaridabad2]?.trim() && parts[idxFaridabad2].trim() !== '--') {
          data.FARIDABAD2 = parts[idxFaridabad2].trim().padStart(2, '0')
        }
        if (idxGhaziabad2 !== -1 && parts[idxGhaziabad2]?.trim() && parts[idxGhaziabad2].trim() !== '--') {
          data.GHAZIABAD2 = parts[idxGhaziabad2].trim().padStart(2, '0')
        }
        if (idxLuxmiKuber !== -1 && parts[idxLuxmiKuber]?.trim() && parts[idxLuxmiKuber].trim() !== '--') {
          data['LUXMI KUBER'] = parts[idxLuxmiKuber].trim().padStart(2, '0')
        }
        if (Object.keys(data).length > 0) {
          adminDataByDay[d] = data
        }
      }
    }
  } catch (e) {
    // ignore file errors
  }

  // Load base column values (Faridabad, Ghaziabad, Gali, Desawar) from comprehensive CSV for HISTORICAL dates
  const baseDataByDay: Record<number, { FARIDABAD?: number; GHAZIABAD?: number; GALI?: number; DESAWAR?: number }> = {}
  
  // Try multiple CSV files in order of preference
  const csvFilesToTry = [
    'satta_2025_complete.csv',
    'comprehensive_historical_data.csv'
  ]
  
  let csvLoaded = false
  for (const csvFileName of csvFilesToTry) {
    if (csvLoaded) break // Stop if we already loaded data
    
    try {
      const { readFileSync, existsSync } = require('fs')
      const { join } = require('path')
      const csvPath = join(process.cwd(), csvFileName)
      
      if (!existsSync(csvPath)) continue // Skip if file doesn't exist
      
      const raw = readFileSync(csvPath, 'utf-8')
      const lines = raw.trim().split(/\r?\n/)
      if (lines.length < 2) continue // Skip if no data rows
      
      const headers = lines[0].split(',')
    
    const idxDate = headers.indexOf('date')
    const idxFrbd = headers.indexOf('frbd')  // Faridabad
    const idxGzbd = headers.indexOf('gzbd')  // Ghaziabad
    const idxGali = headers.indexOf('gali')  // Gali
    const idxDswr = headers.indexOf('dswr')  // Desawar
    
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
      
      // Load CSV for dates in the selected month (regardless of whether it's before today or not)
      // This ensures we have data even if scraper fails
      if (y === scraperData.year && m === scraperData.month && d >= 1 && d <= 31) {
        const data: any = {}
        if (idxFrbd !== -1 && parts[idxFrbd]?.trim() && parts[idxFrbd].trim() !== '--' && parts[idxFrbd].trim() !== '') {
          const val = parseInt(parts[idxFrbd].trim(), 10)
          if (!isNaN(val)) data.FARIDABAD = val
        }
        if (idxGzbd !== -1 && parts[idxGzbd]?.trim() && parts[idxGzbd].trim() !== '--' && parts[idxGzbd].trim() !== '') {
          const val = parseInt(parts[idxGzbd].trim(), 10)
          if (!isNaN(val)) data.GHAZIABAD = val
        }
        if (idxGali !== -1 && parts[idxGali]?.trim() && parts[idxGali].trim() !== '--' && parts[idxGali].trim() !== '') {
          const val = parseInt(parts[idxGali].trim(), 10)
          if (!isNaN(val)) data.GALI = val
        }
        if (idxDswr !== -1 && parts[idxDswr]?.trim() && parts[idxDswr].trim() !== '--' && parts[idxDswr].trim() !== '') {
          const val = parseInt(parts[idxDswr].trim(), 10)
          if (!isNaN(val)) data.DESAWAR = val
        }
        if (Object.keys(data).length > 0) {
          baseDataByDay[d] = data
          csvLoaded = true // Mark that we found at least some data
        }
      }
      }
    } catch (e) {
      // Try next file if this one fails
      continue
    }
  }

  // Load schedule data for today and future dates (admin columns from schedules)
  const scheduleDataByDay: Record<number, { GALI2?: string; DESAWAR2?: string; FARIDABAD2?: string; GHAZIABAD2?: string; 'LUXMI KUBER'?: string }> = {}
  
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
        
        // Find the admin category that matches this schedule key
        // Schedules use category keys (e.g., "desawar1"), but we need to map to labels (e.g., "DESAWAR2")
        const matchingCategory = adminCategories.find((cat: any) => norm(cat.key) === norm(scheduleKey))
        const categoryLabel = matchingCategory?.label || scheduleKey
        
        // Normalize the category label to determine which table column to update
        const normalizedLabel = norm(categoryLabel)
        const value = schedule.row[scheduleKey]?.toString()?.trim()
        
        // Only set if value exists and is not empty/--
        if (value && value !== '--' && value !== '') {
          if (!scheduleDataByDay[d]) scheduleDataByDay[d] = {}
          
          // Set the value for the matching category using the label (not the key)
          // This handles cases where keys are "desawar1" but labels are "DESAWAR2"
          if (normalizedLabel === 'GALI2' || normalizedLabel === 'GALI1') {
            scheduleDataByDay[d].GALI2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'DESAWAR2' || normalizedLabel === 'DESAWAR1') {
            scheduleDataByDay[d].DESAWAR2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'FARIDABAD2' || normalizedLabel === 'FARIDABAD1') {
            scheduleDataByDay[d].FARIDABAD2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'GHAZIABAD2' || normalizedLabel === 'GHAZIABAD1') {
            scheduleDataByDay[d].GHAZIABAD2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'LUXMI KUBER') {
            scheduleDataByDay[d]['LUXMI KUBER'] = value.padStart(2, '0')
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
          if (categoryKey === 'GALI2') scheduleDataByDay[scheduleDay].GALI2 = value.padStart(2, '0')
          if (categoryKey === 'DESAWAR2') scheduleDataByDay[scheduleDay].DESAWAR2 = value.padStart(2, '0')
          if (categoryKey === 'FARIDABAD2') scheduleDataByDay[scheduleDay].FARIDABAD2 = value.padStart(2, '0')
          if (categoryKey === 'GHAZIABAD2') scheduleDataByDay[scheduleDay].GHAZIABAD2 = value.padStart(2, '0')
          if (categoryKey === 'LUXMI KUBER') scheduleDataByDay[scheduleDay]['LUXMI KUBER'] = value.padStart(2, '0')
        }
      }
    }
  })

  // Build a lookup for API column indices
  const apiIndex: Record<string, number> = {}
  if (scraperData.columns && Array.isArray(scraperData.columns)) {
    scraperData.columns.forEach((label: string, idx: number) => {
      apiIndex[norm(label)] = idx
    })
  }

  // Find admin labels (case-insensitive)
  const adminLabelMap: Record<string, string | undefined> = {
    FARIDABAD2: adminCategories.find(c => norm(c.label) === 'FARIDABAD2')?.label,
    GHAZIABAD2: adminCategories.find(c => norm(c.label) === 'GHAZIABAD2')?.label,
    GALI2: adminCategories.find(c => norm(c.label) === 'GALI2')?.label,
    DESAWAR2: adminCategories.find(c => norm(c.label) === 'DESAWAR2')?.label,
  }

  // Custom column order as requested:
  // FARIDABAD, FARIDABAD2, GHAZIABAD, GHAZIABAD2, GALI, GALI2, DESAWAR, DESAWAR2, LUXMI KUBER
  const desiredOrder: string[] = []
  const pushIf = (label?: string) => { if (label) desiredOrder.push(label) }

  // Base API column labels
  const baseApiPretty: Record<string, string> = {
    FARIDABAD: 'Faridabad',
    GHAZIABAD: 'Ghaziabad',
    GALI: 'Gali',
    DESAWAR: 'Desawar',
  }

  // Build the ordered columns list in the specified order
  // 1. FARIDABAD
  if (apiIndex['FARIDABAD'] !== undefined) {
    desiredOrder.push(baseApiPretty['FARIDABAD'])
  }
  // 2. FARIDABAD2
  pushIf(adminLabelMap['FARIDABAD2'])
  
  // 3. GHAZIABAD
  if (apiIndex['GHAZIABAD'] !== undefined) {
    desiredOrder.push(baseApiPretty['GHAZIABAD'])
  }
  // 4. GHAZIABAD2
  pushIf(adminLabelMap['GHAZIABAD2'])
  
  // 5. GALI
  if (apiIndex['GALI'] !== undefined) {
    desiredOrder.push(baseApiPretty['GALI'])
  }
  // 6. GALI2
  pushIf(adminLabelMap['GALI2'])
  
  // 7. DESAWAR
  if (apiIndex['DESAWAR'] !== undefined) {
    desiredOrder.push(baseApiPretty['DESAWAR'])
  }
  // 8. DESAWAR2
  pushIf(adminLabelMap['DESAWAR2'])

  // Append any extra admin categories (not the 4 twins), to the right (like LUXMI KUBER)
  const reservedAdmin = new Set(['FARIDABAD2','GHAZIABAD2','GALI2','DESAWAR2'])
  const extraAdmins = adminCategories
    .map((c: any) => c.label)
    .filter((label: string) => !reservedAdmin.has(norm(label)))
  desiredOrder.push(...extraAdmins)

  // Build lookup for scraper data by day
  const scraperByDay: Record<number, any> = {}
  if (scraperData.rows && Array.isArray(scraperData.rows)) {
    scraperData.rows.forEach((row: any) => {
      if (row && row.day >= 1 && row.day <= 31) {
        scraperByDay[row.day] = row
      }
    })
  }

  // Generate rows for ALL days of the month (1-31)
  const daysInMonth = new Date(scraperData.year, scraperData.month, 0).getDate()
  const rows = []
  
  for (let day = 1; day <= daysInMonth; day++) {
    const scraperRow = scraperByDay[day]
    const values = desiredOrder.map((label) => {
      const key = norm(label)
      // Base API columns: Use scraper data first, then fallback to CSV historical data
      if (key === 'FARIDABAD' || key === 'GHAZIABAD' || key === 'GALI' || key === 'DESAWAR') {
        // Try scraper data first
        if (scraperRow) {
          const idx = apiIndex[key]
          const scraperValue = idx !== undefined ? scraperRow.values[idx] ?? null : null
          if (scraperValue !== null) {
            return scraperValue
          }
        }
        // Fallback to CSV historical data if scraper has no data
        const csvDayData = baseDataByDay[day]
        if (csvDayData) {
          if (key === 'FARIDABAD' && csvDayData.FARIDABAD !== undefined) return csvDayData.FARIDABAD
          if (key === 'GHAZIABAD' && csvDayData.GHAZIABAD !== undefined) return csvDayData.GHAZIABAD
          if (key === 'GALI' && csvDayData.GALI !== undefined) return csvDayData.GALI
          if (key === 'DESAWAR' && csvDayData.DESAWAR !== undefined) return csvDayData.DESAWAR
        }
        return null
      }
      // Admin categories: Use schedule data (priority) for today/future, CSV for historical
      const scheduleDayData = scheduleDataByDay[day]
      const csvDayData = adminDataByDay[day]
      
      if (key === 'GALI2') {
        const scheduleVal = scheduleDayData?.GALI2
        const csvVal = csvDayData?.GALI2
        if (scheduleVal) return parseInt(scheduleVal, 10)
        if (csvVal) return parseInt(csvVal, 10)
        return null
      }
      if (key === 'DESAWAR2') {
        const scheduleVal = scheduleDayData?.DESAWAR2
        const csvVal = csvDayData?.DESAWAR2
        if (scheduleVal) return parseInt(scheduleVal, 10)
        if (csvVal) return parseInt(csvVal, 10)
        return null
      }
      if (key === 'FARIDABAD2') {
        const scheduleVal = scheduleDayData?.FARIDABAD2
        const csvVal = csvDayData?.FARIDABAD2
        if (scheduleVal) return parseInt(scheduleVal, 10)
        if (csvVal) return parseInt(csvVal, 10)
        return null
      }
      if (key === 'GHAZIABAD2') {
        const scheduleVal = scheduleDayData?.GHAZIABAD2
        const csvVal = csvDayData?.GHAZIABAD2
        if (scheduleVal) return parseInt(scheduleVal, 10)
        if (csvVal) return parseInt(csvVal, 10)
        return null
      }
      // LUXMI KUBER: Use schedule data (priority) for today/future, CSV for historical
      if (key === 'LUXMI KUBER') {
        const scheduleVal = scheduleDayData?.['LUXMI KUBER']
        const csvVal = csvDayData?.['LUXMI KUBER']
        if (scheduleVal) return parseInt(scheduleVal, 10)
        if (csvVal) return parseInt(csvVal, 10)
        return null
      }
      // Other admin columns - check if they have scheduled data
      const matchingSchedule = scheduleDayData?.[key as keyof typeof scheduleDayData]
      if (matchingSchedule) return parseInt(matchingSchedule, 10)
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
  // Normalize helper
  const norm = (s: string) => (s || '').toUpperCase().trim()
  
  // Get yesterday's date for fetching yesterday's results
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const yesterdayDay = yesterday.getDate()
  
  // Build a lookup for yesterday's results from monthly data
  const yesterdayResults: Record<string, string> = {}
  if (scraperData && scraperData.rows && Array.isArray(scraperData.rows)) {
    // Find yesterday's row in the monthly data
    const yesterdayRow = scraperData.rows.find((row: any) => row.day === yesterdayDay)
    if (yesterdayRow && yesterdayRow.values && scraperData.columns) {
      scraperData.columns.forEach((col: string, idx: number) => {
        const val = yesterdayRow.values[idx]
        if (val !== null && val !== undefined) {
          // Map column names to category labels
          const normalizedCol = norm(col)
          if (normalizedCol === 'GALI' || normalizedCol === 'GALI1' || normalizedCol === 'GALI2') {
            yesterdayResults['GALI2'] = String(val).padStart(2, '0')
          } else if (normalizedCol === 'DESAWAR' || normalizedCol === 'DESAWAR1' || normalizedCol === 'DESAWAR2') {
            yesterdayResults['DESAWAR2'] = String(val).padStart(2, '0')
          } else if (normalizedCol === 'FARIDABAD' || normalizedCol === 'FARIDABAD1' || normalizedCol === 'FARIDABAD2') {
            yesterdayResults['FARIDABAD2'] = String(val).padStart(2, '0')
          } else if (normalizedCol === 'GHAZIABAD' || normalizedCol === 'GHAZIABAD1' || normalizedCol === 'GHAZIABAD2') {
            yesterdayResults['GHAZIABAD2'] = String(val).padStart(2, '0')
          } else if (normalizedCol === 'LUXMI KUBER') {
            yesterdayResults['LUXMI KUBER'] = String(val).padStart(2, '0')
          }
        }
      })
    }
  }
  
  // Also check CSV/executed schedules for yesterday's results
  // This ensures we get yesterday's results even if monthly data doesn't have it
  try {
    const { readFileSync } = require('fs')
    const { join } = require('path')
    const csvFile = join(process.cwd(), 'dummy_gali1_2015_to_today.csv')
    const csvContent = readFileSync(csvFile, 'utf-8')
    const lines = csvContent.split('\n').filter((l: string) => l.trim())
    
    if (lines.length > 0) {
      const header = lines[0].split(',').map((h: string) => h.trim())
      const dateIdx = header.indexOf('date')
      
      // Find yesterday's row
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',')
        if (dateIdx !== -1 && parts[dateIdx]?.trim() === yesterdayStr) {
          // Found yesterday's row, extract admin category values
          const gal2Idx = header.findIndex((h: string) => norm(h) === 'GALI2')
          const des2Idx = header.findIndex((h: string) => norm(h) === 'DESAWAR2')
          const far2Idx = header.findIndex((h: string) => norm(h) === 'FARIDABAD2')
          const ghz2Idx = header.findIndex((h: string) => norm(h) === 'GHAZIABAD2')
          const luxIdx = header.findIndex((h: string) => norm(h) === 'LUXMI KUBER')
          
          if (gal2Idx !== -1 && parts[gal2Idx]?.trim() && parts[gal2Idx].trim() !== '--') {
            yesterdayResults['GALI2'] = parts[gal2Idx].trim().padStart(2, '0')
          }
          if (des2Idx !== -1 && parts[des2Idx]?.trim() && parts[des2Idx].trim() !== '--') {
            yesterdayResults['DESAWAR2'] = parts[des2Idx].trim().padStart(2, '0')
          }
          if (far2Idx !== -1 && parts[far2Idx]?.trim() && parts[far2Idx].trim() !== '--') {
            yesterdayResults['FARIDABAD2'] = parts[far2Idx].trim().padStart(2, '0')
          }
          if (ghz2Idx !== -1 && parts[ghz2Idx]?.trim() && parts[ghz2Idx].trim() !== '--') {
            yesterdayResults['GHAZIABAD2'] = parts[ghz2Idx].trim().padStart(2, '0')
          }
          if (luxIdx !== -1 && parts[luxIdx]?.trim() && parts[luxIdx].trim() !== '--') {
            yesterdayResults['LUXMI KUBER'] = parts[luxIdx].trim().padStart(2, '0')
          }
          break
        }
      }
    }
  } catch (e) {
    // If CSV read fails, continue with what we have from monthly data
  }
  
  // Create items from admin categories (empty placeholders)
  // Store both key and label - key for matching schedules, label for display
  const adminItems = adminCategories.map(cat => ({ 
    category: cat.label, // Display label
    categoryKey: cat.key, // Store key for matching with schedule row keys
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
      const adminName = norm(adminItem.category)
      const scheduleName = norm(schedule.category)
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
      // Match using category KEY (not label) - schedules use keys like "desawar2"
      const adminKey = norm(adminItem.categoryKey || adminItem.category)
      const scheduleKey = Object.keys(schedule.row).find(key => key !== 'date' && key.trim() !== '')
      if (!scheduleKey) return false
      const scheduleName = norm(scheduleKey)
      const scheduleDate = schedule.row.date
      
      // Only match if: category KEY matches AND schedule is for TODAY
      return scheduleName === adminKey && scheduleDate === today
    })
    
    if (matchingScheduledItem) {
      const scheduleKey = Object.keys(matchingScheduledItem.row).find(key => key !== 'date' && key.trim() !== '')
      if (!scheduleKey) {
        // Default admin-managed placeholder
        return adminItem
      }
      const scheduleValue = matchingScheduledItem.row[scheduleKey]
      const publishTime = new Date(matchingScheduledItem.publishAt)
      
      // If publish time has passed, show the result in Live Results (auto-publish)
      // This ensures scheduled results automatically appear when time arrives
      if (now >= publishTime) {
        // Get yesterday's result for this category
        const categoryLabel = norm(adminItem.category)
        const yesterdayValue = yesterdayResults[categoryLabel] || '--'
        
        return {
          ...adminItem,
          value: scheduleValue?.toString() || '--', // Today's result (main display)
          time: adminItem.time, // Keep default time from category
          jodi: scheduleValue?.toString() || '--',
          status: 'pass',
          yesterdayResult: yesterdayValue, // Yesterday's actual result
          todayResult: scheduleValue?.toString() || '--', // Today's scheduled result
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
    
    // Default admin-managed placeholder - but include yesterday's result if available
    const categoryLabel = norm(adminItem.category)
    const yesterdayValue = yesterdayResults[categoryLabel]
    
    return {
      ...adminItem,
      yesterdayResult: yesterdayValue || '--'
    }
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

// Convert scraper data format to MonthlyResults format for storage
function convertScraperDataToMonthlyResults(scraperData: { month: number; year: number; columns: string[]; rows: Array<{ day: number; values: Array<number | null> }> }, monthKey: `${number}-${number}`): MonthlyResults {
  const fields = scraperData.columns || []
  const rows = scraperData.rows.map((row) => {
    const date = `${scraperData.year}-${String(scraperData.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
    const resultRow: any = { date }
    
    // Map column values to field names
    fields.forEach((field, idx) => {
      const value = row.values[idx]
      if (value !== null && value !== undefined) {
        // Convert field name to lowercase key (e.g., "Faridabad" -> "faridabad")
        const key = field.toLowerCase()
        resultRow[key] = String(value).padStart(2, '0')
      }
    })
    
    return resultRow
  })
  
  return {
    month: monthKey,
    fields,
    rows,
    updatedAt: new Date().toISOString()
  }
}

// Convert cached MonthlyResults back to scraper format
function convertCachedToScraperFormat(cachedData: MonthlyResults, month: number, year: number): { month: number; year: number; columns: string[]; rows: Array<{ day: number; values: Array<number | null> }> } {
  // Map cached fields to expected scraper column names
  // Cached might have: Desawar, Disawar, Faridabad, Ghaziabad, Gali
  // We need: Faridabad, Ghaziabad, Gali, Desawar (standardized)
  const fieldMapping: Record<string, string> = {
    'faridabad': 'Faridabad',
    'ghaziabad': 'Ghaziabad',
    'gali': 'Gali',
    'desawar': 'Desawar',
    'disawar': 'Desawar', // Disawar and Desawar are the same
    'firozabad': 'Firozabad' // Keep Firozabad if it exists
  }
  
  // Get unique column names from cached fields, mapped to standard names
  const uniqueColumns = new Set<string>()
  cachedData.fields?.forEach(field => {
    const mapped = fieldMapping[field.toLowerCase()] || field
    uniqueColumns.add(mapped)
  })
  
  // Ensure we have the standard base columns in the right order
  const standardColumns = ['Faridabad', 'Ghaziabad', 'Gali', 'Desawar']
  const columns: string[] = []
  standardColumns.forEach(col => {
    if (uniqueColumns.has(col)) {
      columns.push(col)
      uniqueColumns.delete(col)
    }
  })
  // Add any remaining columns
  Array.from(uniqueColumns).forEach(col => columns.push(col))
  
  const rows = cachedData.rows.map((row) => {
    // Extract day from date string (YYYY-MM-DD)
    const dateMatch = row.date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const day = dateMatch ? parseInt(dateMatch[3], 10) : 1
    
    const values = columns.map((column) => {
      // Try to find the value in the row data
      // Check both the exact column name and variations
      const colLower = column.toLowerCase()
      const possibleKeys = [
        colLower,
        colLower.replace('desawar', 'disawar'), // Try disawar variant
        colLower.replace('disawar', 'desawar'), // Try desawar variant
        // Also try checking all row keys if exact match fails
        ...(colLower === 'desawar' ? ['disawar', 'desawar'] : []),
        ...(colLower === 'disawar' ? ['desawar', 'disawar'] : [])
      ]
      
      // Remove duplicates
      const uniqueKeys = [...new Set(possibleKeys)]
      
      for (const key of uniqueKeys) {
        const value = row[key as keyof typeof row]
        if (value !== undefined && value !== null && value !== '--' && value !== '') {
          const numValue = parseInt(String(value), 10)
          if (!isNaN(numValue)) {
            return numValue
          }
        }
      }
      return null
    })
    
    return { day, values }
  })
  
  return {
    month,
    year,
    columns,
    rows
  }
}
