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
  rows: Array<{
    day: number
    values: Array<number | null>
  }>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Single optimized hook that gets everything in one request
export function useCombinedData(month: number, year: number) {
  const now = new Date()
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["combined", month, year],
    () => fetcher(`/api/combined?month=${month}&year=${year}`),
    {
      refreshInterval: isCurrent ? 600_000 : 0, // 10 minutes for current month, no refresh for past months
      revalidateOnFocus: true, // Revalidate when user returns to tab (catches deletions)
      revalidateOnReconnect: false,
      keepPreviousData: true, // Show old data while loading new (optimistic rendering)
      dedupingInterval: 30_000, // 30 second deduplication (reduced for faster updates)
      revalidateIfStale: true, // Always revalidate stale data
      fallbackData: null, // No fallback - use keepPreviousData instead
    }
  )

  return {
    data,
    error,
    isLoading: isLoading && !data, // Only show loading if we have NO data (first load)
    isValidating, // Background refresh indicator (data exists but updating)
    mutate // Manual refresh function
  }
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