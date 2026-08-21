import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GanttTask } from '../../shared/types'
import { markDataReady } from '../../shared/lib/boot'
import {
  apiCreateTask,
  apiDeleteTask,
  apiDuplicateTask,
  apiListTasks,
  apiUpdateTask,
  isTauri,
  toCreateInput,
  toTask,
  toUpdateInput,
} from './api'

export type Task = GanttTask & { tags: string[]; responsible?: string }

export type TaskInput = Omit<Task, 'id' | 'progress'> & { progress?: number }

export const TASKS_KEY = 'pulse-tasks'
export const EXTRA_PROJECTS_KEY = 'pulse-task-projects'

export type Project = { label: string; color: string }
export type ProjectKey = 'report' | 'sales' | 'design' | 'backend' | 'research' | 'ritual'

export const PROJECTS: Record<ProjectKey, Project> = {
  report: { label: 'Отчёт', color: '#4c8dff' },
  sales: { label: 'Продажи', color: '#ff9d5c' },
  design: { label: 'Дизайн', color: '#4fd4c4' },
  backend: { label: 'Бэкенд', color: '#ff6b8a' },
  research: { label: 'Исследования', color: '#a78bfa' },
  ritual: { label: 'Команда', color: '#ffd43b' },
}

type StoredTask = Omit<Task, 'startDate' | 'endDate'> & { startDate: string; endDate: string }

function serialize(tasks: Task[]): string {
  const stored: StoredTask[] = tasks.map((t) => ({
    ...t,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate.toISOString(),
  }))
  return JSON.stringify(stored)
}

function deserialize(raw: string): Task[] {
  const stored = JSON.parse(raw) as StoredTask[]
  return stored.map((t) => ({
    ...t,
    startDate: new Date(t.startDate),
    endDate: new Date(t.endDate),
  }))
}

interface TasksContextValue {
  tasks: Task[]
  /** Загрузить срез задач на конкретный день (границы дня конвертируются в фильтр запроса). */
  loadDay: (day: Date) => Promise<void>
  /** Загрузить задачи за диапазон [day-1 .. day+1] и объединить с уже загруженными (для растущего полотна). */
  loadAround: (day: Date) => Promise<void>
  addTask: (input: TaskInput) => Promise<Task>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  duplicateTask: (id: string) => Promise<void>
  extraProjects: Record<string, Project>
  projects: Record<string, Project>
  addProject: (key: string, project: Project) => void
}

const TasksContext = createContext<TasksContextValue | null>(null)

function loadLocal(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (raw) return deserialize(raw)
  } catch {
    /* ignore */
  }
  return []
}

/** Границы дня (unix ms) для фильтров: [начало дня, конец дня]. */
export function dayRange(day: Date): { start: number; end: number } {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  return { start, end: start + 86_400_000 - 1 }
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const tauri = useMemo(() => isTauri(), [])

  const [tasks, setTasks] = useState<Task[]>([])

  const [extraProjects, setExtraProjects] = useState<Record<string, Project>>(() => {
    try {
      const raw = localStorage.getItem(EXTRA_PROJECTS_KEY)
      if (raw) return JSON.parse(raw) as Record<string, Project>
    } catch {
      /* ignore */
    }
    return {}
  })

  /** Загрузка задач на конкретный день: в Tauri — SQL-фильтр по периоду, в браузере — фильтр localStorage. */
  const loadDay = useCallback(
    async (day: Date): Promise<void> => {
      const { start, end } = dayRange(day)
      if (tauri) {
        const views = await apiListTasks({ start_after: start, start_before: end })
        setTasks(views.map(toTask))
        return
      }
      const local = loadLocal()
      setTasks(local.filter((t) => t.startDate.getTime() <= end && t.endDate.getTime() >= start))
    },
    [tauri],
  )

  const loadAround = useCallback(
    async (day: Date): Promise<void> => {
      const from = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      from.setDate(from.getDate() - 1)
      const to = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      to.setDate(to.getDate() + 2)
      const start = from.getTime()
      const end = to.getTime() - 1
      const merge = (incoming: Task[]) =>
        setTasks((prev) => {
          const map = new Map(prev.map((t) => [t.id, t] as const))
          for (const t of incoming) map.set(t.id, t)
          return [...map.values()]
        })
      if (tauri) {
        const views = await apiListTasks({ start_after: start, start_before: end })
        merge(views.map(toTask))
        return
      }
      const local = loadLocal()
      merge(local.filter((t) => t.startDate.getTime() <= end && t.endDate.getTime() >= start))
    },
    [tauri],
  )

  useEffect(() => {
    try {
      localStorage.setItem(EXTRA_PROJECTS_KEY, JSON.stringify(extraProjects))
    } catch {
      /* ignore */
    }
  }, [extraProjects])

  /** Прогрев кэша на старте: грузим окно вокруг сегодня, чтобы вкладки открывались мгновенно. */
  useEffect(() => {
    let alive = true
    loadAround(new Date())
      .catch(() => {})
      .finally(() => {
        if (alive) markDataReady()
      })
    return () => {
      alive = false
    }
  }, [loadAround])

  /** Браузерный режим: хранилище — полный список, срез дня живёт только в стейте. */
  const persistLocal = (all: Task[]) => {
    try {
      localStorage.setItem(TASKS_KEY, serialize(all))
    } catch {
      /* ignore */
    }
  }

  const addTask = useCallback(
    async (input: TaskInput): Promise<Task> => {
      if (tauri) {
        const view = await apiCreateTask(toCreateInput(input))
        const task = toTask(view)
        setTasks((prev) => [task, ...prev])
        return task
      }
      const task: Task = { ...input, id: `t-${Date.now()}`, progress: input.progress ?? 0 }
      persistLocal([task, ...loadLocal()])
      setTasks((prev) => [task, ...prev])
      return task
    },
    [tauri],
  )

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      if (tauri) {
        const view = await apiUpdateTask(id, toUpdateInput(patch))
        const updated = toTask(view)
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
        return
      }
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
        persistLocal(loadLocal().map((t) => (t.id === id ? { ...t, ...patch } : t)))
        return next
      })
    },
    [tauri],
  )

  const deleteTask = useCallback(
    async (id: string) => {
      if (tauri) {
        await apiDeleteTask(id)
        setTasks((prev) => prev.filter((t) => t.id !== id))
        return
      }
      setTasks((prev) => {
        persistLocal(loadLocal().filter((t) => t.id !== id))
        return prev.filter((t) => t.id !== id)
      })
    },
    [tauri],
  )

  const duplicateTask = useCallback(
    async (id: string) => {
      if (tauri) {
        const view = await apiDuplicateTask(id)
        const copy = toTask(view)
        setTasks((prev) => [copy, ...prev])
        return
      }
      setTasks((prev) => {
        const src = prev.find((t) => t.id === id)
        if (!src) return prev
        const copy: Task = { ...src, id: `${src.id}-dup-${Date.now()}`, title: `${src.title} · копия` }
        persistLocal([copy, ...loadLocal()])
        return [copy, ...prev]
      })
    },
    [tauri],
  )

  const addProject = useCallback((key: string, project: Project) => {
    setExtraProjects((prev) => ({ ...prev, [key]: project }))
  }, [])

  const projects = useMemo(() => ({ ...PROJECTS, ...extraProjects }), [extraProjects])

  const value = useMemo(
    () => ({ tasks, loadDay, loadAround, addTask, updateTask, deleteTask, duplicateTask, extraProjects, projects, addProject }),
    [tasks, loadDay, loadAround, addTask, updateTask, deleteTask, duplicateTask, extraProjects, projects, addProject],
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used within TasksProvider')
  return ctx
}