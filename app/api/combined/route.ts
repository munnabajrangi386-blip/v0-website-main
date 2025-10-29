import { NextResponse } from "next/server"
import { getSiteContent } from "@/lib/local-content-store"
import { parseMonthlyTable, parseLiveResults } from "@/lib/scrape"

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
    const [content, scraperData] = await Promise.all([
      getContentWithFallback(),
      scrapeData(month, year)
    ])
    
    const adminCategories = getAdminCategories(content)
    const hybridData = createHybridData(adminCategories, scraperData.monthly)
    const todayData = createTodayData(adminCategories, scraperData.monthly, scraperData.live)
    
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

async function scrapeData(month: number, year: number) {
  const response = await fetch('https://newghaziabad.com', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  const html = await response.text()
  return {
    monthly: parseMonthlyTable(html, month, year),
    live: parseLiveResults(html)
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

function createTodayData(adminCategories: any[], scraperData: any, liveResults: any) {
  // Create items from admin categories (empty for now)
  const adminItems = adminCategories.map(cat => ({ 
    category: cat.label, 
    value: "--",
    time: "TBD",
    jodi: "--",
    status: "wait"
  }))
  
  // Create items from live results
  const liveItems = liveResults.results.map((result: any) => ({
    category: result.title,
    value: result.result,
    time: result.time,
    jodi: result.jodi,
    status: result.status
  }))
  
  // Combine admin categories and live results
  const allItems = [...adminItems, ...liveItems]
  
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
    ads: content.ads || [],
    headerImage: content.headerImage,
    leftTextColumn: content.leftTextColumn,
    rightTextColumn: content.rightTextColumn,
    footerNote: content.footerNote
  }
}
