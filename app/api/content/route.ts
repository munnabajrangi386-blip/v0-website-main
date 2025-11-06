import { NextResponse } from "next/server"
import { getSiteContent } from "@/lib/local-content-store"

export async function GET() {
  try {
    const content = await getSiteContent()
    return NextResponse.json(content, { 
      headers: { 
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" // 30s browser cache, 1min CDN cache, 2min stale
      } 
    })
  } catch (error) {
    console.error('Content API error:', error)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
