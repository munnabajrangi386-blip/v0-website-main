-- Supabase Database Schema
-- Run this in Supabase Dashboard → SQL Editor

-- Table 1: admin_results - Stores admin category results (GALI2, DESAWAR2, etc.)
CREATE TABLE IF NOT EXISTS admin_results (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  gal12 VARCHAR(2),
  desawar2 VARCHAR(2),
  faridabad2 VARCHAR(2),
  ghaziabad2 VARCHAR(2),
  luxmi_kuber VARCHAR(2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_results_date ON admin_results(date);

-- Table 2: scraped_results - Stores scraped base columns from newghaziabad.com
CREATE TABLE IF NOT EXISTS scraped_results (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  faridabad VARCHAR(2),
  ghaziabad VARCHAR(2),
  gali VARCHAR(2),
  desawar VARCHAR(2),
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraped_results_date ON scraped_results(date);

-- Table 3: schedules - Stores admin schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key VARCHAR(50) NOT NULL,
  category_label VARCHAR(100),
  publish_at TIMESTAMPTZ NOT NULL,
  result_value VARCHAR(2) NOT NULL,
  result_date DATE NOT NULL,
  month_key VARCHAR(7) NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  merge BOOLEAN DEFAULT FALSE,
  row_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_publish_at ON schedules(publish_at);
CREATE INDEX IF NOT EXISTS idx_schedules_executed ON schedules(executed);
CREATE INDEX IF NOT EXISTS idx_schedules_result_date ON schedules(result_date);

-- Table 4: site_content - Stores site configuration (banners, ads, categories)
CREATE TABLE IF NOT EXISTS site_content (
  id VARCHAR(50) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anon key can read)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access" ON admin_results;
DROP POLICY IF EXISTS "Allow public read access" ON scraped_results;
DROP POLICY IF EXISTS "Allow public read access" ON schedules;
DROP POLICY IF EXISTS "Allow public read access" ON site_content;

CREATE POLICY "Allow public read access" ON admin_results FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON scraped_results FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON schedules FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON site_content FOR SELECT USING (true);

-- Create policies for service role (full access for admin operations)
-- Service role bypasses RLS, so these are optional but good practice
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow service role full access" ON admin_results;
DROP POLICY IF EXISTS "Allow service role full access" ON scraped_results;
DROP POLICY IF EXISTS "Allow service role full access" ON schedules;
DROP POLICY IF EXISTS "Allow service role full access" ON site_content;

CREATE POLICY "Allow service role full access" ON admin_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON scraped_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON schedules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON site_content FOR ALL USING (auth.role() = 'service_role');

