#!/usr/bin/env python3
"""
Comprehensive historical data scraper for satta-king-fast.com
Scrapes data from 2015-2024 systematically
"""

import requests
from bs4 import BeautifulSoup
import time
import csv
import re
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

BASE_URL = "https://satta-king-fast.com/"
USER_AGENT = "Mozilla/5.0 (compatible; ComprehensiveScraper/1.0)"

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Thread-safe counter
data_count = 0
data_lock = threading.Lock()

def scrape_monthly_data(url, year, month):
    """Scrape monthly data from a specific URL"""
    global data_count
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        if response.status_code != 200:
            print(f"❌ Failed {year}-{month:02d}: {response.status_code}")
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the monthly chart table
        chart_table = soup.find('table', class_='chart-table')
        if not chart_table:
            print(f"❌ No chart table found for {year}-{month:02d}")
            return []
        
        # Find all day-number rows
        day_rows = chart_table.find_all('tr', class_='day-number')
        
        monthly_data = []
        
        for row in day_rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 5:  # Need at least 5 columns
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
            date_str = f"{year}-{month:02d}-{day:02d}"
            
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
        
        with data_lock:
            data_count += len(monthly_data)
        
        print(f"✅ {year}-{month:02d}: {len(monthly_data)} days (Total: {data_count})")
        return monthly_data
        
    except Exception as e:
        print(f"❌ Error {year}-{month:02d}: {e}")
        return []

def generate_urls():
    """Generate URLs for all months from 2015-2024"""
    urls = []
    for year in range(2015, 2025):
        for month in range(1, 13):
            # Generate URL for this month/year
            month_names = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            month_name = month_names[month - 1]
            url = f"https://satta-king-fast.com/chart.php?ResultFor={month_name}-{year}&month={month:02d}&year={year}"
            urls.append((url, year, month))
    
    return urls

def scrape_with_threads(max_workers=3):
    """Scrape data using multiple threads"""
    urls = generate_urls()
    all_data = []
    
    print(f"🚀 Starting comprehensive scrape of {len(urls)} months...")
    print(f"📅 Years: 2015-2024")
    print(f"🧵 Using {max_workers} threads")
    print("=" * 60)
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_url = {
            executor.submit(scrape_monthly_data, url, year, month): (url, year, month)
            for url, year, month in urls
        }
        
        # Process completed tasks
        for future in as_completed(future_to_url):
            url, year, month = future_to_url[future]
            try:
                data = future.result()
                all_data.extend(data)
            except Exception as e:
                print(f"❌ Thread error for {year}-{month:02d}: {e}")
            
            # Be respectful - small delay between requests
            time.sleep(0.5)
    
    return all_data

def save_data(data, filename):
    """Save data to CSV with comprehensive summary"""
    if not data:
        print("❌ No data to save")
        return
    
    fieldnames = ["date", "dswr", "frbd", "gzbd", "gali", "source_url", "year", "month", "day"]
    
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        # Sort by date
        for row in sorted(data, key=lambda x: (x["year"] or 0, x["month"] or 0, x["day"] or 0)):
            writer.writerow(row)
    
    print(f"\n✅ Data saved: {len(data)} rows -> {filename}")
    
    # Generate comprehensive summary
    years = sorted(set(r["year"] for r in data if r["year"]))
    months = sorted(set((r["year"], r["month"]) for r in data if r["year"] and r["month"]))
    
    print(f"\n📊 COMPREHENSIVE SUMMARY:")
    print(f"📅 Years covered: {years}")
    print(f"📆 Total months: {len(months)}")
    print(f"📈 Total data points: {len(data)}")
    
    # Year-by-year breakdown
    print(f"\n📋 YEAR-BY-YEAR BREAKDOWN:")
    for year in years:
        year_data = [r for r in data if r["year"] == year]
        months_in_year = len(set(r["month"] for r in year_data))
        days_in_year = len(year_data)
        print(f"  {year}: {months_in_year} months, {days_in_year} days")
    
    # Sample data from each year
    print(f"\n🔍 SAMPLE DATA BY YEAR:")
    for year in years:
        year_data = [r for r in data if r["year"] == year]
        if year_data:
            sample = year_data[0]
            print(f"  {year}: {sample['date']} -> DSWR={sample['dswr']}, FRBD={sample['frbd']}, GZBD={sample['gzbd']}, GALI={sample['gali']}")
    
    # Save summary JSON
    summary = {
        "total_rows": len(data),
        "years_covered": years,
        "months_covered": len(months),
        "scraped_at": datetime.now().isoformat(),
        "year_breakdown": {
            year: {
                "months": len(set(r["month"] for r in data if r["year"] == year)),
                "days": len([r for r in data if r["year"] == year])
            }
            for year in years
        }
    }
    
    with open("scraping_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n📄 Summary saved to: scraping_summary.json")

def main():
    print("🔍 COMPREHENSIVE SATTA DATA SCRAPER")
    print("=" * 50)
    print("📅 Target: 2015-2024 (10 years)")
    print("📊 Data: DSWR, FRBD, GZBD, GALI")
    print("🌐 Source: satta-king-fast.com")
    print("=" * 50)
    
    start_time = datetime.now()
    
    # Scrape data
    data = scrape_with_threads(max_workers=3)
    
    end_time = datetime.now()
    duration = end_time - start_time
    
    print(f"\n⏱️  Scraping completed in: {duration}")
    
    # Save data
    save_data(data, "comprehensive_historical_data.csv")
    
    print(f"\n🎉 SCRAPING COMPLETE!")
    print(f"📁 Files created:")
    print(f"  - comprehensive_historical_data.csv")
    print(f"  - scraping_summary.json")

if __name__ == "__main__":
    main()
