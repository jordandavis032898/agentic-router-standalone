import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import DocumentPanel from './components/DocumentPanel'
import ChatPanel from './components/ChatPanel'
import ExtractPanel from './components/ExtractPanel'
import PdfExtractPanel from './components/PdfExtractPanel'
import EdgarPanel from './components/EdgarPanel'
import { Toaster } from './components/Toast'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Hash-based navigation helpers
const VALID_TABS = ['chat', 'extract', 'pdf-extract', 'edgar', 'documents']
const getTabFromHash = () => {
  const hash = window.location.hash.replace('#', '') || 'documents'
  return VALID_TABS.includes(hash) ? hash : 'documents'
}

// Check if a string looks like a UUID/hash (not a real filename)
const looksLikeUuid = (s) => !s || /^[0-9a-f_-]{20,}$/i.test(s) || /^user_/.test(s)

// User ID management - generate and store in localStorage
const getUserId = () => {
  const STORAGE_KEY = 'agentic_router_user_id'
  let userId = localStorage.getItem(STORAGE_KEY)
  if (!userId) {
    // Generate a simple user ID
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(STORAGE_KEY, userId)
  }
  return userId
}

function App() {
  const [activeTab, setActiveTab] = useState(getTabFromHash)
  if (!window.location.hash) {
    window.location.replace('#documents')
  }
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const [filters, setFilters] = useState({})
  const [selectedFilters, setSelectedFilters] = useState({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [userId] = useState(() => getUserId()) // Get user_id once on mount
  const [extractionContext, setExtractionContext] = useState(null)

  // Clear extraction context when the selected document changes
  useEffect(() => { setExtractionContext(null) }, [selectedDocument])

  // Navigate to tab: set hash (triggers hashchange → updates state)
  const navigateToTab = useCallback((tab) => {
    window.location.hash = tab
  }, [])

  // Handle browser back/forward via hashchange
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Toast notification helper
  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Fetch documents from Qdrant via API
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents?user_id=${encodeURIComponent(userId)}`)
      const data = await response.json()
      
      if (response.ok && data.success && data.data?.documents) {
        setDocuments(prev => {
          // Merge: keep locally-stored filenames for docs we already know about
          const prevMap = new Map(prev.map(d => [d.file_id || d.hash, d]))
          return data.data.documents.map(serverDoc => {
            const id = serverDoc.file_id || serverDoc.hash
            const local = prevMap.get(id)
            if (local && local.title && !looksLikeUuid(local.title)) {
              // Keep the good local title/source
              return { ...serverDoc, title: local.title, source: local.source || local.title }
            }
            return serverDoc
          })
        })
        console.log(`Loaded ${data.data.total} documents from Qdrant`)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      // Don't show error toast on initial load, just log it
    }
  }, [userId])

  // Fetch available filters
  const fetchFilters = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/filters`)
      const data = await response.json()
      
      if (response.ok && data.success && data.data?.filters) {
        setFilters(data.data.filters)
        console.log('Available filters:', data.data.available_fields)
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error)
    }
  }, [])

  // Load documents and filters on mount
  useEffect(() => {
    const init = async () => {
      setIsInitialLoading(true)
      await Promise.all([fetchDocuments(), fetchFilters()])
      setIsInitialLoading(false)
    }
    init()
  }, [fetchDocuments, fetchFilters])

  const handleUpload = async (file) => {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId) // Add user_id to form data

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        const newDoc = {
          ...data.data,
          file_id: data.data?.file_id || data.data?.hash,
          hash: data.data?.hash,
          title: file.name,
          source: file.name,
          upload_date: new Date().toISOString().split('T')[0],
          size: file.size,
        }
        
        setDocuments(prev => {
          // Check if document already exists (by hash)
          const exists = prev.some(d => d.hash === newDoc.hash || d.file_id === newDoc.file_id)
          if (exists) {
            return prev
          }
          return [...prev, newDoc]
        })
        setSelectedDocument(newDoc.file_id || newDoc.hash)
        addToast(`"${file.name}" uploaded successfully!`, 'success')
        
        // Refresh documents list after a short delay (for embedding to complete)
        setTimeout(() => fetchDocuments(), 2000)
      } else {
        addToast(data.error || data.detail || 'Upload failed', 'error')
      }
    } catch (error) {
      addToast('Failed to upload document', 'error')
      console.error('Upload error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (fileId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE',
      })
      
      // Remove from local state regardless of API response
      setDocuments(prev => prev.filter(d => d.file_id !== fileId && d.hash !== fileId))
      if (selectedDocument === fileId) {
        setSelectedDocument(null)
      }
      
      if (response.ok) {
        addToast('Document deleted', 'success')
      } else {
        addToast('Document removed from list', 'info')
      }
    } catch (error) {
      setDocuments(prev => prev.filter(d => d.file_id !== fileId && d.hash !== fileId))
      if (selectedDocument === fileId) {
        setSelectedDocument(null)
      }
      addToast('Document removed from list', 'info')
    }
  }

  const handleDeleteAll = async () => {
    const docs = [...documents]
    setDocuments([])
    setSelectedDocument(null)
    addToast(`Cleared ${docs.length} document(s)`, 'success')
    // Fire delete requests in background
    for (const doc of docs) {
      const fileId = doc.file_id || doc.hash
      if (fileId) {
        try { await fetch(`${API_BASE_URL}/files/${fileId}`, { method: 'DELETE' }) } catch {}
      }
    }
  }

  const handleFilterChange = (field, value) => {
    setSelectedFilters(prev => {
      if (value === null || value === '') {
        const { [field]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [field]: value }
    })
  }

  const     tabComponents = {
    chat: <ChatPanel
      apiUrl={API_BASE_URL}
      selectedDocument={selectedDocument}
      documents={documents}
      filters={filters}
      selectedFilters={selectedFilters}
      onFilterChange={handleFilterChange}
      addToast={addToast}
      userId={userId}
      extractionContext={extractionContext}
    />,
    extract: <ExtractPanel
      apiUrl={API_BASE_URL}
      selectedDocument={selectedDocument}
      documents={documents}
      addToast={addToast}
      setExtractionContext={setExtractionContext}
      navigateToTab={navigateToTab}
    />,
    'pdf-extract': <PdfExtractPanel
      apiUrl={API_BASE_URL}
      selectedDocument={selectedDocument}
      documents={documents}
      addToast={addToast}
    />,
    edgar: <EdgarPanel 
      apiUrl={API_BASE_URL}
      addToast={addToast}
    />,
    documents: <DocumentPanel
      documents={documents}
      selectedDocument={selectedDocument}
      setSelectedDocument={setSelectedDocument}
      onUpload={handleUpload}
      onDelete={handleDelete}
      onDeleteAll={handleDeleteAll}
      isLoading={isLoading}
      onRefresh={fetchDocuments}
    />,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Background effects */}
      <div className="bg-grid" style={{ position: 'fixed', inset: 0, opacity: 0.3, pointerEvents: 'none' }} />
      
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        documentsCount={documents.length}
      />
      
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: '256px' }}>
        <Header 
          activeTab={activeTab}
          selectedDocument={selectedDocument}
          documents={documents}
        />
        
        <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
          {isInitialLoading ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid rgba(59, 130, 246, 0.3)',
                borderTopColor: '#3b82f6',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Loading documents...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {tabComponents[activeTab]}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster toasts={toasts} />
    </div>
  )
}

export default App
