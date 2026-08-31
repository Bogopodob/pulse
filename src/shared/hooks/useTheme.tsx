import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import type { Theme } from '../types/index'

const ThemeContext = createContext<Theme | null>(null)
const CallbacksContext = createContext<{ toggleTheme: () => void; setTheme: (theme: Theme) => void } | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('pulse-theme')
    if (saved === 'dark' || saved === 'light') return saved
    return 'dark'
  })

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement
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
      localStorage.setItem('pulse-theme', t)
      applyTheme(t)
      return t
    })
  }, [applyTheme])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('pulse-theme', next)
      applyTheme(next)
      return next
    })
  }, [applyTheme])

  useEffect(() => {
    applyTheme(theme)
  }, [])

  const callbacks = useMemo(() => ({ toggleTheme, setTheme }), [toggleTheme, setTheme])

  return (
    <ThemeContext.Provider value={theme}>
      <CallbacksContext.Provider value={callbacks}>
        {children}
      </CallbacksContext.Provider>
    </ThemeContext.Provider>
  )
}

export function useTheme(): { theme: Theme; toggleTheme: () => void; setTheme: (theme: Theme) => void } {
  const theme = useContext(ThemeContext)
  const callbacks = useContext(CallbacksContext)
  if (!theme || !callbacks) throw new Error('useTheme must be used within ThemeProvider')
  return { theme, ...callbacks }
}
