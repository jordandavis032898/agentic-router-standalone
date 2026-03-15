import { useState, useEffect, useRef } from 'react'
import { 
  Sparkles, 
  FileText, 
  Loader2, 
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Table,
  FileCheck,
  FileX
} from 'lucide-react'

// Safely render any value
const renderValue = (value) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return '[Object]'
    }
  }
  return String(value)
}

// Count total rows across all tables in the data dict
function countRows(data) {
  if (!data) return 0
  const tables = data.tables || data.Tables || []
  if (Array.isArray(tables)) {
    return tables.reduce((sum, t) => sum + (Array.isArray(t.rows) ? t.rows.length : 0), 0)
  }
  return 0
}

// Render a single table with headers + rows format from backend
function SingleTable({ tbl, tblIdx }) {
  const headers = tbl.headers || tbl.Headers || []
  const rows = tbl.rows || tbl.Rows || []
  const title = tbl.title || tbl.Title || ''
  const summary = tbl.summary || tbl.Summary || ''

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {title && (
        <h5 style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#e2e8f0',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Table style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
          {title}
        </h5>
      )}
      {summary && (
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{summary}</p>
      )}
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          {headers.length > 0 && (
            <thead>
              <tr style={{ background: 'rgba(30, 58, 95, 0.6)' }}>
                {headers.map((h, idx) => (
                  <th key={idx} style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    borderBottom: '2px solid rgba(59, 130, 246, 0.4)',
                    borderRight: idx < headers.length - 1 ? '1px solid rgba(100, 116, 139, 0.2)' : 'none',
                    color: '#93c5fd',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                  }}>
                    {renderValue(h)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.slice(0, 100).map((row, rowIdx) => {
              const cells = Array.isArray(row) ? row : Object.values(row)
              return (
                <tr key={rowIdx} style={{
                  background: rowIdx % 2 === 0 ? 'rgba(10, 22, 40, 0.3)' : 'rgba(15, 30, 55, 0.3)',
                }}>
                  {cells.map((val, valIdx) => (
                    <td key={valIdx} style={{
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid rgba(100, 116, 139, 0.15)',
                      borderRight: valIdx < cells.length - 1 ? '1px solid rgba(100, 116, 139, 0.1)' : 'none',
                      color: '#e2e8f0',
                      fontSize: '0.8rem',
                    }}>
                      {renderValue(val)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length > 100 && (
          <p style={{ fontSize: '0.7rem', color: '#64748b', padding: '0.5rem', textAlign: 'center', background: 'rgba(10, 22, 40, 0.3)' }}>
            Showing first 100 of {rows.length} rows
          </p>
        )}
        {rows.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: '#64748b', padding: '1rem', textAlign: 'center' }}>
            No rows in this table
          </p>
        )}
      </div>
    </div>
  )
}

// Render all tables from the backend data dict: { tables: [{ title, headers, rows, summary }] }
function DataTable({ data }) {
  if (!data) return null

  // Backend format: data = { tables: [{ title, headers, rows, summary }] }
  const tables = data.tables || data.Tables || []

  if (Array.isArray(tables) && tables.length > 0) {
    return (
      <div>
        {tables.map((tbl, idx) => (
          <SingleTable key={idx} tbl={tbl} tblIdx={idx} />
        ))}
      </div>
    )
  }

  // Fallback: if data is an array of objects (generic tabular)
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const headers = Object.keys(data[0])
    return (
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'rgba(30, 58, 95, 0.6)' }}>
              {headers.map((key, idx) => (
                <th key={idx} style={{
                  textAlign: 'left',
                  padding: '0.625rem 0.75rem',
                  borderBottom: '2px solid rgba(59, 130, 246, 0.4)',
                  borderRight: idx < headers.length - 1 ? '1px solid rgba(100, 116, 139, 0.2)' : 'none',
                  color: '#93c5fd',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}>
                  {key.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 100).map((row, rowIdx) => (
              <tr key={rowIdx} style={{
                background: rowIdx % 2 === 0 ? 'rgba(10, 22, 40, 0.3)' : 'rgba(15, 30, 55, 0.3)',
              }}>
                {headers.map((key, valIdx) => (
                  <td key={valIdx} style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid rgba(100, 116, 139, 0.15)',
                    borderRight: valIdx < headers.length - 1 ? '1px solid rgba(100, 116, 139, 0.1)' : 'none',
                    color: '#e2e8f0',
                    fontSize: '0.8rem',
                  }}>
                    {renderValue(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Fallback: render as formatted text
  return (
    <pre style={{
      fontSize: '0.75rem',
      color: '#cbd5e1',
      fontFamily: 'JetBrains Mono, monospace',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      margin: 0,
      padding: '0.75rem',
      borderRadius: '8px',
      background: 'rgba(10, 22, 40, 0.5)',
      maxHeight: '300px',
      overflow: 'auto',
    }}>
      {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
    </pre>
  )
}

// Page thumbnail component
function PageThumbnail({ apiUrl, fileId, pageIndex }) {
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (imgError || !apiUrl || !fileId) return null

  const src = `${apiUrl}/pages/${fileId}/${pageIndex}/preview`

  return (
    <>
      <div
        onClick={() => setExpanded(true)}
        style={{
          marginBottom: '1rem',
          cursor: 'pointer',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          background: 'rgba(10, 22, 40, 0.5)',
          display: 'inline-block',
        }}
      >
        <img
          src={src}
          alt={`Page ${pageIndex + 1} preview`}
          onError={() => setImgError(true)}
          style={{
            maxHeight: '200px',
            width: 'auto',
            display: 'block',
          }}
        />
      </div>
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={src}
            alt={`Page ${pageIndex + 1} full`}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '8px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}
    </>
  )
}

// Component to render a single extracted table
function ExtractedTableCard({ table, index, isExpanded, onToggle, apiUrl, fileId }) {
  const [metadataOpen, setMetadataOpen] = useState(false)
  const isSuccess = table.extraction_status === 'success'
  const pageNum = table.page_number || table.page_index + 1
  const rowCount = countRows(table.data)

  return (
    <div style={{
      marginBottom: '1rem',
      borderRadius: '12px',
      background: 'rgba(10, 22, 40, 0.5)',
      border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: 'none',
          cursor: 'pointer',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isSuccess ? (
            <FileCheck style={{ width: '20px', height: '20px', color: '#34d399' }} />
          ) : (
            <FileX style={{ width: '20px', height: '20px', color: '#fb7185' }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontWeight: 600, display: 'block' }}>
              Page {pageNum}
            </span>
            <span style={{ fontSize: '0.75rem', color: isSuccess ? '#34d399' : '#fb7185' }}>
              {isSuccess ? (() => {
                const tblCount = (table.data?.tables || table.data?.Tables || []).length
                return tblCount > 0
                  ? `${tblCount} table${tblCount !== 1 ? 's' : ''}, ${rowCount} row${rowCount !== 1 ? 's' : ''}`
                  : 'Extracted'
              })() : 'Extraction failed'}
            </span>
          </div>
        </div>
        {isExpanded ?
          <ChevronDown style={{ width: '20px', height: '20px', color: '#94a3b8' }} /> :
          <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
        }
      </button>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '1rem' }}>
          {isSuccess && table.data ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              {/* Page thumbnail */}
              <PageThumbnail apiUrl={apiUrl} fileId={fileId} pageIndex={table.page_index} />

              {/* Explanation if available */}
              {table.explanation && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#93c5fd' }}>{table.explanation}</p>
                </div>
              )}

              {/* Collapsible Table Metadata */}
              {table.table_metadata && (
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => setMetadataOpen(!metadataOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(10, 22, 40, 0.5)',
                      border: '1px solid rgba(100, 116, 139, 0.2)',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      width: '100%',
                    }}
                  >
                    {metadataOpen ?
                      <ChevronDown style={{ width: '14px', height: '14px' }} /> :
                      <ChevronRight style={{ width: '14px', height: '14px' }} />
                    }
                    Table Metadata
                  </button>
                  {metadataOpen && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(10, 22, 40, 0.5)',
                      border: '1px solid rgba(100, 116, 139, 0.15)',
                    }}>
                      <pre style={{
                        fontSize: '0.7rem',
                        color: '#cbd5e1',
                        fontFamily: 'JetBrains Mono, monospace',
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                      }}>
                        {renderValue(table.table_metadata)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Rendered HTML Table */}
              <DataTable data={table.data} />
            </div>
          ) : (
            <div style={{
              padding: '1rem',
              textAlign: 'center',
              color: '#fb7185',
            }}>
              <AlertCircle style={{ width: '24px', height: '24px', margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.875rem' }}>{table.error || 'Extraction failed for this page'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ExtractPanel({ apiUrl, selectedDocument, documents, addToast }) {
  const [extractedData, setExtractedData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const [expandedTables, setExpandedTables] = useState({})
  const lastExtractedDoc = useRef(null)

  const currentDoc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)

  const toggleTable = (index) => {
    setExpandedTables(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const runExtraction = async (docId, pageCount) => {
    setIsLoading(true)
    setExtractedData(null)
    setError(null)
    setExpandedTables({})

    // Build page indices array: [0, 1, 2, ..., n-1]
    const maxPages = Math.min(pageCount || 20, 50) // cap at 50 pages
    const indices = Array.from({ length: maxPages }, (_, i) => i)

    try {
      const payload = { file_id: docId, page_indices: indices }
      console.log('Auto-extract request:', payload)

      const response = await fetch(`${apiUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log('Extract response:', data)

      if (response.ok && data.success) {
        setExtractedData(data.data)
        if (data.data?.extracted_tables?.length > 0) {
          setExpandedTables({ 0: true })
        }
        addToast('Data extracted successfully!', 'success')
      } else {
        const errorMsg = data.detail?.message || data.error || data.detail || 'Extraction failed'
        setError(errorMsg)
        addToast('Extraction could not complete', 'warning')
      }
    } catch (err) {
      console.error('Extract error:', err)
      setError(err.message)
      addToast('Extraction could not complete right now', 'warning')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-extract when a document is selected
  useEffect(() => {
    if (!selectedDocument || selectedDocument === lastExtractedDoc.current) return
    lastExtractedDoc.current = selectedDocument

    const doc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)
    const pageCount = doc?.pages_count || doc?.filtered_pages_count || 20
    runExtraction(selectedDocument, pageCount)
  }, [selectedDocument])

  const handleCopy = () => {
    if (extractedData) {
      try {
        navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2))
        setCopied(true)
        addToast('Copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        addToast('Could not copy to clipboard', 'warning')
      }
    }
  }

  const handleDownload = () => {
    if (extractedData) {
      try {
        const blob = new Blob([JSON.stringify(extractedData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `extraction_${selectedDocument?.slice(0, 8) || 'data'}.json`
        a.click()
        URL.revokeObjectURL(url)
        addToast('Downloaded extraction results', 'success')
      } catch (err) {
        addToast('Could not download file', 'warning')
      }
    }
  }

  // Get extracted tables from the response
  const extractedTables = extractedData?.extracted_tables || []
  const summary = extractedData?.summary || {}

  return (
    <div style={{ height: '100%', display: 'flex', gap: '1.5rem' }}>
      {/* Configuration panel */}
      <div style={{ width: '350px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(to bottom right, #f59e0b, #f43f5e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'white' }}>Extract Data</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>AI-powered extraction</p>
            </div>
          </div>

          {/* Document selection info */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'block' }}>
              Selected Document
            </label>
            {currentDoc ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <FileText style={{ width: '18px', height: '18px', color: '#34d399' }} />
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentDoc.title || currentDoc.source || 'Document'}
                </span>
                <CheckCircle style={{ width: '16px', height: '16px', color: '#34d399' }} />
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}>
                <AlertCircle style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                <span style={{ fontSize: '0.8rem', color: '#fde68a' }}>No document selected</span>
              </div>
            )}
          </div>

          {/* Auto-extraction status */}
          <div style={{
            padding: '0.75rem',
            borderRadius: '10px',
            background: isLoading
              ? 'rgba(59, 130, 246, 0.1)'
              : extractedData
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(10, 22, 40, 0.3)',
            border: `1px solid ${isLoading
              ? 'rgba(59, 130, 246, 0.2)'
              : extractedData
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(100, 116, 139, 0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            {isLoading ? (
              <>
                <Loader2 style={{ width: '18px', height: '18px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.8rem', color: '#93c5fd' }}>Extracting all pages automatically...</span>
              </>
            ) : extractedData ? (
              <>
                <CheckCircle style={{ width: '18px', height: '18px', color: '#34d399' }} />
                <span style={{ fontSize: '0.8rem', color: '#34d399' }}>Extraction complete</span>
              </>
            ) : (
              <>
                <Sparkles style={{ width: '18px', height: '18px', color: '#64748b' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Select a document to auto-extract</span>
              </>
            )}
          </div>

          {/* Re-extract button */}
          {selectedDocument && !isLoading && (
            <button
              onClick={() => {
                lastExtractedDoc.current = null
                const doc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)
                const pageCount = doc?.pages_count || doc?.filtered_pages_count || 20
                runExtraction(selectedDocument, pageCount)
              }}
              className="btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              <Sparkles style={{ width: '20px', height: '20px' }} />
              Re-extract
            </button>
          )}
        </div>

        {/* Tips */}
        <div style={{
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
        }}>
          <h4 style={{ fontWeight: 500, color: '#60a5fa', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Tips
          </h4>
          <ul style={{ fontSize: '0.75rem', color: '#94a3b8', listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '0.375rem' }}>• Automatically extracts all pages</li>
            <li style={{ marginBottom: '0.375rem' }}>• Works best with financial documents</li>
            <li>• Export results as JSON</li>
          </ul>
        </div>
      </div>

      {/* Results panel */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'white' }}>Extraction Results</h3>
            
            {extractedData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    background: 'rgba(10, 22, 40, 0.5)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? <CheckCircle style={{ width: '14px', height: '14px', color: '#34d399' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8rem',
                    background: 'rgba(10, 22, 40, 0.5)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  <Download style={{ width: '14px', height: '14px' }} />
                  Download
                </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {isLoading ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Loader2 style={{ width: '48px', height: '48px', color: '#60a5fa', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                <p style={{ color: 'white', fontWeight: 500 }}>Analyzing document...</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>This may take a moment</p>
              </div>
            ) : error ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(244, 63, 94, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  <AlertCircle style={{ width: '32px', height: '32px', color: '#fb7185' }} />
                </div>
                <p style={{ color: '#fb7185', fontWeight: 500 }}>Extraction Failed</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem', maxWidth: '300px' }}>{error}</p>
              </div>
            ) : extractedData ? (
              <div>
                {/* Summary */}
                <div style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                      {summary.total_pages_processed || 0}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Pages</p>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: 'rgba(100, 116, 139, 0.3)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>
                      {summary.successful_extractions || 0}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Success</p>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: 'rgba(100, 116, 139, 0.3)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fb7185' }}>
                      {summary.failed_extractions || 0}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Failed</p>
                  </div>
                </div>

                {/* Extracted tables */}
                {extractedTables.length > 0 ? (
                  extractedTables.map((table, index) => (
                    <ExtractedTableCard
                      key={index}
                      table={table}
                      index={index}
                      isExpanded={expandedTables[index] || false}
                      onToggle={() => toggleTable(index)}
                      apiUrl={apiUrl}
                      fileId={selectedDocument}
                    />
                  ))
                ) : (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#64748b',
                  }}>
                    <Table style={{ width: '32px', height: '32px', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p>No tables extracted</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(10, 22, 40, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  <Sparkles style={{ width: '32px', height: '32px', color: '#64748b' }} />
                </div>
                <p style={{ color: '#94a3b8' }}>No extraction results yet</p>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Upload or select a document to auto-extract
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
