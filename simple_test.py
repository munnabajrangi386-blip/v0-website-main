#!/usr/bin/env python3
"""
Simple test to check if we can access the website and find tables
"""

import requests
from bs4 import BeautifulSoup
import time

BASE_URL = "https://satta-king-fast.com/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

def test_website_access():
    print("Testing website access...")
    
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    }
    
    try:
        print(f"Fetching: {BASE_URL}")
        response = requests.get(BASE_URL, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Check title
            title = soup.find('title')
            print(f"Page Title: {title.get_text() if title else 'No title found'}")
            
            # Find all tables
            tables = soup.find_all('table')
            print(f"Found {len(tables)} tables on homepage")
            
            for i, table in enumerate(tables[:3]):  # Check first 3 tables
                print(f"\n--- Table {i+1} ---")
                
                # Get headers
                headers = []
                thead = table.find('thead')
                if thead:
                    headers = [th.get_text(strip=True) for th in thead.find_all(['th', 'td'])]
                else:
                    first_row = table.find('tr')
                    if first_row:
                        headers = [td.get_text(strip=True) for td in first_row.find_all(['th', 'td'])]
                
                print(f"Headers: {headers}")
                
                # Check if it looks like a data table
                has_date = any('date' in h.lower() for h in headers)
                has_gali = any('gali' in h.lower() for h in headers)
                has_dswr = any('dswr' in h.lower() or 'desaw' in h.lower() for h in headers)
                
                print(f"Has DATE column: {has_date}")
                print(f"Has GALI column: {has_gali}")
                print(f"Has DSWR column: {has_dswr}")
                
                if has_date and (has_gali or has_dswr):
                    print("*** This looks like a data table! ***")
                    
                    # Show first few rows
                    rows = table.find_all('tr')
                    print(f"Total rows: {len(rows)}")
                    
                    for j, row in enumerate(rows[:5]):  # First 5 rows
                        cells = row.find_all(['td', 'th'])
                        row_data = [cell.get_text(strip=True) for cell in cells]
                        print(f"  Row {j}: {row_data}")
            
            # Look for links to monthly pages
            links = soup.find_all('a', href=True)
            monthly_links = []
            for link in links:
                href = link.get('href', '')
                text = link.get_text(strip=True).lower()
                if any(month in text for month in ['january', 'february', 'march', 'april', 'may', 'june', 
                                                  'july', 'august', 'september', 'october', 'november', 'december',
                                                  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']):
                    monthly_links.append((href, text))
            
            print(f"\nFound {len(monthly_links)} potential monthly links:")
            for href, text in monthly_links[:10]:  # Show first 10
                print(f"  {href} - {text}")
                
        else:
            print(f"Failed to access website. Status: {response.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_website_access()
