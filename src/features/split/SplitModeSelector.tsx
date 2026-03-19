import type { SplitMode } from '@/types/pdf'
import { cn } from '@/lib/cn'

interface SplitModeSelectorProps {
  mode: SplitMode | null
  onModeChange: (mode: SplitMode) => void
  disabled?: boolean
}

const options: { value: SplitMode; label: string }[] = [
  { value: 'all', label: '모든 페이지를 개별 파일로 분리' },
  { value: 'range', label: '페이지 범위 지정' },
]

export function SplitModeSelector({ mode, onModeChange, disabled }: SplitModeSelectorProps) {
  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="text-sm font-medium text-gray-700">분할 방식 선택</legend>
      <div className="space-y-2 pt-1">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors',
              mode === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              type="radio"
              name="split-mode"
              value={opt.value}
              checked={mode === opt.value}
              onChange={() => onModeChange(opt.value)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              disabled={disabled}
            />
            <span className="text-sm text-gray-800">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
