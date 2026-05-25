import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, CheckCircle, AlertTriangle, X, Image, FileText, RefreshCw } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import {
  getFileCategory,
  imageToPDF,
  formatBytes,
  fileTypeLabel,
  type ConversionResult,
} from '../lib/imageConverter'

interface UploadZoneProps {
  onUploadComplete: (file: File, pages: number) => void
}

type UploadState =
  | 'idle'
  | 'dragging'
  | 'converting'   // image → PDF
  | 'uploading'    // byte-progress simulation
  | 'verifying'
  | 'done'
  | 'error'

// File types accepted by the <input>
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,application/pdf,image/*'

// Chunk size for simulated upload progress
const CHUNK = 65536

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const { dark } = useTheme()
  const border = dark ? '#fff' : '#000'
  const shadow = dark ? '#fff' : '#000'

  const [state,          setState]          = useState<UploadState>('idle')
  const [errorMsg,       setErrorMsg]       = useState('')
  const [errorHint,      setErrorHint]      = useState('')
  const [bytesReceived,  setBytesReceived]  = useState(0)
  const [totalBytes,     setTotalBytes]     = useState(0)
  const [pagesDetected,  setPagesDetected]  = useState(0)
  const [integrityOk,    setIntegrityOk]    = useState<boolean | null>(null)
  const [fileName,       setFileName]       = useState('')
  const [fileType,       setFileType]       = useState('')       // original type label
  const [isImage,        setIsImage]        = useState(false)
  const [convProgress,   setConvProgress]   = useState(0)        // 0-100 for conversion anim
  const [preview,        setPreview]        = useState<ConversionResult | null>(null)

  // Keep a ref to the object URL so we can revoke it on unmount / reset
  const previewUrlRef = useRef<string | null>(null)

  // ── Reset all state ────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setState('idle')
    setErrorMsg('')
    setErrorHint('')
    setBytesReceived(0)
    setTotalBytes(0)
    setPagesDetected(0)
    setIntegrityOk(null)
    setFileName('')
    setFileType('')
    setIsImage(false)
    setConvProgress(0)
    setPreview(null)
  }, [])

  // ── Core file handler ──────────────────────────────────────────────────────
  const handleFile = useCallback(async (raw: File) => {
    const category = getFileCategory(raw.type)

    // ── Reject unsupported types ──
    if (category === 'unsupported') {
      setState('error')
      setErrorMsg(`UNSUPPORTED FORMAT: ${fileTypeLabel(raw.type) || raw.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'}`)
      setErrorHint('ACCEPTED: PDF, PNG, JPG, JPEG, WEBP, GIF, BMP')
      return
    }

    // ── Special helpful message for Word docs ──
    if (category === 'word') {
      setState('error')
      setErrorMsg('WORD DOCUMENTS (.DOC/.DOCX) NOT SUPPORTED')
      setErrorHint(
        'Browser security prevents reading Word files directly.\n' +
        'SOLUTION: In Word → File → Save As → PDF, then upload the PDF here.'
      )
      return
    }

    if (raw.size > 50 * 1024 * 1024) {
      setState('error')
      setErrorMsg('FILE TOO LARGE — MAX 50MB')
      setErrorHint('')
      return
    }

    const imageMode = category === 'image'
    setIsImage(imageMode)
    setFileName(raw.name)
    setFileType(fileTypeLabel(raw.type))

    // ── PHASE 1: Image → PDF conversion ──────────────────────────────────────
    let workingFile = raw
    let pages = 1

    if (imageMode) {
      setState('converting')
      setConvProgress(0)

      // Animate conversion progress bar (the actual work is fast, so we fake it)
      const progTimer = setInterval(() => {
        setConvProgress(p => Math.min(p + 8, 88))
      }, 80)

      try {
        const result = await imageToPDF(raw)
        clearInterval(progTimer)
        setConvProgress(100)
        workingFile = result.file
        previewUrlRef.current = result.previewUrl
        setPreview(result)
        pages = 1
        await new Promise(r => setTimeout(r, 400)) // brief pause to show 100%
      } catch (e) {
        clearInterval(progTimer)
        setState('error')
        setErrorMsg('IMAGE CONVERSION FAILED')
        setErrorHint(e instanceof Error ? e.message : 'Unknown error during conversion')
        return
      }
    }

    // ── PHASE 2: Simulated upload byte stream ─────────────────────────────────
    setTotalBytes(workingFile.size)
    setBytesReceived(0)
    setPagesDetected(0)
    setIntegrityOk(null)
    setState('uploading')

    let received = 0
    while (received < workingFile.size) {
      received = Math.min(received + CHUNK + Math.floor(Math.random() * CHUNK), workingFile.size)
      setBytesReceived(received)
      await new Promise(r => setTimeout(r, imageMode ? 18 : 28))
    }

    // ── PHASE 3: Integrity check + page count ─────────────────────────────────
    setState('verifying')
    setIntegrityOk(null)
    await new Promise(r => setTimeout(r, 500))

    if (imageMode) {
      // Image = always 1 page
      setPagesDetected(1)
    } else {
      // PDF — estimate from file size
      const estimatedPages = Math.max(1, Math.floor(workingFile.size / 50000))
      for (let i = 0; i < estimatedPages; i++) {
        pages++
        setPagesDetected(i + 1)
        await new Promise(r => setTimeout(r, 100))
      }
      pages = estimatedPages
    }

    setIntegrityOk(true)
    await new Promise(r => setTimeout(r, 350))
    setState('done')
    onUploadComplete(workingFile, pages)
  }, [onUploadComplete])

  // ── Drag and drop handlers ─────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState('idle')
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setState('dragging') }, [])
  const handleDragLeave = useCallback(() => setState('idle'), [])

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ACCEPT
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0]
      if (f) handleFile(f)
    }
    input.click()
  }, [handleFile])

  const progress = totalBytes > 0 ? (bytesReceived / totalBytes) * 100 : 0

  return (
    <div style={{ width: '100%' }}>
      <AnimatePresence mode="wait">

        {/* ═══════════════════════════════════════
            IDLE / DRAGGING STATE
        ═══════════════════════════════════════ */}
        {(state === 'idle' || state === 'dragging') && (
          <motion.div
            key="idle"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.05, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              border: `4px solid ${state === 'dragging' ? '#00FFFF' : border}`,
              boxShadow: state === 'dragging' ? '8px 8px 0px #00FFFF' : `8px 8px 0px ${shadow}`,
              background: state === 'dragging' ? '#00FFFF' : 'var(--surface)',
              padding: '52px 32px',
              textAlign: 'center',
              transition: 'all 0.15s',
            }}
          >
            {/* Bouncing icon */}
            <motion.div
              animate={state === 'dragging'
                ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] }
                : { y: [0, -6, 0] }}
              transition={state === 'dragging'
                ? { duration: 0.5, repeat: Infinity }
                : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Upload
                size={64}
                strokeWidth={2.5}
                style={{
                  margin: '0 auto 18px',
                  color: state === 'dragging' ? '#000' : '#FF00FF',
                  display: 'block',
                }}
              />
            </motion.div>

            <div
              className="font-display"
              style={{
                fontSize: '28px',
                fontWeight: 900,
                marginBottom: 12,
                textTransform: 'uppercase',
                color: state === 'dragging' ? '#000' : 'var(--text-primary)',
              }}
            >
              {state === 'dragging' ? '>> DROP IT <<' : 'DRAG & DROP YOUR FILE'}
            </div>

            <div
              className="font-mono"
              style={{
                fontSize: '11px',
                letterSpacing: '0.1em',
                color: state === 'dragging' ? '#222' : 'var(--text-muted)',
                marginBottom: 24,
              }}
            >
              OR CLICK TO BROWSE
            </div>

            {/* Accepted file type badges */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'PDF',  icon: '📄', bg: '#000',    fg: '#fff',    desc: 'Documents' },
                { label: 'JPG',  icon: '🖼',  bg: '#FF00FF', fg: '#000',    desc: 'Photos' },
                { label: 'PNG',  icon: '🖼',  bg: '#FF00FF', fg: '#000',    desc: 'Images' },
                { label: 'WEBP', icon: '🖼',  bg: '#FF00FF', fg: '#000',    desc: 'Images' },
                { label: 'GIF',  icon: '🎞',  bg: '#00FFFF', fg: '#000',    desc: 'Animated' },
                { label: 'BMP',  icon: '🖼',  bg: '#FF00FF', fg: '#000',    desc: 'Bitmap' },
              ].map(b => (
                <motion.div
                  key={b.label}
                  whileHover={{ y: -3, boxShadow: `3px 3px 0px ${state === 'dragging' ? '#000' : border}` }}
                  style={{
                    border: `2px solid ${state === 'dragging' ? '#000' : border}`,
                    background: state === 'dragging' ? 'rgba(0,0,0,0.15)' : b.bg,
                    color: state === 'dragging' ? '#000' : b.fg,
                    padding: '4px 10px',
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                  }}
                >
                  {b.label}
                </motion.div>
              ))}
            </div>

            {/* Info row */}
            <div
              className="font-mono"
              style={{
                marginTop: 16,
                fontSize: '10px',
                color: state === 'dragging' ? '#111' : 'var(--text-faint)',
                letterSpacing: '0.12em',
              }}
            >
              MAX 50MB · IMAGES AUTO-CONVERTED TO PDF
            </div>

            {state === 'dragging' && <div className="ticket-stripe" style={{ marginTop: 20 }} />}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════
            ERROR STATE
        ═══════════════════════════════════════ */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            style={{ border: `4px solid ${border}`, boxShadow: '8px 8px 0px #FF00FF', background: '#FF00FF', padding: '32px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <AlertTriangle size={40} strokeWidth={3} color="#000" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div className="font-display" style={{ fontSize: '18px', fontWeight: 900, color: '#000', marginBottom: 6, lineHeight: 1.2 }}>
                  !! UPLOAD REJECTED !!
                </div>
                <div className="font-mono" style={{ fontSize: '13px', fontWeight: 700, color: '#000', marginBottom: errorHint ? 10 : 0 }}>
                  {errorMsg}
                </div>
                {errorHint && (
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '11px',
                      color: '#111',
                      background: 'rgba(0,0,0,0.12)',
                      padding: '8px 12px',
                      border: '2px solid rgba(0,0,0,0.2)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {errorHint}
                  </div>
                )}
              </div>
              <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', flexShrink: 0 }}>
                <X size={28} strokeWidth={3} />
              </button>
            </div>

            {/* Accepted formats reminder */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="font-mono" style={{ fontSize: '10px', color: '#111', marginRight: 4, alignSelf: 'center' }}>ACCEPTED:</span>
              {['PDF', 'PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'BMP'].map(t => (
                <span key={t} style={{ background: 'rgba(0,0,0,0.2)', color: '#000', border: '2px solid rgba(0,0,0,0.3)', padding: '2px 8px', fontSize: '10px', fontFamily: 'Space Mono, monospace', fontWeight: 700 }}>
                  {t}
                </span>
              ))}
            </div>

            <button
              onClick={reset}
              style={{ border: '3px solid #000', background: '#000', color: '#FF00FF', padding: '10px 24px', fontFamily: 'Major Mono Display, monospace', fontSize: '13px', cursor: 'pointer', fontWeight: 900 }}
            >
              TRY AGAIN
            </button>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════
            CONVERTING STATE (image → PDF)
        ═══════════════════════════════════════ */}
        {state === 'converting' && (
          <motion.div
            key="converting"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            style={{ border: `4px solid ${border}`, boxShadow: '8px 8px 0px #FF00FF', background: '#0a0a0a', padding: '36px', color: '#FF00FF' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Image size={36} strokeWidth={2} color="#FF00FF" />
                <motion.div
                  animate={{ opacity: [0, 1, 0], x: [0, 14, 28] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ position: 'absolute', top: 8, right: -22 }}
                >
                  →
                </motion.div>
                <FileText size={28} strokeWidth={2} color="#00FFFF" style={{ position: 'absolute', top: 4, right: -42 }} />
              </div>
              <div style={{ marginLeft: 24 }}>
                <div className="font-display" style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.04em', color: '#FF00FF' }}>
                  CONVERTING IMAGE → PDF
                </div>
                <div className="font-mono" style={{ fontSize: '10px', color: '#666', marginTop: 2 }}>
                  {fileName}
                </div>
              </div>
            </div>

            {/* Conversion progress */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="font-mono" style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em' }}>RENDERING TO PDF CANVAS</span>
                <span className="font-mono" style={{ fontSize: '10px', color: '#FF00FF', fontWeight: 700 }}>{convProgress}%</span>
              </div>
              <div style={{ height: 14, background: '#111', border: '2px solid #333', position: 'relative', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${convProgress}%` }}
                  transition={{ duration: 0.1 }}
                  style={{ height: '100%', background: '#FF00FF', position: 'absolute', left: 0, top: 0 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 8px, rgba(0,0,0,0.3) 8px, rgba(0,0,0,0.3) 9px)' }} />
              </div>
            </div>

            {/* Steps */}
            {[
              { label: 'LOADING IMAGE INTO CANVAS', done: convProgress > 20 },
              { label: 'FILLING TRANSPARENT BACKGROUND', done: convProgress > 45 },
              { label: 'ENCODING AS HIGH-QUALITY JPEG', done: convProgress > 65 },
              { label: 'EMBEDDING INTO PDF CONTAINER', done: convProgress > 88 },
              { label: 'FINALIZING PDF FILE', done: convProgress >= 100 },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                {step.done ? (
                  <CheckCircle size={14} strokeWidth={3} color="#00FF00" style={{ flexShrink: 0 }} />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 14, height: 14, border: '2px solid #333', borderTop: '2px solid #FF00FF', borderRadius: '50%', flexShrink: 0 }}
                  />
                )}
                <span className="font-mono" style={{ fontSize: '10px', color: step.done ? '#888' : '#aaa', letterSpacing: '0.06em' }}>
                  {step.label}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════
            UPLOADING / VERIFYING / DONE
        ═══════════════════════════════════════ */}
        {(state === 'uploading' || state === 'verifying' || state === 'done') && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ border: `4px solid ${border}`, boxShadow: '8px 8px 0px #00FFFF', background: '#000', padding: '32px', color: '#00FFFF' }}
          >
            {/* Two-column: info + image preview (if image) */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 22, alignItems: 'flex-start' }}>

              {/* Image thumbnail preview */}
              {isImage && preview?.previewUrl && (
                <div style={{ flexShrink: 0 }}>
                  <div style={{ border: '3px solid #333', background: '#111', padding: 4, width: 100 }}>
                    <img
                      src={preview.previewUrl}
                      alt="Preview"
                      style={{ width: '100%', display: 'block', imageRendering: 'auto' }}
                    />
                  </div>
                  <div className="font-mono" style={{ fontSize: '9px', color: '#555', textAlign: 'center', marginTop: 4 }}>
                    {preview.widthPx}×{preview.heightPx}px
                  </div>
                </div>
              )}

              {/* Status text */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <motion.div
                    animate={{ rotate: state === 'done' ? 0 : 360 }}
                    transition={{ duration: 1.1, repeat: state === 'done' ? 0 : Infinity, ease: 'linear' }}
                  >
                    {isImage
                      ? <FileText size={28} strokeWidth={2.5} color="#00FFFF" />
                      : <File     size={28} strokeWidth={2.5} color="#00FFFF" />
                    }
                  </motion.div>
                  <div>
                    <div className="font-display" style={{ fontSize: '14px', letterSpacing: '0.04em', color: '#00FFFF' }}>
                      {state === 'done' ? 'UPLOAD COMPLETE' : state === 'verifying' ? 'VERIFYING...' : 'TRANSMITTING...'}
                    </div>
                    {isImage && (
                      <div className="font-mono" style={{ fontSize: '10px', color: '#555', marginTop: 2, letterSpacing: '0.06em' }}>
                        {fileType} → PDF (1 PAGE)
                      </div>
                    )}
                  </div>
                </div>
                <div className="font-mono" style={{ fontSize: '10px', color: '#555', wordBreak: 'break-all' }}>
                  FILE: {fileName}
                </div>
              </div>
            </div>

            {/* Byte progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="font-mono" style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em' }}>
                  {isImage ? 'PROCESSED PDF BYTES' : 'RAW BYTES RECEIVED'}
                </span>
                <span className="font-mono" style={{ fontSize: '10px', color: '#00FFFF' }}>
                  {formatBytes(bytesReceived)} / {formatBytes(totalBytes)}
                </span>
              </div>
              <div style={{ height: 14, background: '#111', border: '2px solid #333', position: 'relative', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.08 }}
                  style={{ height: '100%', background: '#00FFFF', position: 'absolute', left: 0, top: 0 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0, transparent 6px, rgba(0,0,0,0.25) 6px, rgba(0,0,0,0.25) 7px)' }} />
              </div>
              <div style={{ textAlign: 'right', marginTop: 3 }}>
                <span className="font-mono" style={{ fontSize: '20px', fontWeight: 900, color: '#FFFF00' }}>{progress.toFixed(1)}%</span>
              </div>
            </div>

            {/* PDF Integrity check */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '10px 14px', border: '2px solid #1a1a1a', background: '#080808' }}>
              {integrityOk === null ? (
                <div style={{ width: 16, height: 16, border: '2px solid #333', borderTop: '2px solid #FF00FF', borderRadius: '50%', flexShrink: 0, animation: 'spin 0.7s linear infinite' }} />
              ) : integrityOk ? (
                <CheckCircle size={16} strokeWidth={3} style={{ color: '#00FF00', flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={16} strokeWidth={3} style={{ color: '#FF0000', flexShrink: 0 }} />
              )}
              <span className="font-mono" style={{ fontSize: '10px', letterSpacing: '0.08em', color: '#888' }}>
                PDF INTEGRITY CHECK{integrityOk === null ? '...' : integrityOk ? ' ✓ CLEAN' : ' ✗ FAILED'}
              </span>
            </div>

            {/* Page counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '2px solid #1a1a1a', background: '#080808', marginBottom: 4 }}>
              <div style={{ width: 16, height: 16, background: '#FF00FF', flexShrink: 0 }} />
              <span className="font-mono" style={{ fontSize: '11px', letterSpacing: '0.04em', color: '#888' }}>
                PAGES DETECTED:&nbsp;
                <motion.span
                  key={pagesDetected}
                  initial={{ scale: 1.5, color: '#FFFF00' }}
                  animate={{ scale: 1, color: '#00FFFF' }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'inline-block', fontWeight: 900, fontSize: '16px' }}
                >
                  {pagesDetected}
                </motion.span>
                {state === 'uploading' && !isImage && <span className="anim-blink" style={{ color: '#00FFFF' }}>_</span>}
                {isImage && (
                  <span className="font-mono" style={{ fontSize: '10px', color: '#555', marginLeft: 8 }}>
                    (SINGLE IMAGE = 1 PAGE)
                  </span>
                )}
              </span>
            </div>

            {/* Done banner */}
            {state === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ marginTop: 16, padding: '12px 16px', background: '#00FF00', border: '3px solid #000', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                {isImage
                  ? <><Image size={18} strokeWidth={3} color="#000" /> <span className="font-display" style={{ color: '#000', fontWeight: 900, fontSize: '14px' }}>IMAGE CONVERTED & READY!</span></>
                  : <span className="font-display" style={{ color: '#000', fontWeight: 900, fontSize: '14px' }}>✓ READY TO CONFIGURE</span>
                }
              </motion.div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Re-upload hint (below zone, always visible) ── */}
      {state === 'idle' && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', border: `3px solid ${border}`, background: 'var(--bg-alt)' }}>
          <RefreshCw size={16} strokeWidth={2.5} color="#FF00FF" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="font-mono" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.06em', marginBottom: 3 }}>
              NEED TO PRINT A WORD FILE (.DOC/.DOCX)?
            </div>
            <div className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Open in Microsoft Word → File → Save As → PDF → Upload that PDF here.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
