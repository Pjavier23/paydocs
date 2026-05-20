'use client'

interface FormFieldProps {
  label: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  type?: string
  readOnly?: boolean
  placeholder?: string
  hint?: string
  autoComplete?: string
}

/** Returns the appropriate inputMode for a given input type */
function resolveInputMode(type: string): React.HTMLAttributes<HTMLInputElement>['inputMode'] | undefined {
  switch (type) {
    case 'number': return 'decimal'
    case 'email': return 'email'
    case 'tel': return 'tel'
    case 'url': return 'url'
    case 'search': return 'search'
    default: return undefined
  }
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder = '',
  hint,
  autoComplete,
}: FormFieldProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        readOnly={readOnly}
        placeholder={placeholder}
        inputMode={resolveInputMode(type)}
        autoComplete={autoComplete}
        aria-label={label}
        className="input-field"
      />
      {hint && <p className="mt-1 font-mono text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}
