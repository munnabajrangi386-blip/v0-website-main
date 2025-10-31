#!/usr/bin/env python3
"""
Historical data scraper for satta-king-fast.com
Optimized to collect DSWR, FRBD, GZBD, GALI data from 2015-2024
"""

import requests
from bs4 import BeautifulSoup
import time
import csv
import re
import json
from urllib.parse import urljoin, urlparse
from collections import deque
from datetime import datetime

BASE_URL = "https://satta-king-fast.com/"
USER_AGENT = "Mozilla/5.0 (compatible; HistoricalDataScraper/1.0)"

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

# Target years
YEARS = list(range(2015, 2025))  # 2015-2024
OUTFILE = "historical_satta_data.csv"

# Conservative settings
MAX_PAGES = 1000
REQUEST_DELAY = 2.0  # 2 seconds between requests
CRAWL_DEPTH_LIMIT = 3

session = requests.Session()
session.headers.update(HEADERS)

def safe_get(url, retries=3, backoff=1.0):
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=20)
            resp.raise_for_status()
            return resp
        except Exception as e:
            print(f"[WARN] GET {url} failed (attempt {attempt+1}/{retries}): {e}")
            time.sleep(backoff * (attempt+1))
    print(f"[ERROR] Failed to fetch {url} after {retries} attempts.")
    return None

def extract_month_year_from_text(text):
    """Extract year and month from page text"""
    months = {
        "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12
    }
    
    lower = text.lower()
    
    # Find year
    year = None
    for y in YEARS:
        if str(y) in lower:
            year = y
            break
    
    # Find month
    month = None
    for month_name, month_num in months.items():
        if month_name in lower:
            month = month_num
            break
    
    return year, month

def parse_monthly_table(page_url, soup):
    """Parse monthly table data"""
    results = []
    tables = soup.find_all("table")
    
    for table in tables:
        # Get headers
        headers = []
        thead = table.find("thead")
        if thead:
            headers = [th.get_text(separator=" ").strip().lower() for th in thead.find_all(["th","td"])]
        else:
            first_row = table.find("tr")
            if first_row:
                headers = [c.get_text(separator=" ").strip().lower() for c in first_row.find_all(["th","td"])]
        
        if not headers:
            continue
        
        # Check if this is a monthly data table
        has_date = any("date" in h for h in headers)
        has_gali = any("gali" in h for h in headers)
        has_dswr = any("dswr" in h or "desaw" in h for h in headers)
        
        if not (has_date and has_gali and has_dswr):
            continue
        
        # Map column indices
        header_map = {}
        for idx, h in enumerate(headers):
            if "date" in h:
                header_map["date"] = idx
            elif "dswr" in h or "desaw" in h:
                header_map["dswr"] = idx
            elif "frbd" in h or "farid" in h:
                header_map["frbd"] = idx
            elif "gzbd" in h or "gzb" in h or "ghazi" in h:
                header_map["gzbd"] = idx
            elif "gali" in h:
                header_map["gali"] = idx
        
        if "date" not in header_map or "gali" not in header_map:
            continue
        
        # Get page context for date parsing
        page_text = (soup.title.string if soup.title else "") + " " + " ".join(h for h in headers)
        for tag_name in ("h1", "h2", "h3", "h4"):
            tag = soup.find(tag_name)
            if tag and tag.get_text(strip=True):
                page_text += " " + tag.get_text(" ", strip=True)
        
        year, month = extract_month_year_from_text(page_text)
        
        # Parse data rows
        rows = table.find_all("tr")
        for row_idx, row in enumerate(rows[1:], 1):  # Skip header
            cells = row.find_all(["td", "th"])
            if len(cells) < max(header_map.values()) + 1:
                continue
            
            def cell_text(i):
                try:
                    return cells[i].get_text(strip=True)
                except:
                    return ""
            
            # Get date
            try:
                date_cell = cell_text(header_map["date"])
            except KeyError:
                date_cell = cell_text(0)
            
            # Extract day number
            day_match = re.search(r"(\d{1,2})", date_cell)
            if not day_match:
                continue
            
            day = int(day_match.group(1))
            if not (1 <= day <= 31):
                continue
            
            # Build date string
            if year and month:
                date_str = f"{year}-{month:02d}-{day:02d}"
            else:
                # Try to extract year from URL
                year_match = re.search(r"(\b20\d{2}\b)", page_url)
                if year_match and month:
                    date_str = f"{year_match.group(1)}-{month:02d}-{day:02d}"
                else:
                    date_str = f"0000-00-{day:02d}"
            
            # Get values
            dswr_val = cell_text(header_map.get("dswr", -1)).strip()
            frbd_val = cell_text(header_map.get("frbd", -1)).strip()
            gzbd_val = cell_text(header_map.get("gzbd", -1)).strip()
            gali_val = cell_text(header_map.get("gali", -1)).strip()
            
            # Clean values (remove XX, --, etc.)
            def clean_value(val):
                if val in ["XX", "--", "", "null"]:
                    return ""
                return val.strip()
            
            entry = {
                "date": date_str,
                "dswr": clean_value(dswr_val),
                "frbd": clean_value(frbd_val),
                "gzbd": clean_value(gzbd_val),
                "gali": clean_value(gali_val),
                "source_url": page_url,
                "year": year,
                "month": month,
                "day": day
            }
            results.append(entry)
    
    return results

def is_same_domain(url):
    try:
        base = urlparse(BASE_URL).netloc
        return urlparse(url).netloc == base or urlparse(url).netloc.endswith(base)
    except:
        return False

def crawl_historical_data():
    """Crawl and extract historical data"""
    visited = set()
    q = deque()
    q.append((BASE_URL, 0))
    visited.add(BASE_URL)
    all_data = []
    pages_visited = 0
    
    print(f"Starting historical data crawl for years {YEARS[0]}-{YEARS[-1]}...")
    print(f"Max pages: {MAX_PAGES}, Delay: {REQUEST_DELAY}s")
    
    while q and pages_visited < MAX_PAGES:
        url, depth = q.popleft()
        print(f"\n[INFO] Fetching page {pages_visited+1}/{MAX_PAGES} (depth={depth})")
        print(f"URL: {url}")
        
        resp = safe_get(url)
        pages_visited += 1
        
        if resp is None:
            continue
        
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Parse tables
        parsed = parse_monthly_table(url, soup)
        if parsed:
            print(f"[SUCCESS] Found {len(parsed)} data rows")
            all_data.extend(parsed)
        else:
            print("[INFO] No monthly data found on this page")
        
        # Find links for next pages
        if depth < CRAWL_DEPTH_LIMIT:
            links_found = 0
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if href.startswith(("javascript:", "#", "mailto:")):
                    continue
                
                absolute = urljoin(url, href)
                absolute = absolute.split("#")[0]
                
                if is_same_domain(absolute) and absolute not in visited:
                    visited.add(absolute)
                    q.append((absolute, depth + 1))
                    links_found += 1
            
            print(f"Found {links_found} new links to crawl")
        
        time.sleep(REQUEST_DELAY)
    
    print(f"\n[DONE] Pages visited: {pages_visited}")
    print(f"Total data rows collected: {len(all_data)}")
    
    return all_data

def save_data(data, outfile):
    """Save data to CSV"""
    fieldnames = ["date", "dswr", "frbd", "gzbd", "gali", "source_url", "year", "month", "day"]
    
    with open(outfile, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        # Sort by date
        for row in sorted(data, key=lambda x: (x["year"] or 0, x["month"] or 0, x["day"] or 0)):
            writer.writerow(row)
    
    print(f"[SAVED] {len(data)} rows -> {outfile}")
    
    # Also save a summary
    summary = {
        "total_rows": len(data),
        "years_covered": sorted(set(r["year"] for r in data if r["year"])),
        "months_covered": sorted(set((r["year"], r["month"]) for r in data if r["year"] and r["month"])),
        "scraped_at": datetime.now().isoformat()
    }
    
    with open("scraping_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    
    print(f"[SUMMARY] Years: {summary['years_covered']}")
    print(f"[SUMMARY] Total months: {len(summary['months_covered'])}")

def main():
    print("Historical Satta Data Scraper")
    print("=" * 50)
    
    data = crawl_historical_data()
    
    if data:
        save_data(data, OUTFILE)
        print(f"\n✅ Scraping completed successfully!")
        print(f"📊 Collected {len(data)} historical data points")
        print(f"📁 Data saved to: {OUTFILE}")
    else:
        print("\n❌ No data found. Check the website structure or increase crawl limits.")

if __name__ == "__main__":
    main()
