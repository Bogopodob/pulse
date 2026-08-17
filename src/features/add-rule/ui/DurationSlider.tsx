import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { Accent } from '../../../entities/rhythm/activities'

export function DurationSlider({
  value,
  min = 5,
  max = 120,
  step = 5,
  accent,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  accent: Accent
  onChange: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef(false)

  const pct = ((value - min) / (max - min)) * 100

  const fmtVal = (v: number) => {
    const h = Math.floor(v / 60)
    const m = v % 60
    if (h === 0) return `${v} мин`
    if (m === 0) return `${h} ч`
    return `${h} ч ${m} мин`
  }

  const update = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const raw = min + p * (max - min)
    const snapped = Math.round(raw / step) * step
    onChange(Math.min(max, Math.max(min, snapped)))
  }

  return (
    <div
      ref={ref}
      className="relative h-10 select-none touch-none cursor-pointer"
      onPointerDown={(e) => {
        dragRef.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX)
      }}
      onPointerMove={(e) => {
        if (dragRef.current) update(e.clientX)
      }}
      onPointerUp={() => (dragRef.current = false)}
      onPointerCancel={() => (dragRef.current = false)}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[var(--surface-3)]" />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
        style={{ width: `${pct}%`, background: accent.gradient, boxShadow: `0 0 8px rgba(${accent.glow},0.45)` }}
      />
      <motion.div
        className="absolute -top-1 -translate-x-1/2 -translate-y-full rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap"
        style={{ left: `${pct}%`, background: accent.dot, color: '#131418' }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 0.3 }}
      >
        {fmtVal(value)}
      </motion.div>
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-4 rounded-full border-[3px]"
        style={{ left: `${pct}%`, background: '#fff', borderColor: accent.dot, boxShadow: `0 0 12px rgba(${accent.glow},0.8)` }}
      />
    </div>
  )
}