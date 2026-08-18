import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { DateFormat, TimeFormat, WeekStart } from '@/shared/lib/date'

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
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