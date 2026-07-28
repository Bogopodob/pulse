import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

function AnimatedNumber({ value, label }: { value: number; label: string }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] })
    return controls.stop
  }, [value, mv])

  return (
    <div className="card-sm p-3">
      <div className="flex flex-col items-center gap-0.5">
        <motion.span className="text-[20px] font-semibold font-[var(--font-display)] tabular-nums text-[var(--text)] leading-none">
          {rounded}
        </motion.span>
        <span className="text-[8px] font-medium text-[var(--text-faint)] tracking-[0.15em] uppercase">{label}</span>
      </div>
    </div>
  )
}

const stats = [
  { key: 'active', label: 'Active' },
  { key: 'today', label: 'Today' },
  { key: 'total', label: 'Total' },
]

export function StatsBar({ active, completedToday, total }: {
  active: number; completedToday: number; total: number
}) {
  const values = [active, completedToday, total]

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 + i * 0.04 }}
        >
          <AnimatedNumber value={values[i]} label={s.label} />
        </motion.div>
      ))}
    </div>
  )
}
