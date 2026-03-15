import { useState, useEffect } from 'react'
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
  FileX,
  CheckSquare,
  Square,
  Image
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
function SingleTable({ tbl }) {
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
      <div style={{ width: '100%', overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
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

// Render all tables from the backend data dict
function DataTable({ data }) {
  if (!data) return null

  const tables = data.tables || data.Tables || []

  if (Array.isArray(tables) && tables.length > 0) {
    return (
      <div>
        {tables.map((tbl, idx) => (
          <SingleTable key={idx} tbl={tbl} />
        ))}
      </div>
    )
  }

  // Fallback: array of objects
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const headers = Object.keys(data[0])
    return (
      <div style={{ width: '100%', overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'rgba(30, 58, 95, 0.6)' }}>
              {headers.map((key, idx) => (
                <th key={idx} style={{
                  textAlign: 'left', padding: '0.625rem 0.75rem',
                  borderBottom: '2px solid rgba(59, 130, 246, 0.4)',
                  borderRight: idx < headers.length - 1 ? '1px solid rgba(100, 116, 139, 0.2)' : 'none',
                  color: '#93c5fd', fontWeight: 600, fontSize: '0.75rem',
                }}>{key.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 100).map((row, rowIdx) => (
              <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? 'rgba(10, 22, 40, 0.3)' : 'rgba(15, 30, 55, 0.3)' }}>
                {headers.map((key, valIdx) => (
                  <td key={valIdx} style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid rgba(100, 116, 139, 0.15)',
                    borderRight: valIdx < headers.length - 1 ? '1px solid rgba(100, 116, 139, 0.1)' : 'none',
                    color: '#e2e8f0', fontSize: '0.8rem',
                  }}>{renderValue(row[key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Fallback: formatted text
  return (
    <pre style={{
      fontSize: '0.75rem', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: '0.75rem',
      borderRadius: '8px', background: 'rgba(10, 22, 40, 0.5)', maxHeight: '300px', overflow: 'auto',
    }}>
      {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
    </pre>
  )
}

// Lightbox for page thumbnails in results
function PageThumbnail({ apiUrl, fileId, pageIndex }) {
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (imgError || !apiUrl || !fileId) return null

  const src = `${apiUrl}/pages/${fileId}/${pageIndex}/preview`

  return (
    <>
      <div onClick={() => setExpanded(true)} style={{
        marginBottom: '1rem', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden',
        border: '1px solid rgba(100, 116, 139, 0.3)', background: 'rgba(10, 22, 40, 0.5)', display: 'inline-block',
      }}>
        <img src={src} alt={`Page ${pageIndex + 1}`} onError={() => setImgError(true)}
          style={{ maxHeight: '200px', width: 'auto', display: 'block' }} />
      </div>
      {expanded && (
        <div onClick={() => setExpanded(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }}>
          <img src={src} alt={`Page ${pageIndex + 1} full`}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </>
  )
}

// Result card for a single extracted table
function ExtractedTableCard({ table, index, isExpanded, onToggle, apiUrl, fileId }) {
  const [metadataOpen, setMetadataOpen] = useState(false)
  const isSuccess = table.extraction_status === 'success'
  const pageNum = table.page_number || table.page_index + 1
  const rowCount = countRows(table.data)

  return (
    <div style={{
      marginBottom: '0', borderRadius: '12px',
      background: 'rgba(10, 22, 40, 0.5)',
      border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
      overflow: 'hidden',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
        border: 'none', cursor: 'pointer', color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isSuccess ? <FileCheck style={{ width: '20px', height: '20px', color: '#34d399' }} />
            : <FileX style={{ width: '20px', height: '20px', color: '#fb7185' }} />}
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontWeight: 600, display: 'block' }}>Page {pageNum}</span>
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
        {isExpanded ? <ChevronDown style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
          : <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8' }} />}
      </button>

      {isExpanded && (
        <div style={{ padding: '1rem' }}>
          {isSuccess && table.data ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <PageThumbnail apiUrl={apiUrl} fileId={fileId} pageIndex={table.page_index} />
              {table.explanation && (
                <div style={{
                  marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#93c5fd' }}>{table.explanation}</p>
                </div>
              )}
              {table.table_metadata && (
                <div style={{ marginBottom: '1rem' }}>
                  <button onClick={() => setMetadataOpen(!metadataOpen)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem',
                    background: 'rgba(10, 22, 40, 0.5)', border: '1px solid rgba(100, 116, 139, 0.2)',
                    borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, width: '100%',
                  }}>
                    {metadataOpen ? <ChevronDown style={{ width: '14px', height: '14px' }} /> : <ChevronRight style={{ width: '14px', height: '14px' }} />}
                    Table Metadata
                  </button>
                  {metadataOpen && (
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(10, 22, 40, 0.5)', border: '1px solid rgba(100, 116, 139, 0.15)' }}>
                      <pre style={{ fontSize: '0.7rem', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {renderValue(table.table_metadata)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              <DataTable data={table.data} />
            </div>
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#fb7185' }}>
              <AlertCircle style={{ width: '24px', height: '24px', margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.875rem' }}>{table.error || 'Extraction failed for this page'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Page card in selection grid
function PageCard({ apiUrl, fileId, pageIndex, pageNumber, isSelected, onToggle }) {
  const [imgError, setImgError] = useState(false)
  const src = `${apiUrl}/pages/${fileId}/${pageIndex}/preview`

  return (
    <div
      onClick={onToggle}
      style={{
        borderRadius: '10px',
        border: `2px solid ${isSelected ? '#3b82f6' : 'rgba(100, 116, 139, 0.25)'}`,
        background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(10, 22, 40, 0.4)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {/* Checkbox overlay */}
      <div style={{
        position: 'absolute', top: '6px', right: '6px', zIndex: 2,
        width: '24px', height: '24px', borderRadius: '6px',
        background: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: isSelected ? 'none' : '1px solid rgba(100, 116, 139, 0.4)',
      }}>
        {isSelected
          ? <CheckSquare style={{ width: '16px', height: '16px', color: 'white' }} />
          : <Square style={{ width: '16px', height: '16px', color: '#94a3b8' }} />}
      </div>

      {/* Thumbnail */}
      <div style={{
        height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.5)', overflow: 'hidden',
      }}>
        {!imgError ? (
          <img
            src={src}
            alt={`Page ${pageNumber}`}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <Image style={{ width: '32px', height: '32px', color: '#475569' }} />
        )}
      </div>

      {/* Page number label */}
      <div style={{
        padding: '0.5rem', textAlign: 'center',
        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(10, 22, 40, 0.5)',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#93c5fd' : '#94a3b8' }}>
          Page {pageNumber}
        </span>
      </div>
    </div>
  )
}


export default function ExtractPanel({ apiUrl, selectedDocument, documents, addToast }) {
  // Page loading & selection
  const [pages, setPages] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [loadingPages, setLoadingPages] = useState(false)
  const [selectedPages, setSelectedPages] = useState(new Set())
  const [lastLoadedDoc, setLastLoadedDoc] = useState(null)

  // Extraction
  const [extractedData, setExtractedData] = useState(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState(null)
  const [expandedTables, setExpandedTables] = useState({})
  const [copied, setCopied] = useState(false)

  const currentDoc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)

  // Fetch pages when document changes
  useEffect(() => {
    if (!selectedDocument || selectedDocument === lastLoadedDoc) return
    setLastLoadedDoc(selectedDocument)
    setPages([])
    setSelectedPages(new Set())
    setExtractedData(null)
    setError(null)
    setExpandedTables({})

    const fetchPages = async () => {
      setLoadingPages(true)
      try {
        const res = await fetch(`${apiUrl}/pages/${selectedDocument}`)
        const data = await res.json()
        if (res.ok && data.success) {
          const pageData = data.data
          setTotalPages(pageData.total_pages || 0)
          // pages_with_tables is the list of pages that have tables
          const pagesWithTables = pageData.pages_with_tables || []
          setPages(pagesWithTables)
          // Pre-select all pages with tables
          setSelectedPages(new Set(pagesWithTables.map(p => p.page_index)))
        } else {
          // Fallback: generate page indices from total pages count
          const doc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)
          const count = doc?.pages_count || doc?.filtered_pages_count || 0
          if (count > 0) {
            const fallbackPages = Array.from({ length: count }, (_, i) => ({ page_index: i, page_number: i + 1 }))
            setTotalPages(count)
            setPages(fallbackPages)
            setSelectedPages(new Set(fallbackPages.map(p => p.page_index)))
          }
        }
      } catch (err) {
        console.error('Failed to fetch pages:', err)
        // Fallback
        const doc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)
        const count = doc?.pages_count || doc?.filtered_pages_count || 0
        if (count > 0) {
          const fallbackPages = Array.from({ length: count }, (_, i) => ({ page_index: i, page_number: i + 1 }))
          setTotalPages(count)
          setPages(fallbackPages)
          setSelectedPages(new Set(fallbackPages.map(p => p.page_index)))
        }
      } finally {
        setLoadingPages(false)
      }
    }

    fetchPages()
  }, [selectedDocument])

  const togglePage = (pageIndex) => {
    setSelectedPages(prev => {
      const next = new Set(prev)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      return next
    })
  }

  const selectAll = () => setSelectedPages(new Set(pages.map(p => p.page_index)))
  const deselectAll = () => setSelectedPages(new Set())

  const toggleTable = (index) => {
    setExpandedTables(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const handleExtract = async () => {
    if (selectedPages.size === 0) {
      addToast('Select at least one page', 'warning')
      return
    }

    setIsExtracting(true)
    setExtractedData(null)
    setError(null)
    setExpandedTables({})

    try {
      const payload = {
        file_id: selectedDocument,
        page_indices: Array.from(selectedPages).sort((a, b) => a - b),
      }

      const response = await fetch(`${apiUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

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
      setIsExtracting(false)
    }
  }

  const handleCopy = () => {
    if (extractedData) {
      try {
        navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2))
        setCopied(true)
        addToast('Copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
      } catch { addToast('Could not copy to clipboard', 'warning') }
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
      } catch { addToast('Could not download file', 'warning') }
    }
  }

  const extractedTables = extractedData?.extracted_tables || []
  const summary = extractedData?.summary || {}

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexShrink: 0 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'linear-gradient(to bottom right, #f59e0b, #f43f5e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles style={{ width: '20px', height: '20px', color: 'white' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'white' }}>Extract Data</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {currentDoc
              ? currentDoc.title || currentDoc.source || 'Document selected'
              : 'Select a document to begin'}
          </p>
        </div>
        {extractedData && (
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button onClick={handleCopy} style={{
              padding: '0.4rem 0.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.75rem', background: 'rgba(10, 22, 40, 0.5)', border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '8px', color: '#94a3b8', cursor: 'pointer',
            }}>
              {copied ? <CheckCircle style={{ width: '13px', height: '13px', color: '#34d399' }} /> : <Copy style={{ width: '13px', height: '13px' }} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleDownload} style={{
              padding: '0.4rem 0.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.75rem', background: 'rgba(10, 22, 40, 0.5)', border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '8px', color: '#94a3b8', cursor: 'pointer',
            }}>
              <Download style={{ width: '13px', height: '13px' }} /> JSON
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {!selectedDocument ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(10, 22, 40, 0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
            }}>
              <FileText style={{ width: '32px', height: '32px', color: '#64748b' }} />
            </div>
            <p style={{ color: '#94a3b8' }}>No document selected</p>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>Upload or select a document from the Documents tab</p>
          </div>
        ) : loadingPages ? (
          <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 style={{ width: '40px', height: '40px', color: '#60a5fa', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading pages...</p>
          </div>
        ) : (
          <>
            {/* Page selection grid */}
            <div className="card" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
              {/* Grid header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexShrink: 0 }}>
                <div>
                  <h4 style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>
                    Select Pages
                    <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                      {selectedPages.size} of {pages.length} selected
                    </span>
                  </h4>
                  {totalPages > 0 && pages.length < totalPages && (
                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Showing {pages.length} pages with tables (of {totalPages} total)
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={selectAll} style={{
                    padding: '0.375rem 0.625rem', fontSize: '0.75rem',
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px', color: '#93c5fd', cursor: 'pointer',
                  }}>Select All</button>
                  <button onClick={deselectAll} style={{
                    padding: '0.375rem 0.625rem', fontSize: '0.75rem',
                    background: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '6px', color: '#94a3b8', cursor: 'pointer',
                  }}>Deselect All</button>
                </div>
              </div>

              {/* Scrollable grid */}
              {pages.length > 0 ? (
                <div style={{
                  maxHeight: '55vh',
                  overflowY: 'auto',
                  marginBottom: '0.75rem',
                  paddingRight: '0.25rem',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                  }}>
                    {pages.map((page) => (
                      <PageCard
                        key={page.page_index}
                        apiUrl={apiUrl}
                        fileId={selectedDocument}
                        pageIndex={page.page_index}
                        pageNumber={page.page_number > 0 ? page.page_number : page.page_index + 1}
                        isSelected={selectedPages.has(page.page_index)}
                        onToggle={() => togglePage(page.page_index)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <Image style={{ width: '32px', height: '32px', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p>No pages found for this document</p>
                </div>
              )}

              {/* Extract button - always visible at bottom */}
              <button
                onClick={handleExtract}
                disabled={isExtracting || selectedPages.size === 0}
                className="btn-primary"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  flexShrink: 0,
                  opacity: (isExtracting || selectedPages.size === 0) ? 0.5 : 1,
                  cursor: (isExtracting || selectedPages.size === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {isExtracting ? (
                  <>
                    <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                    Extracting {selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Sparkles style={{ width: '20px', height: '20px' }} />
                    Extract {selectedPages.size} Selected Page{selectedPages.size !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>

            {/* Extraction results */}
            {isExtracting && (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader2 style={{ width: '48px', height: '48px', color: '#60a5fa', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: 'white', fontWeight: 500 }}>Analyzing pages...</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>This may take a moment for large documents</p>
              </div>
            )}

            {error && (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <AlertCircle style={{ width: '32px', height: '32px', color: '#fb7185', margin: '0 auto 0.5rem' }} />
                <p style={{ color: '#fb7185', fontWeight: 500 }}>Extraction Failed</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>{error}</p>
              </div>
            )}

            {extractedData && !isExtracting && (
              <div className="card">
                {/* Summary bar */}
                <div style={{
                  marginBottom: '1rem', padding: '1rem', borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex', alignItems: 'center', gap: '1.5rem',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{summary.total_pages_processed || 0}</p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Pages</p>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: 'rgba(100, 116, 139, 0.3)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>{summary.successful_extractions || 0}</p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Success</p>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: 'rgba(100, 116, 139, 0.3)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fb7185' }}>{summary.failed_extractions || 0}</p>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Failed</p>
                  </div>
                </div>

                {/* Table results with dividers */}
                {extractedTables.length > 0 ? (
                  extractedTables.map((table, index) => (
                    <div key={index}>
                      {index > 0 && (
                        <hr style={{
                          border: 'none', borderTop: '1px solid rgba(100, 116, 139, 0.25)',
                          margin: '1rem 0',
                        }} />
                      )}
                      <ExtractedTableCard
                        table={table}
                        index={index}
                        isExpanded={expandedTables[index] || false}
                        onToggle={() => toggleTable(index)}
                        apiUrl={apiUrl}
                        fileId={selectedDocument}
                      />
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <Table style={{ width: '32px', height: '32px', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <p>No tables extracted</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
