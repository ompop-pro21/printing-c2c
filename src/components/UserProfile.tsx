import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User, FileText, Download, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getUserReceipts, signOut, type Receipt } from '../lib/supabase'
import { downloadReceipt } from '../lib/receiptGenerator'
import { useTheme } from '../contexts/ThemeContext'

export default function UserProfile({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth()
  const { dark } = useTheme()
  const border = dark ? '#fff' : '#000'

  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      getUserReceipts(user.id).then(r => {
        setReceipts(r)
        setLoading(false)
      })
    }
  }, [user?.id])

  if (!user) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
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
        style={{ width: '100%', maxWidth: 800 }}
      >
        {/* Header */}
        <div style={{ border: `4px solid #00FFFF`, boxShadow: '8px 8px 0px #00FFFF', background: '#000', color: '#00FFFF', padding: '20px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" style={{ width: 48, height: 48, border: '3px solid #00FFFF' }} />
            ) : (
              <User size={36} strokeWidth={2.5} />
            )}
            <div>
              <div className="font-display" style={{ fontSize: '24px', fontWeight: 900 }}>{profile?.full_name || user.email}</div>
              <div className="font-mono" style={{ fontSize: '11px', letterSpacing: '0.1em', opacity: 0.7 }}>
                {profile?.role === 'admin' ? 'ADMINISTRATOR' : 'USER ACCOUNT'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={async () => { await signOut(); onClose() }}
              style={{ background: '#FF00FF', border: '3px solid #00FFFF', color: '#000', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Major Mono Display, monospace', fontSize: '13px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <LogOut size={16} strokeWidth={3} /> LOGOUT
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: '3px solid #00FFFF', color: '#00FFFF', padding: '8px 16px', cursor: 'pointer', fontFamily: 'Major Mono Display, monospace', fontSize: '13px', fontWeight: 900 }}
            >
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* History & Receipts */}
        <div style={{ border: `4px solid ${border}`, boxShadow: `8px 8px 0px ${border}`, background: dark ? '#111' : '#fff' }}>
          <div style={{ borderBottom: `4px solid ${border}`, padding: '16px 24px', background: dark ? '#1a1a1a' : '#f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileText size={20} strokeWidth={2.5} color="var(--text-primary)" />
            <div className="font-display" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)' }}>PRINT HISTORY & RECEIPTS</div>
          </div>

          <div style={{ padding: '24px' }}>
            {loading ? (
              <div className="font-mono" style={{ color: 'var(--text-muted)' }}>Loading history...</div>
            ) : receipts.length === 0 ? (
              <div className="font-mono" style={{ color: 'var(--text-muted)' }}>No print history found.</div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {receipts.map(r => (
                  <div key={r.id} style={{ border: `3px solid ${border}`, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                    <div>
                      <div className="font-display" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {r.file_name || 'Document'}
                      </div>
                      <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} /> {new Date(r.created_at).toLocaleString()}
                        <span style={{ color: '#00FFFF', fontWeight: 700, marginLeft: 8 }}>₹{r.amount.toFixed(2)}</span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => downloadReceipt(r, user.email)}
                      style={{ background: 'var(--text-primary)', color: 'var(--bg)', border: 'none', padding: '10px 16px', cursor: 'pointer', fontFamily: 'Space Mono, monospace', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Download size={14} strokeWidth={3} /> RECEIPT
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
