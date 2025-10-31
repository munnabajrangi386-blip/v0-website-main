#!/usr/bin/env python3
"""
Generate 2025 data for the 4 main fields
This will create sample data for 2025 that can be updated with live data
"""

import csv
import json
from datetime import datetime, timedelta
import random

def generate_2025_data():
    """Generate 2025 data for all 12 months"""
    
    all_data = []
    
    # Field mappings
    fields = ['dswr', 'frbd', 'gzb', 'gali']
    
    for month in range(1, 13):
        # Get number of days in the month
        if month in [1, 3, 5, 7, 8, 10, 12]:
            days_in_month = 31
        elif month in [4, 6, 9, 11]:
            days_in_month = 30
        else:  # February
            days_in_month = 28  # 2025 is not a leap year
        
        print(f"📅 Generating data for 2025-{month:02d} ({days_in_month} days)")
        
        for day in range(1, days_in_month + 1):
            # Generate realistic sample data
            row_data = {
                'date': f"2025-{month:02d}-{day:02d}",
                'year': 2025,
                'month': month,
                'day': day,
                'dswr': f"{random.randint(10, 99):02d}",  # DESAWAR
                'frbd': f"{random.randint(10, 99):02d}",  # Faridabad
                'gzb': f"{random.randint(10, 99):02d}",   # Ghaziabad
                'gali': f"{random.randint(10, 99):02d}",  # Gali
                'source_url': 'https://newghaziabad.com'
            }
            
            all_data.append(row_data)
    
    print(f"✅ Generated {len(all_data)} records for 2025")
    return all_data

def save_2025_data(data):
    """Save 2025 data to files"""
    
    # Save to CSV
    csv_file = "satta_2025_generated.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['date', 'year', 'month', 'day', 'dswr', 'frbd', 'gzb', 'gali', 'source_url']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"💾 Saved to {csv_file}")
    
    # Save to JSON
    json_file = "satta_2025_generated.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved to {json_file}")
    
    return csv_file, json_file

def main():
    """Main execution"""
    print("🚀 Generating 2025 data...")
    print("=" * 50)
    
    data = generate_2025_data()
    csv_file, json_file = save_2025_data(data)
    
    print("\n" + "=" * 50)
    print("✅ 2025 data generation completed!")
    print(f"📊 Total records: {len(data)}")
    print(f"📁 Files created: {csv_file}, {json_file}")
    
    # Show sample data
    print("\n📋 Sample data (first 5 days of January):")
    for record in data[:5]:
        print(f"  {record['date']}: DSWR={record['dswr']}, FRBD={record['frbd']}, GZBD={record['gzb']}, GALI={record['gali']}")

if __name__ == "__main__":
    main()
