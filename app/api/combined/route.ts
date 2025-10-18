import { NextResponse } from "next/server"
import { getSiteContent } from "@/lib/local-content-store"
import { parseMonthlyTable } from "@/lib/scrape"

// Combined API that returns everything in one request
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const month = parseInt(url.searchParams.get('month') || '10')
    const year = parseInt(url.searchParams.get('year') || '2025')
    
    // Get content and scrape data in parallel
    const [content, scraperData] = await Promise.all([
      getSiteContent().catch(() => ({
        banners: [],
        ads: [],
        categories: [
          { key: "ghaziabad1", label: "GHAZIABAD1", showInToday: true },
          { key: "gali1", label: "GALI1", showInToday: true },
          { key: "faridabad1", label: "FARIDABAD1", showInToday: true },
          { key: "desawar1", label: "DESAWAR1", showInToday: true },
        ],
        headerHighlight: { enabled: false },
        updatedAt: new Date().toISOString()
      })),
      fetch('https://newghaziabad.com', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }).then(res => res.text()).then(html => parseMonthlyTable(html, month, year))
    ])
    
    // Get admin categories (excluding default ones)
    const adminCategories = content.categories?.filter(cat => 
      !["disawar", "newDisawar", "taj", "delhiNoon", "gali", "ghaziabad", "faridabad", "haridwar"].includes(cat.key)
    ) || []
    
    // Create hybrid table
    const hybridColumns = [
      ...adminCategories.map(cat => cat.label),
      ...scraperData.columns
    ]
    
    const hybridRows = scraperData.rows.map(row => ({
      day: row.day,
      values: [
        ...new Array(adminCategories.length).fill(null), // Empty admin data
        ...row.values // Scraper data
      ]
    }))
    
    // Return everything in one response
    return NextResponse.json({
      content: {
        banners: content.banners || [],
        ads: content.ads || [],
        headerImage: content.headerImage,
        footerNote: content.footerNote
      },
      monthlyData: {
        month: scraperData.month,
        year: scraperData.year,
        columns: hybridColumns,
        rows: hybridRows
      },
      todayData: {
        date: new Date().toISOString().split('T')[0],
        items: [] // Empty for now
      }
    }, { 
      headers: { 
        "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600" // 10 minute cache, 1 hour stale
      } 
    })
  } catch (error) {
    console.error('Combined API error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
