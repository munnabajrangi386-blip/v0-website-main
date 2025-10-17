"use client"

import { Suspense, useMemo, useState } from "react"
import { ResultGrid } from "@/components/result-grid"
import { LatestResults } from "@/components/latest-results"
import { MonthlyTable } from "@/components/monthly-table"
import { useCombinedData } from "@/hooks/use-scrape"
import { ShowResultForm } from "@/components/results/show-result-form"

// Simplified types
type BannerBlock = { id: string; text: string; kind: "info" | "warning" | "error" }
type AdItem = { id: string; title: string; imageUrl: string; href: string; active: boolean; createdAt: string }
type SiteContent = { 
  banners?: BannerBlock[]
  ads?: AdItem[]
  headerImage?: { imageUrl: string; alt?: string; active: boolean }
  footerNote?: { text: string; active: boolean }
}

export default function HomePage() {
  const [month, setMonth] = useState(10)
  const [year, setYear] = useState(2025)
  
  // Single optimized API call that gets everything
  const { data: combinedData, error, isLoading } = useCombinedData(month, year)
  
  const content = combinedData?.content
  const monthlyData = combinedData?.monthlyData
  const todayData = combinedData?.todayData
  
  const banners = content?.banners ?? []
  const ads = content?.ads ?? []

  // Simplified today items processing
  const todayItems = useMemo(() => {
    if (!todayData?.items) return []
    return todayData.items.map(item => ({
      title: item.category,
      value: item.value || "--",
      color: item.value ? "text-green-600" : "text-gray-400"
    }))
  }, [todayData])

  return (
    <main className="mx-auto w-full max-w-6xl px-2 sm:px-4 py-4 sm:py-6">
      <header className="space-y-3">
        {/* Header Image */}
        {content?.headerImage?.active && content?.headerImage?.imageUrl && (
          <div className="flex justify-center mb-3 sm:mb-4 px-2 sm:px-0">
            <img 
              src={content.headerImage.imageUrl} 
              alt={content.headerImage.alt || "Header Image"}
              className="max-w-full h-auto rounded-lg shadow-lg w-full sm:w-auto"
            />
          </div>
        )}
        
        <div className="grid gap-3">
          {(banners.length
            ? banners
            : [{ text: "Direct disawar company — honesty first. Whatsapp for secure play.", kind: "warning" }]
          ).map((b: any, i: number) => {
            const text = typeof b === "string" ? b : b?.text
            const kind = typeof b === "string" ? "warning" : b?.kind || "info"
            const style = {
              "--border": kind === "error" ? "#ef4444" : kind === "warning" ? "#f59e0b" : "#3b82f6",
              "--card-gradient-from": kind === "error" ? "#fef2f2" : kind === "warning" ? "#fffbeb" : "#eff6ff",
              "--card-gradient-to": kind === "error" ? "#fee2e2" : kind === "warning" ? "#fef3c7" : "#dbeafe",
              "--foreground": kind === "error" ? "#dc2626" : kind === "warning" ? "#d97706" : "#1d4ed8",
            } as React.CSSProperties

            return (
              <div key={i} className="p-3 sm:p-4 rounded-lg border-2 border-[var(--border)] bg-gradient-to-r from-[var(--card-gradient-from)] to-[var(--card-gradient-to)] shadow-lg" style={style}>
                <p className="text-pretty text-xs sm:text-sm md:text-base font-bold text-center text-[var(--foreground)] leading-tight">{text}</p>
              </div>
            )
          })}
        </div>
      </header>

      <section aria-labelledby="today-news" className="mt-6 sm:mt-8">
        <h2 id="today-news" className="text-center font-extrabold tracking-wide text-[var(--primary)] bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent text-lg sm:text-xl md:text-2xl">
          TODAY SATTA NEWS
        </h2>
      </section>

      <section aria-labelledby="live-results" className="mt-8">
        <div className="px-3 sm:px-4 py-2 sm:py-3 text-center bg-[var(--table-header-bg)] border-2 border-[var(--border)] rounded-lg shadow-md">
          <p className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
            SATTA KING LIVE RESULT •{" "}
            <time dateTime={new Date().toISOString()} className="text-[var(--primary)]">
              {new Date().toLocaleString()}
            </time>
          </p>
        </div>
        <div className="mt-4">
          {isLoading ? (
            <div className="text-sm text-[var(--color-muted-foreground)]">Loading live results…</div>
          ) : (
            <ResultGrid items={[]} />
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
            data={monthlyData}
            loading={isLoading && !monthlyData}
            error={error ? "Unable to fetch monthly results" : null}
          />
        </Suspense>
      </section>

      {/* Footer Note */}
      {content?.footerNote?.active && content?.footerNote?.text && (
        <section className="mt-6 sm:mt-8">
          <div className="bg-gradient-to-r from-[var(--card-gradient-from)] to-[var(--card-gradient-to)] border-2 border-[var(--border)] rounded-lg p-3 sm:p-4 md:p-6 shadow-lg">
            <p className="text-xs sm:text-sm md:text-base text-[var(--foreground)] text-center leading-relaxed">
              {content.footerNote.text}
            </p>
          </div>
        </section>
      )}
    </main>
  )
}