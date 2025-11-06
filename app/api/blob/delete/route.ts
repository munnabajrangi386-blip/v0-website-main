import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { deleteFile } from "@/lib/supabase-storage"

export async function DELETE(request: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    // Extract path from Supabase Storage URL
    // Format: https://[project].supabase.co/storage/v1/object/public/uploads/[path]
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/uploads\/(.+)$/)
    if (!pathMatch) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    const path = pathMatch[1]
    await deleteFile(path)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
