import { useRef, useState, useCallback, type DragEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ImageDropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function ImageDropZone({ onFiles, disabled = false }: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return
      const files = Array.from(fileList)
      if (files.length > 0) onFiles(files)
    },
    [onFiles, disabled]
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
      aria-label="이미지를 여기에 드래그하거나 파일 선택"
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
      <ImagePlus className="h-10 w-10 text-gray-400" />
      <div>
        <p className="text-base font-medium text-gray-700">이미지를 여기에 드래그하거나</p>
        <p className="mt-1 text-sm text-gray-500">
          파일 선택 버튼을 클릭하세요. · JPG · PNG · WebP · GIF · BMP · 여러 파일 가능
        </p>
      </div>
      <button
        type="button"
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        onClick={(e) => { e.stopPropagation(); handleClick() }}
        disabled={disabled}
      >
        파일 선택
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp"
        multiple
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
