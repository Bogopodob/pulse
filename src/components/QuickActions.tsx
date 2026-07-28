import { motion } from 'framer-motion'

interface QuickActionsProps {
  onQuickAdd: (title: string, description: string, duration: number) => void
  onCustom: () => void
}

const actions = [
  {
    key: 'short',
    title: 'Short Break',
    desc: '5 min',
    duration: 5 * 60,
    gradient: 'linear-gradient(135deg, var(--rest), var(--rest-2))',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
  },
  {
    key: 'long',
    title: 'Long Break',
    desc: '15 min',
    duration: 15 * 60,
    gradient: 'linear-gradient(135deg, var(--lunch), var(--lunch-2))',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
  },
  {
    key: 'custom',
    title: 'Custom',
    desc: 'set your own',
    gradient: 'linear-gradient(135deg, var(--focus), var(--focus-2))',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
]

export function QuickActions({ onQuickAdd, onCustom }: QuickActionsProps) {
  return (
    <div className="card-sm p-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {actions.map((act, i) => (
          <motion.button
            key={act.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 + i * 0.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => act.key === 'custom' ? onCustom() : onQuickAdd(act.title, '', act.duration!)}
            className="flex flex-col items-center gap-2 px-3 py-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--stroke)] cursor-pointer hover:bg-[var(--surface-3)] transition-all"
          >
            <div
              className="flex items-center justify-center size-8 rounded-lg"
              style={{ background: act.gradient, color: '#0a0b0e' }}
            >
              {act.icon}
            </div>
            <div className="flex flex-col items-center gap-0">
              <span className="text-[12px] font-medium text-[var(--text)] leading-tight">{act.title}</span>
              <span className="text-[9px] text-[var(--text-faint)]">{act.desc}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
