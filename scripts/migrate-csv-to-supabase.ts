/**
 * Migration Script: CSV to Supabase Database
 * Migrates dummy_gali1_2015_to_today.csv to admin_results table
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

async function migrateCSV() {
  try {
    console.log('📖 Reading CSV file...')
    const csvPath = join(process.cwd(), 'dummy_gali1_2015_to_today.csv')
    const csvContent = readFileSync(csvPath, 'utf-8')
    const lines = csvContent.trim().split(/\r?\n/)

    if (lines.length === 0) {
      console.error('❌ CSV file is empty')
      return
    }

    const headers = lines[0].split(',')
    const idxDate = headers.indexOf('date')
    const idxGali2 = headers.indexOf('GALI2')
    const idxDesawar2 = headers.indexOf('DESAWAR2')
    const idxFaridabad2 = headers.indexOf('FARIDABAD2')
    const idxGhaziabad2 = headers.indexOf('GHAZIABAD2')
    const idxLuxmiKuber = headers.indexOf('LUXMI KUBER')

    if (idxDate === -1) {
      console.error('❌ Date column not found in CSV')
      return
    }

    console.log(`📊 Found ${lines.length - 1} rows to migrate`)

    // Process in batches of 100 for better performance
    const batchSize = 100
    let processed = 0
    let inserted = 0
    let updated = 0

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

        if (idxGali2 !== -1 && parts[idxGali2]?.trim() && parts[idxGali2].trim() !== '--') {
          row.gal12 = parts[idxGali2].trim().padStart(2, '0')
        }
        if (idxDesawar2 !== -1 && parts[idxDesawar2]?.trim() && parts[idxDesawar2].trim() !== '--') {
          row.desawar2 = parts[idxDesawar2].trim().padStart(2, '0')
        }
        if (idxFaridabad2 !== -1 && parts[idxFaridabad2]?.trim() && parts[idxFaridabad2].trim() !== '--') {
          row.faridabad2 = parts[idxFaridabad2].trim().padStart(2, '0')
        }
        if (idxGhaziabad2 !== -1 && parts[idxGhaziabad2]?.trim() && parts[idxGhaziabad2].trim() !== '--') {
          row.ghaziabad2 = parts[idxGhaziabad2].trim().padStart(2, '0')
        }
        if (idxLuxmiKuber !== -1 && parts[idxLuxmiKuber]?.trim() && parts[idxLuxmiKuber].trim() !== '--') {
          row.luxmi_kuber = parts[idxLuxmiKuber].trim().padStart(2, '0')
        }

        if (Object.keys(row).length > 2) { // More than just date and updated_at
          batchData.push(row)
        }
      }

      if (batchData.length > 0) {
        const { data, error } = await supabase
          .from('admin_results')
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
migrateCSV()

