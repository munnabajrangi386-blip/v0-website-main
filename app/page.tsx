"use client"

import { useMemo, useState, useEffect } from "react"
import { ResultGrid } from "@/components/result-grid"
import { MonthlyTable } from "@/components/monthly-table"
import { useCombinedData } from "@/hooks/use-scrape"
import type { SiteContent } from "@/lib/types"

export default function HomePage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1) // Current month
  const [year, setYear] = useState(new Date().getFullYear()) // Current year
  const [currentTime, setCurrentTime] = useState("")
  const [formattedDateTime, setFormattedDateTime] = useState("")
  
  useEffect(() => {
    // Update formatted date/time every second
    const updateDateTime = () => {
      const now = new Date()
      const day = now.getDate()
      const daySuffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                       day === 2 || day === 22 ? 'nd' : 
                       day === 3 || day === 23 ? 'rd' : 'th'
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      const month = monthNames[now.getMonth()]
      const year = now.getFullYear()
      
      const hours = now.getHours()
      const minutes = now.getMinutes().toString().padStart(2, '0')
      const seconds = now.getSeconds().toString().padStart(2, '0')
      const ampm = hours >= 12 ? 'pm' : 'am'
      const displayHours = hours % 12 || 12
      
      setFormattedDateTime(`${day}${daySuffix} ${month}, ${year} ${displayHours}:${minutes}:${seconds}${ampm}`)
    setCurrentTime(new Date().toLocaleString())
    }
    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    
    // Load historical data
    fetch('/api/load-historical-data', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Historical data loaded successfully
        }
      })
      .catch(err => console.error('Failed to load historical data:', err))
    
    return () => clearInterval(interval)
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
    <div className="w-full min-h-screen" style={{backgroundColor: '#8b5cf6'}}>
      {/* 2. Header Image - Full width */}
      {!isLoading && <Header content={content} />}
      {isLoading && (
        <header className="w-full py-3 sm:py-4 md:py-6" style={{ backgroundColor: '#000000' }}>
          <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 sm:gap-4 md:gap-6">
              <div className="flex-shrink-0 w-full sm:w-auto">
                <div className="w-full sm:w-48 md:w-56 lg:w-64 h-48 sm:h-48 md:h-56 lg:h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shadow-lg mx-auto animate-pulse">
                  <div className="text-gray-400 text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl mb-2">⏳</div>
                    <div className="text-xs sm:text-sm">Loading...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* 1. Running Banner - After header, before chart result title */}
      {content?.runningBanner?.active && (
        <div 
          className="w-full h-10 sm:h-12 overflow-hidden flex items-center sticky top-0 z-50"
          style={{
            backgroundColor: content.runningBanner.backgroundColor,
            color: content.runningBanner.textColor,
            '--scroll-duration': `${content.runningBanner.speed || 30}s`
          } as React.CSSProperties}
        >
          <div 
            className="animate-scroll font-bold text-xs sm:text-sm md:text-base lg:text-lg px-2"
            style={{
              animationDuration: `${content.runningBanner.speed || 30}s`
            }}
          >
            {content.runningBanner.text} • {content.runningBanner.text}
          </div>
        </div>
      )}

      {/* 2.5. Static Yellow Banner - Chart Result Title */}
      <div 
        className="w-full py-3 sm:py-4 md:py-6 px-2 sm:px-4"
        style={{ backgroundColor: '#FFD700' }}
      >
        <div className="max-w-7xl mx-auto text-center overflow-x-auto">
          <h1 
            className="animate-blink px-2 whitespace-nowrap"
            style={{ 
              fontWeight: 'bold', 
              color: '#000000',
              fontSize: 'clamp(14px, 3vw, 28px)',
              lineHeight: '1.2',
              whiteSpace: 'nowrap'
            }}
          >
            SATTA MARKIT CHART RESULT- GHAZIABAD2, FARIDABAD2, DESAWAR2 & GALI2
          </h1>
        </div>
      </div>

      {/* 2.6. Static Black Banner - Below red banner */}
      <div 
        className="w-full py-3 sm:py-4 md:py-6 px-2 sm:px-4"
        style={{ backgroundColor: '#000000' }}
      >
        <div className="max-w-7xl mx-auto text-center space-y-2 sm:space-y-3">
          {/* Date and Time - Yellow text, responsive font size */}
          <div className="text-xs sm:text-sm md:text-base lg:text-lg px-2" style={{ color: '#FFD700' }}>
            {formattedDateTime || 'Loading...'}
          </div>
          
          {/* LIVE SATTA RESULT HERE - Yellow text, responsive font size */}
          <div className="text-xs sm:text-sm md:text-base lg:text-lg px-2" style={{ color: '#FFD700' }}>
            LIVE SATTA RESULT HERE
          </div>
          
          {/* Hindi text - White text, responsive font size */}
          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl px-2" style={{ color: '#FFFFFF' }}>
            हन भाई यहीं आती है सबसे पहली खबर
          </div>
          
          {/* All upcoming results - Show results with values or waiting items */}
          {(() => {
            // Get all items that either have results or are waiting
            // Show items with results first, then waiting items
            const itemsWithResults = todayItems.filter((item: any) => 
              item.value && item.value !== '--' && item.status === 'pass'
            )
            const waitingItems = todayItems.filter((item: any) => 
              item.status === 'wait' || !item.value || item.value === '--'
            )
            
            // Combine: results first, then waiting items - limit to 5 on mobile
            const allUpcomingItems = [...itemsWithResults, ...waitingItems].slice(0, 5)
            
            if (allUpcomingItems.length > 0) {
              return (
                <div className="space-y-1 sm:space-y-2 mt-2 sm:mt-4 px-2">
                  {allUpcomingItems.map((item: any, index: number) => {
                    const hasResult = item.value && item.value !== '--' && item.status === 'pass'
                    const isWaiting = item.status === 'wait' || !item.value || item.value === '--'
                    
                    return (
                      <div 
                        key={`${item.title}-${index}`} 
                        className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base lg:text-lg xl:text-2xl"
                        style={{ color: '#FFD700' }}
                      >
                        <span className="font-medium">{item.title}</span>
                        {isWaiting ? (
                          // Show GIF for waiting results
                          <img 
                            src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXh1c2R3aDRyYXRpMGZoZmlmMnl3ZjZqbmNmMmFiaGVkM21zM3BscSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9dHM/aLFNpAGtT9Cucngzl9/giphy.gif"
                            alt="Waiting"
                            className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10"
                          />
                        ) : (
                          // Show result value
                          <span className="font-bold">
                            {item.value}
                          </span>
                        )}
                        {item.time && (
                          <span className="text-xs sm:text-sm md:text-base opacity-80">
                            • {item.time}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            }
            return null
          })()}
        </div>
      </div>

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
                               <p className="text-sm sm:text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
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
                                       <p className="text-sm sm:text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
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
                          <p className="text-sm sm:text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
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
                                <p className="text-sm sm:text-base md:text-lg font-medium leading-relaxed whitespace-pre-line">
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
      <MonthlyResultsSection monthlyData={monthlyData} isLoading={isLoading} />
      <FilterSection month={month} year={year} setMonth={setMonth} setYear={setYear} />
      </main>
      
      {/* Footer Banner Section - Outside main container for full-width coverage */}
      <Footer content={content} />
      
    </div>
  )
}

function Header({ content }: { content?: SiteContent }) {
  return (
    <header className="w-full py-3 sm:py-4 md:py-6" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-3 sm:gap-4 md:gap-6">
          {/* Left White Box with Text */}
          {content?.leftTextColumn?.active && (
            <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-lg w-full sm:w-auto sm:min-w-[200px] md:w-64 lg:w-80">
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
            <div className="flex-shrink-0 w-full sm:w-auto">
              <div className="w-full sm:w-48 md:w-56 lg:w-64 h-48 sm:h-48 md:h-56 lg:h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shadow-lg mx-auto relative">
                <img 
                  src={content.headerImage.imageUrl.startsWith('http') || content.headerImage.imageUrl.startsWith('/')
                    ? content.headerImage.imageUrl 
                    : `/${content.headerImage.imageUrl}`
                  } 
                  alt={content.headerImage.alt || "Header Image"}
                  className="w-full h-full object-cover"
                  key={content.headerImage.imageUrl}
                  loading="eager"
                  onLoad={(e) => {
                    // Hide any loading placeholder when image loads successfully
                    const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement | null
                    if (placeholder) {
                      placeholder.style.display = 'none'
                    }
                  }}
                  onError={(e) => {
                    // Hide image on error, show placeholder
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      const placeholder = parent.querySelector('.image-placeholder') as HTMLElement | null
                      if (!placeholder) {
                        parent.innerHTML = `
                          <div class="image-placeholder text-gray-400 text-center">
                            <div class="text-2xl sm:text-3xl md:text-4xl mb-2">🖼️</div>
                            <div class="text-xs sm:text-sm">Image failed to load</div>
                          </div>
                        `
                      } else {
                        placeholder.style.display = 'flex'
                      }
                    }
                  }}
                />
                <div className="image-placeholder absolute inset-0 bg-gray-100 flex items-center justify-center" style={{ display: 'none' }}>
                  <div className="text-gray-400 text-center">
                    <div className="text-2xl sm:text-3xl md:text-4xl mb-2">⏳</div>
                    <div className="text-xs sm:text-sm">Loading...</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-full sm:w-auto">
              <div className="w-full sm:w-48 md:w-56 lg:w-64 h-48 sm:h-48 md:h-56 lg:h-64 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shadow-lg mx-auto">
                <div className="text-gray-400 text-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl mb-2">🖼️</div>
                  <div className="text-xs sm:text-sm">No image uploaded</div>
                </div>
              </div>
            </div>
          )}
      
          {/* Right White Box with Text */}
          {content?.rightTextColumn?.active && (
            <div className="bg-white rounded-lg p-2 sm:p-3 md:p-4 shadow-lg w-full sm:w-auto sm:min-w-[200px] md:w-64 lg:w-80">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {todayItems.map((item, index) => (
              <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-2 sm:p-3 shadow-sm min-h-[100px] sm:min-h-[120px] flex flex-col justify-center">
                <div className="text-center">
                  <h3 className="font-bold text-xs sm:text-sm text-blue-600 mb-1 truncate px-1">{item.title}</h3>
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2">TIME: {item.time}</div>
                  <div className="flex justify-center items-center space-x-0.5 sm:space-x-1 mb-1 sm:mb-2 flex-wrap gap-0.5">
                    <span className="text-green-600 font-bold text-sm sm:text-base md:text-lg">{item.yesterdayResult || '--'}🌐</span>
                    {item.todayResult && item.todayResult !== '--' ? (
                      <span className="text-red-600 font-bold text-base sm:text-lg md:text-xl">{`{ ${item.todayResult} }`}</span>
                    ) : (
                      <span className="text-red-600 font-bold text-base sm:text-lg md:text-xl flex items-center justify-center">
                        {'{ '}
                        <img 
                          src="https://sattakingchartresult.com/_next/d386c.gif" 
                          alt="Waiting for result" 
                          className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7"
                          style={{ display: 'inline-block', verticalAlign: 'middle' }}
                        />
                        {' }'}
                      </span>
                    )}
                    <span className="text-green-600 text-xs sm:text-sm">✔️</span>
                  </div>
                  <div className={`text-[10px] sm:text-xs font-semibold ${
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
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  
  // Calculate previous month
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  
  // Calculate next month
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  
  // Check if we're at the current month/year
  const isCurrentMonth = year === currentYear && month === currentMonth
  
  // Check if previous month is valid (not before 2015)
  const isPrevMonthValid = prevYear >= 2015
  
  // Check if next month is valid (not beyond current month)
  const isNextMonthValid = nextYear < currentYear || (nextYear === currentYear && nextMonth <= currentMonth)
  
  const handlePrevMonth = () => {
    if (isPrevMonthValid) {
      setMonth(prevMonth)
      setYear(prevYear)
    }
  }
  
  const handleNextMonth = () => {
    if (isNextMonthValid) {
      setMonth(nextMonth)
      setYear(nextYear)
    }
  }
  
  const getMonthName = (monthNum: number) => {
    return new Date(0, monthNum - 1).toLocaleString('default', { month: 'long' })
  }

  return (
    <section aria-labelledby="filter" className="mt-8 w-screen relative left-1/2 right-1/2 -translate-x-1/2 overflow-x-hidden p-0 m-0" style={{marginLeft:0, marginRight:0}}>
      <div className="w-screen bg-black py-4 sm:py-6 md:py-8 lg:py-10 px-2 sm:px-4 p-0 m-0 overflow-x-hidden" style={{marginLeft:0, marginRight:0}}>
        <h2 id="filter" className="text-center text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-white mb-3 sm:mb-4 md:mb-6 uppercase tracking-wide px-2">📊 MONTHLY AND YEARLY CHART 📈</h2>
        <form className="w-full flex flex-col sm:flex-row flex-wrap items-center sm:items-end justify-center gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6 px-2" aria-label="Show monthly results">
          <button
            onClick={handlePrevMonth}
            type="button"
            disabled={!isPrevMonthValid}
            className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-bold text-xs sm:text-sm md:text-base transition-all duration-300 transform hover:scale-105 w-full sm:w-auto ${
              isPrevMonthValid ? 'bg-violet-600 text-white hover:bg-violet-800 shadow-lg animate-pulse' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            aria-label={`Go to ${getMonthName(prevMonth)} ${prevYear}`}
          >
            {isPrevMonthValid ? `← ${getMonthName(prevMonth)} ${prevYear}` : '← Previous'}
          </button>
          {/* Month Dropdown */}
          <div className="flex flex-col gap-1 w-full sm:min-w-[140px] sm:w-auto">
            <label htmlFor="dd_month" className="text-xs sm:text-sm font-medium text-white">Month</label>
          <select 
            id="dd_month" 
            name="dd_month" 
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
              className="rounded-lg border bg-black px-3 sm:px-4 py-2 sm:py-3 text-white font-bold text-sm sm:text-base shadow outline-none focus:ring-2 focus:ring-violet-400 w-full"
          >
            {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1} className="text-gray-800">{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
          {/* Year Dropdown */}
          <div className="flex flex-col gap-1 w-full sm:min-w-[120px] sm:w-auto">
            <label htmlFor="dd_year" className="text-xs sm:text-sm font-medium text-white">Year</label>
          <select 
            id="dd_year" 
            name="dd_year" 
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
              className="rounded-lg border bg-black px-3 sm:px-4 py-2 sm:py-3 text-white font-bold text-sm sm:text-base shadow outline-none focus:ring-2 focus:ring-violet-400 w-full"
          >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={2015 + i} value={2015 + i} className="text-gray-800">{2015 + i}</option>
            ))}
          </select>
        </div>
          <button type="submit" className="rounded-lg bg-gradient-to-r from-pink-500 to-yellow-400 px-4 sm:px-6 py-2 sm:py-3 font-extrabold text-white text-xs sm:text-sm md:text-base shadow hover:from-yellow-500 hover:to-pink-400 transition-all w-full sm:w-auto">Show Result</button>
          <button
            onClick={handleNextMonth}
            type="button"
            disabled={!isNextMonthValid}
            className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-bold text-xs sm:text-sm md:text-base transition-all duration-300 transform hover:scale-105 w-full sm:w-auto ${
              isNextMonthValid ? 'bg-violet-600 text-white hover:bg-violet-800 shadow-lg animate-pulse' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            aria-label={`Go to ${getMonthName(nextMonth)} ${nextYear}`}
          >
            {isNextMonthValid ? `${getMonthName(nextMonth)} ${nextYear} →` : 'Next →'}
        </button>
      </form>
      </div>
    </section>
  );
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
