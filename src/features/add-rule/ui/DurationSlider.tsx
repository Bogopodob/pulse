import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { Accent } from '@/entities/rhythm/activities'

export function DurationSlider({
  value,
  min = 5,
  max = 120,
  step = 5,
  accent,
  disabled = false,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  accent: Accent
  /** Заблокирован: не реагирует на ввод, значения не эмитятся. */
  disabled?: boolean
  onChange: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef(false)

  /* Нормализованный диапазон: защита от вырожденных значений (max <= min). */
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  const span = hi - lo
  const clamped = Math.min(hi, Math.max(lo, value))
  const pct = span > 0 ? ((clamped - lo) / span) * 100 : 0

  const fmtVal = (v: number) => {
    const h = Math.floor(v / 60)
    const m = v % 60
    if (h === 0) return `${v} мин`
    if (m === 0) return `${h} ч`
    return `${h} ч ${m} мин`
  }

  const update = (clientX: number) => {
    if (disabled || span <= 0 || step <= 0) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const raw = lo + p * span
    const snapped = Math.round(raw / step) * step
    onChange(Math.min(hi, Math.max(lo, snapped)))
  }

  return (
    <div
      ref={ref}
      className={`relative h-10 select-none touch-none ${disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}
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
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
        style={{ background: 'rgba(19,20,24,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}
      />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
        style={{
          width: `${pct}%`,
          background: accent.gradient,
          boxShadow: disabled ? 'none' : `0 0 8px rgba(${accent.glow},0.45)`,
        }}
      />
      {!disabled && (
        <>
          <motion.div
            className="absolute -top-1 -translate-x-1/2 -translate-y-full rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap"
            style={{ left: `${pct}%`, background: accent.dot, color: '#131418' }}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 0.3 }}
          >
            {fmtVal(clamped)}
          </motion.div>
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-4 rounded-full border-[3px]"
            style={{ left: `${pct}%`, background: '#fff', borderColor: accent.dot, boxShadow: `0 0 12px rgba(${accent.glow},0.8)` }}
          />
        </>
      )}
    </div>
  )
}
