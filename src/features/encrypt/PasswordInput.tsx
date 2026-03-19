import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  warning?: string
  success?: boolean
  successMessage?: string
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  warning,
  success,
  successMessage,
  disabled,
  placeholder,
  autoComplete = 'new-password',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const borderClass = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : warning
    ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500'
    : success
    ? 'border-green-400 focus:border-green-500 focus:ring-green-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : warning ? `${id}-warning` : success ? `${id}-success` : undefined
          }
          className={`w-full rounded-md border px-3 py-2 pr-10 text-sm shadow-sm outline-none transition-colors focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${borderClass}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {!error && warning && (
        <p id={`${id}-warning`} aria-live="polite" className="text-sm text-amber-600">
          {warning}
        </p>
      )}
      {!error && !warning && success && successMessage && (
        <p id={`${id}-success`} aria-live="polite" className="text-sm text-green-600">
          {successMessage}
        </p>
      )}
    </div>
  )
}
