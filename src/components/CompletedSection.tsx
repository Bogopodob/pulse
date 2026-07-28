import { motion, AnimatePresence } from 'framer-motion'
import { useReminders } from '../hooks/useReminders'

function ago(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function CompletedSection() {
  const { getFiltered, now, deleteReminder } = useReminders()
  const completed = getFiltered('completed')
  if (completed.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="text-[9px] font-medium text-[var(--text-faint)] tracking-[0.15em] uppercase">Completed</span>
        <span className="text-[9px] text-[var(--text-faint)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--stroke)] tabular-nums">{completed.length}</span>
      </div>
      <div className="card-sm divide-y divide-[var(--stroke)] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {completed.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 px-3 py-2 card-hover overflow-hidden"
            >
              <div className="flex items-center justify-center size-6 rounded-md border border-[var(--stroke)] shrink-0" style={{ background: 'rgba(120,200,120,0.08)' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="flex-1 text-[10px] text-[var(--text)] truncate font-medium">{r.title}</span>
              <span className="text-[8px] text-[var(--text-faint)] shrink-0 tabular-nums">{ago(now - r.createdAt)}</span>
              <button
                onClick={() => deleteReminder(r.id)}
                className="flex items-center justify-center size-5 rounded btn-icon opacity-0 hover:opacity-100 transition-all"
              >
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
