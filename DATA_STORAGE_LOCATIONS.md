# 📁 DATA STORAGE LOCATIONS

## 🎯 PRIMARY DATA FILES (Root Directory)

### 1. **schedules.json** (798 bytes)
   - **Location**: `/Users/jaimehta/Downloads/v0-website-main/schedules.json`
   - **Purpose**: Stores all scheduled results (Past Results section)
   - **Contains**: 
     - Schedule items with date, category, value, publish time
     - Status (executed/pending)
   - **Updated when**: Admin creates/updates/deletes schedules

### 2. **content.json** (31 KB)
   - **Location**: `/Users/jaimehta/Downloads/v0-website-main/content.json`
   - **Purpose**: Stores all site content and admin settings
   - **Contains**:
     - Banners (running banner, full-width banners)
     - Advertisements (ads section)
     - Categories (GALI2, DESAWAR2, FARIDABAD2, GHAZIABAD2, LUXMI KUBER)
     - Header image settings
     - Footer note
     - Text columns
   - **Updated when**: Admin updates any content in admin panel

### 3. **monthly_results.json** (94 KB)
   - **Location**: `/Users/jaimehta/Downloads/v0-website-main/monthly_results.json`
   - **Purpose**: Stores cached scraped monthly results
   - **Contains**:
     - Monthly table data for scraped columns (Faridabad, Ghaziabad, Gali, Desawar)
     - Cached data from external scrapers
   - **Updated when**: Scraper runs and fetches new data

---

## 📊 CSV DATA FILES (Historical Data)

### 4. **dummy_gali1_2015_to_today.csv** (104 KB) ⭐ PRIMARY
   - **Location**: `/Users/jaimehta/Downloads/v0-website-main/dummy_gali1_2015_to_today.csv`
   - **Purpose**: **PRIMARY SOURCE** for admin category results
   - **Contains**:
     - Historical data from 2015 to today
     - Admin categories: GALI2, DESAWAR2, FARIDABAD2, GHAZIABAD2, LUXMI KUBER
     - Date, and values for each category
   - **Updated when**: 
     - Admin schedules are executed
     - Admin manually updates results
   - **Used by**: Monthly table, Live Results (yesterday's results)

### 5. **comprehensive_historical_data.csv** (437 KB)
   - **Location**: `/Users/jaimehta/Downloads/v0-website-main/comprehensive_historical_data.csv`
   - **Purpose**: Historical base column data (scraped columns)
   - **Contains**:
     - Base columns: frbd (Faridabad), gzbd (Ghaziabad), gali, dswr (Desawar)
     - Historical data before 2025
   - **Used by**: Monthly table for base columns

### 6. **satta_2025_complete.csv** (1.8 KB)
   - **Location**: `/Users/jaimehta/Downloads/v0-website-main/satta_2025_complete.csv`
   - **Purpose**: 2025 data for base columns
   - **Contains**:
     - Base columns: frbd, gzbd, gali, dswr for 2025
   - **Used by**: Monthly table for base columns

### 7. **Other CSV files** (Backups/Archives):
   - `comprehensive_historical_data.backup.csv` (405 KB)
   - `comprehensive_historical_data.backup2.csv` (416 KB)
   - `comprehensive_historical_data_gali1.csv` (437 KB)
   - `comprehensive_historical_with_gali1.csv` (416 KB)
   - `working_historical_data.csv` (17 KB)

---

## 🖼️ UPLOADED IMAGES

### 8. **public/uploads/** Directory
   - **Location**: `/Users/jaimehta/Downloads/v0-website-main/public/uploads/`
   - **Purpose**: Stores all uploaded images from admin panel
   - **Contains**:
     - Advertisement images
     - Banner images
     - Header images
     - Any other uploaded images
   - **Files currently**:
     - 1761039911904-download.jpeg
     - 1761040002167-download.jpeg
     - 1761041496675-download.jpeg
     - 1761048942908-download.jpeg
     - 1761062279398-download.jpeg
     - 1761063249043-download.jpeg
     - 1761653130398-Screenshot 2025-10-28 at 5.35.05 PM.png
     - 1761653565726-Screenshot 2025-10-28 at 5.42.26 PM.png
     - 1761654535178-Today's Featured Story (1).gif
     - 1761727055446-Screenshot 2025-10-29 at 2.07.18 PM.png

---

## 🔄 HOW DATA FLOWS

### **Admin Panel Changes**:
1. Admin creates schedule → Saved to `schedules.json`
2. Admin updates content → Saved to `content.json`
3. Admin uploads image → Saved to `public/uploads/`
4. Schedule executes → Updates `dummy_gali1_2015_to_today.csv` + `monthly_results.json`

### **Frontend Display**:
1. Monthly Table → Reads from `dummy_gali1_2015_to_today.csv` (admin) + `comprehensive_historical_data.csv`/`satta_2025_complete.csv` (base columns) + `monthly_results.json` (scraped cache)
2. Live Results → Reads from `schedules.json` + `dummy_gali1_2015_to_today.csv` (yesterday) + Scraper API
3. Content (banners, ads) → Reads from `content.json`

---

## ⚠️ CURRENT STATUS

**Supabase**: Configured but **NOT USED** (all tables empty)
- All data is stored in **local files** (file-based storage)
- Supabase is only tried if configured, but falls back to files when empty

**Storage Type**: File-based (local filesystem)
- ✅ Works on local development
- ⚠️ **Won't work on Vercel** (read-only filesystem in production)
- 💡 **Solution**: Need to migrate to Supabase for production use

---

## 📝 SUMMARY

| Data Type | Storage File | Size | Status |
|-----------|-------------|------|--------|
| Schedules | `schedules.json` | 798B | ✅ Active |
| Content | `content.json` | 31KB | ✅ Active |
| Scraped Results | `monthly_results.json` | 94KB | ✅ Active |
| Admin Results | `dummy_gali1_2015_to_today.csv` | 104KB | ✅ Active |
| Base Columns | `comprehensive_historical_data.csv` + `satta_2025_complete.csv` | 439KB | ✅ Active |
| Images | `public/uploads/` | ~100KB | ✅ Active |
| Supabase | All tables | 0 rows | ❌ Empty (not used) |

