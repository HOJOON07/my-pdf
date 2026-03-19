import { useState, useCallback } from 'react'
import { validateFileType } from '@/lib/pdf/validate'
import { getPdfInfo } from '@/lib/pdf/info'
import type { PdfInfo } from '@/types/pdf'

export interface UseInfoReturn {
  file: File | null
  info: PdfInfo | null
  status: 'idle' | 'loading' | 'done' | 'error'
  error: string | null
  setFile: (file: File) => Promise<void>
  removeFile: () => void
}

export function useInfo(): UseInfoReturn {
  const [file, setFileState] = useState<File | null>(null)
  const [info, setInfo] = useState<PdfInfo | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const setFile = useCallback(async (newFile: File) => {
    try {
      validateFileType(newFile)
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 처리할 수 없어요.')
      return
    }

    setFileState(newFile)
    setInfo(null)
    setStatus('loading')
    setError(null)

    try {
      const result = await getPdfInfo(newFile)
      setInfo(result)
      setStatus('done')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '파일을 분석할 수 없어요.')
    }
  }, [])

  const removeFile = useCallback(() => {
    setFileState(null)
    setInfo(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { file, info, status, error, setFile, removeFile }
}
