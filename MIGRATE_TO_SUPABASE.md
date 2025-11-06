# 🚀 MIGRATION TO SUPABASE - STEP BY STEP GUIDE

## Step 1: Create Database Tables (REQUIRED FIRST)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **nspuesyyudatgezkqhbr**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the **entire contents** of `supabase-schema.sql` file
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. Wait for "Success. No rows returned" message

## Step 2: Run Migration Scripts

After tables are created, run these commands in order:

```bash
# 1. Migrate CSV data (admin results)
npx tsx scripts/migrate-csv-to-supabase.ts

# 2. Migrate schedules
npx tsx scripts/migrate-schedules-to-supabase.ts

# 3. Migrate content
npx tsx scripts/migrate-content-to-supabase.ts

# 4. Migrate monthly results (optional - scraped data)
npx tsx scripts/migrate-json-to-supabase.ts
```

## Step 3: Verify Migration

After running migrations, check Supabase Dashboard:
- Go to **Table Editor**
- You should see data in:
  - `admin_results` (should have ~3959 rows)
  - `schedules` (should have your schedules)
  - `site_content` (should have 1 row)
  - `scraped_results` (may be empty if not migrated)

## Step 4: Update Code to Use Supabase First

The code will automatically use Supabase once tables have data. After migration, restart your dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## ✅ What Gets Migrated

- ✅ **Admin Results**: All data from `dummy_gali1_2015_to_today.csv` → `admin_results` table
- ✅ **Schedules**: All schedules from `schedules.json` → `schedules` table  
- ✅ **Content**: All content from `content.json` → `site_content` table
- ✅ **Scraped Results**: Data from `monthly_results.json` → `scraped_results` table

## ⚠️ Important Notes

1. **Backup First**: Your local files will remain as backups
2. **Tables Must Exist**: Migration will fail if tables don't exist (Step 1 is critical)
3. **No Data Loss**: Files are not deleted, they become backups
4. **Production**: After migration, Supabase becomes primary source, files are fallback

## 🐛 Troubleshooting

**Error: "Could not find the table"**
- → Tables not created yet. Go back to Step 1.

**Error: "Missing Supabase credentials"**
- → Check `.env.local` file has correct credentials

**Migration runs but no data in Supabase**
- → Check Supabase Dashboard → Table Editor → Refresh page

