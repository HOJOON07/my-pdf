import { useRef } from 'react'
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
import { ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageCard } from './ImageCard'
import type { ImageFileItem } from '@/types/pdf'

interface ImageCardListProps {
  images: ImageFileItem[]
  onRemove: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
  onAdd: (files: File[]) => void
  disabled?: boolean
}

export function ImageCardList({ images, onRemove, onReorder, onAdd, disabled }: ImageCardListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id))
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onAdd(files)
    e.target.value = ''
  }

  // 에러 없는 이미지만 sortable 대상
  const sortableIds = images.filter(img => !img.error).map(img => img.id)

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        이미지 목록 ({images.length}개)
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {images.map(item => (
              <ImageCard
                key={item.id}
                item={item}
                onRemove={onRemove}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 이미지 추가 보조 버튼 */}
      {!disabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            이미지 추가
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </>
      )}
    </div>
  )
}
