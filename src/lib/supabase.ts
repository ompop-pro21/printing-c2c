import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isMockMode = !import.meta.env.VITE_SUPABASE_URL

// ── Types ──────────────────────────────────────────────────────────────────

export type JobStatus = 'uploading' | 'verifying' | 'queued' | 'printing' | 'complete' | 'failed'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: 'user' | 'admin'
  created_at: string
}

export interface PrintJob {
  id: string
  user_id: string
  file_url: string
  file_name: string
  pages: number
  color: boolean
  duplex: boolean
  copies: number
  is_priority: boolean
  status: JobStatus
  price: number
  queue_position: number
  current_page?: number
  created_at: string
}

export interface Receipt {
  id: string
  job_id: string
  user_id: string
  payment_id: string
  amount: number
  method: string
  file_name: string
  pages: number
  config_color: boolean
  config_duplex: boolean
  config_copies: number
  config_priority: boolean
  created_at: string
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (isMockMode) return // Handled via mock auth context
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
}

export async function signOut() {
  if (isMockMode) return
  await supabase.auth.signOut()
}

// ── Storage & Jobs ─────────────────────────────────────────────────────────

export async function uploadPDF(file: File, userId: string): Promise<string> {
  if (isMockMode) {
    await new Promise(r => setTimeout(r, 1500))
    return `mock://pdfs/${userId}/${file.name}`
  }
  const path = `pdfs/${userId}/${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from('pdfs').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('pdfs').getPublicUrl(path)
  return data.publicUrl
}

export async function createJob(job: Omit<PrintJob, 'id' | 'created_at' | 'queue_position'>): Promise<PrintJob> {
  if (isMockMode) {
    return {
      ...job,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      created_at: new Date().toISOString(),
      queue_position: Math.floor(Math.random() * 4) + 1,
    } as PrintJob
  }
  const { data, error } = await supabase.from('print_jobs').insert(job).select().single()
  if (error) throw error
  return data as PrintJob
}

export async function createReceipt(receipt: Omit<Receipt, 'id' | 'created_at'>): Promise<Receipt> {
  if (isMockMode) {
    return {
      ...receipt,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      created_at: new Date().toISOString()
    }
  }
  const { data, error } = await supabase.from('receipts').insert(receipt).select().single()
  if (error) throw error
  return data as Receipt
}

export async function getUserReceipts(userId: string): Promise<Receipt[]> {
  if (isMockMode) {
    return [
      { id: 'REC_123', job_id: 'JOB_A', user_id: userId, payment_id: 'pay_MOCK1', amount: 45, method: 'razorpay', file_name: 'thesis.pdf', pages: 10, config_color: false, config_duplex: false, config_copies: 3, config_priority: false, created_at: new Date().toISOString() }
    ]
  }
  const { data, error } = await supabase.from('receipts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return data as Receipt[]
}

export async function getUserProfile(userId: string): Promise<Profile> {
  if (isMockMode) {
    return {
      id: userId, email: 'mockuser@demo.com', full_name: 'Demo User',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
      role: 'admin', created_at: new Date().toISOString()
    }
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data as Profile
}

export function subscribeToJob(jobId: string, callback: (job: PrintJob) => void) {
  if (isMockMode) return () => {}
  const channel = supabase
    .channel(`job-${jobId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'print_jobs', filter: `id=eq.${jobId}`
    }, (payload) => callback(payload.new as PrintJob))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export async function getAllJobs(): Promise<PrintJob[]> {
  if (isMockMode) {
    return [
      { id: 'ABC123', user_id: 'user_1', file_url: '', file_name: 'thesis.pdf', pages: 42, color: false, duplex: true, copies: 1, is_priority: true, status: 'printing', price: 63, queue_position: 1, current_page: 7, created_at: new Date(Date.now() - 120000).toISOString() },
      { id: 'DEF456', user_id: 'user_2', file_url: '', file_name: 'resume.pdf', pages: 2, color: true, duplex: false, copies: 3, is_priority: false, status: 'queued', price: 30, queue_position: 2, created_at: new Date(Date.now() - 60000).toISOString() },
    ]
  }
  const { data, error } = await supabase.from('print_jobs').select('*').order('is_priority', { ascending: false }).order('created_at', { ascending: true })
  if (error) throw error
  return data
}
