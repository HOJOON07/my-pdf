import { Loader2, CheckCircle, AlertCircle, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileDropZone } from '@/components/FileDropZone'
import { OutputNameInput } from '@/features/merge/OutputNameInput'
import { PageCardList } from './PageCardList'
import { useReorder } from './useReorder'

export function ReorderPage() {
  const {
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
  } = useReorder()

  const isProcessing = status === 'processing'
  const isDone = status === 'done'

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-lg font-semibold text-green-800">순서 변경 완료!</p>
          <p className="mt-1 text-sm text-green-600">다운로드가 시작되었습니다.</p>
        </div>
        <Button onClick={reset}>새 작업 시작</Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {!file && (
        <FileDropZone
          onFiles={(files) => { if (files[0]) setFile(files[0]) }}
          multiple={false}
          title="순서를 바꿀 PDF 파일을 여기에 끌어다 놓으세요"
          disabled={isProcessing}
        />
      )}

      {file && (
        <>
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-4 py-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{file.file.name}</p>
              <p className="text-xs text-gray-500">전체 {file.pageCount}페이지</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={reset}
              disabled={isProcessing}
              aria-label={`${file.file.name} 제거`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {file.pageCount < 2 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-700">페이지가 1개뿐이어서 순서를 변경할 수 없어요.</p>
            </div>
          )}

          {file.pageCount >= 2 && (
            <PageCardList
              pages={pages}
              onMove={movePage}
              onResetOrder={resetOrder}
              disabled={isProcessing}
            />
          )}

          <OutputNameInput
            value={outputName}
            onChange={setOutputName}
            disabled={isProcessing}
            placeholder={`${file.file.name.replace(/\.pdf$/i, '')}_reordered.pdf`}
          />
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
        </div>
      )}

      {file && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleReorder}
          disabled={!canExecute}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              처리 중...
            </>
          ) : (
            'PDF 순서 저장하기 →'
          )}
        </Button>
      )}
    </div>
  )
}
