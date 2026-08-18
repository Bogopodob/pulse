import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Rule } from '../rhythm/activities'
import type { TimeFormat } from '../../shared/lib/date'

export interface DayTemplate {
  id: string
  name: string
  days: number[]
  rules: Rule[]
  inheritSettings: boolean
  chainStartMin?: number
  dailyGoalMin?: number
  timeFormat?: TimeFormat
  timezone?: string
}

interface DayOverride {
  date: string
  templateId: string
}

const TEMPLATES_KEY = 'pulse-templates'
const OVERRIDE_KEY = 'pulse-template-day-override'

function todayDayNum(): number {
  return ((new Date().getDay() + 6) % 7) + 1
}

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadTemplates(): DayTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (t): t is DayTemplate =>
        t &&
        typeof t.id === 'string' &&
        typeof t.name === 'string' &&
        Array.isArray(t.days) &&
        Array.isArray(t.rules),
    )
  } catch {
    return []
  }
}

function loadOverride(): DayOverride | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DayOverride
    if (typeof parsed.date !== 'string' || typeof parsed.templateId !== 'string') return null
    return parsed.date === todayKey() ? parsed : null
  } catch {
    return null
  }
}

interface TemplatesContextValue {
  templates: DayTemplate[]
  activeTemplate: DayTemplate | null
  isOverridden: boolean
  selectForToday: (templateId: string | null) => void
  createTemplate: (tpl: Omit<DayTemplate, 'id'>) => DayTemplate
  updateTemplate: (id: string, patch: Partial<DayTemplate>) => void
  deleteTemplate: (id: string) => void
  duplicateTemplate: (id: string) => DayTemplate | null
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<DayTemplate[]>(loadTemplates)
  const [override, setOverride] = useState<DayOverride | null>(loadOverride)

  useEffect(() => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    if (override) {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(override))
    } else {
      localStorage.removeItem(OVERRIDE_KEY)
    }
  }, [override])

  const activeTemplate = override
    ? templates.find((t) => t.id === override.templateId) ?? null
    : (templates.find((t) => t.days.includes(todayDayNum())) ?? null)

  const selectForToday = useCallback((templateId: string | null) => {
    if (templateId === null) {
      setOverride(null)
      return
    }
    setOverride({ date: todayKey(), templateId })
  }, [])

  const createTemplate = useCallback((tpl: Omit<DayTemplate, 'id'>) => {
    const created: DayTemplate = { ...tpl, id: crypto.randomUUID() }
    setTemplates((ts) => [...ts, created])
    return created
  }, [])

  const updateTemplate = useCallback((id: string, patch: Partial<DayTemplate>) => {
    setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((ts) => ts.filter((t) => t.id !== id))
    setOverride((o) => (o && o.templateId === id ? null : o))
  }, [])

  const duplicateTemplate = useCallback(
    (id: string) => {
      const src = templates.find((t) => t.id === id)
      if (!src) return null
      const copy: DayTemplate = {
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} · копия`,
        rules: src.rules.map((r) => ({ ...r, id: crypto.randomUUID() })),
      }
      setTemplates((ts) => [...ts, copy])
      return copy
    },
    [templates],
  )

  return (
    <TemplatesContext.Provider
      value={{
        templates,
        activeTemplate,
        isOverridden: !!override,
        selectForToday,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        duplicateTemplate,
      }}
    >
      {children}
    </TemplatesContext.Provider>
  )
}

export function useTemplates(): TemplatesContextValue {
  const ctx = useContext(TemplatesContext)
  if (!ctx) throw new Error('useTemplates must be used within TemplatesProvider')
  return ctx
}