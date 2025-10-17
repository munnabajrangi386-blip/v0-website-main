import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

async function loginAction(formData: FormData) {
  "use server"
  const secret = formData.get("secret")
  const expected = process.env.ADMIN_SECRET
  if (!expected) {
    throw new Error("ADMIN_SECRET env var is not set. Add it in the Vars sidebar.")
  }
  if (typeof secret === "string" && secret === expected) {
    const cookieStore = await cookies()
    cookieStore.set("admin_session", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    })
    redirect("/admin")
  }
  redirect("/admin/login?error=1")
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const hasError = searchParams?.error === "1"
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background text-foreground p-6">
      <Card className="w-full max-w-md border-border shadow-lg rounded-[var(--radius)] bg-card">
        <CardHeader>
          <CardTitle className="text-balance text-center text-2xl font-semibold text-[var(--color-foreground)]">
            Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasError ? (
            <p className="mb-3 text-sm text-[var(--color-destructive)]">Invalid secret. Please try again.</p>
          ) : null}
          <form action={loginAction} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="secret" className="text-sm text-[var(--color-muted-foreground)]">
                Admin Secret
              </label>
              <Input
                id="secret"
                name="secret"
                type="password"
                required
                className="rounded-[var(--radius)] border-input"
              />
            </div>
            <Button type="submit" className="rounded-[var(--radius)] bg-primary text-primary-foreground">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
