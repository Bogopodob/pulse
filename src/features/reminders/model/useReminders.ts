import { useState, useCallback, useEffect, useRef } from 'react'
import type { Reminder, ReminderStatus } from '../../../shared/types'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

const STORAGE_KEY = 'pulse-reminders'

function loadReminders(): Reminder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch {}
  return []
}

function saveReminders(reminders: Reminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
}

let notifGranted = false

async function ensureNotificationPermission() {
  if (notifGranted) return true
  try {
    const granted = await isPermissionGranted()
    if (granted) {
      notifGranted = true
      return true
    }
    const permission = await requestPermission()
    notifGranted = permission === 'granted'
    return notifGranted
  } catch {
    return false
  }
}

function getRemaining(reminder: Reminder): number {
  const elapsed = Date.now() - reminder.createdAt
  return Math.max(0, reminder.duration * 1000 - elapsed)
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders)
  const [now, setNow] = useState(Date.now())
  const notifiedRef = useRef(new Set<string>())

  useEffect(() => {
    saveReminders(reminders)
  }, [reminders])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    for (const r of reminders) {
      if (r.status !== 'active') continue
      const remaining = getRemaining(r)
      if (remaining <= 0 && !notifiedRef.current.has(r.id)) {
        notifiedRef.current.add(r.id)
        ensureNotificationPermission().then((granted) => {
          if (granted) {
            sendNotification({
              title: "Time's up!",
              body: r.title,
            })
          }
        })
      }
    }
  }, [reminders, now])

  const addReminder = useCallback(
    (title: string, description: string, duration: number) => {
      const reminder: Reminder = {
        id: crypto.randomUUID(),
        title,
        description,
        duration,
        createdAt: Date.now(),
        status: 'active',
      }
      setReminders((prev) => [reminder, ...prev])
    },
    [],
  )

  const completeReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'completed' as const } : r)),
    )
  }, [])

  const cancelReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' as const } : r)),
    )
  }, [])

  const deleteReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const getFiltered = useCallback(
    (status: ReminderStatus) => {
      return reminders.filter((r) => r.status === status)
    },
    [reminders],
  )

  return {
    reminders,
    addReminder,
    completeReminder,
    cancelReminder,
    deleteReminder,
    getFiltered,
    now,
  }
}
