import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Rule } from '../rhythm/activities'
import type { TimeFormat } from '../../shared/lib/date'
import {
  apiCreateTemplate,
  apiDeleteTemplate,
  apiDuplicateTemplate,
  apiListTemplates,
  apiUpdateTemplate,
  isTauri,
  toCreateInput,
  toTemplate,
  toUpdateInput,
} from './api'

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
  /** В Tauri список грузится из БД — пока false список может быть пуст. */
  loading: boolean
  activeTemplate: DayTemplate | null
  isOverridden: boolean
  selectForToday: (templateId: string | null) => void
  createTemplate: (tpl: Omit<DayTemplate, 'id'>) => Promise<DayTemplate>
  updateTemplate: (id: string, patch: Partial<DayTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  duplicateTemplate: (id: string) => Promise<DayTemplate | null>
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const tauri = useMemo(() => isTauri(), [])
  const [templates, setTemplates] = useState<DayTemplate[]>(() => (tauri ? [] : loadTemplates()))
  const [loading, setLoading] = useState(false)
  const [override, setOverride] = useState<DayOverride | null>(loadOverride)

  useEffect(() => {
    if (!tauri) return
    let cancelled = false
    setLoading(true)
    void apiListTemplates()
      .then((views) => {
        if (!cancelled) setTemplates(views.map(toTemplate))
      })
      .catch((e) => console.error('load templates failed:', e))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tauri])

  useEffect(() => {
    if (tauri) return
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
    } catch {
      /* ignore */
    }
  }, [tauri, templates])

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

  const createTemplate = useCallback(
    async (tpl: Omit<DayTemplate, 'id'>) => {
      if (tauri) {
        const view = await apiCreateTemplate(toCreateInput(tpl))
        const created = toTemplate(view)
        setTemplates((ts) => [...ts, created])
        return created
      }
      const created: DayTemplate = { ...tpl, id: crypto.randomUUID() }
      setTemplates((ts) => [...ts, created])
      return created
    },
    [tauri],
  )

  const updateTemplate = useCallback(
    async (id: string, patch: Partial<DayTemplate>) => {
      setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)))
      if (!tauri) return
      try {
        await apiUpdateTemplate(id, toUpdateInput(patch))
      } catch (e) {
        console.error('update template failed:', e)
      }
    },
    [tauri],
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      if (tauri) {
        await apiDeleteTemplate(id)
      }
      setTemplates((ts) => ts.filter((t) => t.id !== id))
      setOverride((o) => (o && o.templateId === id ? null : o))
    },
    [tauri],
  )

  const duplicateTemplate = useCallback(
    async (id: string) => {
      if (tauri) {
        const view = await apiDuplicateTemplate(id)
        const copy = toTemplate(view)
        setTemplates((ts) => [...ts, copy])
        return copy
      }
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
    [tauri, templates],
  )

  return (
    <TemplatesContext.Provider
      value={{
        templates,
        loading,
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

export function useTemplatesActiveCheck(templateId: string): boolean {
  const { activeTemplate } = useTemplates()
  return activeTemplate?.id === templateId
}