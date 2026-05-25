import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isMockMode, getUserProfile, type Profile } from '../lib/supabase'

interface AuthContextValue {
  user: any | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, profile: null, loading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isMockMode) {
      setUser({ id: 'mock_user_123', email: 'admin@printqueue.local' })
      setProfile({
        id: 'mock_user_123',
        email: 'admin@printqueue.local',
        full_name: 'Mock Admin',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
        role: 'admin',
        created_at: new Date().toISOString()
      })
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getUserProfile(session.user.id).then(setProfile).catch(() => {})
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getUserProfile(session.user.id).then(setProfile).catch(() => {})
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
