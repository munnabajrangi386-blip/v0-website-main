/**
 * Migration Script: JSON to Supabase Database
 * Migrates monthly_results.json to scraped_results table
 * Only extracts base columns (Faridabad, Ghaziabad, Gali, Desawar)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateJSON() {
  try {
    console.log('📖 Reading monthly_results.json...')
    const jsonPath = join(process.cwd(), 'monthly_results.json')
    const jsonContent = readFileSync(jsonPath, 'utf-8')
    const monthlyResults: Record<string, any> = JSON.parse(jsonContent)

    console.log(`📊 Found ${Object.keys(monthlyResults).length} months to process`)

    let totalRows = 0
    let inserted = 0

    // Admin category keys to skip (these go to admin_results, not scraped_results)
    const adminKeys = ['gal12', 'gali2', 'desawar2', 'faridabad2', 'ghaziabad2', 'luxmi_kuber', 'luxmi kuber', 'desawar1', 'gali1', 'faridabad1', 'ghaziabad1']

    // Base column mappings (normalize variations)
    const baseColumnMap: Record<string, string> = {
      'faridabad': 'faridabad',
      'frbd': 'faridabad',
      'ghaziabad': 'ghaziabad',
      'gzbd': 'ghaziabad',
      'gali': 'gali',
      'desawar': 'desawar',
      'disawar': 'desawar',
      'dswr': 'desawar'
    }

    for (const [monthKey, monthData] of Object.entries(monthlyResults)) {
      if (!monthData.rows || !Array.isArray(monthData.rows)) continue

      const batchData = []

      for (const row of monthData.rows) {
        if (!row.date) continue

        const scrapedRow: any = {
          date: row.date,
          updated_at: new Date().toISOString()
        }

        let hasData = false

        // Extract only base columns (skip admin categories)
        for (const [key, value] of Object.entries(row)) {
          if (key === 'date' || !value) continue

          const normalizedKey = key.toLowerCase().trim()
          
          // Skip admin categories
          if (adminKeys.some(adminKey => normalizedKey.includes(adminKey.toLowerCase()))) {
            continue
          }

          // Map to base column
          const baseColumn = baseColumnMap[normalizedKey]
          if (baseColumn && typeof value === 'string' && value !== '--') {
            scrapedRow[baseColumn] = value.toString().padStart(2, '0')
            hasData = true
          }
        }

        if (hasData) {
          batchData.push(scrapedRow)
        }
      }

      if (batchData.length > 0) {
        // Process in batches of 100
        for (let i = 0; i < batchData.length; i += 100) {
          const batch = batchData.slice(i, i + 100)
          
          const { data, error } = await supabase
            .from('scraped_results')
            .upsert(batch, {
              onConflict: 'date',
              ignoreDuplicates: false
            })
            .select()

          if (error) {
            console.error(`❌ Error inserting batch for ${monthKey}:`, error)
          } else {
            totalRows += batch.length
            inserted += data?.length || 0
            console.log(`✅ ${monthKey}: Inserted ${batch.length} rows`)
          }
        }
      }
    }

    console.log('\n✅ Migration completed!')
    console.log(`📊 Total rows processed: ${totalRows}`)
    console.log(`📊 Rows inserted/updated: ${inserted}`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateJSON()

