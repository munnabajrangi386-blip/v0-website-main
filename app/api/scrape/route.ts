import { parseMonthlyTable } from "@/lib/scrape"

export async function GET() {
  const targetUrl = "https://newghaziabad.com/index.php"

  try {
    const res = await fetch(targetUrl, {
      // Avoid intermediary caches and identify ourselves politely
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; v0-scraper/1.0; +https://v0.app) Bootstrap CSS recreation",
        "accept-language": "en-IN,en;q=0.9",
      },
    })

    const html = await res.text()
    const data = parseHtml(html)

    return new Response(JSON.stringify(data), {
      headers: {
        "content-type": "application/json",
        // allow re-use from edge caches and client polling
        "cache-control": "s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error: any) {
    const payload = {
      error: true,
      message: "Failed to fetch or parse remote site",
      details: error?.message ?? String(error),
      fetchedAt: new Date().toISOString(),
      latest: [] as Array<{ title: string; value: string }>,
      tiles: [] as Array<{
        name: string
        time: string
        live: string
        result: string
        status?: "pass" | "wait"
      }>,
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }
}

export async function POST(req: Request) {
  try {
    let month: number | undefined
    let year: number | undefined

    // Accept both JSON body and query params
    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const payload = await req.json().catch(() => ({}) as any)
      month = Number(payload?.month)
      year = Number(payload?.year)
    } else {
      const url = new URL(req.url)
      month = Number(url.searchParams.get("month"))
      year = Number(url.searchParams.get("year"))
    }

    const now = new Date()
    const minYear = 2022
    const maxYear = now.getFullYear()
    if (!Number.isFinite(month!) || month! < 1 || month! > 12) {
      return new Response(JSON.stringify({ error: true, message: "Invalid month" }), { status: 400 })
    }
    if (!Number.isFinite(year!) || year! < minYear || year! > maxYear) {
      return new Response(JSON.stringify({ error: true, message: "Invalid year" }), { status: 400 })
    }

    // Simulate the site's form POST
    const form = new URLSearchParams()
    form.set("dd_month", String(month))
    form.set("dd_year", String(year))
    form.set("bt_showresult", "Show Result")

    const targetUrl = "https://newghaziabad.com/index.php"
    const res = await fetch(targetUrl, {
      method: "POST",
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; v0-scraper/1.0; +https://v0.app) Bootstrap CSS recreation",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "accept-language": "en-IN,en;q=0.9",
      },
      body: form.toString(),
    })

    const html = await res.text()
    const data = parseMonthlyTable(html, month!, year!)

    // Cache less for current month, more for historical months
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1
    const cacheControl = isCurrent
      ? "s-maxage=60, stale-while-revalidate=300"
      : "s-maxage=86400, stale-while-revalidate=604800"

    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json", "cache-control": cacheControl },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: true, message: error?.message ?? "Failed to scrape monthly table" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }
}

function cleanText(s: string) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseHtml(html: string) {
  // latestResult blocks
  const titleMatches = [...html.matchAll(/<div class="latestResultTitle">([\s\S]*?)<\/div>/g)]
  const valueMatches = [...html.matchAll(/<div class="latestResultResult">([\s\S]*?)<\/div>/g)]

  const titles = titleMatches.map((m) => cleanText(m[1]))
  const values = valueMatches.map((m) => cleanText(m[1]))
  const latest = []
  const len = Math.min(titles.length, values.length)
  for (let i = 0; i < len; i++) {
    if (!titles[i]) continue
    latest.push({ title: titles[i], value: values[i] ?? "" })
  }

  // tiles in grid: name (blue), time (website div), live (green), result (red)
  const tiles: Array<{
    name: string
    time: string
    live: string
    result: string
    status?: "pass" | "wait"
  }> = []

  const tileRegex =
    /<div class="col-6 karan[^>]*>[\s\S]*?<span[^>]*color:blue[^>]*>([^<]+)<\/span>[\s\S]*?<div class="website">TIME- ([^<]+)<\/div>[\s\S]*?<span[^>]*color:green[^>]*>([^<]+?)[\s<][\s\S]*?<span[^>]*color:red[^>]*>\{\s*([^}]+)\s*\}/g

  for (const m of html.matchAll(tileRegex)) {
    const name = cleanText(m[1])
    const time = cleanText(m[2])
    const live = cleanText(m[3]).replace(/[^\d]/g, "")
    const resultRaw = cleanText(m[4])
    const result = `{ ${resultRaw} }`
    const status = /wait/i.test(resultRaw) ? "wait" : "pass"
    tiles.push({ name, time, live, result, status })
  }

  return {
    fetchedAt: new Date().toISOString(),
    latest,
    tiles,
  }
}
