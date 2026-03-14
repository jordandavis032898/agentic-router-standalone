import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle,
  BarChart3,
  ClipboardCheck,
  Building2,
  Download,
  Search,
  Wand2,
  ChevronRight,
  FileText,
  ArrowRight,
  Zap,
  MessageSquare,
} from 'lucide-react'
import { analyzeFinancialData, formatInsightsAsMessage, getSeverityStyle, SEVERITY } from '../utils/insightEngine'
import { getCached, setCache } from '../utils/merlinCache'

// ─── Company name → ticker mapping ───────────────────────────────────────────
const COMPANY_MAP = {
  'apple': 'AAPL', 'google': 'GOOGL', 'alphabet': 'GOOGL', 'amazon': 'AMZN',
  'tesla': 'TSLA', 'microsoft': 'MSFT', 'netflix': 'NFLX', 'nike': 'NKE',
  'disney': 'DIS', 'nvidia': 'NVDA', 'meta': 'META', 'facebook': 'META',
  'mcdonalds': 'MCD', "mcdonald's": 'MCD', 'starbucks': 'SBUX',
  'coca-cola': 'KO', 'coca cola': 'KO', 'coke': 'KO', 'pepsi': 'PEP',
  'pepsico': 'PEP', 'chipotle': 'CMG', 'roblox': 'RBLX',
  'electronic arts': 'EA', 'spotify': 'SPOT', 'warner bros': 'WBD',
  'take-two': 'TTWO', 'walmart': 'WMT', 'target': 'TGT', 'costco': 'COST',
  'lululemon': 'LULU', 'ralph lauren': 'RL', 'johnson & johnson': 'JNJ',
  'j&j': 'JNJ', 'pfizer': 'PFE', 'unitedhealth': 'UNH',
  'jpmorgan': 'JPM', 'jp morgan': 'JPM', 'chase': 'JPM', 'visa': 'V',
  'paypal': 'PYPL', 'goldman sachs': 'GS', 'goldman': 'GS',
  'uber': 'UBER', 'airbnb': 'ABNB', 'ford': 'F', 'delta': 'DAL',
  'exxon': 'XOM', 'exxonmobil': 'XOM', 'nextera': 'NEE',
  'amd': 'AMD', 'intel': 'INTC', 'snap': 'SNAP', 'snapchat': 'SNAP',
  'twitter': 'TWTR', 'salesforce': 'CRM', 'adobe': 'ADBE',
  'zoom': 'ZM', 'shopify': 'SHOP', 'square': 'SQ', 'block': 'SQ',
  'palantir': 'PLTR', 'snowflake': 'SNOW', 'coinbase': 'COIN',
  'robinhood': 'HOOD', 'berkshire': 'BRK-B', 'warren buffett': 'BRK-B',
}

// ─── Tab name mapping ────────────────────────────────────────────────────────
const TAB_MAP = {
  'chat': 'chat', 'documents': 'documents', 'docs': 'documents',
  'extract': 'extract', 'extraction': 'extract', 'tables': 'extract',
  'edgar': 'edgar', 'sec': 'edgar', 'filings': 'edgar', 'sec filings': 'edgar',
  'charts': 'charts', 'chart': 'charts', 'visualize': 'charts', 'graphs': 'charts',
  'report card': 'reportcard', 'reportcard': 'reportcard', 'qa': 'reportcard',
  'quality': 'reportcard', 'report': 'reportcard', 'grade': 'reportcard',
  'income': 'edgar', 'income statement': 'edgar', 'balance sheet': 'edgar',
  'cash flow': 'edgar', 'comps': 'edgar', 'comparables': 'edgar',
}

const TAB_LABELS = {
  chat: 'Chat', extract: 'Extract', edgar: 'EDGAR',
  charts: 'Charts', reportcard: 'Report Card', documents: 'Documents',
}

// ─── Resolve a company name or ticker ────────────────────────────────────────
function resolveTicker(input) {
  if (!input) return null
  const clean = input.trim().toUpperCase()
  // Already a ticker (1-5 uppercase letters)?
  if (/^[A-Z]{1,5}(-[A-Z])?$/.test(clean)) return clean
  // Check name map
  const lower = input.trim().toLowerCase()
  return COMPANY_MAP[lower] || null
}

// ─── Parse user intent ───────────────────────────────────────────────────────
function parseCommand(text) {
  const lower = text.toLowerCase().trim()

  // Slash commands
  if (lower.startsWith('/')) {
    const parts = lower.slice(1).split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)

    if (cmd === 'fetch' || cmd === 'get') {
      const ticker = resolveTicker(args[0])
      return ticker ? { type: 'fetch', ticker } : null
    }
    if (cmd === 'comps') {
      const ticker = resolveTicker(args[0])
      return ticker ? { type: 'comps', ticker } : null
    }
    if (cmd === 'compare') {
      const tickers = args.map(a => resolveTicker(a)).filter(Boolean)
      return tickers.length >= 2 ? { type: 'compare', tickers } : null
    }
    if (cmd === 'qa' || cmd === 'reportcard') {
      return { type: 'qa' }
    }
    if (cmd === 'export') {
      return { type: 'export' }
    }
    if (cmd === 'help') {
      return { type: 'help' }
    }
    return null
  }

  // DCF / LBO detection
  if (/\b(dcf|discounted cash flow)\b/i.test(lower)) {
    return { type: 'coming_soon', feature: 'DCF' }
  }
  if (/\b(lbo|leveraged buyout)\b/i.test(lower)) {
    return { type: 'coming_soon', feature: 'LBO' }
  }

  // Navigation: "take me to ...", "go to ...", "show me the ...", "open ..."
  const navMatch = lower.match(/(?:take me to|go to|show me|open|switch to|navigate to)\s+(?:the\s+)?(.+)/i)
  if (navMatch) {
    const target = navMatch[1].replace(/\s*tab\s*$/, '').trim()
    const tab = TAB_MAP[target]
    if (tab) return { type: 'navigate', tab }
  }

  // Fetch: "pull up ...", "fetch ...", "get me ...", "look up ...", "load ..."
  const fetchMatch = lower.match(/(?:pull up|fetch|get me|look up|load|get|grab)\s+(.+?)(?:\s+data|\s+10-[kq]|\s+for\s+(\d+)\s+years?)?$/i)
  if (fetchMatch) {
    const subject = fetchMatch[1].replace(/[''`'s]+$/, '').replace(/\bthe\b/g, '').trim()
    const ticker = resolveTicker(subject)
    if (ticker) return { type: 'fetch', ticker }
  }

  // COMPS: "run comps on ..."
  const compsMatch = lower.match(/(?:run\s+)?comps?\s+(?:on|for)\s+(.+)/i)
  if (compsMatch) {
    const ticker = resolveTicker(compsMatch[1].trim())
    if (ticker) return { type: 'comps', ticker }
  }

  // Compare: "compare X vs Y", "compare X and Y"
  const compareMatch = lower.match(/compare\s+(.+)/i)
  if (compareMatch) {
    const parts = compareMatch[1].split(/\s+(?:vs\.?|versus|and|,|&)\s+/i).map(s => s.trim())
    const tickers = parts.map(p => resolveTicker(p)).filter(Boolean)
    if (tickers.length >= 2) return { type: 'compare', tickers }
  }

  // Analyze: "analyze", "run analysis", "health check", "insights"
  const analyzeMatch = lower.match(/(?:analyze|analysis|health\s*check|run\s+insights?|show\s+insights?|what.*insights?)\s*(?:on|for)?\s*(.*)?/i)
  if (analyzeMatch && /\b(?:analyze|analysis|health.check|insights?)\b/i.test(lower)) {
    const ticker = analyzeMatch[1] ? resolveTicker(analyzeMatch[1].trim()) : null
    return { type: 'analyze', ticker }
  }

  // QA: "run qa", "check quality", "run report card"
  if (/\b(?:run\s+qa|qa\s+check|report\s*card|quality\s+check|check\s+quality|run\s+report)\b/i.test(lower)) {
    return { type: 'qa' }
  }

  // Build model: "build a model on ..."
  const modelMatch = lower.match(/(?:build|create|make)\s+(?:a\s+)?(?:model|financial model)\s+(?:on|for)\s+(.+)/i)
  if (modelMatch) {
    const ticker = resolveTicker(modelMatch[1].trim())
    if (ticker) return { type: 'fetch', ticker }
  }

  // Download / export
  if (/\b(?:download|export)\b/i.test(lower)) {
    return { type: 'export' }
  }

  // No command detected - treat as general chat
  return null
}

// ─── Browser Notification Helper ─────────────────────────────────────────────
function sendBrowserNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/icon-192x192.png' })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon-192x192.png' })
      }
    })
  }
}

// ─── Widget States ───────────────────────────────────────────────────────────
const WIDGET_STATES = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  INSIGHTS: 'insights',
  ALL_CLEAR: 'all_clear',
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function MagicianWidget({
  activeTab,
  setActiveTab,
  edgarData,
  apiUrl,
  addToast,
  userId,
  documents,
  selectedDocument,
  onFetchEdgar,
  merlinOffline = false,
  setMerlinOffline,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [widgetState, setWidgetState] = useState(WIDGET_STATES.IDLE)
  const [insightCount, setInsightCount] = useState(0)
  const [currentInsights, setCurrentInsights] = useState(null) // { insights, healthScore }
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [fallbackSearch, setFallbackSearch] = useState('')
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  // Track mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Restore chat history from localStorage or show welcome
  useEffect(() => {
    const saved = localStorage.getItem('magician_chat_history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      } catch { /* ignore */ }
    }
    setMessages([{
      role: 'assistant',
      content: getWelcomeMessage(),
      suggestions: getContextChips(),
    }])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      // Only save last 50 messages to avoid storage bloat
      const toSave = messages.slice(-50)
      localStorage.setItem('magician_chat_history', JSON.stringify(toSave))
    }
  }, [messages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Run insight engine when edgar data changes
  useEffect(() => {
    if (edgarData?.results) {
      setWidgetState(WIDGET_STATES.ANALYZING)
      // Run analysis asynchronously
      setTimeout(() => {
        const analysis = analyzeFinancialData(edgarData.results)
        setCurrentInsights(analysis)
        const count = analysis.insights.length
        if (count > 0) {
          setWidgetState(WIDGET_STATES.INSIGHTS)
          setInsightCount(count)
          // Proactive toast notification
          addToast(
            `\u{1FA84} I found ${count} insight${count !== 1 ? 's' : ''} about ${edgarData.ticker}. Click the sparkle to learn more!`,
            'info'
          )
        } else {
          setWidgetState(WIDGET_STATES.ALL_CLEAR)
          setInsightCount(0)
          addToast(`\u2705 ${edgarData.ticker} data looks healthy \u2014 no anomalies detected.`, 'success')
        }
      }, 500) // Small delay for analyzing animation
    }
  }, [edgarData]) // eslint-disable-line react-hooks/exhaustive-deps

  function getWelcomeMessage() {
    let msg = `Hey! I'm the Magician \u{1FA84} \u2014 your financial analysis co-pilot.\n\nI can **fetch SEC data**, **build models**, **run COMPS**, **compare companies**, and **spot anomalies**.\n\n`
    if (edgarData?.ticker) {
      msg += `I see you have **${edgarData.ticker}** data loaded. Ask me anything about it!\n\n`
    }
    msg += `Try saying:\n- "Pull up Nvidia"\n- "Run COMPS on Apple"\n- "Compare Tesla vs Google"\n- "Take me to Charts"\n\nOr just ask me anything about your data.`
    return msg
  }

  function getContextChips() {
    if (edgarData?.ticker) {
      return [
        { label: 'Run QA', icon: 'check' },
        { label: 'View Charts', icon: 'chart' },
        { label: `Analyze ${edgarData.ticker}`, icon: 'search' },
        { label: 'Compare Companies', icon: 'compare' },
      ]
    }
    return [
      { label: 'Fetch Data', icon: 'fetch' },
      { label: 'Upload PDF', icon: 'upload' },
      { label: 'Browse EDGAR', icon: 'edgar' },
      { label: 'Help', icon: 'help' },
    ]
  }

  // (insight counting now handled by the insight engine useEffect above)

  // ─── Fetch EDGAR data from within the chatbot ──────────────────────────────
  const fetchEdgarFromChat = useCallback(async (ticker) => {
    setWidgetState(WIDGET_STATES.ANALYZING)
    try {
      // EDGAR DATA CALL: USER-TRIGGERED
      // Triggered by: user types a fetch/pull command in Magician chat
      const response = await fetch(`${apiUrl}/edgar/${ticker}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        onFetchEdgar(ticker, data.data)
        addToast(`SEC filings retrieved for ${ticker}!`, 'success')
        sendBrowserNotification(`${ticker} Model Ready`, `SEC filings for ${ticker} have been loaded. Click to view.`)
        return data.data
      } else {
        throw new Error(data.detail?.message || data.error || 'Fetch failed')
      }
    } catch (err) {
      addToast(`Having trouble reaching ${ticker} data`, 'warning')
      setWidgetState(WIDGET_STATES.IDLE)
      throw err
    }
  }, [apiUrl, onFetchEdgar, addToast])

  // ─── Generate follow-up suggestions based on context ───────────────────────
  function getFollowUps(commandType) {
    if (commandType === 'fetch' && edgarData?.ticker) {
      return [
        { label: 'View Charts', icon: 'chart' },
        { label: 'Run QA Check', icon: 'check' },
        { label: `What's ${edgarData.ticker}'s revenue trend?`, icon: 'search' },
      ]
    }
    if (commandType === 'navigate') {
      return [
        { label: 'Fetch new company', icon: 'fetch' },
        { label: 'Compare companies', icon: 'compare' },
      ]
    }
    if (commandType === 'qa') {
      return [
        { label: 'View Charts', icon: 'chart' },
        { label: 'Fetch another company', icon: 'fetch' },
      ]
    }
    return edgarData?.ticker
      ? [
          { label: `Analyze ${edgarData.ticker}`, icon: 'search' },
          { label: 'Compare companies', icon: 'compare' },
        ]
      : [
          { label: 'Fetch a company', icon: 'fetch' },
          { label: 'Help', icon: 'help' },
        ]
  }

  // ─── Generate a financial summary from EDGAR data ──────────────────────────
  function generateFinancialSummary(ticker, results) {
    if (!results) return `I don't have any data loaded for ${ticker} yet.`

    let summary = `Here's a quick snapshot of **${ticker}**:\n\n`

    // Try to extract key metrics from income statement
    const incomeStmt = results.income_statement
    if (incomeStmt && typeof incomeStmt === 'object') {
      const years = Object.keys(incomeStmt).filter(k => /^\d{4}$/.test(k)).sort().reverse()
      if (years.length > 0) {
        summary += `**Income Statement** (${years.length} years available)\n`
        // Look for revenue row
        const rows = Object.entries(incomeStmt).filter(([k]) => !/^\d{4}$/.test(k))
        if (rows.length > 0) {
          summary += `- ${rows.length} line items tracked\n`
        }
        summary += '\n'
      }
    }

    const balanceSheet = results.balance_sheet
    if (balanceSheet && typeof balanceSheet === 'object') {
      summary += `**Balance Sheet** data available\n\n`
    }

    const cashFlow = results.cash_flow
    if (cashFlow && typeof cashFlow === 'object') {
      summary += `**Cash Flow Statement** data available\n\n`
    }

    summary += `Want me to dig deeper? I can analyze margins, trends, or compare to competitors.`
    return summary
  }

  // ─── Generate comparison message ────────────────────────────────────────────
  function generateComparisonMessage(results) {
    if (results.length < 2) return 'Need at least 2 companies to compare.'

    let msg = `## Company Comparison: ${results.map(r => r.ticker).join(' vs ')}\n\n`

    // Analyze each company
    const analyses = results.map(r => ({
      ticker: r.ticker,
      analysis: analyzeFinancialData(r.data),
    }))

    // Summary table
    msg += `| Metric | ${results.map(r => `**${r.ticker}**`).join(' | ')} |\n`
    msg += `|--------|${results.map(() => '--------').join('|')}|\n`

    // Health scores
    msg += `| Health Score | ${analyses.map(a =>
      a.analysis.healthScore ? `${a.analysis.healthScore.score}/100 (${a.analysis.healthScore.grade})` : 'N/A'
    ).join(' | ')} |\n`

    // Insight counts by severity
    msg += `| Red Flags | ${analyses.map(a =>
      a.analysis.insights.filter(i => i.severity === 'critical').length
    ).join(' | ')} |\n`

    msg += `| Warnings | ${analyses.map(a =>
      a.analysis.insights.filter(i => i.severity === 'warning').length
    ).join(' | ')} |\n`

    msg += `| Positive | ${analyses.map(a =>
      a.analysis.insights.filter(i => i.severity === 'positive').length
    ).join(' | ')} |\n`

    msg += '\n'

    // Narrative summary
    const scores = analyses.map(a => ({
      ticker: a.ticker,
      score: a.analysis.healthScore?.score || 0,
    })).sort((a, b) => b.score - a.score)

    if (scores.length >= 2) {
      const best = scores[0]
      const worst = scores[scores.length - 1]
      if (best.score !== worst.score) {
        msg += `**${best.ticker}** has the stronger financial profile with a health score of ${best.score}, `
        msg += `while **${worst.ticker}** scores ${worst.score}. `
      } else {
        msg += `Both companies have similar health profiles. `
      }
    }

    // Key differences
    const allInsights = analyses.flatMap(a =>
      a.analysis.insights.map(i => ({ ...i, ticker: a.ticker }))
    )
    const critical = allInsights.filter(i => i.severity === 'critical')
    if (critical.length > 0) {
      msg += `\n\n### Key Concerns\n`
      for (const i of critical) {
        msg += `- **${i.ticker}**: ${i.title}\n`
      }
    }

    msg += '\n\nWant me to dig deeper into any specific metric?'
    return msg
  }

  // ─── Handle message submission ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsLoading(true)

    try {
      const command = parseCommand(text)

      if (command) {
        await handleCommand(command, text)
      } else {
        // General question — route to backend if docs loaded, else answer with context
        await handleGeneralQuestion(text)
      }
    } catch (err) {
      // First failure — auto-retry once
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '\u{1FA84} Let me try that again...',
      }])
      try {
        await new Promise(r => setTimeout(r, 3000))
        const command2 = parseCommand(text)
        if (command2) {
          await handleCommand(command2, text)
        } else {
          await handleGeneralQuestion(text)
        }
      } catch {
        // Retry also failed — enter fallback mode
        if (setMerlinOffline) setMerlinOffline(true)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '\u{1FA84} Merlin is recharging. You can search for any company below!',
          suggestions: [
            { label: 'Browse Companies', icon: 'edgar' },
          ],
        }])
        addToast('Merlin is recharging...', 'warning')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Handle parsed commands ────────────────────────────────────────────────
  async function handleCommand(command, originalText) {
    switch (command.type) {
      case 'navigate': {
        setActiveTab(command.tab)
        const tabLabel = TAB_LABELS[command.tab] || command.tab
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Taking you to **${tabLabel}** now! \u{1FA84}`,
          suggestions: getFollowUps('navigate'),
        }])
        break
      }

      case 'fetch': {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Fetching SEC filings for **${command.ticker}**... This may take a moment. \u{1F50D}`,
        }])
        try {
          const data = await fetchEdgarFromChat(command.ticker)
          setActiveTab('edgar')
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**${command.ticker}** data is ready! \u2728\n\n${generateFinancialSummary(command.ticker, data)}\n\nI've switched you to the EDGAR tab. Want me to run a deeper analysis?`,
            suggestions: [
              { label: 'View Charts', icon: 'chart' },
              { label: 'Run QA Check', icon: 'check' },
              { label: `What are ${command.ticker}'s key metrics?`, icon: 'search' },
              { label: 'Compare to another company', icon: 'compare' },
            ],
          }])
        } catch {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I had trouble fetching data for **${command.ticker}**. Make sure it's a valid US-listed ticker. Want to try another company?`,
            suggestions: [
              { label: 'Browse Companies', icon: 'edgar' },
              { label: 'Try another ticker', icon: 'fetch' },
            ],
          }])
        }
        break
      }

      case 'comps': {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Running COMPS on **${command.ticker}**... Let me fetch the data first. \u{1FA84}`,
        }])
        try {
          if (!edgarData || edgarData.ticker !== command.ticker) {
            await fetchEdgarFromChat(command.ticker)
          }
          setActiveTab('charts')
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `COMPS analysis for **${command.ticker}** is ready! I've opened the Charts view so you can see the financial visualizations.\n\nWant me to compare this to a competitor?`,
            suggestions: [
              { label: 'Compare companies', icon: 'compare' },
              { label: 'Run QA', icon: 'check' },
              { label: 'Fetch another company', icon: 'fetch' },
            ],
          }])
        } catch {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I couldn't fetch data for **${command.ticker}**. Try a different ticker?`,
          }])
        }
        break
      }

      case 'compare': {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Comparing **${command.tickers.join(' vs ')}**! Let me fetch the data... \u{1FA84}`,
        }])
        try {
          // Fetch all companies in sequence
          const results = []
          for (const t of command.tickers) {
            const data = await fetchEdgarFromChat(t)
            results.push({ ticker: t, data })
          }
          // Generate comparison narrative
          const compMsg = generateComparisonMessage(results)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: compMsg,
            suggestions: [
              { label: 'Analyze deeper', icon: 'search' },
              { label: 'View Charts', icon: 'chart' },
              ...command.tickers.map(t => ({ label: `Analyze ${t}`, icon: 'search' })),
            ],
          }])
        } catch {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I had trouble fetching some of the data. Would you like to try individual companies instead?`,
            suggestions: command.tickers.map(t => ({ label: `Fetch ${t}`, icon: 'fetch' })),
          }])
        }
        break
      }

      case 'analyze': {
        const ticker = command.ticker || edgarData?.ticker
        if (!ticker) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I need data to analyze! Tell me which company you'd like me to look at \u2014 for example, "Analyze Apple" or "Fetch Nvidia" first.`,
            suggestions: [
              { label: 'Fetch Apple', icon: 'fetch' },
              { label: 'Fetch Nvidia', icon: 'fetch' },
              { label: 'Browse Companies', icon: 'edgar' },
            ],
          }])
          break
        }

        // Fetch if needed
        if (!edgarData || edgarData.ticker !== ticker) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Let me fetch **${ticker}** data first, then I'll run a full analysis...`,
          }])
          try {
            const data = await fetchEdgarFromChat(ticker)
            const analysis = analyzeFinancialData(data)
            setCurrentInsights(analysis)
            const msg = formatInsightsAsMessage(analysis.insights, ticker, analysis.healthScore)
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: msg,
              suggestions: [
                { label: 'View Charts', icon: 'chart' },
                { label: 'Run QA Check', icon: 'check' },
                { label: 'Compare to competitors', icon: 'compare' },
              ],
            }])
          } catch {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Couldn't fetch data for **${ticker}**. Try a different ticker?`,
            }])
          }
        } else {
          // Already have data, use current insights
          const analysis = currentInsights || analyzeFinancialData(edgarData.results)
          const msg = formatInsightsAsMessage(analysis.insights, ticker, analysis.healthScore)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: msg,
            suggestions: [
              { label: 'View Charts', icon: 'chart' },
              { label: 'Run QA Check', icon: 'check' },
              { label: 'Compare to competitors', icon: 'compare' },
            ],
          }])
        }
        break
      }

      case 'qa': {
        if (!edgarData?.ticker) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `I need some data to run a QA check on! Fetch a company first, then I'll analyze the data quality.\n\nWhat company would you like me to fetch?`,
            suggestions: [
              { label: 'Fetch Apple', icon: 'fetch' },
              { label: 'Fetch Nvidia', icon: 'fetch' },
              { label: 'Browse Companies', icon: 'edgar' },
            ],
          }])
        } else {
          setActiveTab('reportcard')
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Running QA check on **${edgarData.ticker}**! I've opened the Report Card view. \u{1F4CB}\n\nThe report card grades data quality, completeness, and consistency. Want me to explain any findings?`,
            suggestions: [
              { label: 'View Charts', icon: 'chart' },
              { label: 'Fetch another company', icon: 'fetch' },
            ],
          }])
        }
        break
      }

      case 'export': {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Export functionality is available from individual tabs. Go to **Charts** or **Report Card** and use the download options there.\n\nWant me to take you to one of those views?`,
          suggestions: [
            { label: 'Go to Charts', icon: 'chart' },
            { label: 'Go to Report Card', icon: 'check' },
          ],
        }])
        break
      }

      case 'coming_soon': {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**${command.feature} models are coming soon!** \u{1F680}\n\nIn the meantime, I can:\n- **Run COMPS** on any company\n- **Build a financial model** with SEC data\n- **Compare companies** side by side\n\nWhat would you like to do instead?`,
          suggestions: [
            { label: 'Run COMPS', icon: 'chart' },
            { label: 'Fetch a company', icon: 'fetch' },
            { label: 'Compare companies', icon: 'compare' },
          ],
        }])
        break
      }

      case 'help': {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: getHelpMessage(),
          suggestions: getContextChips(),
        }])
        break
      }

      default:
        await handleGeneralQuestion(originalText)
    }
  }

  // ─── Handle general questions ──────────────────────────────────────────────
  async function handleGeneralQuestion(text) {
    // If we have EDGAR data, provide context-aware answer
    if (edgarData?.ticker) {
      // Check if question is about loaded data
      const lower = text.toLowerCase()
      const isAboutData = /\b(revenue|margin|profit|income|debt|cash|growth|trend|ratio|asset|liability|equity|eps|ebitda|capex)\b/i.test(lower)

      if (isAboutData) {
        // Use real insights if available
        if (currentInsights?.insights?.length > 0) {
          const insightMsg = formatInsightsAsMessage(currentInsights.insights, edgarData.ticker, currentInsights.healthScore)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: insightMsg,
            suggestions: [
              { label: 'View Charts', icon: 'chart' },
              { label: 'Run QA Check', icon: 'check' },
              { label: 'Compare to competitors', icon: 'compare' },
            ],
          }])
        } else {
          const summary = generateFinancialSummary(edgarData.ticker, edgarData.results)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Based on the **${edgarData.ticker}** data I have loaded:\n\n${summary}\n\nFor a deeper analysis with AI-powered insights, try uploading the 10-K PDF to the **Documents** tab and asking questions in the **Chat** tab.`,
            suggestions: [
              { label: 'View Charts', icon: 'chart' },
              { label: 'Upload 10-K PDF', icon: 'upload' },
              { label: 'Compare to competitors', icon: 'compare' },
            ],
          }])
        }
        return
      }
    }

    // Check cache first
    const cached = getCached(text)
    if (cached) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cached,
        isCached: true,
        suggestions: getFollowUps(null),
      }])
      return
    }

    // Try the backend chatbot if documents are loaded
    if (documents.length > 0) {
      try {
        const payload = {
          question: text,
          user_id: userId,
        }
        if (selectedDocument) {
          payload.file_id = selectedDocument
        }

        // MERLIN API CALL: USER-TRIGGERED
        // Triggered by: user types a general question and submits (not a command)
        const response = await fetch(`${apiUrl}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          const answer = data.data?.response || data.data?.answer || 'I processed your request.'
          // Cache the response
          setCache(text, answer)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: answer,
            sources: data.data?.chunks || data.data?.sources,
            suggestions: getFollowUps(null),
          }])
          return
        }
      } catch {
        // Fall through to generic response
      }
    }

    // Generic helpful response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: getGenericResponse(text),
      suggestions: getContextChips(),
    }])
  }

  function getGenericResponse(text) {
    const lower = text.toLowerCase()
    if (/\b(hello|hi|hey|sup|what's up|yo)\b/i.test(lower)) {
      return `Hey there! \u{1FA84} I'm the Magician, your financial co-pilot.\n\n${edgarData?.ticker ? `You have **${edgarData.ticker}** loaded. Ask me anything about it, or try a command!` : `Want to get started? Try "Pull up Apple" or "Fetch Nvidia" and I'll grab their SEC filings for you.`}`
    }
    if (/\b(thank|thanks|thx|appreciate)\b/i.test(lower)) {
      return `You're welcome! \u{1FA84} Let me know if there's anything else I can help with.`
    }
    return `I'm not sure I understood that. Here's what I can do:\n\n- **Fetch data**: "Pull up Nvidia" or "/fetch NVDA"\n- **Navigate**: "Take me to Charts" or "Go to Report Card"\n- **Analyze**: "Run COMPS on Apple"\n- **Compare**: "Compare Tesla vs Google"\n\n${edgarData?.ticker ? `You currently have **${edgarData.ticker}** data loaded.` : 'Start by fetching a company!'}\n\nType **/help** for the full command list.`
  }

  function getHelpMessage() {
    return `## The Magician \u{1FA84} \u2014 Command Reference\n\n### Fetch Data\n- \`/fetch AAPL\` or "Pull up Apple"\n- \`/fetch NVDA 10\` \u2014 fetch with 10 years\n- "Get me Tesla's data"\n\n### Navigate\n- "Take me to Charts"\n- "Go to Report Card"\n- "Show me the EDGAR tab"\n\n### Analyze\n- "Run COMPS on Apple"\n- \`/comps AAPL\`\n- "Run QA check" or \`/qa\`\n\n### Compare\n- "Compare TSLA vs GOOG"\n- \`/compare AAPL MSFT GOOGL\`\n\n### Other\n- \`/export\` \u2014 download current data\n- \`/help\` \u2014 this help message\n\n**Coming Soon:** DCF & LBO models`
  }

  // ─── Handle suggestion chip click ──────────────────────────────────────────
  const handleChipClick = (label) => {
    setInput(label)
    // Auto-submit
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} }
      setInput('')
      setMessages(prev => [...prev, { role: 'user', content: label }])
      setIsLoading(true)

      const command = parseCommand(label)
      if (command) {
        handleCommand(command, label).finally(() => setIsLoading(false))
      } else {
        handleGeneralQuestion(label).finally(() => setIsLoading(false))
      }
    }, 50)
  }

  // ─── Fallback: search company directly when Merlin is offline ──────────────
  const handleFallbackSearch = async (ticker) => {
    if (!ticker || fallbackLoading) return
    const t = ticker.trim().toUpperCase()
    setFallbackLoading(true)
    try {
      const data = await fetchEdgarFromChat(t)
      if (data) {
        setActiveTab('edgar')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**${t}** data loaded! \u2728`,
          suggestions: [
            { label: 'View Charts', icon: 'chart' },
            { label: 'Run QA Check', icon: 'check' },
          ],
        }])
      }
    } catch {
      addToast(`Could not load ${t}`, 'warning')
    } finally {
      setFallbackLoading(false)
      setFallbackSearch('')
    }
  }

  // ─── Clear chat ────────────────────────────────────────────────────────────
  const clearChat = () => {
    const freshMessages = [{
      role: 'assistant',
      content: getWelcomeMessage(),
      suggestions: getContextChips(),
    }]
    setMessages(freshMessages)
    localStorage.setItem('magician_chat_history', JSON.stringify(freshMessages))
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating Widget Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="magician-widget-btn"
            style={{
              position: 'fixed',
              bottom: isMobile ? '80px' : '24px',
              right: '24px',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)',
              border: 'none',
              cursor: 'pointer',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(245, 158, 11, 0.15)',
            }}
            aria-label="Open Magician"
          >
            <Sparkles style={{ width: '24px', height: '24px', color: 'white' }} />

            {/* Insight badge */}
            {widgetState === WIDGET_STATES.INSIGHTS && insightCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: '22px',
                  height: '22px',
                  borderRadius: '11px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  border: '2px solid #0a1628',
                }}
              >
                {insightCount}
              </motion.span>
            )}

            {/* All clear checkmark */}
            {widgetState === WIDGET_STATES.ALL_CLEAR && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0a1628',
                }}
              >
                <CheckCircle style={{ width: '12px', height: '12px', color: 'white' }} />
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
            }}
          />
        )}
      </AnimatePresence>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: isMobile ? '100%' : '420px',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(180deg, #0a1628 0%, #0d1f35 100%)',
              borderLeft: '1px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Panel Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(100, 116, 139, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexShrink: 0,
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              }}>
                <Wand2 style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'white',
                  margin: 0,
                }}>
                  The Magician
                </h3>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
                  {edgarData?.ticker ? `Analyzing ${edgarData.ticker}` : 'Financial Co-pilot'}
                  {' '}<span style={{ color: '#f59e0b' }}>BETA</span>
                </p>
              </div>
              {/* Health Score Badge */}
              {currentInsights?.healthScore && edgarData?.ticker && (
                <div
                  title={`Financial Health Score: ${currentInsights.healthScore.score}/100`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    background: currentInsights.healthScore.score >= 80
                      ? 'rgba(16, 185, 129, 0.12)'
                      : currentInsights.healthScore.score >= 60
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${
                      currentInsights.healthScore.score >= 80
                        ? 'rgba(16, 185, 129, 0.3)'
                        : currentInsights.healthScore.score >= 60
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)'
                    }`,
                  }}
                >
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: currentInsights.healthScore.score >= 80
                      ? '#10b981'
                      : currentInsights.healthScore.score >= 60
                        ? '#f59e0b'
                        : '#ef4444',
                  }}>
                    {currentInsights.healthScore.grade}
                  </span>
                  <span style={{
                    fontSize: '0.5rem',
                    color: '#94a3b8',
                    fontWeight: 500,
                  }}>
                    {currentInsights.healthScore.score}/100
                  </span>
                </div>
              )}
              <button
                onClick={clearChat}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                }}
                title="Clear chat"
              >
                <MessageSquare style={{ width: '16px', height: '16px' }} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                }}
                title="Close"
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex',
                      gap: '0.625rem',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Wand2 style={{ width: '16px', height: '16px', color: 'white' }} />
                      </div>
                    )}

                    <div style={{
                      maxWidth: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                          : 'rgba(30, 41, 59, 0.8)',
                        border: msg.role === 'user'
                          ? 'none'
                          : '1px solid rgba(100, 116, 139, 0.15)',
                        color: 'white',
                      }}>
                        <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }} className="prose">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {msg.isCached && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            marginTop: '0.375rem',
                            opacity: 0.6,
                          }}>
                            <Zap style={{ width: '11px', height: '11px', color: '#f59e0b' }} />
                            <span style={{ fontSize: '0.6rem', color: '#f59e0b' }}>Instant</span>
                          </div>
                        )}

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div style={{
                            marginTop: '0.5rem',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid rgba(100, 116, 139, 0.2)',
                          }}>
                            <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                              Sources
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {msg.sources.slice(0, 3).map((src, j) => (
                                <span key={j} style={{
                                  fontSize: '0.6rem',
                                  background: 'rgba(10, 22, 40, 0.5)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  color: '#cbd5e1',
                                }}>
                                  {src.title || src.source || `Source ${j + 1}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggestion chips */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {msg.suggestions.map((chip, j) => (
                            <button
                              key={j}
                              onClick={() => handleChipClick(chip.label)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '20px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                color: '#fbbf24',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(245, 158, 11, 0.2)'
                                e.target.style.borderColor = 'rgba(245, 158, 11, 0.4)'
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(245, 158, 11, 0.1)'
                                e.target.style.borderColor = 'rgba(245, 158, 11, 0.25)'
                              }}
                            >
                              <ChevronRight style={{ width: '12px', height: '12px' }} />
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'rgba(30, 58, 95, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <User style={{ width: '16px', height: '16px', color: '#cbd5e1' }} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', gap: '0.625rem' }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Wand2 style={{ width: '16px', height: '16px', color: 'white' }} />
                  </div>
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '14px 14px 14px 4px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(100, 116, 139, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                  }}>
                    <div className="magician-typing">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips */}
            <div style={{
              padding: '0.5rem 1rem',
              borderTop: '1px solid rgba(100, 116, 139, 0.1)',
              display: 'flex',
              gap: '0.375rem',
              flexWrap: 'wrap',
              flexShrink: 0,
            }}>
              {(edgarData?.ticker
                ? [
                    { label: 'Run QA', cmd: '/qa' },
                    { label: 'Charts', cmd: 'take me to charts' },
                    { label: 'Compare', cmd: 'compare ' },
                    { label: 'Export', cmd: '/export' },
                  ]
                : [
                    { label: 'Fetch Data', cmd: '/fetch ' },
                    { label: 'Browse EDGAR', cmd: 'go to edgar' },
                    { label: 'Upload PDF', cmd: 'go to documents' },
                    { label: 'Help', cmd: '/help' },
                  ]
              ).map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => {
                    if (chip.cmd.endsWith(' ')) {
                      setInput(chip.cmd)
                      inputRef.current?.focus()
                    } else {
                      setInput(chip.cmd)
                      setTimeout(() => {
                        setInput('')
                        setMessages(prev => [...prev, { role: 'user', content: chip.cmd }])
                        setIsLoading(true)
                        const command = parseCommand(chip.cmd)
                        if (command) {
                          handleCommand(command, chip.cmd).finally(() => setIsLoading(false))
                        } else {
                          handleGeneralQuestion(chip.cmd).finally(() => setIsLoading(false))
                        }
                      }, 50)
                    }
                  }}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#93c5fd',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(100, 116, 139, 0.2)',
              flexShrink: 0,
            }}>
              {merlinOffline ? (
                /* Fallback: compact company search */
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#fbbf24', marginBottom: '0.5rem', fontWeight: 600 }}>
                    {'\u{1FA84}'} Merlin is recharging
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.375rem 0.5rem',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}>
                    <Search style={{ width: '16px', height: '16px', color: '#f59e0b', flexShrink: 0 }} />
                    <input
                      type="text"
                      value={fallbackSearch}
                      onChange={(e) => setFallbackSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFallbackSearch(fallbackSearch)}
                      placeholder="Search company (e.g. AAPL)..."
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '0.85rem',
                        padding: '0.5rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleFallbackSearch(fallbackSearch)}
                      disabled={!fallbackSearch.trim() || fallbackLoading}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        background: fallbackSearch.trim() && !fallbackLoading ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: fallbackSearch.trim() && !fallbackLoading ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {fallbackLoading ? '...' : 'Go'}
                    </button>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleSubmit} style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.375rem 0.5rem',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(100, 116, 139, 0.2)',
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={edgarData?.ticker
                    ? `Ask about ${edgarData.ticker}, or try /comps /qa /compare...`
                    : 'Try "Pull up Apple" or /fetch AAPL...'
                  }
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'white',
                    fontSize: '0.85rem',
                    padding: '0.5rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: (!input.trim() || isLoading) ? 'rgba(245, 158, 11, 0.3)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: 'none',
                    color: 'white',
                    cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isLoading ? (
                    <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Send style={{ width: '16px', height: '16px' }} />
                  )}
                </button>
              </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
