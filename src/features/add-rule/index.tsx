import { memo, useRef, useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { ACTIVITIES } from '../../entities/rhythm/activities'
import type { Rule, RuleColor } from '../../entities/rhythm/activities'
import { DAY_LIMIT } from '../../entities/rhythm/useRhythm'
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
  templates,
  activeTemplateId,
  isOverridden,
  overrides,
  onSelectTemplate,
  onAssignWeekday,
  onSetDateOverride,
  onOpenTemplates,
}: {
  rules: Rule[]
  chainStart: number
  onChange: (rules: Rule[]) => void
  templates: DayTemplate[]
  activeTemplateId: string | null
  isOverridden: boolean
  overrides: Record<string, string | null>
  onSelectTemplate: (templateId: string | null | 'none') => void
  onAssignWeekday: (dayNum: number, templateId: string | null) => void
  onSetDateOverride: (dateKey: string, value: string | null | undefined) => void
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
  const flashTimer = useRef<number | null>(null)
  const ranges = ruleRanges(rules, chainStart)

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

  return (
    <div className="card card-lift relative z-[1] flex flex-col max-h-[560px]">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
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
                <div className="fixed inset-0 z-[40]" onClick={() => setShowPicker(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-1.5 z-[41] rounded-xl p-1.5"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--stroke)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                    maxHeight: 'min(640px, calc(100vh - 120px))',
                    overflowY: 'auto',
                  }}
                >
                  <WeekPicker
                    templates={templates}
                    overrides={overrides}
                    activeTemplateId={activeTemplateId}
                    isOverridden={isOverridden}
                    onAssignWeekday={onAssignWeekday}
                    onSetDateOverride={onSetDateOverride}
                    onResetToday={() => onSelectTemplate(null)}
                    onCreate={() => {
                      setShowPicker(false)
                      onOpenTemplates()
                    }}
                  />
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

      <Reorder.Group
        axis="y"
        values={rules}
        onReorder={save}
        className="flex flex-col gap-1 px-3 flex-1 min-h-0 overflow-y-auto"
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

      <div className="px-3 pt-1.5 pb-3 shrink-0">
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
          Добавить блок в конец
        </motion.button>
        <AnimatePresence initial={false}>
          {showAdd && (
            <motion.div
              key="creator"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden pt-1.5"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})