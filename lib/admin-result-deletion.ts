/**
 * Centralized admin result deletion logic
 * This ensures deleted data is removed from ALL sources: CSV, Supabase, monthly_results.json, and caches
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Normalize category name to handle variations
 */
function normalizeCategory(category: string): string {
  const norm = category.toUpperCase().trim()
  
  // Map to standard column names
  if (norm.includes('GALI') && !norm.includes('LUXMI')) {
    return 'GALI2'
  }
  if (norm.includes('DESAWAR')) {
    return 'DESAWAR2'
  }
  if (norm.includes('FARIDABAD')) {
    return 'FARIDABAD2'
  }
  if (norm.includes('GHAZIABAD')) {
    return 'GHAZIABAD2'
  }
  if (norm.includes('LUXMI') || norm.includes('KUBER')) {
    return 'LUXMI KUBER'
  }
  
  return norm
}

/**
 * Delete admin result from CSV file
 */
export async function deleteFromCSV(date: string, category: string): Promise<void> {
  try {
    const csvPath = join(process.cwd(), 'dummy_gali1_2015_to_today.csv')
    if (!existsSync(csvPath)) {
      console.warn(`⚠️ CSV file not found: ${csvPath}`)
      return
    }

    const csvContent = await readFile(csvPath, 'utf-8')
    const lines = csvContent.trim().split(/\r?\n/)
    if (lines.length === 0) {
      console.warn(`⚠️ CSV file is empty`)
      return
    }

    const header = lines[0].split(',').map((h: string) => h.trim())
    const dateColIdx = header.indexOf('date')
    
    if (dateColIdx === -1) {
      console.warn(`⚠️ Date column not found in CSV`)
      return
    }

    const csvColumnName = normalizeCategory(category)
    const categoryColIdx = header.indexOf(csvColumnName)
    
    if (categoryColIdx === -1) {
      console.warn(`⚠️ Column "${csvColumnName}" not found in CSV header`)
      return
    }

    let found = false
    let updated = false

    // Update all matching rows
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts[dateColIdx]?.trim() === date) {
        const oldValue = parts[categoryColIdx]
        if (oldValue && oldValue.trim() !== '--') {
          parts[categoryColIdx] = '--'
          lines[i] = parts.join(',')
          updated = true
          found = true
          console.log(`✅ CSV: Set ${csvColumnName} to "--" for ${date} (was: ${oldValue})`)
        } else {
          found = true // Row exists but already deleted
        }
        break
      }
    }

    // If row not found, create it with '--' for the category (to ensure it's marked as deleted)
    if (!found) {
      // Create a new row with all columns set to '--' except the category which we're deleting
      const newRow: string[] = new Array(header.length).fill('--')
      newRow[dateColIdx] = date
      
      // Set the category column to '--'
      newRow[categoryColIdx] = '--'
      
      // Insert the row in date order
      let insertIndex = lines.length
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',')
        const existingDate = parts[dateColIdx]?.trim()
        if (existingDate && existingDate > date) {
          insertIndex = i
          break
        }
      }
      
      lines.splice(insertIndex, 0, newRow.join(','))
      updated = true
      found = true
      console.log(`✅ CSV: Created new row for ${date} with ${csvColumnName} set to "--"`)
    }

    if (updated) {
      await writeFile(csvPath, lines.join('\n') + '\n', 'utf-8')
      console.log(`✅ CSV: Successfully deleted ${category} for ${date}`)
    } else {
      console.log(`ℹ️ CSV: ${category} for ${date} was already deleted`)
    }
  } catch (error) {
    console.error(`❌ Error deleting from CSV:`, error)
    throw error
  }
}

/**
 * Delete admin result from monthly_results.json
 */
export async function deleteFromMonthlyResults(date: string, category: string): Promise<void> {
  try {
    const MONTHLY_RESULTS_FILE = join(process.cwd(), 'monthly_results.json')
    if (!existsSync(MONTHLY_RESULTS_FILE)) {
      console.warn(`⚠️ monthly_results.json not found`)
      return
    }

    const content = await readFile(MONTHLY_RESULTS_FILE, 'utf-8')
    const monthlyResults: Record<string, any> = JSON.parse(content)
    
    const monthKey = date.substring(0, 7) // YYYY-MM
    
    if (!monthlyResults[monthKey]) {
      console.warn(`⚠️ No data found for month ${monthKey} in monthly_results.json`)
      return
    }

    const monthData = monthlyResults[monthKey]
    const rowIndex = monthData.rows?.findIndex((r: any) => r.date === date)
    
    if (rowIndex === -1) {
      console.warn(`⚠️ No row found for date ${date} in monthly_results.json`)
      return
    }

    const row = monthData.rows[rowIndex]
    const categoryNorm = normalizeCategory(category).toLowerCase()
    
    // Find all matching keys to delete
    const keysToDelete: string[] = []
    Object.keys(row).forEach(key => {
      if (key === 'date') return
      
      const keyNorm = key.toLowerCase()
      const csvColumnName = normalizeCategory(category).toLowerCase()
      
      // Match based on category
      if (
        (csvColumnName === 'gali2' && (keyNorm.includes('gali2') || keyNorm.includes('gali1') || keyNorm === 'gal12')) ||
        (csvColumnName === 'desawar2' && (keyNorm.includes('desawar2') || keyNorm.includes('desawar1'))) ||
        (csvColumnName === 'faridabad2' && (keyNorm.includes('faridabad2') || keyNorm.includes('faridabad1'))) ||
        (csvColumnName === 'ghaziabad2' && (keyNorm.includes('ghaziabad2') || keyNorm.includes('ghaziabad1'))) ||
        (csvColumnName === 'luxmi kuber' && (keyNorm.includes('luxmi') || keyNorm.includes('kuber')))
      ) {
        keysToDelete.push(key)
      }
    })

    if (keysToDelete.length === 0) {
      console.warn(`⚠️ No matching keys found to delete for category ${category} in monthly_results.json`)
      return
    }

    // Delete the keys
    keysToDelete.forEach(key => {
      const oldValue = row[key]
      delete row[key]
      console.log(`✅ monthly_results.json: Deleted ${key} (was: ${oldValue}) for ${date}`)
    })

    // Update timestamp
    monthlyResults[monthKey].updatedAt = new Date().toISOString()

    // Write back to file
    await writeFile(MONTHLY_RESULTS_FILE, JSON.stringify(monthlyResults, null, 2), 'utf-8')
    console.log(`✅ monthly_results.json: Successfully deleted ${keysToDelete.join(', ')} for ${date}`)
  } catch (error) {
    console.error(`❌ Error deleting from monthly_results.json:`, error)
    throw error
  }
}

/**
 * Delete admin result from Supabase
 */
export async function deleteFromSupabase(date: string, category: string): Promise<void> {
  try {
    const { deleteAdminResult } = require('./supabase-db')
    await deleteAdminResult(date, category)
    console.log(`✅ Supabase: Successfully deleted ${category} for ${date}`)
    
    // Verify deletion by checking if the value is now NULL
    // Wait a moment for the database to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { getAdminResults } = require('./supabase-db')
    const startDate = date.substring(0, 8) + '01' // Start of month
    const endDate = date.substring(0, 8) + '31' // End of month
    const results = await getAdminResults(startDate, endDate)
    const deletedRow = results.find((r: any) => r.date === date)
    
    if (deletedRow) {
      const csvColumnName = normalizeCategory(category).toLowerCase()
      let columnName = ''
      if (csvColumnName === 'gali2') columnName = 'gal12'
      else if (csvColumnName === 'desawar2') columnName = 'desawar2'
      else if (csvColumnName === 'faridabad2') columnName = 'faridabad2'
      else if (csvColumnName === 'ghaziabad2') columnName = 'ghaziabad2'
      else if (csvColumnName === 'luxmi kuber') columnName = 'luxmi_kuber'
      
      if (columnName && deletedRow[columnName] === null || deletedRow[columnName] === undefined) {
        console.log(`✅ Supabase: Verified deletion - ${columnName} is now NULL for ${date}`)
      } else {
        console.warn(`⚠️ Supabase: Deletion may not have worked - ${columnName} still has value: ${deletedRow[columnName]}`)
      }
    }
  } catch (error: any) {
    // Don't throw if Supabase is not configured
    if (error.message?.includes('not configured') || error.code === 'PGRST205') {
      console.log(`ℹ️ Supabase: Not configured, skipping deletion`)
      return
    }
    console.error(`❌ Error deleting from Supabase:`, error)
    // Don't throw - continue with other deletions
  }
}

/**
 * Clear CSV cache
 */
export function clearCSVCache(): void {
  try {
    const { clearCache } = require('./csv-cache')
    clearCache()
    console.log(`✅ CSV cache cleared`)
  } catch (error) {
    console.error(`❌ Error clearing CSV cache:`, error)
    // Don't throw - continue
  }
}

/**
 * Main deletion function - removes data from ALL sources
 */
export async function deleteAdminResultCompletely(date: string, category: string): Promise<void> {
  console.log(`\n🗑️ ==========================================`)
  console.log(`🗑️ Starting complete deletion for ${category} on ${date}`)
  console.log(`🗑️ ==========================================\n`)

  try {
    // 1. Clear CSV cache FIRST (so fresh data is loaded)
    clearCSVCache()

    // 2. Delete from CSV file
    await deleteFromCSV(date, category)

    // 3. Delete from monthly_results.json
    await deleteFromMonthlyResults(date, category)

    // 4. Delete from Supabase
    await deleteFromSupabase(date, category)

    // 5. Clear CSV cache AGAIN (after all deletions)
    clearCSVCache()

    console.log(`\n✅ ==========================================`)
    console.log(`✅ Successfully deleted ${category} for ${date} from all sources`)
    console.log(`✅ ==========================================\n`)
  } catch (error) {
    console.error(`\n❌ ==========================================`)
    console.error(`❌ Error during deletion:`, error)
    console.error(`❌ ==========================================\n`)
    throw error
  }
}
