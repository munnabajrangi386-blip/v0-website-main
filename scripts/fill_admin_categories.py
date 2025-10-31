import csv
import random

input_file = 'dummy_gali1_2015_to_today.csv'
output_file = 'dummy_gali1_2015_to_today.csv'

rows = []
with open(input_file, 'r', newline='') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    
    for row in reader:
        # Fill empty values with random two-digit numbers
        if not row.get('DESAWAR1') or row['DESAWAR1'].strip() == '':
            row['DESAWAR1'] = f"{random.randint(0, 99):02d}"
        if not row.get('FARIDABAD1') or row['FARIDABAD1'].strip() == '':
            row['FARIDABAD1'] = f"{random.randint(0, 99):02d}"
        if not row.get('GHAZIABAD1') or row['GHAZIABAD1'].strip() == '':
            row['GHAZIABAD1'] = f"{random.randint(0, 99):02d}"
        rows.append(row)

with open(output_file, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"✅ Filled DESAWAR1, FARIDABAD1, GHAZIABAD1 for all {len(rows)} rows")

