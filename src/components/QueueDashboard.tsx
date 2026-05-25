import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Printer, Zap, Clock, Users, Home, Upload, CheckCircle } from 'lucide-react'
import SnakeGame from './SnakeGame'
import { getAllJobs, subscribeToJob, isMockMode } from '../lib/supabase'
import type { PrintJob } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'

interface QueueDashboardProps {
  jobId: string
  initialJob: PrintJob
  onHome: () => void
  onUploadMore: () => void
}

const STEPS = ['UPLOADED', 'VERIFIED', 'IN QUEUE', 'PRINTING', 'DONE'] as const
type Step = typeof STEPS[number]

function statusToStep(s: PrintJob['status']): Step {
  switch (s) {
    case 'uploading':  return 'UPLOADED'
    case 'verifying':  return 'VERIFIED'
    case 'queued':     return 'IN QUEUE'
    case 'printing':   return 'PRINTING'
    case 'complete':   return 'DONE'
    default:           return 'UPLOADED'
  }
}

// ── Animated printer illustration ─────────────────────────────────────────────
function PrinterAnimation({ printing }: { printing: boolean }) {
  const { dark } = useTheme()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!printing) return
    const t = setInterval(() => setTick(n => n + 1), 700)
    return () => clearInterval(t)
  }, [printing])

  const panelBg  = dark ? '#1a1a1a' : '#111'
  const bodyBg   = dark ? '#2a2a2a' : '#1e1e1e'
  const bodyBorder = dark ? '#555' : '#444'

  return (
    <div style={{ position: 'relative', width: '100%', height: 160, background: panelBg, overflow: 'hidden' }}>
      {/* Printer body */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 170, height: 80,
        background: bodyBg,
        border: `4px solid ${bodyBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Bottom paper slot */}
        <div style={{ position: 'absolute', bottom: -4, left: 18, right: 18, height: 10, background: '#222', border: `2px solid ${bodyBorder}`, overflow: 'hidden' }}>
          {printing && (
            <motion.div
              animate={{ x: ['110%', '-20%'] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              style={{ height: '100%', width: 56, background: '#fff', position: 'absolute' }}
            />
          )}
        </div>
        {/* Top feed */}
        <div style={{ position: 'absolute', top: -4, left: 28, right: 28, height: 7, background: '#222', border: `2px solid ${bodyBorder}`, overflow: 'hidden' }}>
          {printing && (
            <motion.div
              animate={{ x: ['-20%', '110%'] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear', delay: 0.45 }}
              style={{ height: '100%', width: 40, background: '#eee', position: 'absolute' }}
            />
          )}
        </div>
        {/* LED */}
        <motion.div
          animate={printing
            ? { background: ['#00FF00', '#009900', '#00FF00'], scale: [1, 1.25, 1] }
            : { background: '#003300' }}
          transition={{ duration: 0.7, repeat: Infinity }}
          style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #000', position: 'absolute', top: 8, right: 10 }}
        />
        <Printer size={40} strokeWidth={1.5} style={{ color: printing ? '#00FFFF' : '#666' }} />
      </div>

      {/* Steam puffs */}
      {printing && [0, 1, 2, 3].map(i => (
        <motion.div
          key={`st-${i}-${tick}`}
          initial={{ opacity: 0.9, y: 0, x: 58 + i * 14, scale: 1 }}
          animate={{ opacity: 0, y: -42, x: 58 + i * 14 + (i % 2 === 0 ? 8 : -8), scale: 2 }}
          transition={{ duration: 1.1, delay: i * 0.18 }}
          style={{ position: 'absolute', bottom: 95, width: 7, height: 12, background: '#00FFFF', borderRadius: 3 }}
        />
      ))}

      {/* Sparks */}
      {printing && [0, 1, 2].map(i => (
        <motion.div
          key={`sp-${i}-${tick}`}
          initial={{ opacity: 1, x: 85, y: 82 }}
          animate={{ opacity: 0, x: 85 + (i % 2 === 0 ? 1 : -1) * (20 + i * 16), y: 82 - (28 + i * 12) }}
          transition={{ duration: 0.5, delay: i * 0.12 }}
          style={{ position: 'absolute', width: 5, height: 5, background: '#FFFF00', clipPath: 'polygon(50% 0%,0% 100%,100% 100%)' }}
        />
      ))}

      {/* Scanlines */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent 0px,transparent 3px,rgba(0,255,255,0.03) 3px,rgba(0,255,255,0.04) 4px)', pointerEvents: 'none' }} />
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function QueueTimeline({ step }: { step: Step }) {
  const { dark } = useTheme()
  const border = dark ? '#fff' : '#000'
  const currentIdx = STEPS.indexOf(step)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
      {STEPS.map((s, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <motion.div
              animate={active ? {
                boxShadow: [`4px 4px 0px #FF00FF`, `4px 4px 0px #00FFFF`, `4px 4px 0px #FF00FF`],
                scale: [1, 1.04, 1],
              } : {}}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                border: `3px solid ${border}`,
                background: done ? 'var(--text-primary)' : active ? '#FF00FF' : 'var(--surface)',
                color: done ? 'var(--bg)' : active ? '#000' : 'var(--text-muted)',
                padding: '7px 11px',
                fontFamily: 'Space Mono, monospace',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              {done ? '✓ ' : active ? '► ' : ''}{s}
            </motion.div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 20, height: 4, background: done ? 'var(--text-primary)' : 'var(--border-soft)', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function QueueDashboard({ jobId, initialJob, onHome, onUploadMore }: QueueDashboardProps) {
  const { dark } = useTheme()
  const border    = dark ? '#fff' : '#000'

  const [job, setJob]           = useState<PrintJob>(initialJob)
  const [allJobs, setAllJobs]   = useState<PrintJob[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [flash, setFlash]       = useState(false)

  const step       = statusToStep(job.status)
  const isPrinting = job.status === 'printing'
  const isDone     = job.status === 'complete'

  useEffect(() => {
    getAllJobs().then(setAllJobs)
    if (isMockMode) {
      const seq: PrintJob['status'][] = ['verifying', 'queued', 'printing', 'complete']
      let idx = 0
      const t = setInterval(() => {
        if (idx >= seq.length) { clearInterval(t); return }
        setJob(prev => ({ ...prev, status: seq[idx], queue_position: Math.max(1, prev.queue_position - 1) }))
        idx++
      }, 4000)
      return () => clearInterval(t)
    } else {
      return subscribeToJob(jobId, setJob)
    }
  }, [jobId])

  useEffect(() => {
    if (!isPrinting) return
    const t = setInterval(() => {
      setCurrentPage(p => Math.min(p + 1, job.pages))
      setFlash(f => !f)
    }, 1100)
    return () => clearInterval(t)
  }, [isPrinting, job.pages])

  const eta = (pos: number, p: number) => `~${Math.ceil((pos - 1) * 2 + p * 0.1)}min`

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── Job status card ── */}
      <div style={{ border: `4px solid ${border}`, boxShadow: '8px 8px 0px #FF00FF', background: '#0A0A0A', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="font-mono" style={{ fontSize: '10px', color: '#666', letterSpacing: '0.18em', marginBottom: 4 }}>YOUR JOB ID</div>
            <div className="font-display" style={{ fontSize: '26px', fontWeight: 900, color: '#FF00FF' }}>#{jobId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontSize: '10px', color: '#666', letterSpacing: '0.18em', marginBottom: 4 }}>QUEUE POSITION</div>
            <motion.div
              key={job.queue_position}
              initial={{ scale: 1.3, color: '#FFFF00' }}
              animate={{ scale: 1, color: '#fff' }}
              className="font-display"
              style={{ fontSize: '26px', fontWeight: 900 }}
            >
              {job.status === 'printing' ? '▶ NOW' : `#${job.queue_position}`}
            </motion.div>
          </div>
          {job.is_priority && (
            <div style={{ background: '#FFFF00', color: '#000', border: `3px solid ${border}`, padding: '4px 12px', fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} strokeWidth={3} fill="#000" /> PRIORITY
            </div>
          )}
        </div>
        <QueueTimeline step={step} />
      </div>

      {/* ── Printer live view ── */}
      <div style={{ border: `4px solid ${border}`, background: '#000', overflow: 'hidden' }}>
        {/* Panel header */}
        <div style={{
          background: isPrinting ? '#FF00FF' : isDone ? '#00FF00' : '#111',
          borderBottom: `4px solid ${border}`,
          padding: '10px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div className="font-display" style={{ fontSize: '12px', color: isPrinting || isDone ? '#000' : '#fff', letterSpacing: '0.05em' }}>
            LIVE PRINTER STATUS
          </div>
          <motion.div
            animate={isPrinting ? { opacity: [1, 0, 1] } : { opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{
              background: isPrinting ? '#000' : isDone ? '#000' : '#222',
              color: isPrinting ? '#FF00FF' : isDone ? '#00FF00' : '#666',
              padding: '2px 10px',
              fontFamily: 'Space Mono, monospace',
              fontSize: '10px', fontWeight: 700,
              border: `2px solid ${isPrinting || isDone ? border : '#444'}`,
            }}
          >
            {isPrinting ? '● PRINTING' : isDone ? '✓ DONE' : '○ IDLE'}
          </motion.div>
        </div>

        <PrinterAnimation printing={isPrinting} />

        {/* Page counter flash */}
        {isPrinting && (
          <AnimatePresence>
            <motion.div
              key={`p${currentPage}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '14px 20px',
                background: flash ? '#FF00FF' : '#000',
                borderTop: '4px solid #FF00FF',
                transition: 'background 0.18s',
              }}
            >
              <div className="font-display" style={{ fontSize: '17px', fontWeight: 900, color: flash ? '#000' : '#FF00FF', letterSpacing: '0.02em' }}>
                PAGE {currentPage}/{job.pages}: SPITTING FIRE 🔥
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Complete panel */}
        {isDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: '28px', background: '#00FF00', borderTop: `4px solid ${border}`, textAlign: 'center' }}
          >
            <CheckCircle size={52} strokeWidth={2.5} style={{ margin: '0 auto 12px', display: 'block', color: '#000' }} />
            <div className="font-display" style={{ fontSize: '24px', fontWeight: 900, color: '#000' }}>
              ✓ PRINT JOB COMPLETE!
            </div>
            <div className="font-mono" style={{ fontSize: '12px', marginTop: 6, color: '#004400' }}>
              COLLECT YOUR DOCUMENT FROM THE PRINTER
            </div>

            {/* Action buttons after completion */}
            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ x: -2, y: -2, boxShadow: '6px 6px 0px #000' }}
                whileTap={{ x: 2, y: 2, boxShadow: 'none' }}
                onClick={onHome}
                style={{
                  border: `4px solid #000`, boxShadow: '4px 4px 0px #000',
                  background: '#000', color: '#00FF00',
                  padding: '14px 28px',
                  fontFamily: 'Major Mono Display, monospace', fontSize: '15px', fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <Home size={20} strokeWidth={3} /> HOME
              </motion.button>
              <motion.button
                whileHover={{ x: -2, y: -2, boxShadow: '6px 6px 0px #000' }}
                whileTap={{ x: 2, y: 2, boxShadow: 'none' }}
                onClick={onUploadMore}
                style={{
                  border: `4px solid #000`, boxShadow: '4px 4px 0px #000',
                  background: '#FFFF00', color: '#000',
                  padding: '14px 28px',
                  fontFamily: 'Major Mono Display, monospace', fontSize: '15px', fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <Upload size={20} strokeWidth={3} /> PRINT MORE
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Live queue table ── */}
      <div style={{ border: `4px solid ${border}`, boxShadow: `8px 8px 0px ${border}` }}>
        <div style={{
          background: dark ? '#1a1a1a' : '#000',
          color: '#fff',
          padding: '12px 20px',
          borderBottom: `4px solid ${border}`,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <Users size={18} strokeWidth={2.5} />
          <div className="font-display" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>LIVE QUEUE</div>
        </div>
        <div style={{ overflowX: 'auto', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Space Mono, monospace', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-alt)', borderBottom: `3px solid ${border}` }}>
                {['POS', 'JOB ID', 'FILE', 'PAGES', 'MODE', 'PRI', 'ETA', 'STATUS'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allJobs.map((j, i) => (
                <tr
                  key={j.id}
                  style={{
                    borderBottom: `2px solid var(--border-soft)`,
                    background: j.id === jobId ? '#FFFF00' : 'var(--surface)',
                    color: j.id === jobId ? '#000' : 'var(--text-primary)',
                  }}
                >
                  <td style={{ padding: '10px 12px' }}>
                    {j.is_priority && <Zap size={12} strokeWidth={3} style={{ display: 'inline', color: j.id === jobId ? '#000' : '#FF00FF' }} />}
                    #{i + 1}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'Major Mono Display, monospace', fontSize: '10px' }}>{j.id}</td>
                  <td style={{ padding: '10px 12px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.file_name}</td>
                  <td style={{ padding: '10px 12px' }}>{j.pages}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: j.color ? '#FF00FF' : dark ? '#fff' : '#000', color: j.color ? '#fff' : dark ? '#000' : '#fff', padding: '2px 6px', fontSize: '9px', border: '2px solid currentColor', fontWeight: 700 }}>
                      {j.color ? 'CLR' : 'B&W'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {j.is_priority ? <span style={{ background: '#FFFF00', color: '#000', padding: '2px 6px', fontSize: '9px', border: `1px solid ${border}`, fontWeight: 900 }}>⚡</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: j.id === jobId ? '#000' : 'var(--text-secondary)' }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {eta(i + 1, j.pages)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 8px', fontSize: '9px', border: `2px solid ${border}`,
                      background: j.status === 'printing' ? '#00FF00' : j.status === 'complete' ? dark ? '#fff' : '#000' : 'transparent',
                      color: j.status === 'printing' ? '#000' : j.status === 'complete' ? dark ? '#000' : '#fff' : 'var(--text-primary)',
                      letterSpacing: '0.06em', fontWeight: 700,
                    }}>
                      {j.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Snake game while waiting ── */}
      {(job.status === 'queued' || job.status === 'verifying') && (
        <div>
          <div style={{ background: '#FFFF00', border: `4px solid ${border}`, borderBottom: 'none', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="font-display" style={{ fontSize: '12px', fontWeight: 900, color: '#000' }}>
              ⏳ KILLING TIME? PLAY SNAKE WHILE YOU WAIT!
            </span>
          </div>
          <SnakeGame />
        </div>
      )}

      {/* ── Upload More (always visible in queue) ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <motion.button
          whileHover={{ x: -2, y: -2, boxShadow: `6px 6px 0px ${border}` }}
          whileTap={{ x: 2, y: 2, boxShadow: 'none' }}
          onClick={onUploadMore}
          style={{
            border: `4px solid ${border}`, boxShadow: `4px 4px 0px ${border}`,
            background: '#FFFF00', color: '#000',
            padding: '14px 28px',
            fontFamily: 'Major Mono Display, monospace', fontSize: '14px', fontWeight: 900,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <Upload size={20} strokeWidth={3} /> UPLOAD MORE FILES
        </motion.button>
        <motion.button
          whileHover={{ x: -2, y: -2, boxShadow: `6px 6px 0px ${border}` }}
          whileTap={{ x: 2, y: 2, boxShadow: 'none' }}
          onClick={onHome}
          style={{
            border: `4px solid ${border}`, boxShadow: `4px 4px 0px ${border}`,
            background: 'var(--surface)', color: 'var(--text-primary)',
            padding: '14px 28px',
            fontFamily: 'Major Mono Display, monospace', fontSize: '14px', fontWeight: 900,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <Home size={20} strokeWidth={3} /> HOME
        </motion.button>
      </div>
    </div>
  )
}
