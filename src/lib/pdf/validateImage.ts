import type { FileSizePolicy } from '@/types/pdf'

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
])

const SUPPORTED_IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp',
])

const MAX_IMAGE_SIZE = 50 * 1024 * 1024   // 50MB per image
const WARN_IMAGE_SIZE = 20 * 1024 * 1024  // 20MB per image
const MAX_TOTAL_IMAGE_SIZE = 200 * 1024 * 1024  // 200MB 합산

export function validateImageFile(file: File): void {
  const mime = file.type.toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mimeOk = SUPPORTED_IMAGE_MIMES.has(mime)
  const extOk = SUPPORTED_IMAGE_EXTS.has(ext)
  if (!mimeOk && !extOk) {
    throw new Error('지원하지 않는 이미지 형식이에요. (JPG, PNG, WebP, GIF, BMP만 가능)')
  }
}

export function checkImageSizePolicy(file: File): FileSizePolicy {
  if (file.size > MAX_IMAGE_SIZE) return 'reject'
  if (file.size > WARN_IMAGE_SIZE) return 'warn'
  return 'ok'
}

export function checkTotalImageSizePolicy(files: File[]): FileSizePolicy {
  const total = files.reduce((sum, f) => sum + f.size, 0)
  if (total > MAX_TOTAL_IMAGE_SIZE) return 'reject'
  return 'ok'
}

export function isGifFile(file: File): boolean {
  const mime = file.type.toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return mime === 'image/gif' || ext === 'gif'
}
