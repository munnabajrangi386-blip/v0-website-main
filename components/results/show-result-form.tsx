"use client"

import { useMemo, useState } from "react"

type Props = {
  initialMonth?: number
  initialYear?: number
  onSubmit: (month: number, year: number) => void
}

export function ShowResultForm({ initialMonth, initialYear, onSubmit }: Props) {
  const now = new Date()
  const [month, setMonth] = useState<number>(initialMonth ?? now.getMonth() + 1)
  const [year, setYear] = useState<number>(initialYear ?? now.getFullYear())

  const months = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    [],
  )

  const years = useMemo(() => {
    const ys: number[] = []
    for (let y = 2022; y <= now.getFullYear(); y++) ys.push(y)
    return ys
  }, [now])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(month, year)
      }}
      className="mx-auto flex max-w-md flex-col items-stretch gap-2 sm:gap-3 md:flex-row md:items-end"
      aria-label="Show monthly results"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="dd_month" className="text-xs sm:text-sm font-medium">
          Month
        </label>
        <select
          id="dd_month"
          name="dd_month"
          className="rounded-md border bg-background px-2 sm:px-3 py-2 text-foreground text-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {months.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dd_year" className="text-xs sm:text-sm font-medium">
          Year
        </label>
        <select
          id="dd_year"
          name="dd_year"
          className="rounded-md border bg-background px-2 sm:px-3 py-2 text-foreground text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-primary px-3 sm:px-4 py-2 font-medium text-primary-foreground text-sm sm:text-base"
        aria-label="Show Result"
      >
        Show Result
      </button>
    </form>
  )
}
