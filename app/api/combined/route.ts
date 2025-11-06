import { NextResponse } from "next/server"
import { getSiteContent, getSchedules, runDueSchedules, getMonthlyResults, saveMonthlyResults } from "@/lib/local-content-store"
import { parseMonthlyTable, parseLiveResults, parseLiveResultsFast } from "@/lib/scrape"
import type { MonthlyResults } from "@/lib/types"
import { getAdminDataForMonth, getBaseDataForMonth, getAdminDataForDate, preloadCaches } from "@/lib/csv-cache"
import { getAdminResults, getScrapedResults } from "@/lib/supabase-db"

// Preload CSV caches on module load (runs once when server starts)
let cachePreloaded = false
if (typeof window === 'undefined' && !cachePreloaded) {
  cachePreloaded = true
  // Preload in background (don't block)
  preloadCaches().catch(console.error)
}

const DEFAULT_CATEGORIES = [
  { key: "ghaziabad1", label: "GHAZIABAD1", showInToday: true },
  { key: "gali1", label: "GALI1", showInToday: true },
  { key: "faridabad1", label: "FARIDABAD1", showInToday: true },
  { key: "desawar1", label: "DESAWAR1", showInToday: true },
]

// Optimized cache headers: Allow stale-while-revalidate for better performance
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600, max-age=60", // 2 min CDN cache, 10 min stale, 60s browser cache
  "Pragma": "no-cache",
}

// In-memory cache for deletion markers (CSV read is expensive)
let deletionMarkersCache: { data: Set<string>; timestamp: number } | null = null
const DELETION_MARKERS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(req: Request) {
  try {
    const { month, year } = getParams(req)
    const content = await getContentWithFallback()
    
    // Check for cached monthly data first (use cache if less than 30 minutes old - SKIP scraping if fresh)
    const monthKey = `${year}-${String(month).padStart(2, '0')}` as `${number}-${number}`
    let cachedData: MonthlyResults | null = null
    let shouldScrape = true // Only scrape if cache is stale or missing
    try {
      cachedData = await getMonthlyResults(monthKey)
      if (cachedData) {
        const cacheAge = new Date().getTime() - new Date(cachedData.updatedAt).getTime()
        const thirtyMinutes = 30 * 60 * 1000 // 30 minutes - if cache is fresh, skip scraping
        // Use cache if it's less than 30 minutes old - SKIP EXPENSIVE SCRAPING
        if (cacheAge < thirtyMinutes) {
          shouldScrape = false // Skip scraping - use cached data only
          // Only log if cache is relatively fresh (less than 5 minutes) to reduce noise
          if (cacheAge < 5 * 60 * 1000) {
            console.log(`✅ Using cached monthly data for ${monthKey} (${Math.round(cacheAge / 1000 / 60)} minutes old) - SKIPPING scrape`)
          }
        } else {
          // Cache is stale (> 30 min), we'll scrape fresh in background
          console.log(`⚠️ Cache stale for ${monthKey} (${Math.round(cacheAge / 1000 / 60)} minutes old) - will scrape in background`)
        }
      }
    } catch (e) {
      // If cache read fails, continue with scraping (silent fail for performance)
    }
    
    // OPTIMIZATION: Only scrape if cache is stale or missing - run in background if cache exists
    let scraperData: any = { monthly: { month, year, columns: [], rows: [] }, live: { results: [] } }
    if (shouldScrape) {
      // Scrape synchronously only if no cache exists
      if (!cachedData) {
        scraperData = await scrapeData(month, year, true) // Use fast scraper for live results
      } else {
        // Cache exists but stale - scrape in background (don't wait)
        scrapeData(month, year, true).then(async (scraped) => {
          try {
            const scrapedMonthlyData = convertScraperDataToMonthlyResults(scraped.monthly, monthKey)
            await saveMonthlyResults(scrapedMonthlyData)
          } catch (e) {
            // Silent fail - background update
          }
        }).catch(() => {}) // Silent fail for background scraping
      }
    }
    
    // Always check cached data and merge it with scraper data
    // This ensures we use cached data even if scraper returns partial/empty results
    let monthlyDataToUse = scraperData.monthly
    if (cachedData) {
      // Only log if merging (not for every request to reduce noise)
      
      // IMPORTANT: Clean cached data BEFORE converting to filter out deleted admin columns
      const cleanedCachedData = {
        ...cachedData,
        rows: cachedData.rows.map((row: any) => {
          const cleanedRow: any = { date: row.date }
          // Copy base columns (not admin columns)
          Object.keys(row).forEach(key => {
            if (key !== 'date') {
              const keyLower = key.toLowerCase()
              const isAdminColumn = keyLower.includes('gali2') || keyLower.includes('desawar2') || 
                                   keyLower.includes('faridabad2') || keyLower.includes('ghaziabad2') || 
                                   keyLower.includes('luxmi') || keyLower === 'gal12'
              
              if (!isAdminColumn) {
                // Base column - always include
                cleanedRow[key] = row[key]
              } else {
                // Admin column - only include if not deleted (not '--', null, or empty)
                const value = row[key]
                if (value && value !== '--' && value !== '' && value !== null && value !== undefined) {
                  cleanedRow[key] = value
                }
                // If deleted, skip it (don't add to cleanedRow)
              }
            }
          })
          return cleanedRow
        })
      }
      
      // Convert cleaned cached MonthlyResults back to scraper format
      const cachedScraperFormat = convertCachedToScraperFormat(cleanedCachedData, month, year)
      
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
        scraperData.monthly.rows.forEach((row: { day: number; values: Array<number | null> }) => {
          if (row.day >= 1 && row.day <= 31) {
            const mergedValues: Array<number | null> = mergedRowsByDay[row.day]?.values || new Array(allColumns.length).fill(null)
            scraperData.monthly.columns.forEach((col: string, idx: number) => {
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
    // OPTIMIZATION: Only save if we actually scraped (not skipped)
    if (shouldScrape && scraperData.monthly && scraperData.monthly.rows.length > 0) {
      try {
        const scrapedMonthlyData = convertScraperDataToMonthlyResults(scraperData.monthly, monthKey)
        
        // If we have cached data, merge it with scraped data to preserve all existing data
        // IMPORTANT: Filter out deleted admin columns (those with '--', null, or empty) from cached data
        if (cachedData && cachedData.rows.length > 0) {
          // Merge: combine rows from both sources, with scraped data taking priority
          const mergedRowsByDate: Record<string, any> = {}
          
          // First add all cached rows, but FILTER OUT deleted admin columns
          cachedData.rows.forEach(row => {
            const cleanedRow: any = { date: row.date }
            // Copy base columns (not admin columns)
            Object.keys(row).forEach(key => {
              if (key !== 'date') {
                const keyLower = key.toLowerCase()
                const isAdminColumn = keyLower.includes('gali2') || keyLower.includes('desawar2') || 
                                     keyLower.includes('faridabad2') || keyLower.includes('ghaziabad2') || 
                                     keyLower.includes('luxmi') || keyLower === 'gal12'
                
                if (!isAdminColumn) {
                  // Base column - always include
                  cleanedRow[key] = row[key]
                } else {
                  // Admin column - only include if not deleted (not '--', null, or empty)
                  const value = row[key]
                  if (value && value !== '--' && value !== '' && value !== null && value !== undefined) {
                    cleanedRow[key] = value
                  }
                  // If deleted, skip it (don't add to cleanedRow)
                }
              }
            })
            mergedRowsByDate[row.date] = cleanedRow
          })
          
          // Then merge/override with scraped data
          scrapedMonthlyData.rows.forEach(row => {
            if (mergedRowsByDate[row.date]) {
              // Merge: keep existing cleaned data, add/override with scraped data
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
    
    // OPTIMIZATION: Run schedule execution in parallel with other operations
    // Auto-execute due scheduled items (use local version for now - faster)
    const scheduleExecutionPromise = runDueSchedules()
    
    // Get schedules (will be updated after execution completes)
    // Start fetching schedules immediately (parallel with execution)
    const schedulesPromise = getSchedules()
    
    // Wait for both to complete
    await scheduleExecutionPromise
    const updatedScheduledItems = await schedulesPromise
    const today = new Date().toISOString().split('T')[0]
    // Pass ALL schedules to createTodayData - it will filter based on publish time and execution status
    // This ensures schedules that have passed publish time (even if not yet marked executed) are included
    const todayScheduledItems = updatedScheduledItems
    
    // Reload monthly results after schedule execution (schedules may have updated the table)
    // IMPORTANT: Filter out deleted admin columns from monthly_results.json
    try {
      const monthKey = `${year}-${String(month).padStart(2, '0')}` as `${number}-${number}`
      const updatedCachedData = await getMonthlyResults(monthKey)
      
      if (updatedCachedData && updatedCachedData.rows.length > 0) {
        // Clean up deleted admin columns from cached data BEFORE converting
        // Remove admin columns that have '--', null, or empty values
        const cleanedCachedData = {
          ...updatedCachedData,
          rows: updatedCachedData.rows.map((row: any) => {
            const cleanedRow: any = { date: row.date }
            // Copy base columns (not admin columns)
            Object.keys(row).forEach(key => {
              if (key !== 'date') {
                const keyLower = key.toLowerCase()
                const isAdminColumn = keyLower.includes('gali2') || keyLower.includes('desawar2') || 
                                     keyLower.includes('faridabad2') || keyLower.includes('ghaziabad2') || 
                                     keyLower.includes('luxmi') || keyLower === 'gal12'
                
                if (!isAdminColumn) {
                  // Base column - always include
                  cleanedRow[key] = row[key]
                } else {
                  // Admin column - only include if not deleted (not '--', null, or empty)
                  const value = row[key]
                  if (value && value !== '--' && value !== '' && value !== null && value !== undefined) {
                    cleanedRow[key] = value
                  }
                  // If deleted, skip it (don't add to cleanedRow)
                }
              }
            })
            return cleanedRow
          })
        }
        
        // Convert cleaned cached data to scraper format and merge with existing monthlyDataToUse
        const updatedScraperFormat = convertCachedToScraperFormat(cleanedCachedData, month, year)
        
        if (updatedScraperFormat.rows.length > 0) {
          // Merge: combine columns and merge row data
          const allColumns = [...new Set([...monthlyDataToUse.columns, ...updatedScraperFormat.columns])]
          const mergedRowsByDay: Record<number, { day: number; values: Array<number | null> }> = {}
          
          // First add existing monthlyDataToUse data
          monthlyDataToUse.rows.forEach((row: { day: number; values: Array<number | null> }) => {
            if (row.day >= 1 && row.day <= 31) {
              const existingValues: Array<number | null> = new Array(allColumns.length).fill(null)
              monthlyDataToUse.columns.forEach((col: string, idx: number) => {
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
    const hybridData = await createHybridData(adminCategories, monthlyDataToUse, updatedScheduledItems)
    const todayData = await createTodayData(adminCategories, monthlyDataToUse, scraperData.live, todayScheduledItems)
    
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
  
  // OPTIMIZATION: Run monthly and live scraping in PARALLEL for faster response
  let monthlyData = emptyMonthly
  let liveData = emptyLive
  
  try {
    const form = new URLSearchParams()
    form.set("dd_month", String(month))
    form.set("dd_year", String(year))
    form.set("bt_showresult", "Show Result")
    
    const [monthlyResult, liveResult] = await Promise.allSettled([
      // Monthly data - POST request
      fetch("https://newghaziabad.com/index.php", {
        method: "POST",
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; v0-scraper/1.0; +https://v0.app)',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
        body: form.toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(6000) // 6 second timeout (reduced)
      }).then(res => res.ok ? res.text() : Promise.reject(new Error('Monthly fetch failed'))),
      
      // Live data - GET request
      fetch(useFastScraper ? urls.fast : urls.original, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: "no-store",
        signal: AbortSignal.timeout(4000) // 4 second timeout (reduced)
      }).then(res => res.ok ? res.text() : Promise.reject(new Error('Live fetch failed')))
    ])
    
    // Process monthly data
    if (monthlyResult.status === 'fulfilled') {
      try {
        monthlyData = parseMonthlyTable(monthlyResult.value, month, year)
        console.log(`✅ Successfully scraped monthly data for ${year}-${month}: ${monthlyData.rows.length} rows`)
      } catch (e) {
        // Silent fail - use empty data
      }
    }
    
    // Process live data
    if (liveResult.status === 'fulfilled') {
      try {
        liveData = useFastScraper ? parseLiveResultsFast(liveResult.value) : parseLiveResults(liveResult.value)
      } catch (e) {
        // Silent fail - use empty data
      }
    }
  } catch (error: any) {
    // Silent fail - return empty data structures
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

async function createHybridData(adminCategories: any[], scraperData: any, scheduledItems: any[] = []) {
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

  // CRITICAL: Check for deleted schedules - if a schedule was deleted, we should NOT show its Supabase value
  // We need to check if there are any schedules that were deleted (not in scheduledItems but exist in Supabase)
  // IMPORTANT: Read CSV directly (not through cache) to check for '--' deletion markers
  // The cache filters out '--' values, so we need to read the raw CSV file
  // OPTIMIZATION: Cache deletion markers in memory to avoid reading CSV on every request
  let deletedFromCSV = new Set<string>() // Format: "YYYY-MM-DD:CATEGORY"
  const now = Date.now()
  
  // Check if we have cached deletion markers
  if (deletionMarkersCache && (now - deletionMarkersCache.timestamp < DELETION_MARKERS_CACHE_TTL)) {
    deletedFromCSV = deletionMarkersCache.data
    // Filter to only the selected month for efficiency
    const filtered = new Set<string>()
    deletedFromCSV.forEach(key => {
      const [dateStr] = key.split(':')
      const rowYear = parseInt(dateStr.substring(0, 4))
      const rowMonth = parseInt(dateStr.substring(5, 7))
      if (rowYear === scraperData.year && rowMonth === scraperData.month) {
        filtered.add(key)
      }
    })
    deletedFromCSV = filtered
  } else {
    // Load fresh deletion markers
    try {
      const { readFile } = require('fs/promises')
    const { join } = require('path')
    const csvPath = join(process.cwd(), 'dummy_gali1_2015_to_today.csv')
      const csvContent = await readFile(csvPath, 'utf-8')
      const lines = csvContent.trim().split(/\r?\n/)
      
      if (lines.length > 0) {
        const header = lines[0].split(',').map((h: string) => h.trim())
        const dateColIdx = header.indexOf('date')
        const gal2ColIdx = header.indexOf('GALI2')
        const desawar2ColIdx = header.indexOf('DESAWAR2')
        const faridabad2ColIdx = header.indexOf('FARIDABAD2')
        const ghaziabad2ColIdx = header.indexOf('GHAZIABAD2')
        const luxmiKuberColIdx = header.indexOf('LUXMI KUBER')
        
        // Check all rows (cache all, not just current month)
    for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',')
          if (parts.length < 2 || dateColIdx === -1) continue
          
          const dateStr = parts[dateColIdx]?.trim()
          if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue
          
          // Check each column for '--' (deletion marker)
          if (gal2ColIdx !== -1 && (parts[gal2ColIdx]?.trim() === '--' || !parts[gal2ColIdx]?.trim())) {
            deletedFromCSV.add(`${dateStr}:GALI2`)
          }
          if (desawar2ColIdx !== -1 && (parts[desawar2ColIdx]?.trim() === '--' || !parts[desawar2ColIdx]?.trim())) {
            deletedFromCSV.add(`${dateStr}:DESAWAR2`)
          }
          if (faridabad2ColIdx !== -1 && (parts[faridabad2ColIdx]?.trim() === '--' || !parts[faridabad2ColIdx]?.trim())) {
            deletedFromCSV.add(`${dateStr}:FARIDABAD2`)
          }
          if (ghaziabad2ColIdx !== -1 && (parts[ghaziabad2ColIdx]?.trim() === '--' || !parts[ghaziabad2ColIdx]?.trim())) {
            deletedFromCSV.add(`${dateStr}:GHAZIABAD2`)
          }
          if (luxmiKuberColIdx !== -1 && (parts[luxmiKuberColIdx]?.trim() === '--' || !parts[luxmiKuberColIdx]?.trim())) {
            deletedFromCSV.add(`${dateStr}:LUXMI KUBER`)
          }
        }
        
        // Cache the deletion markers (all dates, filter by month when using)
        deletionMarkersCache = { data: deletedFromCSV, timestamp: now }
        
        // Filter to only selected month for logging
        const monthFiltered = new Set<string>()
        deletedFromCSV.forEach(key => {
          const [dateStr] = key.split(':')
          const rowYear = parseInt(dateStr.substring(0, 4))
          const rowMonth = parseInt(dateStr.substring(5, 7))
          if (rowYear === scraperData.year && rowMonth === scraperData.month) {
            monthFiltered.add(key)
          }
        })
        
        if (monthFiltered.size > 0) {
          console.log(`✅ Loaded ${monthFiltered.size} deletion markers for ${scraperData.year}-${scraperData.month} (from cache: ${deletionMarkersCache ? 'yes' : 'no'})`)
        }
      }
    } catch (e) {
      console.error('Error reading CSV for deletion markers:', e)
    }
  }

  // Load admin data from Supabase first, fallback to CSV if Supabase is empty/not configured
  // OPTIMIZATION: Parallelize Supabase and CSV loading where possible
  let adminDataByDay: Record<number, any> = {}
  try {
    // Calculate date range for the month
    const startDate = `${scraperData.year}-${String(scraperData.month).padStart(2, '0')}-01`
    const daysInMonth = new Date(scraperData.year, scraperData.month, 0).getDate()
    const endDate = `${scraperData.year}-${String(scraperData.month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    
    // Try Supabase first (with timeout to avoid hanging)
    const supabaseAdminData = await Promise.race([
      getAdminResults(startDate, endDate),
      new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000)) // 2s timeout
    ])
    
    if (supabaseAdminData && supabaseAdminData.length > 0) {
      // Convert Supabase data to day-indexed format
      // STRICT filtering: Only include fields that have actual valid numeric values
      // NULL, undefined, empty string, '--', 'null' are all treated as deleted
      // CRITICAL: Also exclude values that were deleted according to CSV (deletedFromCSV set)
      for (const row of supabaseAdminData) {
        const day = parseInt(row.date.split('-')[2])
        if (day >= 1 && day <= 31) {
          const rowDate = `${scraperData.year}-${String(scraperData.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayData: any = {}
          
          // Helper to validate and set value - but skip if deleted in CSV
          const setIfValid = (value: any, key: string) => {
            // CRITICAL: If this date+category was deleted (marked in CSV), don't use Supabase value
            if (deletedFromCSV.has(`${rowDate}:${key}`)) {
              console.log(`🚫 Blocking Supabase value for ${key} on ${rowDate} (marked as deleted in CSV)`)
              return false // Explicitly deleted, ignore Supabase value
            }
            if (value === null || value === undefined) return false
            const str = String(value).trim()
            if (str === '' || str === '--' || str === 'null' || str === 'NULL') return false
            const num = parseInt(str, 10)
            if (isNaN(num) || num < 0 || num > 99) return false
            dayData[key] = str.padStart(2, '0')
            return true
          }
          
          // Only set valid numeric values (and not deleted ones)
          setIfValid(row.gal12, 'GALI2')
          setIfValid(row.desawar2, 'DESAWAR2')
          setIfValid(row.faridabad2, 'FARIDABAD2')
          setIfValid(row.ghaziabad2, 'GHAZIABAD2')
          setIfValid(row.luxmi_kuber, 'LUXMI KUBER')
          
          // Only set adminDataByDay if there's at least one valid value
          if (Object.keys(dayData).length > 0) {
            adminDataByDay[day] = dayData
          }
        }
      }
      console.log(`Loaded ${supabaseAdminData.length} admin results from Supabase for ${scraperData.year}-${scraperData.month}`)
    } else {
      // Fallback to CSV if Supabase is empty
      // Clear CSV cache first to ensure fresh data (especially after deletions)
      try {
        const { clearCache } = require('@/lib/csv-cache')
        clearCache()
        console.log('✅ Cleared CSV cache before loading admin data')
  } catch (e) {
        // Ignore cache clear errors
      }
      adminDataByDay = await getAdminDataForMonth(scraperData.year, scraperData.month)
      
      // Double-check: Filter out any '--' values that might have slipped through
      Object.keys(adminDataByDay).forEach(day => {
        const dayData = adminDataByDay[parseInt(day)]
        if (dayData) {
          Object.keys(dayData).forEach(key => {
            const value = dayData[key as keyof typeof dayData]
            if (value === '--' || value === '' || value === null || value === undefined) {
              delete dayData[key as keyof typeof dayData]
            }
          })
          // Remove empty day data
          if (Object.keys(dayData).length === 0) {
            delete adminDataByDay[parseInt(day)]
          }
        }
      })
      
      console.log(`Loaded admin results from CSV (Supabase empty) for ${scraperData.year}-${scraperData.month}`)
    }
  } catch (error) {
    // Fallback to CSV on error
    console.warn('Error loading from Supabase, falling back to CSV:', error)
    adminDataByDay = await getAdminDataForMonth(scraperData.year, scraperData.month)
  }
  
  // Load base data from Supabase first (Faridabad, Ghaziabad, Gali, Desawar), fallback to CSV
  // OPTIMIZATION: Parallelize Supabase query with timeout
  let baseDataByDay: Record<number, any> = {}
  try {
    // Calculate date range for the month
    const startDate = `${scraperData.year}-${String(scraperData.month).padStart(2, '0')}-01`
    const daysInMonth = new Date(scraperData.year, scraperData.month, 0).getDate()
    const endDate = `${scraperData.year}-${String(scraperData.month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    
    // Try Supabase first (with timeout to avoid hanging)
    const supabaseBaseData = await Promise.race([
      getScrapedResults(startDate, endDate),
      new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000)) // 2s timeout
    ])
    
    if (supabaseBaseData && supabaseBaseData.length > 0) {
      // Convert Supabase data to day-indexed format
      for (const row of supabaseBaseData) {
        const day = parseInt(row.date.split('-')[2])
        if (day >= 1 && day <= 31) {
          baseDataByDay[day] = {
            FARIDABAD: row.faridabad ? parseInt(row.faridabad) : null,
            GHAZIABAD: row.ghaziabad ? parseInt(row.ghaziabad) : null,
            GALI: row.gali ? parseInt(row.gali) : null,
            DESAWAR: row.desawar ? parseInt(row.desawar) : null
          }
        }
      }
      console.log(`Loaded ${supabaseBaseData.length} base results from Supabase for ${scraperData.year}-${scraperData.month}`)
    } else {
      // Fallback to CSV if Supabase is empty
      baseDataByDay = await getBaseDataForMonth(scraperData.year, scraperData.month)
      console.log(`Loaded base results from CSV (Supabase empty) for ${scraperData.year}-${scraperData.month}`)
    }
  } catch (error) {
    // Fallback to CSV on error
    console.warn('Error loading base data from Supabase, falling back to CSV:', error)
    baseDataByDay = await getBaseDataForMonth(scraperData.year, scraperData.month)
  }

  // Load schedule data for today and future dates (admin columns from schedules)
  const scheduleDataByDay: Record<number, { GALI2?: string; DESAWAR2?: string; FARIDABAD2?: string; GHAZIABAD2?: string; 'LUXMI KUBER'?: string }> = {}
  
  // CRITICAL: Track which date+category combinations have been deleted
  // If a schedule was deleted, we should NOT show the Supabase value even if it exists
  const deletedCombinations = new Set<string>() // Format: "YYYY-MM-DD:CATEGORY"
  
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
        
        // STRICT validation: Only set if value exists, is not empty, not '--', not null, and is a valid number
        if (value && value !== '--' && value !== '' && value !== null && value !== undefined) {
          // Validate it's a valid number
          const numValue = parseInt(value, 10)
          if (!isNaN(numValue) && numValue >= 0 && numValue <= 99) {
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
      // NOTE: If schedule is deleted, scheduleDayData will be empty, so we only use CSV
      // If CSV has '--' or empty, it means the data was deleted
      // CRITICAL: We MUST check Supabase data here too, because Supabase might have the deleted values
      const scheduleDayData = scheduleDataByDay[day]
      const csvDayData = adminDataByDay[day]
      
      // Helper function to validate and parse a value - returns null if invalid/deleted
      const parseIfValid = (val: any): number | null => {
        if (!val || val === '--' || val === '' || val === null || val === undefined) return null
        const str = String(val).trim()
        if (str === '--' || str === '' || str === 'null' || str === 'NULL') return null
        const num = parseInt(str, 10)
        if (isNaN(num) || num < 0 || num > 99) return null
        return num
      }
      
      // Build date string for this row (YYYY-MM-DD)
      const rowDate = `${scraperData.year}-${String(scraperData.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      
      if (key === 'GALI2') {
        // Priority: schedule > csv > deletion markers
        // If there's a valid schedule, it should override deletion markers
        const scheduleVal = parseIfValid(scheduleDayData?.GALI2)
        if (scheduleVal !== null) {
          console.log(`✅ Table: Using schedule value for GALI2 on ${rowDate} = ${scheduleVal}`)
          return scheduleVal
        }
        // Only check deletion if no schedule data
        if (deletedFromCSV.has(`${rowDate}:GALI2`) || deletedCombinations.has(`${rowDate}:GALI2`)) {
          console.log(`🚫 Returning null for GALI2 on ${rowDate} (deleted, no schedule)`)
          return null
        }
        const csvVal = parseIfValid(csvDayData?.GALI2)
        if (csvVal !== null) return csvVal
        return null
      }
      if (key === 'DESAWAR2') {
        // Priority: schedule > csv > deletion markers
        const scheduleVal = parseIfValid(scheduleDayData?.DESAWAR2)
        if (scheduleVal !== null) {
          console.log(`✅ Table: Using schedule value for DESAWAR2 on ${rowDate} = ${scheduleVal}`)
          return scheduleVal
        }
        if (deletedFromCSV.has(`${rowDate}:DESAWAR2`) || deletedCombinations.has(`${rowDate}:DESAWAR2`)) {
          console.log(`🚫 Returning null for DESAWAR2 on ${rowDate} (deleted, no schedule)`)
          return null
        }
        const csvVal = parseIfValid(csvDayData?.DESAWAR2)
        if (csvVal !== null) return csvVal
        return null
      }
      if (key === 'FARIDABAD2') {
        // Priority: schedule > csv > deletion markers
        const scheduleVal = parseIfValid(scheduleDayData?.FARIDABAD2)
        if (scheduleVal !== null) {
          console.log(`✅ Table: Using schedule value for FARIDABAD2 on ${rowDate} = ${scheduleVal}`)
          return scheduleVal
        }
        if (deletedFromCSV.has(`${rowDate}:FARIDABAD2`) || deletedCombinations.has(`${rowDate}:FARIDABAD2`)) {
          console.log(`🚫 Returning null for FARIDABAD2 on ${rowDate} (deleted, no schedule)`)
          return null
        }
        const csvVal = parseIfValid(csvDayData?.FARIDABAD2)
        if (csvVal !== null) return csvVal
        return null
      }
      if (key === 'GHAZIABAD2') {
        // Priority: schedule > csv > deletion markers
        const scheduleVal = parseIfValid(scheduleDayData?.GHAZIABAD2)
        if (scheduleVal !== null) {
          console.log(`✅ Table: Using schedule value for GHAZIABAD2 on ${rowDate} = ${scheduleVal}`)
          return scheduleVal
        }
        if (deletedFromCSV.has(`${rowDate}:GHAZIABAD2`) || deletedCombinations.has(`${rowDate}:GHAZIABAD2`)) {
          console.log(`🚫 Returning null for GHAZIABAD2 on ${rowDate} (deleted, no schedule)`)
          return null
        }
        const csvVal = parseIfValid(csvDayData?.GHAZIABAD2)
        if (csvVal !== null) return csvVal
        return null
      }
      // LUXMI KUBER: Use schedule data (priority) for today/future, CSV for historical
      if (key === 'LUXMI KUBER') {
        // Priority: schedule > csv > deletion markers
        const scheduleVal = parseIfValid(scheduleDayData?.['LUXMI KUBER'])
        if (scheduleVal !== null) {
          console.log(`✅ Table: Using schedule value for LUXMI KUBER on ${rowDate} = ${scheduleVal}`)
          return scheduleVal
        }
        if (deletedFromCSV.has(`${rowDate}:LUXMI KUBER`) || deletedCombinations.has(`${rowDate}:LUXMI KUBER`)) {
          console.log(`🚫 Returning null for LUXMI KUBER on ${rowDate} (deleted, no schedule)`)
          return null
        }
        const csvVal = parseIfValid(csvDayData?.['LUXMI KUBER'])
        if (csvVal !== null) return csvVal
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

async function createTodayData(adminCategories: any[], scraperData: any, liveResults: any, scheduledItems: any[] = []) {
  // Normalize helper
  const norm = (s: string) => (s || '').toUpperCase().trim()
  
  // Get yesterday's date for fetching yesterday's results
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const yesterdayDay = yesterday.getDate()
  
  // IMPORTANT: Admin categories are 100% admin-driven, no API interference
  // Build scheduleDataByDay from executed schedules (SAME SOURCE as table chart)
  // This ensures Live Results uses the exact same data source as the table chart
  const scheduleDataByDay: Record<number, { GALI2?: string; DESAWAR2?: string; FARIDABAD2?: string; GHAZIABAD2?: string; 'LUXMI KUBER'?: string }> = {}
  
  // Get executed schedules (same logic as createHybridData)
  try {
    const { getSchedules } = require('@/lib/local-content-store')
    const allSchedules = await getSchedules()
    
    allSchedules.forEach((schedule: any) => {
      if (!schedule.executed) return
      const dateMatch = schedule.row?.date?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!dateMatch) return
      
      const y = parseInt(dateMatch[1], 10)
      const m = parseInt(dateMatch[2], 10)
      const d = parseInt(dateMatch[3], 10)
      
      // Check if schedule is for yesterday's date
      if (y === yesterday.getFullYear() && m === yesterday.getMonth() + 1 && d === yesterdayDay) {
        // Find which admin category this schedule is for
        const scheduleKey = Object.keys(schedule.row).find(key => key !== 'date')
        if (!scheduleKey) return
        
        // Find the admin category that matches this schedule key
        const matchingCategory = adminCategories.find((cat: any) => norm(cat.key) === norm(scheduleKey))
        const categoryLabel = matchingCategory?.label || scheduleKey
        
        // Normalize the category label
        const normalizedLabel = norm(categoryLabel)
        const value = schedule.row[scheduleKey]?.toString()?.trim()
        
        // Only set if value exists and is not empty/--
        if (value && value !== '--' && value !== '') {
          if (!scheduleDataByDay[yesterdayDay]) scheduleDataByDay[yesterdayDay] = {}
          
          if (normalizedLabel === 'GALI2' || normalizedLabel === 'GALI1') {
            scheduleDataByDay[yesterdayDay].GALI2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'DESAWAR2' || normalizedLabel === 'DESAWAR1') {
            scheduleDataByDay[yesterdayDay].DESAWAR2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'FARIDABAD2' || normalizedLabel === 'FARIDABAD1') {
            scheduleDataByDay[yesterdayDay].FARIDABAD2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'GHAZIABAD2' || normalizedLabel === 'GHAZIABAD1') {
            scheduleDataByDay[yesterdayDay].GHAZIABAD2 = value.padStart(2, '0')
          } else if (normalizedLabel === 'LUXMI KUBER' || normalizedLabel.includes('LUXMI') && normalizedLabel.includes('KUBER')) {
            scheduleDataByDay[yesterdayDay]['LUXMI KUBER'] = value.padStart(2, '0')
          }
        }
      }
    })
  } catch (e) {
    // Continue if schedule loading fails
  }
  
  // Build a lookup for yesterday's results from monthly data
  const yesterdayResults: Record<string, string> = {}
  
  // FIRST PRIORITY: Use scheduleDataByDay (executed schedules) - SAME AS TABLE CHART
  // This ensures Live Results shows the exact same yesterday's result as the table chart
  // Admin categories are 100% admin-driven - NO API interference
  const yesterdayScheduleData = scheduleDataByDay[yesterdayDay]
  if (yesterdayScheduleData) {
    if (yesterdayScheduleData.GALI2) yesterdayResults['GALI2'] = yesterdayScheduleData.GALI2
    if (yesterdayScheduleData.DESAWAR2) yesterdayResults['DESAWAR2'] = yesterdayScheduleData.DESAWAR2
    if (yesterdayScheduleData.FARIDABAD2) yesterdayResults['FARIDABAD2'] = yesterdayScheduleData.FARIDABAD2
    if (yesterdayScheduleData.GHAZIABAD2) yesterdayResults['GHAZIABAD2'] = yesterdayScheduleData.GHAZIABAD2
    if (yesterdayScheduleData['LUXMI KUBER']) yesterdayResults['LUXMI KUBER'] = yesterdayScheduleData['LUXMI KUBER']
  }
  
  // NOTE: Admin categories (GALI2, DESAWAR2, FARIDABAD2, GHAZIABAD2, LUXMI KUBER) are admin-driven ONLY
  // We do NOT check scraperData for these - they come from schedules/CSV only
  
  // Also check monthly_results.json directly for admin categories
  // This is the PRIMARY source for yesterday's results (same as GHAZIABAD2, GALI2, etc.)
  // GHAZIABAD2 gets its data from monthly_results.json where it finds "ghaziabad" key
  // LUXMI KUBER should use the same approach - check for "luxmi kuber" or variations
  try {
    const { getMonthlyResults } = require('@/lib/local-content-store')
    const monthKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}` as `${number}-${number}`
    const monthlyData = await getMonthlyResults(monthKey)
    if (monthlyData && monthlyData.rows) {
      const yesterdayRow = monthlyData.rows.find((r: any) => r.date === yesterdayStr)
      if (yesterdayRow) {
        // Check for all admin categories in monthly_results.json (same source as GHAZIABAD2)
        for (const [key, value] of Object.entries(yesterdayRow)) {
          if (key !== 'date' && value && String(value).trim() !== '--' && String(value).trim() !== '') {
            const keyNorm = norm(key)
            // LUXMI KUBER: Check for exact match or variations (same pattern as GHAZIABAD2)
            // Check for: LUXMI KUBER, LUXMIKUBER, or any key containing both LUXMI and KUBER
            // This matches the same pattern used for GHAZIABAD2 which checks for "GHAZIABAD", "GHAZIABAD1", "GHAZIABAD2"
            if ((keyNorm === 'LUXMI KUBER' || keyNorm === 'LUXMIKUBER' || 
                 (keyNorm.includes('LUXMI') && keyNorm.includes('KUBER'))) && 
                !yesterdayResults['LUXMI KUBER']) {
              yesterdayResults['LUXMI KUBER'] = String(value).padStart(2, '0')
            }
            // GALI2: Check ONLY for GALI2 or GALI1 (admin categories)
            // DO NOT match base "GALI" column - that's for the base API column, not admin category
            else if ((keyNorm === 'GALI2' || keyNorm === 'GALI1') && !yesterdayResults['GALI2']) {
              yesterdayResults['GALI2'] = String(value).padStart(2, '0')
            }
            // DESAWAR2: Check ONLY for DESAWAR2 or DESAWAR1 (admin categories)
            // DO NOT match base "DESAWAR" column - that's for the base API column, not admin category
            else if ((keyNorm === 'DESAWAR2' || keyNorm === 'DESAWAR1') && !yesterdayResults['DESAWAR2']) {
              yesterdayResults['DESAWAR2'] = String(value).padStart(2, '0')
            }
            // FARIDABAD2: Check ONLY for FARIDABAD2 or FARIDABAD1 (admin categories)
            // DO NOT match base "FARIDABAD" column - that's for the base API column, not admin category
            else if ((keyNorm === 'FARIDABAD2' || keyNorm === 'FARIDABAD1') && !yesterdayResults['FARIDABAD2']) {
              yesterdayResults['FARIDABAD2'] = String(value).padStart(2, '0')
            }
            // GHAZIABAD2: Check ONLY for GHAZIABAD2 or GHAZIABAD1 (admin categories)
            // DO NOT match base "GHAZIABAD" column - that's for the base API column, not admin category
            else if ((keyNorm === 'GHAZIABAD2' || keyNorm === 'GHAZIABAD1') && 
                     !yesterdayResults['GHAZIABAD2']) {
              yesterdayResults['GHAZIABAD2'] = String(value).padStart(2, '0')
            }
            // LUXMI KUBER: Also check for base name variations (same pattern)
            // If monthly_results.json has "luxmi kuber" or "luxmikuber" (lowercase), it should match
          }
        }
      }
    }
  } catch (e) {
    // Continue if monthly results check fails
  }
  
  // SECOND PRIORITY: Check CSV cache for yesterday's results (admin-driven only) - instant lookup
  try {
    // Get yesterday's admin data from Supabase first, fallback to CSV
    let yesterdayRow: any = null
    try {
      const supabaseYesterdayData = await getAdminResults(yesterdayStr, yesterdayStr)
      if (supabaseYesterdayData && supabaseYesterdayData.length > 0) {
        const row = supabaseYesterdayData[0]
        yesterdayRow = {
          GALI2: row.gal12,
          DESAWAR2: row.desawar2,
          FARIDABAD2: row.faridabad2,
          GHAZIABAD2: row.ghaziabad2,
          'LUXMI KUBER': row.luxmi_kuber
        }
      } else {
        yesterdayRow = await getAdminDataForDate(yesterdayStr)
      }
    } catch (error) {
      yesterdayRow = await getAdminDataForDate(yesterdayStr)
    }
    if (yesterdayRow) {
      if (yesterdayRow.GALI2) yesterdayResults['GALI2'] = yesterdayRow.GALI2
      if (yesterdayRow.DESAWAR2) yesterdayResults['DESAWAR2'] = yesterdayRow.DESAWAR2
      if (yesterdayRow.FARIDABAD2) yesterdayResults['FARIDABAD2'] = yesterdayRow.FARIDABAD2
      if (yesterdayRow.GHAZIABAD2) yesterdayResults['GHAZIABAD2'] = yesterdayRow.GHAZIABAD2
      if (yesterdayRow['LUXMI KUBER']) yesterdayResults['LUXMI KUBER'] = yesterdayRow['LUXMI KUBER']
    }
  } catch (e) {
    // If cache lookup fails, continue with what we have
    console.error('Error loading yesterday results from cache:', e)
  }
  
  // Helper function to format time with AM/PM
  const formatTimeWithAMPM = (timeStr: string): string => {
    if (!timeStr || timeStr === "TBD") return "TBD"
    // If already has AM/PM, return as is
    if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) {
      return timeStr
    }
    // Try to parse as HH:MM or HH:MM:SS
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10)
      const minutes = timeMatch[2]
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12
      return `${hours}:${minutes} ${ampm}`
    }
    return timeStr // Return as is if can't parse
  }

  // Create items from admin categories (empty placeholders)
  // Store both key and label - key for matching schedules, label for display
  const adminItems = adminCategories.map(cat => ({ 
    category: cat.label, // Display label
    categoryKey: cat.key, // Store key for matching with schedule row keys
    value: "--",
    time: formatTimeWithAMPM(cat.defaultTime || "TBD"), // Format time with AM/PM
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
  // OPTIMIZATION: Reduced logging for performance
  const mergedAdminItems = adminItems.map(adminItem => {
    // Check for scheduled items from Schedule section (for Live Results)
    // Show schedules that match this category AND (are for TODAY OR executed OR publish time has passed)
    const now = new Date()
    const today = new Date().toISOString().split('T')[0]
    
    const matchingScheduledItem = scheduledItems.find(schedule => {
      // Find the schedule key from the schedule row
      const scheduleKey = Object.keys(schedule.row).find(key => key !== 'date' && key.trim() !== '')
      if (!scheduleKey) return false
      
      // Use the SAME matching logic as createHybridData (line 739)
      // Find the admin category that matches this schedule key
      // Schedules use category keys (e.g., "gali1"), but we need to map to labels (e.g., "GALI2")
      const matchingCategory = adminCategories.find((cat: any) => norm(cat.key) === norm(scheduleKey))
      const categoryLabel = matchingCategory?.label || scheduleKey
      const normalizedScheduleLabel = norm(categoryLabel)
      
      // Match against the admin item's category label (normalized)
      const adminLabel = norm(adminItem.category)
      
      const scheduleDate = schedule.row.date
      const publishTime = new Date(schedule.publishAt)
      const isExecuted = schedule.executed === true
      const isPublishTimePassed = now >= publishTime
      
      // Match if: category labels match AND (schedule is for TODAY OR schedule is executed OR publish time has passed)
      return normalizedScheduleLabel === adminLabel && 
             (scheduleDate === today || isExecuted || isPublishTimePassed)
    })
    
    if (matchingScheduledItem) {
      const scheduleKey = Object.keys(matchingScheduledItem.row).find(key => key !== 'date' && key.trim() !== '')
      if (!scheduleKey) {
        // Default admin-managed placeholder
        return adminItem
      }
      const scheduleValue = matchingScheduledItem.row[scheduleKey]
      const publishTime = new Date(matchingScheduledItem.publishAt)
      
      // If schedule is executed OR publish time has passed, show the result in Live Results
      // Executed schedules should always show their result (even if published in the past)
      const isExecuted = matchingScheduledItem.executed === true
      const isPublishTimePassed = now >= publishTime
      
      if (isExecuted || isPublishTimePassed) {
        // Get yesterday's result for this category (try multiple variations)
        const categoryLabel = norm(adminItem.category)
        let yesterdayValue = yesterdayResults[categoryLabel] || '--'
        if (!yesterdayValue || yesterdayValue === '--') {
          // Try with spaces (e.g., "LUXMI KUBER" vs "LUXMIKUBER")
          yesterdayValue = yesterdayResults[categoryLabel.replace(/\s+/g, '')] || 
                           yesterdayResults[categoryLabel.replace(/\s+/g, '_')] ||
                           yesterdayResults[categoryLabel.replace(/\s+/g, '-')] ||
                           '--'
        }
        
        return {
          ...adminItem,
          value: scheduleValue?.toString() || '--', // Today's result (main display)
          time: adminItem.time, // Keep default time from category (already formatted with AM/PM)
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
    // Try multiple variations of the category label to find yesterday's result
    let yesterdayValue = yesterdayResults[categoryLabel]
    if (!yesterdayValue || yesterdayValue === '--') {
      // Try with spaces (e.g., "LUXMI KUBER" vs "LUXMIKUBER")
      yesterdayValue = yesterdayResults[categoryLabel.replace(/\s+/g, '')] || 
                       yesterdayResults[categoryLabel.replace(/\s+/g, '_')] ||
                       yesterdayResults[categoryLabel.replace(/\s+/g, '-')] ||
                       '--'
    }
    
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
  // IMPORTANT: Filter out deleted admin columns (those with '--', null, or empty values)
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
