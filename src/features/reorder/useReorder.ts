import { useState, useMemo, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { PdfFileItem, PageItem, ProcessingStatus } from '@/types/pdf'
import { validateFileType, checkSingleFileSizePolicy } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { reorderPages } from '@/lib/pdf/reorder'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildPageItems(pageCount: number): PageItem[] {
  return Array.from({ length: pageCount }, (_, i) => ({
    id: `page-${i}`,
    originalIndex: i,
    originalPageNumber: i + 1,
  }))
}

export interface UseReorderReturn {
  file: PdfFileItem | null
  pages: PageItem[]
  outputName: string
  status: ProcessingStatus
  error: string | null
  /** file !== null && pageCount >= 2 */
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  movePage: (fromIndex: number, toIndex: number) => void
  resetOrder: () => void
  setOutputName: (name: string) => void
  handleReorder: () => Promise<void>
  reset: () => void
}

export function useReorder(): UseReorderReturn {
  const [file, setFileState] = useState<PdfFileItem | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
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
      setPages(buildPageItems(pageCount))
      setOutputNameState(newFile.name.replace(/\.pdf$/i, '') + '_reordered.pdf')
      setError(null)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 처리할 수 없어요.')
    }
  }, [])

  const movePage = useCallback((fromIndex: number, toIndex: number) => {
    setPages((prev) => arrayMove(prev, fromIndex, toIndex))
  }, [])

  const resetOrder = useCallback(() => {
    if (file) {
      setPages(buildPageItems(file.pageCount))
    }
  }, [file])

  const setOutputName = useCallback((name: string) => {
    setOutputNameState(name)
  }, [])

  const canExecute = useMemo(() => {
    return file !== null && file.pageCount >= 2 && status !== 'processing'
  }, [file, status])

  const handleReorder = useCallback(async () => {
    if (!file) return

    setStatus('processing')
    setError(null)

    try {
      const orderedIndices = pages.map((p) => p.originalIndex)
      const bytes = await reorderPages(file.file, orderedIndices)
      const finalName = outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + '_reordered.pdf'
      downloadPDF(bytes, finalName)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 파일을 확인하고 다시 시도해 주세요.')
    }
  }, [file, pages])

  const reset = useCallback(() => {
    setFileState(null)
    setPages([])
    setOutputNameState('')
    setStatus('idle')
    setError(null)
  }, [])

  return {
    file,
    pages,
    outputName,
    status,
    error,
    canExecute,
    setFile,
    movePage,
    resetOrder,
    setOutputName,
    handleReorder,
    reset,
  }
}
