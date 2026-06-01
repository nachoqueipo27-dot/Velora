import { cn } from '../../lib/utils'

interface VeloraLogoProps {
  size?: number
  className?: string
  variant?: 'auto' | 'dark' | 'light'
}

export const VeloraLogo = ({
  size = 40,
  className,
  variant = 'auto',
}: VeloraLogoProps) => {
  const w = Math.round(size * (136 / 156))
  const h = size

  const colorClass =
    variant === 'dark'  ? 'text-white' :
    variant === 'light' ? 'text-[#0A0A0A]' :
    'text-[#0A0A0A] dark:text-white light:text-[#0A0A0A]'

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 136 156"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(colorClass, className)}
      aria-label="Velora"
      role="img"
    >
      <polygon
        points="68,0 136,39 136,117 68,156 0,117 0,39"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <polygon
        points="68,78 136,117 68,156 0,117"
        fill="currentColor"
      />
      <circle cx="68" cy="78" r="8" fill="currentColor" />
      <line
        x1="68" y1="70" x2="68" y2="0"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
