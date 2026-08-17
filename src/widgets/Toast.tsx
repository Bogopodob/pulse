import { motion } from 'framer-motion'

export function Toast({ title, text }: { title: string; text: string }) {
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.9, 0.25, 1] }}
      className="fixed top-[66px] right-[22px] w-[340px] z-[200] flex gap-3.5 p-4 rounded-[18px] border"
      style={{
        background: 'rgba(28,31,38,0.85)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderColor: 'rgba(255,255,255,0.09)',
        boxShadow: '0 24px 60px -12px rgba(0,0,0,0.55)',
      }}
    >
      <div className="flex items-center justify-center size-[38px] rounded-[11px] shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--rest), var(--rest-2))' }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0a0b0e" strokeWidth="2">
          <path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[var(--text)] mb-0.5">{title}</div>
        <div className="text-[12px] text-[var(--text-dim)] leading-relaxed">{text}</div>
        <div className="text-[10.5px] text-[var(--text-faint)] mt-1.5 tracking-[0.03em]">PULSE · СЕЙЧАС</div>
      </div>
    </motion.div>
  )
}
