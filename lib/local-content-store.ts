import type { SiteContent, MonthlyResults, ScheduleItem, ActivityLog, MonthKey, LiveSchedule } from './types'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { saveToStorage, loadFromStorage, storageExists } from './storage-adapter'

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
        // Content loaded from localStorage
      }
    } else {
      // Server environment - use file system
      const contentFile = join(process.cwd(), 'content.json')
      if (existsSync(contentFile)) {
        const savedContent = readFileSync(contentFile, 'utf8')
        localContent = JSON.parse(savedContent)
        contentUpdated = true
        // Content loaded from file
      }
    }
  } catch (error) {
    // Using default content
  }
}

// Initialize content on startup
loadPersistedContent()

export async function getSiteContent(): Promise<SiteContent> {
  // Force reload from storage on server to ensure fresh data
  if (typeof window === 'undefined') {
    try {
      const storedContent = await loadFromStorage<SiteContent>('content.json')
      if (storedContent) {
        // Always load from storage if it exists - stored content takes precedence
        localContent = { ...DUMMY_CONTENT, ...storedContent }
        // Content reloaded from storage
      } else {
        // If storage doesn't exist, try local file as fallback
        const contentFile = join(process.cwd(), 'content.json')
        if (existsSync(contentFile)) {
          const savedContent = readFileSync(contentFile, 'utf8')
          const fileContent = JSON.parse(savedContent)
          localContent = { ...DUMMY_CONTENT, ...fileContent }
        }
      }
    } catch (error) {
      // Could not reload from storage
      console.error('Error loading content:', error)
    }
  }
  
  return localContent
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  // Update the in-memory content
  localContent = { ...content, updatedAt: new Date().toISOString() }
  contentUpdated = true
  
  // Saving content
  
  // Persist to localStorage in browser or storage on server
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('site-content', JSON.stringify(localContent))
      // Content saved to localStorage
    } else {
      // Server environment - save to storage (Blob in production, file in dev)
      await saveToStorage('content.json', localContent)
      // Also save to local file as backup in development
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        const contentFile = join(process.cwd(), 'content.json')
        writeFileSync(contentFile, JSON.stringify(localContent, null, 2))
      }
    }
  } catch (error) {
    console.error('Failed to save content:', error)
    throw error // Re-throw so caller knows it failed
  }
  
  // Content saved successfully
}

// Store monthly results by month key (e.g., "2025-10")
const MONTHLY_RESULTS_FILE = join(process.cwd(), 'monthly_results.json')

// Load persisted monthly results on startup
let monthlyResultsCache: Record<MonthKey, MonthlyResults> = {}
function loadPersistedMonthlyResults() {
  try {
    if (typeof window === 'undefined') {
      // Server environment - use file system
      if (existsSync(MONTHLY_RESULTS_FILE)) {
        const saved = readFileSync(MONTHLY_RESULTS_FILE, 'utf8')
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          monthlyResultsCache = parsed
          // Monthly results loaded from file
        }
      }
    }
  } catch (error) {
    // Using empty cache
  }
}

// Initialize monthly results on startup
loadPersistedMonthlyResults()

export async function getMonthlyResults(month: MonthKey): Promise<MonthlyResults | null> {
  // Always reload from storage on server to ensure fresh data
  if (typeof window === 'undefined') {
    try {
      const storedResults = await loadFromStorage<Record<string, MonthlyResults>>('monthly_results.json')
      if (storedResults && typeof storedResults === 'object') {
        monthlyResultsCache = storedResults
        // Monthly results reloaded from storage
      } else if (existsSync(MONTHLY_RESULTS_FILE)) {
        // Fallback to local file
        const saved = readFileSync(MONTHLY_RESULTS_FILE, 'utf8')
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          monthlyResultsCache = parsed
        }
      }
    } catch (error) {
      console.error('Error loading monthly results:', error)
    }
  }
  
  return monthlyResultsCache[month] || null
}

export async function saveMonthlyResults(data: MonthlyResults): Promise<void> {
  // Update the in-memory cache
  monthlyResultsCache[data.month] = { ...data, updatedAt: new Date().toISOString() }
  
  // Persist to storage on server
  try {
    if (typeof window === 'undefined') {
      // Server environment - save to storage (Blob in production, file in dev)
      await saveToStorage('monthly_results.json', monthlyResultsCache)
      // Also save to local file as backup in development
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        writeFileSync(MONTHLY_RESULTS_FILE, JSON.stringify(monthlyResultsCache, null, 2))
      }
      // Monthly results saved to storage
    }
  } catch (error) {
    console.error('Failed to save monthly results:', error)
    throw error // Re-throw so caller knows it failed
  }
  
  // Monthly results saved successfully
}

const SCHEDULES_FILE = join(process.cwd(), 'schedules.json')

// Load persisted schedules on startup
function loadPersistedSchedules() {
  try {
    if (typeof window === 'undefined') {
      // Server environment - use file system
      if (existsSync(SCHEDULES_FILE)) {
        const savedSchedules = readFileSync(SCHEDULES_FILE, 'utf8')
        const parsed = JSON.parse(savedSchedules)
        if (Array.isArray(parsed)) {
          localSchedules = parsed
          // Schedules loaded from file
        }
      }
    }
  } catch (error) {
    // Using default schedules
  }
}

// Initialize schedules on startup
loadPersistedSchedules()

export async function getSchedules(): Promise<ScheduleItem[]> {
  // Always reload from storage on server to ensure fresh data
  if (typeof window === 'undefined') {
    try {
      const storedSchedules = await loadFromStorage<ScheduleItem[]>('schedules.json')
      if (storedSchedules && Array.isArray(storedSchedules)) {
        localSchedules = storedSchedules
        // Schedules reloaded from storage
      } else if (existsSync(SCHEDULES_FILE)) {
        // Fallback to local file
        const savedSchedules = readFileSync(SCHEDULES_FILE, 'utf8')
        const parsed = JSON.parse(savedSchedules)
        if (Array.isArray(parsed)) {
          localSchedules = parsed
        }
      }
    } catch (error) {
      console.error('Error loading schedules:', error)
    }
  }
  return localSchedules
}

export async function saveSchedules(schedules: ScheduleItem[]): Promise<void> {
  // Update the in-memory schedules
  localSchedules = [...schedules]
  
  // Persist to storage on server
  try {
    if (typeof window === 'undefined') {
      // Server environment - save to storage (Blob in production, file in dev)
      await saveToStorage('schedules.json', localSchedules)
      // Also save to local file as backup in development
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        writeFileSync(SCHEDULES_FILE, JSON.stringify(localSchedules, null, 2))
      }
      // Schedules saved to storage
    }
  } catch (error) {
    console.error('Failed to save schedules:', error)
    throw error // Re-throw so caller knows it failed
  }
  
  // Schedules saved successfully
}

export async function appendActivity(activity: ActivityLog): Promise<void> {
  // Activity logged
}

export async function runDueSchedules(): Promise<void> {
  // Running due schedules
  
  const schedules = await getSchedules()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  // Find due schedules for today or past dates that haven't been executed
  const dueSchedules = schedules.filter(schedule => {
    const scheduleTime = new Date(schedule.publishAt)
    const scheduleDate = schedule.row.date
    return scheduleDate <= today && scheduleTime <= now && !schedule.executed
  })
  
  // Found due schedules for today
  
  // Execute due schedules and update incrementally
  let currentSchedules = [...schedules] // Work with a copy that we update as we go
  for (const schedule of dueSchedules) {
    // Executing schedule
    await upsertResultRow(schedule.month, schedule.row, !!schedule.merge)
    
    // Mark as executed in the current schedules array
    currentSchedules = currentSchedules.map(s => 
      s.id === schedule.id ? { ...s, executed: true } : s
    )
    
    // Executed schedule
  }
  
  // Save all updated schedules at once after processing all due schedules
  if (dueSchedules.length > 0) {
    await saveSchedules(currentSchedules)
  }
  
  // Due schedules execution completed
}

export async function upsertResultRow(month: MonthKey, row: any, merge: boolean): Promise<void> {
  // Result row upserted
  
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
    // Updated monthly results
  } catch (error) {
    console.error("❌ Error in upsertResultRow:", error)
    throw error
  }
}

// Live Schedule Management
const LIVE_SCHEDULES_FILE = join(process.cwd(), 'live-schedules.json')

export async function getLiveSchedules(): Promise<LiveSchedule[]> {
  if (typeof window !== 'undefined') {
    return []
  }
  
  try {
    const storedSchedules = await loadFromStorage<LiveSchedule[]>('live-schedules.json')
    let schedules: LiveSchedule[] = []
    
    if (storedSchedules && Array.isArray(storedSchedules)) {
      schedules = storedSchedules
    } else if (existsSync(LIVE_SCHEDULES_FILE)) {
      // Fallback to local file
      const data = readFileSync(LIVE_SCHEDULES_FILE, 'utf-8')
      schedules = JSON.parse(data) as LiveSchedule[]
    }
    
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
    if (typeof window === 'undefined') {
      // Server environment - save to storage (Blob in production, file in dev)
      await saveToStorage('live-schedules.json', schedules)
      // Also save to local file as backup in development
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        writeFileSync(LIVE_SCHEDULES_FILE, JSON.stringify(schedules, null, 2))
      }
    }
  } catch (error) {
    console.error('Failed to save live schedules:', error)
    throw error // Re-throw so caller knows it failed
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
