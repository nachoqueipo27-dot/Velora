import { cn } from '../../lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-[#A0A0A0] dark:text-[#A0A0A0] light:text-[#404040]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-input border bg-transparent',
            'transition-all duration-150 ease-out',
            'placeholder:text-[#808080]',
            'outline-none',
            // Dark
            'border-[#2A2A2A] text-white',
            'focus:border-white focus:ring-2 focus:ring-white/20',
            // Light
            'light:border-[#E4E4E4] light:text-[#0A0A0A]',
            'light:focus:border-[#0A0A0A] light:focus:ring-2 light:focus:ring-black/10',
            error && 'border-[#C0392B] focus:border-[#C0392B] focus:ring-[#C0392B]/20',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-[#E0594A] light:text-[#C0392B]" role="alert">{error}</span>}
        {hint && !error && <span className="text-xs text-[#8F8F8F] light:text-[#5C5C5C]">{hint}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
