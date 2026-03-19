import { useState, useMemo, useCallback } from 'react'
import type { PageNumberPosition, PageNumberOptions, ProcessingStatus } from '@/types/pdf'
import { validateFileType, isEncryptedPDF } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { addPageNumbers } from '@/lib/pdf/pageNumbers'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseAddPageNumbersReturn {
  file: { id: string; file: File; pageCount: number } | null
  fileError: string | null
  position: PageNumberPosition
  startNumber: number
  startNumberError: string | null
  outputName: string
  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  removeFile: () => void
  setPosition: (pos: PageNumberPosition) => void
  setStartNumber: (n: number) => void
  setOutputName: (name: string) => void
  handleAdd: () => Promise<void>
  handleRetryDownload: () => void
  retryFromError: () => void
  reset: () => void
}

export function useAddPageNumbers(): UseAddPageNumbersReturn {
  const [file, setFileState] = useState<{ id: string; file: File; pageCount: number } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [position, setPositionState] = useState<PageNumberPosition>('bottom-center')
  const [startNumber, setStartNumberState] = useState(1)
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
    setOutputNameState(newFile.name.replace(/\.pdf$/i, '') + '_numbered')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  const removeFile = useCallback(() => {
    setFileState(null)
    setFileError(null)
    setOutputNameState('')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  const setPosition = useCallback((pos: PageNumberPosition) => {
    setPositionState(pos)
  }, [])

  const setStartNumber = useCallback((n: number) => {
    setStartNumberState(n)
  }, [])

  const setOutputName = useCallback((name: string) => {
    setOutputNameState(name)
  }, [])

  const startNumberError = useMemo(() => {
    if (!Number.isInteger(startNumber) || startNumber < 1) {
      return '1 이상의 숫자를 입력해주세요.'
    }
    return null
  }, [startNumber])

  const canExecute = useMemo(() => {
    return file !== null && fileError === null && startNumberError === null && status === 'idle'
  }, [file, fileError, startNumberError, status])

  const handleAdd = useCallback(async () => {
    if (!file || !canExecute) return
    setStatus('processing')
    setError(null)

    const finalName = (outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + '_numbered') + '.pdf'
    const options: PageNumberOptions = {
      position,
      fontSize: 11,
      startNumber,
      format: 'number',
    }

    try {
      const bytes = await addPageNumbers(file.file, options)
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      downloadPDF(bytes, finalName)
      setResultBlob(blob)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 다시 시도해 주세요.')
    }
  }, [file, canExecute, outputName, position, startNumber])

  const handleRetryDownload = useCallback(() => {
    if (!resultBlob || !file) return
    const finalName = (outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + '_numbered') + '.pdf'
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
    setPositionState('bottom-center')
    setStartNumberState(1)
    setOutputNameState('')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  return {
    file, fileError, position, startNumber, startNumberError, outputName,
    status, error, resultBlob, canExecute,
    setFile, removeFile, setPosition, setStartNumber, setOutputName,
    handleAdd, handleRetryDownload, retryFromError, reset,
  }
}
