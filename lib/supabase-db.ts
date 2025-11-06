/**
 * Supabase Database Service Layer
 * Handles all database operations using Supabase client
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { MonthKey } from './types'

// Lazy initialization to avoid build-time errors
function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

function getSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

// ==================== ADMIN RESULTS ====================

export interface AdminResultRow {
  date: string // YYYY-MM-DD
  gal12?: string
  desawar2?: string
  faridabad2?: string
  ghaziabad2?: string
  luxmi_kuber?: string
}

export async function getAdminResults(startDate?: string, endDate?: string): Promise<AdminResultRow[]> {
  try {
    const supabase = getSupabase()
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<AdminResultRow[]>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 3000) // 3 second timeout
    })

    let query = supabase
      .from('admin_results')
      .select('date, gal12, desawar2, faridabad2, ghaziabad2, luxmi_kuber')
      .order('date', { ascending: true })

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const queryPromise = query.then(({ data, error }) => {
      if (error) {
        console.error('Error fetching admin results:', error)
        return []
      }
      return data || []
    })

    const result = await Promise.race([queryPromise, timeoutPromise])
    return result
  } catch (error) {
    console.error('Error in getAdminResults (will fallback to CSV):', error)
    return []
  }
}

export async function upsertAdminResult(date: string, data: Partial<AdminResultRow>): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('admin_results')
      .upsert({
        date,
        ...data,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      })

    if (error) {
      console.error('Error upserting admin result:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in upsertAdminResult:', error)
    throw error
  }
}

export async function deleteAdminResult(date: string, category: string): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Map category to database column name
    const categoryNorm = category.toLowerCase().trim()
    let columnName = ''
    
    // Try exact matches first
    if (categoryNorm === 'gali2' || categoryNorm === 'gali1' || categoryNorm === 'gal12') {
      columnName = 'gal12'
    } else if (categoryNorm === 'desawar2' || categoryNorm === 'desawar1') {
      columnName = 'desawar2'
    } else if (categoryNorm === 'faridabad2' || categoryNorm === 'faridabad1') {
      columnName = 'faridabad2'
    } else if (categoryNorm === 'ghaziabad2' || categoryNorm === 'ghaziabad1') {
      columnName = 'ghaziabad2'
    } else if (categoryNorm === 'luxmi kuber' || categoryNorm === 'luxmikuber' || (categoryNorm.includes('luxmi') && categoryNorm.includes('kuber'))) {
      columnName = 'luxmi_kuber'
    } else if (categoryNorm.includes('gali') && !categoryNorm.includes('luxmi')) {
      columnName = 'gal12'
    } else if (categoryNorm.includes('desawar')) {
      columnName = 'desawar2'
    } else if (categoryNorm.includes('faridabad')) {
      columnName = 'faridabad2'
    } else if (categoryNorm.includes('ghaziabad')) {
      columnName = 'ghaziabad2'
    } else if (categoryNorm.includes('luxmi') || categoryNorm.includes('kuber')) {
      columnName = 'luxmi_kuber'
    }
    
    if (!columnName) {
      console.warn(`⚠️ Unknown category for deletion: "${category}" (normalized: "${categoryNorm}")`)
      return
    }
    
    console.log(`🗑️ Deleting from Supabase: date=${date}, column=${columnName}, category="${category}"`)
    
    // First check if the row exists
    const { data: existingRow } = await supabaseAdmin
      .from('admin_results')
      .select('*')
      .eq('date', date)
      .single()

    if (existingRow) {
      // Update the row to set the column to NULL
      const { error } = await supabaseAdmin
        .from('admin_results')
        .update({ [columnName]: null, updated_at: new Date().toISOString() })
        .eq('date', date)

      if (error) {
        console.error('❌ Error deleting admin result from Supabase:', error)
        throw error
      }
      
      console.log(`✅ Successfully deleted ${columnName} from Supabase for ${date}`)
    } else {
      // Row doesn't exist, create it with NULL for this column to mark it as deleted
      const { error } = await supabaseAdmin
        .from('admin_results')
        .insert({
          date,
          [columnName]: null,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Error creating deletion marker in Supabase:', error)
        throw error
      }
      
      console.log(`✅ Created deletion marker for ${columnName} in Supabase for ${date}`)
    }
  } catch (error) {
    console.error('❌ Error in deleteAdminResult:', error)
    // Don't throw - allow CSV deletion to continue even if Supabase fails
  }
}

// ==================== SCRAPED RESULTS ====================

export interface ScrapedResultRow {
  date: string // YYYY-MM-DD
  faridabad?: string
  ghaziabad?: string
  gali?: string
  desawar?: string
  source_url?: string
}

export async function getScrapedResults(startDate?: string, endDate?: string): Promise<ScrapedResultRow[]> {
  try {
    const supabase = getSupabase()
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<ScrapedResultRow[]>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 3000) // 3 second timeout
    })

    let query = supabase
      .from('scraped_results')
      .select('date, faridabad, ghaziabad, gali, desawar, source_url')
      .order('date', { ascending: true })

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const queryPromise = query.then(({ data, error }) => {
      if (error) {
        console.error('Error fetching scraped results:', error)
        return []
      }
      return data || []
    })

    const result = await Promise.race([queryPromise, timeoutPromise])
    return result
  } catch (error) {
    console.error('Error in getScrapedResults (will fallback to CSV):', error)
    return []
  }
}

export async function upsertScrapedResult(date: string, data: Partial<ScrapedResultRow>): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('scraped_results')
      .upsert({
        date,
        ...data,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      })

    if (error) {
      console.error('Error upserting scraped result:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in upsertScrapedResult:', error)
    throw error
  }
}

// ==================== SCHEDULES ====================

export interface ScheduleRow {
  id: string
  category_key: string
  category_label?: string
  publish_at: string
  result_value: string
  result_date: string
  month_key: string
  executed: boolean
  merge: boolean
  row_data?: any
  created_at?: string
  updated_at?: string
}

export async function getSchedules(): Promise<ScheduleRow[] | null> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('publish_at', { ascending: false })

    if (error) {
      // If table doesn't exist, return null to signal fallback
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return null
      }
      console.error('Error fetching schedules:', error)
      return [] // Empty array means table exists but no data
    }

    return data || []
  } catch (error: any) {
    // If table doesn't exist, return null to signal fallback
    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      return null
    }
    console.error('Error in getSchedules:', error)
    return [] // Empty array means table exists but no data
  }
}

export async function saveSchedule(schedule: Partial<ScheduleRow> & { id: string }): Promise<ScheduleRow> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    // Use upsert to handle both insert and update
    const { data, error } = await supabaseAdmin
      .from('schedules')
      .upsert({
        ...schedule,
        updated_at: new Date().toISOString(),
        created_at: schedule.created_at || new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving schedule:', error)
      throw error
    }

    return data
  } catch (error: any) {
    // If table doesn't exist or other database error, throw with more context
    if (error.code === '42P01') {
      throw new Error('Schedules table does not exist in database. Please run migration scripts.')
    }
    console.error('Error in saveSchedule:', error)
    throw error
  }
}

export async function updateSchedule(id: string, schedule: Partial<ScheduleRow>): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('schedules')
      .update({
        ...schedule,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating schedule:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in updateSchedule:', error)
    throw error
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('schedules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting schedule:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteSchedule:', error)
    throw error
  }
}

export async function runDueSchedules(): Promise<void> {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // Get all due schedules
    const supabaseAdmin = getSupabaseAdmin()
    const { data: dueSchedules, error: fetchError } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('executed', false)
      .lte('result_date', today)
      .lte('publish_at', now.toISOString())

    if (fetchError) {
      console.error('Error fetching due schedules:', fetchError)
      return
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return
    }

    // Execute each schedule
    for (const schedule of dueSchedules) {
      try {
        // Extract admin category data from row_data
        const rowData = schedule.row_data || {}
        const adminData: Partial<AdminResultRow> = {}

        // Map category keys to admin_results columns
        const categoryKey = schedule.category_key.toLowerCase()
        if (categoryKey.includes('gali')) {
          adminData.gal12 = schedule.result_value
        } else if (categoryKey.includes('desawar')) {
          adminData.desawar2 = schedule.result_value
        } else if (categoryKey.includes('faridabad')) {
          adminData.faridabad2 = schedule.result_value
        } else if (categoryKey.includes('ghaziabad')) {
          adminData.ghaziabad2 = schedule.result_value
        } else if (categoryKey.includes('luxmi') || categoryKey.includes('kuber')) {
          adminData.luxmi_kuber = schedule.result_value
        }

        // Update admin_results table
        if (Object.keys(adminData).length > 0) {
          await upsertAdminResult(schedule.result_date, adminData)
        }

        // Mark schedule as executed
        await updateSchedule(schedule.id, { executed: true })
      } catch (error) {
        console.error(`Error executing schedule ${schedule.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in runDueSchedules:', error)
  }
}

// ==================== SITE CONTENT ====================

export async function getSiteContent(id: string = 'site_content'): Promise<any | null> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('site_content')
      .select('data')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - return null
        return null
      }
      console.error('Error fetching site content:', error)
      return null
    }

    return data?.data || null
  } catch (error) {
    console.error('Error in getSiteContent:', error)
    return null
  }
}

export async function saveSiteContent(id: string, content: any): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('site_content')
      .upsert({
        id,
        data: content,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving site content:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in saveSiteContent:', error)
    throw error
  }
}

