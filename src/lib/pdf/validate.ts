import { PDFDocument } from 'pdf-lib'
import type { FileSizePolicy } from '@/types/pdf'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const WARN_FILE_SIZE = 300 * 1024 * 1024  // 300MB

/** 파일 MIME 타입 및 확장자 검사. 실패 시 Error throw */
export function validateFileType(file: File): void {
  const isPdfMime = file.type === 'application/pdf'
  const isPdfExt = file.name.toLowerCase().endsWith('.pdf')
  if (!isPdfMime && !isPdfExt) {
    throw new Error('PDF 파일만 업로드할 수 있어요.')
  }
}

/** 단일 파일 크기 정책 반환 */
export function checkSingleFileSizePolicy(file: File): FileSizePolicy {
  if (file.size > MAX_FILE_SIZE) return 'reject'
  if (file.size > WARN_FILE_SIZE) return 'warn'
  return 'ok'
}

/** 파일 배열의 합산 크기 정책 반환 */
export function checkFileSizePolicy(files: File[]): FileSizePolicy {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  if (totalSize > MAX_FILE_SIZE) return 'reject'
  if (totalSize > WARN_FILE_SIZE) return 'warn'
  return 'ok'
}

/** pdf-lib load 후 0페이지 검사. 실패 시 Error throw */
export function validatePageCount(doc: PDFDocument): void {
  if (doc.getPageCount() === 0) {
    throw new Error('페이지가 없는 PDF 파일입니다.')
  }
}

/**
 * PDF 암호화 여부 감지.
 * pdf-lib load 시도 → 예외 메시지로 판단.
 * 암호화된 경우 true, 아닌 경우 false 반환.
 */
export async function isEncryptedPDF(arrayBuffer: ArrayBuffer): Promise<boolean> {
  try {
    await PDFDocument.load(arrayBuffer)
    return false
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.toLowerCase().includes('encrypt') || msg.toLowerCase().includes('password')) {
      return true
    }
    return false
  }
}
