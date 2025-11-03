"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
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
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        router.push("/admin")
      } else {
        const data = await response.json()
        setError(data.error || "Invalid credentials. Please try again.")
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
              <label htmlFor="username" className="text-sm text-[var(--color-muted-foreground)]">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                className="rounded-[var(--radius)] border-input"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm text-[var(--color-muted-foreground)]">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
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
