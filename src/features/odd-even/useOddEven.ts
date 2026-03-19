import { useState, useMemo, useCallback } from 'react'
import type { OddEvenMode, ProcessingStatus } from '@/types/pdf'
import { validateFileType, isEncryptedPDF } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { extractOddOrEvenPages } from '@/lib/pdf/oddEven'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseOddEvenReturn {
  file: { id: string; file: File; pageCount: number } | null
  fileError: string | null
  mode: OddEvenMode | null
  outputName: string
  outputNameDirty: boolean
  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null
  canExecute: boolean
  noPages: boolean
  oddCount: number
  evenCount: number
  setFile: (file: File) => Promise<void>
  removeFile: () => void
  setMode: (mode: OddEvenMode) => void
  setOutputName: (name: string) => void
  handleExtract: () => Promise<void>
  handleRetryDownload: () => void
  retryFromError: () => void
  reset: () => void
}

export function useOddEven(): UseOddEvenReturn {
  const [file, setFileState] = useState<{ id: string; file: File; pageCount: number } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [mode, setModeState] = useState<OddEvenMode | null>(null)
  const [outputName, setOutputNameState] = useState('')
  const [outputNameDirty, setOutputNameDirty] = useState(false)
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
    setStatus('idle')
    setError(null)
    setResultBlob(null)
    setOutputNameDirty(false)
    // 기본 모드 null — 사용자가 선택하도록
    setModeState(null)
    setOutputNameState(newFile.name.replace(/\.pdf$/i, '') + '_odd')
  }, [])

  const removeFile = useCallback(() => {
    setFileState(null)
    setFileError(null)
    setModeState(null)
    setOutputNameState('')
    setOutputNameDirty(false)
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  const setMode = useCallback((newMode: OddEvenMode) => {
    setModeState(newMode)
    setOutputNameDirty(prev => {
      if (!prev && file) {
        const base = file.file.name.replace(/\.pdf$/i, '')
        setOutputNameState(`${base}_${newMode}`)
      }
      return prev
    })
    // 파일명 자동 갱신 (직접 수정 안 한 경우)
    setFileState(prev => {
      if (prev && !outputNameDirty) {
        const base = prev.file.name.replace(/\.pdf$/i, '')
        setOutputNameState(`${base}_${newMode}`)
      }
      return prev
    })
  }, [file, outputNameDirty])

  const setOutputName = useCallback((name: string) => {
    setOutputNameState(name)
    setOutputNameDirty(true)
  }, [])

  const oddCount = useMemo(() => {
    if (!file) return 0
    return Math.ceil(file.pageCount / 2)
  }, [file])

  const evenCount = useMemo(() => {
    if (!file) return 0
    return Math.floor(file.pageCount / 2)
  }, [file])

  const noPages = useMemo(() => {
    if (!mode || !file) return false
    return mode === 'even' && evenCount === 0
  }, [mode, file, evenCount])

  const canExecute = useMemo(() => {
    return (
      file !== null &&
      fileError === null &&
      mode !== null &&
      !noPages &&
      status === 'idle'
    )
  }, [file, fileError, mode, noPages, status])

  const handleExtract = useCallback(async () => {
    if (!file || !mode || !canExecute) return
    setStatus('processing')
    setError(null)

    const suffix = mode === 'odd' ? '_odd' : '_even'
    const finalName = (outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + suffix) + '.pdf'

    try {
      const bytes = await extractOddOrEvenPages(file.file, mode)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      downloadPDF(bytes, finalName)
      setResultBlob(blob)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 다시 시도해 주세요.')
    }
  }, [file, mode, canExecute, outputName])

  const handleRetryDownload = useCallback(() => {
    if (!resultBlob || !file || !mode) return
    const suffix = mode === 'odd' ? '_odd' : '_even'
    const finalName = (outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + suffix) + '.pdf'
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = finalName
    a.click()
    URL.revokeObjectURL(url)
  }, [resultBlob, file, mode, outputName])

  const retryFromError = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setFileState(null)
    setFileError(null)
    setModeState(null)
    setOutputNameState('')
    setOutputNameDirty(false)
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  return {
    file, fileError, mode, outputName, outputNameDirty,
    status, error, resultBlob, canExecute, noPages, oddCount, evenCount,
    setFile, removeFile, setMode, setOutputName,
    handleExtract, handleRetryDownload, retryFromError, reset,
  }
}
