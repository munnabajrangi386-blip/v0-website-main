import csv

main_path = 'comprehensive_historical_data.csv'
gali1_path = 'dummy_gali1_2015_to_today.csv'
out_path = 'comprehensive_historical_data_gali1.csv'

# Read main historical data
with open(main_path, newline='') as f:
    reader = csv.DictReader(f)
    main_rows = [row for row in reader]
    main_fields = reader.fieldnames if reader.fieldnames else []

# Read dummy GALI1 data
with open(gali1_path, newline='') as f:
    reader = csv.DictReader(f)
    gali1_map = {row['date']: row['GALI1'] for row in reader}

# Ensure GALI1 column will be present
if 'GALI1' not in main_fields:
    out_fields = main_fields + ['GALI1']
else:
    out_fields = main_fields

# Inject GALI1 into all date rows (add where missing)
main_dates = set(row['date'] for row in main_rows)
gali_dates = set(gali1_map.keys())
all_dates = sorted(main_dates | gali_dates)
main_by_date = {row['date']: row for row in main_rows}

result_rows = []
for d in all_dates:
    base = main_by_date.get(d, {f: '--' for f in out_fields})
    new_row = base.copy()
    new_row['date'] = d
    if d in gali1_map:
        new_row['GALI1'] = gali1_map[d]
    elif 'GALI1' not in new_row:
        new_row['GALI1'] = '--'
    result_rows.append(new_row)

with open(out_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=out_fields)
    writer.writeheader()
    for row in result_rows:
        writer.writerow(row)

print(f"Injected GALI1 into {out_path} for all available dates.")
