export function RuleChips() {
  const rules = [
    { name: 'До обеда', time: '09:00–13:00 · 60 / 10 мин', color: 'blue', icon: 'focus' },
    { name: 'После обеда', time: '14:00–18:00 · 90 / 15 мин', color: 'amber', icon: 'rest' },
    { name: 'Вечер', time: '18:00–20:00 · 45 / 10 мин', color: 'blue', icon: 'focus' },
  ]

  return (
    <div className="flex gap-2.5 flex-wrap">
      {rules.map((rule) => (
        <div
          key={rule.name}
          className="flex items-center gap-2.5 bg-[var(--surface)] border border-[var(--stroke)] rounded-full px-4 py-2"
        >
          <div
            className="flex items-center justify-center size-[22px] rounded-full"
            style={{ background: rule.color === 'blue' ? 'rgba(76,141,255,0.18)' : 'rgba(255,157,92,0.18)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={rule.color === 'blue' ? '#bcd4ff' : '#ffd7b0'} strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[var(--text)]">{rule.name}</div>
            <div className="text-[11px] text-[var(--text-faint)] font-mono">{rule.time}</div>
          </div>
        </div>
      ))}
      <button
        className="flex items-center gap-2.5 bg-[var(--surface)] border border-dashed border-[var(--stroke)] rounded-full px-4 py-2 text-[var(--text-faint)] cursor-pointer hover:text-[var(--focus)] hover:border-[var(--focus)] transition-all"
        onClick={() => alert('Здесь открывалась бы форма нового правила: время начала, длительность фокуса и отдыха.')}
      >
        <div className="flex items-center justify-center size-[22px] rounded-full" style={{ background: 'transparent' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <span className="text-[12px] font-semibold">Добавить правило</span>
      </button>
    </div>
  )
}
