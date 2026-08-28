export type Locale = 'ru' | 'en'

export type Theme = 'dark' | 'light'

export type ReminderStatus = 'active' | 'completed' | 'cancelled'

export interface Reminder {
  id: string
  title: string
  description: string
  duration: number
  createdAt: number
  status: ReminderStatus
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'overdue' | 'cancelled'

export interface GanttTask {
  id: string
  title: string
  startDate: Date
  endDate: Date
  progress: number
  status: TaskStatus
  assignees: string[]
  startMinute: number
  endMinute: number
}
