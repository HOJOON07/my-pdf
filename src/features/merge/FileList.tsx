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
import type { PdfFileItem } from '@/types/pdf'
import { FileListItem } from './FileListItem'

interface FileListProps {
  files: PdfFileItem[]
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

export function FileList({ files, onReorder, onRemove, disabled }: FileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f.id === active.id)
      const newIndex = files.findIndex((f) => f.id === over.id)
      onReorder(oldIndex, newIndex)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">파일 목록</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {files.map((file, index) => (
              <FileListItem
                key={file.id}
                item={file}
                index={index}
                onRemove={onRemove}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
