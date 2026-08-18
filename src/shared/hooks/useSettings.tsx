import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface Settings {
  name: string
  dailyGoalMin: number
  chainStartMin: number
}

const DEFAULTS: Settings = {
  name: 'Гость',
  dailyGoalMin: 480,
  chainStartMin: 540,
}

const STORAGE_KEY = 'pulse-settings'

interface SettingsContextValue extends Settings {
  updateName: (name: string) => void
  setDailyGoalMin: (min: number) => void
  setChainStartMin: (min: number) => void
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
      dailyGoalMin: typeof parsed.dailyGoalMin === 'number' ? parsed.dailyGoalMin : DEFAULTS.dailyGoalMin,
      chainStartMin: typeof parsed.chainStartMin === 'number' ? parsed.chainStartMin : DEFAULTS.chainStartMin,
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

  const setDailyGoalMin = useCallback((min: number) => {
    setSettings((s) => ({ ...s, dailyGoalMin: min }))
  }, [])

  const setChainStartMin = useCallback((min: number) => {
    setSettings((s) => ({ ...s, chainStartMin: min }))
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULTS)
  }, [])

  return (
    <SettingsContext.Provider
      value={{ ...settings, updateName, setDailyGoalMin, setChainStartMin, reset }}
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