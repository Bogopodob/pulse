import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReminders } from './model/useReminders'

function fmt(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function UpcomingAlerts() {
  const { getFiltered, now } = useReminders()
  const active = getFiltered('active')

  const upcoming = useMemo(() =>
    active
      .map((r) => {
        const elapsed = now - r.createdAt
        const remaining = Math.max(0, r.duration * 1000 - elapsed)
        return { reminder: r, remainingMs: remaining, remainingSec: Math.ceil(remaining / 1000) }
      })
      .sort((a, b) => a.remainingMs - b.remainingMs)
      .slice(0, 4),
  [active, now])

  return (
    <div className="pb-5">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="text-[9px] font-medium text-[var(--text)] tracking-[0.15em] uppercase">Upcoming</span>
        {upcoming.length > 0 && (
          <span className="text-[9px] text-[var(--text-dim)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border)] tabular-nums">{upcoming.length}</span>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div className="card py-10">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-dim)]">
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
                <path d="M7.5 4.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[11px] text-[var(--text)]">No upcoming alerts</span>
          </div>
        </div>
      ) : (
        <div className="card divide-y divide-[var(--border)] overflow-hidden">
          <AnimatePresence mode="popLayout">
            {upcoming.map((item, i) => {
              const progress = item.reminder.duration > 0 ? 1 - item.remainingMs / (item.reminder.duration * 1000) : 0
              const isOverdue = item.remainingMs <= 0

              return (
                <motion.div
                  key={item.reminder.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className="flex items-center gap-3 px-3.5 py-2.5 card-hover"
                >
                  <div className={`flex items-center justify-center size-7 rounded-md shrink-0 border ${isOverdue ? 'border-[var(--danger)]/30' : 'border-[var(--border)]'}`}>
                    <svg width="11" height="11" viewBox="0 0 15 15" fill="none" className={isOverdue ? 'text-[var(--danger)]' : 'text-[var(--accent)]'}>
                      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M7.5 4.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-medium text-[var(--text-h)] truncate">{item.reminder.title}</span>
                      <motion.span
                        key={item.remainingSec}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-[11px] font-mono tabular-nums shrink-0 ${isOverdue ? 'text-[var(--danger)]' : 'text-[var(--text-h)]'}`}
                      >
                        {isOverdue ? `+${fmt(Math.abs(item.remainingSec))}` : fmt(item.remainingSec)}
                      </motion.span>
                    </div>
                    <div className="h-[2px] rounded-full bg-[var(--bg-card)] overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${isOverdue ? 'bg-[var(--danger)]' : 'bg-[var(--accent)]'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(2, progress * 100))}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
