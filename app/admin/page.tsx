import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AdminDashboard from "@/components/admin/dashboard"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get("admin_session")?.value === "1"
  if (!isAdmin) {
    redirect("/admin/login")
  }
  return <AdminDashboard />
}
