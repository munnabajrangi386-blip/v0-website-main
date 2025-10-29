import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/admin-auth"
import { 
  getLiveSchedules, 
  addLiveSchedule, 
  updateLiveSchedule, 
  deleteLiveSchedule,
  publishLiveSchedule,
  getActiveLiveSchedules
} from "@/lib/local-content-store"
import type { LiveSchedule } from "@/lib/types"

export async function GET() {
  const schedules = await getLiveSchedules()
  return NextResponse.json({ schedules })
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth()
  if (unauth) {
    return unauth
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const action = body?.action as string | undefined

  if (action === "add") {
    const scheduleData = body?.schedule as Omit<LiveSchedule, 'id' | 'createdAt'>
    
    if (!scheduleData || !scheduleData.category || !scheduleData.scheduledTime || !scheduleData.result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate scheduled time is in the future
    const scheduledTime = new Date(scheduleData.scheduledTime)
    const now = new Date()
    
    if (scheduledTime <= now) {
      return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 })
    }

    // Validate scheduled time is today
    const today = new Date()
    const isToday = scheduledTime.toDateString() === today.toDateString()
    
    if (!isToday) {
      return NextResponse.json({ error: "Scheduled time must be today" }, { status: 400 })
    }

    const newSchedule = await addLiveSchedule(scheduleData)
    return NextResponse.json({ ok: true, schedule: newSchedule })
  }

  if (action === "update") {
    const { id, updates } = body
    
    if (!id || !updates) {
      return NextResponse.json({ error: "Missing ID or updates" }, { status: 400 })
    }

    const updatedSchedule = await updateLiveSchedule(id, updates)
    
    if (!updatedSchedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, schedule: updatedSchedule })
  }

  if (action === "delete") {
    const { id } = body
    
    if (!id) {
      return NextResponse.json({ error: "Missing schedule ID" }, { status: 400 })
    }

    const deleted = await deleteLiveSchedule(id)
    
    if (!deleted) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === "publish") {
    const { id } = body
    
    if (!id) {
      return NextResponse.json({ error: "Missing schedule ID" }, { status: 400 })
    }

    const publishedSchedule = await publishLiveSchedule(id)
    
    if (!publishedSchedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, schedule: publishedSchedule })
  }

  if (action === "get-active") {
    const activeSchedules = await getActiveLiveSchedules()
    return NextResponse.json({ schedules: activeSchedules })
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
}
