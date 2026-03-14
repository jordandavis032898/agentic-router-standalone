import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Newspaper, RefreshCw, AlertCircle, Loader2, Briefcase } from "lucide-react"
import { useTheme } from "../../ThemeContext"
import { timeAgo, formatUnixTime } from "../../utils/timeUtils"

const CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Markets", value: "all" },
  { label: "AI", value: "ai" },
  { label: "M&A", value: "ma" },
  { label: "Economy", value: "economy" },
  { label: "SEC", value: "sec" },
  { label: "Earnings", value: "earnings" },
  { label: "My Companies", value: "my_companies" },
]

const BADGE_COLORS = {
  all: "#3b82f6",
  ai: "#8b5cf6",
  ma: "#10b981",
  economy: "#f59e0b",
  sec: "#ef4444",
  earnings: "#06b6d4",
}

const BADGE_LABELS = {
  all: "MARKETS",
  ai: "AI",
  ma: "M&A",
  economy: "ECONOMY",
  sec: "SEC",
  earnings: "EARNINGS",
}

const ARTICLES_PER_PAGE = 10
const MAX_PAGES = 5
const MAX_ARTICLES = 50
const PULL_THRESHOLD = 60

function getBadgeColor(article) {
  if (article.category && BADGE_COLORS[article.category]) {
    return BADGE_COLORS[article.category]
  }
  return BADGE_COLORS.all
}

function getBadgeLabel(article) {
  if (article.category && BADGE_LABELS[article.category]) {
    return BADGE_LABELS[article.category]
  }
  return "MARKETS"
}

function SkeletonCard({ isDark }) {
  const shimmerBg = isDark
    ? "linear-gradient(90deg, rgba(51,65,85,0.3) 25%, rgba(71,85,105,0.4) 50%, rgba(51,65,85,0.3) 75%)"
    : "linear-gradient(90deg, rgba(203,213,225,0.3) 25%, rgba(226,232,240,0.5) 50%, rgba(203,213,225,0.3) 75%)"

  const blockStyle = (width, height, mb = 0) => ({
    width,
    height,
    borderRadius: "6px",
    background: shimmerBg,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
    marginBottom: mb,
  })

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid var(--border-secondary)",
        background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.8)",
        marginBottom: "10px",
      }}
    >
      <div style={blockStyle("60px", "18px", 10)} />
      <div style={blockStyle("90%", "18px", 8)} />
      <div style={blockStyle("70%", "18px", 12)} />
      <div style={blockStyle("100%", "14px", 6)} />
      <div style={blockStyle("80%", "14px", 12)} />
      <div style={blockStyle("40%", "12px")} />
    </div>
  )
}

function NewsCard({ article, index, isDark }) {
  const badgeColor = getBadgeColor(article)
  const badgeLabel = getBadgeLabel(article)
  const displayTime = article.datetime
    ? formatUnixTime(article.datetime)
    : article.published_at
      ? timeAgo(article.published_at)
      : ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
      onClick={() => {
        if (article.url) {
          window.open(article.url, "_blank", "noopener,noreferrer")
        }
      }}
      style={{
        padding: "14px 16px",
        borderRadius: "12px",
        border: "1px solid var(--border-secondary)",
        background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.8)",
        marginBottom: "10px",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", gap: "12px" }}>
        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category badge */}
          <div
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: badgeColor,
              background: `${badgeColor}20`,
              marginBottom: "8px",
              lineHeight: "18px",
            }}
          >
            {badgeLabel}
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.35,
              marginBottom: "6px",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            {article.headline}
          </div>

          {/* Summary */}
          {article.summary && (
            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.45,
                color: "var(--text-muted)",
                marginBottom: "8px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {article.summary}
            </div>
          )}

          {/* Source + Time */}
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-dim)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {article.source && <span>{article.source}</span>}
            {article.source && displayTime && (
              <span style={{ opacity: 0.5 }}>{"\u00B7"}</span>
            )}
            {displayTime && <span>{displayTime}</span>}
          </div>
        </div>

        {/* Thumbnail */}
        {article.image && (
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "8px",
              overflow: "hidden",
              flexShrink: 0,
              alignSelf: "center",
            }}
          >
            <img
              src={article.image}
              alt=""
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                e.target.style.display = "none"
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function MobileNewsTab({ apiUrl, addToast }) {
  const { isDark } = useTheme()

  const [activeCategory, setActiveCategory] = useState("all")
  const [activeCategoryLabel, setActiveCategoryLabel] = useState("All")
  const [articles, setArticles] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const scrollContainerRef = useRef(null)
  const sentinelRef = useRef(null)
  const abortControllerRef = useRef(null)
  const touchStartYRef = useRef(0)
  const pullDistanceRef = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const isPullingRef = useRef(false)

  const cancelInflight = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const fetchArticles = useCallback(
    async (category, pageNum, isRefresh = false) => {
      cancelInflight()

      const controller = new AbortController()
      abortControllerRef.current = controller

      if (pageNum === 1 && !isRefresh) {
        setLoading(true)
      }
      if (pageNum > 1) {
        setLoadingMore(true)
      }
      if (isRefresh) {
        setRefreshing(true)
      }
      setError(null)

      try {
        const fetchCategory = category === "my_companies" ? "all" : category
        const url = `${apiUrl}/api/market-news?category=${fetchCategory}&page=${pageNum}`
        // DATA CALL: AUTOMATIC
        // Triggered by: news tab mount + scroll pagination
        const response = await fetch(url, { signal: controller.signal })

        if (!response.ok) {
          throw new Error('Could not load news right now')
        }

        const data = await response.json()

        if (!data || data.status !== "success" || !Array.isArray(data.articles)) {
          if (pageNum === 1) {
            setArticles([])
            setHasMore(false)
            setLoading(false)
            setLoadingMore(false)
            setRefreshing(false)
            return
          }
          throw new Error("Invalid response from news API")
        }

        let newArticles = data.articles

        // Client-side filter for My Companies
        if (category === "my_companies") {
          const savedRaw = localStorage.getItem("recent_companies")
          let tickers = []
          try {
            const parsed = JSON.parse(savedRaw)
            if (Array.isArray(parsed)) {
              tickers = parsed.map((c) => c.ticker).filter(Boolean)
            }
          } catch {
            // ignore parse errors
          }

          if (tickers.length === 0) {
            setArticles([])
            setHasMore(false)
            setLoading(false)
            setLoadingMore(false)
            setRefreshing(false)
            return
          }

          newArticles = newArticles.filter((a) => {
            const text = `${a.headline || ""} ${a.summary || ""}`.toLowerCase()
            return tickers.some((t) => text.includes(t.toLowerCase()))
          })
        }

        if (isRefresh || pageNum === 1) {
          setArticles(newArticles)
        } else {
          setArticles((prev) => {
            const combined = [...prev, ...newArticles]
            return combined.slice(0, MAX_ARTICLES)
          })
        }

        const totalFetched =
          isRefresh || pageNum === 1
            ? newArticles.length
            : articles.length + newArticles.length

        if (
          newArticles.length < ARTICLES_PER_PAGE ||
          totalFetched >= MAX_ARTICLES ||
          pageNum >= MAX_PAGES
        ) {
          setHasMore(false)
        } else {
          setHasMore(true)
        }
      } catch (err) {
        if (err.name === "AbortError") return

        setError(err.message || "News temporarily unavailable")
        if (addToast) {
          addToast("News temporarily unavailable", "warning")
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setLoadingMore(false)
          setRefreshing(false)
        }
      }
    },
    [apiUrl, addToast, cancelInflight, articles.length]
  )

  // Initial load and category change
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    setArticles([])
    fetchArticles(activeCategory, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, apiUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelInflight()
    }
  }, [cancelInflight])

  // Load more when page changes (beyond page 1)
  useEffect(() => {
    if (page > 1) {
      fetchArticles(activeCategory, page)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loading && !loadingMore && hasMore) {
          setPage((prev) => prev + 1)
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [loading, loadingMore, hasMore])

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e) => {
    const container = scrollContainerRef.current
    if (!container || container.scrollTop > 0) return

    touchStartYRef.current = e.touches[0].clientY
    isPullingRef.current = true
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isPullingRef.current) return

    const container = scrollContainerRef.current
    if (!container || container.scrollTop > 0) {
      isPullingRef.current = false
      setPullDistance(0)
      pullDistanceRef.current = 0
      return
    }

    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartYRef.current

    if (diff > 0) {
      const dampened = Math.min(diff * 0.4, 100)
      pullDistanceRef.current = dampened
      setPullDistance(dampened)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return
    isPullingRef.current = false

    if (pullDistanceRef.current >= PULL_THRESHOLD && !refreshing) {
      setPage(1)
      setHasMore(true)
      fetchArticles(activeCategory, 1, true)
    }

    pullDistanceRef.current = 0
    setPullDistance(0)
  }, [refreshing, activeCategory, fetchArticles])

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat.value)
    setActiveCategoryLabel(cat.label)
  }

  const handleRetry = () => {
    setError(null)
    setPage(1)
    setHasMore(true)
    fetchArticles(activeCategory, 1)
  }

  // Check if "My Companies" has no saved companies
  const isMyCompaniesEmpty = activeCategory === "my_companies" && (() => {
    try {
      const saved = JSON.parse(localStorage.getItem("recent_companies"))
      return !Array.isArray(saved) || saved.length === 0
    } catch {
      return true
    }
  })()

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Shimmer keyframe injection */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Category Filter Chips */}
      <div
        style={{
          flexShrink: 0,
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "12px 16px",
          display: "flex",
          gap: "8px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          borderBottom: "1px solid var(--border-secondary)",
        }}
      >
        <style>{`
          .mobile-news-chips::-webkit-scrollbar { display: none; }
        `}</style>
        {CATEGORIES.map((cat) => {
          const isActive =
            activeCategory === cat.value && activeCategoryLabel === cat.label
          return (
            <button
              key={cat.label}
              onClick={() => handleCategoryChange(cat)}
              className="mobile-news-chips"
              style={{
                flexShrink: 0,
                minHeight: "44px",
                padding: "0 16px",
                borderRadius: "22px",
                border: isActive
                  ? "1px solid rgba(245, 158, 11, 0.4)"
                  : "1px solid var(--border-secondary)",
                background: isActive ? "rgba(245, 158, 11, 0.2)" : "transparent",
                color: isActive ? "#f59e0b" : "var(--text-muted)",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
            >
              {cat.label === "My Companies" && (
                <Briefcase style={{ width: 14, height: 14 }} />
              )}
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: refreshing ? "40px" : `${pullDistance}px`,
            overflow: "hidden",
            flexShrink: 0,
            transition: refreshing ? "height 0.2s" : "none",
          }}
        >
          <RefreshCw
            style={{
              width: 20,
              height: 20,
              color: "#f59e0b",
              opacity: refreshing
                ? 1
                : Math.min(pullDistance / PULL_THRESHOLD, 1),
              transform: refreshing
                ? undefined
                : `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`,
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
              transition: "opacity 0.15s",
            }}
          />
        </div>
      )}

      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "12px 16px",
        }}
      >
        {/* Loading skeleton state */}
        {loading && articles.length === 0 && !error && (
          <div>
            <SkeletonCard isDark={isDark} />
            <SkeletonCard isDark={isDark} />
            <SkeletonCard isDark={isDark} />
            <SkeletonCard isDark={isDark} />
          </div>
        )}

        {/* Error state */}
        {error && articles.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 20px",
              textAlign: "center",
            }}
          >
            <AlertCircle
              style={{
                width: 40,
                height: 40,
                color: "#ef4444",
                marginBottom: "16px",
              }}
            />
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              Unable to load news
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                marginBottom: "20px",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
            <button
              onClick={handleRetry}
              style={{
                minHeight: "44px",
                padding: "0 24px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* My Companies empty state */}
        {!loading && !error && isMyCompaniesEmpty && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 20px",
              textAlign: "center",
            }}
          >
            <Briefcase
              style={{
                width: 40,
                height: 40,
                color: "var(--text-dim)",
                marginBottom: "16px",
              }}
            />
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              No saved companies yet
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              Search for a company first.
            </div>
          </div>
        )}

        {/* Empty state (no articles and not loading, not my_companies) */}
        {!loading &&
          !error &&
          articles.length === 0 &&
          !isMyCompaniesEmpty &&
          activeCategory !== "my_companies" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 20px",
                textAlign: "center",
              }}
            >
              <Newspaper
                style={{
                  width: 40,
                  height: 40,
                  color: "var(--text-dim)",
                  marginBottom: "16px",
                }}
              />
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                News feed coming soon
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                Check back later for the latest updates.
              </div>
            </div>
          )}

        {/* My Companies filtered empty (has saved companies but no matching articles) */}
        {!loading &&
          !error &&
          articles.length === 0 &&
          activeCategory === "my_companies" &&
          !isMyCompaniesEmpty && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 20px",
                textAlign: "center",
              }}
            >
              <Newspaper
                style={{
                  width: 40,
                  height: 40,
                  color: "var(--text-dim)",
                  marginBottom: "16px",
                }}
              />
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                No matching news found
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                No recent articles mention your saved companies.
              </div>
            </div>
          )}

        {/* Article cards */}
        {articles.map((article, index) => (
          <NewsCard
            key={`${article.url || ""}-${article.headline || ""}-${index}`}
            article={article}
            index={index}
            isDark={isDark}
          />
        ))}

        {/* Loading more indicator */}
        {loadingMore && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "20px 0",
            }}
          >
            <Loader2
              style={{
                width: 18,
                height: 18,
                color: "#f59e0b",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
              }}
            >
              Loading more...
            </span>
          </div>
        )}

        {/* All caught up message */}
        {!loading && !loadingMore && !hasMore && articles.length > 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0 8px",
              fontSize: "14px",
              color: "var(--text-dim)",
            }}
          >
            You are all caught up
          </div>
        )}

        {/* Sentinel for IntersectionObserver */}
        <div
          ref={sentinelRef}
          style={{ height: "1px", width: "100%" }}
          aria-hidden="true"
        />

        {/* Bottom padding for safe area */}
        <div style={{ height: "16px" }} />
      </div>
    </div>
  )
}
