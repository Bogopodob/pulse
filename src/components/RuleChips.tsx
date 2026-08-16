import { useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'

type RuleColor = 'blue' | 'amber' | 'violet'

interface Rule {
  id: string
  name: string
  start: string
  end: string
  focus: number
  rest: number
  color: RuleColor
}

const ACCENTS: Record<RuleColor, { color: string; bg: string; border: string }> = {
  blue: { color: '#bcd4ff', bg: 'rgba(76,141,255,0.12)', border: 'rgba(76,141,255,0.28)' },
  amber: { color: '#ffd7b0', bg: 'rgba(255,157,92,0.12)', border: 'rgba(255,157,92,0.28)' },
  violet: { color: '#d3c8ff', bg: 'rgba(124,107,255,0.14)', border: 'rgba(124,107,255,0.3)' },
}

const RULE_ICONS: Record<RuleColor, string> = {
  blue: 'M12 7v5l3.5 2',
  amber: 'M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z',
  violet: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
}

const INITIAL: Rule[] = [
  { id: '1', name: 'До обеда', start: '09:00', end: '13:00', focus: 60, rest: 10, color: 'blue' },
  { id: '2', name: 'После обеда', start: '14:00', end: '18:00', focus: 90, rest: 15, color: 'amber' },
  { id: '3', name: 'Вечер', start: '18:00', end: '20:00', focus: 45, rest: 10, color: 'violet' },
]

interface Draft {
  name: string
  focus: number
  rest: number
}

export function RuleChips() {
  const [rules, setRules] = useState<Rule[]>(INITIAL)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const startEdit = (r: Rule) => {
    setEditingId(r.id)
    setDraft({ name: r.name, focus: r.focus, rest: r.rest })
  }

  const saveEdit = (id: string) => {
    if (!draft) return
    setRules((rs) =>
      rs.map((r) =>
        r.id === id
          ? { ...r, name: draft.name.trim() || r.name, focus: Math.max(1, draft.focus), rest: Math.max(0, draft.rest) }
          : r
      )
    )
    setEditingId(null)
    setDraft(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const removeRule = (id: string) => {
    setRules((rs) => rs.filter((r) => r.id !== id))
    if (editingId === id) cancelEdit()
  }

  const addRule = () => {
    const r: Rule = { id: crypto.randomUUID(), name: 'Новое правило', start: '09:00', end: '13:00', focus: 50, rest: 10, color: 'blue' }
    setRules((rs) => [...rs, r])
    startEdit(r)
  }

  return (
    <div className="card card-lift relative z-[1] overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--focus)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Правила дня</h3>
          <span className="text-[10px] text-[var(--text-faint)] bg-[var(--surface-2)] border border-[var(--stroke)] px-1.5 py-0.5 rounded tabular-nums">{rules.length}</span>
        </div>
        <button onClick={addRule} className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить правило
        </button>
      </div>

      <Reorder.Group axis="y" values={rules} onReorder={setRules} className="flex flex-col">
        {rules.map((rule) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            editing={editingId === rule.id}
            draft={draft}
            onStartEdit={() => startEdit(rule)}
            onSave={() => saveEdit(rule.id)}
            onCancel={cancelEdit}
            onRemove={() => removeRule(rule.id)}
            onDraftChange={setDraft}
          />
        ))}
      </Reorder.Group>
    </div>
  )
}

function RuleRow({
  rule,
  editing,
  draft,
  onStartEdit,
  onSave,
  onCancel,
  onRemove,
  onDraftChange,
}: {
  rule: Rule
  editing: boolean
  draft: Draft | null
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  onRemove: () => void
  onDraftChange: (d: Draft) => void
}) {
  const drag = useDragControls()
  const a = ACCENTS[rule.color]

  return (
    <Reorder.Item
      value={rule}
      dragListener={false}
      dragControls={drag}
      whileDrag={{ scale: 1.015, boxShadow: '0 14px 34px rgba(0,0,0,0.4)', zIndex: 40, borderRadius: '14px' }}
      className="group flex items-center gap-3 px-6 py-3 border-t border-[var(--stroke)] first:border-t-0 bg-[var(--surface)]"
    >
      <button
        onPointerDown={(e) => drag.start(e)}
        title="Перетащите для сортировки"
        className="shrink-0 cursor-grab active:cursor-grabbing text-[var(--text-faint)] hover:text-[var(--text-dim)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.7" /><circle cx="15" cy="5" r="1.7" />
          <circle cx="9" cy="12" r="1.7" /><circle cx="15" cy="12" r="1.7" />
          <circle cx="9" cy="19" r="1.7" /><circle cx="15" cy="19" r="1.7" />
        </svg>
      </button>

      <div
        className="shrink-0 flex items-center justify-center size-[38px] rounded-xl"
        style={{ background: a.bg, border: `1px solid ${a.border}`, color: a.color, boxShadow: `inset 0 0 12px ${a.bg}` }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={RULE_ICONS[rule.color]} />
        </svg>
      </div>

      {editing && draft ? (
        <>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave()
                if (e.key === 'Escape') onCancel()
              }}
              className="input-base text-[12.5px] font-semibold bg-[var(--surface-2)] border border-[var(--stroke)] rounded-lg px-2 py-1.5 w-[130px] focus:border-[rgba(76,141,255,0.4)]"
            />
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-faint)]">
              <input
                type="number"
                min={1}
                value={draft.focus}
                onChange={(e) => onDraftChange({ ...draft, focus: Number(e.target.value) })}
                className="w-[48px] text-center text-[var(--text)] bg-[var(--surface-2)] border border-[var(--stroke)] rounded-lg px-1 py-1.5 no-spinner"
              />
              <span className="opacity-60">/</span>
              <input
                type="number"
                min={0}
                value={draft.rest}
                onChange={(e) => onDraftChange({ ...draft, rest: Number(e.target.value) })}
                className="w-[48px] text-center text-[var(--text)] bg-[var(--surface-2)] border border-[var(--stroke)] rounded-lg px-1 py-1.5 no-spinner"
              />
              <span className="opacity-60">мин</span>
            </div>
          </div>
          <button onClick={onSave} title="Сохранить" className="btn-icon !size-8 hover:!text-[#7ee787]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[var(--text)]">{rule.name}</div>
            <div className="text-[11px] font-mono text-[var(--text-faint)] mt-0.5">
              {rule.start}–{rule.end}
              <span className="opacity-60"> · </span>
              <span style={{ color: a.color }}>{rule.focus}</span>
              <span className="opacity-60"> / </span>
              <span className="text-[var(--text-dim)]">{rule.rest}</span>
              <span className="opacity-60"> мин</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onStartEdit} title="Редактировать" className="btn-icon !size-8">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
              </svg>
            </button>
            <button onClick={onRemove} title="Удалить" className="btn-icon !size-8 hover:!text-[var(--danger)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </>
      )}
    </Reorder.Item>
  )
}