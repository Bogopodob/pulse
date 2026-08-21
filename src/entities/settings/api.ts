//! Доступ к настройкам в БД (Tauri). Сервисы/интеграции сюда не входят —
//! они живут в отдельном фронтовом хранилище (pulse-services).

import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '../tasks/api'

export interface SettingEntry {
  key: string
  value: string
}

/** Все настройки из таблицы settings. */
export async function listSettings(): Promise<Map<string, string>> {
  if (!isTauri()) return new Map()
  const rows = await invoke<SettingEntry[]>('list_settings')
  return new Map(rows.map((r) => [r.key, r.value]))
}

/** Пакетный upsert настроек. */
export async function saveSettings(entries: Record<string, string>): Promise<void> {
  if (!isTauri()) return
  const payload: SettingEntry[] = Object.entries(entries).map(([key, value]) => ({ key, value }))
  await invoke('save_settings', { entries: payload })
}
