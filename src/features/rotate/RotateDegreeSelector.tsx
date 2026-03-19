import type { RotateDegree } from '@/types/pdf'

const DEGREE_OPTIONS: { value: RotateDegree; label: string }[] = [
  { value: 90,  label: '90° 시계 방향' },
  { value: 180, label: '180°' },
  { value: 270, label: '270° (반시계 90°)' },
]

interface RotateDegreeSelectorProps {
  value: RotateDegree | null
  onChange: (degree: RotateDegree) => void
  disabled?: boolean
}

export function RotateDegreeSelector({ value, onChange, disabled }: RotateDegreeSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-700">회전 각도</legend>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {DEGREE_OPTIONS.map((option) => {
          const isSelected = value === option.value
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 text-sm transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name="rotate-degree"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="sr-only"
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
