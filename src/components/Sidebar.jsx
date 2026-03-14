import { motion } from 'framer-motion'
import {
  MessageSquare,
  Sparkles,
  Building2,
  FolderOpen,
  Zap,
  FileSpreadsheet
} from 'lucide-react'

const navItems = [
  { id: 'chat', icon: MessageSquare, label: 'Chat', description: 'Query documents' },
  { id: 'extract', icon: Sparkles, label: 'Extract', description: 'Extract data' },
  { id: 'pdf-extract', icon: FileSpreadsheet, label: 'PDF to Excel', description: 'Extract & export' },
  { id: 'edgar', icon: Building2, label: 'EDGAR', description: 'SEC filings' },
  { id: 'documents', icon: FolderOpen, label: 'Documents', description: 'Manage files' },
]

export default function Sidebar({ activeTab, setActiveTab, documentsCount }) {
  return (
    <aside 
      className="glass"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: '256px',
        borderRight: '1px solid rgba(100, 116, 139, 0.3)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div style={{ 
        padding: '1.5rem', 
        borderBottom: '1px solid rgba(100, 116, 139, 0.2)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(to bottom right, #3b82f6, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
          }}>
            <Zap style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <div>
            <h1 style={{ 
              fontFamily: 'Outfit, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'white',
            }}>Agentic</h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Document Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <motion.button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: isActive ? 'white' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                whileHover={{ 
                  scale: 1.02,
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(10, 22, 40, 0.5)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? '#3b82f6' : 'rgba(10, 22, 40, 0.5)',
                  color: isActive ? 'white' : '#94a3b8',
                }}>
                  <Icon style={{ width: '20px', height: '20px' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ 
                    fontWeight: 500, 
                    fontSize: '0.875rem',
                    color: isActive ? 'white' : '#e2e8f0',
                  }}>{item.label}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.description}</p>
                </div>
                {item.id === 'documents' && documentsCount > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 500,
                  }}>
                    {documentsCount}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </nav>

      {/* Status indicator */}
      <div style={{ 
        padding: '1rem', 
        borderTop: '1px solid rgba(100, 116, 139, 0.2)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="pulse-ring" style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
          }} />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Connected to API</span>
        </div>
      </div>
    </aside>
  )
}
