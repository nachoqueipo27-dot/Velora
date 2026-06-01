import { cn } from '../../lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out select-none',
          'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-[#0A0A0A]',
          'light:focus-visible:ring-black light:focus-visible:ring-offset-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Sizes
          size === 'sm' && 'px-3 py-1.5 text-xs rounded-input',
          size === 'md' && 'px-4 py-2 text-sm rounded-input',
          size === 'lg' && 'px-6 py-3 text-base rounded-input',
          // Variants dark
          variant === 'primary' && [
            'bg-white text-black',
            'hover:bg-[#E8E8E8] hover:scale-[1.02] hover:shadow-sm',
            'active:scale-[0.98]',
            'dark:bg-white dark:text-black',
            'light:bg-black light:text-white light:hover:bg-[#1C1C1C]',
          ],
          variant === 'secondary' && [
            'border border-[#2A2A2A] bg-transparent text-[#A0A0A0]',
            'hover:bg-white/[0.06] hover:scale-[1.02]',
            'active:scale-[0.98]',
            'light:border-[#E4E4E4] light:text-[#404040]',
            'light:hover:bg-black/[0.04]',
          ],
          variant === 'ghost' && [
            'bg-transparent text-[#606060]',
            'hover:bg-white/[0.06]',
            'active:bg-white/[0.10]',
            'light:text-[#888888]',
            'light:hover:bg-black/[0.04]',
          ],
          variant === 'danger' && [
            'border border-[#C0392B] bg-transparent text-[#C0392B]',
            'hover:bg-[#C0392B]/10 hover:scale-[1.02]',
            'active:scale-[0.98]',
          ],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
