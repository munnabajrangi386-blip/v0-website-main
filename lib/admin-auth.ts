import { cookies } from "next/headers"

export async function isAdminAuthenticated() {
  const c = await cookies()
  return c.get("admin_session")?.value === "1"
}

export async function requireAuth(): Promise<Response | null> {
  // Return null when authorized; otherwise a 401 Response for route handlers to return.
  return (await isAdminAuthenticated()) ? null : new Response("Unauthorized", { status: 401 })
}

export async function setAdminSession(maxAgeSeconds = 60 * 60 * 8) {
  // Establish an admin session via HttpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set("admin_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  })
}

export async function clearAdminSession() {
  // Remove admin session cookie
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")
}
