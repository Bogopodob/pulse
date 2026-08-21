import { useMemo, useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { WEEKDAYS, useTemplates } from '../entities/templates/useTemplates'
import type { DayTemplate } from '../entities/templates/useTemplates'
import { useSettings } from '../shared/hooks/useSettings'
import { DAY_LIMIT } from '../entities/rhythm/useRhythm'
import type { Rule, RuleColor } from '../entities/rhythm/activities'
import { RuleRow } from '../features/add-rule/ui/RuleRow'
import type { EditState } from '../features/add-rule/ui/RuleRow'
import { BlockCreator } from '../features/add-rule/ui/BlockCreator'
import { TIMEZONES } from '../shared/lib/timezones'
import { tzOffsetLabel, type TimeFormat } from '../shared/lib/date'
import { Time } from '@internationalized/date'
import { Select } from '@heroui/react/select'
import { ListBox } from '@heroui/react/list-box'
import { ListBoxItem } from '@heroui/react/list-box-item'
import { TimeField } from '@heroui/react/time-field'

function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} мин`
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

function ruleRanges(rules: Rule[], chainStart: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  let t = chainStart
  for (const r of rules) {
    out.push({ start: t, end: t + r.minutes })
    t += r.minutes
  }
  return out
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex gap-1 p-[3px] rounded-[10px] border border-[var(--surface-3)] bg-[var(--surface-2)]/70">
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className="px-3 py-[6px] rounded-[7px] text-[12px] font-medium cursor-pointer transition-all"
            style={
              active
                ? { background: 'var(--surface-3)', color: 'var(--text)', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }
                : { background: 'transparent', color: 'var(--text-dim)' }
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className="relative w-[40px] h-[24px] rounded-full cursor-pointer transition-colors duration-200 shrink-0"
      style={{ background: on ? 'rgba(76,141,255,0.9)' : 'var(--surface-3)', boxShadow: on ? '0 0 12px rgba(76,141,255,0.45)' : 'none' }}
    >
      <span
        className="absolute top-[3px] size-[18px] rounded-full transition-all duration-200"
        style={{ left: on ? 19 : 3, background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
      />
    </button>
  )
}

function FieldRow({ title, hint, control }: { title: string; hint: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5" style={{ borderBottom: '1px solid var(--stroke)' }}>
      <div>
        <div className="text-[13px] font-medium text-[var(--text)]">{title}</div>
        <div className="text-[11.5px] text-[var(--text-faint)] mt-0.5">{hint}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function BlocksEditor({
  tpl,
  chainStart,
  update,
}: {
  tpl: DayTemplate
  chainStart: number
  update: (patch: Partial<DayTemplate>) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [presetType, setPresetType] = useState<string | null>(null)
  const [presetMin, setPresetMin] = useState(0)
  const [customMin, setCustomMin] = useState(60)
  const [custom, setCustom] = useState({ name: '', icon: 'star', color: 'blue' as RuleColor })
  const ranges = ruleRanges(tpl.rules, chainStart)

  /* Лимит суток: сумма блоков шаблона не может превысить 24 часа от начала цепочки. */
  const budget = Math.max(0, DAY_LIMIT - chainStart)
  const totalMin = tpl.rules.reduce((s, r) => s + r.minutes, 0)

  const setRules = (rules: Rule[]) => update({ rules })
  const updRule = (id: string, patch: Partial<Rule>) => {
    if (patch.minutes != null) {
      const others = tpl.rules.filter((x) => x.id !== id).reduce((s, x) => s + x.minutes, 0)
      patch = { ...patch, minutes: Math.max(1, Math.min(patch.minutes, budget - others)) }
    }
    setRules(tpl.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const delRule = (id: string) => setRules(tpl.rules.filter((r) => r.id !== id))
  const addRule = (rule: Rule) => {
    const roomLeft = budget - totalMin
    if (roomLeft <= 0) return
    setRules([...tpl.rules, { ...rule, minutes: Math.max(1, Math.min(rule.minutes, roomLeft)) }])
  }

  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mt-4 mb-2">
        Блоки шаблона
      </div>
      <Reorder.Group
        axis="y"
        values={tpl.rules}
        onReorder={setRules}
        className="flex flex-col gap-1"
      >
        {tpl.rules.map((r, i) => (
          <RuleRow
            key={r.id}
            rule={r}
            range={ranges[i]}
            dragging={dragging}
            flash={false}
            maxMinutes={Math.max(1, budget - (totalMin - r.minutes))}
            onDragState={setDragging}
            edit={edit}
            setEdit={setEdit}
            onUpdate={updRule}
            onRemove={delRule}
          />
        ))}
      </Reorder.Group>
      {tpl.rules.length === 0 && (
        <div className="rounded-xl px-3 py-4 text-center text-[12px] text-[var(--text-faint)]" style={{ background: 'var(--surface-2)', border: '1px dashed var(--stroke)' }}>
          Пока пусто — добавьте блоки для этого шаблона
        </div>
      )}
      <div className="mt-1.5">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="w-full rounded-xl border border-dashed py-2 text-[11.5px] font-semibold transition-colors"
          style={{ borderColor: showAdd ? 'var(--focus)' : 'var(--stroke)', color: showAdd ? 'var(--focus)' : 'var(--text-faint)' }}
        >
          {showAdd ? 'Свернуть' : '+ Добавить блок'}
        </button>
        <AnimatePresence initial={false}>
          {showAdd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden pt-1.5"
            >
              <BlockCreator
                rules={tpl.rules}
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
}

function TemplateEditor({
  tpl,
  onDelete,
}: {
  tpl: DayTemplate
  onDelete: () => void
}) {
  const { updateTemplate } = useTemplates()
  const { chainStartMin, dailyGoalMin: settingsGoal, timeFormat: settingsTF, timezone: settingsTZ } = useSettings()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const update = (patch: Partial<DayTemplate>) => updateTemplate(tpl.id, patch)

  const chainStart = tpl.inheritSettings || tpl.chainStartMin == null ? chainStartMin : tpl.chainStartMin
  const isActiveToday = useTemplatesActiveCheck(tpl.id)

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <input
          value={tpl.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Название шаблона"
          className="flex-1 min-w-0 bg-transparent outline-none font-[var(--font-display)] text-[19px] font-semibold text-[var(--text)] placeholder:text-[var(--text-faint)] border-b border-transparent hover:border-[var(--surface-3)] focus:border-[rgba(76,141,255,0.4)] pb-1 transition-colors"
        />
        {isActiveToday && (
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold shrink-0"
            style={{ background: 'rgba(76,141,255,0.1)', border: '1px solid rgba(76,141,255,0.3)', color: 'var(--focus)' }}
          >
            <span className="size-[5px] rounded-full" style={{ background: 'var(--focus)', boxShadow: '0 0 6px var(--focus)' }} />
            Сегодня
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mt-4 mb-2">
          Дни недели
        </div>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((d, i) => {
            const day = i + 1
            const sel = tpl.days.includes(day)
            return (
              <button
                key={d}
                onClick={() => update({ days: sel ? tpl.days.filter((x) => x !== day) : [...tpl.days, day].sort((a, b) => a - b) })}
                className="w-10 rounded-lg py-2 text-[12px] font-semibold transition-all"
                style={
                  sel
                    ? { background: 'rgba(76,141,255,0.14)', border: '1px solid rgba(76,141,255,0.4)', color: 'var(--focus)', boxShadow: '0 0 12px rgba(76,141,255,0.15)' }
                    : { background: 'var(--surface-2)', border: '1px solid var(--surface-3)', color: 'var(--text-faint)' }
                }
                title={sel ? `Убрать ${d}` : `На ${d}`}
              >
                {d}
              </button>
            )
          })}
        </div>
      </div>

      <BlocksEditor tpl={tpl} chainStart={chainStart} update={update} />

      <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mt-5 mb-1">
        Настройки ритма
      </div>
      <div className="rounded-xl px-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-3)' }}>
        <div className="flex items-center justify-between gap-6 py-3.5" style={{ borderBottom: '1px solid var(--stroke)' }}>
          <div>
            <div className="text-[13px] font-medium text-[var(--text)]">Наследовать из приложения</div>
            <div className="text-[11.5px] text-[var(--text-faint)] mt-0.5">
              Цель фокуса, начало дня, формат времени и часовой пояс — из настроек
            </div>
          </div>
          <Switch on={tpl.inheritSettings} onChange={() => update({ inheritSettings: !tpl.inheritSettings })} />
        </div>

        <AnimatePresence initial={false}>
          {!tpl.inheritSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <FieldRow
                title="Цель фокуса"
                hint="Ориентир для статистики в этот день"
                control={
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => update({ dailyGoalMin: Math.max(180, (tpl.dailyGoalMin ?? settingsGoal) - 60) })}
                      className="btn-icon"
                      title="−1 час"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <div className="w-[80px] text-center font-[var(--font-display)] text-[14px] font-semibold tabular-nums" style={{ color: 'var(--focus)' }}>
                      {fmtDur(tpl.dailyGoalMin ?? settingsGoal)}
                    </div>
                    <button
                      onClick={() => update({ dailyGoalMin: Math.min(720, (tpl.dailyGoalMin ?? settingsGoal) + 60) })}
                      className="btn-icon"
                      title="+1 час"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                }
              />
              <FieldRow
                title="Начало дня"
                hint="Первый блок стартует в это время"
                control={
                  <TimeField.Root
                    value={new Time(Math.floor((tpl.chainStartMin ?? chainStartMin) / 60), Math.round((tpl.chainStartMin ?? chainStartMin) % 60))}
                    onChange={(t) => {
                      if (t) update({ chainStartMin: t.hour * 60 + t.minute })
                    }}
                    granularity="minute"
                    hourCycle={(tpl.timeFormat ?? settingsTF) === '12h' ? 12 : 24}
                  >
                    <TimeField.Group>
                      <TimeField.Input>
                        {(segment) => <TimeField.Segment segment={segment} />}
                      </TimeField.Input>
                    </TimeField.Group>
                  </TimeField.Root>
                }
              />
              <FieldRow
                title="Формат времени"
                hint="24 часа или 12 с AM/PM"
                control={
                  <Segmented
                    options={[
                      { key: '24h', label: '24 ч' },
                      { key: '12h', label: '12 ч' },
                    ]}
                    value={tpl.timeFormat ?? settingsTF}
                    onChange={(f) => update({ timeFormat: f as TimeFormat })}
                  />
                }
              />
              <FieldRow
                title="Часовой пояс"
                hint="Для отображения времени"
                control={
                  <Select.Root
                    selectedKey={tpl.timezone ?? settingsTZ}
                    onSelectionChange={(k) => update({ timezone: String(k) })}
                    className="w-[280px]"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </Select.Indicator>
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox items={TIMEZONES.map((tz) => ({ tz }))} className="max-h-[260px] overflow-y-auto">
                        {({ tz }) => (
                          <ListBoxItem key={tz} id={tz} textValue={tz}>
                            {tz.replace(/_/g, ' ')} · {tzOffsetLabel(tz)}
                          </ListBoxItem>
                        )}
                      </ListBox>
                    </Select.Popover>
                  </Select.Root>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex pt-5 pb-1">
        <button
          onClick={() => {
            if (confirmDelete) {
              onDelete()
            } else {
              setConfirmDelete(true)
              setTimeout(() => setConfirmDelete(false), 3000)
            }
          }}
          className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-medium cursor-pointer transition-all"
          style={
            confirmDelete
              ? { background: 'rgba(255,99,99,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,99,99,0.4)' }
              : { background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--surface-3)' }
          }
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          {confirmDelete ? 'Точно удалить?' : 'Удалить шаблон'}
        </button>
      </div>
    </div>
  )
}

function useTemplatesActiveCheck(templateId: string): boolean {
  const { activeTemplate } = useTemplates()
  return activeTemplate?.id === templateId
}

export function Templates({ onBack }: { onBack: () => void }) {
  const { templates, loading, createTemplate, deleteTemplate, duplicateTemplate } = useTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null)

  const selected = templates.find((t) => t.id === selectedId) ?? null

  const create = async () => {
    const tpl = await createTemplate({
      name: 'Новый шаблон',
      days: [],
      rules: [],
      inheritSettings: true,
    })
    setSelectedId(tpl.id)
  }

  const list = useMemo(() => [...templates].sort((a, b) => a.days.length - b.days.length || a.name.localeCompare(b.name)), [templates])

  return (
    <div className="w-full max-w-[1400px] mx-auto flex gap-12">
      <nav className="w-[240px] shrink-0 flex flex-col pt-1">
        <div className="flex items-center gap-2 px-2 pb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Сегодня
          </button>
        </div>
        <div className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold">
          Шаблоны · {templates.length}
        </div>
        <div className="flex flex-col gap-[2px] flex-1 min-h-0 overflow-y-auto pr-1">
          {list.map((t) => (
            <div
              key={t.id}
              className="group relative rounded-lg transition-colors"
              style={{
                background: selectedId === t.id ? 'rgba(76,141,255,0.12)' : 'transparent',
                border: `1px solid ${selectedId === t.id ? 'rgba(76,141,255,0.25)' : 'transparent'}`,
              }}
            >
              <button
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left px-2.5 py-2 pr-8 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 min-w-0 truncate text-[12.5px] font-medium" style={{ color: selectedId === t.id ? 'var(--focus)' : 'var(--text)' }}>
                    {t.name}
                  </span>
                  {t.days.length === 0 && <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wide">вручную</span>}
                </div>
                <div className="flex gap-[3px] mt-1">
                  {WEEKDAYS.map((d, i) => (
                    <span
                      key={d}
                      className="w-[14px] text-center text-[8px] font-semibold rounded-[3px] py-[1px]"
                      style={
                        t.days.includes(i + 1)
                          ? { background: 'var(--surface-3)', color: 'var(--text-dim)' }
                          : { color: 'var(--text-faint)' }
                      }
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-[var(--text-faint)] mt-1 font-mono">{t.rules.length} блоков</div>
              </button>
              <button
                onClick={async () => {
                  const copy = await duplicateTemplate(t.id)
                  if (copy) setSelectedId(copy.id)
                }}
                title="Дублировать шаблон"
                className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-md text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-opacity cursor-pointer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
              </button>
            </div>
          ))}
          {loading && (
            <div className="rounded-xl px-3 py-5 text-center text-[12px] text-[var(--text-faint)]" style={{ background: 'var(--surface-2)', border: '1px dashed var(--stroke)' }}>
              Загрузка шаблонов…
            </div>
          )}
          {!loading && templates.length === 0 && (
            <div className="rounded-xl px-3 py-5 text-center text-[12px] text-[var(--text-faint)]" style={{ background: 'var(--surface-2)', border: '1px dashed var(--stroke)' }}>
              Пока нет ни одного шаблона
            </div>
          )}
        </div>
        <div className="pt-2 flex flex-col gap-1">
          <button
            onClick={create}
            className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)', color: 'var(--text-dim)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Новый шаблон
          </button>
        </div>
      </nav>

      <section className="flex-1 min-w-0 border-l border-[var(--stroke)] pl-12 pb-10">
        {selected ? (
          <TemplateEditor tpl={selected} onDelete={() => { deleteTemplate(selected.id); setSelectedId(null) }} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 pt-24 text-center">
            <div
              className="grid size-14 place-items-center rounded-2xl"
              style={{ background: 'rgba(76,141,255,0.1)', border: '1px solid rgba(76,141,255,0.3)', boxShadow: '0 0 20px rgba(76,141,255,0.15)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--focus)" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M3 9h18M8 2v4M16 2v4M8 13h3M8 17h6" />
              </svg>
            </div>
            <div className="text-[15px] font-semibold font-[var(--font-display)] text-[var(--text)]">Создайте шаблон</div>
            <div className="text-[12.5px] text-[var(--text-faint)] max-w-[340px]">
              Один график на будни, другой на выходные — шаблоны подбираются автоматически по дню недели.
            </div>
            <button
              onClick={create}
              className="mt-2 rounded-xl px-5 py-2.5 text-[12.5px] font-bold flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--focus-2), var(--focus))', color: '#0b0e13', boxShadow: '0 4px 16px rgba(76,141,255,0.35)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Создать шаблон
            </button>
          </div>
        )}
      </section>
    </div>
  )
}