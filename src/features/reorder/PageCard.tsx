import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { PageItem } from '@/types/pdf'

interface PageCardProps {
  item: PageItem
  disabled?: boolean
}

export function PageCard({ item, disabled }: PageCardProps) {
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
      className={`flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2.5 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
      aria-label={`페이지 ${item.originalPageNumber} 순서 변경`}
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

      <span className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600">
        {item.originalPageNumber}
      </span>

      <span className="text-sm text-gray-700">페이지 {item.originalPageNumber}</span>
    </div>
  )
}
