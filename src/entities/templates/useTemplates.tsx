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
  /** null — на эту дату явно выбрано «Без шаблона». */
  templateId: string | null
}

/** Переопределения по датам: YYYY-MM-DD → templateId | null («без шаблона»). */
export type DateOverrides = Record<string, string | null>

const TEMPLATES_KEY = 'pulse-templates'
const OVERRIDE_KEY = 'pulse-template-day-override'

function todayDayNum(): number {
  return ((new Date().getDay() + 6) % 7) + 1
}

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Ключ даты YYYY-MM-DD в локальном времени. */
export function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayKey(): string {
  return dateKeyOf(new Date())
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

/** Загрузка переопределений: поддерживаем старый одиночный формат и чистим прошлое. */
function loadOverrides(): DateOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    const todayK = todayKey()
    const out: DateOverrides = {}
    if (parsed && typeof parsed === 'object' && 'date' in (parsed as object)) {
      const o = parsed as DayOverride
      if (o.date === todayK && (typeof o.templateId === 'string' || o.templateId === null)) {
        out[o.date] = o.templateId
      }
      return out
    }
    for (const [k, v] of Object.entries((parsed ?? {}) as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k >= todayK && (v === null || typeof v === 'string')) {
        out[k] = v as string | null
      }
    }
    return out
  } catch {
    return {}
  }
}

interface TemplatesContextValue {
  templates: DayTemplate[]
  /** Загрузка переопределений по датам (прошедшие даты отфильтрованы). */
  overrides: DateOverrides
  /** В Tauri список грузится из БД — пока false список может быть пуст. */
  loading: boolean
  activeTemplate: DayTemplate | null
  isOverridden: boolean
  selectForToday: (templateId: string | null | 'none') => void
  /** Переопределение на конкретную дату; undefined — убрать особый день. */
  setDayOverride: (dateKey: string, value: string | null | undefined) => void
  /** Закрепить день недели за шаблоном (null — «без шаблона»); у остальных шаблонов день снимается. */
  assignWeekday: (dayNum: number, templateId: string | null) => void
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
  const [overrides, setOverrides] = useState<DateOverrides>(loadOverrides)

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
    try {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides))
    } catch {
      /* ignore */
    }
  }, [overrides])

  /* Приоритет: особая дата (включая «Без шаблона»), иначе автоподбор по дню недели. */
  const todaysOverride = overrides[todayKey()]
  const activeTemplate = todaysOverride !== undefined
    ? todaysOverride
      ? templates.find((t) => t.id === todaysOverride) ?? null
      : null
    : (templates.find((t) => t.days.includes(todayDayNum())) ?? null)

  const selectForToday = useCallback((templateId: string | null | 'none') => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (templateId === null) delete next[todayKey()]
      else next[todayKey()] = templateId === 'none' ? null : templateId
      return next
    })
  }, [])

  const setDayOverride = useCallback((dateKey: string, value: string | null | undefined) => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[dateKey]
      else next[dateKey] = value
      return next
    })
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
      // Оптимистично обновляем, но при отказе БД (например, «день переполнен»)
      // откатываем состояние к предыдущему снимку.
      let snapshot: DayTemplate[] = []
      setTemplates((ts) => {
        snapshot = ts
        return ts.map((t) => (t.id === id ? { ...t, ...patch } : t))
      })
      if (!tauri) return
      try {
        await apiUpdateTemplate(id, toUpdateInput(patch))
      } catch (e) {
        console.error('update template failed:', e)
        setTemplates(snapshot)
        throw e
      }
    },
    [tauri],
  )

  /** Закрепить день за шаблоном: день снимается у прежнего шаблона, присваивается новому. */
  const assignWeekday = useCallback(
    (dayNum: number, templateId: string | null) => {
      for (const t of templates) {
        const has = t.days.includes(dayNum)
        const isTarget = t.id === templateId
        if (isTarget === has) continue
        const days = isTarget ? [...t.days, dayNum].sort((a, b) => a - b) : t.days.filter((d) => d !== dayNum)
        void updateTemplate(t.id, { days }).catch(() => {})
      }
    },
    [templates, updateTemplate],
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      if (tauri) {
        await apiDeleteTemplate(id)
      }
      setTemplates((ts) => ts.filter((t) => t.id !== id))
      setOverrides((o) => {
        const next: DateOverrides = {}
        let dirty = false
        for (const [k, v] of Object.entries(o)) {
          if (v === id) {
            dirty = true
            continue
          }
          next[k] = v
        }
        return dirty ? next : o
      })
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
        overrides,
        loading,
        activeTemplate,
        isOverridden: todaysOverride !== undefined,
        selectForToday,
        setDayOverride,
        assignWeekday,
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