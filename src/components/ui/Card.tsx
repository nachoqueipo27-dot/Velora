import { cn } from '../../lib/utils'
import { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-card border p-4',
        'transition-all duration-200 ease',
        'border-[#2A2A2A] bg-[#141414]',
        'hover:border-[#3A3A3A] hover:shadow-sm',
        'light:border-[#E4E4E4] light:bg-white',
        'light:hover:border-[#D0D0D0]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
