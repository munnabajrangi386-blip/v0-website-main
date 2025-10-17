"use client"

import { Suspense, useMemo, useState } from "react"
import { ResultGrid } from "@/components/result-grid"
import { LatestResults } from "@/components/latest-results"
import { MonthlyTable } from "@/components/monthly-table"
import { useScrape, useMonthlyResults } from "@/hooks/use-scrape"
import useSWR from "swr"
import { ShowResultForm } from "@/components/results/show-result-form"

// Simplified types
type BannerBlock = {
  id: string
  text: string
  kind: "info" | "warning" | "success"
  color?: string
  textColor?: string
}
type AdItem = { id: string; title: string; imageUrl: string; href?: string; active: boolean }
type SiteContent = { banners?: BannerBlock[]; ads?: AdItem[]; categories?: Array<{ key?: string; label: string }> }
type TodayItem = { key: string; label: string; value: string; color?: "red" | "blue" | "green" }

export default function HomePage() {
  const { data, error, isLoading } = useScrape()
  const tiles = data?.tiles ?? []

  const [month, setMonth] = useState(10)
  const [year, setYear] = useState(2025)
  const monthly = useMonthlyResults(month, year)

  // Single API call for content
  const { data: content } = useSWR<SiteContent>("/api/content", (url) => 
    fetch(url, { cache: "no-store" }).then(r => r.json())
  )
  
  // Single API call for today's results
  const { data: todayData } = useSWR<{ date: string; items: TodayItem[] }>("/api/results/today", (url) =>
    fetch(url, { cache: "no-store" }).then(r => r.json())
  )

  const banners = content?.banners ?? []
  const ads = content?.ads ?? []
  const categories = content?.categories ?? []

  // Simplified today items processing
  const todayItems = useMemo(() => {
    if (!todayData?.items) return []
    
    if (categories.length > 0) {
      return categories.map((c, i) => {
        const key = (c.key || "").trim().toLowerCase()
        const item = todayData.items.find(t => 
          t.key?.toLowerCase() === key || t.label?.toLowerCase() === c.label?.toLowerCase()
        )
        return { 
          title: c.label || c.key || "-", 
          value: item?.value || "-", 
          color: ["blue", "red", "green"][i % 3] as "blue" | "red" | "green"
        }
      })
    }
    
    return todayData.items.map(x => ({ title: x.label, value: x.value, color: x.color }))
  }, [todayData, categories])

  return (
    <main className="mx-auto w-full max-w-6xl px-2 sm:px-4 py-4 sm:py-6">
      <header className="space-y-3">
        <div className="grid gap-3">
          {(banners.length
            ? banners
            : [{ text: "Direct disawar company — honesty first. Whatsapp for secure play.", kind: "warning" }]
          ).map((b: any, i: number) => {
            const text = typeof b === "string" ? b : b?.text
            const style =
              typeof b !== "string" && b?.color
                ? { backgroundColor: b.color as string, color: (b.textColor || "black") === "white" ? "#fff" : "#111" }
                : undefined
            return (
              <div key={i} className="p-3 sm:p-4 rounded-lg border-2 border-[var(--border)] bg-gradient-to-r from-[var(--card-gradient-from)] to-[var(--card-gradient-to)] shadow-lg" style={style}>
                <p className="text-pretty text-xs sm:text-sm md:text-base font-bold text-center text-[var(--foreground)] leading-tight">{text}</p>
              </div>
            )
          })}
        </div>
      </header>

      <section aria-labelledby="today-news" className="mt-6">
        <h2 id="today-news" className="text-center font-extrabold tracking-wide text-[var(--primary)] bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent text-lg sm:text-xl md:text-2xl">
          TODAY SATTA NEWS
        </h2>
        <div className="mt-3">
          <LatestResults items={todayItems} />
        </div>
      </section>

      {Array.isArray(ads) && ads.some((a: any) => a.active) ? (
        <section aria-labelledby="ads" className="mt-6">
          <h2 id="ads" className="sr-only">
            Advertisements
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {ads
              .filter((a: any) => a.active)
              .map((slot: any) => {
                const href = slot.href || slot.link
                const img = (
                  <img
                    src={slot.imageUrl || "/placeholder.svg"}
                    alt={slot.title || "Advertisement"}
                    className="w-full h-28 md:h-32 object-cover rounded-[var(--radius)] border"
                    loading="lazy"
                  />
                )
                return (
                  <div key={slot.id} className="card-aura p-2">
                    <div className="mb-2 text-sm font-medium">{slot.title || "Advertisement"}</div>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={slot.title || "Ad"}>
                        {img}
                      </a>
                    ) : (
                      img
                    )}
                  </div>
                )
              })}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="live-results" className="mt-8">
        <div className="px-3 sm:px-4 py-2 sm:py-3 text-center bg-[var(--table-header-bg)] border-2 border-[var(--border)] rounded-lg shadow-md">
          <p className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
            SATTA KING LIVE RESULT •{" "}
            <time dateTime={data?.fetchedAt || "2025-10-17T15:35:00.000Z"} className="text-[var(--primary)]">
              {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : "10/17/2025, 3:35:00 PM"}
            </time>
          </p>
        </div>
        <div className="mt-4">
          {isLoading && tiles.length === 0 ? (
            <div className="text-sm text-[var(--color-muted-foreground)]">Loading live results…</div>
          ) : (
            <ResultGrid items={tiles} />
          )}
        </div>
      </section>

      <section aria-labelledby="filter" className="mt-8">
        <h2 id="filter" className="sr-only">
          Filter Results
        </h2>
        <ShowResultForm
          initialMonth={month}
          initialYear={year}
          onSubmit={(m, y) => {
            setMonth(m)
            setYear(y)
          }}
        />
      </section>

      <section aria-labelledby="monthly-table" className="mt-6">
        <h2 id="monthly-table" className="sr-only">
          Monthly Results
        </h2>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading table…</div>}>
          <MonthlyTable
            data={monthly.data}
            loading={monthly.isLoading && !monthly.data}
            error={monthly.error ? "Unable to fetch monthly results" : null}
          />
        </Suspense>
      </section>
    </main>
  )
}
