/**
 * Migration Script: Schedules JSON to Supabase Database
 * Migrates schedules.json to schedules table
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

async function migrateSchedules() {
  try {
    console.log('📖 Reading schedules.json...')
    const jsonPath = join(process.cwd(), 'schedules.json')
    const jsonContent = readFileSync(jsonPath, 'utf-8')
    const schedules: any[] = JSON.parse(jsonContent)

    if (!Array.isArray(schedules)) {
      console.error('❌ schedules.json is not an array')
      return
    }

    console.log(`📊 Found ${schedules.length} schedules to migrate`)

    let inserted = 0
    let skipped = 0

    for (const schedule of schedules) {
      try {
        // Extract category key from row data
        const rowKeys = Object.keys(schedule.row || {}).filter(k => k !== 'date')
        const categoryKey = rowKeys[0] || 'unknown'
        const resultValue = schedule.row?.[categoryKey] || schedule.value || ''

        if (!schedule.id || !schedule.publishAt || !schedule.row?.date) {
          console.warn(`⚠️  Skipping invalid schedule:`, schedule)
          skipped++
          continue
        }

        const scheduleData = {
          id: schedule.id,
          category_key: categoryKey,
          category_label: schedule.categoryLabel || schedule.category_label || categoryKey.toUpperCase(),
          publish_at: schedule.publishAt,
          result_value: resultValue.toString().padStart(2, '0'),
          result_date: schedule.row.date,
          month_key: schedule.month,
          executed: schedule.executed || false,
          merge: schedule.merge || false,
          row_data: schedule.row,
          created_at: schedule.createdAt || new Date().toISOString(),
          updated_at: schedule.updatedAt || new Date().toISOString()
        }

        const { error } = await supabase
          .from('schedules')
          .upsert(scheduleData, {
            onConflict: 'id'
          })

        if (error) {
          console.error(`❌ Error inserting schedule ${schedule.id}:`, error)
          skipped++
        } else {
          inserted++
        }
      } catch (error) {
        console.error(`❌ Error processing schedule:`, error)
        skipped++
      }
    }

    console.log('\n✅ Migration completed!')
    console.log(`📊 Schedules inserted/updated: ${inserted}`)
    if (skipped > 0) {
      console.log(`⚠️  Schedules skipped: ${skipped}`)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateSchedules()

