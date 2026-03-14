import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share, Smartphone, Plus, MoreVertical } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [platform, setPlatform] = useState('unknown') // 'ios', 'android', 'desktop'

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent || ''
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      setPlatform('ios')
    } else if (/android/i.test(ua)) {
      setPlatform('android')
    } else {
      setPlatform('desktop')
    }

    // Listen for the native install prompt (Chrome/Edge/Android)
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show our custom banner
      const dismissed = localStorage.getItem('install_dismissed')
      if (!dismissed) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed
    const mq = window.matchMedia('(display-mode: standalone)')
    if (mq.matches || window.navigator.standalone) {
      setShowBanner(false)
      return
    }

    // For iOS, show banner after delay (no beforeinstallprompt event)
    const timer = setTimeout(() => {
      if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        const dismissed = localStorage.getItem('install_dismissed')
        if (!dismissed) setShowBanner(true)
      }
    }, 3000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native prompt available (Android/Chrome)
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
      }
      setDeferredPrompt(null)
    } else {
      // Show manual instructions
      setShowInstructions(true)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('install_dismissed', 'true')
  }

  if (!showBanner) return null

  return (
    <>
      {/* Install banner */}
      <AnimatePresence>
        {showBanner && !showInstructions && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              width: 'calc(100% - 2rem)',
              maxWidth: '420px',
              borderRadius: '16px',
              background: 'rgba(10, 22, 40, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '1rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <button
              onClick={handleDismiss}
              style={{
                position: 'absolute', top: '0.5rem', right: '0.5rem',
                background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', padding: '0.25rem',
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Smartphone style={{ width: 24, height: 24, color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Add The Magician to Home Screen
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Get the full experience with faster loads and no browser bar
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                onClick={handleDismiss}
                style={{
                  flex: 1, padding: '0.625rem',
                  borderRadius: '10px', border: '1px solid rgba(100, 116, 139, 0.3)',
                  background: 'transparent', color: '#94a3b8',
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                }}
              >
                Not now
              </button>
              <button
                onClick={handleInstallClick}
                className="btn-primary"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '0.375rem', fontSize: '0.85rem', padding: '0.625rem',
                }}
              >
                <Download style={{ width: 16, height: 16 }} />
                {deferredPrompt ? 'Install' : 'Show Me How'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInstructions(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1001,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '400px',
                borderRadius: '20px',
                background: 'rgba(10, 22, 40, 0.98)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '1.5rem',
                maxHeight: '80vh', overflow: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'white', fontSize: '1.25rem' }}>
                  Add to Home Screen
                </h3>
                <button
                  onClick={() => setShowInstructions(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X style={{ width: 20, height: 20 }} />
                </button>
              </div>

              {platform === 'ios' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Follow these steps in Safari:
                  </p>
                  <Step number={1} icon="⬆️" title="Tap the Share button" desc="It's at the bottom of Safari (the square with an arrow pointing up)" />
                  <Step number={2} icon="📜" title="Scroll down" desc="Scroll through the share sheet options" />
                  <Step number={3} icon="➕" title='Tap "Add to Home Screen"' desc="You'll see the app name and icon" />
                  <Step number={4} icon="✅" title='Tap "Add"' desc="The app will appear on your home screen!" />
                </div>
              ) : platform === 'android' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Follow these steps in Chrome:
                  </p>
                  <Step number={1} icon="⋮" title="Tap the menu button" desc="Three dots in the top-right corner of Chrome" />
                  <Step number={2} icon="📲" title={"Tap \"Install App\""} desc={"Or \"Add to Home Screen\" if you don't see Install App"} />
                  <Step number={3} icon="✅" title='Tap "Install"' desc="The app will be added to your home screen!" />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    In Chrome or Edge:
                  </p>
                  <Step number={1} icon="🔗" title="Look for the install icon" desc="In the address bar, look for a monitor/phone icon or install button" />
                  <Step number={2} icon="📲" title='Click "Install"' desc="A dialog will appear asking to install the app" />
                  <Step number={3} icon="✅" title="Confirm" desc="The app will open in its own window!" />
                </div>
              )}

              <button
                onClick={() => setShowInstructions(false)}
                className="btn-primary"
                style={{ width: '100%', marginTop: '1.25rem', textAlign: 'center' }}
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Step({ number, icon, title, desc }) {
  return (
    <div style={{
      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
      padding: '0.75rem',
      borderRadius: '12px',
      background: 'rgba(30, 58, 95, 0.3)',
      border: '1px solid rgba(100, 116, 139, 0.15)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(59, 130, 246, 0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
          {number}. {title}
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.4 }}>{desc}</p>
      </div>
    </div>
  )
}
