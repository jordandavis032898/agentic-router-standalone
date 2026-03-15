import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Send,
  Bot,
  User,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  Building2,
  Calendar,
  Check,
  Zap,
} from 'lucide-react'
import { getCached, setCache } from '../utils/merlinCache'
import { COMPANIES, fuzzyMatch } from '../utils/companies.jsx'

const FALLBACK_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'JPM', 'GS']

export default function ChatPanel({
  apiUrl,
  selectedDocument,
  documents = [],
  filters = {},
  selectedFilters = {},
  onFilterChange,
  addToast,
  userId,
  merlinOffline = false,
  setMerlinOffline,
  onFetchEdgar,
  setActiveTab,
}) {
  const [fallbackSearch, setFallbackSearch] = useState('')
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 Hello! I'm your document intelligence assistant. 

I can help you:
- **Answer questions** about your uploaded documents
- **Summarize** key information
- **Compare** data across documents
- **Find specific** details and figures

${documents.length > 0 ? `📚 You have ${documents.length} document(s) available. Select one or use filters to narrow your search.` : '📁 Upload a document to get started.'}`,
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Get selected document details
  const currentDoc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Check cache first
      const cached = getCached(userMessage)
      if (cached) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: cached,
          isCached: true,
        }])
        setIsLoading(false)
        inputRef.current?.focus()
        return
      }

      // Build payload with filters
      const payload = {
        question: userMessage,
        user_id: userId // Add user_id (required for new RAG implementation)
      }

      // Add file_id if a document is selected
      if (selectedDocument) {
        payload.file_id = selectedDocument
      }

      // Add metadata filters if any are selected
      if (Object.keys(selectedFilters).length > 0) {
        payload.filters = selectedFilters
      }

      console.log('Query payload:', payload)

      // MERLIN API CALL: USER-TRIGGERED
      // Triggered by: user types a message and clicks Go / presses Enter
      const response = await fetch(`${apiUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const answer = data.data?.response || data.data?.answer || 'I processed your request.'
        const filtersApplied = data.data?.filters_applied

        let assistantMessage = answer

        // Cache the response
        setCache(userMessage, assistantMessage)

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage,
          sources: data.data?.chunks || data.data?.sources
        }])
      } else {
        throw new Error(data.detail?.[0]?.msg || data.detail?.message || data.error || 'Failed to get response')
      }
    } catch (error) {
      // Auto-retry once after 3 seconds
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '\u{1FA84} Let me try that again...',
      }])
      try {
        await new Promise(r => setTimeout(r, 3000))
        const retryRes = await fetch(`${apiUrl}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: userMessage, user_id: userId }),
        })
        const retryData = await retryRes.json()
        if (retryRes.ok && retryData.success) {
          const answer = retryData.data?.response || retryData.data?.answer || 'I processed your request.'
          setCache(userMessage, answer)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: answer,
            sources: retryData.data?.chunks || retryData.data?.sources,
          }])
        } else {
          throw new Error('retry failed')
        }
      } catch {
        // Retry also failed — enter fallback mode
        if (setMerlinOffline) setMerlinOffline(true)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '\u{1FA84} Merlin is taking a quick break. Search for a company directly below!',
        }])
        addToast('Merlin is recharging...', 'warning')
      }
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `🔄 Chat cleared! Ready for new questions.`,
    }])
  }

  // Fallback mode: search for a company directly
  const handleFallbackSearch = async (ticker) => {
    if (!ticker || fallbackLoading) return
    const t = ticker.trim().toUpperCase()
    setFallbackLoading(true)
    try {
      const res = await fetch(`${apiUrl}/edgar/${t}?include_quarterly=true`)
      const data = await res.json()
      if (res.ok && data.success) {
        if (onFetchEdgar) onFetchEdgar(t, data.data)
        if (setActiveTab) setActiveTab('edgar')
        addToast(`${t} data loaded!`, 'success')
      } else {
        addToast(`Could not load ${t}`, 'warning')
      }
    } catch {
      addToast(`Could not reach the server for ${t}`, 'warning')
    } finally {
      setFallbackLoading(false)
      setFallbackSearch('')
    }
  }

  const activeFilterCount = Object.keys(selectedFilters).length

  return (
    <div style={{ height: '100%', display: 'flex', gap: '1rem' }}>
      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingBottom: '1rem',
          maxWidth: '100%',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {message.role === 'assistant' && (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(to bottom right, #3b82f6, #10b981)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)',
                    }}>
                      <Bot style={{ width: '20px', height: '20px', color: 'white' }} />
                    </div>
                  )}
                  
                  <div
                    style={{
                      maxWidth: '80%',
                      minWidth: 0,
                      padding: '1rem 1.25rem',
                      borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: message.role === 'user'
                        ? 'linear-gradient(to bottom right, #3b82f6, #2563eb)'
                        : 'rgba(30, 41, 59, 0.8)',
                      border: message.isError ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
                      color: 'white',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.6, overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%', margin: '0.75rem 0', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '400px' }}>
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead style={{ background: 'rgba(30, 58, 95, 0.6)' }}>{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th style={{
                              textAlign: 'left',
                              padding: '0.5rem 0.75rem',
                              borderBottom: '2px solid rgba(59, 130, 246, 0.4)',
                              borderRight: '1px solid rgba(100, 116, 139, 0.2)',
                              color: '#93c5fd',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                            }}>{children}</th>
                          ),
                          td: ({ children }) => (
                            <td style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid rgba(100, 116, 139, 0.15)',
                              borderRight: '1px solid rgba(100, 116, 139, 0.1)',
                              color: '#e2e8f0',
                              fontSize: '0.8rem',
                            }}>{children}</td>
                          ),
                          tr: ({ children, isHeader }) => (
                            <tr style={{ background: isHeader ? undefined : 'rgba(10, 22, 40, 0.3)' }}>{children}</tr>
                          ),
                        }}
                      >{message.content}</ReactMarkdown>
                    </div>

                    {message.isCached && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        marginTop: '0.5rem',
                        opacity: 0.6,
                      }}>
                        <Zap style={{ width: '12px', height: '12px', color: '#f59e0b' }} />
                        <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>Instant</span>
                      </div>
                    )}

                    {message.sources && message.sources.length > 0 && (
                      <div style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(100, 116, 139, 0.3)',
                      }}>
                        <p style={{ 
                          fontSize: '0.7rem', 
                          color: '#94a3b8',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                          <FileText style={{ width: '12px', height: '12px' }} /> Sources
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {message.sources.slice(0, 3).map((source, i) => (
                            <span key={i} style={{
                              fontSize: '0.7rem',
                              background: 'rgba(10, 22, 40, 0.5)',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              color: '#cbd5e1',
                            }}>
                              {source.title || source.source || `Chunk ${i + 1}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(30, 58, 95, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <User style={{ width: '20px', height: '20px', color: '#cbd5e1' }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', gap: '1rem' }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(to bottom right, #3b82f6, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Bot style={{ width: '20px', height: '20px', color: 'white' }} />
                </div>
                <div style={{ 
                  padding: '1rem 1.25rem',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(100, 116, 139, 0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 style={{ width: '16px', height: '16px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Current context */}
        {(currentDoc || activeFilterCount > 0) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            marginBottom: '0.75rem',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Context:</span>
            {currentDoc && (
              <span style={{ 
                fontSize: '0.75rem', 
                background: 'rgba(16, 185, 129, 0.2)',
                padding: '0.125rem 0.375rem',
                borderRadius: '4px',
                color: '#a7f3d0',
              }}>
                📄 {currentDoc.title || currentDoc.source || 'Selected document'}
              </span>
            )}
            {activeFilterCount > 0 && (
              <span style={{ 
                fontSize: '0.75rem', 
                background: 'rgba(59, 130, 246, 0.2)',
                padding: '0.125rem 0.375rem',
                borderRadius: '4px',
                color: '#93c5fd',
              }}>
                🔍 {activeFilterCount} filter(s)
              </span>
            )}
          </div>
        )}

        {/* No document warning */}
        {!selectedDocument && documents.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}>
            <AlertCircle style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
            <p style={{ fontSize: '0.8rem', color: '#fde68a' }}>
              Upload a document from the Documents tab to get started
            </p>
          </div>
        )}

        {/* Fallback mode UI */}
        {merlinOffline && (
          <div style={{
            padding: '1rem',
            marginBottom: '0.75rem',
            borderRadius: '14px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}>
            <p style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.75rem' }}>
              {'\u{1FA84}'} Merlin is recharging {'\u2014'} search any company directly:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                value={fallbackSearch}
                onChange={(e) => setFallbackSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFallbackSearch(fallbackSearch)}
                placeholder="Enter ticker (e.g. AAPL)..."
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => handleFallbackSearch(fallbackSearch)}
                disabled={!fallbackSearch.trim() || fallbackLoading}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  background: fallbackSearch.trim() && !fallbackLoading ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: fallbackSearch.trim() && !fallbackLoading ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                }}
              >
                {fallbackLoading ? 'Loading...' : 'Go'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {FALLBACK_TICKERS.map(t => (
                <button
                  key={t}
                  onClick={() => handleFallbackSearch(t)}
                  disabled={fallbackLoading}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '20px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    fontSize: '0.75rem',
                    cursor: fallbackLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div style={{
          borderRadius: '14px',
          padding: '0.5rem',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(100, 116, 139, 0.2)',
          opacity: merlinOffline ? 0.5 : 1,
          pointerEvents: merlinOffline ? 'none' : 'auto',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={clearChat}
              style={{
                padding: '0.625rem',
                borderRadius: '10px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
              title="Clear chat"
            >
              <RefreshCw style={{ width: '18px', height: '18px' }} />
            </button>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '0.625rem',
                borderRadius: '10px',
                background: showFilters || activeFilterCount > 0 ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: 'none',
                color: showFilters || activeFilterCount > 0 ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer',
                position: 'relative',
              }}
              title="Filter options"
            >
              <Filter style={{ width: '18px', height: '18px' }} />
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your documents..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'white',
                padding: '0.5rem',
                fontSize: '0.95rem',
              }}
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '10px',
                background: (!input.trim() || isLoading) ? 'rgba(59, 130, 246, 0.3)' : '#3b82f6',
                border: 'none',
                color: 'white',
                cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isLoading ? (
                <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Send style={{ width: '18px', height: '18px' }} />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Filters sidebar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: '280px' }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            style={{
              background: 'rgba(10, 22, 40, 0.5)',
              borderRadius: '16px',
              border: '1px solid rgba(100, 116, 139, 0.2)',
              padding: '1rem',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>Metadata Filters</h4>
              <button
                onClick={() => setShowFilters(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Filter queries by document metadata
            </p>

            {Object.keys(filters).length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>
                No filters available yet. Upload documents to enable filtering.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Company filter */}
                {filters.company && filters.company.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Building2 style={{ width: '12px', height: '12px' }} />
                      Company
                    </label>
                    <select
                      value={selectedFilters.company || ''}
                      onChange={(e) => onFilterChange('company', e.target.value || null)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(100, 116, 139, 0.3)',
                        color: 'white',
                        fontSize: '0.8rem',
                      }}
                    >
                      <option value="">All companies</option>
                      {filters.company.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Author filter */}
                {filters.author && filters.author.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User style={{ width: '12px', height: '12px' }} />
                      Author
                    </label>
                    <select
                      value={selectedFilters.author || ''}
                      onChange={(e) => onFilterChange('author', e.target.value || null)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(100, 116, 139, 0.3)',
                        color: 'white',
                        fontSize: '0.8rem',
                      }}
                    >
                      <option value="">All authors</option>
                      {filters.author.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date filter */}
                {filters.upload_date && filters.upload_date.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar style={{ width: '12px', height: '12px' }} />
                      Upload Date
                    </label>
                    <select
                      value={selectedFilters.upload_date || ''}
                      onChange={(e) => onFilterChange('upload_date', e.target.value || null)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(100, 116, 139, 0.3)',
                        color: 'white',
                        fontSize: '0.8rem',
                      }}
                    >
                      <option value="">All dates</option>
                      {filters.upload_date.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Clear filters */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      Object.keys(selectedFilters).forEach(k => onFilterChange(k, null))
                    }}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      color: '#fb7185',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <X style={{ width: '14px', height: '14px' }} />
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
