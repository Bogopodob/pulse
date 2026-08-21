//! Тонкий слой доступа к Rust-бэкенду (Tauri commands) для шаблонов.

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '../tasks/api'
import type { DayTemplate } from './useTemplates'
import type { Rule, RuleColor } from '../rhythm/activities'

export interface RuleView {
  id: string
  type: string
  name: string
  minutes: number
  color: RuleColor
  icon: string
}

export interface TemplateView {
  id: string
  name: string
  days: number[]
  rules: RuleView[]
  inherit_settings: boolean
  chain_start_min: number | null
  daily_goal_min: number | null
  time_format: string | null
  timezone: string | null
  created_at: number
  updated_at: number
}

export interface CreateTemplateInput {
  name: string
  days: number[]
  rules: RuleView[]
  inherit_settings: boolean
  chain_start_min?: number | null
  daily_goal_min?: number | null
  time_format?: string | null
  timezone?: string | null
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>

function toRule(r: Rule): RuleView {
  return { id: r.id, type: r.type, name: r.name, minutes: r.minutes, color: r.color, icon: r.icon }
}

function toRules(rs: RuleView[]): Rule[] {
  return rs.map((r) => ({
    id: r.id,
    type: r.type,
    name: r.name,
    minutes: r.minutes,
    color: r.color,
    icon: r.icon,
  }))
}

export function toTemplate(v: TemplateView): DayTemplate {
  return {
    id: v.id,
    name: v.name,
    days: v.days,
    rules: toRules(v.rules),
    inheritSettings: v.inherit_settings,
    chainStartMin: v.chain_start_min ?? undefined,
    dailyGoalMin: v.daily_goal_min ?? undefined,
    timeFormat: (v.time_format ?? undefined) as DayTemplate['timeFormat'],
    timezone: v.timezone ?? undefined,
  }
}

export function toCreateInput(t: Omit<DayTemplate, 'id'>): CreateTemplateInput {
  return {
    name: t.name,
    days: t.days,
    rules: t.rules.map(toRule),
    inherit_settings: t.inheritSettings,
    chain_start_min: t.chainStartMin ?? null,
    daily_goal_min: t.dailyGoalMin ?? null,
    time_format: t.timeFormat ?? null,
    timezone: t.timezone ?? null,
  }
}

export function toUpdateInput(patch: Partial<DayTemplate>): UpdateTemplateInput {
  const input: UpdateTemplateInput = {}
  if (patch.name !== undefined) input.name = patch.name
  if (patch.days !== undefined) input.days = patch.days
  if (patch.rules !== undefined) input.rules = patch.rules.map(toRule)
  if (patch.inheritSettings !== undefined) input.inherit_settings = patch.inheritSettings
  if (patch.chainStartMin !== undefined) input.chain_start_min = patch.chainStartMin ?? null
  if (patch.dailyGoalMin !== undefined) input.daily_goal_min = patch.dailyGoalMin ?? null
  if (patch.timeFormat !== undefined) input.time_format = patch.timeFormat ?? null
  if (patch.timezone !== undefined) input.timezone = patch.timezone ?? null
  return input
}

export async function apiCreateTemplate(input: CreateTemplateInput): Promise<TemplateView> {
  return invoke<TemplateView>('create_template', { input })
}

export async function apiListTemplates(): Promise<TemplateView[]> {
  return invoke<TemplateView[]>('list_templates')
}

export async function apiUpdateTemplate(id: string, input: UpdateTemplateInput): Promise<TemplateView> {
  return invoke<TemplateView>('update_template', { id, input })
}

export async function apiDeleteTemplate(id: string): Promise<void> {
  return invoke<void>('delete_template', { id })
}

export async function apiDuplicateTemplate(id: string): Promise<TemplateView> {
  return invoke<TemplateView>('duplicate_template', { id })
}

export { isTauri }