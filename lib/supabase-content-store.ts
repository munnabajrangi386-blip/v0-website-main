import { supabase } from './supabase'
import type { SiteContent, MonthlyResults, ScheduleItem, ActivityLog, MonthKey } from './types'

// Helper functions for Supabase operations
async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('data')
      .eq('id', key)
      .single()
    
    if (error || !data) return null
    return data.data as T
  } catch {
    return null
  }
}

async function putJSON<T>(key: string, value: T): Promise<void> {
  try {
    const { error } = await supabase
      .from('site_content')
      .upsert({
        id: key,
        data: value,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
  } catch (error) {
    console.error('Supabase putJSON error:', error)
    throw error
  }
}

// Site content operations
export async function getSiteContent(): Promise<SiteContent> {
  const now = new Date().toISOString()
  const c = await getJSON<SiteContent>('site_content')
  
  if (c) {
    // ensure categories exists for older payloads
    if (!c.categories) {
      c.categories = [
        // Custom admin categories (will show as leftmost columns)
        { key: "ghaziabad1", label: "GHAZIABAD1", showInToday: true },
        { key: "gali1", label: "GALI1", showInToday: true },
        { key: "faridabad1", label: "FARIDABAD1", showInToday: true },
        { key: "desawar1", label: "DESAWAR1", showInToday: true },
        // Default categories (will be filtered out from hybrid table)
        { key: "disawar", label: "DESAWAR", showInToday: true },
        { key: "newDisawar", label: "NEW DESAWAR", showInToday: true },
        { key: "taj", label: "TAJ", showInToday: true },
        { key: "delhiNoon", label: "DELHI NOON", showInToday: true },
        { key: "gali", label: "GALI", showInToday: true },
        { key: "ghaziabad", label: "GHAZIABAD", showInToday: true },
        { key: "faridabad", label: "FARIDABAD", showInToday: true },
        { key: "haridwar", label: "HARIDWAR", showInToday: true },
      ]
    }
    return c
  }
  
  const initial: SiteContent = {
    banners: [
      {
        id: crypto.randomUUID(),
        text: "Direct disawar company — honesty first. Whatsapp for secure play.",
        kind: "warning",
      },
      { id: crypto.randomUUID(), text: "Welcome to Satta King. Play responsibly. Avoid fraud. ✅✅✅", kind: "info" },
    ],
    headerHighlight: { enabled: false },
    ads: [
      {
        id: crypto.randomUUID(),
        title: "Sample Ad",
        imageUrl: "/sample-casino-banner.jpg",
        href: "#",
        active: true,
        createdAt: now,
      },
    ],
    categories: [
      // Custom admin categories (will show as leftmost columns)
      { key: "ghaziabad1", label: "GHAZIABAD1", showInToday: true },
      { key: "gali1", label: "GALI1", showInToday: true },
      { key: "faridabad1", label: "FARIDABAD1", showInToday: true },
      { key: "desawar1", label: "DESAWAR1", showInToday: true },
      // Default categories (will be filtered out from hybrid table)
      { key: "disawar", label: "DESAWAR", showInToday: true },
      { key: "newDisawar", label: "NEW DESAWAR", showInToday: true },
      { key: "taj", label: "TAJ", showInToday: true },
      { key: "delhiNoon", label: "DELHI NOON", showInToday: true },
      { key: "gali", label: "GALI", showInToday: true },
      { key: "ghaziabad", label: "GHAZIABAD", showInToday: true },
      { key: "faridabad", label: "FARIDABAD", showInToday: true },
      { key: "haridwar", label: "HARIDWAR", showInToday: true },
    ],
    headerImage: {
      id: crypto.randomUUID(),
      imageUrl: "/images/reference-aura.png",
      alt: "Header Image",
      active: true
    },
    footerNote: {
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      active: true
    },
    updatedAt: now,
  }
  
  await putJSON('site_content', initial)
  return initial
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  const updated = { ...content, updatedAt: new Date().toISOString() }
  await putJSON('site_content', updated)
}

// Monthly results operations
export async function getMonthlyResults(month: MonthKey): Promise<MonthlyResults | null> {
  try {
    const { data, error } = await supabase
      .from('monthly_results')
      .select('data')
      .eq('month', month)
      .single()
    
    if (error || !data) return null
    return data.data as MonthlyResults
  } catch {
    return null
  }
}

export async function saveMonthlyResults(data: MonthlyResults): Promise<void> {
  try {
    const { error } = await supabase
      .from('monthly_results')
      .upsert({
        month: data.month,
        data: data,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
  } catch (error) {
    console.error('Supabase saveMonthlyResults error:', error)
    throw error
  }
}

// Schedules operations
export async function getSchedules(): Promise<ScheduleItem[]> {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('data')
      .eq('id', 'schedules')
      .single()
    
    if (error || !data) return []
    return data.data as ScheduleItem[]
  } catch {
    return []
  }
}

export async function saveSchedules(schedules: ScheduleItem[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('schedules')
      .upsert({
        id: 'schedules',
        data: schedules,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error
  } catch (error) {
    console.error('Supabase saveSchedules error:', error)
    throw error
  }
}

// Activity log operations
export async function appendActivity(activity: ActivityLog): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('site_content')
      .select('data')
      .eq('id', 'activity_log')
      .single()
    
    const activities = existing?.data || []
    const updated = [...activities, { ...activity, timestamp: new Date().toISOString() }]
    
    await supabase
      .from('site_content')
      .upsert({
        id: 'activity_log',
        data: updated,
        updated_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Supabase appendActivity error:', error)
  }
}

// Schedule execution
export async function runDueSchedules(): Promise<void> {
  const schedules = await getSchedules()
  const now = new Date()
  
  for (const schedule of schedules) {
    if (schedule.executed) continue
    
    const publishTime = new Date(schedule.publishAt)
    if (publishTime <= now) {
      // Execute the schedule
      const monthlyData = await getMonthlyResults(schedule.month)
      if (monthlyData) {
        // Update the monthly results with schedule data
        const existingRow = monthlyData.rows.find(r => r.date === schedule.row.date)
        if (existingRow) {
          Object.assign(existingRow, schedule.row)
        } else {
          monthlyData.rows.push(schedule.row)
        }
        await saveMonthlyResults(monthlyData)
      }
      
      // Mark as executed
      schedule.executed = true
      await saveSchedules(schedules)
      
      await appendActivity({
        action: 'schedule_executed',
        meta: { scheduleId: schedule.id, month: schedule.month, date: schedule.row.date }
      })
    }
  }
}

// Result row operations
export async function upsertResultRow(month: MonthKey, row: any, merge: boolean): Promise<void> {
  const monthlyData = await getMonthlyResults(month)
  if (!monthlyData) return
  
  const existingIndex = monthlyData.rows.findIndex(r => r.date === row.date)
  
  if (existingIndex >= 0) {
    if (merge) {
      Object.assign(monthlyData.rows[existingIndex], row)
    } else {
      monthlyData.rows[existingIndex] = row
    }
  } else {
    monthlyData.rows.push(row)
  }
  
  await saveMonthlyResults(monthlyData)
}
