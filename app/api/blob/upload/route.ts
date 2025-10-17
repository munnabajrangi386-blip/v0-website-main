import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const key = `uploads/${Date.now()}-${file.name}`
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: true,
      allowOverwrite: true,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
