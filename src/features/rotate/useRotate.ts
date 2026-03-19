import { useState, useMemo, useCallback } from 'react'
import type { PdfFileItem, ProcessingStatus, RotateDegree, PageRotation } from '@/types/pdf'
import { validateFileType, checkSingleFileSizePolicy } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { parsePageRanges, validateRangeInput } from '@/lib/pdf/pageRange'
import { rotatePages } from '@/lib/pdf/rotate'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UseRotateReturn {
  file: PdfFileItem | null
  rangeInput: string
  rangeError: string | null
  degree: RotateDegree | null
  outputName: string
  status: ProcessingStatus
  error: string | null
  /**
   * file !== null
   * && degree !== null
   * && (rangeInput === '' || (rangeInput.trim() !== '' && rangeError === null))
   */
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  setRangeInput: (input: string) => void
  setDegree: (degree: RotateDegree) => void
  setOutputName: (name: string) => void
  handleRotate: () => Promise<void>
  reset: () => void
}

export function useRotate(): UseRotateReturn {
  const [file, setFileState] = useState<PdfFileItem | null>(null)
  const [rangeInput, setRangeInputState] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [degree, setDegreeState] = useState<RotateDegree | null>(null)
  const [outputName, setOutputNameState] = useState('')
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
      setDegreeState(null)
      setOutputNameState(newFile.name.replace(/\.pdf$/i, '') + '_rotated.pdf')
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 처리할 수 없어요.')
    }
  }, [])

  const setRangeInput = useCallback((input: string) => {
    setRangeInputState(input)
    if (file) {
      setRangeError(input.trim() ? validateRangeInput(input, file.pageCount) : null)
    }
  }, [file])

  const setDegree = useCallback((deg: RotateDegree) => {
    setDegreeState(deg)
  }, [])

  const setOutputName = useCallback((name: string) => {
    setOutputNameState(name)
  }, [])

  const canExecute = useMemo(() => {
    if (!file || !degree || status === 'processing') return false
    if (rangeInput.trim() === '') return true // 빈 입력 = 전체 페이지
    return rangeError === null
  }, [file, degree, rangeInput, rangeError, status])

  const handleRotate = useCallback(async () => {
    if (!file || !degree) return

    setStatus('processing')
    setError(null)

    try {
      let rotations: PageRotation[]

      if (rangeInput.trim() === '') {
        // 전체 페이지 회전
        rotations = Array.from({ length: file.pageCount }, (_, i) => ({
          pageIndex: i,
          rotateDegrees: degree,
        }))
      } else {
        const indices = parsePageRanges(rangeInput, file.pageCount)
        rotations = indices.map((pageIndex) => ({ pageIndex, rotateDegrees: degree }))
      }

      const bytes = await rotatePages(file.file, rotations)
      const finalName = outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + '_rotated.pdf'
      downloadPDF(bytes, finalName)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 파일을 확인하고 다시 시도해 주세요.')
    }
  }, [file, degree, rangeInput])

  const reset = useCallback(() => {
    setFileState(null)
    setRangeInputState('')
    setRangeError(null)
    setDegreeState(null)
    setOutputNameState('')
    setStatus('idle')
    setError(null)
  }, [])

  return {
    file,
    rangeInput,
    rangeError,
    degree,
    outputName,
    status,
    error,
    canExecute,
    setFile,
    setRangeInput,
    setDegree,
    setOutputName,
    handleRotate,
    reset,
  }
}
