import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { deleteAdminResultCompletely } from "@/lib/admin-result-deletion"

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) {
    return unauth
  }

  try {
    const body = await req.json()
    const { date, categories } = body

    if (!date || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: "date and categories array are required" },
        { status: 400 }
      )
    }

    const results = []
    for (const category of categories) {
      try {
        await deleteAdminResultCompletely(date, category)
        results.push({ category, success: true })
      } catch (error: any) {
        results.push({ category, success: false, error: error.message })
      }
    }

    return NextResponse.json({
      ok: true,
      results,
      message: `Force deletion completed for ${date}`
    })
  } catch (error: any) {
    console.error("Error in force delete:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete" },
      { status: 500 }
    )
  }
}
