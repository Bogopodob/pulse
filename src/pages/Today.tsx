import { AnimatePresence } from 'framer-motion'
import { useRhythm } from '../entities/rhythm/useRhythm'
import { ACCENTS } from '../entities/rhythm/activities'
import type { Rule } from '../entities/rhythm/activities'
import type { DayTemplate } from '../entities/templates/useTemplates'
import { NextUp } from '../widgets/NextUp'
import { Timeline } from '../widgets/Timeline'
import { TodayTasks } from '../widgets/TodayTasks'
import { RuleChips } from '../features/add-rule'
import { Toast } from '../widgets/Toast'

export function Today({
  title,
  desc,
  rules,
  chainStart,
  onRulesChange,
  clockStr,
  templates,
  activeTemplateId,
  isOverridden,
  overrides,
  onSelectTemplate,
  onAssignWeekday,
  onSetDateOverride,
  onOpenTemplates,
}: {
  title: string
  desc: string
  rules: Rule[]
  chainStart: number
  onRulesChange: (rules: Rule[]) => void
  clockStr: string
  templates: DayTemplate[]
  activeTemplateId: string | null
  isOverridden: boolean
  overrides: Record<string, string | null>
  onSelectTemplate: (templateId: string | null | 'none') => void
  onAssignWeekday: (dayNum: number, templateId: string | null) => void
  onSetDateOverride: (dateKey: string, value: string | null | undefined) => void
  onOpenTemplates: () => void
}) {
  const rhythm = useRhythm(rules, chainStart)
  const todayStatus = (() => {
    const a = ACCENTS[rhythm.cur.color as keyof typeof ACCENTS] ?? ACCENTS.blue
    if (rhythm.cur.type === 'off')
      return { label: 'Вне графика', color: 'var(--text-faint)', bg: 'var(--surface-2)', border: 'var(--stroke)' }
    return { label: rhythm.cur.label, color: a.color, bg: a.bg, border: a.border }
  })()

  return (
    <>
      <div className="relative flex items-end justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-[24px] font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="text-[13px] text-[var(--text-dim)] mt-1">{desc}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full"
            style={{ background: todayStatus.bg, border: `1px solid ${todayStatus.border}`, color: todayStatus.color }}
          >
            <span
              className="size-[6px] rounded-full"
              style={{ background: todayStatus.color, boxShadow: `0 0 7px ${todayStatus.color}` }}
            />
            {todayStatus.label}
          </div>
          <div className="text-[12px] text-[var(--text-dim)] bg-[var(--surface)] border border-[var(--stroke)] px-3 py-1.5 rounded-full tabular-nums">
            {clockStr}
          </div>
        </div>
      </div>
      <div className="relative grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5 items-stretch mt-5">
        <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none" aria-hidden="true">
          <div className="aurora-blob a1" />
          <div className="aurora-blob a2" />
        </div>
        <div className="relative z-[1] min-w-0 order-1"><NextUp rhythm={rhythm} /></div>
        <div className="relative z-[1] min-w-0 order-2">
          <Timeline
            segments={rhythm.segments}
            nowMinutes={rhythm.nowMinutes}
            cur={rhythm.cur}
          />
        </div>
        <div className="relative z-[1] min-w-0 order-3"><TodayTasks /></div>
        <div className="relative z-[1] min-w-0 order-4">
          <RuleChips
            rules={rules}
            chainStart={chainStart}
            onChange={onRulesChange}
            templates={templates}
            activeTemplateId={activeTemplateId}
            isOverridden={isOverridden}
            overrides={overrides}
            onSelectTemplate={onSelectTemplate}
            onAssignWeekday={onAssignWeekday}
            onSetDateOverride={onSetDateOverride}
            onOpenTemplates={onOpenTemplates}
          />
        </div>
      </div>
      <AnimatePresence>
        {rhythm.toast && <Toast title={rhythm.toast.title} text={rhythm.toast.text} />}
      </AnimatePresence>
    </>
  )
}