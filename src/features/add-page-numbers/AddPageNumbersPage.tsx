import { Loader2, CheckCircle, AlertCircle, FileText, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropZone } from '@/components/FileDropZone'
import { OutputNameInput } from '@/features/merge/OutputNameInput'
import { PagePositionPicker } from './PagePositionPicker'
import { useAddPageNumbers } from './useAddPageNumbers'

export function AddPageNumbersPage() {
  const {
    file, fileError, position, startNumber, startNumberError, outputName,
    status, error, resultBlob, canExecute,
    setFile, removeFile, setPosition, setStartNumber, setOutputName,
    handleAdd, handleRetryDownload, retryFromError, reset,
  } = useAddPageNumbers()

  const isProcessing = status === 'processing'
  const isDone = status === 'done'
  const isError = status === 'error'

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-lg font-semibold text-green-800">페이지 번호 추가 완료!</p>
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
              <PagePositionPicker value={position} onChange={setPosition} disabled={isProcessing} />

              <div className="space-y-1.5">
                <label htmlFor="start-number" className="text-sm font-medium text-gray-700">
                  시작 번호
                </label>
                <input
                  id="start-number"
                  type="number"
                  min={1}
                  value={startNumber}
                  onChange={(e) => setStartNumber(Number(e.target.value))}
                  disabled={isProcessing}
                  className={`w-24 rounded-md border px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                    startNumberError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                {startNumberError && (
                  <p className="text-sm text-red-600">{startNumberError}</p>
                )}
                {!startNumberError && file.pageCount > 0 && (
                  <p className="text-xs text-gray-500">
                    첫 페이지 번호: {startNumber}, 마지막 페이지 번호: {startNumber + file.pageCount - 1}
                  </p>
                )}
              </div>

              <OutputNameInput
                value={outputName}
                onChange={setOutputName}
                disabled={isProcessing}
                placeholder={`${file.file.name.replace(/\.pdf$/i, '')}_numbered.pdf`}
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
        <Button className="w-full" size="lg" onClick={handleAdd} disabled={!canExecute}>
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />추가 중...</>
          ) : (
            '페이지 번호 추가하기'
          )}
        </Button>
      )}
    </div>
  )
}
