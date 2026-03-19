import { Input } from '@/components/ui/input'

interface PageRangeInputProps {
  /** 입력 필드 위 레이블 텍스트 (totalPages 표시 포함)
   * - Split:   "페이지 범위 (전체: {N}페이지)"
   * - Extract: "추출할 페이지 (전체: {N}페이지)"
   * - Delete:  "삭제할 페이지 (전체: {N}페이지)"
   * - Rotate:  "회전할 페이지 (전체: {N}페이지)"
   */
  label: string
  /** 입력 필드 하단 힌트 텍스트 */
  hint?: string
  /** input placeholder 텍스트 */
  placeholder?: string
  /** true이면 에러가 있어도 hint를 항상 표시 */
  showHintAlways?: boolean
  value: string
  onChange: (value: string) => void
  /** validateRangeInput() 결과. null이면 정상 */
  error: string | null
  disabled?: boolean
}

export function PageRangeInput({
  label,
  hint,
  placeholder = '예: 1-5, 7, 9-12',
  showHintAlways = false,
  value,
  onChange,
  error,
  disabled,
}: PageRangeInputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="page-range" className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <Input
        id="page-range"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={error !== null}
        aria-describedby={error ? 'range-error' : 'range-hint'}
      />
      {error && (
        <p id="range-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {(!error || showHintAlways) && (
        <p id="range-hint" className="text-xs text-gray-500">
          {hint ?? '콤마(,)로 구분하면 각 범위가 별도 파일로 저장됩니다'}
        </p>
      )}
    </div>
  )
}
