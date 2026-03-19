import { useState, useCallback } from 'react'
import type { PdfFileItem, ProcessingStatus } from '@/types/pdf'
import { validateFileType, checkSingleFileSizePolicy } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { extractPages } from '@/lib/pdf/split'
import { parsePageRanges, validateRangeInput } from '@/lib/pdf/pageRange'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseExtractReturn {
  file: PdfFileItem | null
  rangeInput: string
  rangeError: string | null
  status: ProcessingStatus
  error: string | null
  /** file !== null && rangeInput.trim() !== '' && rangeError === null */
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  setRangeInput: (input: string) => void
  handleExtract: () => Promise<void>
  reset: () => void
}

export function useExtract(): UseExtractReturn {
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

  const canExecute = Boolean(
    file &&
    status !== 'processing' &&
    rangeInput.trim() &&
    !rangeError
  )

  const handleExtract = useCallback(async () => {
    if (!file) return
    if (!rangeInput.trim()) {
      setRangeError('추출할 페이지 범위를 입력해 주세요.')
      return
    }

    setStatus('processing')
    setError(null)

    try {
      const indices = parsePageRanges(rangeInput, file.pageCount)
      const bytes = await extractPages(file.file, indices)
      const baseName = file.file.name.replace(/\.pdf$/i, '')
      const rangeLabel = rangeInput.trim().replace(/\s*,\s*/g, '_')
      downloadPDF(bytes, `${baseName}_extracted_${rangeLabel}.pdf`)
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
    status,
    error,
    canExecute,
    setFile,
    setRangeInput,
    handleExtract,
    reset,
  }
}
