//! Системные уведомления через Tauri (WinRT-toast на Windows 11 с Центром
//! уведомлений, UserNotifications на macOS, freedesktop на Linux).
//! В браузере и при отказе в правах — false, вызывающий показывает in-app тост.

import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { isTauri } from '@/entities/tasks/api'

let grantedCache: boolean | null = null

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isTauri()) return false
  if (grantedCache !== null) return grantedCache
  try {
    const granted = await isPermissionGranted()
    if (granted) {
      grantedCache = true
      return true
    }
    const permission = await requestPermission()
    grantedCache = permission === 'granted'
    return grantedCache
  } catch {
    grantedCache = false
    return false
  }
}

/** Отправить системное уведомление. true — доставлено ОС, false — нужен fallback. */
export async function notify(title: string, body: string): Promise<boolean> {
  const ok = await ensureNotificationPermission()
  if (!ok) return false
  try {
    await sendNotification({ title, body })
    return true
  } catch {
    return false
  }
}
