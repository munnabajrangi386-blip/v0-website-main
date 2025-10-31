#!/usr/bin/env python3
"""
Debug the actual table structure to understand the HTML
"""

import requests
from bs4 import BeautifulSoup
import re

def debug_table_structure(url):
    print(f"\n=== TABLE STRUCTURE DEBUG: {url} ===")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all tables
            tables = soup.find_all('table')
            print(f"Found {len(tables)} tables")
            
            for i, table in enumerate(tables):
                print(f"\n--- Table {i+1} ---")
                rows = table.find_all('tr')
                print(f"Total rows: {len(rows)}")
                
                # Check each row to find the header row
                for row_idx, row in enumerate(rows):
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 3:  # Skip rows with too few cells
                        continue
                    
                    row_data = [cell.get_text(strip=True) for cell in cells]
                    print(f"Row {row_idx}: {row_data}")
                    
                    # Check if this looks like a header row
                    if ('DATE' in row_data or 'date' in [d.lower() for d in row_data]):
                        print(f"  *** HEADER ROW FOUND AT INDEX {row_idx} ***")
                        print(f"  Headers: {row_data}")
                        
                        # Check if this is the monthly data table
                        has_date = 'DATE' in row_data
                        has_dswr = 'DSWR' in row_data
                        has_gali = 'GALI' in row_data
                        has_frbd = 'FRBD' in row_data
                        has_gzbd = 'GZBD' in row_data
                        
                        print(f"  Has DATE: {has_date}")
                        print(f"  Has DSWR: {has_dswr}")
                        print(f"  Has GALI: {has_gali}")
                        print(f"  Has FRBD: {has_frbd}")
                        print(f"  Has GZBD: {has_gzbd}")
                        
                        if has_date and has_dswr and has_gali:
                            print(f"  *** THIS IS THE MONTHLY DATA TABLE! ***")
                            
                            # Show next few data rows
                            print(f"  Next 5 data rows:")
                            for j in range(1, 6):
                                if row_idx + j < len(rows):
                                    data_row = rows[row_idx + j]
                                    data_cells = data_row.find_all(['td', 'th'])
                                    data_row_data = [cell.get_text(strip=True) for cell in data_cells]
                                    print(f"    Row {row_idx + j}: {data_row_data}")
                                    
                                    # Check if first cell is a day number
                                    if data_row_data and data_row_data[0].isdigit():
                                        day = int(data_row_data[0])
                                        if 1 <= day <= 31:
                                            print(f"      -> Valid day {day} with data: {data_row_data[1:]}")
                        break
        else:
            print(f"Failed to fetch: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Test the URL that should have data
    test_url = "https://satta-king-fast.com/chart.php?ResultFor=September-2025&month=09&year=2025"
    debug_table_structure(test_url)
