import { useRef, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import {
  ACTIVITIES,
  ACCENTS,
  ICON_PATHS,
  CUSTOM_ICONS,
  COLOR_KEYS,
} from '../lib/activities'
import type { Rule, RuleColor } from '../lib/activities'
import { fmtHM } from '../hooks/useRhythm'

const CHAIN_START = 540

interface EditState {
  id: string
  field: 'name' | 'minutes'
  value: string
}

function ruleRanges(rules: Rule[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  let t = CHAIN_START
  for (const r of rules) {
    out.push({ start: t, end: t + r.minutes })
    t += r.minutes
  }
  return out
}

function RuleRow({
  rule,
  range,
  dragging,
  onDragState,
  edit,
  setEdit,
  onUpdate,
  onRemove,
}: {
  rule: Rule
  range: { start: number; end: number }
  dragging: boolean
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

  const commitEdit = (field: 'name' | 'minutes') => {
    if (!edit) return
    if (field === 'minutes') {
      const n = Number(edit.value)
      if (Number.isFinite(n) && n > 0) onUpdate(rule.id, { minutes: Math.round(n) })
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
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.45)' : 'none',
        borderRadius: '0px',
        cursor: 'default',
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
        <input
          autoFocus
          type="number"
          min={1}
          value={edit.value}
          onChange={(e) => setEdit({ ...edit, value: e.target.value })}
          onBlur={() => commitEdit('minutes')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit('minutes')
            if (e.key === 'Escape') setEdit(null)
          }}
          className="w-14 rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[11.5px] text-right outline-none border border-[var(--stroke)] font-mono"
        />
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

export function RuleChips({ rules, onChange }: { rules: Rule[]; onChange: (rules: Rule[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [presetType, setPresetType] = useState<string | null>(null)
  const [presetMin, setPresetMin] = useState(0)
  const [customMin, setCustomMin] = useState(60)
  const [custom, setCustom] = useState({ name: '', icon: 'star', color: 'blue' as RuleColor })
  const addRef = useRef<HTMLDivElement>(null)
  const ranges = ruleRanges(rules)

  const save = (rules: Rule[]) => onChange(rules)

  const update = (id: string, patch: Partial<Rule>) =>
    save(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const remove = (id: string) => save(rules.filter((r) => r.id !== id))

  const openAdd = () => {
    setShowAdd(true)
    setTimeout(() => addRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
  }

  const addRule = (rule: Rule) => {
    save([...rules, rule])
    if (presetType) setPresetMin(ACTIVITIES[presetType].presets[0])
  }

  const openPreset = (type: string) => {
    setPresetType(type)
    setPresetMin(ACTIVITIES[type].presets[0])
    openAdd()
  }

  const addPreset = () => {
    if (!presetType) return
    const a = ACTIVITIES[presetType]
    addRule({
      id: crypto.randomUUID(),
      type: presetType,
      name: a.label,
      minutes: presetMin,
      color: a.color,
      icon: a.icon,
    })
  }

  const addCustom = () => {
    if (!custom.name.trim()) return
    addRule({
      id: crypto.randomUUID(),
      type: 'focus',
      name: custom.name.trim(),
      minutes: customMin,
      color: custom.color,
      icon: custom.icon,
    })
    setCustom({ name: '', icon: 'star', color: 'blue' })
  }

  return (
    <div className="card card-lift relative z-[1] overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--focus)]">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4M8 13h3M8 17h6" />
          </svg>
          <span className="font-[var(--font-display)] text-[14.5px] font-semibold">Правила дня</span>
          <span className="text-[10.5px] text-[var(--text-faint)] font-mono">{rules.length}</span>
        </div>
        <button
          onClick={() => (showAdd ? setShowAdd(false) : openAdd())}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)', color: 'var(--text-dim)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Блок
        </button>
      </div>

      <Reorder.Group
        axis="y"
        values={rules}
        onReorder={save}
        className="flex flex-col gap-1 px-3"
      >
        {rules.map((r, i) => (
          <RuleRow
            key={r.id}
            rule={r}
            range={ranges[i]}
            dragging={dragging}
            onDragState={setDragging}
            edit={edit}
            setEdit={setEdit}
            onUpdate={update}
            onRemove={remove}
          />
        ))}
      </Reorder.Group>

      {showAdd && (
        <div ref={addRef} className="border-t border-[var(--stroke)] px-4 py-4 flex flex-col gap-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mb-2">
              Готовые блоки
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(ACTIVITIES).map(([type, a]) => {
                const acc = ACCENTS[a.color]
                return (
                  <button
                    key={type}
                    onClick={() => openPreset(type)}
                    className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-colors"
                    style={{
                      background: presetType === type ? acc.bg : 'var(--surface-2)',
                      border: `1px solid ${presetType === type ? acc.border : 'var(--stroke)'}`,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a.color ? acc.color : acc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ICON_PATHS[a.icon]} />
                    </svg>
                    <span className="text-[10px] font-semibold" style={{ color: acc.color }}>{a.label}</span>
                  </button>
                )
              })}
            </div>

            {presetType && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {ACTIVITIES[presetType].presets.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPresetMin(m)}
                    className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-mono transition-colors"
                    style={
                      presetMin === m
                        ? { background: 'var(--focus)', color: '#131418', fontWeight: 700 }
                        : { background: 'var(--surface-3)', color: 'var(--text-dim)' }
                    }
                  >
                    {m} мин
                  </button>
                ))}
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="number"
                    min={1}
                    value={presetMin}
                    onChange={(e) => setPresetMin(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 rounded-lg bg-[var(--surface-3)] px-2 py-1.5 text-[11.5px] text-right outline-none border border-[var(--stroke)] font-mono"
                  />
                  <span className="text-[11px] text-[var(--text-faint)]">мин</span>
                </div>
                <button
                  onClick={addPreset}
                  className="ml-auto rounded-lg px-3 py-1.5 text-[11.5px] font-semibold"
                  style={{ background: 'var(--focus)', color: '#131418' }}
                >
                  Добавить
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--stroke)] pt-4">
            <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mb-2">
              Своё правило
            </div>
            <div className="flex items-center gap-2">
              <input
                value={custom.name}
                onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                placeholder="Название, например «Спортзал»"
                className="flex-1 rounded-lg bg-[var(--surface-3)] px-2.5 py-2 text-[12.5px] outline-none border border-[var(--stroke)] placeholder:text-[var(--text-faint)]"
              />
              <div className="flex items-center gap-1.5 rounded-lg px-2 py-2" style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)' }}>
                {CUSTOM_ICONS.slice(0, 6).map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setCustom({ ...custom, icon })}
                    className="grid size-6 place-items-center rounded-md transition-colors"
                    style={custom.icon === icon ? { background: ACCENTS[custom.color].bg } : {}}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={custom.icon === icon ? ACCENTS[custom.color].color : 'var(--text-faint)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ICON_PATHS[icon]} />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 rounded-lg px-2 py-2" style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)' }}>
                {COLOR_KEYS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCustom({ ...custom, color: c })}
                    className="size-4 rounded-full transition-transform"
                    style={{
                      background: ACCENTS[c].dot,
                      boxShadow: custom.color === c ? `0 0 0 2px rgba(19,20,24,1), 0 0 0 3.5px ${ACCENTS[c].color}` : 'none',
                    }}
                  />
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={customMin}
                onChange={(e) => setCustomMin(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded-lg bg-[var(--surface-3)] px-2 py-2 text-[11.5px] text-right outline-none border border-[var(--stroke)] font-mono"
                title="Минут"
              />
              <button
                onClick={addCustom}
                disabled={!custom.name.trim()}
                className="rounded-lg px-3 py-2 text-[11.5px] font-semibold disabled:opacity-40"
                style={{ background: ACCENTS[custom.color].dot, color: '#131418' }}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}