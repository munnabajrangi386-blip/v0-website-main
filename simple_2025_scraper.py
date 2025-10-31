#!/usr/bin/env python3
"""
Simple scraper to get 2025 data and save it in the correct format
"""

import requests
from bs4 import BeautifulSoup
import csv
import re

def scrape_2025_data():
    """Scrape 2025 data from newghaziabad.com"""
    
    url = "https://newghaziabad.com"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        print("🔍 Scraping 2025 data from newghaziabad.com...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the monthly table
        tables = soup.find_all('table')
        print(f"📊 Found {len(tables)} tables")
        
        all_data = []
        
        for table in tables:
            rows = table.find_all('tr')
            if len(rows) < 2:
                continue
            
            # Check headers
            header_row = rows[0]
            header_cells = header_row.find_all(['td', 'th'])
            headers = [cell.get_text(strip=True).upper() for cell in header_cells]
            
            # Check if this table has our target fields
            if not any(field in ' '.join(headers) for field in ['FARIDABAD', 'GHAZIABAD', 'GALI', 'DESAWAR']):
                continue
            
            print(f"✅ Found table with target fields: {headers}")
            
            # Find column positions
            field_positions = {}
            for i, header in enumerate(headers):
                if 'FARIDABAD' in header:
                    field_positions['faridabad'] = i
                elif 'GHAZIABAD' in header:
                    field_positions['ghaziabad'] = i
                elif 'GALI' in header:
                    field_positions['gali'] = i
                elif 'DESAWAR' in header:
                    field_positions['desawar'] = i
            
            print(f"📍 Field positions: {field_positions}")
            
            # Extract data rows
            for row in rows[1:]:
                cells = row.find_all(['td', 'th'])
                if len(cells) < max(field_positions.values()) + 1:
                    continue
                
                # Extract day
                day_text = cells[0].get_text(strip=True)
                day_match = re.search(r'\b(\d{1,2})\b', day_text)
                if not day_match:
                    continue
                
                day = int(day_match.group(1))
                if not (1 <= day <= 31):
                    continue
                
                # Extract values
                dswr = cells[field_positions.get('desawar', 0)].get_text(strip=True) if 'desawar' in field_positions else '--'
                frbd = cells[field_positions.get('faridabad', 0)].get_text(strip=True) if 'faridabad' in field_positions else '--'
                gzbd = cells[field_positions.get('ghaziabad', 0)].get_text(strip=True) if 'ghaziabad' in field_positions else '--'
                gali = cells[field_positions.get('gali', 0)].get_text(strip=True) if 'gali' in field_positions else '--'
                
                # Clean values
                dswr = re.sub(r'[^\d]', '', dswr) if dswr not in ['--', 'XX', ''] else '--'
                frbd = re.sub(r'[^\d]', '', frbd) if frbd not in ['--', 'XX', ''] else '--'
                gzbd = re.sub(r'[^\d]', '', gzbd) if gzbd not in ['--', 'XX', ''] else '--'
                gali = re.sub(r'[^\d]', '', gali) if gali not in ['--', 'XX', ''] else '--'
                
                # Create row in the correct format: date,dswr,frbd,gzbd,gali,source_url,year,month,day
                row_data = f"2025-01-{day:02d},{dswr},{frbd},{gzbd},{gali},https://newghaziabad.com,2025,1,{day}"
                all_data.append(row_data)
                
                print(f"📅 Day {day}: DSWR={dswr}, FRBD={frbd}, GZBD={gzbd}, GALI={gali}")
        
        return all_data
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def save_2025_data(data):
    """Save 2025 data to CSV in the correct format"""
    
    if not data:
        print("❌ No data to save")
        return
    
    # Save to CSV with correct format
    csv_file = "satta_2025_final.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        # Write header
        f.write("date,dswr,frbd,gzbd,gali,source_url,year,month,day\n")
        # Write data
        for row in data:
            f.write(row + "\n")
    
    print(f"💾 Saved {len(data)} records to {csv_file}")
    return csv_file

if __name__ == "__main__":
    print("🚀 Starting 2025 data scraper...")
    data = scrape_2025_data()
    if data:
        save_2025_data(data)
        print(f"✅ Success! Scraped {len(data)} records for 2025")
    else:
        print("❌ No data scraped")
