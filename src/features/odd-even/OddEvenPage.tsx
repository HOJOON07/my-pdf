import { Loader2, CheckCircle, AlertCircle, AlertTriangle, FileText, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropZone } from '@/components/FileDropZone'
import { OutputNameInput } from '@/features/merge/OutputNameInput'
import { useOddEven } from './useOddEven'
import type { OddEvenMode } from '@/types/pdf'
import { cn } from '@/lib/cn'

interface ModeCardProps {
  value: OddEvenMode
  selected: boolean
  onSelect: (v: OddEvenMode) => void
  label: string
  hint: string
  disabled?: boolean
}

function ModeCard({ value, selected, onSelect, label, hint, disabled }: ModeCardProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors',
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <input
        type="radio"
        name="odd-even-mode"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        disabled={disabled}
        className="mt-0.5 accent-blue-600"
      />
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
    </label>
  )
}

export function OddEvenPage() {
  const {
    file, fileError, mode, outputName,
    status, error, resultBlob, canExecute, noPages, oddCount, evenCount,
    setFile, removeFile, setMode, setOutputName,
    handleExtract, handleRetryDownload, retryFromError, reset,
  } = useOddEven()

  const isProcessing = status === 'processing'
  const isDone = status === 'done'
  const isError = status === 'error'

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-lg font-semibold text-green-800">추출 완료!</p>
          <p className="mt-1 text-sm text-green-600">파일이 자동으로 다운로드 되었어요.</p>
        </div>
        <div className="flex gap-3">
          {resultBlob && (
            <Button variant="outline" onClick={handleRetryDownload}>
              <Download className="mr-2 h-4 w-4" />다시 다운로드
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
        <FileDropZone
          onFiles={(files) => { if (files[0]) setFile(files[0]) }}
          multiple={false}
          title="PDF 파일을 여기에 드래그하거나 파일 선택"
          disabled={isProcessing}
        />
      )}

      {file && (
        <>
          <div
            className={`flex items-center gap-3 rounded-md border px-4 py-3 ${
              fileError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
            }`}
          >
            <FileText className={`h-5 w-5 shrink-0 ${fileError ? 'text-red-400' : 'text-blue-500'}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{file.file.name}</p>
              {!fileError && <p className="text-xs text-gray-500">전체 {file.pageCount}페이지</p>}
              {fileError && <p role="alert" className="text-xs text-red-600">{fileError}</p>}
            </div>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={removeFile} disabled={isProcessing}
              aria-label={`${file.file.name} 제거`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!fileError && (
            <>
              <fieldset disabled={isProcessing} className="space-y-2">
                <legend className="text-sm font-medium text-gray-700">추출 모드</legend>
                <div className="pt-1 space-y-2">
                  <ModeCard
                    value="odd"
                    selected={mode === 'odd'}
                    onSelect={setMode}
                    label="홀수 페이지만"
                    hint={`1, 3, 5 ... 페이지 → ${oddCount}페이지 추출`}
                    disabled={isProcessing}
                  />
                  <ModeCard
                    value="even"
                    selected={mode === 'even'}
                    onSelect={setMode}
                    label="짝수 페이지만"
                    hint={`2, 4, 6 ... 페이지 → ${evenCount}페이지 추출`}
                    disabled={isProcessing}
                  />
                </div>
              </fieldset>

              {noPages && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-sm text-amber-700">
                    짝수 페이지가 없어요. 이 파일은 1페이지뿐이에요.
                  </p>
                </div>
              )}

              <OutputNameInput
                value={outputName}
                onChange={setOutputName}
                disabled={isProcessing}
                placeholder={`${file.file.name.replace(/\.pdf$/i, '')}_odd.pdf`}
              />
            </>
          )}
        </>
      )}

      {isError && error && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">오류가 발생했어요.</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 shrink-0 text-red-600 hover:text-red-700" onClick={retryFromError}>
            다시 시도
          </Button>
        </div>
      )}

      {file && !fileError && (
        <Button className="w-full" size="lg" onClick={handleExtract} disabled={!canExecute}>
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />추출 중...</>
          ) : (
            '추출하기'
          )}
        </Button>
      )}
    </div>
  )
}
