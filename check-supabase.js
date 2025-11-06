const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking Supabase tables...\n');
  
  const tables = ['schedules', 'admin_results', 'scraped_results', 'site_content'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ERROR - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count || 0} rows`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Table might not exist - ${err.message}`);
    }
  }
}

checkTables().then(() => process.exit(0)).catch(console.error);
