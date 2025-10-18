"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminLoginPage() {
  const [secret, setSecret] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret }),
      })

      if (response.ok) {
        router.push("/admin")
      } else {
        setError("Invalid secret. Please try again.")
      }
    } catch (error) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background text-foreground p-6">
      <Card className="w-full max-w-md border-border shadow-lg rounded-[var(--radius)] bg-card">
        <CardHeader>
          <CardTitle className="text-balance text-center text-2xl font-semibold text-[var(--color-foreground)]">
            Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-3 text-sm text-[var(--color-destructive)]">{error}</p>
          ) : null}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="secret" className="text-sm text-[var(--color-muted-foreground)]">
                Admin Secret
              </label>
              <Input
                id="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required
                className="rounded-[var(--radius)] border-input"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-[var(--radius)] bg-primary text-primary-foreground"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
