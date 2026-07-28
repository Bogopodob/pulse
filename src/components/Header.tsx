import { motion } from 'framer-motion'

interface HeaderProps {
  onCmdK: () => void
}

export function Header({ onCmdK }: HeaderProps) {
  return (
    <header className="flex items-center justify-between pt-5 pb-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2.5"
      >
        <div className="flex items-center justify-center size-7 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--accent)]">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7.5 4.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-[13px] font-semibold text-[var(--text-h)] tracking-tight leading-none">Pulse</h1>
          <p className="text-[9px] text-[var(--text-dim)] mt-0.5 tracking-widest uppercase">Reminders</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex items-center gap-1.5"
      >
        <button
          onClick={onCmdK}
          className="hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-md text-[10px] text-[var(--text)] btn-subtle bg-[var(--bg-card)] border border-[var(--border)]"
        >
          <svg width="10" height="10" viewBox="0 0 15 15" fill="none" className="opacity-40">
            <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <kbd className="font-mono text-[8px] opacity-40">⌘K</kbd>
        </button>
        <button className="flex items-center justify-center size-7 rounded-md btn-subtle bg-[var(--bg-card)] border border-[var(--border)]">
          <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="3" fill="currentColor" />
            <path d="M7.5 1v2M7.5 12v2M1 7.5h2M12 7.5h2M3 3l1.4 1.4M10.6 10.6l1.4 1.4M3 12l1.4-1.4M10.6 4.4l1.4-1.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </button>
        <button className="flex items-center justify-center h-7 px-2 rounded-md btn-subtle bg-[var(--bg-card)] border border-[var(--border)] text-[9px] font-semibold tracking-widest uppercase">
          EN
        </button>
      </motion.div>
    </header>
  )
}
