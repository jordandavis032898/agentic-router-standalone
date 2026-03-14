import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Table,
} from 'lucide-react'
import { exportExtractedTablesToExcel } from '../utils/excelExport'

// Use same origin — the main FastAPI app has /pages and /extract routes
const EXTRACT_API_URL = ''

// --- Table helpers (from ExtractorTables) ---

function formatCellValue(val) {
  if (val == null) return '—'
  if (typeof val === 'object' && val.value != null) return String(val.value)
  return String(val)
}

function cleanHeader(h) {
  if (typeof h !== 'string') return h
  return h.replace(/<br\s*\/?>/gi, ' ').trim()
}

function SingleTable({ table, index }) {
  const { data, table_metadata } = table
  if (!data) return null

  const subTables = data.tables || []
  const legacyRows = data.rows || []
  if (subTables.length === 0 && legacyRows.length === 0) return null

  const pageLabel = `Page ${table.page_number || table.page_index + 1}`

  if (subTables.length > 0) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        {subTables.map((st, stIdx) => {
          const title = st.title || table_metadata?.table_title || `Table ${index + 1}`
          const headers = st.headers || []
          const rows = st.rows || []
          return (
            <div key={stIdx} style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}>
                <span style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem' }}>{title}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{pageLabel}</span>
              </div>
              {st.summary && (
                <p style={{ fontSize: '0.8rem', color: '#93c5fd', marginBottom: '0.5rem',
                  padding: '0.5rem 0.75rem', borderRadius: '8px',
                  background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {st.summary}
                </p>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  {headers.length > 0 && (
                    <thead>
                      <tr>
                        {headers.map((h, hIdx) => (
                          <th key={hIdx} style={{
                            textAlign: hIdx === 0 ? 'left' : 'center',
                            padding: '0.5rem',
                            borderBottom: '1px solid rgba(100,116,139,0.3)',
                            color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap',
                          }}>{cleanHeader(h)}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'transparent' : 'rgba(10,22,40,0.3)' }}>
                        {(Array.isArray(row) ? row : []).map((cell, cIdx) => (
                          <td key={cIdx} style={{
                            padding: '0.5rem',
                            borderBottom: '1px solid rgba(100,116,139,0.1)',
                            color: '#e2e8f0', textAlign: cIdx === 0 ? 'left' : 'right',
                          }}>{formatCellValue(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
        {table.explanation && (
          <div style={{
            padding: '0.75rem', borderRadius: '8px',
            background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
            fontSize: '0.8rem', color: '#93c5fd',
          }}>
            {table.explanation}
          </div>
        )}
      </div>
    )
  }

  // Legacy format
  const periods = data.periods || []
  const periodKeys = periods.map((p) => p.year || p.period || String(p))
  const title = table_metadata?.table_title || `Table ${index + 1}`

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '0.5rem',
      }}>
        <span style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem' }}>{title}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{pageLabel}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid rgba(100,116,139,0.3)', color: '#94a3b8', fontWeight: 500 }}>Line Item</th>
              {periodKeys.map((p) => (
                <th key={p} style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid rgba(100,116,139,0.3)', color: '#94a3b8', fontWeight: 500 }}>{cleanHeader(p)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {legacyRows.map((row, rIdx) => (
              <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'transparent' : 'rgba(10,22,40,0.3)' }}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid rgba(100,116,139,0.1)', color: '#e2e8f0' }}>{row.label || `Row ${rIdx + 1}`}</td>
                {periodKeys.map((p) => (
                  <td key={p} style={{ padding: '0.5rem', borderBottom: '1px solid rgba(100,116,139,0.1)', color: '#e2e8f0', textAlign: 'right' }}>{formatCellValue(row.values?.[p])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Main panel ---

export default function PdfExtractPanel({ selectedDocument, documents, addToast }) {
  const [pages, setPages] = useState([])
  const [selectedPages, setSelectedPages] = useState(new Set())
  const [previews, setPreviews] = useState({})
  const [extracting, setExtracting] = useState(false)
  const [loadingPages, setLoadingPages] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [extractedTables, setExtractedTables] = useState(null)
  const [exporting, setExporting] = useState(false)

  const containerRef = useRef(null)
  const previewsRequested = useRef(new Set())

  const currentDoc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)
  const fileId = selectedDocument

  // Responsive grid
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 500)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fetch pages with tables
  const fetchPages = useCallback(async () => {
    if (!fileId) return
    setLoadingPages(true)
    try {
      const res = await fetch(`${EXTRACT_API_URL}/pages/${fileId}`)
      const data = await res.json()
      const pagesData = data?.pages_with_tables || data?.pages || []
      setPages(pagesData)
      setSelectedPages(new Set())
      previewsRequested.current = new Set()
      setPreviews({})
    } catch (e) {
      addToast?.('Failed to load pages', 'error')
    } finally {
      setLoadingPages(false)
    }
  }, [fileId, addToast])

  useEffect(() => {
    fetchPages()
    setExtractedTables(null)
  }, [fetchPages])

  // Load preview thumbnails
  useEffect(() => {
    if (!fileId || pages.length === 0) return
    pages.forEach(async (page) => {
      const idx = page.page_index
      if (previewsRequested.current.has(idx)) return
      previewsRequested.current.add(idx)
      try {
        const res = await fetch(`${EXTRACT_API_URL}/pages/${fileId}/${idx}/preview`)
        if (res.ok) {
          const blob = await res.blob()
          if (blob && blob.size > 0) {
            const url = URL.createObjectURL(blob)
            setPreviews((prev) => ({ ...prev, [idx]: url }))
          }
        }
      } catch {
        // preview not available
      }
    })
  }, [fileId, pages])

  const togglePage = (pageIndex) => {
    setSelectedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      return next
    })
  }

  const handleExtract = async () => {
    if (selectedPages.size === 0) return
    setExtracting(true)
    try {
      const indices = Array.from(selectedPages).sort((a, b) => a - b)
      const res = await fetch(`${EXTRACT_API_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, page_indices: indices }),
      })
      const data = await res.json()
      const tables = data?.data?.extracted_tables || data?.extracted_tables
      if (data?.success && tables) {
        setExtractedTables(tables)
        addToast?.('Extraction complete!', 'success')
      } else {
        addToast?.(data?.error?.message || data?.detail || 'Extraction failed', 'error')
      }
    } catch (e) {
      addToast?.(`Extraction failed: ${e.message}`, 'error')
    } finally {
      setExtracting(false)
    }
  }

  const handleExportExcel = async () => {
    if (!extractedTables || extractedTables.length === 0) return
    setExporting(true)
    try {
      await exportExtractedTablesToExcel(extractedTables, fileId)
      addToast?.('Excel file downloaded', 'success')
    } catch (e) {
      console.error('Export failed:', e)
      addToast?.('Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(to bottom right, #10b981, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(16,185,129,0.3)',
          }}>
            <FileSpreadsheet style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'white' }}>PDF to Excel</h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Visual page selection & Excel export</p>
          </div>
        </div>

        {/* Document info */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'block' }}>
            Selected Document
          </label>
          {currentDoc ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              borderRadius: '10px', background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <FileText style={{ width: '18px', height: '18px', color: '#34d399' }} />
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentDoc.title || currentDoc.source || 'Document'}
              </span>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#34d399' }} />
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              borderRadius: '10px', background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <AlertCircle style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
              <span style={{ fontSize: '0.8rem', color: '#fde68a' }}>No document selected — upload one in the Documents tab</span>
            </div>
          )}
        </div>

        {/* Loading pages */}
        {loadingPages && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', padding: '1rem 0' }}>
            <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
            Loading pages…
          </div>
        )}

        {/* No document selected */}
        {!fileId && !loadingPages && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
            <FileSpreadsheet style={{ width: '32px', height: '32px', margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <p>Select a document to see pages with tables</p>
          </div>
        )}

        {/* No pages found */}
        {fileId && !loadingPages && pages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
            <Table style={{ width: '32px', height: '32px', margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <p>No pages with tables found</p>
            <button onClick={fetchPages} style={{
              marginTop: '0.75rem', padding: '0.5rem 1rem', background: 'rgba(10,22,40,0.5)',
              border: '1px solid rgba(100,116,139,0.3)', borderRadius: '8px',
              color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem',
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            }}>
              <RefreshCw style={{ width: '14px', height: '14px' }} /> Retry
            </button>
          </div>
        )}

        {/* Page thumbnail grid */}
        {pages.length > 0 && (
          <>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              Select pages to extract ({pages.length} page{pages.length !== 1 ? 's' : ''} with tables)
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}>
              {pages.map((page) => {
                const idx = page.page_index
                const displayNum = idx + 1
                const isSelected = selectedPages.has(idx)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => togglePage(idx)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '0.75rem', borderRadius: '12px', cursor: 'pointer',
                      background: isSelected ? 'rgba(59,130,246,0.15)' : 'rgba(10,22,40,0.5)',
                      border: isSelected ? '2px solid rgba(59,130,246,0.5)' : '2px solid rgba(100,116,139,0.2)',
                      transition: 'all 0.15s',
                      position: 'relative',
                      color: 'white',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem' }}>
                      <span style={{
                        width: '20px', height: '20px', borderRadius: '4px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: isSelected ? '#3b82f6' : 'rgba(10,22,40,0.5)',
                        border: isSelected ? '2px solid #3b82f6' : '2px solid rgba(100,116,139,0.4)',
                      }}>
                        {isSelected && (
                          <svg viewBox="0 0 16 16" fill="none" style={{ width: '12px', height: '12px' }}>
                            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                    </div>
                    {/* Preview */}
                    <div style={{
                      width: '100%', aspectRatio: '0.77', borderRadius: '8px', overflow: 'hidden',
                      background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', marginBottom: '0.5rem',
                    }}>
                      {previews[idx] ? (
                        <img src={previews[idx]} alt={`Page ${displayNum}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '1.5rem', color: '#475569', fontWeight: 700 }}>{displayNum}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: isSelected ? '#60a5fa' : '#94a3b8' }}>
                      Page {displayNum}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExtract}
                disabled={selectedPages.size === 0 || extracting}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: (selectedPages.size === 0 || extracting) ? 0.5 : 1,
                  cursor: (selectedPages.size === 0 || extracting) ? 'not-allowed' : 'pointer',
                }}
              >
                {extracting ? (
                  <>
                    <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                    Extracting…
                  </>
                ) : (
                  `Extract ${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''}`
                )}
              </button>
              <button
                type="button"
                onClick={fetchPages}
                disabled={loadingPages}
                style={{
                  padding: '0.5rem 1rem', background: 'rgba(10,22,40,0.5)',
                  border: '1px solid rgba(100,116,139,0.3)', borderRadius: '8px',
                  color: '#94a3b8', cursor: loadingPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
                }}
              >
                <RefreshCw style={{ width: '14px', height: '14px' }} /> Refresh
              </button>
            </div>
          </>
        )}
      </div>

      {/* Results section */}
      {extractedTables && extractedTables.length > 0 && (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1rem', flexShrink: 0,
          }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'white' }}>
              Extracted Tables ({extractedTables.length})
            </h3>
            <button
              type="button"
              className="btn-primary"
              onClick={handleExportExcel}
              disabled={exporting}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                opacity: exporting ? 0.5 : 1,
                cursor: exporting ? 'not-allowed' : 'pointer',
              }}
            >
              {exporting ? (
                <>
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  Exporting…
                </>
              ) : (
                <>
                  <Download style={{ width: '16px', height: '16px' }} />
                  Export Excel
                </>
              )}
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {extractedTables.map((table, idx) => (
              <SingleTable key={idx} table={table} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
