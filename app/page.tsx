"use client"

import { useMemo, useState, useEffect } from "react"
import { ResultGrid } from "@/components/result-grid"
import { MonthlyTable } from "@/components/monthly-table"
import { useCombinedData } from "@/hooks/use-scrape"
import type { SiteContent } from "@/lib/types"

export default function HomePage() {
  const [month, setMonth] = useState(10)
  const [year, setYear] = useState(2025)
  const [currentTime, setCurrentTime] = useState("")
  
  useEffect(() => {
    setCurrentTime(new Date().toLocaleString())
  }, [])
  
  const { data: combinedData, error, isLoading } = useCombinedData(month, year)
  
  const { content, monthlyData, todayData } = useMemo(() => ({
    content: combinedData?.content,
    monthlyData: combinedData?.monthlyData,
    todayData: combinedData?.todayData
  }), [combinedData])

  const todayItems = useMemo(() => {
    if (!todayData?.items) return []
    return todayData.items.map((item: any) => ({
      title: item.category,
      value: item.value || "--",
      time: item.time || "TBD",
      jodi: item.jodi || "--",
      status: item.status || "wait",
      color: item.value && item.value !== "--" ? "text-green-600" : "text-gray-400",
      yesterdayResult: item.yesterdayResult || "--",
      todayResult: item.todayResult || "--"
    }))
  }, [todayData])

  return (
    <div className="w-full">
      {/* 1. Running Banner - Top of page - Fixed height */}
      {content?.runningBanner?.active && (
        <div 
          className="w-full h-12 overflow-hidden flex items-center"
          style={{
            backgroundColor: content.runningBanner.backgroundColor,
            color: content.runningBanner.textColor,
            '--scroll-duration': `${content.runningBanner.speed || 30}s`
          } as React.CSSProperties}
        >
          <div 
            className="animate-scroll font-bold text-lg"
            style={{
              animationDuration: `${content.runningBanner.speed || 30}s`
            }}
          >
            {content.runningBanner.text} • {content.runningBanner.text}
          </div>
        </div>
      )}

      {/* 2. Header Image - Full width */}
      <Header content={content} />

      {/* 3. Banners - Mixed layout: Complete Row vs Side-by-Side */}
      {content?.banners && content.banners.length > 0 && (
        <div className="w-full">
          {(() => {
            // Define colors based on banner properties
            const getBannerStyle = (banner: any, index: number) => {
              const colors = [
                { bg: "#dc2626", text: "#ffffff" }, // Red
                { bg: "#2563eb", text: "#ffffff" }, // Blue  
                { bg: "#059669", text: "#ffffff" }, // Green
                { bg: "#7c3aed", text: "#ffffff" }, // Purple
                { bg: "#ea580c", text: "#ffffff" }, // Orange
              ]
              
              // Priority 1: Custom background color (highest priority)
              if (banner.backgroundColor) {
                return { bg: banner.backgroundColor, text: banner.color || "#ffffff" }
              }
              
              // Priority 2: Custom color (for backward compatibility)
              if (banner.color) {
                return { bg: banner.color, text: "#ffffff" }
              }
              
              // Priority 3: Kind-based colors (only if no custom colors)
              if (banner.kind === "warning") {
                return { bg: "#f59e0b", text: "#000000" }
              }
              if (banner.kind === "info") {
                return { bg: "#3b82f6", text: "#ffffff" }
              }
              
              // Priority 4: Default color rotation
              return colors[index % colors.length]
            }

            // Render text with multi-color support and GIF
            const renderBannerText = (banner: any) => {
              const renderGif = () => {
                if (banner.gifUrl) {
                  return (
                    <img 
                      src={banner.gifUrl} 
                      alt="Banner GIF" 
                      className="inline-block align-middle mx-2"
                      style={{ 
                        width: '60px', 
                        height: '60px',
                        verticalAlign: 'middle'
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  )
                }
                return null
              }

              if (banner.multiColor) {
                // Multi-color text - split by lines and apply different colors to each line
                const lines = banner.text.split('\n')
                // Use custom color palette if available, otherwise use default
                const rainbowColors = banner.customColorPalette && banner.customColorPalette.length > 0 
                  ? banner.customColorPalette 
                  : [
                      '#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffd700',
                      '#adff2f', '#32cd32', '#00ff7f', '#00ced1', '#1e90ff',
                      '#4169e1', '#8a2be2', '#ff1493', '#dc143c', '#b22222',
                      '#8b0000', '#006400', '#000080', '#800080', '#ff6347'
                    ]
                
                return (
                  <span>
                    {lines.map((line: string, lineIndex: number) => (
                      <span key={lineIndex}>
                        <span 
                          style={{ 
                            color: rainbowColors[lineIndex % rainbowColors.length],
                            fontWeight: banner.bold ? 'bold' : 'normal'
                          }}
                        >
                          {line}
                        </span>
                        {lineIndex < lines.length - 1 && <br />}
                      </span>
                    ))}
                    {renderGif()}
                  </span>
                )
              } else {
                // Single color text
                return (
                  <span style={{ 
                    color: banner.color || '#ffffff',
                    fontWeight: banner.bold ? 'bold' : 'normal'
                  }}>
                    {banner.text}
                    {renderGif()}
                  </span>
                )
              }
            }
            
            // Process banners in order and group consecutive side-by-side banners
            const renderBanners = () => {
              const result = []
              let i = 0
              
              while (i < content.banners.length) {
                const currentBanner = content.banners[i]
                
                if (currentBanner.completeRow) {
                  // Full-width banner - render immediately
                  const style = getBannerStyle(currentBanner, i)
                  result.push(
                    <div
                      key={currentBanner.id || i}
                      className="w-full py-3 sm:py-4"
                      style={{
                        backgroundColor: style.bg,
                        color: style.text
                      }}
                    >
                      <div className="max-w-7xl mx-auto px-4">
                             <div className="text-center">
                               <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                                 {renderBannerText(currentBanner)}
                               </p>
                             </div>
                      </div>
                    </div>
                  )
                  i++
                } else {
                  // Side-by-side banner - collect consecutive ones
                  const sideBySideGroup = []
                  while (i < content.banners.length && !content.banners[i].completeRow) {
                    sideBySideGroup.push(content.banners[i])
                    i++
                  }
                  
                  // Render the group of side-by-side banners
                  if (sideBySideGroup.length > 0) {
                    result.push(
                      <div key={`group-${i}`} className="flex flex-wrap">
                        {sideBySideGroup.map((banner: any, groupIndex: number) => {
                          const style = getBannerStyle(banner, i - sideBySideGroup.length + groupIndex)
                          return (
                            <div 
                              key={banner.id || groupIndex} 
                              className="flex-1 min-w-0 py-3 sm:py-4"
                              style={{
                                backgroundColor: style.bg,
                                color: style.text
                              }}
                            >
                                     <div className="text-center px-4">
                                       <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                                         {renderBannerText(banner)}
                                       </p>
                                     </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                }
              }
              
              return result
            }
            
            return renderBanners()
          })()}
        </div>
      )}
      
      {/* 4. Ads Section - Before Today Satta News */}
      {content?.ads && content.ads.length > 0 && (
        <div className="w-full bg-yellow-400 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.ads
                .filter((ad: any) => ad.active)
                .map((ad: any, index: number) => (
                  <div key={ad.id || index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <a 
                      href={ad.href || ad.link || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-video bg-gray-100 flex items-center justify-center">
                        {ad.imageUrl ? (
                          <img 
                            src={ad.imageUrl} 
                            alt={ad.title || "Advertisement"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="text-gray-400 text-center">
                            <div className="text-4xl mb-2">📢</div>
                            <div className="text-sm">No Image</div>
                          </div>
                        )}
                      </div>
                      {ad.title && (
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-gray-900 text-center">
                            {ad.title}
                          </h3>
                        </div>
                      )}
                    </a>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Banner2 Section - After Ads */}
      {content?.banner2 && content.banner2.length > 0 && (
        <div className="w-full">
          {(() => {
            // Define colors based on banner properties
            const getBannerStyle = (banner: any, index: number) => {
              const colors = [
                { bg: "#dc2626", text: "#ffffff" }, // Red
                { bg: "#2563eb", text: "#ffffff" }, // Blue  
                { bg: "#059669", text: "#ffffff" }, // Green
                { bg: "#7c3aed", text: "#ffffff" }, // Purple
                { bg: "#ea580c", text: "#ffffff" }, // Orange
              ]
              
              // Priority 1: Custom background color (highest priority)
              if (banner.backgroundColor) {
                return { bg: banner.backgroundColor, text: banner.color || "#ffffff" }
              }
              
              // Priority 2: Custom color (for backward compatibility)
              if (banner.color) {
                return { bg: banner.color, text: "#ffffff" }
              }
              
              // Priority 3: Kind-based colors (only if no custom colors)
              if (banner.kind === "warning") {
                return { bg: "#f59e0b", text: "#000000" }
              }
              if (banner.kind === "info") {
                return { bg: "#3b82f6", text: "#ffffff" }
              }
              
              // Priority 4: Default color rotation
              return colors[index % colors.length]
            }

            // Render text with multi-color support and GIF
            const renderBannerText = (banner: any) => {
              const renderGif = () => {
                if (banner.gifUrl) {
                  return (
                    <img 
                      src={banner.gifUrl} 
                      alt="Banner GIF" 
                      className="inline-block align-middle mx-2"
                      style={{ 
                        width: '60px', 
                        height: '60px',
                        verticalAlign: 'middle'
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  )
                }
                return null
              }

              if (banner.multiColor) {
                // Multi-color text - split by lines and apply different colors to each line
                const lines = banner.text.split('\n')
                // Use custom color palette if available, otherwise use default
                const rainbowColors = banner.customColorPalette && banner.customColorPalette.length > 0 
                  ? banner.customColorPalette 
                  : [
                      '#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffd700',
                      '#adff2f', '#32cd32', '#00ff7f', '#00ced1', '#1e90ff',
                      '#4169e1', '#8a2be2', '#ff1493', '#dc143c', '#b22222',
                      '#8b0000', '#006400', '#000080', '#800080', '#ff6347'
                    ]
                
                return (
                  <span>
                    {lines.map((line: string, lineIndex: number) => (
                      <span key={lineIndex}>
                        <span 
                          style={{ 
                            color: rainbowColors[lineIndex % rainbowColors.length],
                            fontWeight: banner.bold ? 'bold' : 'normal'
                          }}
                        >
                          {line}
                        </span>
                        {lineIndex < lines.length - 1 && <br />}
                      </span>
                    ))}
                    {renderGif()}
                  </span>
                )
              } else {
                // Single color text
                return (
                  <span style={{ 
                    color: banner.color || '#ffffff',
                    fontWeight: banner.bold ? 'bold' : 'normal'
                  }}>
                    {banner.text}
                    {renderGif()}
                  </span>
                )
              }
            }
            
            // Process banners in order and group consecutive side-by-side banners
            const renderBanners = () => {
              const result = []
              let i = 0
              
              while (i < content.banner2.length) {
                const currentBanner = content.banner2[i]
                
                if (currentBanner.completeRow) {
                  // Full-width banner - render immediately
                  const style = getBannerStyle(currentBanner, i)
                  result.push(
                    <div
                      key={currentBanner.id || i}
                      className="w-full py-3 sm:py-4"
                      style={{
                        backgroundColor: style.bg,
                        color: style.text
                      }}
                    >
                      <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center">
                          <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                            {renderBannerText(currentBanner)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                  i++
                } else {
                  // Side-by-side banner - collect consecutive ones
                  const sideBySideGroup = []
                  while (i < content.banner2.length && !content.banner2[i].completeRow) {
                    sideBySideGroup.push(content.banner2[i])
                    i++
                  }
                  
                  // Render the group of side-by-side banners
                  if (sideBySideGroup.length > 0) {
                    result.push(
                      <div key={`group-${i}`} className="flex flex-wrap">
                        {sideBySideGroup.map((banner: any, groupIndex: number) => {
                          const style = getBannerStyle(banner, i - sideBySideGroup.length + groupIndex)
                          return (
                            <div 
                              key={banner.id || groupIndex} 
                              className="flex-1 min-w-0 py-3 sm:py-4"
                              style={{
                                backgroundColor: style.bg,
                                color: style.text
                              }}
                            >
                              <div className="text-center px-4">
                                <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                                  {renderBannerText(banner)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                }
              }
              
              return result
            }
            
            return renderBanners()
          })()}
        </div>
      )}
      
      <main className="w-full px-4 sm:px-6 py-2 sm:py-6">
        <TodayNewsSection />
        <LiveResultsSection currentTime={currentTime} todayItems={todayItems} isLoading={isLoading} />
      </main>
      
      {/* Banner3 Section - After live results, before table chart, outside main container for full-width coverage */}
      <Banner3Section content={content} />
      
      <main className="w-full px-4 sm:px-6 py-2 sm:py-6">
        <FilterSection month={month} year={year} setMonth={setMonth} setYear={setYear} />
        <MonthlyResultsSection monthlyData={monthlyData} isLoading={isLoading} />
      </main>
      
      {/* Footer Banner Section - Outside main container for full-width coverage */}
      <Footer content={content} />
      
    </div>
  )
}

function Header({ content }: { content?: SiteContent }) {
  return (
    <header className="w-full py-6" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between gap-6">
          {/* Left White Box with Text */}
          {content?.leftTextColumn?.active && (
            <div className="bg-white rounded-lg p-4 shadow-lg" style={{ width: '320px' }}>
              <div className="text-center space-y-2">
                {content.leftTextColumn.lines?.map((line: any, index: number) => (
                  <div 
                    key={index}
                    className={`font-bold ${line.size || 'text-lg'}`}
                    style={{ color: line.color || '#000000' }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Image Area - Square size */}
          {content?.headerImage?.active && content?.headerImage?.imageUrl ? (
            <div className="flex-shrink-0">
              <div className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
                <img 
                  src={`${content.headerImage.imageUrl}?t=${Date.now()}`} 
                  alt={content.headerImage.alt || "Header Image"}
                  className="w-full h-full object-cover"
                  key={content.headerImage.imageUrl} // Force re-render when URL changes
                />
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0">
              <div className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
                <div className="text-gray-400 text-center">
                  <div className="text-4xl mb-2">🖼️</div>
                  <div className="text-sm">No image uploaded</div>
                </div>
              </div>
            </div>
          )}

          {/* Right White Box with Text */}
          {content?.rightTextColumn?.active && (
            <div className="bg-white rounded-lg p-4 shadow-lg" style={{ width: '320px' }}>
              <div className="text-center space-y-2">
                {content.rightTextColumn.lines?.map((line: any, index: number) => (
                  <div 
                    key={index}
                    className={`font-bold ${line.size || 'text-lg'}`}
                    style={{ color: line.color || '#000000' }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}


function TodayNewsSection() {
  return (
    <section aria-labelledby="today-news" className="mt-6 sm:mt-8">
      <div className="w-full px-4 py-3 rounded-lg" style={{ backgroundColor: '#FF8F00' }}>
        <h2 id="today-news" className="text-center font-extrabold tracking-wide text-white text-lg sm:text-xl md:text-2xl">
          TODAY SATTA NEWS
        </h2>
      </div>
    </section>
  )
}

function LiveResultsSection({ currentTime, todayItems, isLoading }: { currentTime: string; todayItems: any[]; isLoading: boolean }) {
  return (
    <section aria-labelledby="live-results" className="mt-8">
      <div className="px-3 sm:px-4 py-2 sm:py-3 text-center bg-[var(--table-header-bg)] border-2 border-[var(--border)] rounded-lg shadow-md">
        <p className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
          SATTA KING LIVE RESULT •{" "}
          <span className="text-[var(--primary)]">
            {currentTime || "Loading..."}
          </span>
        </p>
      </div>
      <div className="mt-4">
        {isLoading ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">Loading live results…</div>
        ) : todayItems && todayItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {todayItems.map((item, index) => (
              <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-3 shadow-sm min-h-[120px] flex flex-col justify-center">
                <div className="text-center">
                  <h3 className="font-bold text-sm text-blue-600 mb-1 truncate">{item.title}</h3>
                  <div className="text-xs text-gray-600 mb-2">TIME: {item.time}</div>
                  <div className="flex justify-center items-center space-x-1 mb-2">
                    <span className="text-green-600 font-bold text-lg">{item.yesterdayResult || '--'}🌐</span>
                    <span className="text-red-600 font-bold text-xl">{`{ ${item.todayResult || '--'} }`}</span>
                    <span className="text-green-600 text-sm">✔️</span>
                  </div>
                  <div className={`text-xs font-semibold ${
                    item.status === 'pass' ? 'text-green-600' : 
                    item.status === 'next' ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {item.status === 'pass' ? 'PASS' : 
                     item.status === 'next' ? 'NEXT' : 'WAIT'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--color-muted-foreground)]">
            No live results available (Items: {todayItems?.length || 0})
          </div>
        )}
      </div>
    </section>
  )
}

function FilterSection({ month, year, setMonth, setYear }: { month: number; year: number; setMonth: (m: number) => void; setYear: (y: number) => void }) {
  return (
    <section aria-labelledby="filter" className="mt-8">
      <h2 id="filter" className="text-center text-3xl font-black text-gray-800 mb-6 uppercase tracking-wide">📊 MONTHLY AND YEARLY CHART 📈</h2>
      <form className="mx-auto flex max-w-md flex-col items-stretch gap-2 sm:gap-3 md:flex-row md:items-end" aria-label="Show monthly results">
        <div className="flex flex-col gap-1">
          <label htmlFor="dd_month" className="text-xs sm:text-sm font-medium">Month</label>
          <select 
            id="dd_month" 
            name="dd_month" 
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="rounded-md border bg-background px-2 sm:px-3 py-2 text-foreground text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dd_year" className="text-xs sm:text-sm font-medium">Year</label>
          <select 
            id="dd_year" 
            name="dd_year" 
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border bg-background px-2 sm:px-3 py-2 text-foreground text-sm"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <option key={2022 + i} value={2022 + i}>{2022 + i}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-primary px-3 sm:px-4 py-2 font-medium text-primary-foreground text-sm sm:text-base" aria-label="Show Result">
          Show Result
        </button>
      </form>
    </section>
  )
}

function MonthlyResultsSection({ monthlyData, isLoading }: { monthlyData?: any; isLoading: boolean }) {
  return (
    <section aria-labelledby="monthly-table" className="mt-6">
      <h2 id="monthly-table" className="sr-only">Monthly Results</h2>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading monthly results…</div>
      ) : monthlyData ? (
        <MonthlyTable data={monthlyData} />
      ) : (
        <div className="text-sm text-muted-foreground">No monthly data available</div>
      )}
    </section>
  )
}

function Banner3Section({ content }: { content?: SiteContent }) {
  if (!content?.banner3 || content.banner3.length === 0) return null

  const getBannerStyle = (banner: any, index: number) => {
    const colors = [
      { bg: "#dc2626", text: "#ffffff" }, // Red
      { bg: "#2563eb", text: "#ffffff" }, // Blue  
      { bg: "#059669", text: "#ffffff" }, // Green
      { bg: "#7c3aed", text: "#ffffff" }, // Purple
      { bg: "#ea580c", text: "#ffffff" }, // Orange
      { bg: "#0891b2", text: "#ffffff" }, // Cyan
      { bg: "#be123c", text: "#ffffff" }, // Rose
      { bg: "#65a30d", text: "#ffffff" }, // Lime
    ]
    
    if (banner.backgroundColor && banner.color) {
      return { bg: banner.backgroundColor, text: banner.color }
    }
    
    return colors[index % colors.length]
  }

  const renderGif = (banner: any) => {
    if (!banner.gifUrl) return null
    return (
      <img
        src={banner.gifUrl}
        alt="Banner GIF"
        className="inline-block w-8 h-8 mx-2 align-middle"
      />
    )
  }

  const renderBannerText = (banner: any) => {
    if (banner.multiColor && banner.customColorPalette) {
      const lines = banner.text.split('\n')
      return lines.map((line: string, lineIndex: number) => (
        <div key={lineIndex} className="whitespace-pre-line">
          {renderGif(banner)}
          {line.split(' ').map((word: string, wordIndex: number) => {
            const colorIndex = wordIndex % banner.customColorPalette.length
            const color = banner.customColorPalette[colorIndex]
            return (
              <span key={wordIndex} style={{ color }} className="inline">
                {word}{' '}
              </span>
            )
          })}
          {renderGif(banner)}
        </div>
      ))
    } else {
      // Single color text
      return (
        <span style={{ 
          color: banner.color || '#ffffff',
          fontWeight: banner.bold ? 'bold' : 'normal'
        }}>
          {renderGif(banner)}
          {banner.text}
          {renderGif(banner)}
        </span>
      )
    }
  }

  // Process banners in order and group consecutive side-by-side banners
  const renderBanners = () => {
    if (!content.banner3) return []
    
    const result = []
    let i = 0
    
    while (i < content.banner3.length) {
      const currentBanner = content.banner3[i]
      
      if (currentBanner.completeRow) {
        // Full-width banner - render immediately
        const style = getBannerStyle(currentBanner, i)
        result.push(
          <div
            key={currentBanner.id || i}
            className="w-full py-3 sm:py-4"
            style={{
              backgroundColor: style.bg,
              color: style.text
            }}
          >
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center">
                <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                  {renderBannerText(currentBanner)}
                </p>
              </div>
            </div>
          </div>
        )
        i++
      } else {
        // Side-by-side banner - collect consecutive ones
        const sideBySideGroup = []
        while (i < content.banner3.length && !content.banner3[i].completeRow) {
          sideBySideGroup.push(content.banner3[i])
          i++
        }
        
        // Render the group of side-by-side banners
        if (sideBySideGroup.length > 0) {
          result.push(
            <div key={`group-${i}`} className="flex flex-wrap">
              {sideBySideGroup.map((banner: any, groupIndex: number) => {
                const style = getBannerStyle(banner, i - sideBySideGroup.length + groupIndex)
                return (
                  <div 
                    key={banner.id || groupIndex} 
                    className="flex-1 min-w-0 py-3 sm:py-4"
                    style={{
                      backgroundColor: style.bg,
                      color: style.text
                    }}
                  >
                    <div className="text-center px-4">
                      <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                        {renderBannerText(banner)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      }
    }
    
    return result
  }

  return (
    <div className="w-full">
      {renderBanners()}
    </div>
  )
}

function Footer({ content }: { content?: SiteContent }) {
  const getBannerStyle = (banner: any, index: number) => {
    const colors = [
      { bg: "#dc2626", text: "#ffffff" }, // Red
      { bg: "#2563eb", text: "#ffffff" }, // Blue  
      { bg: "#059669", text: "#ffffff" }, // Green
      { bg: "#7c3aed", text: "#ffffff" }, // Purple
      { bg: "#ea580c", text: "#ffffff" }, // Orange
      { bg: "#0891b2", text: "#ffffff" }, // Cyan
      { bg: "#be123c", text: "#ffffff" }, // Rose
      { bg: "#65a30d", text: "#ffffff" }, // Lime
    ]
    
    if (banner.backgroundColor && banner.color) {
      return { bg: banner.backgroundColor, text: banner.color }
    }
    
    return colors[index % colors.length]
  }

  const renderGif = (banner: any) => {
    if (!banner.gifUrl) return null
    return (
      <img
        src={banner.gifUrl}
        alt="Banner GIF"
        className="inline-block w-8 h-8 mx-2 align-middle"
      />
    )
  }

  const renderBannerText = (banner: any) => {
    if (banner.multiColor && banner.customColorPalette) {
      const lines = banner.text.split('\n')
      return lines.map((line: string, lineIndex: number) => (
        <div key={lineIndex} className="whitespace-pre-line">
          {renderGif(banner)}
          {line.split(' ').map((word: string, wordIndex: number) => {
            const colorIndex = wordIndex % banner.customColorPalette.length
            const color = banner.customColorPalette[colorIndex]
            return (
              <span key={wordIndex} style={{ color }} className="inline">
                {word}{' '}
              </span>
            )
          })}
          {renderGif(banner)}
        </div>
      ))
    } else {
      // Single color text
      return (
        <span style={{ 
          color: banner.color || '#ffffff',
          fontWeight: banner.bold ? 'bold' : 'normal'
        }}>
          {renderGif(banner)}
          {banner.text}
          {renderGif(banner)}
        </span>
      )
    }
  }

  // Process banners in order and group consecutive side-by-side banners
  const renderFooterBanners = () => {
    if (!content?.footerBanner || content.footerBanner.length === 0) return null
    
    const result = []
    let i = 0
    
    while (i < content.footerBanner.length) {
      const currentBanner = content.footerBanner[i]
      
      if (currentBanner.completeRow) {
        // Full-width banner - render immediately
        const style = getBannerStyle(currentBanner, i)
        result.push(
          <div
            key={currentBanner.id || i}
            className="w-full py-3 sm:py-4"
            style={{
              backgroundColor: style.bg,
              color: style.text
            }}
          >
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center">
                <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                  {renderBannerText(currentBanner)}
                </p>
              </div>
            </div>
          </div>
        )
        i++
      } else {
        // Side-by-side banner - collect consecutive ones
        const sideBySideGroup = []
        while (i < content.footerBanner.length && !content.footerBanner[i].completeRow) {
          sideBySideGroup.push(content.footerBanner[i])
          i++
        }
        
        // Render the group of side-by-side banners
        if (sideBySideGroup.length > 0) {
          result.push(
            <div key={`group-${i}`} className="flex flex-wrap">
              {sideBySideGroup.map((banner: any, groupIndex: number) => {
                const style = getBannerStyle(banner, i - sideBySideGroup.length + groupIndex)
                return (
                  <div 
                    key={banner.id || groupIndex} 
                    className="flex-1 min-w-0 py-3 sm:py-4"
                    style={{
                      backgroundColor: style.bg,
                      color: style.text
                    }}
                  >
                    <div className="text-center px-4">
                      <p className="text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
                        {renderBannerText(banner)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      }
    }
    
    return result
  }

  return (
    <footer>
      {/* Footer Banner Section */}
      {content?.footerBanner && content.footerBanner.length > 0 && (
        <div className="w-full mb-6">
          {renderFooterBanners()}
        </div>
      )}
      
      {/* Footer Note */}
      {content?.footerNote?.active && content?.footerNote?.text && (
        <div className="text-center text-sm text-muted-foreground">
          <p>{content.footerNote.text}</p>
        </div>
      )}
    </footer>
  )
}
