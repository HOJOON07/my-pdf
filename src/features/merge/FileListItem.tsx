import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PdfFileItem } from '@/types/pdf'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

interface FileListItemProps {
  item: PdfFileItem
  index: number
  onRemove: (id: string) => void
  disabled?: boolean
}

export function FileListItem({ item, index, onRemove, disabled }: FileListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        aria-label="순서 변경"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600">
        {index + 1}
      </span>

      <FileText className="h-5 w-5 shrink-0 text-blue-500" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{item.file.name}</p>
      </div>

      <span className="shrink-0 text-xs text-gray-500">{item.pageCount}쪽</span>
      <span className="shrink-0 text-xs text-gray-500">{formatSize(item.file.size)}</span>

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
