#!/usr/bin/env python3
"""
Targeted scraper for newghaziabad.com to get 2025 data
Focuses on the specific table structure for the 4 main fields
"""

import requests
from bs4 import BeautifulSoup
import csv
import json
import re
from datetime import datetime

def scrape_2025_targeted():
    """Scrape 2025 data with targeted approach"""
    
    url = "https://newghaziabad.com"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        print("🔍 Fetching data from newghaziabad.com...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for tables
        tables = soup.find_all('table')
        print(f"📊 Found {len(tables)} tables")
        
        all_data = []
        
        for table_idx, table in enumerate(tables):
            print(f"\n🔍 Analyzing table {table_idx + 1}...")
            
            rows = table.find_all('tr')
            if len(rows) < 2:
                continue
            
            # Get header row
            header_row = rows[0]
            header_cells = header_row.find_all(['td', 'th'])
            headers = [cell.get_text(strip=True).upper() for cell in header_cells]
            
            print(f"📋 Headers: {headers}")
            
            # Check if this table has our target fields
            target_fields = ['FARIDABAD', 'GHAZIABAD', 'GALI', 'DESAWAR']
            found_fields = [field for field in target_fields if any(field in header for header in headers)]
            
            if len(found_fields) < 2:
                print(f"❌ Table {table_idx + 1} doesn't have enough target fields")
                continue
            
            print(f"✅ Found fields: {found_fields}")
            
            # Map field positions
            field_positions = {}
            for i, header in enumerate(headers):
                for field in target_fields:
                    if field in header:
                        field_positions[field] = i
                        break
            
            print(f"📍 Field positions: {field_positions}")
            
            # Extract data rows
            for row_idx, row in enumerate(rows[1:], 1):
                cells = row.find_all(['td', 'th'])
                if len(cells) < max(field_positions.values()) + 1:
                    continue
                
                # Extract day from first column
                day_text = cells[0].get_text(strip=True)
                day_match = re.search(r'\b(\d{1,2})\b', day_text)
                
                if not day_match:
                    continue
                
                day = int(day_match.group(1))
                if not (1 <= day <= 31):
                    continue
                
                # Create row data
                row_data = {
                    'date': f"2025-01-{day:02d}",
                    'year': 2025,
                    'month': 1,
                    'day': day,
                    'source_url': url
                }
                
                # Extract values for each field
                for field, pos in field_positions.items():
                    if pos < len(cells):
                        value_text = cells[pos].get_text(strip=True)
                        clean_value = re.sub(r'[^\d]', '', value_text)
                        field_key = field.lower()
                        row_data[field_key] = clean_value if clean_value else '--'
                    else:
                        field_key = field.lower()
                        row_data[field_key] = '--'
                
                all_data.append(row_data)
                print(f"📅 Day {day}: {dict((k, v) for k, v in row_data.items() if k in ['faridabad', 'ghaziabad', 'gali', 'desawar'])}")
        
        print(f"\n✅ Scraped {len(all_data)} records")
        return all_data
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def save_data(data):
    """Save data to files"""
    if not data:
        print("❌ No data to save")
        return
    
    # Save to CSV
    csv_file = "satta_2025_newghaziabad.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['date', 'year', 'month', 'day', 'faridabad', 'ghaziabad', 'gali', 'desawar', 'source_url']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"💾 Saved to {csv_file}")
    
    # Save to JSON
    json_file = "satta_2025_newghaziabad.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved to {json_file}")

if __name__ == "__main__":
    print("🚀 Starting targeted 2025 scraper...")
    data = scrape_2025_targeted()
    if data:
        save_data(data)
        print(f"✅ Success! Scraped {len(data)} records")
    else:
        print("❌ No data scraped")
