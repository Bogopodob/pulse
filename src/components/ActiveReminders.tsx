import { AnimatePresence } from 'framer-motion'
import { useReminders } from '../hooks/useReminders'
import { ReminderCard } from './ReminderCard'

export function ActiveReminders() {
  const { getFiltered, now, completeReminder, cancelReminder } = useReminders()
  const active = getFiltered('active')
  if (active.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="text-[9px] font-medium text-[var(--text-faint)] tracking-[0.15em] uppercase">Active</span>
        <span className="text-[9px] text-[var(--text-faint)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--stroke)] tabular-nums">{active.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <AnimatePresence mode="popLayout">
          {active.map((r) => (
            <ReminderCard key={r.id} reminder={r} now={now} onComplete={completeReminder} onCancel={cancelReminder} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
