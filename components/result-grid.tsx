"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Item = {
  name: string
  time: string
  live: string
  result: string
  status?: "pass" | "wait"
}

export function ResultGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
      {items.map((it) => (
        <button
          key={it.name}
          type="button"
          className={cn(
            "text-left rounded-xl border transition-colors",
            "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2",
          )}
          aria-label={`Open chart for ${it.name}`}
        >
          <Card className="rounded-xl border-0 shadow-none">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-primary truncate">{it.name}</div>
                  <div className="text-xs text-muted-foreground">TIME — {it.time}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs sm:text-sm font-semibold text-foreground">
                    {it.live}
                    {"\u{1F310}"}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-sm sm:text-base font-bold",
                      it.status === "pass" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {"{ "}
                    {it.result.replaceAll("{", "").replaceAll("}", "").trim()}
                    {" }"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  )
}
