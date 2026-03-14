import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle,
  Clock,
  Loader2,
  File,
  RefreshCw,
  Building2,
  User
} from 'lucide-react'

export default function DocumentPanel({ 
  documents, 
  selectedDocument, 
  setSelectedDocument, 
  onUpload, 
  onDelete,
  isLoading,
  onRefresh
}) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0])
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Upload zone */}
      <motion.div
        {...getRootProps()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '180px',
          borderRadius: '16px',
          border: `2px dashed ${isDragActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.3)'}`,
          background: isDragActive ? 'rgba(59, 130, 246, 0.05)' : 'rgba(10, 22, 40, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />
        
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Loader2 style={{ width: '28px', height: '28px', color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'white', fontWeight: 500 }}>Processing document...</p>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>Parsing and embedding in progress</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Upload style={{ width: '28px', height: '28px', color: '#60a5fa' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'white', fontWeight: 500 }}>
                {isDragActive ? 'Drop your PDF here' : 'Drag & drop a PDF'}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>or click to browse</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Documents list */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'white' }}>Documents in Qdrant</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
              Documents persist across sessions
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ 
              fontSize: '0.8rem', 
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
            }}>
              {documents.length} files
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: 'none',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title="Refresh documents list"
            >
              <RefreshCw style={{ 
                width: '16px', 
                height: '16px', 
                color: '#60a5fa',
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {documents.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '3rem', 
              textAlign: 'center',
              background: 'rgba(10, 22, 40, 0.3)',
              borderRadius: '12px',
              border: '1px solid rgba(100, 116, 139, 0.2)',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(10, 22, 40, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <FileText style={{ width: '24px', height: '24px', color: '#64748b' }} />
              </div>
              <p style={{ color: '#94a3b8' }}>No documents yet</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Upload a PDF to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {documents.map((doc, index) => {
                const fileId = doc.file_id || doc.hash
                const isSelected = selectedDocument === fileId
                
                return (
                  <motion.div
                    key={fileId || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedDocument(fileId)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(100, 116, 139, 0.2)'}`,
                      background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(10, 22, 40, 0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: isSelected ? '#3b82f6' : 'rgba(10, 22, 40, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <FileText style={{ width: '22px', height: '22px', color: isSelected ? 'white' : '#94a3b8' }} />
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ 
                          fontWeight: 500, 
                          color: 'white', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          fontSize: '0.9rem',
                        }}>
                          {doc.title || doc.source || 'Untitled Document'}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
                          {doc.company && doc.company !== 'Unknown' && doc.company !== 'unknown' && (
                            <span style={{ 
                              fontSize: '0.7rem', 
                              color: '#94a3b8', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              background: 'rgba(10, 22, 40, 0.5)',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                            }}>
                              <Building2 style={{ width: '10px', height: '10px' }} />
                              {doc.company}
                            </span>
                          )}
                          {doc.author && doc.author !== 'Unknown' && doc.author !== 'unknown' && (
                            <span style={{ 
                              fontSize: '0.7rem', 
                              color: '#94a3b8', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                            }}>
                              <User style={{ width: '10px', height: '10px' }} />
                              {doc.author}
                            </span>
                          )}
                          {doc.upload_date && (
                            <span style={{ 
                              fontSize: '0.7rem', 
                              color: '#64748b', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem' 
                            }}>
                              <Clock style={{ width: '10px', height: '10px' }} />
                              {doc.upload_date}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                        {isSelected && (
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <CheckCircle style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(fileId)
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(244, 63, 94, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          title="Remove document"
                        >
                          <Trash2 style={{ width: '14px', height: '14px', color: '#fb7185' }} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
