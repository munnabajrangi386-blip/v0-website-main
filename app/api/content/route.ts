import { NextResponse } from "next/server"
import { getSiteContent } from "@/lib/content-store"

export async function GET() {
  try {
    const content = await getSiteContent()
    return NextResponse.json(content, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Content API error:", error)
    // Return fallback content to prevent chart from breaking
    const fallbackContent = {
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
    }
    return NextResponse.json(fallbackContent, { headers: { "Cache-Control": "no-store" } })
  }
}
