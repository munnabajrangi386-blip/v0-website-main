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
  kind?: "info" | "warning" | "success" // Made optional
  color?: string // e.g. "#fff59d" or "gold"
  textColor?: "black" | "white" // default black
  completeRow?: boolean // Toggle for full width vs button
  backgroundColor?: string // Background color for the banner
  multiColor?: boolean // Toggle for automatic multi-color text
  bold?: boolean // Toggle for bold text
  customColorPalette?: string[] // Custom color palette for multi-color text
  gifUrl?: string // GIF URL for small inline display
}

export type RunningBanner = {
  id: string
  text: string
  speed?: number // pixels per second, default 50
  active: boolean
  backgroundColor?: string // default red
  textColor?: string // default white
}

export type FullWidthBanner = {
  id: string
  title: string
  content: string
  backgroundColor: string
  textColor: string
  active: boolean
  order: number
  showBorder?: boolean
  borderColor?: string
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
  defaultTime?: string // Default time in HH:mm format (e.g., "15:59")
}

export type TextColumnLine = {
  text: string
  color?: string
  size?: string
}

export type TextColumn = {
  active: boolean
  lines: TextColumnLine[]
}

export type SiteContent = {
  banners: BannerBlock[]
  runningBanner?: RunningBanner
  fullWidthBanners?: FullWidthBanner[]
  banner2?: BannerBlock[]
  banner3?: BannerBlock[]
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
  leftTextColumn?: TextColumn
  rightTextColumn?: TextColumn
  footerBanner?: BannerBlock[]
  footerNote?: {
    text: string
    active: boolean
  }
  scraperConfig?: {
    useFastScraper: boolean
    fastScraperUrl: string
    originalScraperUrl: string
  }
}

export type LiveSchedule = {
  id: string
  category: string // e.g., "GHAZIABAD1", "FARIDABAD1", etc.
  scheduledTime: string // ISO time string for today (e.g., "2025-10-29T15:59:00.000Z")
  result: string // The result to display (e.g., "56")
  yesterdayResult?: string // Yesterday's result if available
  todayResult?: string // Today's result (same as result)
  status: "scheduled" | "published" | "expired"
  createdAt: string
  publishedAt?: string
}

export type ContentBundle = {
  content: SiteContent
  // Optional: include current highlighted result value for convenience
  headerValue?: { label: string; value: string; color?: "red" | "blue" | "green" }
}
