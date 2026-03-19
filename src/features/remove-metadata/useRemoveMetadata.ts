import { useState, useMemo, useCallback } from 'react'
import type { PdfInfo, ProcessingStatus } from '@/types/pdf'
import { validateFileType, isEncryptedPDF } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { getPdfInfo } from '@/lib/pdf/info'
import { removeMetadata } from '@/lib/pdf/metadata'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseRemoveMetadataReturn {
  file: { id: string; file: File; pageCount: number } | null
  fileError: string | null
  info: PdfInfo | null
  outputName: string
  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  removeFile: () => void
  setOutputName: (name: string) => void
  handleRemove: () => Promise<void>
  handleRetryDownload: () => void
  retryFromError: () => void
  reset: () => void
}

export function useRemoveMetadata(): UseRemoveMetadataReturn {
  const [file, setFileState] = useState<{ id: string; file: File; pageCount: number } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [outputName, setOutputNameState] = useState('')
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)

  const setFile = useCallback(async (newFile: File) => {
    try {
      validateFileType(newFile)
    } catch (e) {
      setFileError(e instanceof Error ? e.message : '파일을 처리할 수 없어요.')
      return
    }

    const arrayBuffer = await newFile.arrayBuffer()
    const encrypted = await isEncryptedPDF(arrayBuffer)
    if (encrypted) {
      setFileState({ id: generateId(), file: newFile, pageCount: 0 })
      setFileError('이 파일은 암호화되어 있어요. 암호화되지 않은 PDF를 사용해 주세요.')
      return
    }

    const pageCount = await getPdfPageCount(newFile)
    setFileState({ id: generateId(), file: newFile, pageCount })
    setFileError(null)
    setOutputNameState(newFile.name.replace(/\.pdf$/i, '') + '_cleaned')
    setStatus('idle')
    setError(null)
    setResultBlob(null)

    // 현재 메타데이터 로드
    try {
      const pdfInfo = await getPdfInfo(newFile)
      setInfo(pdfInfo)
    } catch {
      setInfo(null)
    }
  }, [])

  const removeFile = useCallback(() => {
    setFileState(null)
    setFileError(null)
    setInfo(null)
    setOutputNameState('')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  const setOutputName = useCallback((name: string) => {
    setOutputNameState(name)
  }, [])

  const canExecute = useMemo(() => {
    return file !== null && fileError === null && status === 'idle'
  }, [file, fileError, status])

  const handleRemove = useCallback(async () => {
    if (!file || !canExecute) return
    setStatus('processing')
    setError(null)

    const finalName = (outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + '_cleaned') + '.pdf'

    try {
      const bytes = await removeMetadata(file.file)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      downloadPDF(bytes, finalName)
      setResultBlob(blob)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 다시 시도해 주세요.')
    }
  }, [file, canExecute, outputName])

  const handleRetryDownload = useCallback(() => {
    if (!resultBlob || !file) return
    const finalName = (outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + '_cleaned') + '.pdf'
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = finalName
    a.click()
    URL.revokeObjectURL(url)
  }, [resultBlob, file, outputName])

  const retryFromError = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setFileState(null)
    setFileError(null)
    setInfo(null)
    setOutputNameState('')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  return {
    file, fileError, info, outputName, status, error, resultBlob, canExecute,
    setFile, removeFile, setOutputName, handleRemove, handleRetryDownload, retryFromError, reset,
  }
}
