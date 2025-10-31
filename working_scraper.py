#!/usr/bin/env python3
"""
Working scraper based on the actual HTML structure from satta-king-fast.com
"""

import requests
from bs4 import BeautifulSoup
import time
import csv
import re
import json
from datetime import datetime

BASE_URL = "https://satta-king-fast.com/"
USER_AGENT = "Mozilla/5.0 (compatible; WorkingScraper/1.0)"

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def scrape_monthly_data(url):
    """Scrape monthly data from a specific URL"""
    print(f"Scraping: {url}")
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        if response.status_code != 200:
            print(f"Failed: {response.status_code}")
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract year and month from URL
        year_match = re.search(r'year=(\d{4})', url)
        month_match = re.search(r'month=(\d{2})', url)
        year = int(year_match.group(1)) if year_match else None
        month = int(month_match.group(1)) if month_match else None
        
        print(f"  Year: {year}, Month: {month}")
        
        # Find the monthly chart table
        chart_table = soup.find('table', class_='chart-table')
        if not chart_table:
            print("  No chart table found")
            return []
        
        # Find all day-number rows
        day_rows = chart_table.find_all('tr', class_='day-number')
        print(f"  Found {len(day_rows)} day rows")
        
        monthly_data = []
        
        for row in day_rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 5:  # Need at least 5 columns (DATE, DSWR, FRBD, GZBD, GALI)
                continue
            
            # Get day number from first cell
            day_text = cells[0].get_text(strip=True)
            day_match = re.search(r'(\d{1,2})', day_text)
            if not day_match:
                continue
            
            day = int(day_match.group(1))
            if not (1 <= day <= 31):
                continue
            
            # Build date string
            if year and month:
                date_str = f"{year}-{month:02d}-{day:02d}"
            else:
                date_str = f"0000-00-{day:02d}"
            
            # Get values from cells 1-4 (DSWR, FRBD, GZBD, GALI)
            def get_value(cell):
                val = cell.get_text(strip=True)
                return "" if val in ["XX", "--", ""] else val
            
            entry = {
                "date": date_str,
                "dswr": get_value(cells[1]),
                "frbd": get_value(cells[2]),
                "gzbd": get_value(cells[3]),
                "gali": get_value(cells[4]),
                "source_url": url,
                "year": year,
                "month": month,
                "day": day
            }
            
            monthly_data.append(entry)
            
            if len(monthly_data) <= 5:  # Show first 5 rows
                print(f"    Day {day}: DSWR={entry['dswr']}, FRBD={entry['frbd']}, GZBD={entry['gzbd']}, GALI={entry['gali']}")
        
        print(f"  Extracted {len(monthly_data)} data rows")
        return monthly_data
        
    except Exception as e:
        print(f"  Error: {e}")
        return []

def test_multiple_months():
    """Test scraping multiple months"""
    
    # Test URLs for different months
    test_urls = [
        "https://satta-king-fast.com/chart.php?ResultFor=October-2025&month=10&year=2025",
        "https://satta-king-fast.com/chart.php?ResultFor=September-2025&month=09&year=2025",
        "https://satta-king-fast.com/chart.php?ResultFor=August-2025&month=08&year=2025",
        "https://satta-king-fast.com/chart.php?ResultFor=July-2025&month=07&year=2025",
        "https://satta-king-fast.com/chart.php?ResultFor=June-2025&month=06&year=2025",
    ]
    
    all_data = []
    
    for url in test_urls:
        data = scrape_monthly_data(url)
        all_data.extend(data)
        time.sleep(2)  # Be respectful
    
    return all_data

def save_data(data, filename):
    """Save data to CSV"""
    if not data:
        print("No data to save")
        return
    
    fieldnames = ["date", "dswr", "frbd", "gzbd", "gali", "source_url", "year", "month", "day"]
    
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        # Sort by date
        for row in sorted(data, key=lambda x: (x["year"] or 0, x["month"] or 0, x["day"] or 0)):
            writer.writerow(row)
    
    print(f"\n✅ Data saved: {len(data)} rows -> {filename}")
    
    # Show summary
    years = sorted(set(r["year"] for r in data if r["year"]))
    months = sorted(set((r["year"], r["month"]) for r in data if r["year"] and r["month"]))
    
    print(f"📊 Years covered: {years}")
    print(f"📅 Months covered: {len(months)}")
    for year, month in months:
        count = len([r for r in data if r["year"] == year and r["month"] == month])
        print(f"  {year}-{month:02d}: {count} days")
        
        # Show sample data for this month
        month_data = [r for r in data if r["year"] == year and r["month"] == month]
        if month_data:
            sample = month_data[0]
            print(f"    Sample: {sample['date']} -> DSWR={sample['dswr']}, FRBD={sample['frbd']}, GZBD={sample['gzbd']}, GALI={sample['gali']}")

if __name__ == "__main__":
    print("Testing working historical data scraper...")
    print("=" * 50)
    
    data = test_multiple_months()
    save_data(data, "working_historical_data.csv")
