import { motion } from 'framer-motion'
import type { Reminder } from '../types'

interface ReminderCardProps {
  reminder: Reminder
  now: number
  onComplete: (id: string) => void
  onCancel: (id: string) => void
}

function fmt(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const CIRC = 2 * Math.PI * 18

export function ReminderCard({ reminder, now, onComplete, onCancel }: ReminderCardProps) {
  const elapsed_ms = now - reminder.createdAt
  const remaining = Math.max(0, reminder.duration * 1000 - elapsed_ms)
  const remSec = Math.ceil(remaining / 1000)
  const progress = reminder.duration > 0 ? Math.min(1, elapsed_ms / (reminder.duration * 1000)) : 0
  const isLate = progress >= 1
  const offset = CIRC * (1 - Math.min(1, progress))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="card-sm card-hover"
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className={`size-1.5 rounded-full shrink-0 ${isLate ? 'bg-[var(--danger)]' : 'bg-[var(--focus)]'}`} />
              <h3 className="text-[11px] font-semibold text-[var(--text)] truncate leading-snug">{reminder.title}</h3>
            </div>
            {reminder.description && (
              <p className="text-[9px] text-[var(--text-dim)] mt-0.5 line-clamp-2 pl-3 leading-relaxed">{reminder.description}</p>
            )}
          </div>
          <span className={`shrink-0 text-[8px] font-medium px-1.5 py-0.5 rounded border ${isLate ? 'border-[var(--danger)]/30 text-[var(--danger)]' : 'border-[var(--stroke)] text-[var(--focus)]'}`}>
            {isLate ? 'overdue' : 'active'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="relative shrink-0">
            <svg width="42" height="42" viewBox="0 0 40 40" className="-rotate-90">
              <circle cx="20" cy="20" r="18" fill="none" stroke="var(--surface-2)" strokeWidth="2.5" />
              <motion.circle
                cx="20" cy="20" r="18"
                fill="none"
                stroke={isLate ? 'var(--danger)' : 'var(--focus)'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={false}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.4 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold tabular-nums text-[var(--text)]">
              {Math.round(progress * 100)}%
            </span>
          </div>

          <div className="flex flex-col gap-0">
            <motion.span
              key={remSec}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-[18px] font-semibold font-mono tabular-nums leading-none ${isLate ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`}
            >
              {fmt(remSec)}
            </motion.span>
            <span className="text-[8px] text-[var(--text-faint)] tabular-nums">
              {isLate ? 'overdue' : 'remaining'}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => onComplete(reminder.id)} className="btn btn-primary flex-1 h-7 py-0 text-[10px] justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Done
          </button>
          <button onClick={() => onCancel(reminder.id)} className="btn btn-ghost flex-1 h-7 py-0 text-[10px] justify-center">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}
