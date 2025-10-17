"use client"

import useSWR from "swr"

type Latest = { title: string; value: string }
type Tile = { name: string; time: string; live: string; result: string; status?: "pass" | "wait" }

type ScrapeResponse = {
  fetchedAt?: string
  latest: Latest[]
  tiles: Tile[]
  error?: boolean
  message?: string
}

export type MonthlyData = {
  month: number
  year: number
  columns: string[]
  rows: Array<{ day: number; values: Array<number | null> }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<ScrapeResponse>)

const postJson = async <T,>(url: string, body: any): Promise<T> => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json()
}

export function useScrape() {
  return useSWR<ScrapeResponse>("/api/scrape", fetcher, {
    refreshInterval: 120_000, // Reduced from 60s to 2 minutes
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
    dedupingInterval: 30_000, // Prevent duplicate requests
  })
}

export function useMonthlyResults(month: number, year: number) {
  const now = new Date()
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1

  return useSWR<MonthlyData>(
    ["monthly", month, year],
    async () => {
      // Get both admin content and scraper data for hybrid table
      const [contentResponse, scraperResponse] = await Promise.all([
        fetch("/api/content"),
        postJson<MonthlyData>("/api/scrape", { month, year })
      ])
      
      const content = await contentResponse.json()
      const scraperData = await scraperResponse
      
      // Get admin categories (excluding the default ones that come from scraper)
      const adminCategories = content.categories?.filter(cat => 
        !["disawar", "newDisawar", "taj", "delhiNoon", "gali", "ghaziabad", "faridabad", "haridwar"].includes(cat.key)
      ) || []
      
      // Create hybrid columns: admin categories first, then scraper columns
      const hybridColumns = [
        ...adminCategories.map(cat => cat.label),
        ...scraperData.columns
      ]
      
      // Create hybrid rows: admin data first (empty for now), then scraper data
      const hybridRows = scraperData.rows.map(row => ({
        day: row.day,
        values: [
          ...new Array(adminCategories.length).fill(null), // Empty values for admin categories
          ...row.values // Scraper data
        ]
      }))
      
      return {
        month: scraperData.month,
        year: scraperData.year,
        columns: hybridColumns,
        rows: hybridRows
      }
    },
    {
      refreshInterval: isCurrent ? 300_000 : 0, // Reduced frequency: 5 minutes for current month
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 60_000, // Prevent duplicate requests for 1 minute
    },
  )
}
