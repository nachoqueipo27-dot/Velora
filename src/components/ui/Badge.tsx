import { cn } from '../../lib/utils'

interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  className?: string
}

export const Badge = ({ label, variant = 'default', className }: BadgeProps) => {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
      variant === 'default' && 'bg-white/10 text-[#A0A0A0] light:bg-black/5 light:text-[#606060]',
      variant === 'success' && 'bg-[#4CAF7D]/15 text-[#4CAF7D]',
      variant === 'warning' && 'bg-[#D4921A]/15 text-[#D4921A]',
      variant === 'error'   && 'bg-[#C0392B]/15 text-[#C0392B]',
      variant === 'info'    && 'bg-[#4A7FA5]/15 text-[#4A7FA5]',
      className
    )}>
      {label}
    </span>
  )
}
