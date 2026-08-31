import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { Theme } from '../types/index'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('pulse-theme')
    if (saved === 'dark' || saved === 'light') return saved
    return 'dark'
  })

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement
    // на 80мс глушим анимации — убирает лаг переключения особенно в светлой теме
    root.classList.add('theme-switching')
    root.dataset.theme = t
    if (t === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    root.style.colorScheme = t
    window.setTimeout(() => root.classList.remove('theme-switching'), 80)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState((prev) => {
      if (prev === t) return prev
      return t
    })
    localStorage.setItem('pulse-theme', t)
    applyTheme(t)
  }, [applyTheme])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('pulse-theme', next)
      const root = document.documentElement
      root.classList.add('theme-switching')
      root.dataset.theme = next
      if (next === 'dark') root.classList.add('dark')
      else root.classList.remove('dark')
      root.style.colorScheme = next
      window.setTimeout(() => root.classList.remove('theme-switching'), 80)
      return next
    })
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
