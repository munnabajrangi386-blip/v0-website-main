#!/usr/bin/env python3
"""
Scraper for newghaziabad.com to get 2025 data for the 4 main fields:
- Faridabad (FRBD)
- Ghaziabad (GZBD) 
- Gali (GALI)
- DESAWAR (DSWR)
"""

import requests
from bs4 import BeautifulSoup
import csv
import time
import re
from datetime import datetime, timedelta
import json

def scrape_2025_data():
    """Scrape 2025 data from newghaziabad.com"""
    
    base_url = "https://newghaziabad.com"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Field mappings for newghaziabad.com
    field_mappings = {
        'FRBD': 'Faridabad',
        'GZBD': 'Ghaziabad', 
        'GALI': 'Gali',
        'DSWR': 'DESAWAR'
    }
    
    all_data = []
    
    try:
        print("🔍 Fetching 2025 data from newghaziabad.com...")
        
        # Get the main page
        response = requests.get(base_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for monthly table data
        tables = soup.find_all('table')
        print(f"📊 Found {len(tables)} tables on the page")
        
        for i, table in enumerate(tables):
            print(f"\n🔍 Analyzing table {i+1}...")
            
            # Check if this table has the data we need
            rows = table.find_all('tr')
            if len(rows) < 2:
                continue
                
            # Check header row for our target fields
            header_row = rows[0]
            header_cells = header_row.find_all(['td', 'th'])
            header_text = [cell.get_text(strip=True).upper() for cell in header_cells]
            
            print(f"📋 Table {i+1} headers: {header_text}")
            
            # Check if this table contains our target fields
            has_target_fields = any(field in ' '.join(header_text) for field in ['FARIDABAD', 'GHAZIABAD', 'GALI', 'DESAWAR'])
            
            if not has_target_fields:
                print(f"❌ Table {i+1} doesn't contain target fields, skipping...")
                continue
                
            print(f"✅ Table {i+1} contains target fields!")
            
            # Find column indices for our fields
            field_indices = {}
            for field_key, field_name in field_mappings.items():
                for j, header in enumerate(header_text):
                    if field_name.upper() in header:
                        field_indices[field_key] = j
                        print(f"📍 {field_name} found at column {j}")
                        break
            
            if len(field_indices) < 2:  # Need at least 2 fields
                print(f"❌ Not enough target fields found in table {i+1}")
                continue
            
            # Extract data rows
            data_rows = rows[1:]  # Skip header
            
            for row_idx, row in enumerate(data_rows):
                cells = row.find_all(['td', 'th'])
                if len(cells) < max(field_indices.values()) + 1:
                    continue
                
                # Extract day from first column
                day_text = cells[0].get_text(strip=True)
                day_match = re.search(r'\b(\d{1,2})\b', day_text)
                
                if not day_match:
                    continue
                    
                day = int(day_match.group(1))
                if not (1 <= day <= 31):
                    continue
                
                # Extract values for each field
                row_data = {
                    'date': f"2025-01-{day:02d}",  # Default to January 2025
                    'year': 2025,
                    'month': 1,
                    'day': day,
                    'source_url': base_url
                }
                
                for field_key, col_idx in field_indices.items():
                    if col_idx < len(cells):
                        value_text = cells[col_idx].get_text(strip=True)
                        # Clean the value
                        clean_value = re.sub(r'[^\d]', '', value_text)
                        row_data[field_key.lower()] = clean_value if clean_value else '--'
                    else:
                        row_data[field_key.lower()] = '--'
                
                all_data.append(row_data)
                print(f"📅 Day {day}: FRBD={row_data.get('frbd', '--')}, GZBD={row_data.get('gzb', '--')}, GALI={row_data.get('gali', '--')}, DSWR={row_data.get('dswr', '--')}")
        
        print(f"\n✅ Scraped {len(all_data)} days of 2025 data")
        return all_data
        
    except Exception as e:
        print(f"❌ Error scraping 2025 data: {e}")
        return []

def save_2025_data(data):
    """Save 2025 data to CSV and JSON"""
    
    if not data:
        print("❌ No data to save")
        return
    
    # Save to CSV
    csv_filename = "satta_2025_newghaziabad.csv"
    with open(csv_filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['date', 'year', 'month', 'day', 'frbd', 'gzb', 'gali', 'dswr', 'source_url']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"💾 Saved {len(data)} records to {csv_filename}")
    
    # Save to JSON for easy integration
    json_filename = "satta_2025_newghaziabad.json"
    with open(json_filename, 'w', encoding='utf-8') as jsonfile:
        json.dump(data, jsonfile, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved {len(data)} records to {json_filename}")
    
    return csv_filename, json_filename

def main():
    """Main execution function"""
    print("🚀 Starting 2025 data scraper for newghaziabad.com")
    print("=" * 60)
    
    # Scrape 2025 data
    data = scrape_2025_data()
    
    if data:
        # Save the data
        csv_file, json_file = save_2025_data(data)
        
        print("\n" + "=" * 60)
        print("✅ 2025 scraping completed successfully!")
        print(f"📊 Total records: {len(data)}")
        print(f"📁 Files created: {csv_file}, {json_file}")
        
        # Show sample data
        if len(data) > 0:
            print("\n📋 Sample data:")
            for i, record in enumerate(data[:5]):
                print(f"  {i+1}. Day {record['day']}: FRBD={record.get('frbd', '--')}, GZBD={record.get('gzb', '--')}, GALI={record.get('gali', '--')}, DSWR={record.get('dswr', '--')}")
    else:
        print("❌ No data was scraped")

if __name__ == "__main__":
    main()
