type LatestItem = { title: string; value: string; color?: "red" | "blue" | "green" }

export function LatestResults({ items }: { items: LatestItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 md:grid-cols-4">
      {items.map((i) => {
        const colorClass =
          i.color === "red"
            ? "result-number-red"
            : i.color === "blue"
              ? "result-number-blue"
              : i.color === "green"
                ? "result-number-green"
                : "text-foreground"
        return (
          <div key={i.title} className="rounded-lg border p-2 sm:p-3 text-center card-aura">
            <div className="text-xs sm:text-sm font-bold text-[var(--color-foreground)] truncate">{i.title}</div>
            <div className={`mt-1 text-lg sm:text-xl md:text-2xl font-extrabold ${colorClass}`}>{i.value}</div>
          </div>
        )
      })}
    </div>
  )
}
