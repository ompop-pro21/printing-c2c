import { useState, useEffect } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { Zap, FileStack, Minus, Plus } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface ConfigPanelProps {
  pages: number
  onConfirm: (config: PrintConfig) => void
}

export interface PrintConfig {
  color: boolean
  duplex: boolean
  copies: number
  isPriority: boolean
  price: number
}

// ── Animated price counter ──────────────────────────────────────────────────
function AnimatedPrice({ value, dark }: { value: number; dark: boolean }) {
  const spring = useSpring(value, { stiffness: 260, damping: 28 })
  const display = useTransform(spring, v => v.toFixed(2))

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return (
    <motion.span
      key={Math.round(value * 10)}
      initial={{ scale: 1.3, color: '#FF00FF' }}
      animate={{ scale: 1, color: dark ? '#FFFF00' : '#FFFF00' }}  // Always yellow — visible on both dark panel and black panel
      transition={{ duration: 0.35, type: 'spring', stiffness: 300, damping: 22 }}
      style={{
        display: 'inline-block',
        fontFamily: 'Major Mono Display, monospace',
        fontWeight: 900,
      }}
    >
      {display}
    </motion.span>
  )
}

// ── Big toggle card ──────────────────────────────────────────────────────────
function ToggleCard({
  label, sub, checked, onChange, activeColor, activeShadow,
}: {
  label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void;
  activeColor: string; activeShadow: string;
}) {
  const { dark } = useTheme()
  const border = dark ? '#fff' : '#000'
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        border: `4px solid ${border}`,
        boxShadow: checked ? `6px 6px 0px ${activeShadow}` : `6px 6px 0px ${border}`,
        background: checked ? activeColor : 'var(--surface)',
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'all 0.12s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      <div>
        <div
          className="font-display"
          style={{
            fontSize: '15px',
            fontWeight: 900,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            color: checked ? '#000' : 'var(--text-primary)',
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            className="font-mono"
            style={{
              fontSize: '10px',
              color: checked ? '#111' : 'var(--text-muted)',
              marginTop: 3,
              letterSpacing: '0.08em',
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {/* Toggle pill */}
      <div
        style={{
          width: 58, height: 30,
          background: checked ? '#000' : 'var(--toggle-off-bg)',
          border: `3px solid ${border}`,
          position: 'relative',
        }}
      >
        <motion.div
          animate={{ x: checked ? 28 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 24, height: 24,
            background: checked ? activeColor : 'var(--toggle-off-thumb)',
            position: 'absolute',
            top: 0,
          }}
        />
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ConfigPanel({ pages, onConfirm }: ConfigPanelProps) {
  const { dark } = useTheme()
  const [color, setColor] = useState(false)
  const [duplex, setDuplex] = useState(false)
  const [copies, setCopies] = useState(1)
  const [isPriority, setIsPriority] = useState(false)

  const border = dark ? '#fff' : '#000'
  const shadow = dark ? '#fff' : '#000'

  const pricePerPage   = color ? 5.0 : 1.5
  const effectivePages = duplex ? Math.ceil(pages / 2) : pages
  const basePrice      = effectivePages * pricePerPage * copies
  const priorityFee    = isPriority ? 10 : 0
  const total          = basePrice + priorityFee

  const breakdown = [
    {
      label: `${pages} pg × ${copies} cop${copies > 1 ? 'ies' : 'y'} × ₹${pricePerPage}${duplex ? ' (duplex÷2)' : ''}`,
      value: basePrice,
    },
    ...(isPriority ? [{ label: 'PRIORITY FEE', value: 10 }] : []),
  ]

  return (
    <div>
      <div
        className="font-mono"
        style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: 24 }}
      >
        // PRINT CONFIGURATION
      </div>

      {/* ── B&W / Color selector ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* B&W */}
        <div
          onClick={() => setColor(false)}
          style={{
            border: `4px solid ${border}`,
            boxShadow: !color ? `6px 6px 0px ${shadow}` : 'none',
            background: !color ? 'var(--text-primary)' : 'var(--surface)',
            color: !color ? 'var(--bg)' : 'var(--text-primary)',
            padding: '20px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.12s',
          }}
        >
          <div className="font-display" style={{ fontSize: '24px', marginBottom: 4 }}>B&W</div>
          <div className="font-mono" style={{ fontSize: '11px', letterSpacing: '0.1em', opacity: 0.7 }}>₹1.50 / PAGE</div>
        </div>
        {/* COLOR */}
        <div
          onClick={() => setColor(true)}
          style={{
            border: `4px solid ${border}`,
            boxShadow: color ? `6px 6px 0px #FF00FF` : 'none',
            background: color ? '#FF00FF' : 'var(--surface)',
            color: '#000',
            padding: '20px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.12s',
          }}
        >
          <div className="font-display" style={{ fontSize: '24px', marginBottom: 4, color: color ? '#000' : 'var(--text-primary)' }}>COLOR</div>
          <div className="font-mono" style={{ fontSize: '11px', letterSpacing: '0.1em', color: color ? '#000' : 'var(--text-muted)' }}>₹5.00 / PAGE</div>
        </div>
      </div>

      {/* ── Duplex toggle ── */}
      <div style={{ marginBottom: 12 }}>
        <ToggleCard
          label="DOUBLE-SIDED"
          sub="PRINTS BOTH FACES · SAVES PAPER"
          checked={duplex}
          onChange={setDuplex}
          activeColor="#FFFF00"
          activeShadow="#FFFF00"
        />
      </div>

      {/* ── Copies counter ── */}
      <div
        style={{
          border: `4px solid ${border}`,
          boxShadow: `6px 6px 0px ${shadow}`,
          background: 'var(--surface)',
          padding: '20px 24px',
          marginBottom: 12,
        }}
      >
        <div
          className="font-mono"
          style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 12 }}
        >
          COPIES
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button
            onClick={() => setCopies(Math.max(1, copies - 1))}
            style={{
              width: 46, height: 46,
              border: `3px solid ${border}`,
              background: copies === 1 ? 'var(--bg-inset)' : 'var(--text-primary)',
              color: copies === 1 ? 'var(--text-faint)' : 'var(--bg)',
              cursor: copies === 1 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Minus size={20} strokeWidth={3} />
          </button>

          <motion.span
            key={copies}
            initial={{ scale: 1.5, color: '#FF00FF' }}
            animate={{ scale: 1, color: 'var(--text-primary)' }}
            className="font-display"
            style={{ fontSize: '48px', fontWeight: 900, minWidth: 60, textAlign: 'center', lineHeight: 1 }}
          >
            {copies}
          </motion.span>

          <button
            onClick={() => setCopies(Math.min(99, copies + 1))}
            style={{
              width: 46, height: 46,
              border: `3px solid ${border}`,
              background: 'var(--text-primary)',
              color: 'var(--bg)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={20} strokeWidth={3} />
          </button>

          <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            × {pages} PAGE{pages !== 1 ? 'S' : ''}
          </div>
        </div>
      </div>

      {/* ── JUMP THE QUEUE ── */}
      <motion.div
        whileHover={{ x: -2, y: -2 }}
        whileTap={{ x: 4, y: 4 }}
        onClick={() => setIsPriority(!isPriority)}
        style={{
          border: `4px solid ${border}`,
          boxShadow: isPriority ? '8px 8px 0px #FFFF00' : `8px 8px 0px ${shadow}`,
          background: isPriority ? '#FFFF00' : 'var(--surface)',
          padding: '20px 24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          transition: 'background 0.12s',
        }}
      >
        <motion.div
          animate={isPriority ? { rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Zap
            size={34}
            strokeWidth={3}
            fill={isPriority ? '#000' : 'none'}
            color={isPriority ? '#000' : 'var(--text-primary)'}
          />
        </motion.div>
        <div style={{ flex: 1 }}>
          <div
            className="font-display"
            style={{ fontSize: '18px', fontWeight: 900, color: isPriority ? '#000' : 'var(--text-primary)' }}
          >
            JUMP THE QUEUE
          </div>
          <div
            className="font-mono"
            style={{ fontSize: '10px', letterSpacing: '0.1em', color: isPriority ? '#222' : 'var(--text-muted)', marginTop: 2 }}
          >
            +₹10 PRIORITY FEE · PRINTS NEXT
          </div>
        </div>
        <div
          className="font-display"
          style={{
            fontSize: '22px', fontWeight: 900,
            background: isPriority ? '#000' : '#FFFF00',
            color: isPriority ? '#FFFF00' : '#000',
            padding: '4px 14px',
            border: `3px solid ${border}`,
          }}
        >
          {isPriority ? 'ON' : 'OFF'}
        </div>
      </motion.div>

      {/* ══════════════════════════════════
          PRICE BREAKDOWN — dark panel,
          all text explicitly white/yellow
      ══════════════════════════════════ */}
      <div
        style={{
          border: `4px solid ${border}`,
          background: '#0A0A0A',  /* Always very dark regardless of theme */
          padding: '24px',
          marginBottom: 24,
          boxShadow: `8px 8px 0px ${dark ? '#FF00FF' : '#000'}`,
        }}
      >
        {/* Label */}
        <div
          className="font-mono"
          style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#888', marginBottom: 16 }}
        >
          PRICE BREAKDOWN
        </div>

        {/* Line items */}
        {breakdown.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: '12px',
              fontFamily: 'Space Mono, monospace',
            }}
          >
            <span style={{ color: '#BBBBBB' }}>{item.label}</span>
            <span style={{ color: '#FFFF00', fontWeight: 700 }}>₹{item.value.toFixed(2)}</span>
          </div>
        ))}

        {/* Divider + Total */}
        <div
          style={{
            borderTop: '2px solid #333',
            marginTop: 14,
            paddingTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: '12px', letterSpacing: '0.15em', color: '#888' }}
          >
            TOTAL DUE
          </span>

          {/* Big animated price — always on dark bg so we force yellow */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span
              className="font-mono"
              style={{ fontSize: '22px', color: '#FFFF00', lineHeight: 1 }}
            >
              ₹
            </span>
            <span style={{ fontSize: '56px', lineHeight: 1 }}>
              <AnimatedPrice value={total} dark={dark} />
            </span>
          </div>
        </div>

        {/* Config badges */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { label: color ? 'COLOR' : 'B&W',      bg: color ? '#FF00FF' : '#fff', fg: '#000' },
            { label: duplex ? 'DUPLEX' : 'SINGLE', bg: duplex ? '#FFFF00' : '#333', fg: duplex ? '#000' : '#fff' },
            { label: `${copies}× COPIES`,           bg: '#333', fg: '#fff' },
            { label: `${pages} PAGES`,              bg: '#333', fg: '#fff' },
          ].map(b => (
            <span
              key={b.label}
              className="font-mono"
              style={{
                background: b.bg, color: b.fg,
                border: '2px solid #555',
                padding: '2px 8px',
                fontSize: '10px',
                letterSpacing: '0.08em',
                fontWeight: 700,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Proceed button ── */}
      <motion.button
        whileHover={{ x: -3, y: -3, boxShadow: '11px 11px 0px #FF00FF' }}
        whileTap={{ x: 4, y: 4, boxShadow: 'none' }}
        onClick={() => onConfirm({ color, duplex, copies, isPriority, price: total })}
        style={{
          width: '100%',
          border: `4px solid ${border}`,
          boxShadow: `8px 8px 0px ${shadow}`,
          background: '#FF00FF',
          color: '#000',
          padding: '22px',
          fontFamily: 'Major Mono Display, monospace',
          fontSize: '20px',
          fontWeight: 900,
          letterSpacing: '0.01em',
          cursor: 'pointer',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <FileStack size={26} strokeWidth={3} />
        PROCEED TO PAYMENT · ₹{total.toFixed(2)}
      </motion.button>
    </div>
  )
}
