import { list } from "@vercel/blob"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"

export async function GET() {
  const unauth = requireAuth()
  if (unauth) return unauth
  try {
    const { blobs } = await list()

    const files = blobs.map((blob) => ({
      ...blob,
      filename: blob.pathname.split("/").pop() || "unknown",
    }))

    return NextResponse.json({ files })
  } catch (error) {
    console.error("[v0] Error listing files:", error)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}
