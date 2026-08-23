import { useMemo, useState } from 'react'
import { WEEKDAYS, dateKeyOf, type DayTemplate } from '../../../entities/templates/useTemplates'
import { ACCENTS } from '../../../entities/rhythm/activities'

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function fmtDateKey(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}

type Pane = { kind: 'week'; day: number } | { kind: 'date'; key: string } | null

export function WeekPicker({
  templates,
  overrides,
  activeTemplateId,
  isOverridden,
  onAssignWeekday,
  onSetDateOverride,
  onResetToday,
  onCreate,
}: {
  templates: DayTemplate[]
  overrides: Record<string, string | null>
  activeTemplateId: string | null
  isOverridden: boolean
  onAssignWeekday: (dayNum: number, templateId: string | null) => void
  onSetDateOverride: (dateKey: string, value: string | null | undefined) => void
  onResetToday: () => void
  onCreate: () => void
}) {
  const todayK = dateKeyOf(new Date())
  const todayDay = ((new Date().getDay() + 6) % 7) + 1
  const [pane, setPane] = useState<Pane>(null)
  const [newDate, setNewDate] = useState('')

  /** День недели → шаблон (первый, кто им владеет). */
  const byDay = useMemo(() => {
    const m = new Map<number, DayTemplate>()
    for (const t of templates) {
      for (const d of t.days) {
        if (!m.has(d)) m.set(d, t)
      }
    }
    return m
  }, [templates])

  const tplById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates])

  const specialDays = useMemo(
    () =>
      Object.entries(overrides)
        .filter(([k]) => k >= todayK)
        .sort(([a], [b]) => a.localeCompare(b)),
    [overrides, todayK],
  )

  const accentOf = (t?: DayTemplate) =>
    t ? ACCENTS[t.rules[0]?.color as keyof typeof ACCENTS] ?? ACCENTS.blue : null

  const togglePane = (p: NonNullable<Pane>) =>
    setPane((cur) => {
      if (!cur || cur.kind !== p.kind) return p
      if (cur.kind === 'week' && p.kind === 'week') return cur.day === p.day ? null : p
      if (cur.kind === 'date' && p.kind === 'date') return cur.key === p.key ? null : p
      return p
    })

  const renderChooser = (
    currentId: string | null | undefined,
    onPick: (id: string | null) => void,
  ) => (
    <div className="flex flex-col gap-0.5 mt-1 mb-1 pl-1 border-l-2 border-[var(--stroke)]">
      <button
        onClick={() => onPick(null)}
        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-150 ${
          currentId === undefined || currentId === null
            ? 'bg-[rgba(76,141,255,0.1)] text-[var(--focus)]'
            : 'text-[var(--text-dim)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M5.8 5.8l12.4 12.4" />
        </svg>
        <span className="flex-1 text-[12px] font-medium">Без шаблона</span>
        {(currentId === undefined || currentId === null) && <CheckIcon />}
      </button>
      {templates.map((t) => {
        const a = accentOf(t)
        const active = currentId === t.id
        return (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-150 ${
              active ? 'bg-[rgba(76,141,255,0.1)] text-[var(--focus)]' : 'text-[var(--text)] hover:bg-[var(--surface-3)]'
            }`}
          >
            <span
              className="size-[7px] rounded-full shrink-0"
              style={{ background: a?.dot ?? 'var(--text-faint)', boxShadow: a ? `0 0 5px ${a.dot}` : undefined }}
            />
            <span className="flex-1 min-w-0 truncate text-[12px] font-medium">{t.name}</span>
            {active && <CheckIcon />}
          </button>
        )
      })}
      {templates.length === 0 && (
        <div className="text-[10.5px] text-[var(--text-faint)] px-2 py-1">Сначала создайте шаблон</div>
      )}
    </div>
  )

  return (
    <div>
      {/* Расписание недели */}
      <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[var(--text-faint)]">Неделя</span>
        <span className="text-[9.5px] text-[var(--text-faint)]">шаблон закрепляется за днём</span>
      </div>
      <div className="px-1">
        {WEEKDAYS.map((label, i) => {
          const dayNum = i + 1
          const assigned = byDay.get(dayNum)
          const isTodayRow = dayNum === todayDay
          const open = pane?.kind === 'week' && pane.day === dayNum
          return (
            <div key={label}>
              <button
                onClick={() => togglePane({ kind: 'week', day: dayNum })}
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-150 ${
                  open ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-3)]'
                }`}
              >
                <span
                  className="shrink-0 w-[26px] h-[20px] rounded-md flex items-center justify-center text-[9.5px] font-bold"
                  style={
                    isTodayRow
                      ? { background: 'rgba(76,141,255,0.16)', color: 'var(--focus)', border: '1px solid rgba(76,141,255,0.35)' }
                      : { background: 'var(--surface-3)', color: 'var(--text-dim)', border: '1px solid transparent' }
                  }
                >
                  {label}
                </span>
                {assigned ? (
                  <>
                    <span
                      className="size-[6px] rounded-full shrink-0"
                      style={{
                        background: accentOf(assigned)?.dot ?? 'var(--text-faint)',
                        boxShadow: `0 0 5px ${accentOf(assigned)?.dot}`,
                        opacity: activeTemplateId === assigned.id ? 1 : 0.55,
                      }}
                    />
                    <span className="flex-1 min-w-0 truncate text-[12px] font-medium text-[var(--text)]">{assigned.name}</span>
                  </>
                ) : (
                  <span className="flex-1 min-w-0 truncate text-[12px] text-[var(--text-faint)]">—</span>
                )}
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-faint)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {open &&
                renderChooser(byDay.get(dayNum)?.id, (id) => {
                  onAssignWeekday(dayNum, id)
                  setPane(null)
                })}
            </div>
          )
        })}
      </div>

      {/* Отдельные дни */}
      <div className="border-t border-[var(--stroke)] mt-1.5 pt-1.5 px-2.5 pb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[var(--text-faint)]">Отдельные дни</span>
        <span className="text-[9.5px] text-[var(--text-faint)]">на конкретную дату</span>
      </div>
      <div className="px-1">
        {specialDays.length === 0 && !newDate && (
          <div className="px-2 py-1 text-[11px] text-[var(--text-faint)]">Пока нет — можно запланировать на будущее</div>
        )}
        {specialDays.map(([k, v]) => {
          const t = v ? tplById.get(v) : undefined
          const open = pane?.kind === 'date' && pane.key === k
          return (
            <div key={k}>
              <div
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${open ? 'bg-[var(--surface-3)]' : 'hover:bg-[var(--surface-3)]'}`}
              >
                <span className="shrink-0 text-[10.5px] font-mono tabular-nums text-[var(--text-dim)] w-[44px]">{fmtDateKey(k)}</span>
                <span
                  className="size-[6px] rounded-full shrink-0"
                  style={{ background: t ? accentOf(t)?.dot ?? 'var(--text-faint)' : 'transparent', border: t ? 'none' : '1px dashed var(--stroke)' }}
                />
                <span className={`flex-1 min-w-0 truncate text-[12px] font-medium ${t ? 'text-[var(--text)]' : 'text-[var(--text-faint)]'}`}>
                  {t ? t.name : 'Без шаблона'}
                  {k === todayK && <span className="ml-1 text-[9.5px] text-[var(--focus)]">· сегодня</span>}
                </span>
                <button
                  title="Убрать особый день"
                  onClick={() => onSetDateOverride(k, undefined)}
                  className="shrink-0 size-[18px] rounded-full flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] cursor-pointer transition-colors"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
        {pane?.kind === 'date' && renderChooser(overrides[pane.key], (id) => {
          onSetDateOverride(pane.key, id)
          setPane(null)
          setNewDate('')
        })}
        {(!pane || pane.kind === 'week') && (
          <label
            className="mt-0.5 mx-1 mb-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-1.5 text-[11px] font-semibold text-[var(--text-faint)] cursor-pointer hover:text-[var(--text-dim)] hover:border-[var(--text-faint)] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Дата…
            <input
              type="date"
              min={todayK}
              value={newDate}
              onChange={(e) => {
                const k = e.target.value
                setNewDate(k)
                if (k) setPane({ kind: 'date', key: k })
              }}
              className="absolute opacity-0 size-0 pointer-events-none"
            />
          </label>
        )}
      </div>

      {/* Низ */}
      <div className="border-t border-[var(--stroke)] mt-1 pt-1">
        {isOverridden && (
          <button
            onClick={onResetToday}
            className="w-full rounded-lg px-2.5 py-2 text-[12px] font-medium text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-all duration-150 flex items-center gap-2"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Сегодня по расписанию недели
          </button>
        )}
        <button
          onClick={onCreate}
          className="w-full rounded-lg px-2.5 py-2 text-[12px] font-semibold text-[var(--focus)] hover:bg-[rgba(76,141,255,0.1)] transition-colors flex items-center gap-2"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Создать шаблон
        </button>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
