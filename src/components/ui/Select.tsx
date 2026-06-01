import { cn } from '../../lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none transition-all duration-150',
            'border-[#2A2A2A] text-white focus:border-white focus:ring-2 focus:ring-white/15',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A] light:focus:ring-black/10',
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  }
)
Select.displayName = 'Select'
