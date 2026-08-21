import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import type { DateFormat, TimeFormat, WeekStart } from '@/shared/lib/date'
import { isTauri } from '@/entities/tasks/api'
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
}

const STORAGE_KEY = 'pulse-settings'

interface SettingsContextValue extends Settings {
  updateName: (name: string) => void
  updateEmail: (email: string) => void
  setDailyGoalMin: (min: number) => void
  setChainStartMin: (min: number) => void
  setDateFormat: (f: DateFormat) => void
  setTimeFormat: (f: TimeFormat) => void
  setWeekStart: (w: WeekStart) => void
  setTimezone: (tz: string) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : DEFAULTS.name,
      email: typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email : DEFAULTS.email,
      dailyGoalMin: typeof parsed.dailyGoalMin === 'number' ? parsed.dailyGoalMin : DEFAULTS.dailyGoalMin,
      chainStartMin: typeof parsed.chainStartMin === 'number' ? parsed.chainStartMin : DEFAULTS.chainStartMin,
      dateFormat: ['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY.MM.DD'].includes(parsed.dateFormat as string)
        ? (parsed.dateFormat as DateFormat)
        : DEFAULTS.dateFormat,
      timeFormat: parsed.timeFormat === '12h' ? '12h' : '24h',
      weekStart: parsed.weekStart === 'sun' ? 'sun' : 'mon',
      timezone: typeof parsed.timezone === 'string' && parsed.timezone.trim() ? parsed.timezone : DEFAULTS.timezone,
    }
  } catch {
    return DEFAULTS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  const tauri = useMemo(() => isTauri(), [])
  const hydratedRef = useRef(!tauri) // в браузере localStorage — источник истины

  /* Tauri: гидратация из БД (settings поверх localStorage-кэша). */
  useEffect(() => {
    if (!tauri) return
    let alive = true
    listSettings()
      .then((map) => {
        if (!alive || map.size === 0) {
          hydratedRef.current = true
          return
        }
        setSettings((prev) => ({
          ...prev,
          name: map.get('name') ?? prev.name,
          email: map.get('email') ?? prev.email,
          dailyGoalMin: numOr(map.get('daily_goal_min'), prev.dailyGoalMin),
          chainStartMin: numOr(map.get('chain_start_min'), prev.chainStartMin),
          dateFormat: asDateFormat(map.get('date_format')) ?? prev.dateFormat,
          timeFormat: map.get('time_format') === '12h' ? '12h' : map.get('time_format') === '24h' ? '24h' : prev.timeFormat,
          weekStart: map.get('week_start') === 'sun' ? 'sun' : map.get('week_start') === 'mon' ? 'mon' : prev.weekStart,
          timezone: map.get('timezone') ?? prev.timezone,
        }))
        hydratedRef.current = true
      })
      .catch((e) => {
        console.error('load settings failed:', e)
        hydratedRef.current = true
      })
    return () => {
      alive = false
    }
  }, [tauri])

  useEffect(() => {
    // Локальный кэш — всегда
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
    // Tauri: персист в БД (после гидратации, чтобы не затирать сид дефолтами localStorage'а)
    if (!tauri || !hydratedRef.current) return
    void saveSettings({
      name: settings.name,
      email: settings.email,
      daily_goal_min: String(settings.dailyGoalMin),
      chain_start_min: String(settings.chainStartMin),
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,
      week_start: settings.weekStart,
      timezone: settings.timezone,
    }).catch((e) => console.error('save settings failed:', e))
  }, [settings, tauri])

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