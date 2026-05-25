import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, CheckCircle, Loader, Lock } from 'lucide-react'
import type { PrintConfig } from './ConfigPanel'
import { useTheme } from '../contexts/ThemeContext'

interface PaymentPanelProps {
  config: PrintConfig
  pages: number
  fileName: string
  onPaymentComplete: (jobId: string) => void
}

type PayState = 'idle' | 'processing' | 'success' | 'failed'

export default function PaymentPanel({ config, pages, fileName, onPaymentComplete }: PaymentPanelProps) {
  const { dark } = useTheme()
  const border = dark ? '#fff' : '#000'
  const [payState, setPayState] = useState<PayState>('idle')
  const isMockPay = !import.meta.env.VITE_RAZORPAY_KEY

  const handlePay = async () => {
    setPayState('processing')
    if (isMockPay) {
      await new Promise(r => setTimeout(r, 2000))
      setPayState('success')
      const mockId = Math.random().toString(36).substr(2, 9).toUpperCase()
      setTimeout(() => onPaymentComplete(mockId), 800)
      return
    }
    try {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: Math.round(config.price * 100),
        currency: 'INR',
        name: 'PrintQueue Pro',
        description: `Print Job: ${fileName}`,
        handler: (response: { razorpay_payment_id: string }) => {
          setPayState('success')
          setTimeout(() => onPaymentComplete(response.razorpay_payment_id), 800)
        },
        theme: { color: '#FF00FF' },
      }
      // @ts-ignore
      const rzp = new window.Razorpay(options)
      rzp.open()
      setPayState('idle')
    } catch {
      setPayState('failed')
    }
  }

  return (
    <div>
      <div className="font-mono" style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: 24 }}>
        // PAYMENT CHECKOUT
      </div>

      {/* Order summary — always dark panel */}
      <div style={{ border: `4px solid ${border}`, background: '#0A0A0A', padding: '24px', marginBottom: 18 }}>
        <div className="font-mono" style={{ fontSize: '10px', letterSpacing: '0.18em', color: '#666', marginBottom: 16 }}>ORDER SUMMARY</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {[
            ['FILE', fileName],
            ['PAGES', `${pages}`],
            ['MODE', config.color ? 'COLOR' : 'B&W'],
            ['SIDES', config.duplex ? 'DOUBLE-SIDED' : 'SINGLE-SIDED'],
            ['COPIES', `${config.copies}`],
            ['PRIORITY', config.isPriority ? 'YES (+₹10)' : 'NO'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'Space Mono, monospace' }}>
              <span style={{ color: '#666' }}>{label}</span>
              <span style={{ color: '#00FFFF', fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '2px solid #222', marginTop: 16, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-mono" style={{ fontSize: '12px', color: '#888' }}>TOTAL DUE</span>
          <span className="font-display" style={{ fontSize: '44px', fontWeight: 900, color: '#FFFF00', lineHeight: 1 }}>
            ₹{config.price.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Demo mode notice */}
      {isMockPay && (
        <div style={{ border: `3px solid ${border}`, background: '#FFFF00', padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>⚡</span>
          <div className="font-mono" style={{ fontSize: '11px', fontWeight: 700, color: '#000', lineHeight: 1.5 }}>
            DEMO MODE — No Razorpay key. Payment auto-succeeds.<br />
            Add VITE_RAZORPAY_KEY to .env for live payments.
          </div>
        </div>
      )}

      {/* Pay button */}
      {payState === 'idle' && (
        <motion.button
          whileHover={{ x: -3, y: -3, boxShadow: '11px 11px 0px #00FFFF' }}
          whileTap={{ x: 4, y: 4, boxShadow: 'none' }}
          onClick={handlePay}
          style={{
            width: '100%',
            border: `4px solid ${border}`,
            boxShadow: `8px 8px 0px ${border === '#fff' ? '#00FFFF' : '#000'}`,
            background: '#00FFFF',
            color: '#000',
            padding: '20px',
            fontFamily: 'Major Mono Display, monospace',
            fontSize: '20px',
            fontWeight: 900,
            cursor: 'pointer',
            textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}
        >
          <CreditCard size={26} strokeWidth={3} />
          {isMockPay ? 'SIMULATE PAYMENT' : `PAY ₹${config.price.toFixed(2)}`}
        </motion.button>
      )}

      {/* Processing */}
      {payState === 'processing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ border: `4px solid ${border}`, background: '#000', color: '#00FFFF', padding: '32px', textAlign: 'center' }}
        >
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 16 }}>
            <Loader size={48} strokeWidth={2} />
          </motion.div>
          <div className="font-display" style={{ fontSize: '18px', letterSpacing: '0.04em', color: '#00FFFF' }}>
            PROCESSING PAYMENT<span className="anim-blink" style={{ color: '#00FFFF' }}>_</span>
          </div>
          <div className="font-mono" style={{ fontSize: '11px', color: '#555', marginTop: 8, letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Lock size={12} /> SECURE 256-BIT ENCRYPTION
          </div>
        </motion.div>
      )}

      {/* Success */}
      {payState === 'success' && (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ border: `4px solid ${border}`, background: '#00FF00', padding: '36px', textAlign: 'center' }}
        >
          <CheckCircle size={64} strokeWidth={2.5} style={{ margin: '0 auto 16px', display: 'block', color: '#000' }} />
          <div className="font-display" style={{ fontSize: '26px', fontWeight: 900, color: '#000' }}>PAYMENT CONFIRMED</div>
          <div className="font-mono" style={{ fontSize: '12px', marginTop: 8, color: '#004400' }}>YOUR JOB IS ENTERING THE QUEUE...</div>
        </motion.div>
      )}

      {/* Failed */}
      {payState === 'failed' && (
        <motion.div
          initial={{ x: -10 }}
          animate={{ x: 0 }}
          style={{ border: `4px solid ${border}`, background: '#FF00FF', padding: '24px' }}
        >
          <div className="font-display" style={{ fontSize: '20px', marginBottom: 10, color: '#000' }}>!! PAYMENT FAILED !!</div>
          <div className="font-mono" style={{ fontSize: '13px', marginBottom: 16, color: '#111' }}>Something went wrong. Please try again.</div>
          <button
            onClick={() => setPayState('idle')}
            style={{ border: '3px solid #000', background: '#000', color: '#fff', padding: '10px 22px', fontFamily: 'Major Mono Display, monospace', fontSize: '13px', cursor: 'pointer', fontWeight: 900 }}
          >
            RETRY
          </button>
        </motion.div>
      )}
    </div>
  )
}
