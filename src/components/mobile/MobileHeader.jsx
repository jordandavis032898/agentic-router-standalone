import { Sun, Moon, Zap } from 'lucide-react'
import { useTheme } from '../../ThemeContext'

export default function MobileHeader() {
  const { isDark, toggle } = useTheme()

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '48px',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      borderBottom: '1px solid var(--border-secondary)',
      background: isDark
        ? 'rgba(10, 22, 40, 0.92)'
        : 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    }}>
      {/* Left: Logo + App Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
        }}>
          <Zap style={{ width: '16px', height: '16px', color: 'white' }} />
        </div>
        <span style={{
          fontFamily: 'Outfit, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '0.95rem',
          color: 'var(--text-primary)',
          letterSpacing: '0.02em',
        }}>
          ACCELERATE 79ERS
        </span>
      </div>

      {/* Right: Theme toggle + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: '1px solid var(--border-secondary)',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isDark ? (
            <Moon style={{ width: 18, height: 18, color: '#6366f1' }} />
          ) : (
            <Sun style={{ width: 18, height: 18, color: '#f59e0b' }} />
          )}
        </button>

        {/* User Avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}>
          JD
        </div>
      </div>
    </header>
  )
}
