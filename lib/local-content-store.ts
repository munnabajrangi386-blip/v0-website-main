import type { SiteContent, MonthlyResults, ScheduleItem, ActivityLog, MonthKey, LiveSchedule } from './types'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Local fallback data for testing
const DUMMY_CONTENT: SiteContent = {
  banners: [
    {
      id: "banner-1",
      text: "Direct disawar company — honesty first. Whatsapp for secure play.",
      kind: "warning"
    },
    {
      id: "banner-2", 
      text: "Welcome to Satta King. Play responsibly. Avoid fraud. ✅✅✅",
      kind: "info"
    }
  ],
  runningBanner: {
    id: "running-1",
    text: "SATTA KING, SATTAKING, SATTA RESULT, GALI RESULT, GALI SATTA, SATTA BAZAR, GALI SATTA RESULT, SATTA KING 2024 SATTA KING 2025, SATTA KING RESULT, SATTA KING UP, SATTA GAME TODAY RESULT, SATTA RESULT CHART, SATTA KING LIVE, DESAWAR SATTA, FARIDABAD SATTA, FARIDABAD RESULT, BLACK SATTA KING",
    speed: 50,
    active: true,
    backgroundColor: "#dc2626", // red-600
    textColor: "#ffffff"
  },
  fullWidthBanners: [
    {
      id: "fw-banner-1",
      title: "आज की लीक जोड़ी यहां मिलेगी",
      content: "FARIDABAD GAZIYABAD GALI DS - कन्फर्म गेम लेने के लिए जल्दी Telegram पे मैसेज कीजिए सिंगल जोड़ी में काम होगा fb.gb.gl.ds",
      backgroundColor: "linear-gradient(to right, #134e4a, #0f172a)", // teal-900 to slate-900
      textColor: "#ffffff",
      active: true,
      order: 1
    },
    {
      id: "fw-banner-2", 
      title: "Satta king | Satta result | सत्ता किंग",
      content: "",
      backgroundColor: "#fbbf24", // yellow-400
      textColor: "#000000",
      active: true,
      order: 2
    },
    {
      id: "fw-banner-3",
      title: "Diwali Special Dhamaka",
      content: "Single Jodi Mein Game Milegi Faridabad Ghaziabad Gali Disawar - Proof Ke Sath Kam Hoga Leak Jodi Milegi Head Department Se",
      backgroundColor: "#134e4a", // teal-900
      textColor: "#ffffff",
      active: true,
      order: 3,
      showBorder: true,
      borderColor: "#3b82f6" // blue-500
    }
  ],
  ads: [
    {
      id: "ad-1",
      title: "Sample Casino Ad",
      imageUrl: "/sample-casino-banner.jpg",
      href: "#",
      active: true,
      createdAt: new Date().toISOString()
    }
  ],
  categories: [
    { key: "ghaziabad1", label: "GHAZIABAD1", showInToday: true },
    { key: "gali1", label: "GALI1", showInToday: true },
    { key: "faridabad1", label: "FARIDABAD1", showInToday: true },
    { key: "desawar1", label: "DESAWAR1", showInToday: true }
  ],
  headerHighlight: { enabled: false },
  headerImage: {
    id: "header-1",
    imageUrl: "/images/reference-aura.png",
    alt: "Header Image",
    active: true
  },
  footerNote: {
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    active: true
  },
  updatedAt: new Date().toISOString()
}

const DUMMY_MONTHLY_RESULTS: MonthlyResults = {
  month: "2025-10",
  fields: ["ghaziabad1", "gali1", "faridabad1", "desawar1", "disawar", "gali", "ghaziabad", "faridabad"],
  rows: [
    { date: "2025-10-01", ghaziabad1: "99", gali1: "88", faridabad1: "77", desawar1: "66", disawar: "55", gali: "44", ghaziabad: "33", faridabad: "22" },
    { date: "2025-10-02", ghaziabad1: "11", gali1: "22", faridabad1: "33", desawar1: "44", disawar: "55", gali: "66", ghaziabad: "77", faridabad: "88" },
    { date: "2025-10-03", ghaziabad1: "12", gali1: "23", faridabad1: "34", desawar1: "45", disawar: "56", gali: "67", ghaziabad: "78", faridabad: "89" },
    { date: "2025-10-04", ghaziabad1: "13", gali1: "24", faridabad1: "35", desawar1: "46", disawar: "57", gali: "68", ghaziabad: "79", faridabad: "90" },
    { date: "2025-10-05", ghaziabad1: "14", gali1: "25", faridabad1: "36", desawar1: "47", disawar: "58", gali: "69", ghaziabad: "80", faridabad: "91" }
  ],
  updatedAt: new Date().toISOString()
}

const DUMMY_SCHEDULES: ScheduleItem[] = [
  {
    id: "schedule-1",
    publishAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    month: "2025-10",
    row: {
      date: "2025-10-17",
      ghaziabad1: "99",
      gali1: "88"
    },
    merge: false,
    executed: false
  },
  {
    id: "schedule-2", 
    publishAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    month: "2025-10",
    row: {
      date: "2025-10-18",
      faridabad1: "77",
      desawar1: "66"
    },
    merge: false,
    executed: false
  }
]

// Local storage simulation - Initialize with dummy content
let localContent = { ...DUMMY_CONTENT }
let localMonthlyResults = { ...DUMMY_MONTHLY_RESULTS }
let localSchedules = [...DUMMY_SCHEDULES]

// Track if content has been updated
let contentUpdated = false

// Load persisted content on startup
function loadPersistedContent() {
  try {
    if (typeof window !== 'undefined') {
      // Browser environment - use localStorage
      const savedContent = localStorage.getItem('site-content')
      if (savedContent) {
        localContent = JSON.parse(savedContent)
        contentUpdated = true
        console.log('🌐 Loaded content from localStorage')
      }
    } else {
      // Server environment - use file system
      const contentFile = join(process.cwd(), 'content.json')
      if (existsSync(contentFile)) {
        const savedContent = readFileSync(contentFile, 'utf8')
        localContent = JSON.parse(savedContent)
        contentUpdated = true
        console.log('📁 Loaded persisted content from file:', localContent.headerImage?.imageUrl)
      }
    }
  } catch (error) {
    console.log('No persisted content found, using default:', error.message)
  }
}

// Initialize content on startup
loadPersistedContent()

export async function getSiteContent(): Promise<SiteContent> {
  // Force reload from file on server to ensure fresh data
  if (typeof window === 'undefined') {
    try {
      const contentFile = join(process.cwd(), 'content.json')
      if (existsSync(contentFile)) {
        const savedContent = readFileSync(contentFile, 'utf8')
        const fileContent = JSON.parse(savedContent)
        // Always load from file if it exists - file content takes precedence
        localContent = { ...DUMMY_CONTENT, ...fileContent }
        console.log('🔄 Loaded content from file:', localContent.runningBanner?.active, localContent.fullWidthBanners?.length)
        console.log('📊 Banners loaded:', localContent.banners?.length, localContent.banners?.map(b => ({ id: b.id, text: b.text.substring(0, 20) + '...', completeRow: b.completeRow })))
      }
    } catch (error) {
      console.log('Could not reload from file:', error.message)
    }
  }
  
  return localContent
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  // Update the in-memory content
  localContent = { ...content, updatedAt: new Date().toISOString() }
  contentUpdated = true
  
  console.log("🔄 Saving content with header image:", localContent.headerImage?.imageUrl)
  
  // Persist to localStorage in browser or file system on server
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('site-content', JSON.stringify(localContent))
      console.log('🌐 Content saved to localStorage')
    } else {
      // Server environment - save to file
      const contentFile = join(process.cwd(), 'content.json')
      writeFileSync(contentFile, JSON.stringify(localContent, null, 2))
      console.log('💾 Content saved to file:', contentFile)
      console.log('📸 Header image URL:', localContent.headerImage?.imageUrl)
    }
  } catch (error) {
    console.log('Could not persist content:', error)
  }
  
  console.log("✅ Content saved successfully")
}

export async function getMonthlyResults(month: MonthKey): Promise<MonthlyResults | null> {
  if (month === "2025-10") {
    return localMonthlyResults
  }
  return null
}

export async function saveMonthlyResults(data: MonthlyResults): Promise<void> {
  localMonthlyResults = { ...data, updatedAt: new Date().toISOString() }
  console.log("✅ Monthly results saved locally:", localMonthlyResults)
}

export async function getSchedules(): Promise<ScheduleItem[]> {
  return localSchedules
}

export async function saveSchedules(schedules: ScheduleItem[]): Promise<void> {
  localSchedules = [...schedules]
  console.log("✅ Schedules saved locally:", localSchedules)
}

export async function appendActivity(activity: ActivityLog): Promise<void> {
  console.log("✅ Activity logged:", activity)
}

export async function runDueSchedules(): Promise<void> {
  console.log("✅ Running due schedules...")
  
  const schedules = await getSchedules()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  // Add a test schedule for immediate execution (for testing purposes)
  const testSchedule = {
    id: "test-schedule-" + Date.now(),
    month: "2025-10" as MonthKey,
    row: { date: today, gali1: "99" },
    publishAt: new Date(now.getTime() - 1000).toISOString(), // 1 second ago
    merge: false,
    executed: false
  }
  
  // Add test schedule if it doesn't exist
  const hasTestSchedule = schedules.some(s => s.id.startsWith("test-schedule-"))
  if (!hasTestSchedule) {
    schedules.push(testSchedule)
    await saveSchedules(schedules)
    console.log("🧪 Added test schedule for immediate execution:", testSchedule)
  } else {
    console.log("🧪 Test schedule already exists")
  }
  
  // Add a test FARIDABAD1 schedule for 6:05 PM (should have executed)
  const faridabadTestSchedule = {
    id: "faridabad-test-" + Date.now(),
    month: "2025-10" as MonthKey,
    row: { date: today, faridabad1: "88" },
    publishAt: new Date(now.getTime() - 60000).toISOString(), // 1 minute ago
    merge: false,
    executed: false
  }
  
  const hasFaridabadTest = schedules.some(s => s.id.startsWith("faridabad-test-"))
  if (!hasFaridabadTest) {
    schedules.push(faridabadTestSchedule)
    await saveSchedules(schedules)
    console.log("🧪 Added FARIDABAD1 test schedule:", faridabadTestSchedule)
  }
  
  // Find due schedules for today
  const dueSchedules = schedules.filter(schedule => {
    const scheduleTime = new Date(schedule.publishAt)
    const scheduleDate = schedule.row.date
    return scheduleDate === today && scheduleTime <= now && !schedule.executed
  })
  
  console.log(`🔍 Found ${dueSchedules.length} due schedules for today`)
  
  // Execute due schedules
  for (const schedule of dueSchedules) {
    console.log(`🚀 Executing schedule: ${schedule.id} with data:`, schedule.row)
    await upsertResultRow(schedule.month, schedule.row, !!schedule.merge)
    
    // Mark as executed
    const updatedSchedules = schedules.map(s => 
      s.id === schedule.id ? { ...s, executed: true } : s
    )
    await saveSchedules(updatedSchedules)
    
    console.log(`✅ Executed schedule: ${schedule.id}`)
  }
  
  if (dueSchedules.length > 0) {
    console.log(`✅ Executed ${dueSchedules.length} due schedules`)
  } else {
    console.log(`ℹ️ No due schedules found for today`)
  }
}

export async function upsertResultRow(month: MonthKey, row: any, merge: boolean): Promise<void> {
  console.log("✅ Result row upserted:", { month, row, merge })
  
  try {
    // Get current monthly results
    let monthlyResults = await getMonthlyResults(month)
    
    // Find or create the month data
    if (!monthlyResults) {
      monthlyResults = { 
        month: month,
        fields: Object.keys(row).filter(k => k !== 'date'),
        rows: [],
        updatedAt: new Date().toISOString()
      }
    }
    
    // Find existing row with same date
    const existingRowIndex = monthlyResults.rows.findIndex(r => r.date === row.date)
    
    if (existingRowIndex >= 0) {
      // Update existing row
      if (merge) {
        // Merge the data
        monthlyResults.rows[existingRowIndex] = {
          ...monthlyResults.rows[existingRowIndex],
          ...row
        }
      } else {
        // Replace the row
        monthlyResults.rows[existingRowIndex] = row
      }
    } else {
      // Add new row
      monthlyResults.rows.push(row)
    }
    
    // Save the updated monthly results
    await saveMonthlyResults(monthlyResults)
    console.log(`✅ Updated monthly results for ${month}`)
  } catch (error) {
    console.error("❌ Error in upsertResultRow:", error)
    throw error
  }
}

// Live Schedule Management
const LIVE_SCHEDULES_FILE = join(process.cwd(), 'live-schedules.json')

export async function getLiveSchedules(): Promise<LiveSchedule[]> {
  try {
    if (!existsSync(LIVE_SCHEDULES_FILE)) {
      return []
    }
    const data = readFileSync(LIVE_SCHEDULES_FILE, 'utf-8')
    const schedules = JSON.parse(data) as LiveSchedule[]
    
    // Filter out expired schedules (older than 24 hours)
    const now = new Date()
    const validSchedules = schedules.filter(schedule => {
      const scheduleTime = new Date(schedule.scheduledTime)
      const hoursDiff = (now.getTime() - scheduleTime.getTime()) / (1000 * 60 * 60)
      return hoursDiff < 24 // Keep schedules for 24 hours
    })
    
    // Update expired schedules
    const updatedSchedules = schedules.map(schedule => {
      const scheduleTime = new Date(schedule.scheduledTime)
      const hoursDiff = (now.getTime() - scheduleTime.getTime()) / (1000 * 60 * 60)
      if (hoursDiff >= 24 && schedule.status !== 'expired') {
        return { ...schedule, status: 'expired' as const }
      }
      return schedule
    })
    
    // Save updated schedules if any were marked as expired
    if (updatedSchedules.some(s => s.status === 'expired')) {
      await saveLiveSchedules(updatedSchedules)
    }
    
    return validSchedules
  } catch (error) {
    console.error('Error reading live schedules:', error)
    return []
  }
}

export async function saveLiveSchedules(schedules: LiveSchedule[]): Promise<void> {
  try {
    writeFileSync(LIVE_SCHEDULES_FILE, JSON.stringify(schedules, null, 2))
  } catch (error) {
    console.error('Error saving live schedules:', error)
  }
}

export async function addLiveSchedule(schedule: Omit<LiveSchedule, 'id' | 'createdAt'>): Promise<LiveSchedule> {
  const schedules = await getLiveSchedules()
  const newSchedule: LiveSchedule = {
    ...schedule,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  }
  
  // Remove any existing schedule for the same category
  const filteredSchedules = schedules.filter(s => s.category !== newSchedule.category)
  
  const updatedSchedules = [newSchedule, ...filteredSchedules]
  await saveLiveSchedules(updatedSchedules)
  
  return newSchedule
}

export async function updateLiveSchedule(id: string, updates: Partial<LiveSchedule>): Promise<LiveSchedule | null> {
  const schedules = await getLiveSchedules()
  const index = schedules.findIndex(s => s.id === id)
  
  if (index === -1) {
    return null
  }
  
  const updatedSchedule = { ...schedules[index], ...updates }
  schedules[index] = updatedSchedule
  await saveLiveSchedules(schedules)
  
  return updatedSchedule
}

export async function deleteLiveSchedule(id: string): Promise<boolean> {
  const schedules = await getLiveSchedules()
  const filteredSchedules = schedules.filter(s => s.id !== id)
  
  if (filteredSchedules.length === schedules.length) {
    return false // Schedule not found
  }
  
  await saveLiveSchedules(filteredSchedules)
  return true
}

export async function getActiveLiveSchedules(): Promise<LiveSchedule[]> {
  const schedules = await getLiveSchedules()
  const now = new Date()
  
  return schedules.filter(schedule => {
    const scheduleTime = new Date(schedule.scheduledTime)
    const isToday = scheduleTime.toDateString() === now.toDateString()
    const isActive = schedule.status === 'scheduled' || schedule.status === 'published'
    
    return isToday && isActive
  })
}

export async function publishLiveSchedule(id: string): Promise<LiveSchedule | null> {
  const schedule = await updateLiveSchedule(id, {
    status: 'published',
    publishedAt: new Date().toISOString()
  })
  
  return schedule
}
