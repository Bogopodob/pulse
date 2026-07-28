import { useState, type RefObject } from 'react'
import { motion } from 'framer-motion'

interface QuickCreateProps {
  onAdd: (title: string, description: string, duration: number) => void
  inputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
}

const HOURS = Array.from({ length: 13 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

export function QuickCreate({ onAdd, inputRef, onClose }: QuickCreateProps) {
  const [title, setTitle] = useState('')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(5)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const duration = hours * 3600 + minutes * 60
    if (duration <= 0) return
    onAdd(trimmed, '', duration)
    setTitle('')
    setHours(0)
    setMinutes(5)
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-sm overflow-hidden border-[var(--stroke)]" style={{ borderColor: 'rgba(76,141,255,0.3)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="flex items-center justify-center size-7 rounded-md bg-[var(--surface-2)] border border-[var(--stroke)] text-[var(--focus)] shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you need to remember?"
            className="input-base flex-1 text-xs"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center size-6 rounded-md btn-icon"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-md px-2 py-1 border border-[var(--stroke)]">
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))}
              className="bg-transparent border-none outline-none text-[10px] text-[var(--text)] font-medium cursor-pointer appearance-none pr-1">
              {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-[8px] text-[var(--text-faint)]">h</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-md px-2 py-1 border border-[var(--stroke)]">
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
              className="bg-transparent border-none outline-none text-[10px] text-[var(--text)] font-medium cursor-pointer appearance-none pr-1">
              {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-[8px] text-[var(--text-faint)]">min</span>
          </div>
          <button
            type="submit"
            disabled={!title.trim()}
            className="ml-auto btn btn-primary text-[10px] h-7 px-3 py-0"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start
          </button>
        </div>
      </div>
    </motion.form>
  )
}
