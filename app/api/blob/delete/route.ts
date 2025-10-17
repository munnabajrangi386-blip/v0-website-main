import { del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"

export async function DELETE(request: NextRequest) {
  const unauth = requireAuth()
  if (unauth) return unauth
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    await del(url)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
