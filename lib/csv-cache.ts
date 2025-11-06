/**
 * CSV Cache - Fast in-memory caching for CSV data
 * Parses CSV once and caches in memory for instant access
 */
import { readFile } from 'fs/promises'
import { join } from 'path'

interface CachedAdminRow {
  date: string
  GALI2?: string
  DESAWAR2?: string
  FARIDABAD2?: string
  GHAZIABAD2?: string
  'LUXMI KUBER'?: string
}

interface CachedBaseRow {
  date: string
  FARIDABAD?: number
  GHAZIABAD?: number
  GALI?: number
  DESAWAR?: number
}

// In-memory caches
let adminDataCache: Map<string, CachedAdminRow> | null = null // date -> row
let baseDataCache: Map<string, CachedBaseRow> | null = null // date -> row
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Load and cache admin CSV data (GALI2, DESAWAR2, etc.)
 */
async function loadAdminCache(): Promise<Map<string, CachedAdminRow>> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (adminDataCache && (now - cacheTimestamp < CACHE_TTL)) {
    return adminDataCache
  }

  // Load fresh data
  const cache = new Map<string, CachedAdminRow>()
  
  try {
    const csvPath = join(process.cwd(), 'dummy_gali1_2015_to_today.csv')
    const raw = await readFile(csvPath, 'utf-8')
    const lines = raw.trim().split(/\r?\n/)
    
    if (lines.length === 0) {
      return cache
    }
    
    const headers = lines[0].split(',')
    const idxDate = headers.indexOf('date')
    const idxGali2 = headers.indexOf('GALI2')
    const idxDesawar2 = headers.indexOf('DESAWAR2')
    const idxFaridabad2 = headers.indexOf('FARIDABAD2')
    const idxGhaziabad2 = headers.indexOf('GHAZIABAD2')
    const idxLuxmiKuber = headers.indexOf('LUXMI KUBER')
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const parts = line.split(',')
      if (parts.length < 2 || idxDate === -1) continue
      
      const dateStr = parts[idxDate]?.trim()
      if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue
      
      const row: CachedAdminRow = { date: dateStr }
      
      if (idxGali2 !== -1 && parts[idxGali2]?.trim() && parts[idxGali2].trim() !== '--') {
        row.GALI2 = parts[idxGali2].trim().padStart(2, '0')
      }
      if (idxDesawar2 !== -1 && parts[idxDesawar2]?.trim() && parts[idxDesawar2].trim() !== '--') {
        row.DESAWAR2 = parts[idxDesawar2].trim().padStart(2, '0')
      }
      if (idxFaridabad2 !== -1 && parts[idxFaridabad2]?.trim() && parts[idxFaridabad2].trim() !== '--') {
        row.FARIDABAD2 = parts[idxFaridabad2].trim().padStart(2, '0')
      }
      if (idxGhaziabad2 !== -1 && parts[idxGhaziabad2]?.trim() && parts[idxGhaziabad2].trim() !== '--') {
        row.GHAZIABAD2 = parts[idxGhaziabad2].trim().padStart(2, '0')
      }
      if (idxLuxmiKuber !== -1 && parts[idxLuxmiKuber]?.trim() && parts[idxLuxmiKuber].trim() !== '--') {
        row['LUXMI KUBER'] = parts[idxLuxmiKuber].trim().padStart(2, '0')
      }
      
      if (Object.keys(row).length > 1) { // More than just date
        cache.set(dateStr, row)
      }
    }
  } catch (error) {
    console.error('Error loading admin CSV cache:', error)
  }
  
  adminDataCache = cache
  cacheTimestamp = now
  return cache
}

/**
 * Load and cache base CSV data (Faridabad, Ghaziabad, Gali, Desawar)
 */
async function loadBaseCache(): Promise<Map<string, CachedBaseRow>> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (baseDataCache && (now - cacheTimestamp < CACHE_TTL)) {
    return baseDataCache
  }

  // Load fresh data
  const cache = new Map<string, CachedBaseRow>()
  
  // Try multiple CSV files in order
  const csvFilesToTry = [
    'satta_2025_complete.csv',
    'comprehensive_historical_data.csv'
  ]
  
  for (const csvFileName of csvFilesToTry) {
    try {
      const { access } = require('fs/promises')
      const csvPath = join(process.cwd(), csvFileName)
      
      // Check if file exists
      try {
        await access(csvPath)
      } catch {
        continue
      }
      
      const raw = await readFile(csvPath, 'utf-8')
      const lines = raw.trim().split(/\r?\n/)
      if (lines.length < 2) continue
      
      const headers = lines[0].split(',')
      const idxDate = headers.indexOf('date')
      const idxFrbd = headers.indexOf('frbd')
      const idxGzbd = headers.indexOf('gzbd')
      const idxGali = headers.indexOf('gali')
      const idxDswr = headers.indexOf('dswr')
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const parts = line.split(',')
        if (parts.length < 2 || idxDate === -1) continue
        
        const dateStr = parts[idxDate]?.trim()
        if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue
        
        // Skip if already cached from a previous file
        if (cache.has(dateStr)) continue
        
        const row: CachedBaseRow = { date: dateStr }
        
        if (idxFrbd !== -1 && parts[idxFrbd]?.trim() && parts[idxFrbd].trim() !== '--' && parts[idxFrbd].trim() !== '') {
          const val = parseInt(parts[idxFrbd].trim(), 10)
          if (!isNaN(val)) row.FARIDABAD = val
        }
        if (idxGzbd !== -1 && parts[idxGzbd]?.trim() && parts[idxGzbd].trim() !== '--' && parts[idxGzbd].trim() !== '') {
          const val = parseInt(parts[idxGzbd].trim(), 10)
          if (!isNaN(val)) row.GHAZIABAD = val
        }
        if (idxGali !== -1 && parts[idxGali]?.trim() && parts[idxGali].trim() !== '--' && parts[idxGali].trim() !== '') {
          const val = parseInt(parts[idxGali].trim(), 10)
          if (!isNaN(val)) row.GALI = val
        }
        if (idxDswr !== -1 && parts[idxDswr]?.trim() && parts[idxDswr].trim() !== '--' && parts[idxDswr].trim() !== '') {
          const val = parseInt(parts[idxDswr].trim(), 10)
          if (!isNaN(val)) row.DESAWAR = val
        }
        
        if (Object.keys(row).length > 1) { // More than just date
          cache.set(dateStr, row)
        }
      }
      
      // If we loaded data from this file, we're done
      if (cache.size > 0) break
    } catch (error) {
      // Try next file
      continue
    }
  }
  
  baseDataCache = cache
  return cache
}

/**
 * Get admin data for a specific month (cached)
 */
export async function getAdminDataForMonth(year: number, month: number): Promise<Record<number, { GALI2?: string; DESAWAR2?: string; FARIDABAD2?: string; GHAZIABAD2?: string; 'LUXMI KUBER'?: string }>> {
  const cache = await loadAdminCache()
  const result: Record<number, any> = {}
  
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  
  for (const [date, row] of cache.entries()) {
    if (date.startsWith(monthPrefix)) {
      const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!dateMatch) continue
      
      const d = parseInt(dateMatch[3], 10)
      if (d >= 1 && d <= 31) {
        const data: any = {}
        if (row.GALI2) data.GALI2 = row.GALI2
        if (row.DESAWAR2) data.DESAWAR2 = row.DESAWAR2
        if (row.FARIDABAD2) data.FARIDABAD2 = row.FARIDABAD2
        if (row.GHAZIABAD2) data.GHAZIABAD2 = row.GHAZIABAD2
        if (row['LUXMI KUBER']) data['LUXMI KUBER'] = row['LUXMI KUBER']
        
        if (Object.keys(data).length > 0) {
          result[d] = data
        }
      }
    }
  }
  
  return result
}

/**
 * Get base data for a specific month (cached)
 */
export async function getBaseDataForMonth(year: number, month: number): Promise<Record<number, { FARIDABAD?: number; GHAZIABAD?: number; GALI?: number; DESAWAR?: number }>> {
  const cache = await loadBaseCache()
  const result: Record<number, any> = {}
  
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  
  for (const [date, row] of cache.entries()) {
    if (date.startsWith(monthPrefix)) {
      const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!dateMatch) continue
      
      const d = parseInt(dateMatch[3], 10)
      if (d >= 1 && d <= 31) {
        const data: any = {}
        if (row.FARIDABAD !== undefined) data.FARIDABAD = row.FARIDABAD
        if (row.GHAZIABAD !== undefined) data.GHAZIABAD = row.GHAZIABAD
        if (row.GALI !== undefined) data.GALI = row.GALI
        if (row.DESAWAR !== undefined) data.DESAWAR = row.DESAWAR
        
        if (Object.keys(data).length > 0) {
          result[d] = data
        }
      }
    }
  }
  
  return result
}

/**
 * Get admin data for a specific date (cached)
 */
export async function getAdminDataForDate(date: string): Promise<CachedAdminRow | null> {
  const cache = await loadAdminCache()
  return cache.get(date) || null
}

/**
 * Clear cache (useful for testing or when CSV is updated)
 */
export function clearCache(): void {
  adminDataCache = null
  baseDataCache = null
  cacheTimestamp = 0
}

/**
 * Pre-load caches in parallel (call this on server startup for faster first request)
 */
export async function preloadCaches(): Promise<void> {
  try {
    await Promise.all([
      loadAdminCache(),
      loadBaseCache()
    ])
    console.log('✅ CSV caches preloaded successfully')
  } catch (error) {
    console.error('❌ Error preloading caches:', error)
  }
}

