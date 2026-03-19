import { useState, useCallback } from 'react'
import type { PdfFileItem, SplitMode, ProcessingStatus } from '@/types/pdf'
import { validateFileType, checkSingleFileSizePolicy } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { splitAllPages, splitByRanges } from '@/lib/pdf/split'
import { parseRangesIntoGroups, validateRangeInput } from '@/lib/pdf/pageRange'
import { downloadPDF, downloadZip } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseSplitReturn {
  file: PdfFileItem | null
  mode: SplitMode | null
  rangeInput: string
  rangeError: string | null
  status: ProcessingStatus
  error: string | null
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  clearFile: () => void
  setMode: (mode: SplitMode) => void
  setRangeInput: (input: string) => void
  handleSplit: () => Promise<void>
  reset: () => void
}

export function useSplit(): UseSplitReturn {
  const [file, setFileState] = useState<PdfFileItem | null>(null)
  const [mode, setModeState] = useState<SplitMode | null>(null)
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
      setModeState(null)
      setRangeInputState('')
      setRangeError(null)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 처리할 수 없어요.')
    }
  }, [])

  const clearFile = useCallback(() => {
    setFileState(null)
    setModeState(null)
    setRangeInputState('')
    setRangeError(null)
    setError(null)
    setStatus('idle')
  }, [])

  const setMode = useCallback((newMode: SplitMode) => {
    setModeState(newMode)
    setRangeError(null)
    setError(null)
  }, [])

  const setRangeInput = useCallback((input: string) => {
    setRangeInputState(input)
    if (file) {
      const err = validateRangeInput(input, file.pageCount)
      setRangeError(err)
    }
  }, [file])

  const canExecute = Boolean(
    file &&
    mode &&
    status !== 'processing' &&
    (mode === 'all' || (mode === 'range' && rangeInput.trim() && !rangeError))
  )

  const handleSplit = useCallback(async () => {
    if (!file || !mode) return
    if (mode === 'range' && !rangeInput.trim()) {
      setRangeError('페이지 범위를 입력해 주세요.')
      return
    }

    setStatus('processing')
    setError(null)

    try {
      const baseName = file.file.name.replace(/\.pdf$/i, '')

      if (mode === 'all') {
        const pages = await splitAllPages(file.file)
        if (pages.length === 1) {
          downloadPDF(pages[0], `${baseName}_p1.pdf`)
        } else {
          const zipFiles = pages.map((bytes, i) => ({
            name: `${baseName}_p${i + 1}.pdf`,
            bytes,
          }))
          await downloadZip(zipFiles, `${baseName}_split.zip`)
        }
      } else {
        const groups = parseRangesIntoGroups(rangeInput, file.pageCount)
        const splitDocs = await splitByRanges(file.file, groups)
        if (splitDocs.length === 1) {
          downloadPDF(splitDocs[0], `${baseName}_${groups[0].label}.pdf`)
        } else {
          const zipFiles = splitDocs.map((bytes, i) => ({
            name: `${baseName}_${groups[i].label}.pdf`,
            bytes,
          }))
          await downloadZip(zipFiles, `${baseName}_split.zip`)
        }
      }

      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 파일을 확인하고 다시 시도해 주세요.')
    }
  }, [file, mode, rangeInput])

  const reset = useCallback(() => {
    setFileState(null)
    setModeState(null)
    setRangeInputState('')
    setRangeError(null)
    setStatus('idle')
    setError(null)
  }, [])

  return {
    file,
    mode,
    rangeInput,
    rangeError,
    status,
    error,
    canExecute,
    setFile,
    clearFile,
    setMode,
    setRangeInput,
    handleSplit,
    reset,
  }
}
