type SidebarPage = 'today' | 'schedule' | 'stats' | 'settings' | 'templates'

interface SidebarProps {
  page: SidebarPage
  onPageChange: (page: SidebarPage) => void
}

const items = [
  {
    key: 'today' as const,
    title: 'Сегодня',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
  },
  {
    key: 'schedule' as const,
    title: 'Расписание',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    key: 'stats' as const,
    title: 'Статистика',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
        <path d="M5 19V9M12 19V5M19 19v-7" />
      </svg>
    ),
  },
]

export function Sidebar({ page, onPageChange }: SidebarProps) {
  return (
    <nav className="w-[76px] flex-shrink-0 flex flex-col items-center py-[22px] gap-[6px] border-r border-[var(--stroke-soft)]">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onPageChange(item.key)}
          title={item.title}
          className={`btn-icon relative ${page === item.key ? 'active' : ''}`}
        >
          {page === item.key && (
            <span className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-full bg-gradient-to-b from-[var(--focus)] to-[var(--focus-2)]" />
          )}
          {item.icon}
        </button>
      ))}

      <div className="flex-1" />

      <button
        title="Настройки"
        className="btn-icon"
        onClick={() => onPageChange('settings')}
        style={page === 'settings' ? { background: 'var(--surface-2)', color: 'var(--text)' } : undefined}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="20" height="20">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
        </svg>
      </button>
    </nav>
  )
}
