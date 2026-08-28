import { Reorder, useDragControls, motion } from 'framer-motion'
import { ACCENTS, ICON_PATHS, ACTIVITIES } from '@/entities/rhythm/activities'
import type { Rule } from '@/entities/rhythm/activities'
import { fmtHM } from '@/entities/rhythm/useRhythm'

export interface EditState {
  id: string
  field: 'name' | 'minutes'
  value: string
}

export function RuleRow({
  rule,
  range,
  dragging,
  flash,
  maxMinutes,
  onDragState,
  edit,
  setEdit,
  onUpdate,
  onRemove,
}: {
  rule: Rule
  range: { start: number; end: number }
  dragging: boolean
  flash: boolean
  /** Максимум минут для этого правила, чтобы цепочка не вышла за 24 часа. */
  maxMinutes?: number
  onDragState: (d: boolean) => void
  edit: EditState | null
  setEdit: (e: EditState | null) => void
  onUpdate: (id: string, patch: Partial<Rule>) => void
  onRemove: (id: string) => void
}) {
  const dragControls = useDragControls()
  const a = ACCENTS[rule.color]
  const isEditingName = edit?.id === rule.id && edit.field === 'name'
  const isEditingMin = edit?.id === rule.id && edit.field === 'minutes'
  const parsedMin = isEditingMin ? Number(edit.value) : NaN
  const overLimit = Number.isFinite(parsedMin) && maxMinutes != null && parsedMin > maxMinutes

  const commitEdit = (field: 'name' | 'minutes') => {
    if (!edit) return
    if (field === 'minutes') {
      const n = Number(edit.value)
      if (Number.isFinite(n) && n > 0) {
        const capped = maxMinutes != null ? Math.min(Math.round(n), Math.max(1, maxMinutes)) : Math.round(n)
        onUpdate(rule.id, { minutes: capped })
      }
    } else if (edit.value.trim()) {
      onUpdate(rule.id, { name: edit.value.trim() })
    }
    setEdit(null)
  }

  return (
    <Reorder.Item
      value={rule}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={() => onDragState(true)}
      onDragEnd={() => onDragState(false)}
      onPointerUp={() => onDragState(false)}
      onPointerCancel={() => onDragState(false)}
      className="flex items-center gap-2 rounded-xl px-2.5 py-2"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--stroke)',
        scale: dragging ? 1 : 1,
        zIndex: dragging ? 10 : 1,
        boxShadow: dragging
          ? '0 8px 24px rgba(0,0,0,0.45)'
          : flash
            ? `0 0 0 1.5px ${a.border}, 0 0 20px rgba(${a.glow},0.35)`
            : 'none',
        borderRadius: '0px',
        cursor: 'default',
        transition: 'box-shadow 0.5s ease',
      }}
    >
      <button
        onPointerDown={(e) => dragControls.start(e)}
        className="grid size-6 place-items-center rounded-md text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.7" />
          <circle cx="15" cy="5" r="1.7" />
          <circle cx="9" cy="12" r="1.7" />
          <circle cx="15" cy="12" r="1.7" />
          <circle cx="9" cy="19" r="1.7" />
          <circle cx="15" cy="19" r="1.7" />
        </svg>
      </button>

      <span
        className="text-[10px] font-mono text-[var(--text-faint)] tabular-nums whitespace-nowrap"
        style={{ minWidth: 86 }}
      >
        {fmtHM(range.start)}–{fmtHM(range.end)}
      </span>

      <span
        className="grid size-7 place-items-center rounded-lg shrink-0"
        style={{ background: a.bg, border: `1px solid ${a.border}`, color: a.color }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICON_PATHS[rule.icon] ?? ICON_PATHS.clock} />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        {isEditingName ? (
          <input
            autoFocus
            value={edit.value}
            onChange={(e) => setEdit({ ...edit, value: e.target.value })}
            onBlur={() => commitEdit('name')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit('name')
              if (e.key === 'Escape') setEdit(null)
            }}
            className="w-full rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[12.5px] outline-none border border-[var(--stroke)]"
          />
        ) : (
          <button
            onClick={() => setEdit({ id: rule.id, field: 'name', value: rule.name })}
            className="block max-w-full truncate text-[12.5px] font-semibold text-left hover:text-[var(--text)] transition-colors"
          >
            {rule.name}
          </button>
        )}
        <div className="text-[10px] text-[var(--text-faint)]">
          {ACTIVITIES[rule.type]?.label ?? 'Своё правило'}
        </div>
      </div>

      {isEditingMin ? (
        <div className="relative">
          <input
            autoFocus
            type="number"
            min={1}
            max={maxMinutes}
            value={edit.value}
            onChange={(e) => setEdit({ ...edit, value: e.target.value })}
            onBlur={() => commitEdit('minutes')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit('minutes')
              if (e.key === 'Escape') setEdit(null)
            }}
            className="w-14 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[11.5px] text-right outline-none font-mono border transition-colors"
            style={{
              borderColor: overLimit ? 'rgba(255,107,107,0.65)' : 'var(--stroke)',
              color: overLimit ? '#ff6b6b' : undefined,
            }}
          />
          {overLimit && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-1 text-[9px] font-mono whitespace-nowrap z-10 px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b' }}
            >
              макс · {maxMinutes}м (24ч)
            </motion.span>
          )}
        </div>
      ) : (
        <button
          onClick={() => setEdit({ id: rule.id, field: 'minutes', value: String(rule.minutes) })}
          className="rounded-md px-1.5 py-0.5 text-[11px] font-mono tabular-nums transition-colors"
          style={{ background: a.bg, color: a.color }}
          title="Длительность, мин"
        >
          {rule.minutes}м
        </button>
      )}

      <button
        onClick={() => onRemove(rule.id)}
        className="grid size-6 place-items-center rounded-md text-[var(--text-faint)] hover:text-[var(--rest)] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </svg>
      </button>
    </Reorder.Item>
  )
}