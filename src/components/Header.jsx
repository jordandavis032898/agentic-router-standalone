import { FileText, ChevronRight } from 'lucide-react'

const tabTitles = {
  chat: { title: 'Document Chat', subtitle: 'Ask questions about your documents' },
  extract: { title: 'Data Extraction', subtitle: 'Extract structured information from documents' },
  edgar: { title: 'EDGAR SEC Filings', subtitle: 'Search and analyze SEC filings' },
  charts: { title: 'Financial Charts', subtitle: 'Kid-friendly visualizations of company data' },
  reportcard: { title: 'Report Card', subtitle: 'Data quality and accuracy grades' },
  documents: { title: 'Document Library', subtitle: 'Upload and manage your documents' },
}

export default function Header({ activeTab, selectedDocument, documents }) {
  const { title, subtitle } = tabTitles[activeTab] || tabTitles.documents

  return (
    <header
      className="glass"
      style={{
        borderBottom: '1px solid var(--border-secondary)',
        padding: '1rem 1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            marginBottom: '0.25rem',
          }}>
            <span>Workspace</span>
            <ChevronRight style={{ width: '16px', height: '16px' }} />
            <span style={{ color: 'var(--text-primary)' }}>{title}</span>
          </div>
          <h2 style={{
            fontFamily: 'Outfit, system-ui, sans-serif',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>{title}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{subtitle}</p>
        </div>

        {selectedDocument && documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument) && (
          <div
            className="glass-light"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1rem',
              borderRadius: '12px',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileText style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
            </div>
            <div>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {(documents.find(d => d.file_id === selectedDocument || d.hash === selectedDocument))?.title || 'Document'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active document</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
