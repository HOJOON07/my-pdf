import { useRef, useState, useCallback, type DragEvent } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FileDropZoneProps {
  onFiles: (files: File[]) => void
  multiple?: boolean
  title?: string
  subtitle?: string
  disabled?: boolean
}

export function FileDropZone({
  onFiles,
  multiple = true,
  title = 'PDF 파일을 여기에 끌어다 놓으세요',
  subtitle,
  disabled = false,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const defaultSubtitle = multiple
    ? '또는 클릭하여 파일 선택 · 여러 파일 동시 선택 가능'
    : '또는 클릭하여 파일 선택 · 파일 1개만 선택 가능'

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return
      const files = Array.from(fileList)
      const pdfFiles = files.filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      )
      if (pdfFiles.length > 0) {
        onFiles(multiple ? pdfFiles : [pdfFiles[0]])
      }
    },
    [onFiles, multiple, disabled]
  )

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (!disabled) setIsDragOver(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
        isDragOver && !disabled
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <Upload className="h-10 w-10 text-gray-400" />
      <div>
        <p className="text-base font-medium text-gray-700">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{subtitle ?? defaultSubtitle}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
        disabled={disabled}
      />
    </div>
  )
}
