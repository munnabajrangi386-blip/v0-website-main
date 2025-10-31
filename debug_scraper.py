#!/usr/bin/env python3
"""
Debug scraper to understand the page structure
"""

import requests
from bs4 import BeautifulSoup
import re

def debug_page(url):
    print(f"\n=== DEBUGGING: {url} ===")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Check title
            title = soup.find('title')
            print(f"Title: {title.get_text() if title else 'No title'}")
            
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
                    
                    # Check if this looks like data
                    if len(rows) > 5:
                        print("First 5 data rows:")
                        for j, row in enumerate(rows[1:6]):
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
    # Test the URLs that should have data
    test_urls = [
        "https://satta-king-fast.com/chart.php?ResultFor=September-2025&month=09&year=2025",
        "https://satta-king-fast.com/chart.php?ResultFor=August-2025&month=08&year=2025",
    ]
    
    for url in test_urls:
        debug_page(url)
