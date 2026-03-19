import { Input } from '@/components/ui/input'

interface OutputNameInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function OutputNameInput({ value, onChange, disabled, placeholder = 'merged.pdf' }: OutputNameInputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="output-name" className="text-sm font-medium text-gray-700">
        저장할 파일명
      </label>
      <Input
        id="output-name"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  )
}
