#!/usr/bin/env python3
"""
Detailed debug to understand why the monthly table isn't being found
"""

import requests
from bs4 import BeautifulSoup
import re

def detailed_debug(url):
    print(f"\n=== DETAILED DEBUG: {url} ===")
    
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
                print(f"Rows: {len(rows)}")
                
                if len(rows) > 0:
                    # Show first row (headers)
                    first_row = rows[0]
                    headers = [cell.get_text(strip=True) for cell in first_row.find_all(['td', 'th'])]
                    print(f"Headers: {headers}")
                    print(f"Headers (lower): {[h.lower() for h in headers]}")
                    
                    # Check conditions
                    has_date = 'DATE' in headers
                    has_dswr = 'DSWR' in headers
                    has_gali = 'GALI' in headers
                    has_frbd = 'FRBD' in headers
                    has_gzbd = 'GZBD' in headers
                    
                    print(f"Has DATE: {has_date}")
                    print(f"Has DSWR: {has_dswr}")
                    print(f"Has GALI: {has_gali}")
                    print(f"Has FRBD: {has_frbd}")
                    print(f"Has GZBD: {has_gzbd}")
                    
                    # Check if this is the monthly table
                    is_monthly = (len(headers) >= 5 and 
                                 has_date and 
                                 has_dswr and 
                                 has_gali)
                    
                    print(f"Is monthly table: {is_monthly}")
                    
                    if is_monthly:
                        print("*** FOUND MONTHLY TABLE! ***")
                        
                        # Show first few data rows
                        print("First 10 data rows:")
                        for j, row in enumerate(rows[1:11]):
                            cells = row.find_all(['td', 'th'])
                            row_data = [cell.get_text(strip=True) for cell in cells]
                            print(f"  Row {j+1}: {row_data}")
                            
                            # Check if first cell is a day number
                            if row_data and row_data[0].isdigit():
                                day = int(row_data[0])
                                if 1 <= day <= 31:
                                    print(f"    -> Valid day {day} with data: {row_data[1:]}")
        else:
            print(f"Failed to fetch: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Test the URL that should have data
    test_url = "https://satta-king-fast.com/chart.php?ResultFor=September-2025&month=09&year=2025"
    detailed_debug(test_url)
