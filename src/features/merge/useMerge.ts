import { useState, useCallback } from 'react'
import type { PdfFileItem, ProcessingStatus } from '@/types/pdf'
import { validateFileType, checkSingleFileSizePolicy } from '@/lib/pdf/validate'
import { getPdfPageCount, mergePDFs } from '@/lib/pdf/merge'
import { downloadPDF } from '@/lib/download'

// uuid 대신 간단한 고유 ID 생성
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseMergeReturn {
  files: PdfFileItem[]
  outputName: string
  status: ProcessingStatus
  error: string | null
  lastResult: Uint8Array | null
  lastFilename: string | null
  addFiles: (newFiles: File[]) => Promise<void>
  removeFile: (id: string) => void
  reorderFiles: (fromIndex: number, toIndex: number) => void
  setOutputName: (name: string) => void
  handleMerge: () => Promise<void>
  retryDownload: () => void
  reset: () => void
}

export function useMerge(): UseMergeReturn {
  const [files, setFiles] = useState<PdfFileItem[]>([])
  const [outputName, setOutputName] = useState('merged.pdf')
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<Uint8Array | null>(null)
  const [lastFilename, setLastFilename] = useState<string | null>(null)

  const addFiles = useCallback(async (newFiles: File[]) => {
    const validFiles: PdfFileItem[] = []
    const errors: string[] = []

    await Promise.all(
      newFiles.map(async (file) => {
        try {
          validateFileType(file)
          const policy = checkSingleFileSizePolicy(file)
          if (policy === 'reject') {
            errors.push(`${file.name}: 400MB를 초과하는 파일은 지원하지 않아요.`)
            return
          }
          const pageCount = await getPdfPageCount(file)
          validFiles.push({ id: generateId(), file, pageCount })
        } catch (e) {
          errors.push(`${file.name}: ${e instanceof Error ? e.message : '파일을 처리할 수 없어요.'}`)
        }
      })
    )

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
    }
    if (errors.length > 0) {
      setError(errors.join('\n'))
    }
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    setError(null)
  }, [])

  const reorderFiles = useCallback((fromIndex: number, toIndex: number) => {
    setFiles(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }, [])

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return
    setStatus('processing')
    setError(null)

    try {
      const rawFiles = files.map(f => f.file)
      const bytes = await mergePDFs(rawFiles)
      const filename = outputName.trim() || 'merged.pdf'
      const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`

      setLastResult(bytes)
      setLastFilename(finalFilename)
      setStatus('done')
      downloadPDF(bytes, finalFilename)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 파일을 확인하고 다시 시도해 주세요.')
    }
  }, [files, outputName])

  const retryDownload = useCallback(() => {
    if (lastResult && lastFilename) {
      downloadPDF(lastResult, lastFilename)
    }
  }, [lastResult, lastFilename])

  const reset = useCallback(() => {
    setFiles([])
    setOutputName('merged.pdf')
    setStatus('idle')
    setError(null)
    setLastResult(null)
    setLastFilename(null)
  }, [])

  return {
    files,
    outputName,
    status,
    error,
    lastResult,
    lastFilename,
    addFiles,
    removeFile,
    reorderFiles,
    setOutputName,
    handleMerge,
    retryDownload,
    reset,
  }
}
