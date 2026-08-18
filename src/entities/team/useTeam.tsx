import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface TeamUser {
  id: string
  name: string
  initials: string
  color: string
}

export const TEAM_KEY = 'pulse-team'

export const TEAM_COLORS = ['#ff5f56', '#ffbd2e', '#27c93f', '#4c8dff', '#a78bfa', '#f783ac', '#4fd4c4', '#ff9d5c']

const DEFAULT_TEAM: TeamUser[] = [
  { id: 'JD', name: 'Денис Ярцев', initials: 'ДЯ', color: '#4c8dff' },
  { id: 'RK', name: 'Рита Ковалёва', initials: 'РК', color: '#f783ac' },
  { id: 'ML', name: 'Максим Ланской', initials: 'МЛ', color: '#27c93f' },
  { id: 'AN', name: 'Анна Новикова', initials: 'АН', color: '#a78bfa' },
  { id: 'SP', name: 'Сергей Панов', initials: 'СП', color: '#ffbd2e' },
  { id: 'LJ', name: 'Лиза Жукова', initials: 'ЛЖ', color: '#ff5f56' },
  { id: 'MK', name: 'Мария Кузнецова', initials: 'МК', color: '#4fd4c4' },
  { id: 'VR', name: 'Виктор Романов', initials: 'ВР', color: '#ff9d5c' },
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

interface TeamContextValue {
  team: TeamUser[]
  addUser: (name: string) => TeamUser
  removeUser: (id: string) => void
}

const TeamContext = createContext<TeamContextValue | null>(null)

export function TeamProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<TeamUser[]>(() => {
    try {
      const raw = localStorage.getItem(TEAM_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as TeamUser[]
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_TEAM
  })

  useEffect(() => {
    try {
      localStorage.setItem(TEAM_KEY, JSON.stringify(team))
    } catch {
      /* ignore */
    }
  }, [team])

  const addUser = useCallback((name: string): TeamUser => {
    const trimmed = name.trim()
    const color = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)]
    const user: TeamUser = {
      id: `u-${Date.now()}`,
      name: trimmed,
      initials: initialsOf(trimmed),
      color,
    }
    setTeam((prev) => [...prev, user])
    return user
  }, [])

  const removeUser = useCallback((id: string) => {
    setTeam((prev) => prev.filter((u) => u.id !== id))
  }, [])

  const value = useMemo(() => ({ team, addUser, removeUser }), [team, addUser, removeUser])

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam(): TeamContextValue {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeam must be used within TeamProvider')
  return ctx
}