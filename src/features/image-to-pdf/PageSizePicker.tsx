import type { PageSizeMode } from '@/types/pdf'

interface PageSizeOption {
  value: PageSizeMode
  label: string
  description: string
}

const options: PageSizeOption[] = [
  { value: 'a4', label: 'A4', description: '210 × 297mm · 인쇄에 적합 (기본값)' },
  { value: 'letter', label: 'Letter', description: '216 × 279mm · 미국 표준' },
  { value: 'original', label: '이미지 원본 크기', description: '각 이미지의 픽셀 크기를 그대로 사용' },
]

interface PageSizePickerProps {
  value: PageSizeMode
  onChange: (value: PageSizeMode) => void
  disabled?: boolean
}

export function PageSizePicker({ value, onChange, disabled }: PageSizePickerProps) {
  return (
    <fieldset disabled={disabled} className="space-y-1.5">
      <legend className="text-sm font-medium text-gray-700">페이지 크기</legend>
      <div className="flex flex-col gap-2 pt-1">
        {options.map(opt => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors ${
              value === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input
              type="radio"
              name="pageSize"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              disabled={disabled}
              className="accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-800">{opt.label}</span>
            <span className="text-xs text-gray-500">{opt.description}</span>
          </label>
        ))}
      </div>
      {value === 'original' && (
        <p className="text-xs text-gray-500 pl-1">이미지마다 페이지 크기가 다를 수 있어요.</p>
      )}
    </fieldset>
  )
}
