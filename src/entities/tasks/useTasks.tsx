import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { GanttTask } from '../../shared/types'
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

const DEFAULT_TASKS: Task[] = [
  { id: '1', title: 'Send a summary to email.', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 21), progress: 0.35, assignees: ['JD', 'RK', 'ML'], startMinute: 9 * 60, endMinute: 18 * 60, tags: ["report","sales"], responsible: 'JD' },
  { id: '2', title: 'Is status "MQL"?', startDate: new Date(2026, 7, 5), endDate: new Date(2026, 8, 3), progress: 0.70, assignees: ['AN'], startMinute: 10 * 60, endMinute: 16 * 60, tags: ["sales"] },
  { id: '3', title: 'Design system audit', startDate: new Date(2026, 7, 14), endDate: new Date(2026, 7, 28), progress: 0.90, assignees: ['SP', 'LJ'], startMinute: 8 * 60, endMinute: 17 * 60, tags: ["design","research"], responsible: 'SP' },
  { id: '4', title: 'API integration — phase 1', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 8, 7), progress: 0.15, assignees: ['MK', 'VR'], startMinute: 7 * 60, endMinute: 15 * 60, tags: ["backend","report"], responsible: 'MK' },
  { id: '5', title: 'User testing results review', startDate: new Date(2026, 7, 24), endDate: new Date(2026, 8, 14), progress: 0.45, assignees: ['JD', 'SP', 'AN', 'RK'], startMinute: 11 * 60, endMinute: 13 * 60, tags: ["research","design"] },
  { id: '6', title: 'Daily stand-up', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['JD', 'AN', 'MK', 'SP', 'VR'], startMinute: 9 * 60 + 30, endMinute: 9 * 60 + 45, tags: ["ritual"], responsible: 'JD' },
  { id: '7', title: 'Design review', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: ['SP', 'LJ'], startMinute: 11 * 60, endMinute: 12 * 60 + 30, tags: ["design"] },
  { id: '8', title: 'Lunch', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 13 * 60, endMinute: 14 * 60, tags: ["ritual"] },
  { id: '9', title: 'Sprint planning', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0, assignees: ['JD', 'AN', 'MK', 'SP', 'VR', 'RK', 'LJ'], startMinute: 15 * 60, endMinute: 16 * 60 + 30, tags: ["ritual","report"], responsible: 'MK' },
  { id: '10', title: 'Client demo prep', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.3, assignees: ['RK', 'MK'], startMinute: 15 * 60, endMinute: 18 * 60, tags: ["sales","design"] },
  { id: '11', title: 'Дочитать книгу', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.85, assignees: ['AN'], startMinute: 10 * 60, endMinute: 24 * 60, tags: ["research"] },
  { id: '12', title: 'Планирование недели', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: ['JD', 'AN', 'MK'], startMinute: 9 * 60, endMinute: 9 * 60 + 30, tags: ["ritual","report"], responsible: 'JD' },
  { id: '13', title: 'Тренировка', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: [], startMinute: 18 * 60, endMinute: 19 * 60, tags: ["ritual"] },
  { id: '14', title: 'Ночная пробежка', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['MK'], startMinute: 0, endMinute: 2 * 60, tags: ["ritual"] },
  { id: '15', title: 'Проверить почту', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['AN'], startMinute: 9 * 60, endMinute: 9 * 60 + 5, tags: ["report","sales"] },
  { id: '16', title: 'Ответить в чате', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['RK'], startMinute: 9 * 60 + 6, endMinute: 9 * 60 + 7, tags: ["sales","report"] },
  { id: '17', title: 'Созвон с командой', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['JD', 'AN', 'MK', 'SP'], startMinute: 9 * 60 + 10, endMinute: 9 * 60 + 40, tags: ["ritual"], responsible: 'AN' },
  { id: '18', title: 'Разбор бэклога', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.5, assignees: ['MK', 'VR'], startMinute: 9 * 60 + 45, endMinute: 10 * 60 + 15, tags: ["backend","ritual"] },
  { id: '19', title: 'Ретроспектива', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.8, assignees: ['JD', 'AN', 'MK', 'SP', 'VR'], startMinute: 10 * 60 + 20, endMinute: 10 * 60 + 50, tags: ["ritual","report","backend"] },
  { id: '20', title: 'Код-ревью пулл-реквеста', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.9, assignees: ['VR'], startMinute: 11 * 60, endMinute: 11 * 60 + 20, tags: ["backend","design"] },
  { id: '21', title: 'Короткая медитация', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 12 * 60 + 35, endMinute: 12 * 60 + 40, tags: ["ritual"] },
  { id: '22', title: 'Ответить клиентам', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: ['RK', 'ML'], startMinute: 14 * 60 + 15, endMinute: 14 * 60 + 30, tags: ["sales","report"] },
  { id: '23', title: 'Правки макета', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.4, assignees: ['SP', 'LJ'], startMinute: 14 * 60 + 40, endMinute: 15 * 60 + 10, tags: ["design","backend"] },
  { id: '24', title: 'Проверка метрик', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.7, assignees: ['AN', 'JD'], startMinute: 16 * 60 + 35, endMinute: 16 * 60 + 55, tags: ["research","sales"] },
  { id: '25', title: 'Чтение статей', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.2, assignees: [], startMinute: 19 * 60, endMinute: 20 * 60, tags: ["research"] },
  { id: '26', title: 'Утренний забег', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 1, assignees: ['MK'], startMinute: 7 * 60, endMinute: 8 * 60, tags: ["ritual","research"] },
  { id: '27', title: 'Подготовка к встрече', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.5, assignees: ['RK'], startMinute: 14 * 60, endMinute: 14 * 60 + 30, tags: ["sales","report"] },
  { id: '28', title: 'Анализ результатов теста', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.1, assignees: ['JD', 'AN'], startMinute: 11 * 60, endMinute: 12 * 60 + 30, tags: ["research","backend"] },
  { id: '29', title: 'Вечерний созвон', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.7, assignees: ['JD', 'AN', 'MK'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 30, tags: ["ritual","report"], responsible: 'JD' },
  { id: '30', title: 'Итоги дня', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.9, assignees: ['AN'], startMinute: 20 * 60 + 40, endMinute: 21 * 60 + 10, tags: ["report","ritual"] },
  { id: '31', title: 'Чек почты перед сном', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 20 * 60 + 45, endMinute: 20 * 60 + 55, tags: ["report"] },
  { id: '32', title: 'Дайджест комьюнити', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.4, assignees: [], startMinute: 21 * 60 + 40, endMinute: 22 * 60 + 15, tags: ["research","sales"] },
  { id: '33', title: 'Чтение главы книги', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.5, assignees: [], startMinute: 21 * 60 + 45, endMinute: 22 * 60 + 30, tags: ["research","ritual"] },
  { id: '34', title: 'Слушаю подкаст', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: [], startMinute: 22 * 60, endMinute: 22 * 60 + 50, tags: ["research"] },
  { id: '35', title: 'Короткая медитация', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 22 * 60 + 55, endMinute: 23 * 60 + 5, tags: ["ritual"] },
  { id: '36', title: 'План на завтра', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.3, assignees: ['JD'], startMinute: 23 * 60, endMinute: 23 * 60 + 30, tags: ["ritual","report"], responsible: 'JD' },
  { id: '37', title: 'Спокойная музыка', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.8, assignees: [], startMinute: 23 * 60 + 30, endMinute: 23 * 60 + 45, tags: ["ritual"] },
  { id: '38', title: 'Последний чай', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 23 * 60 + 50, endMinute: 23 * 60 + 55, tags: ["ritual"] },
  { id: '39', title: 'Совещание по продукту', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.5, assignees: ['MK', 'VR'], startMinute: 17 * 60 + 30, endMinute: 18 * 60 + 30, tags: ["backend","sales","report"], responsible: 'MK' },
  { id: '40', title: 'Тренировка', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 1, assignees: ['MK'], startMinute: 19 * 60, endMinute: 20 * 60, tags: ["ritual","research"] },
  { id: '41', title: 'Ужин с командой', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.7, assignees: ['JD', 'SP', 'VR'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 30, tags: ["ritual"] },
  { id: '42', title: 'Встреча с ментором', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.4, assignees: ['AN'], startMinute: 20 * 60 + 45, endMinute: 21 * 60 + 15, tags: ["report","research"], responsible: 'AN' },
  { id: '43', title: 'Разбор кода', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.6, assignees: ['VR'], startMinute: 22 * 60, endMinute: 23 * 60, tags: ["backend"] },
  { id: '44', title: 'Чтение документации', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.3, assignees: [], startMinute: 23 * 60, endMinute: 23 * 60 + 30, tags: ["backend","research"] },
  { id: '45', title: 'Итоги дня', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.8, assignees: ['AN'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 15, tags: ["report","ritual"] },
  { id: '46', title: 'Лёгкая прогулка', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: ['MK'], startMinute: 20 * 60 + 45, endMinute: 21 * 60 + 30, tags: ["ritual"] },
  { id: '47', title: 'Чтение', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.4, assignees: [], startMinute: 21 * 60 + 45, endMinute: 22 * 60 + 30, tags: ["research","ritual"] },
  { id: '48', title: 'Подготовка ко сну', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.9, assignees: [], startMinute: 22 * 60, endMinute: 23 * 60, tags: ["ritual"] },
  { id: '49', title: 'Внедрение фичи', startDate: new Date(2026, 7, 15), endDate: new Date(2026, 8, 5), progress: 0.55, assignees: ['MK', 'VR'], startMinute: 9 * 60, endMinute: 18 * 60, tags: ["backend","sales"], responsible: 'VR' },
  { id: '50', title: 'Подготовка релиза', startDate: new Date(2026, 7, 18), endDate: new Date(2026, 7, 30), progress: 0.4, assignees: ['JD', 'AN', 'MK'], startMinute: 10 * 60, endMinute: 19 * 60, tags: ["report","backend","design"], responsible: 'AN' },
  { id: '51', title: 'Квартальный отчёт', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 25), progress: 0.65, assignees: ['AN', 'JD'], startMinute: 8 * 60, endMinute: 17 * 60, tags: ["report","sales"] },
  { id: '52', title: 'Миграция базы данных', startDate: new Date(2026, 7, 19), endDate: new Date(2026, 7, 27), progress: 0.3, assignees: ['VR', 'MK'], startMinute: 7 * 60, endMinute: 16 * 60, tags: ["backend","research"] },
  { id: '53', title: 'Опрос пользователей', startDate: new Date(2026, 7, 10), endDate: new Date(2026, 8, 3), progress: 0.5, assignees: ['SP', 'AN'], startMinute: 11 * 60, endMinute: 14 * 60, tags: ["research","design"] },
  { id: '54', title: 'Документация API', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 8, 4), progress: 0.75, assignees: ['VR'], startMinute: 13 * 60, endMinute: 18 * 60, tags: ["backend","research","report"], responsible: 'VR' },
]

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
  return DEFAULT_TASKS
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const tauri = useMemo(() => isTauri(), [])

  const [tasks, setTasks] = useState<Task[]>(() => (tauri ? [] : loadLocal()))

  const [extraProjects, setExtraProjects] = useState<Record<string, Project>>(() => {
    try {
      const raw = localStorage.getItem(EXTRA_PROJECTS_KEY)
      if (raw) return JSON.parse(raw) as Record<string, Project>
    } catch {
      /* ignore */
    }
    return {}
  })

  useEffect(() => {
    if (tauri) {
      void apiListTasks()
        .then((views) => setTasks(views.map(toTask)))
        .catch((e) => console.error('load tasks failed:', e))
      return
    }
    try {
      localStorage.setItem(TASKS_KEY, serialize(tasks))
    } catch {
      /* ignore */
    }
  }, [tauri, tasks])

  useEffect(() => {
    try {
      localStorage.setItem(EXTRA_PROJECTS_KEY, JSON.stringify(extraProjects))
    } catch {
      /* ignore */
    }
  }, [extraProjects])

  const addTask = useCallback(
    async (input: TaskInput): Promise<Task> => {
      if (tauri) {
        const view = await apiCreateTask(toCreateInput(input))
        const task = toTask(view)
        setTasks((prev) => [task, ...prev])
        return task
      }
      const task: Task = { ...input, id: `t-${Date.now()}`, progress: input.progress ?? 0 }
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
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
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
      setTasks((prev) => prev.filter((t) => t.id !== id))
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
    () => ({ tasks, addTask, updateTask, deleteTask, duplicateTask, extraProjects, projects, addProject }),
    [tasks, addTask, updateTask, deleteTask, duplicateTask, extraProjects, projects, addProject],
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used within TasksProvider')
  return ctx
}