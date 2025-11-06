import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { uploadFile } from "@/lib/supabase-storage"
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) return unauth
  
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const publicUrl = await uploadFile(file, fileName, {
      contentType: file.type,
      upsert: true
    })

    // Also save locally as backup
    try {
      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadsDir, { recursive: true })
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = join(uploadsDir, fileName)
      await writeFile(filePath, buffer)
    } catch (localError) {
      // Local save is optional, continue even if it fails
      console.warn('Failed to save file locally:', localError)
    }

    return NextResponse.json({
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}