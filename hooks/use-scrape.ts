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

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Single optimized hook that gets everything in one request
export function useCombinedData(month: number, year: number) {
  const now = new Date()
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1

  return useSWR(
    ["combined", month, year],
    () => fetcher(`/api/combined?month=${month}&year=${year}`),
    {
      refreshInterval: isCurrent ? 600_000 : 0, // 10 minutes for current month, no refresh for past months
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 300_000, // 5 minute deduplication
    }
  )
}

// Legacy hooks for compatibility
export function useScrape() {
  return useSWR("/api/scrape", fetcher, {
    refreshInterval: 0, // Disabled - use combined instead
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}

export function useMonthlyResults(month: number, year: number) {
  const { data } = useCombinedData(month, year)
  return {
    data: data?.monthlyData || null,
    isLoading: !data,
    error: null
  }
}