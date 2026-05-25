/**
 * PrintQueue Pro – Local Print Daemon
 * =====================================
 * Runs on the print-shop PC connected to the physical printer.
 *
 * What it does every POLL_INTERVAL_MS:
 *   1. Fetches jobs with status = 'paid' from Supabase
 *   2. Sets them to 'printing' immediately
 *   3. Downloads the PDF from Supabase Storage
 *   4. Sends to the hardware printer via SumatraPDF (Windows) or lp (Linux/Mac)
 *   5. Updates job to 'complete' or 'failed'
 *
 * Setup:
 *   cp .env.example .env
 *   # Edit .env with your real values
 *   npm install
 *   npm start
 */

import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const PRINTER_NAME = process.env.PRINTER_NAME || ''
const SUMATRA_PATH = process.env.SUMATRA_PATH || 'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe'
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '5000')
const DOWNLOAD_DIR = path.resolve(__dirname, process.env.DOWNLOAD_DIR || './downloads')
const IS_WINDOWS = process.platform === 'win32'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Ensure download dir exists
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

// ── Utilities ────────────────────────────────────────────────────────────────
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)
const err = (msg) => console.error(`[${new Date().toISOString()}] ❌  ${msg}`)

async function listPrinters() {
  try {
    if (IS_WINDOWS) {
      const { stdout } = await execAsync('wmic printer get Name,WorkOffline /format:csv')
      return stdout.split('\n')
        .slice(2)
        .filter(Boolean)
        .map(line => {
          const parts = line.split(',')
          return { name: parts[2]?.trim(), offline: parts[1]?.trim() === 'TRUE' }
        })
        .filter(p => p.name)
    } else {
      const { stdout } = await execAsync('lpstat -p')
      return stdout.split('\n')
        .filter(l => l.startsWith('printer'))
        .map(l => ({ name: l.split(' ')[1], offline: l.includes('disabled') }))
    }
  } catch {
    return []
  }
}

async function downloadFile(url, localPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`)
  const buffer = await res.arrayBuffer()
  fs.writeFileSync(localPath, Buffer.from(buffer))
  log(`  📥 Downloaded to ${localPath}`)
}

async function printFile(localPath, job) {
  const copies = job.copies || 1
  const duplex = job.duplex ? 'DuplexNoTumble' : 'None'
  const colorMode = job.color ? '' : '-print-settings "monochrome"'

  let cmd
  if (IS_WINDOWS) {
    // SumatraPDF silent print
    const printer = PRINTER_NAME ? `"${PRINTER_NAME}"` : ''
    cmd = `"${SUMATRA_PATH}" -print-to ${printer} -print-settings "copies=${copies},${job.duplex ? 'duplexlong' : 'simplex'}" ${colorMode} "${localPath}"`
  } else {
    // CUPS lp command
    const sides = job.duplex ? 'two-sided-long-edge' : 'one-sided'
    const printerOpt = PRINTER_NAME ? `-d "${PRINTER_NAME}"` : ''
    cmd = `lp ${printerOpt} -n ${copies} -o sides=${sides} ${job.color ? '' : '-o ColorModel=Gray'} "${localPath}"`
  }

  log(`  🖨  Sending to printer: ${cmd.slice(0, 80)}...`)
  await execAsync(cmd)
}

async function updateJobStatus(jobId, status, extra = {}) {
  const { error } = await supabase
    .from('print_jobs')
    .update({ status, ...extra })
    .eq('id', jobId)
  if (error) err(`Failed to update job ${jobId}: ${error.message}`)
}

// ── Main poll loop ────────────────────────────────────────────────────────────
async function pollAndPrint() {
  try {
    // Fetch jobs sorted by priority desc, then created_at asc
    const { data: jobs, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'paid')
      .order('is_priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) { err(`Poll error: ${error.message}`); return }
    if (!jobs || jobs.length === 0) return

    const job = jobs[0]
    log(`📄 Processing job #${job.id} — ${job.file_name} (${job.pages}pp, ${job.color ? 'COLOR' : 'B&W'}, ×${job.copies})`)

    // Mark as printing
    await updateJobStatus(job.id, 'printing', { current_page: 0 })

    // Download
    const localPath = path.join(DOWNLOAD_DIR, `${job.id}_${Date.now()}.pdf`)
    await downloadFile(job.file_url, localPath)

    // Simulate page progress updates
    const pageInterval = setInterval(async () => {
      const { data } = await supabase.from('print_jobs').select('current_page').eq('id', job.id).single()
      const nextPage = Math.min((data?.current_page || 0) + 1, job.pages)
      await updateJobStatus(job.id, 'printing', { current_page: nextPage })
    }, 1500)

    try {
      await printFile(localPath, job)
      clearInterval(pageInterval)
      await updateJobStatus(job.id, 'complete', { current_page: job.pages })
      log(`✅  Job #${job.id} complete`)
    } catch (printErr) {
      clearInterval(pageInterval)
      await updateJobStatus(job.id, 'failed')
      err(`Print failed for job #${job.id}: ${printErr.message}`)
    } finally {
      // Clean up downloaded file
      try { fs.unlinkSync(localPath) } catch {}
    }
  } catch (e) {
    err(`Unexpected error: ${e.message}`)
  }
}

// ── Startup ──────────────────────────────────────────────────────────────────
log('🚀 PrintQueue Pro Daemon starting...')
log(`   Supabase: ${SUPABASE_URL}`)
log(`   Printer:  ${PRINTER_NAME || '(default system printer)'}`)
log(`   Platform: ${IS_WINDOWS ? 'Windows (SumatraPDF)' : 'Linux/Mac (CUPS)'}`)
log(`   Poll:     every ${POLL_INTERVAL}ms`)

// List available printers at startup
listPrinters().then(printers => {
  if (printers.length > 0) {
    log(`   Available printers:`)
    printers.forEach(p => log(`     • ${p.name} ${p.offline ? '(OFFLINE)' : '(online)'}`))
  } else {
    log('   ⚠️  No printers detected (check CUPS/WMI)')
  }
})

log('─'.repeat(60))

// Run immediately then on interval
pollAndPrint()
setInterval(pollAndPrint, POLL_INTERVAL)

// Graceful shutdown
process.on('SIGINT', () => {
  log('👋 Daemon shutting down...')
  process.exit(0)
})
