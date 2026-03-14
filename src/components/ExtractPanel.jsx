import { useState } from 'react'
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

// Component to render a single extracted table
function ExtractedTableCard({ table, index, isExpanded, onToggle }) {
  const isSuccess = table.extraction_status === 'success'
  const pageNum = table.page_number || table.page_index + 1
  
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
              {isSuccess ? 'Extraction successful' : 'Extraction failed'}
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
            <div>
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
              
              {/* Table metadata */}
              {table.table_metadata && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(10, 22, 40, 0.5)',
                }}>
                  <h5 style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Table Metadata
                  </h5>
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
              
              {/* Extracted Data */}
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(100, 116, 139, 0.2)',
              }}>
                <h5 style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Table style={{ width: '14px', height: '14px' }} />
                  Extracted Data
                </h5>
                
                {/* Try to render as table if it's tabular data */}
                {Array.isArray(table.data) && table.data.length > 0 && typeof table.data[0] === 'object' ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: '0.75rem',
                    }}>
                      <thead>
                        <tr>
                          {Object.keys(table.data[0]).map((key, idx) => (
                            <th key={idx} style={{
                              textAlign: 'left',
                              padding: '0.5rem',
                              borderBottom: '1px solid rgba(100, 116, 139, 0.3)',
                              color: '#94a3b8',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                            }}>
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.data.slice(0, 50).map((row, rowIdx) => (
                          <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(10, 22, 40, 0.3)' }}>
                            {Object.values(row).map((val, valIdx) => (
                              <td key={valIdx} style={{
                                padding: '0.5rem',
                                borderBottom: '1px solid rgba(100, 116, 139, 0.1)',
                                color: '#e2e8f0',
                                fontSize: '0.75rem',
                              }}>
                                {renderValue(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {table.data.length > 50 && (
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>
                        Showing first 50 of {table.data.length} rows
                      </p>
                    )}
                  </div>
                ) : (
                  <pre style={{
                    fontSize: '0.7rem',
                    color: '#cbd5e1',
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}>
                    {renderValue(table.data)}
                  </pre>
                )}
              </div>
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
  const [pageIndices, setPageIndices] = useState('')
  const [extractedData, setExtractedData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const [expandedTables, setExpandedTables] = useState({})

  const currentDoc = documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument)

  const toggleTable = (index) => {
    setExpandedTables(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const handleExtract = async () => {
    if (!selectedDocument) {
      addToast('Please select a document first', 'warning')
      return
    }

    // Parse page indices - required field
    const indices = pageIndices
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n))

    if (indices.length === 0) {
      addToast('Please enter at least one page number (e.g., 1, 2, 3)', 'warning')
      return
    }

    setIsLoading(true)
    setExtractedData(null)
    setError(null)
    setExpandedTables({})

    try {
      const payload = {
        file_id: selectedDocument,
        page_indices: indices
      }

      console.log('Extract request:', payload)

      // DATA CALL: USER-TRIGGERED
      // Triggered by: user clicks Extract button with page numbers
      const response = await fetch(`${apiUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log('Extract response:', data)

      if (response.ok && data.success) {
        setExtractedData(data.data)
        // Expand first table by default
        if (data.data?.extracted_tables?.length > 0) {
          setExpandedTables({ 0: true })
        }
        addToast('Data extracted successfully!', 'success')
      } else {
        const errorMsg = data.detail?.message || data.error || data.detail || 'Extraction failed'
        setError(errorMsg)
        addToast(`Extraction could not complete`, 'warning')
      }
    } catch (err) {
      console.error('Extract error:', err)
      setError(err.message)
      addToast('Extraction could not complete right now', 'warning')
    } finally {
      setIsLoading(false)
    }
  }

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

          {/* Page indices - required */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', display: 'block' }}>
              Page Numbers <span style={{ color: '#fb7185' }}>*</span>
            </label>
            <input
              type="text"
              value={pageIndices}
              onChange={(e) => setPageIndices(e.target.value)}
              placeholder="e.g., 1, 2, 3"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(10, 22, 40, 0.5)',
                border: '1px solid rgba(100, 116, 139, 0.5)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.375rem' }}>
              Enter page numbers (comma-separated)
            </p>
          </div>

          <button
            onClick={handleExtract}
            disabled={isLoading || !selectedDocument}
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: (isLoading || !selectedDocument) ? 0.5 : 1,
              cursor: (isLoading || !selectedDocument) ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles style={{ width: '20px', height: '20px' }} />
                Extract Information
              </>
            )}
          </button>
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
            <li style={{ marginBottom: '0.375rem' }}>• Extract tables and structured data</li>
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
                  Select a document and enter page numbers to extract
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
