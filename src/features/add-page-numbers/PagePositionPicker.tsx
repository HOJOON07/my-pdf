import type { PageNumberPosition } from '@/types/pdf'

interface PositionOption {
  value: PageNumberPosition
  label: string
}

const topRow: PositionOption[] = [
  { value: 'top-left', label: '상단 좌' },
  { value: 'top-center', label: '상단 중앙' },
  { value: 'top-right', label: '상단 우' },
]

const bottomRow: PositionOption[] = [
  { value: 'bottom-left', label: '하단 좌' },
  { value: 'bottom-center', label: '하단 중앙' },
  { value: 'bottom-right', label: '하단 우' },
]

interface PagePositionPickerProps {
  value: PageNumberPosition
  onChange: (value: PageNumberPosition) => void
  disabled?: boolean
}

export function PagePositionPicker({ value, onChange, disabled }: PagePositionPickerProps) {
  function btn(opt: PositionOption) {
    const selected = value === opt.value
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        disabled={disabled}
        className={`rounded border px-3 py-2 text-xs font-medium transition-colors ${
          selected
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        } disabled:cursor-not-allowed disabled:opacity-50`}
        aria-pressed={selected}
      >
        {opt.label}
      </button>
    )
  }

  return (
    <fieldset disabled={disabled} className="space-y-1.5">
      <legend className="text-sm font-medium text-gray-700">번호 위치</legend>
      <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="flex justify-between gap-2">
          {topRow.map(opt => btn(opt))}
        </div>
        <div className="my-2 h-8 rounded bg-gray-100 text-center text-xs text-gray-400 leading-8">페이지</div>
        <div className="flex justify-between gap-2">
          {bottomRow.map(opt => btn(opt))}
        </div>
      </div>
    </fieldset>
  )
}
