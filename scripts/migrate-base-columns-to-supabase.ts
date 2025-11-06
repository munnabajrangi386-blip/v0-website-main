/**
 * Migration Script: Base Columns CSV to Supabase Database
 * Migrates comprehensive_historical_data.csv to scraped_results table
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
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateBaseColumns() {
  try {
    console.log('📖 Reading comprehensive_historical_data.csv...')
    const csvPath = join(process.cwd(), 'comprehensive_historical_data.csv')
    const csvContent = readFileSync(csvPath, 'utf-8')
    const lines = csvContent.trim().split(/\r?\n/)

    if (lines.length === 0) {
      console.error('❌ CSV file is empty')
      return
    }

    const headers = lines[0].split(',')
    const idxDate = headers.indexOf('date')
    const idxFrbd = headers.indexOf('frbd')
    const idxGzbd = headers.indexOf('gzbd')
    const idxGali = headers.indexOf('gali')
    const idxDswr = headers.indexOf('dswr')
    const idxSourceUrl = headers.indexOf('source_url')

    if (idxDate === -1) {
      console.error('❌ Date column not found in CSV')
      return
    }

    console.log(`📊 Found ${lines.length - 1} rows to migrate`)

    // Process in batches of 100 for better performance
    const batchSize = 100
    let processed = 0
    let inserted = 0

    for (let i = 1; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize)
      const batchData = []

      for (const line of batch) {
        const parts = line.split(',')
        if (parts.length < 2) continue

        const dateStr = parts[idxDate]?.trim()
        if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue

        const row: any = {
          date: dateStr,
          updated_at: new Date().toISOString()
        }

        // Map CSV columns to database columns
        if (idxFrbd !== -1 && parts[idxFrbd]?.trim() && parts[idxFrbd].trim() !== '--' && parts[idxFrbd].trim() !== '') {
          row.faridabad = parts[idxFrbd].trim().padStart(2, '0')
        }
        if (idxGzbd !== -1 && parts[idxGzbd]?.trim() && parts[idxGzbd].trim() !== '--' && parts[idxGzbd].trim() !== '') {
          row.ghaziabad = parts[idxGzbd].trim().padStart(2, '0')
        }
        if (idxGali !== -1 && parts[idxGali]?.trim() && parts[idxGali].trim() !== '--' && parts[idxGali].trim() !== '') {
          row.gali = parts[idxGali].trim().padStart(2, '0')
        }
        if (idxDswr !== -1 && parts[idxDswr]?.trim() && parts[idxDswr].trim() !== '--' && parts[idxDswr].trim() !== '') {
          row.desawar = parts[idxDswr].trim().padStart(2, '0')
        }
        if (idxSourceUrl !== -1 && parts[idxSourceUrl]?.trim()) {
          row.source_url = parts[idxSourceUrl].trim()
        }

        // Only add row if it has at least one data column
        if (row.faridabad || row.ghaziabad || row.gali || row.desawar) {
          batchData.push(row)
        }
      }

      if (batchData.length > 0) {
        const { data, error } = await supabase
          .from('scraped_results')
          .upsert(batchData, {
            onConflict: 'date',
            ignoreDuplicates: false
          })
          .select()

        if (error) {
          console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error)
        } else {
          processed += batchData.length
          inserted += data?.length || 0
          console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}: ${batchData.length} rows (Total: ${processed})`)
        }
      }
    }

    console.log('\n✅ Migration completed!')
    console.log(`📊 Total rows processed: ${processed}`)
    console.log(`📊 Rows inserted/updated: ${inserted}`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateBaseColumns()

