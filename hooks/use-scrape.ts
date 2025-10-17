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
      // Simplified - just get scraper data for now
      const scraperData = await postJson<MonthlyData>("/api/scrape", { month, year })
      return scraperData
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
