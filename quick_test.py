#!/usr/bin/env python3
"""
Quick test to see if we can extract historical data from satta-king-fast.com
"""

import requests
from bs4 import BeautifulSoup
import json
import re

def test_data_extraction():
    # Test with a known monthly page
    url = "https://satta-king-fast.com/chart.php?ResultFor=September-2025&month=09&year=2025"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    try:
        print(f"Testing: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for tables with data
            tables = soup.find_all('table')
            print(f"Found {len(tables)} tables")
            
            for i, table in enumerate(tables):
                rows = table.find_all('tr')
                print(f"\nTable {i+1}: {len(rows)} rows")
                
                # Check if this looks like a data table
                if len(rows) > 1:
                    first_row = rows[0]
                    cells = first_row.find_all(['td', 'th'])
                    headers = [cell.get_text(strip=True) for cell in cells]
                    print(f"Headers: {headers}")
                    
                    # Look for date-like patterns in first column
                    if len(rows) > 5:  # Likely has data
                        print("First 5 data rows:")
                        for j, row in enumerate(rows[1:6]):
                            cells = row.find_all(['td', 'th'])
                            row_data = [cell.get_text(strip=True) for cell in cells]
                            print(f"  Row {j+1}: {row_data}")
                            
                            # Check if first cell looks like a day number
                            if row_data and row_data[0].isdigit():
                                day = int(row_data[0])
                                if 1 <= day <= 31:
                                    print(f"    -> Valid day {day} with data: {row_data[1:]}")
        else:
            print(f"Failed: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_data_extraction()
