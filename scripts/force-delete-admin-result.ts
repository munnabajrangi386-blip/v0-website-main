/**
 * Force delete admin results for specific dates/categories
 * Usage: npx tsx scripts/force-delete-admin-result.ts
 */

import { deleteAdminResultCompletely } from '../lib/admin-result-deletion'

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/force-delete-admin-result.ts <date> <category1> [category2] [category3]...')
    console.log('Example: npx tsx scripts/force-delete-admin-result.ts 2025-11-05 FARIDABAD2 GHAZIABAD2 GALI2')
    process.exit(1)
  }

  const date = args[0]
  const categories = args.slice(1)

  console.log(`\n🗑️ Force deleting admin results for ${date}:`)
  console.log(`Categories: ${categories.join(', ')}\n`)

  for (const category of categories) {
    try {
      await deleteAdminResultCompletely(date, category)
    } catch (error) {
      console.error(`❌ Failed to delete ${category}:`, error)
    }
  }

  console.log(`\n✅ Force deletion completed!\n`)
}

main().catch(console.error)
