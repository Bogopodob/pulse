//! Тонкий слой доступа к Rust-бэкенду (Tauri commands).
//! Даты на границе — unix-миллисекунды (UTC), как в Rust DTO.

import { invoke } from '@tauri-apps/api/core'
import type { Task } from './useTasks'

export interface TaskView {
  id: string
  title: string
  start_date: number
  end_date: number
  start_minute: number
  end_minute: number
  progress: number
  responsible_id: string | null
  assignees: string[]
  tags: string[]
  created_at: number
  updated_at: number
}

export interface CreateTaskInput {
  title: string
  start_date: number
  end_date: number
  start_minute: number
  end_minute: number
  responsible_id?: string | null
  assignees: string[]
  tags: string[]
}

export interface UpdateTaskInput {
  title?: string
  start_date?: number
  end_date?: number
  start_minute?: number
  end_minute?: number
  progress?: number
  responsible_id?: string | null
  assignees?: string[]
  tags?: string[]
}

export interface ListTasksFilter {
  start_after?: number
  start_before?: number
  tags?: string[]
  assignees?: string[]
  updated_after?: number
}

/** Работаем ли внутри Tauri (webview) — иначе dev-режим в браузере. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function toTask(v: TaskView): Task {
  return {
    id: v.id,
    title: v.title,
    startDate: new Date(v.start_date),
    endDate: new Date(v.end_date),
    startMinute: v.start_minute,
    endMinute: v.end_minute,
    progress: v.progress,
    assignees: v.assignees,
    tags: v.tags,
    responsible: v.responsible_id ?? undefined,
  }
}

export function toCreateInput(t: Omit<Task, 'id' | 'progress'> & { progress?: number }): CreateTaskInput {
  return {
    title: t.title,
    start_date: t.startDate.getTime(),
    end_date: t.endDate.getTime(),
    start_minute: t.startMinute,
    end_minute: t.endMinute,
    responsible_id: t.responsible ?? null,
    assignees: t.assignees,
    tags: t.tags,
  }
}

export function toUpdateInput(patch: Partial<Task>): UpdateTaskInput {
  const input: UpdateTaskInput = {}
  if (patch.title !== undefined) input.title = patch.title
  if (patch.startDate !== undefined) input.start_date = patch.startDate.getTime()
  if (patch.endDate !== undefined) input.end_date = patch.endDate.getTime()
  if (patch.startMinute !== undefined) input.start_minute = patch.startMinute
  if (patch.endMinute !== undefined) input.end_minute = patch.endMinute
  if (patch.progress !== undefined) input.progress = patch.progress
  if (patch.responsible !== undefined) input.responsible_id = patch.responsible ?? null
  if (patch.assignees !== undefined) input.assignees = patch.assignees
  if (patch.tags !== undefined) input.tags = patch.tags
  return input
}

export async function apiCreateTask(input: CreateTaskInput): Promise<TaskView> {
  return invoke<TaskView>('create_task', { input })
}

export async function apiListTasks(filter?: ListTasksFilter): Promise<TaskView[]> {
  return invoke<TaskView[]>('list_tasks', { filter: filter ?? null })
}

export async function apiUpdateTask(id: string, input: UpdateTaskInput): Promise<TaskView> {
  return invoke<TaskView>('update_task', { id, input })
}

export async function apiDeleteTask(id: string): Promise<void> {
  return invoke<void>('delete_task', { id })
}

export async function apiDuplicateTask(id: string): Promise<TaskView> {
  return invoke<TaskView>('duplicate_task', { id })
}