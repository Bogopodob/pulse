export function TitleBar() {
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

      <div className="flex items-center gap-2 text-[13px] text-[var(--text-dim)] font-medium">
        <img
          src="/logo.svg"
          alt="Pulse"
          width={20}
          height={20}
          className="shrink-0"
          style={{ objectFit: 'contain' }}
        />
        <span
          className="w-[6px] h-[6px] rounded-full transition-all duration-300"
          style={{ background: '#5c6068', boxShadow: '0 0 0 3px #5c606833' }}
        />
        Pulse — ритм дня
      </div>

      <div className="w-[68px]" />
    </div>
  )
}