/**
 * imageConverter.ts
 * -----------------
 * Pure client-side image → PDF conversion using jsPDF.
 * Supports PNG, JPEG, WEBP, GIF, BMP.
 *
 * Strategy:
 *  1. Draw image onto a canvas (handles all formats uniformly)
 *  2. Export canvas as JPEG data URL (jsPDF works best with JPEG)
 *  3. Create a PDF whose dimensions match the image exactly (px-based)
 *  4. Return a File object (application/pdf) so the rest of the upload
 *     flow treats it exactly like a user-uploaded PDF.
 */

import jsPDF from 'jspdf'

export const SUPPORTED_IMAGES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/avif']
export const SUPPORTED_PDF    = ['application/pdf']
export const ALL_SUPPORTED    = [...SUPPORTED_PDF, ...SUPPORTED_IMAGES]

// Word documents — we deliberately reject these with a helpful message
export const WORD_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function getFileCategory(type: string): 'pdf' | 'image' | 'word' | 'unsupported' {
  if (SUPPORTED_PDF.includes(type))    return 'pdf'
  if (SUPPORTED_IMAGES.includes(type)) return 'image'
  if (WORD_TYPES.includes(type))       return 'word'
  return 'unsupported'
}

export interface ConversionResult {
  file: File
  previewUrl: string   // object URL for the image thumbnail
  originalName: string
  originalType: string
  widthPx: number
  heightPx: number
}

/**
 * Convert any supported image file to a PDF File object.
 * Returns the converted file plus a preview URL and dimensions.
 */
export async function imageToPDF(imageFile: File): Promise<ConversionResult> {
  // 1. Create a preview object URL for the thumbnail
  const previewUrl = URL.createObjectURL(imageFile)

  // 2. Load image into an HTMLImageElement
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload  = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to load image'))
    el.src = previewUrl
  })

  const { naturalWidth: W, naturalHeight: H } = img

  // 3. Draw onto canvas
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  // White background (important for transparent PNGs)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(img, 0, 0)

  // 4. Export canvas to JPEG data URL (good compression, jsPDF compat)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

  // 5. Build PDF — use pixel dimensions, portrait vs landscape auto-detected
  const orientation = W >= H ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [W, H],
    hotfixes: ['px_scaling'],
  })

  // Add the image to fill the entire page
  pdf.addImage(dataUrl, 'JPEG', 0, 0, W, H)

  // 6. Convert to Blob → File
  const blob = pdf.output('blob')
  const pdfName = imageFile.name.replace(/\.[^.]+$/, '.pdf')
  const pdfFile = new File([blob], pdfName, { type: 'application/pdf' })

  return {
    file: pdfFile,
    previewUrl,
    originalName: imageFile.name,
    originalType: imageFile.type,
    widthPx: W,
    heightPx: H,
  }
}

/** Human-readable file size */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)             return `${bytes} B`
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** Get a short label for the file type */
export function fileTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'application/pdf':  'PDF',
    'image/png':        'PNG',
    'image/jpeg':       'JPEG',
    'image/jpg':        'JPEG',
    'image/webp':       'WEBP',
    'image/gif':        'GIF',
    'image/bmp':        'BMP',
    'image/tiff':       'TIFF',
    'image/avif':       'AVIF',
  }
  return map[type] || type.split('/')[1]?.toUpperCase() || 'FILE'
}
