import { NextResponse } from "next/server"
import { getSiteContent } from "@/lib/local-content-store"

export async function GET() {
  try {
    const content = await getSiteContent()
    return NextResponse.json(content, { 
      headers: { 
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=1800" // 5 minute cache, 30 minute stale
      } 
    })
  } catch (error) {
    console.error('Content API error:', error)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
