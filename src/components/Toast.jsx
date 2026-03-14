import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const colors = {
  success: { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.3)', icon: '#34d399' },
  error: { bg: 'rgba(244, 63, 94, 0.2)', border: 'rgba(244, 63, 94, 0.3)', icon: '#fb7185' },
  warning: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.3)', icon: '#fbbf24' },
  info: { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.3)', icon: '#60a5fa' },
}

export function Toaster({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || icons.info
          const color = colors[toast.type] || colors.info

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="glass"
              style={{
                background: color.bg,
                border: `1px solid ${color.border}`,
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                minWidth: '300px',
              }}
            >
              <Icon style={{ width: '20px', height: '20px', color: color.icon, flexShrink: 0 }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>{toast.message}</p>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
