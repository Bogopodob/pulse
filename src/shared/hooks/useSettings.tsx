import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { DateFormat, TimeFormat, WeekStart } from '@/shared/lib/date'
import { listSettings, saveSettings } from '@/entities/settings/api'

export interface Settings {
  name: string
  email: string
  dailyGoalMin: number
  chainStartMin: number
  dateFormat: DateFormat
  timeFormat: TimeFormat
  weekStart: WeekStart
  timezone: string
  /** Системные уведомления ОС вместо внутренних тостов. */
  systemNotifications: boolean
}

const DEFAULTS: Settings = {
  name: 'Гость',
  email: 'you@pulse.app',
  dailyGoalMin: 480,
  chainStartMin: 540,
  dateFormat: 'DD.MM.YYYY',
  timeFormat: '24h',
  weekStart: 'mon',
  timezone: 'Europe/Moscow',
  /** Системные уведомления ОС вместо внутренних тостов. */
  systemNotifications: true,
}

interface SettingsContextValue extends Settings {
  updateName: (name: string) => void
  updateEmail: (email: string) => void
  setDailyGoalMin: (min: number) => void
  setChainStartMin: (min: number) => void
  setDateFormat: (f: DateFormat) => void
  setTimeFormat: (f: TimeFormat) => void
  setWeekStart: (w: WeekStart) => void
  setTimezone: (tz: string) => void
  setSystemNotifications: (v: boolean) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  /* Единственный источник истины — БД через Rust (settings_commands).
     До гидратации состояние равно DEFAULTS; localStorage не используется. */
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const hydratedRef = useRef(false)

  useEffect(() => {
    let alive = true
    listSettings()
      .then((map) => {
        if (!alive) return
        if (map.size > 0) {
          setSettings({
            name: map.get('name')?.trim() || DEFAULTS.name,
            email: map.get('email')?.trim() || DEFAULTS.email,
            dailyGoalMin: numOr(map.get('daily_goal_min'), DEFAULTS.dailyGoalMin),
            chainStartMin: numOr(map.get('chain_start_min'), DEFAULTS.chainStartMin),
            dateFormat: asDateFormat(map.get('date_format')) ?? DEFAULTS.dateFormat,
            timeFormat: map.get('time_format') === '12h' ? '12h' : '24h',
            weekStart: map.get('week_start') === 'sun' ? 'sun' : 'mon',
            timezone: map.get('timezone')?.trim() || DEFAULTS.timezone,
            systemNotifications: map.get('system_notifications') !== '0',
          })
        }
        hydratedRef.current = true
      })
      .catch((e) => {
        console.error('load settings failed:', e)
        hydratedRef.current = true
      })
    return () => {
      alive = false
    }
  }, [])

  /* Персист в БД. До гидратации не пишем — чтобы не затирать значения
     из БД дефолтами первого рендера. */
  useEffect(() => {
    if (!hydratedRef.current) return
    void saveSettings({
      name: settings.name,
      email: settings.email,
      daily_goal_min: String(settings.dailyGoalMin),
      chain_start_min: String(settings.chainStartMin),
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,
      week_start: settings.weekStart,
      timezone: settings.timezone,
      system_notifications: settings.systemNotifications ? '1' : '0',
    }).catch((e) => console.error('save settings failed:', e))
  }, [settings])

  const updateName = useCallback((name: string) => {
    setSettings((s) => ({ ...s, name }))
  }, [])

  const updateEmail = useCallback((email: string) => {
    setSettings((s) => ({ ...s, email }))
  }, [])

  const setDailyGoalMin = useCallback((min: number) => {
    setSettings((s) => ({ ...s, dailyGoalMin: min }))
  }, [])

  const setChainStartMin = useCallback((min: number) => {
    setSettings((s) => ({ ...s, chainStartMin: min }))
  }, [])

  const setDateFormat = useCallback((f: DateFormat) => {
    setSettings((s) => ({ ...s, dateFormat: f }))
  }, [])

  const setTimeFormat = useCallback((f: TimeFormat) => {
    setSettings((s) => ({ ...s, timeFormat: f }))
  }, [])

  const setWeekStart = useCallback((w: WeekStart) => {
    setSettings((s) => ({ ...s, weekStart: w }))
  }, [])

  const setTimezone = useCallback((tz: string) => {
    setSettings((s) => ({ ...s, timezone: tz }))
  }, [])

  const setSystemNotifications = useCallback((v: boolean) => {
    setSettings((s) => ({ ...s, systemNotifications: v }))
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULTS)
  }, [])

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        updateName,
        updateEmail,
        setDailyGoalMin,
        setChainStartMin,
        setDateFormat,
        setTimeFormat,
        setWeekStart,
        setTimezone,
        setSystemNotifications,
        reset,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

/* ── Парсеры значений из БД ── */
function numOr(raw: string | undefined, fallback: number): number {
  if (raw == null) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback
}

function asDateFormat(raw: string | undefined): DateFormat | null {
  return raw === 'DD.MM.YYYY' || raw === 'MM/DD/YYYY' || raw === 'YYYY.MM.DD' ? raw : null
}