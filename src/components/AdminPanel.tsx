import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Printer, CheckCircle, XCircle, RefreshCw, Trash2, ChevronDown } from 'lucide-react'
import { getAllJobs, isMockMode } from '../lib/supabase'
import type { PrintJob } from '../lib/supabase'
import { useTheme } from '../contexts/ThemeContext'

const MOCK_PRINTERS = [
  { id: 'hp1',    name: 'HP LaserJet Pro M404n', status: 'online',    location: 'Counter A' },
  { id: 'canon2', name: 'Canon LBP6030',          status: 'online',    location: 'Counter B' },
  { id: 'epson3', name: 'Epson L3150',             status: 'offline',   location: 'Back Office' },
  { id: 'bro4',   name: 'Brother HL-L2350DW',     status: 'paper_jam', location: 'Counter A' },
]

const STATUS_COLOR: Record<string, string> = {
  online:    '#00FF00',
  offline:   '#FF3333',
  paper_jam: '#FF00FF',
  busy:      '#FFFF00',
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { dark } = useTheme()
  const border = dark ? '#FFFFFF' : '#000000'

  const [jobs, setJobs]           = useState<PrintJob[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState(MOCK_PRINTERS[0].id)
  const [dropdownOpen, setDropdownOpen]       = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getAllJobs().then(j => { setJobs(j); setLoading(false) })
  }, [])

  const active = MOCK_PRINTERS.find(p => p.id === selectedPrinter)!

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: dark ? 'rgba(0,0,0,0.96)' : 'rgba(0,0,0,0.90)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 20px', overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ width: '100%', maxWidth: 920 }}
      >
        {/* Header */}
        <div style={{ border: `4px solid #FF00FF`, boxShadow: '8px 8px 0px #FF00FF', background: '#000', color: '#FF00FF', padding: '20px 28px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Settings size={30} strokeWidth={2.5} />
            <div>
              <div className="font-display" style={{ fontSize: '20px', fontWeight: 900, color: '#FF00FF' }}>ADMIN CONTROL PANEL</div>
              <div className="font-mono" style={{ fontSize: '10px', color: '#FF00FF', letterSpacing: '0.15em', opacity: 0.6 }}>
                {isMockMode ? '⚡ DEMO MODE' : '🔴 LIVE — Supabase connected'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '3px solid #FF00FF', color: '#FF00FF', padding: '8px 18px', cursor: 'pointer', fontFamily: 'Major Mono Display, monospace', fontSize: '13px', fontWeight: 900 }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Printer selector */}
        <div style={{ border: `4px solid ${border}`, boxShadow: '8px 8px 0px #00FFFF', background: dark ? '#111' : '#fff', marginBottom: 20 }}>
          <div style={{ borderBottom: `4px solid ${border}`, padding: '12px 20px', background: '#00FFFF', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Printer size={20} strokeWidth={3} color="#000" />
            <div className="font-display" style={{ fontSize: '13px', fontWeight: 900, color: '#000' }}>HARDWARE PRINTER SELECTION</div>
          </div>
          <div style={{ padding: '20px' }}>
            {/* Dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  border: `4px solid ${border}`, padding: '14px 18px', cursor: 'pointer',
                  background: dark ? '#1a1a1a' : '#fff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, background: STATUS_COLOR[active.status], border: `2px solid ${border}` }} />
                  <span className="font-body" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{active.name}</span>
                  <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>[{active.location}]</span>
                </div>
                <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }}>
                  <ChevronDown size={20} strokeWidth={3} color={dark ? '#fff' : '#000'} />
                </motion.div>
              </div>
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      border: `4px solid ${border}`, borderTop: 'none',
                      background: dark ? '#111' : '#fff',
                    }}
                  >
                    {MOCK_PRINTERS.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedPrinter(p.id); setDropdownOpen(false) }}
                        style={{
                          padding: '14px 18px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12,
                          borderBottom: `2px solid ${dark ? '#222' : '#eee'}`,
                          background: selectedPrinter === p.id ? '#FFFF00' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{ width: 10, height: 10, background: STATUS_COLOR[p.status], border: `2px solid ${border}`, flexShrink: 0 }} />
                        <span className="font-body" style={{ fontWeight: 700, color: selectedPrinter === p.id ? '#000' : 'var(--text-primary)' }}>{p.name}</span>
                        <span className="font-mono" style={{ fontSize: '10px', color: selectedPrinter === p.id ? '#333' : 'var(--text-muted)' }}>[{p.location}]</span>
                        <span style={{ marginLeft: 'auto', background: STATUS_COLOR[p.status], color: '#000', padding: '2px 8px', fontSize: '9px', fontFamily: 'Space Mono, monospace', border: `2px solid ${border}`, fontWeight: 900 }}>
                          {p.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status pills */}
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'STATUS', value: active.status.toUpperCase().replace('_', ' '), dot: STATUS_COLOR[active.status] },
                { label: 'LOCATION', value: active.location, dot: null },
                { label: 'DAEMON', value: isMockMode ? 'NOT CONNECTED' : 'RUNNING', dot: isMockMode ? '#666' : '#00FF00' },
              ].map(pill => (
                <div key={pill.label} style={{ border: `3px solid ${border}`, padding: '10px 14px', background: dark ? '#1a1a1a' : '#f8f8f8', flex: 1, minWidth: 130 }}>
                  <div className="font-mono" style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 4 }}>{pill.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {pill.dot && (
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                        style={{ width: 10, height: 10, background: pill.dot, border: `2px solid ${border}`, flexShrink: 0 }} />
                    )}
                    <div className="font-display" style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)' }}>{pill.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs table */}
        <div style={{ border: `4px solid ${border}`, boxShadow: `8px 8px 0px ${border}`, background: dark ? '#111' : '#fff' }}>
          <div style={{ borderBottom: `4px solid ${border}`, padding: '12px 20px', background: dark ? '#1a1a1a' : '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="font-display" style={{ fontSize: '13px', color: '#fff' }}>ALL PRINT JOBS</div>
            <button
              onClick={() => { setLoading(true); getAllJobs().then(j => { setJobs(j); setLoading(false) }) }}
              style={{ background: 'none', border: `2px solid #444`, color: '#fff', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Space Mono, monospace', fontSize: '10px' }}
            >
              <RefreshCw size={11} strokeWidth={2.5} /> REFRESH
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>
                <RefreshCw size={32} strokeWidth={2} color="var(--text-muted)" />
              </motion.div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Space Mono, monospace', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: dark ? '#222' : '#f0f0f0', borderBottom: `3px solid ${border}` }}>
                    {['ID', 'FILE', 'PG', 'MODE', 'PRICE', 'PRI', 'STATUS', 'ACTIONS'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} style={{ borderBottom: `2px solid ${dark ? '#222' : '#eee'}` }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'Major Mono Display, monospace', fontSize: '10px', color: 'var(--text-primary)' }}>{j.id}</td>
                      <td style={{ padding: '10px 12px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{j.file_name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{j.pages}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: j.color ? '#FF00FF' : dark ? '#fff' : '#000', color: j.color ? '#fff' : dark ? '#000' : '#fff', padding: '2px 6px', fontSize: '9px', border: `2px solid ${border}`, fontWeight: 700 }}>
                          {j.color ? 'CLR' : 'B&W'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: 'var(--text-primary)' }}>₹{j.price}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {j.is_priority ? <span style={{ background: '#FFFF00', border: `2px solid ${border}`, padding: '2px 6px', fontSize: '9px', fontWeight: 900, color: '#000' }}>⚡ YES</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          padding: '3px 8px', fontSize: '9px', border: `2px solid ${border}`,
                          background: j.status === 'printing' ? '#00FF00' : j.status === 'complete' ? dark ? '#fff' : '#000' : 'transparent',
                          color: j.status === 'printing' ? '#000' : j.status === 'complete' ? dark ? '#000' : '#fff' : 'var(--text-primary)',
                          letterSpacing: '0.06em', fontWeight: 700,
                        }}>
                          {j.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button title="Mark complete" style={{ border: `2px solid ${border}`, background: '#00FF00', padding: '4px', cursor: 'pointer' }}><CheckCircle size={13} strokeWidth={3} /></button>
                          <button title="Mark failed"   style={{ border: `2px solid ${border}`, background: '#FF00FF', padding: '4px', cursor: 'pointer' }}><XCircle   size={13} strokeWidth={3} /></button>
                          <button title="Delete"        style={{ border: `2px solid ${border}`, background: dark ? '#111' : '#fff', color: 'var(--text-primary)', padding: '4px', cursor: 'pointer' }}><Trash2 size={13} strokeWidth={3} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
