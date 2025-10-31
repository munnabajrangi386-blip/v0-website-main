#!/usr/bin/env python3
"""
Scrape DSWR, FRBD, GZBD, GALI daily table data from satta-king-fast.com
for years 2015 through 2024 and save to satta_2015_2024.csv.

Notes:
- This script crawls links found on the homepage and follows them (breadth-first),
  looking for monthly/daily pages that include the target table headers.
- It attempts to infer the year and month from the page title (e.g. "Monthly Satta King Result Chart of October 2025")
  and uses the DATE column (day number) to build YYYY-MM-DD values.
- It is intentionally conservative: 1 second delay between requests, limited crawl depth,
  and basic retries on errors.
- Before running, please confirm scraping is permitted by the site's robots.txt / terms.
"""

import requests
from bs4 import BeautifulSoup
import time
import csv
import re
from urllib.parse import urljoin, urlparse
from collections import deque

BASE_URL = "https://satta-king-fast.com/"
USER_AGENT = "Mozilla/5.0 (compatible; DataScraper/1.0; +https://yourdomain.example/)"

HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

YEARS = set(str(y) for y in range(2015, 2025))  # 2015..2024
OUTFILE = "satta_2015_2024.csv"

# Conservative crawling limits
MAX_PAGES = 2000
REQUEST_DELAY = 1.0  # seconds
CRAWL_DEPTH_LIMIT = 4

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
    # Look for phrases like "October 2025", "October, 2025", "Oct 2025", or year in text
    months = [
        "january","february","march","april","may","june","july","august","september","october","november","december",
        "jan","feb","mar","apr","may","jun","jul","aug","sep","sept","oct","nov","dec"
    ]
    lower = text.lower()
    # find year in text
    year = None
    for y in YEARS:
        if y in lower:
            year = y
            break
    # find month name
    month = None
    for i,m in enumerate(months[:12]):
        if m in lower:
            month = i+1
            break
    # fallback: try full month names again
    for i,m in enumerate(months):
        if m in lower:
            month = (i % 12) + 1
            break
    return year, month

def parse_table(page_url, soup):
    """
    Find table with headers that include DATE and the four columns.
    Return list of dicts: {date, dswr, frbd, gzbd, gali, source_url}
    """
    results = []
    # search for all tables
    tables = soup.find_all("table")
    target_headers = ["date", "dswr", "frbd", "gzbd", "gali", "desawer", "desawer".lower()]
    for table in tables:
        # try to get header texts
        headers = []
        thead = table.find("thead")
        if thead:
            headers = [th.get_text(separator=" ").strip().lower() for th in thead.find_all(["th","td"])]
        else:
            # maybe first row is header
            first_row = table.find("tr")
            if first_row:
                headers = [c.get_text(separator=" ").strip().lower() for c in first_row.find_all(["th","td"])]
        if not headers:
            continue
        # Check if we have at least date and gali (and others). The site uses variations like "DSWR" or "DSWR" for Desawer.
        has_gali = any("gali" in h for h in headers)
        has_date = any("date" in h or re.match(r"^\s*date\s*$", h) for h in headers)
        if not (has_gali and has_date):
            continue
        # Map header indices
        header_map = {}
        for idx,h in enumerate(headers):
            key = None
            if "date" in h:
                key = "date"
            elif "dswr" in h or "desaw" in h or "desawer" in h or "dswr" in h:
                key = "dswr"
            elif "frbd" in h or "farid" in h:
                key = "frbd"
            elif "gzbd" in h or "gzb" in h:
                key = "gzbd"
            elif "gali" in h or "gali" in h:
                key = "gali"
            if key:
                header_map[key] = idx
        # if we don't have at least date and gali and one other, skip
        if "date" not in header_map or "gali" not in header_map:
            continue

        # Determine month+year from page title or headings
        page_text = (soup.title.string if soup.title else "") + " " + " ".join(h for h in headers)
        # Also look for an h1/h2 that contains month/year
        for tagname in ("h1","h2","h3","h4"):
            tag = soup.find(tagname)
            if tag and tag.get_text(strip=True):
                page_text += " " + tag.get_text(" ", strip=True)
        year_str, month_num = extract_month_year_from_text(page_text)
        # iterate rows
        rows = table.find_all("tr")
        for rindex,row in enumerate(rows):
            cells = row.find_all(["td","th"])
            if len(cells) < 2:
                continue
            # skip header rows if they repeat
            if rindex == 0 and any("date" in c.get_text().lower() for c in cells):
                continue
            def cell_text(i):
                try:
                    return cells[i].get_text(strip=True)
                except Exception:
                    return ""
            date_cell = None
            try:
                date_cell = cell_text(header_map["date"])
            except KeyError:
                date_cell = cell_text(0)
            # normalize day to two digits if it's just a day number
            day = None
            # Try to extract numeric day from date_cell
            mday = re.search(r"(\d{1,2})", date_cell)
            if mday:
                day = int(mday.group(1))
            else:
                # fallback: maybe the first cell is "01" etc.
                try:
                    day = int(cells[0].get_text(strip=True))
                except:
                    day = None
            if day is None:
                continue
            # Build full date if month+year found, else leave YYYY-MM-DD with unknown month as 00
            if year_str and month_num:
                date_str = f"{year_str}-{month_num:02d}-{day:02d}"
            elif year_str:
                # unknown month (rare) -> keep month 00
                date_str = f"{year_str}-00-{day:02d}"
            else:
                # fallback: try to find year in URL path
                y_from_url = None
                m = re.search(r"(\b20\d{2}\b)", page_url)
                if m:
                    y_from_url = m.group(1)
                if y_from_url and month_num:
                    date_str = f"{y_from_url}-{month_num:02d}-{day:02d}"
                else:
                    # best-effort: set year 0000 (you can post-process)
                    date_str = f"0000-00-{day:02d}"

            dswr_val = cell_text(header_map["dswr"]) if "dswr" in header_map else ""
            frbd_val = cell_text(header_map["frbd"]) if "frbd" in header_map else ""
            gzbd_val = cell_text(header_map["gzbd"]) if "gzbd" in header_map else ""
            gali_val = cell_text(header_map["gali"]) if "gali" in header_map else ""

            # Normalize empty strings and remove weird whitespace
            entry = {
                "date": date_str,
                "dswr": dswr_val.strip(),
                "frbd": frbd_val.strip(),
                "gzbd": gzbd_val.strip(),
                "gali": gali_val.strip(),
                "source_url": page_url
            }
            results.append(entry)

    return results

def is_same_domain(url):
    try:
        base = urlparse(BASE_URL).netloc
        return urlparse(url).netloc == base or urlparse(url).netloc.endswith(base)
    except:
        return False

def crawl_and_extract():
    visited = set()
    q = deque()
    q.append((BASE_URL, 0))
    visited.add(BASE_URL)
    all_data = []
    pages_visited = 0

    while q and pages_visited < MAX_PAGES:
        url, depth = q.popleft()
        print(f"[INFO] Fetching ({pages_visited+1}/{MAX_PAGES}) depth={depth}: {url}")
        resp = safe_get(url)
        pages_visited += 1
        if resp is None:
            continue
        soup = BeautifulSoup(resp.text, "html.parser")

        # Parse the page for tables
        parsed = parse_table(url, soup)
        if parsed:
            print(f"[INFO] -> Found {len(parsed)} rows on {url}")
            # filter rows to selected years only
            filtered = []
            for r in parsed:
                # try to parse year from date string
                m = re.match(r"(\d{4})-(\d{2})-(\d{2})", r["date"])
                if m:
                    yr = m.group(1)
                    if yr in YEARS:
                        filtered.append(r)
                else:
                    # if unknown year, drop for now
                    pass
            if filtered:
                all_data.extend(filtered)

        # Enqueue links (respect depth limit)
        if depth < CRAWL_DEPTH_LIMIT:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if href.startswith("javascript:") or href.startswith("#") or href.lower().startswith("mailto:"):
                    continue
                absolute = urljoin(url, href)
                # only same domain
                if not is_same_domain(absolute):
                    continue
                # remove fragments
                absolute = absolute.split("#")[0]
                if absolute not in visited:
                    visited.add(absolute)
                    q.append((absolute, depth+1))

        time.sleep(REQUEST_DELAY)

    print(f"[DONE] pages visited: {pages_visited}, total rows collected (pre-filter): {len(all_data)}")
    return all_data

def save_csv(rows, outfile):
    fieldnames = ["date","dswr","frbd","gzbd","gali","source_url"]
    with open(outfile, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        # sort rows by date for nicer file (ignores '0000-00' entries)
        def sort_key(r):
            return r["date"]
        for r in sorted(rows, key=sort_key):
            writer.writerow(r)
    print(f"[SAVED] {len(rows)} rows -> {outfile}")

def main():
    print("Scraper starting. Please ensure scraping is permitted by site's robots.txt / terms.")
    data = crawl_and_extract()
    if data:
        save_csv(data, OUTFILE)
    else:
        print("[WARN] No data found. You might need to increase CRAWL_DEPTH_LIMIT or adjust parsing heuristics.")

if __name__ == "__main__":
    main()
