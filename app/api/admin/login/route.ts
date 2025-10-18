import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret } = body
    
    const expected = process.env.ADMIN_SECRET || "change-me-to-a-strong-secret"
    
    if (secret === expected) {
      const cookieStore = await cookies()
      cookieStore.set("admin_session", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8 // 8 hours
      })
      
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}