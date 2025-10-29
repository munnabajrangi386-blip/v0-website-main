import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { getSiteContent, saveSiteContent } from "@/lib/local-content-store"
import type { SiteContent } from "@/lib/types"

// Database-based content storage

export async function GET() {
  await requireAuth() // enforce auth by awaiting (throws/short-circuits if unauthorized)
  const content = await getSiteContent()
  return NextResponse.json({ content }, { 
    headers: { 
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    } 
  })
}

export async function POST(req: Request) {
  await requireAuth() // enforce auth by awaiting
  try {
    const body = (await req.json()) as SiteContent
    await saveSiteContent(body)
    return NextResponse.json({ content: body }, { 
      headers: { 
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      } 
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unable to save content. Please try again.", detail: err?.message },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}
