import { useState, useCallback, useMemo } from 'react'
import type { PdfFileItem, ProcessingStatus } from '@/types/pdf'
import { validateFileType, checkSingleFileSizePolicy } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { deletePages } from '@/lib/pdf/split'
import { parsePageRanges, validateRangeInput } from '@/lib/pdf/pageRange'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseDeleteReturn {
  file: PdfFileItem | null
  rangeInput: string
  rangeError: string | null
  /** 삭제 후 남은 페이지 0개일 때의 경고 문구. 정상이면 null */
  deleteAllWarning: string | null
  status: ProcessingStatus
  error: string | null
  /** file !== null && rangeInput.trim() !== '' && rangeError === null && deleteAllWarning === null */
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  setRangeInput: (input: string) => void
  handleDelete: () => Promise<void>
  reset: () => void
}

export function useDelete(): UseDeleteReturn {
  const [file, setFileState] = useState<PdfFileItem | null>(null)
  const [rangeInput, setRangeInputState] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const setFile = useCallback(async (newFile: File) => {
    try {
      validateFileType(newFile)
      const policy = checkSingleFileSizePolicy(newFile)
      if (policy === 'reject') {
        setError('400MB를 초과하는 파일은 지원하지 않아요.')
        return
      }
      const pageCount = await getPdfPageCount(newFile)
      setFileState({ id: generateId(), file: newFile, pageCount })
      setError(null)
      setRangeInputState('')
      setRangeError(null)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 처리할 수 없어요.')
    }
  }, [])

  const setRangeInput = useCallback((input: string) => {
    setRangeInputState(input)
    if (file) {
      setRangeError(validateRangeInput(input, file.pageCount))
    }
  }, [file])

  // 삭제 후 남은 페이지 0개일 때 경고 문구. 아키텍처 설계 6항 패턴.
  const deleteAllWarning = useMemo<string | null>(() => {
    if (!file || !rangeInput.trim() || rangeError) return null
    try {
      const indices = parsePageRanges(rangeInput, file.pageCount)
      const remainingCount = file.pageCount - new Set(indices).size
      return remainingCount <= 0
        ? '모든 페이지를 삭제할 수 없어요. 일부 페이지는 남겨야 합니다.'
        : null
    } catch {
      return null // rangeError가 이미 처리
    }
  }, [file, rangeInput, rangeError])

  const canExecute = Boolean(
    file &&
    status !== 'processing' &&
    rangeInput.trim() &&
    !rangeError &&
    !deleteAllWarning
  )

  const handleDelete = useCallback(async () => {
    if (!file) return
    if (!rangeInput.trim()) {
      setRangeError('삭제할 페이지 범위를 입력해 주세요.')
      return
    }

    setStatus('processing')
    setError(null)

    try {
      const indices = parsePageRanges(rangeInput, file.pageCount)
      const bytes = await deletePages(file.file, indices)
      const baseName = file.file.name.replace(/\.pdf$/i, '')
      const rangeLabel = rangeInput.trim().replace(/\s*,\s*/g, '_')
      downloadPDF(bytes, `${baseName}_deleted_${rangeLabel}.pdf`)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 파일을 확인하고 다시 시도해 주세요.')
    }
  }, [file, rangeInput])

  const reset = useCallback(() => {
    setFileState(null)
    setRangeInputState('')
    setRangeError(null)
    setStatus('idle')
    setError(null)
  }, [])

  return {
    file,
    rangeInput,
    rangeError,
    deleteAllWarning,
    status,
    error,
    canExecute,
    setFile,
    setRangeInput,
    handleDelete,
    reset,
  }
}
