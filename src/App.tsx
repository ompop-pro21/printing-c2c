import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, WifiOff, LogOut, Settings, Sun, Moon, RotateCcw, User } from 'lucide-react'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthGate from './components/AuthGate'
import UserProfile from './components/UserProfile'
import UploadZone from './components/UploadZone'
import ConfigPanel, { type PrintConfig } from './components/ConfigPanel'
import PaymentPanel from './components/PaymentPanel'
import QueueDashboard from './components/QueueDashboard'
import AdminPanel from './components/AdminPanel'
import { createJob, uploadPDF, isMockMode, createReceipt } from './lib/supabase'
import type { PrintJob } from './lib/supabase'
import './index.css'

type Step = 'upload' | 'config' | 'payment' | 'queue'
const STEP_ORDER: Step[] = ['upload', 'config', 'payment', 'queue']
const STEP_LABELS: Record<Step, string> = {
  upload: '01 UPLOAD',
  config: '02 CONFIG',
  payment: '03 PAYMENT',
  queue: '04 QUEUE',
}

const stepVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 280 : -280, scale: 0.88, opacity: 0 }),
  center: { x: 0, scale: 1, opacity: 1 },
  exit:   (dir: number) => ({ x: dir < 0 ? 280 : -280, scale: 0.88, opacity: 0 }),
}

function PrintQueueLogo({ size = 36 }: { size?: number }) {
  const { dark } = useTheme()
  const fg = dark ? '#000' : '#fff'
  const bg = dark ? '#FFFFFF' : '#000000'
  const accent = '#FF00FF'
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" fill={bg} />
      <rect x="5" y="14" width="26" height="14" rx="0" fill={fg} />
      <rect x="9" y="8" width="18" height="8" rx="0" fill={fg} />
      <rect x="11" y="24" width="14" height="3" rx="0" fill={bg} />
      <rect x="13" y="22" width="10" height="6" rx="0" fill={accent} />
      <rect x="24" y="17" width="4" height="4" rx="0" fill={accent} />
      <path d="M16 10 L13 14 L16 14 L14 18 L19 13 L16 13 Z" fill={accent} />
    </svg>
  )
}

export function PrinterOfflineScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--bg)' }}>
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} style={{ marginBottom: 32 }}>
        <WifiOff size={80} strokeWidth={2} color="#FF00FF" />
      </motion.div>
      <div className="font-display" style={{ fontSize: '40px', fontWeight: 900, textAlign: 'center', marginBottom: 16, lineHeight: 1, color: 'var(--text-primary)' }}>
        PRINTER<br /><span style={{ color: '#FF00FF' }}>OFFLINE.</span>
      </div>
      <div style={{ border: '4px solid var(--border)', boxShadow: '6px 6px 0px #FF00FF', background: '#FF00FF', padding: '16px 28px', maxWidth: 480, textAlign: 'center' }}>
        <div className="font-mono" style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em', color: '#000' }}>
          THE PHYSICAL PRINTER IS CURRENTLY UNAVAILABLE.<br />
          THE LOCAL PRINT DAEMON IS NOT CONNECTED.<br />
          PLEASE CONTACT COUNTER STAFF OR TRY AGAIN LATER.
        </div>
      </div>
      <div className="font-mono" style={{ marginTop: 24, fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        STATUS CODE: ERR_PRINTER_OFFLINE
      </div>
    </div>
  )
}

function SessionExpiredScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--bg)' }}>
      <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ marginBottom: 32 }}>
        <LogOut size={80} strokeWidth={2} color="#FFFF00" />
      </motion.div>
      <div className="font-display" style={{ fontSize: '40px', fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 16, lineHeight: 1 }}>
        SESSION<br /><span style={{ color: '#FFFF00' }}>EXPIRED.</span>
      </div>
      <div style={{ border: '4px solid var(--border)', boxShadow: '6px 6px 0px #FFFF00', background: '#111', padding: '16px 28px', maxWidth: 480, textAlign: 'center', marginBottom: 28 }}>
        <div className="font-mono" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: '#FFFF00' }}>
          YOUR SESSION HAS TIMED OUT FOR SECURITY.<br />
          ANY PENDING PAYMENT WILL BE REFUNDED.<br />
          PLEASE RECONNECT TO CONTINUE.
        </div>
      </div>
      <motion.button
        whileHover={{ x: -3, y: -3, boxShadow: '11px 11px 0px #FFFF00' }}
        whileTap={{ x: 4, y: 4, boxShadow: 'none' }}
        onClick={onRetry}
        style={{ border: '4px solid var(--border)', boxShadow: '8px 8px 0px #FFFF00', background: '#FFFF00', color: '#000', padding: '16px 40px', fontFamily: 'Major Mono Display, monospace', fontSize: '18px', fontWeight: 900, cursor: 'pointer' }}
      >
        RECONNECT
      </motion.button>
    </div>
  )
}

function AppInner() {
  const { dark, toggle } = useTheme()
  const { user, profile } = useAuth()
  
  const [step, setStep] = useState<Step>('upload')
  const [direction, setDirection] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState(1)
  const [config, setConfig] = useState<PrintConfig | null>(null)
  const [job, setJob] = useState<PrintJob | null>(null)
  const [jobId, setJobId] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const border = dark ? '#fff' : '#000'

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        if (profile?.role === 'admin' || isMockMode) {
          setShowAdmin(p => !p)
        }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [profile])

  const goTo = useCallback((next: Step) => {
    const curr = STEP_ORDER.indexOf(step)
    const nxt  = STEP_ORDER.indexOf(next)
    setDirection(nxt > curr ? 1 : -1)
    setStep(next)
  }, [step])

  const handleHome = useCallback(() => {
    setFile(null)
    setPages(1)
    setConfig(null)
    setJob(null)
    setJobId('')
    setDirection(-1)
    setStep('upload')
  }, [])

  const handleUploadMore = useCallback(() => {
    setFile(null)
    setPages(1)
    setConfig(null)
    setDirection(-1)
    setStep('upload')
  }, [])

  const handleUploadComplete = useCallback((f: File, p: number) => {
    setFile(f)
    setPages(p)
    setTimeout(() => goTo('config'), 500)
  }, [goTo])

  const handleConfigConfirm = useCallback((cfg: PrintConfig) => {
    setConfig(cfg)
    goTo('payment')
  }, [goTo])

  const handlePaymentComplete = useCallback(async (paymentId: string) => {
    if (!file || !config) return
    const userId = profile?.id || user?.id || 'mock_user'
    
    try {
      const fileUrl = await uploadPDF(file, userId)
      const newJob  = await createJob({
        user_id: userId,
        file_url: fileUrl,
        file_name: file.name,
        pages,
        color: config.color,
        duplex: config.duplex,
        copies: config.copies,
        is_priority: config.isPriority,
        status: 'queued',
        price: config.price,
        current_page: 0,
      })
      
      await createReceipt({
        job_id: newJob.id,
        user_id: userId,
        payment_id: paymentId,
        amount: config.price,
        method: 'razorpay',
        file_name: file.name,
        pages,
        config_color: config.color,
        config_duplex: config.duplex,
        config_copies: config.copies,
        config_priority: config.isPriority,
      })

      setJob(newJob)
      setJobId(newJob.id)
      goTo('queue')
    } catch {
      const mockJob: PrintJob = {
        id: paymentId.toUpperCase(),
        user_id: userId,
        file_url: '',
        file_name: file.name,
        pages,
        color: config.color,
        duplex: config.duplex,
        copies: config.copies,
        is_priority: config.isPriority,
        status: 'queued',
        price: config.price,
        queue_position: 2,
        created_at: new Date().toISOString(),
      }
      
      await createReceipt({
        job_id: mockJob.id,
        user_id: userId,
        payment_id: paymentId,
        amount: config.price,
        method: 'razorpay',
        file_name: file.name,
        pages,
        config_color: config.color,
        config_duplex: config.duplex,
        config_copies: config.copies,
        config_priority: config.isPriority,
      })

      setJob(mockJob)
      setJobId(paymentId.toUpperCase())
      goTo('queue')
    }
  }, [file, config, pages, goTo, profile, user])

  const currentIdx = STEP_ORDER.indexOf(step)

  if (sessionExpired) return <SessionExpiredScreen onRetry={() => setSessionExpired(false)} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)', transition: 'background 0.25s, color 0.25s' }}>
      <AnimatePresence>
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
        {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
      </AnimatePresence>

      <div style={{ background: '#FF00FF', borderBottom: `4px solid ${border}`, overflow: 'hidden', height: 30, display: 'flex', alignItems: 'center' }}>
        <div className="marquee-inner" style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#000' }}>
          {'// PRINTQUEUE PRO ⚡ FAST · RELIABLE · BRUTAL // UPLOAD · CONFIGURE · PAY · PRINT // NEO-BRUTALIST PRINTING FOR THE MODERN AGE // '.repeat(6)}
        </div>
      </div>

      <header style={{
        borderBottom: `4px solid ${border}`,
        padding: '14px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        gap: 12,
        flexWrap: 'wrap',
        boxShadow: dark ? '0 4px 0 #fff' : '0 4px 0 #000',
      }}>
        <button
          onClick={handleHome}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: 0 }}
          title="Go Home"
        >
          <PrintQueueLogo size={36} />
          <div>
            <div className="font-display" style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--text-primary)' }}>
              PRINT<span style={{ color: '#FF00FF' }}>QUEUE</span> PRO
            </div>
            <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.18em' }}>
              {isMockMode ? '⚡ DEMO MODE' : '🔴 LIVE'}
            </div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          {STEP_ORDER.map((s, i) => {
            const done   = i < currentIdx
            const active = i === currentIdx
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{
                  border: `3px solid ${border}`,
                  background: active ? '#FF00FF' : done ? 'var(--text-primary)' : 'var(--surface)',
                  color: active ? '#000' : done ? 'var(--bg)' : 'var(--text-muted)',
                  padding: '3px 10px',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}>
                  {done ? '✓ ' : ''}{STEP_LABELS[s]}
                </div>
                {i < STEP_ORDER.length - 1 && (
                  <ChevronRight size={14} strokeWidth={3} color="var(--text-faint)" />
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={toggle}
            className="theme-toggle"
            title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ border: `3px solid ${border}`, background: 'var(--surface)', color: 'var(--text-primary)', padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', fontSize: '16px' }}
          >
            {dark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
          </button>
          
          {profile?.role === 'admin' && (
            <button
              onClick={() => setShowAdmin(true)}
              title="Admin Panel"
              style={{ border: `3px solid ${border}`, background: 'var(--surface)', color: 'var(--text-primary)', padding: '7px 10px', cursor: 'pointer', display: 'flex' }}
            >
              <Settings size={18} strokeWidth={2.5} />
            </button>
          )}

          <button
            onClick={() => setShowProfile(true)}
            title="User Profile"
            style={{ border: `3px solid ${border}`, background: 'var(--surface)', color: 'var(--text-primary)', padding: '7px 10px', cursor: 'pointer', display: 'flex' }}
          >
            <User size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '44px 20px 80px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            style={{ marginBottom: 32 }}
          >
            <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.22em', marginBottom: 6 }}>
              STEP {currentIdx + 1} OF {STEP_ORDER.length}
            </div>
            <div className="font-display" style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              {step === 'upload'  && <>DROP YOUR<br /><span style={{ color: '#FF00FF' }}>PDF HERE.</span></>}
              {step === 'config'  && <>CONFIGURE<br /><span style={{ color: '#00FFFF' }}>YOUR JOB.</span></>}
              {step === 'payment' && <>SEAL THE<br /><span style={{ color: '#FFFF00' }}>DEAL.</span></>}
              {step === 'queue'   && <>YOU'RE IN<br /><span style={{ color: '#00FF00' }}>THE QUEUE.</span></>}
            </div>

            <div style={{ height: 7, background: 'var(--bg-inset)', marginTop: 20, border: `2px solid ${border}`, position: 'relative', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${((currentIdx + 1) / STEP_ORDER.length) * 100}%` }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{ height: '100%', background: '#FF00FF', position: 'absolute', left: 0, top: 0 }}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 380, damping: 34 },
              scale: { duration: 0.22 },
              opacity: { duration: 0.18 },
            }}
          >
            {step === 'upload' && (
              <UploadZone onUploadComplete={handleUploadComplete} />
            )}
            {step === 'config' && file && (
              <ConfigPanel pages={pages} onConfirm={handleConfigConfirm} />
            )}
            {step === 'payment' && config && file && (
              <PaymentPanel
                config={config}
                pages={pages}
                fileName={file.name}
                onPaymentComplete={handlePaymentComplete}
              />
            )}
            {step === 'queue' && job && (
              <QueueDashboard
                jobId={jobId}
                initialJob={job}
                onHome={handleHome}
                onUploadMore={handleUploadMore}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {currentIdx > 0 && step !== 'queue' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => goTo(STEP_ORDER[currentIdx - 1])}
            style={{
              marginTop: 20,
              border: `3px solid ${border}`,
              background: 'transparent',
              color: 'var(--text-primary)',
              padding: '8px 18px',
              cursor: 'pointer',
              fontFamily: 'Space Mono, monospace',
              fontSize: '12px',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← BACK
          </motion.button>
        )}

        {(step === 'config' || step === 'payment') && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleUploadMore}
            style={{
              marginTop: 12,
              border: `3px solid ${border}`,
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              padding: '8px 18px',
              cursor: 'pointer',
              fontFamily: 'Space Mono, monospace',
              fontSize: '11px',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: step === 'config' ? 0 : 8,
            }}
          >
            <RotateCcw size={14} strokeWidth={3} /> UPLOAD DIFFERENT FILE
          </motion.button>
        )}
      </main>

      <div className="ticket-stripe" />
      <footer style={{
        borderTop: `4px solid ${border}`,
        padding: '14px 28px',
        background: 'var(--panel-dark-bg)',
        color: 'var(--panel-dark-muted)',
        fontFamily: 'Space Mono, monospace',
        fontSize: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        letterSpacing: '0.1em',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ color: '#666' }}>PRINTQUEUE PRO © 2026</span>
        <span style={{ color: '#555' }}>CLOUD-TO-LOCAL PRINT ARCHITECTURE</span>
        <span style={{ color: '#555' }}>CTRL+SHIFT+A → ADMIN</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <AppInner />
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  )
}
