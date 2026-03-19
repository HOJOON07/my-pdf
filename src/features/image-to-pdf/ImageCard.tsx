import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImageFileItem } from '@/types/pdf'

interface ImageCardProps {
  item: ImageFileItem
  onRemove: (id: string) => void
  disabled?: boolean
}

export function ImageCard({ item, onRemove, disabled }: ImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: disabled || !!item.error })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasError = !!item.error

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-invalid={hasError || undefined}
      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${
        isDragging
          ? 'opacity-50 shadow-lg'
          : hasError
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* 드래그 핸들 (에러 카드에서는 숨김) */}
      {!hasError && (
        <button
          type="button"
          className="cursor-grab touch-none text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          aria-label={`${item.file.name} 순서 변경`}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}

      {/* 썸네일 or 에러 아이콘 */}
      {item.previewUrl && !hasError ? (
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="h-14 w-14 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
      )}

      {/* 파일 정보 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{item.file.name}</p>
        {!hasError && (
          <p className="text-xs text-gray-500">
            {(item.file.size / (1024 * 1024)).toFixed(1)}MB
          </p>
        )}
        {item.sizeWarning && !hasError && (
          <p className="text-xs text-amber-600">{item.sizeWarning}</p>
        )}
        {item.isGif && !hasError && (
          <p className="text-xs text-gray-400">애니메이션 GIF는 첫 번째 프레임만 사용돼요.</p>
        )}
        {hasError && (
          <p role="alert" className="text-xs text-red-600">{item.error}</p>
        )}
      </div>

      {/* X 버튼 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        aria-label={`${item.file.name} 제거`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
