interface TitleBarProps {
  status: 'focus' | 'rest' | 'idle'
}

const statusConfig = {
  focus: { label: 'Pulse — фокус, ещё', dotColor: '#4c8dff' },
  rest: { label: 'Pulse — отдых', dotColor: '#ff9d5c' },
  idle: { label: 'Pulse — ритм дня', dotColor: '#5c6068' },
}

export function TitleBar({ status }: TitleBarProps) {
  const cfg = statusConfig[status]

  return (
    <div
      data-tauri-drag-region
      className="h-[52px] flex-shrink-0 flex items-center justify-between px-[18px] border-b border-[var(--stroke-soft)]"
      style={{ background: 'rgba(255,255,255,0.012)' }}
    >
      <div className="flex items-center gap-[8px]">
        <span className="w-[12px] h-[12px] rounded-full bg-[#ff5f57]" />
        <span className="w-[12px] h-[12px] rounded-full bg-[#febc2e]" />
        <span className="w-[12px] h-[12px] rounded-full bg-[#28c840]" />
      </div>

      <div className={`flex items-center gap-2 text-[13px] text-[var(--text-dim)] font-medium ${status === 'rest' ? 'resting' : ''}`}>
        <span
          className="w-[6px] h-[6px] rounded-full transition-all duration-300"
          style={{
            background: cfg.dotColor,
            boxShadow: `0 0 0 3px ${cfg.dotColor}33`,
          }}
        />
        {cfg.label}
      </div>

      <div className="w-[68px]" />
    </div>
  )
}
