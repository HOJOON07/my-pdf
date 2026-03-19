import { Loader2, CheckCircle, AlertCircle, AlertTriangle, FileText, X, Download, Lock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropZone } from '@/components/FileDropZone'
import { OutputNameInput } from '@/features/merge/OutputNameInput'
import { PasswordInput } from './PasswordInput'
import { usePasswordProtect } from './usePasswordProtect'

export function PasswordProtectPage() {
  const {
    file,
    fileError,
    password,
    confirmPassword,
    passwordMismatch,
    passwordTooShort,
    outputName,
    status,
    error,
    resultBlob,
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
  } = usePasswordProtect()

  const isProcessing = status === 'processing'
  const isDone = status === 'done'
  const isError = status === 'error'

  const passwordMatch =
    confirmPassword.length > 0 && password === confirmPassword && !passwordMismatch

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-lg font-semibold text-green-800">암호화 완료!</p>
          <p className="mt-1 text-sm text-green-600">파일이 자동으로 다운로드 되었어요.</p>
        </div>

        {/* 비밀번호 보관 경고 배너 */}
        <div className="flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-left">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            비밀번호를 안전하게 보관하세요. 분실 시 파일을 열 수 없으며 복구가 불가능해요.
          </p>
        </div>

        <div className="flex gap-3">
          {resultBlob && (
            <Button variant="outline" onClick={handleRetryDownload}>
              <Download className="mr-2 h-4 w-4" />
              다시 다운로드
            </Button>
          )}
          <Button onClick={reset}>새 작업 시작</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {!file && (
        <>
          <FileDropZone
            onFiles={(files) => { if (files[0]) setFile(files[0]) }}
            multiple={false}
            title="암호화할 PDF 파일을 여기에 끌어다 놓으세요"
            disabled={isProcessing}
          />

          {/* 초기 상태 프라이버시 안내 배지 */}
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
            <Shield className="h-4 w-4 shrink-0 text-gray-400" />
            파일과 비밀번호는 서버로 전송되지 않습니다
          </div>
        </>
      )}

      {file && (
        <>
          {/* 파일 카드 */}
          <div
            className={`flex items-center gap-3 rounded-md border px-4 py-3 ${
              fileError
                ? 'border-red-300 bg-red-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <FileText className={`h-5 w-5 shrink-0 ${fileError ? 'text-red-400' : 'text-blue-500'}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{file.file.name}</p>
              {!fileError && (
                <p className="text-xs text-gray-500">전체 {file.pageCount}페이지</p>
              )}
              {fileError && (
                <p className="text-xs text-red-600">{fileError}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={removeFile}
              disabled={isProcessing}
              aria-label={`${file.file.name} 제거`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 비밀번호 설정 섹션 — 암호화 파일 에러 시 숨김 */}
          {!fileError && (
            <>
              <PasswordInput
                id="user-password"
                label="열기 비밀번호"
                value={password}
                onChange={setPassword}
                placeholder="비밀번호를 입력하세요"
                warning={passwordTooShort ? '8자 이상의 비밀번호를 사용하면 더 안전해요.' : undefined}
                disabled={isProcessing}
                autoComplete="new-password"
              />

              <PasswordInput
                id="confirm-password"
                label="비밀번호 확인"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="비밀번호를 한 번 더 입력하세요"
                error={passwordMismatch ? '비밀번호가 일치하지 않아요.' : undefined}
                success={passwordMatch}
                successMessage="비밀번호가 일치해요."
                disabled={isProcessing}
                autoComplete="new-password"
              />

              <OutputNameInput
                value={outputName}
                onChange={setOutputName}
                disabled={isProcessing}
                placeholder={`${file.file.name.replace(/\.pdf$/i, '')}_protected.pdf`}
              />
            </>
          )}
        </>
      )}

      {/* 에러 메시지 (처리 실패) */}
      {isError && error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">암호화 중 오류가 발생했어요.</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-red-600 hover:text-red-700"
            onClick={retryFromError}
          >
            다시 시도
          </Button>
        </div>
      )}

      {/* 실행 버튼 */}
      {file && !fileError && (
        <>
          <Button
            className="w-full"
            size="lg"
            onClick={handleProtect}
            disabled={!canExecute}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                암호화 중...
              </>
            ) : (
              'PDF 암호화하기 →'
            )}
          </Button>

          {/* 신뢰 배지 */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <Lock className="h-3.5 w-3.5" />
            AES-256 암호화 · 파일과 비밀번호는 서버로 전송되지 않습니다
          </div>
        </>
      )}
    </div>
  )
}
