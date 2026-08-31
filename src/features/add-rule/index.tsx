import { memo, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { ACTIVITIES } from '../../entities/rhythm/activities'
import type { Rule, RuleColor } from '../../entities/rhythm/activities'
import { DAY_LIMIT, fmtHM } from '../../entities/rhythm/useRhythm'
import type { DayTemplate } from '../../entities/templates/useTemplates'
import { RuleRow } from './ui/RuleRow'
import type { EditState } from './ui/RuleRow'
import { BlockCreator } from './ui/BlockCreator'
import { WeekPicker } from './ui/WeekPicker'

function ruleRanges(rules: Rule[], chainStart: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  let t = chainStart
  for (const r of rules) {
    out.push({ start: t, end: t + r.minutes })
    t += r.minutes
  }
  return out
}

export const RuleChips = memo(function RuleChips({
  rules,
  chainStart,
  onChange,
  onClearDayRules,
  onCreateTemplateFromCurrent,
  templates,
  activeTemplateId,
  isOverridden,
  overrides,
  onSelectTemplate,
  onAssignWeekday,
  onSetDateOverride,
  onSelectViewingDate,
  onOpenTemplates,
}: {
  rules: Rule[]
  chainStart: number
  onChange: (rules: Rule[]) => void
  onClearDayRules: () => void
  onCreateTemplateFromCurrent: () => void
  templates: DayTemplate[]
  activeTemplateId: string | null
  isOverridden: boolean
  overrides: Record<string, string | null>
  onSelectTemplate: (templateId: string | null | 'none') => void
  onAssignWeekday: (dayNum: number, templateId: string | null) => void
  onSetDateOverride: (dateKey: string, value: string | null | undefined) => void
  onSelectViewingDate?: (dateKey: string) => void
  onOpenTemplates: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [presetType, setPresetType] = useState<string | null>(null)
  const [presetMin, setPresetMin] = useState(0)
  const [customMin, setCustomMin] = useState(60)
  const [custom, setCustom] = useState({ name: '', icon: 'star', color: 'blue' as RuleColor })
  const [flashId, setFlashId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const flashTimer = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ranges = ruleRanges(rules, chainStart)

  useEffect(() => {
    if (!showAdd) return
    const id = window.setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 180)
    return () => window.clearTimeout(id)
  }, [showAdd])

  /* Бюджет суток: сумма всех блоков не может превысить 24:00 − начало цепочки. */
  const budget = Math.max(0, DAY_LIMIT - chainStart)
  const totalMin = rules.reduce((s, r) => s + r.minutes, 0)
  const maxMinutesFor = (id: string) =>
    Math.max(1, budget - (totalMin - (rules.find((r) => r.id === id)?.minutes ?? 0)))

  const save = (rules: Rule[]) => onChange(rules)

  const update = (id: string, patch: Partial<Rule>) => {
    if (patch.minutes != null) {
      // При сохранении клампим длительность, чтобы суммарно уложиться в 24 часа
      const others = rules.filter((x) => x.id !== id).reduce((s, x) => s + x.minutes, 0)
      patch = { ...patch, minutes: Math.max(1, Math.min(patch.minutes, budget - others)) }
    }
    save(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const remove = (id: string) => save(rules.filter((r) => r.id !== id))

  const flash = (id: string) => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    setFlashId(id)
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1500)
  }

  const addRule = (rule: Rule) => {
    const roomLeft = budget - totalMin
    if (roomLeft <= 0) return
    const clamped = { ...rule, minutes: Math.max(1, Math.min(rule.minutes, roomLeft)) }
    save([...rules, clamped])
    flash(clamped.id)
    if (presetType) setPresetMin(ACTIVITIES[presetType].presets[0])
  }

  const isWithoutTemplate = activeTemplateId === null
  const canClear = isWithoutTemplate && rules.length > 0

  return (
    <div className="card card-lift relative z-[1] flex flex-col">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--focus)]">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4M8 13h3M8 17h6" />
          </svg>
          <span className="font-[var(--font-display)] text-[14.5px] font-semibold">Правила дня</span>
          <span className="text-[10.5px] text-[var(--text-faint)] font-mono">{rules.length}</span>
        </div>

        <div className="relative ml-auto">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors"
            style={{
              background: showPicker ? 'rgba(76,141,255,0.12)' : 'var(--surface-3)',
              border: `1px solid ${showPicker ? 'rgba(76,141,255,0.3)' : 'var(--stroke)'}`,
              color: showPicker ? 'var(--focus)' : 'var(--text-dim)',
            }}
            title="Шаблон дня"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4M8 13h3M8 17h6" />
            </svg>
            <span className="max-w-[130px] truncate">
              {activeTemplateId ? templates.find((t) => t.id === activeTemplateId)?.name ?? 'Шаблон' : 'Без шаблона'}
            </span>
            {isOverridden && (
              <span className="size-[6px] rounded-full shrink-0" style={{ background: 'var(--focus)', boxShadow: '0 0 6px var(--focus)' }} />
            )}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: showPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <AnimatePresence>
            {showPicker && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[40] bg-black/50"
                  onClick={() => setShowPicker(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="fixed left-1/2 top-1/2 z-[41] w-[min(640px,calc(100vw-24px))] max-h-[min(86vh,720px)] -translate-x-1/2 -translate-y-1/2 rounded-[20px] overflow-hidden flex flex-col"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--stroke)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
                  }}
                >
                  <button
                    onClick={() => setShowPicker(false)}
                    className="absolute top-3 right-3 size-7 grid place-items-center rounded-full bg-[var(--surface)] text-[var(--text-faint)] hover:text-[var(--text)] border border-[var(--stroke)] hover:bg-[var(--surface-3)] transition-colors z-10"
                    aria-label="Закрыть"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 pt-10 [scrollbar-width:thin] [scrollbar-color:var(--stroke)_transparent]">
                  <WeekPicker
                    templates={templates}
                    overrides={overrides}
                    activeTemplateId={activeTemplateId}
                    isOverridden={isOverridden}
                    onAssignWeekday={(day, id) => {
                      onAssignWeekday(day, id)
                      setShowPicker(false)
                    }}
                    onSetDateOverride={(key, val) => {
                      onSetDateOverride(key, val)
                      setShowPicker(false)
                    }}
                    onSelectViewingDate={onSelectViewingDate}
                    onResetToday={() => {
                      onSelectTemplate(null)
                      setShowPicker(false)
                    }}
                    onCreate={() => {
                      setShowPicker(false)
                      onOpenTemplates()
                    }}
                    onCreateFromCurrent={() => {
                      setShowPicker(false)
                      onCreateTemplateFromCurrent()
                    }}
                  />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors"
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

      {isWithoutTemplate && (
        <div className="mx-3 mb-2 shrink-0 rounded-lg px-3 py-2 flex items-center gap-2 text-[11px] leading-[1.4]" style={{ background: 'rgba(76,141,255,0.08)', border: '1px solid rgba(76,141,255,0.18)', color: 'var(--text-dim)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--focus)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <span>
            <span className="font-semibold text-[var(--text)]">Без шаблона</span> — правила для <span className="font-semibold text-[var(--text)]">каждого числа свои</span>. Созданные блоки сохранятся только на этот день и восстановятся при возврате.
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex flex-col gap-1 px-3 py-1">
        {rules.length === 0 && isWithoutTemplate ? (
          <div className="rounded-xl px-4 py-6 text-center" style={{ background: 'var(--surface-2)', border: '1px dashed var(--stroke)' }}>
            <div className="text-[13px] font-medium text-[var(--text-dim)]">Пока нет ни одного блока</div>
            <div className="text-[11.5px] text-[var(--text-faint)] mt-1">Нажмите «Блок» или «Добавить блок», чтобы собрать свой день — это не шаблон, а текущие правила на сегодня</div>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={rules}
            onReorder={save}
            className="flex flex-col gap-1"
          >
            {rules.map((r, i) => (
              <RuleRow
                key={r.id}
                rule={r}
                range={ranges[i]}
                dragging={dragging}
                flash={flashId === r.id}
                maxMinutes={maxMinutesFor(r.id)}
                onDragState={setDragging}
                edit={edit}
                setEdit={setEdit}
                onUpdate={update}
                onRemove={remove}
              />
            ))}
          </Reorder.Group>
        )}

        <div
          className="grid transition-[grid-template-rows] duration-[160ms] ease-out"
          style={{ gridTemplateRows: showAdd ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="pt-1.5">
              <BlockCreator
                rules={rules}
                onClose={() => setShowAdd(false)}
                presetType={presetType}
                setPresetType={setPresetType}
                presetMin={presetMin}
                setPresetMin={setPresetMin}
                custom={custom}
                setCustom={setCustom}
                customMin={customMin}
                setCustomMin={setCustomMin}
                chainStart={chainStart}
                onAdd={addRule}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pt-2 pb-3 shrink-0 flex flex-col gap-1.5 border-t border-[var(--stroke)]/60">
        {canClear && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full rounded-xl py-2 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: 'rgba(255,99,99,0.08)', border: '1px solid rgba(255,99,99,0.22)', color: '#ff7b7b' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Очистить правила дня
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAdd(!showAdd)}
          className="w-full rounded-xl border border-dashed py-2 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          style={{
            borderColor: showAdd ? 'var(--focus)' : 'var(--stroke)',
            color: showAdd ? 'var(--focus)' : 'var(--text-faint)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {showAdd ? 'Свернуть' : 'Добавить блок в конец'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed left-1/2 top-1/2 z-[61] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-9 rounded-full grid place-items-center" style={{ background: 'rgba(255,99,99,0.12)', border: '1px solid rgba(255,99,99,0.25)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[var(--text)]">Очистить правила дня?</div>
                  <div className="text-[12px] leading-[1.5] text-[var(--text-dim)] mt-1">
                    Будут удалены все блоки текущего дня <span className="font-semibold text-[var(--text)]">без шаблона</span>. Шаблоны не затронуты. Действие для этого числа.
                  </div>
                </div>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="shrink-0 size-7 grid place-items-center rounded-full text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--stroke)' }}>
                <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--stroke)' }}>
                  <span className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-[0.08em]">Удалятся · {rules.length} блоков · {fmtHM(ranges[ranges.length - 1]?.end ?? chainStart)} всего</span>
                  <span className="text-[11px] font-mono text-[var(--text-faint)]">{totalMin} мин</span>
                </div>
                <div className="max-h-[180px] overflow-y-auto p-1.5 flex flex-col gap-1">
                  {rules.map((r, i) => {
                    const rg = ranges[i]
                    return (
                      <div key={r.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}>
                        <span className="shrink-0 text-[10px] font-mono text-[var(--text-faint)] w-[6px]">{i + 1}</span>
                        <span className="flex-1 min-w-0 truncate text-[12px] font-medium text-[var(--text)]">{r.name}</span>
                        <span className="shrink-0 text-[10.5px] font-mono text-[var(--text-dim)]">
                          {fmtHM(rg.start)}–{fmtHM(rg.end)} · {r.minutes} мин
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-colors"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)', color: 'var(--text-dim)' }}
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    setShowClearConfirm(false)
                    onClearDayRules()
                  }}
                  className="rounded-xl px-4 py-2 text-[12.5px] font-bold transition-colors"
                  style={{ background: '#ff3b30', color: 'white', boxShadow: '0 4px 16px rgba(255,59,48,0.35)' }}
                >
                  Очистить
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
})
