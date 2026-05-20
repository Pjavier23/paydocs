'use client'

interface FormFieldProps {
  label: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  type?: string
  readOnly?: boolean
  placeholder?: string
  hint?: string
}

export function FormField({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder = '',
  hint,
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
        inputMode={type === 'number' ? 'decimal' : undefined}
        className={`input-field ${readOnly ? 'bg-gray-50 text-accent font-medium' : ''}`}
      />
      {hint && <p className="mt-1 font-mono text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}
