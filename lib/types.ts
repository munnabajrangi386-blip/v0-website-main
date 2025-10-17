// Types shared across admin/public APIs

export type ResultRow = {
  date: string // ISO date (YYYY-MM-DD)
  // Dynamic fields per site, minimum common ones:
  disawar?: string
  newDisawar?: string
  taj?: string
  delhiNoon?: string
  gali?: string
  ghaziabad?: string
  faridabad?: string
  haridwar?: string
  // Allow arbitrary extra fields:
  [key: string]: string | undefined
}

export type MonthKey = `${number}-${number}` // "2025-10"

export type MonthlyResults = {
  month: MonthKey
  fields: string[] // ordered field names
  rows: ResultRow[]
  updatedAt: string // ISO datetime
}

export type HeaderHighlight = {
  enabled: boolean
  month?: MonthKey
  field?: string // e.g., "disawar"
  date?: string // YYYY-MM-DD
  manualOverride?: { label: string; value: string; color?: "red" | "blue" | "green" }
}

export type BannerBlock = {
  id: string
  text: string
  kind: "info" | "warning" | "success"
  color?: string // e.g. "#fff59d" or "gold"
  textColor?: "black" | "white" // default black
}

export type AdItem = {
  id: string
  title: string
  imageUrl: string
  href?: string
  active: boolean
  createdAt: string
  description?: string
}

export type ActivityEntry = {
  id: string
  action: string
  by: string
  at: string
  meta?: Record<string, any>
}

export type ScheduleItem = {
  id: string
  publishAt: string // ISO datetime
  month: MonthKey
  row: ResultRow
  merge?: boolean // true = upsert into existing date, default append
  executed?: boolean // whether this schedule has been run
}

export type Category = {
  key: string
  label: string
  showInToday?: boolean
}

export type SiteContent = {
  banners: BannerBlock[]
  headerHighlight: HeaderHighlight
  ads: AdItem[]
  updatedAt: string
  categories?: Category[]
  headerImage?: {
    id: string
    imageUrl: string
    alt?: string
    active: boolean
  }
  footerNote?: {
    text: string
    active: boolean
  }
}

export type ContentBundle = {
  content: SiteContent
  // Optional: include current highlighted result value for convenience
  headerValue?: { label: string; value: string; color?: "red" | "blue" | "green" }
}
