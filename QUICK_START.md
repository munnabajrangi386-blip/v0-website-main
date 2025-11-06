# ⚡ QUICK START - Create Tables in Supabase

## 📋 Step-by-Step Instructions

### 1. Open SQL Editor
- In your Supabase Dashboard, click **"SQL Editor"** in the left sidebar
- Click **"New Query"** button

### 2. Copy the SQL Schema
- Open the file `supabase-schema.sql` in this project
- Copy **ALL** the contents (select all: Ctrl/Cmd + A, then copy)

### 3. Paste and Run
- Paste the SQL into the SQL Editor
- Click **"Run"** button (or press Ctrl/Cmd + Enter)
- Wait for "Success. No rows returned" message

### 4. Verify Tables Created
- Go to **"Table Editor"** in the left sidebar
- You should now see 4 tables:
  - ✅ `admin_results`
  - ✅ `scraped_results`
  - ✅ `schedules`
  - ✅ `site_content`

### 5. Run Migration Scripts
After tables are created, run these commands in your terminal:

```bash
# Navigate to project directory
cd /Users/jaimehta/Downloads/v0-website-main

# 1. Migrate admin results (CSV data)
npx tsx scripts/migrate-csv-to-supabase.ts

# 2. Migrate schedules
npx tsx scripts/migrate-schedules-to-supabase.ts

# 3. Migrate content
npx tsx scripts/migrate-content-to-supabase.ts
```

### 6. Verify Data
- Go back to **"Table Editor"** in Supabase
- Click on each table to see the migrated data:
  - `admin_results` should have ~3959 rows
  - `schedules` should have your schedules
  - `site_content` should have 1 row

### 7. Restart Dev Server
```bash
# Stop current server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

## ✅ After Migration
- Supabase will become the **primary storage**
- Local files will remain as **backups**
- All new data will be saved to Supabase
- You'll see activity in Supabase Dashboard

## 🆘 Need Help?
If you see any errors:
- **"Table already exists"** → Good! Tables are created, skip to step 5
- **"Permission denied"** → Check your service role key in `.env.local`
- **"Could not find table"** → Make sure you ran the SQL schema (step 3)

