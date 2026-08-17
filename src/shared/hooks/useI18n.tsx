import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Locale } from '../types/index'
import { t as translateFn } from '../config/i18n'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('pulse-locale')
    if (saved === 'ru' || saved === 'en') return saved
    return 'ru'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('pulse-locale', l)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translateFn(locale, key, params)
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
