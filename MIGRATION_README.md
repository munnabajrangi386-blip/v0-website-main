# Supabase Migration Guide

This project has been migrated from Vercel Blob storage to Supabase (PostgreSQL database + Storage).

## Setup Instructions

### 1. Run Database Schema

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Click "Run" to create all tables

### 2. Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `uploads`
3. Set it to **Public** (for public image access)
4. Configure RLS policies if needed (the schema includes default policies)

### 3. Environment Variables

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run Migration Scripts

Run these scripts in order to migrate existing data:

```bash
# Install dependencies if needed
npm install

# Run TypeScript with tsx
npx tsx scripts/migrate-csv-to-supabase.ts
npx tsx scripts/migrate-json-to-supabase.ts
npx tsx scripts/migrate-schedules-to-supabase.ts
npx tsx scripts/migrate-content-to-supabase.ts
```

### 5. Verify Migration

- Check Supabase Dashboard → Table Editor to see data in tables
- Check Supabase Dashboard → Storage to see uploaded images
- Test admin panel functionality
- Test frontend data display

## What Changed

### Database Tables

- **admin_results**: Stores admin category results (GALI2, DESAWAR2, etc.)
- **scraped_results**: Stores scraped base columns (Faridabad, Ghaziabad, Gali, Desawar)
- **schedules**: Stores admin schedules
- **site_content**: Stores site configuration (banners, ads, categories)

### Storage

- **uploads bucket**: Replaces `public/uploads/` folder for image storage

### Removed Dependencies

- `@vercel/blob` package removed (no longer needed)

### Code Changes

- `lib/supabase-db.ts`: New database service layer
- `lib/supabase-storage.ts`: New storage service layer
- `lib/local-content-store.ts`: Updated to use Supabase instead of Vercel Blob
- `app/api/combined/route.ts`: Updated to query Supabase for admin/scraped results
- `app/api/admin/schedules/route.ts`: Updated to use Supabase for schedule operations
- `app/api/blob/upload/route.ts`: Updated to upload to Supabase Storage

## Notes

- CSV files are still updated as a backup (as per user requirement)
- Local file backups are maintained for development
- The migration is backward-compatible - if Supabase is unavailable, it falls back to local files

