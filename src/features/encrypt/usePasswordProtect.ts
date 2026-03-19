import { useState, useMemo, useCallback } from 'react'
import type { PdfFileItem, ProcessingStatus } from '@/types/pdf'
import { validateFileType, isEncryptedPDF } from '@/lib/pdf/validate'
import { getPdfPageCount } from '@/lib/pdf/merge'
import { protectPDF } from '@/lib/pdf/protect'
import { downloadPDF } from '@/lib/download'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export interface UsePasswordProtectReturn {
  file: PdfFileItem | null
  fileError: string | null
  password: string
  confirmPassword: string
  passwordMismatch: boolean
  passwordTooShort: boolean
  outputName: string
  status: ProcessingStatus
  error: string | null
  resultBlob: Blob | null
  /**
   * file !== null
   * && fileError === null
   * && password.trim().length > 0
   * && confirmPassword.length > 0
   * && password === confirmPassword
   * && status === 'idle'
   */
  canExecute: boolean
  setFile: (file: File) => Promise<void>
  removeFile: () => void
  setPassword: (value: string) => void
  setConfirmPassword: (value: string) => void
  setOutputName: (name: string) => void
  handleProtect: () => Promise<void>
  handleRetryDownload: () => void
  retryFromError: () => void
  reset: () => void
}

export function usePasswordProtect(): UsePasswordProtectReturn {
  const [file, setFileState] = useState<PdfFileItem | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [password, setPasswordState] = useState('')
  const [confirmPassword, setConfirmPasswordState] = useState('')
  const [outputName, setOutputNameState] = useState('')
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)

  const setFile = useCallback(async (newFile: File) => {
    try {
      validateFileType(newFile)
      const ENCRYPT_MAX = 500 * 1024 * 1024
      if (newFile.size > ENCRYPT_MAX) {
        setFileState({ id: generateId(), file: newFile, pageCount: 0 })
        setFileError('500MB를 초과하는 파일은 지원하지 않아요.')
        return
      }

      const arrayBuffer = await newFile.arrayBuffer()
      const encrypted = await isEncryptedPDF(arrayBuffer)
      if (encrypted) {
        setFileState({ id: generateId(), file: newFile, pageCount: 0 })
        setFileError('이미 암호화된 파일이에요. 암호화되지 않은 PDF를 선택해 주세요.')
        return
      }

      const pageCount = await getPdfPageCount(newFile)
      setFileState({ id: generateId(), file: newFile, pageCount })
      setFileError(null)
      setOutputNameState(newFile.name.replace(/\.pdf$/i, '') + '_protected.pdf')
      setStatus('idle')
      setError(null)
      setResultBlob(null)
    } catch (e) {
      setFileState({ id: generateId(), file: newFile, pageCount: 0 })
      setFileError(e instanceof Error ? e.message : '파일을 처리할 수 없어요.')
    }
  }, [])

  const removeFile = useCallback(() => {
    setFileState(null)
    setFileError(null)
    setOutputNameState('')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  const setPassword = useCallback((value: string) => {
    setPasswordState(value)
  }, [])

  const setConfirmPassword = useCallback((value: string) => {
    setConfirmPasswordState(value)
  }, [])

  const setOutputName = useCallback((name: string) => {
    setOutputNameState(name)
  }, [])

  // 비밀번호 불일치: confirmPassword가 비어 있으면 성급한 에러 방지
  const passwordMismatch = useMemo(() => {
    if (confirmPassword === '') return false
    return password !== confirmPassword
  }, [password, confirmPassword])

  // 8자 미만: 차단하지 않고 amber 힌트만 표시
  const passwordTooShort = useMemo(() => {
    return password.length > 0 && password.length < 8
  }, [password])

  const canExecute = useMemo(() => {
    return (
      file !== null &&
      fileError === null &&
      password.trim().length > 0 &&
      confirmPassword.length > 0 &&
      password === confirmPassword &&
      status === 'idle'
    )
  }, [file, fileError, password, confirmPassword, status])

  const handleProtect = useCallback(async () => {
    if (!file || !canExecute) return

    setStatus('processing')
    setError(null)

    const fileName = file.file.name
    const currentOutputName = outputName.trim() || fileName.replace(/\.pdf$/i, '') + '_protected.pdf'

    try {
      const bytes = await protectPDF(file.file, password)
      downloadPDF(bytes, currentOutputName)
      setResultBlob(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }))
      setStatus('done')
      // 보안: 처리 완료 후 비밀번호 즉시 초기화
      setPasswordState('')
      setConfirmPasswordState('')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : '처리 중 오류가 발생했어요. 파일을 확인하고 다시 시도해 주세요.')
    }
  }, [file, canExecute, password, outputName])

  const handleRetryDownload = useCallback(() => {
    if (!resultBlob || !file) return
    const currentOutputName = outputName.trim() || file.file.name.replace(/\.pdf$/i, '') + '_protected.pdf'
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentOutputName
    a.click()
    URL.revokeObjectURL(url)
  }, [resultBlob, file, outputName])

  const retryFromError = useCallback(() => {
    // status → idle, 파일/비밀번호 입력값 유지
    setStatus('idle')
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setFileState(null)
    setFileError(null)
    setPasswordState('')
    setConfirmPasswordState('')
    setOutputNameState('')
    setStatus('idle')
    setError(null)
    setResultBlob(null)
  }, [])

  return {
    file,
    fileError,
    password,
    confirmPassword,
    passwordMismatch,
    outputName,
    status,
    error,
    resultBlob,
    passwordTooShort,
    canExecute,
    setFile,
    removeFile,
    setPassword,
    setConfirmPassword,
    setOutputName,
    handleProtect,
    handleRetryDownload,
    retryFromError,
    reset,
  }
}
