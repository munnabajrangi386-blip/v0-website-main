import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}))
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Missing ADMIN_SECRET" }, { status: 500 })
  }
  if (!password || password !== secret) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set("admin_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8h
  })
  return res
}
