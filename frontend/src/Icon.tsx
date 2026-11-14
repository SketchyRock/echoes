import type { CSSProperties } from 'react'

type Props = { name: string; size?: number; fill?: boolean; weight?: number; className?: string; style?: CSSProperties }

/** Material Symbols Rounded, loaded from Google Fonts in index.html. */
export function Icon({ name, size = 22, fill = false, weight = 400, className = '', style }: Props) {
  return (
    <span
      className={`msr ${className}`}
      aria-hidden
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
        ...style,
      }}
    >
      {name}
    </span>
  )
}
