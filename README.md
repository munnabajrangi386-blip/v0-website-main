# Remix of Bootstrap CSS recreation

This project is a Next.js (App Router) app running in the Next.js runtime with shadcn/ui. Content is stored in Vercel Blob as JSON documents.

## Admin
- Visit `/admin/login` to authenticate (cookie-based session).
- Manage Banners, Ads, Categories, and Schedules from `/admin`.
- All edits are written to Blob JSON. If a transient storage error happens, try again; the UI keeps optimistic state.

## Categories
- Create categories with:
  - Key: unique identifier (e.g., `disawar`, `newDisawar`), used in result rows.
  - Label: user-facing name (e.g., `DESAWAR`).
- The public “Today Satta News” section renders exactly the categories you create here (order and labels).

## Scheduling Results
- Go to Schedule in Admin, choose a date (YYYY-MM-DD) and time, month (YYYY-MM) and enter a row with fields matching your category keys.
- “Merge” means if a row already exists for the date, only provided fields update; otherwise, a new row is added.
- On every request to `/api/results/today`, the server runs “due” schedules (publishAt <= now) before building Today data.

## Today Satta News — Quick Check & Troubleshooting

- Source of truth: The list of tiles is ALWAYS your Admin “Categories”, in the same order. Values come from today’s row after schedules are run. If a category has no value today, the tile shows "-".
- Verify quickly:
  1) Open `/api/content` and confirm your `categories` array contains your labels (and keys if present).
  2) Open `/api/results/today` — it first runs due schedules, then returns items. Each item’s `label` should match your Category label; `value` will be a string or "-".
  3) Reload the homepage. The “TODAY SATTA NEWS” section renders those categories; there is no hardcoded fallback.

If you still see old sample names (e.g., DESAWAR/TAJ), your Admin Categories may be empty or the Today API returned an error. Re-save a Category, add a Schedule for today, and refresh.

- API: `/api/results/today` runs due schedules and returns all Admin Categories (same order) with their values for today's row.
- The homepage renders exactly those categories; if a category has no value for today, it shows “-”. There is no hardcoded fallback list.

## Notes
- Blob integration is used for JSON content and image uploads.
- If you need to reset content, delete Blob keys under `content/` and reload Admin to bootstrap defaults again.
