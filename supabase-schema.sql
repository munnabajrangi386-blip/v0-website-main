-- Supabase Database Schema for Custom Project
-- Run this in your Supabase SQL Editor

-- Create site_content table
CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monthly_results table
CREATE TABLE IF NOT EXISTS monthly_results (
  id SERIAL PRIMARY KEY,
  month TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access" ON site_content
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON monthly_results
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON schedules
  FOR SELECT USING (true);

-- Create policies for authenticated write access (for admin operations)
CREATE POLICY "Allow authenticated write access" ON site_content
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write access" ON monthly_results
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write access" ON schedules
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert initial data
INSERT INTO site_content (id, data) VALUES 
('site_content', '{
  "banners": [
    {
      "id": "banner-1",
      "text": "Direct disawar company — honesty first. Whatsapp for secure play.",
      "kind": "warning"
    }
  ],
  "ads": [],
  "categories": [
    {"key": "ghaziabad1", "label": "GHAZIABAD1", "showInToday": true},
    {"key": "gali1", "label": "GALI1", "showInToday": true},
    {"key": "faridabad1", "label": "FARIDABAD1", "showInToday": true},
    {"key": "desawar1", "label": "DESAWAR1", "showInToday": true}
  ],
  "headerHighlight": {"enabled": false},
  "updatedAt": "2025-10-17T17:00:00.000Z"
}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO schedules (id, data) VALUES 
('schedules', '[]')
ON CONFLICT (id) DO NOTHING;
