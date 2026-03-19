import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PageItem } from '@/types/pdf'
import { PageCard } from './PageCard'

interface PageCardListProps {
  pages: PageItem[]
  onMove: (fromIndex: number, toIndex: number) => void
  onResetOrder: () => void
  disabled?: boolean
}

export function PageCardList({ pages, onMove, onResetOrder, disabled }: PageCardListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id)
      const newIndex = pages.findIndex((p) => p.id === over.id)
      onMove(oldIndex, newIndex)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">페이지 순서</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetOrder}
          disabled={disabled}
          className="h-7 gap-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          원본 순서로 초기화
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
            {pages.map((page) => (
              <PageCard
                key={page.id}
                item={page}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
