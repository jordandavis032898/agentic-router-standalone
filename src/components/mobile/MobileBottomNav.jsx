import { Newspaper, Building2 } from 'lucide-react'
import { useTheme } from '../../ThemeContext'

const tabs = [
  { id: 'news', icon: Newspaper, label: 'News' },
  { id: 'company', icon: Building2, label: 'Company' },
]

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  const { isDark } = useTheme()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '56px',
      zIndex: 50,
      display: 'flex',
      alignItems: 'stretch',
      borderTop: '1px solid var(--border-secondary)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: isDark
        ? 'rgba(10, 22, 40, 0.95)'
        : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.2rem',
              border: 'none',
              background: 'transparent',
              color: isActive ? '#f59e0b' : 'var(--text-muted)',
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
              minHeight: '44px',
              transition: 'color 0.2s',
            }}
          >
            {/* Active top border */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '20%',
                right: '20%',
                height: '2.5px',
                borderRadius: '0 0 2px 2px',
                background: '#f59e0b',
              }} />
            )}
            <Icon style={{ width: 22, height: 22 }} />
            <span style={{
              fontSize: '0.7rem',
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1,
              letterSpacing: '0.02em',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
