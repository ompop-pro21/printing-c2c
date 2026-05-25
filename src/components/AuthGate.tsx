import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { signInWithGoogle, isMockMode } from '../lib/supabase'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="font-display" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)' }}>
          LOADING...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--bg)' }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          <div className="font-display" style={{ fontSize: '48px', fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 24, lineHeight: 1 }}>
            PRINT<br /><span style={{ color: '#FF00FF' }}>QUEUE</span> PRO
          </div>
          
          <div style={{ border: '4px solid var(--border)', boxShadow: '8px 8px 0px var(--border)', background: 'var(--surface)', padding: '40px 30px', textAlign: 'center' }}>
            <div className="font-mono" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 24 }}>
              AUTHORIZED PERSONNEL ONLY
            </div>
            
            <motion.button
              whileHover={{ x: -2, y: -2, boxShadow: '6px 6px 0px #FF00FF' }}
              whileTap={{ x: 2, y: 2, boxShadow: 'none' }}
              onClick={() => signInWithGoogle()}
              style={{
                width: '100%',
                border: '4px solid var(--border)',
                background: '#000',
                color: '#fff',
                padding: '16px',
                fontFamily: 'Major Mono Display, monospace',
                fontSize: '18px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                transition: 'box-shadow 0.1s'
              }}
            >
              <LogIn size={20} strokeWidth={3} />
              {isMockMode ? 'MOCK LOGIN' : 'SIGN IN WITH GOOGLE'}
            </motion.button>
            
            <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: 24, letterSpacing: '0.05em' }}>
              SECURE CLOUD-TO-LOCAL ARCHITECTURE
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
