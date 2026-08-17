import { useRef, useState } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
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

type Accent = (typeof ACCENTS)[RuleColor]

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

function DurationSlider({
  value,
  min = 5,
  max = 120,
  step = 5,
  accent,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  accent: Accent
  onChange: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef(false)

  const pct = ((value - min) / (max - min)) * 100

  const update = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const raw = min + p * (max - min)
    const snapped = Math.round(raw / step) * step
    onChange(Math.min(max, Math.max(min, snapped)))
  }

  return (
    <div
      ref={ref}
      className="relative h-10 select-none touch-none cursor-pointer"
      onPointerDown={(e) => {
        dragRef.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e.clientX)
      }}
      onPointerMove={(e) => {
        if (dragRef.current) update(e.clientX)
      }}
      onPointerUp={() => (dragRef.current = false)}
      onPointerCancel={() => (dragRef.current = false)}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[var(--surface-3)]" />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full"
        style={{ width: `${pct}%`, background: accent.gradient, boxShadow: `0 0 8px rgba(${accent.glow},0.45)` }}
      />
      <motion.div
        className="absolute -top-1 -translate-x-1/2 -translate-y-full rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold whitespace-nowrap"
        style={{ left: `${pct}%`, background: accent.dot, color: '#131418' }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 0.3 }}
      >
        {value} мин
      </motion.div>
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-4 rounded-full border-[3px]"
        style={{ left: `${pct}%`, background: '#fff', borderColor: accent.dot, boxShadow: `0 0 12px rgba(${accent.glow},0.8)` }}
      />
    </div>
  )
}

function RuleRow({
  rule,
  range,
  dragging,
  flash,
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
  const [flashId, setFlashId] = useState<string | null>(null)
  const addRef = useRef<HTMLDivElement>(null)
  const flashTimer = useRef<number | null>(null)
  const ranges = ruleRanges(rules)
  const lastEnd = ranges.length ? ranges[ranges.length - 1].end : CHAIN_START

  const save = (rules: Rule[]) => onChange(rules)

  const update = (id: string, patch: Partial<Rule>) =>
    save(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const remove = (id: string) => save(rules.filter((r) => r.id !== id))

  const openAdd = () => {
    setShowAdd(true)
    setTimeout(() => addRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300)
  }

  const flash = (id: string) => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    setFlashId(id)
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1500)
  }

  const addRule = (rule: Rule) => {
    save([...rules, rule])
    flash(rule.id)
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

  const previewMin = presetType ? presetMin : customMin
  const previewAccent = presetType
    ? ACCENTS[ACTIVITIES[presetType].color]
    : ACCENTS[custom.color]

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
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => (showAdd ? setShowAdd(false) : openAdd())}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors"
          style={{
            background: showAdd ? 'rgba(76,141,255,0.12)' : 'var(--surface-3)',
            border: `1px solid ${showAdd ? 'rgba(76,141,255,0.3)' : 'var(--stroke)'}`,
            color: showAdd ? 'var(--focus)' : 'var(--text-dim)',
          }}
        >
          <motion.svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            animate={{ rotate: showAdd ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M12 5v14M5 12h14" />
          </motion.svg>
          {showAdd ? 'Закрыть' : 'Блок'}
        </motion.button>
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
            flash={flashId === r.id}
            onDragState={setDragging}
            edit={edit}
            setEdit={setEdit}
            onUpdate={update}
            onRemove={remove}
          />
        ))}
      </Reorder.Group>

      <AnimatePresence initial={false}>
        {showAdd && (
          <motion.div
            key="add-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div ref={addRef} className="border-t border-[var(--stroke)] px-4 pt-4 pb-3 flex flex-col gap-4">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mb-2">
                  Готовые блоки
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(ACTIVITIES).map(([type, a]) => {
                    const acc = ACCENTS[a.color]
                    const sel = presetType === type
                    return (
                      <motion.button
                        key={type}
                        onClick={() => openPreset(type)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.94 }}
                        className="relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5"
                        style={{
                          background: sel ? acc.bg : 'var(--surface-2)',
                          border: `1px solid ${sel ? acc.border : 'var(--stroke)'}`,
                          boxShadow: sel ? `0 0 18px rgba(${acc.glow},0.22)` : 'none',
                          transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                        }}
                      >
                        <motion.svg
                          width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          animate={sel ? { rotate: [0, -12, 12, 0], scale: [1, 1.18, 1] } : { rotate: 0, scale: 1 }}
                          transition={{ duration: 0.45 }}
                        >
                          <path d={ICON_PATHS[a.icon]} />
                        </motion.svg>
                        <span className="text-[10px] font-semibold" style={{ color: acc.color }}>{a.label}</span>
                      </motion.button>
                    )
                  })}
                </div>

                <AnimatePresence mode="wait">
                  {presetType && (() => {
                    const a = ACTIVITIES[presetType]
                    const acc = ACCENTS[a.color]
                    return (
                      <motion.div
                        key={presetType}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="mt-3 rounded-2xl p-3.5"
                        style={{ background: acc.bg, border: `1px solid ${acc.border}` }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid size-8 place-items-center rounded-xl shrink-0"
                            style={{ background: 'rgba(19,20,24,0.35)', color: acc.color, border: `1px solid ${acc.border}` }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d={ICON_PATHS[a.icon]} />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold" style={{ color: acc.color }}>{a.label}</div>
                            <div className="text-[10px] text-[var(--text-faint)] truncate">
                              встанет после «{rules[rules.length - 1]?.name ?? 'старта дня'}»
                            </div>
                          </div>
                          <button
                            onClick={() => setPresetType(null)}
                            className="ml-auto grid size-6 place-items-center rounded-md text-[var(--text-faint)] hover:text-[var(--text)] transition-colors shrink-0"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {a.presets.map((m) => (
                            <motion.button
                              key={m}
                              onClick={() => setPresetMin(m)}
                              whileTap={{ scale: 0.92 }}
                              className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-mono"
                              style={
                                presetMin === m
                                  ? { background: acc.dot, color: '#131418', fontWeight: 700 }
                                  : { background: 'rgba(19,20,24,0.35)', color: 'var(--text-dim)' }
                              }
                            >
                              {m}
                            </motion.button>
                          ))}
                        </div>

                        <div className="mt-2">
                          <DurationSlider value={presetMin} accent={acc} onChange={setPresetMin} />
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-[var(--text-faint)]">
                          <span className="uppercase tracking-[0.08em] text-[9.5px] font-semibold">Встанет в цепочку</span>
                          <span className="font-mono tabular-nums font-semibold" style={{ color: acc.color }}>
                            {fmtHM(lastEnd)} → {fmtHM(lastEnd + presetMin)}
                          </span>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={addPreset}
                          className="mt-3 w-full rounded-xl py-2.5 text-[12.5px] font-bold flex items-center justify-center gap-1.5"
                          style={{
                            background: acc.gradient,
                            color: '#131418',
                            boxShadow: `0 4px 16px rgba(${acc.glow},0.35)`,
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Добавить · {presetMin} мин
                        </motion.button>
                      </motion.div>
                    )
                  })()}
                </AnimatePresence>
              </div>

              <div className="border-t border-[var(--stroke)] pt-4">
                <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mb-2.5">
                  Своё правило
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={custom.name}
                    onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustom()
                    }}
                    placeholder="Название, например «Спортзал»"
                    className="flex-1 min-w-0 rounded-xl bg-[var(--surface-3)] px-3 py-2.5 text-[12.5px] outline-none border border-[var(--stroke)] transition-colors focus:border-[var(--focus)] placeholder:text-[var(--text-faint)]"
                  />
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={addCustom}
                    disabled={!custom.name.trim()}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-bold disabled:opacity-40"
                    style={{
                      background: ACCENTS[custom.color].dot,
                      color: '#131418',
                      boxShadow: `0 4px 16px rgba(${ACCENTS[custom.color].glow},0.35)`,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Добавить
                  </motion.button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl px-2 py-1.5" style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)' }}>
                    {CUSTOM_ICONS.map((icon) => {
                      const sel = custom.icon === icon
                      return (
                        <motion.button
                          key={icon}
                          onClick={() => setCustom({ ...custom, icon })}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.85 }}
                          className="grid size-7 place-items-center rounded-lg transition-colors"
                          style={{
                            background: sel ? ACCENTS[custom.color].bg : 'transparent',
                            boxShadow: sel ? `0 0 10px rgba(${ACCENTS[custom.color].glow},0.3)` : 'none',
                          }}
                          title={icon}
                        >
                          <svg
                            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sel ? ACCENTS[custom.color].color : 'var(--text-faint)'}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d={ICON_PATHS[icon]} />
                          </svg>
                        </motion.button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)' }}>
                    {COLOR_KEYS.map((c) => {
                      const sel = custom.color === c
                      return (
                        <motion.button
                          key={c}
                          onClick={() => setCustom({ ...custom, color: c })}
                          whileHover={{ scale: 1.25 }}
                          whileTap={{ scale: 0.85 }}
                          className="size-[18px] rounded-full"
                          style={{
                            background: ACCENTS[c].dot,
                            boxShadow: sel
                              ? `0 0 0 2px rgba(19,20,24,1), 0 0 0 4px ${ACCENTS[c].color}, 0 0 12px rgba(${ACCENTS[c].glow},0.5)`
                              : 'none',
                          }}
                          title={c}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="mt-2">
                  <DurationSlider value={customMin} accent={ACCENTS[custom.color]} onChange={setCustomMin} />
                </div>
              </div>

              <div className="border-t border-[var(--stroke)] pt-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 flex h-7 rounded-lg overflow-hidden border border-[var(--stroke)] bg-[var(--surface-2)]">
                    {rules.map((r) => (
                      <div key={r.id} className="h-full" style={{ flex: r.minutes, background: ACCENTS[r.color].gradient, opacity: 0.45 }} />
                    ))}
                    <div className="relative h-full" style={{ flex: previewMin, background: previewAccent.gradient }}>
                      <motion.div
                        animate={{ opacity: [0.35, 0.9, 0.35] }}
                        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                        className="absolute inset-0"
                        style={{ background: `rgba(${previewAccent.glow},0.35)` }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-faint)] whitespace-nowrap tabular-nums">
                    {fmtHM(lastEnd)} → {fmtHM(lastEnd + previewMin)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}