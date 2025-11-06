/**
 * Hardcode delete values from Supabase for 2025-11-05
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase not configured')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const date = '2025-11-05'
  
  console.log(`\n🗑️ Hardcode deleting values for ${date} from Supabase...`)
  
  try {
    // Update the row to set FARIDABAD2, GHAZIABAD2, and GALI2 to NULL
    const { error } = await supabaseAdmin
      .from('admin_results')
      .update({
        faridabad2: null,
        ghaziabad2: null,
        gal12: null, // Note: Supabase uses 'gal12' not 'gali2'
        updated_at: new Date().toISOString()
      })
      .eq('date', date)

    if (error) {
      // If row doesn't exist, create it with NULL values
      if (error.code === 'PGRST116') {
        console.log('Row does not exist, creating with NULL values...')
        const { error: insertError } = await supabaseAdmin
          .from('admin_results')
          .insert({
            date,
            faridabad2: null,
            ghaziabad2: null,
            gal12: null,
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('❌ Error inserting:', insertError)
          process.exit(1)
        }
        console.log('✅ Created row with NULL values')
      } else {
        console.error('❌ Error updating:', error)
        process.exit(1)
      }
    } else {
      console.log('✅ Successfully set values to NULL in Supabase')
    }
    
    // Verify deletion
    const { data, error: fetchError } = await supabaseAdmin
      .from('admin_results')
      .select('*')
      .eq('date', date)
      .single()

    if (fetchError) {
      console.warn('⚠️ Could not verify deletion:', fetchError.message)
    } else {
      console.log(`\n✅ Verification:`)
      console.log(`   FARIDABAD2: ${data.faridabad2}`)
      console.log(`   GHAZIABAD2: ${data.ghaziabad2}`)
      console.log(`   GALI2 (gal12): ${data.gal12}`)
    }
    
    console.log(`\n✅ Hardcode deletion completed!\n`)
  } catch (error: any) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
