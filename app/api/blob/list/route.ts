import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { listFiles, getPublicUrl } from "@/lib/supabase-storage"

export async function GET() {
  const unauth = await requireAuth()
  if (unauth) return unauth
  try {
    const fileNames = await listFiles()

    const files = fileNames.map((fileName) => ({
      pathname: fileName,
      filename: fileName,
      url: getPublicUrl(fileName),
      uploadedAt: new Date().toISOString(), // Supabase doesn't provide upload time in list
    }))

    return NextResponse.json({ files })
  } catch (error) {
    console.error("[v0] Error listing files:", error)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}
