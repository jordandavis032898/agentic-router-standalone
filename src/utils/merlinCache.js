/**
 * Merlin Response Cache
 * In-memory cache for AI query responses — 30-min TTL, max 50 entries.
 */

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const CACHE_MAX = 50

// Company name → ticker normalization for cache key dedup
const COMPANY_NORMALIZE = {
  apple: 'aapl', google: 'googl', alphabet: 'googl', amazon: 'amzn',
  tesla: 'tsla', microsoft: 'msft', netflix: 'nflx', nike: 'nke',
  disney: 'dis', nvidia: 'nvda', meta: 'meta', facebook: 'meta',
  starbucks: 'sbux', walmart: 'wmt', costco: 'cost', pepsi: 'pep',
  jpmorgan: 'jpm', 'jp morgan': 'jpm', chase: 'jpm', visa: 'v',
  paypal: 'pypl', 'goldman sachs': 'gs', goldman: 'gs',
  uber: 'uber', airbnb: 'abnb', ford: 'f', delta: 'dal',
  exxon: 'xom', intel: 'intc', amd: 'amd', adobe: 'adbe',
  salesforce: 'crm', snap: 'snap', coinbase: 'coin',
}

export function generateCacheKey(message) {
  let key = message.toLowerCase().trim().replace(/\s+/g, ' ')
  // Normalize company names to tickers
  for (const [name, ticker] of Object.entries(COMPANY_NORMALIZE)) {
    key = key.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ticker)
  }
  return `merlin_${key}`
}

export function getCached(message) {
  const key = generateCacheKey(message)
  const cache = window._merlinCache || {}
  const entry = cache[key]
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) {
    return entry.response
  }
  // Expired — clean up
  if (entry) delete cache[key]
  return null
}

export function setCache(message, response) {
  if (!window._merlinCache) window._merlinCache = {}
  const cache = window._merlinCache
  const keys = Object.keys(cache)
  // Evict oldest if at max
  if (keys.length >= CACHE_MAX) {
    let oldestKey = keys[0]
    let oldestTime = cache[keys[0]].timestamp
    for (const k of keys) {
      if (cache[k].timestamp < oldestTime) {
        oldestKey = k
        oldestTime = cache[k].timestamp
      }
    }
    delete cache[oldestKey]
  }
  cache[generateCacheKey(message)] = { response, timestamp: Date.now() }
}
