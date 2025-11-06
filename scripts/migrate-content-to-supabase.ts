/**
 * Migration Script: Content JSON to Supabase Database
 * Migrates content.json to site_content table
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
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

async function migrateContent() {
  try {
    console.log('📖 Reading content.json...')
    const jsonPath = join(process.cwd(), 'content.json')
    
    if (!existsSync(jsonPath)) {
      console.warn('⚠️  content.json not found, skipping...')
      return
    }

    const jsonContent = readFileSync(jsonPath, 'utf-8')
    const content = JSON.parse(jsonContent)

    const { error } = await supabase
      .from('site_content')
      .upsert({
        id: 'site_content',
        data: content,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (error) {
      console.error('❌ Error migrating content:', error)
      process.exit(1)
    }

    console.log('✅ Content migrated successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateContent()

