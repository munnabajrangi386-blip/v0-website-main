import csv
from collections import OrderedDict

MAIN_PATH = 'comprehensive_historical_data.csv'
DUMMY_PATH = 'dummy_gali1_2015_to_today.csv'
OUT_PATH = 'comprehensive_historical_with_gali1.csv'


def read_csv_to_dict(path, key='date'):
    rows = []
    with open(path, 'r', newline='') as f:
        r = csv.DictReader(f)
        for row in r:
            rows.append({k: v for k, v in row.items()})
    return rows, r.fieldnames


def index_by_date(rows):
    idx = {}
    for row in rows:
        idx[str(row.get('date'))] = row
    return idx


def main():
    main_rows, main_fields = read_csv_to_dict(MAIN_PATH)
    dummy_rows, dummy_fields = read_csv_to_dict(DUMMY_PATH)

    if 'date' not in main_fields:
        raise SystemExit('Main CSV must contain a date column')
    if 'date' not in dummy_fields or 'Gali1' not in dummy_fields:
        raise SystemExit('Dummy CSV must contain date and Gali1 columns')

    # Ensure Gali1 in header
    out_fields = list(main_fields)
    if 'Gali1' not in out_fields:
        out_fields.append('Gali1')

    # Build dummy index by date
    d_idx = index_by_date(dummy_rows)

    # Merge rows
    out_rows = []
    for row in main_rows:
        d = str(row.get('date'))
        merged = OrderedDict((k, row.get(k, '')) for k in out_fields)
        if 'Gali1' in row and row['Gali1']:
            merged['Gali1'] = row['Gali1']
        else:
            merged['Gali1'] = d_idx.get(d, {}).get('Gali1', merged.get('Gali1', ''))
        out_rows.append(merged)

    with open(OUT_PATH, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=out_fields)
        w.writeheader()
        for r in out_rows:
            w.writerow(r)

    print(f'Wrote {OUT_PATH}')


if __name__ == '__main__':
    main()
