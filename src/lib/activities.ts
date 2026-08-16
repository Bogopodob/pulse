export type RuleColor = 'blue' | 'amber' | 'teal' | 'violet' | 'rose'

export interface Rule {
  id: string
  type: string
  name: string
  minutes: number
  color: RuleColor
  icon: string
}

export interface ActivityPreset {
  label: string
  color: RuleColor
  icon: string
  presets: number[]
}

export const ACCENTS: Record<RuleColor, { color: string; bg: string; border: string; gradient: string; dot: string; glow: string }> = {
  blue: {
    color: '#bcd4ff',
    bg: 'rgba(76,141,255,0.12)',
    border: 'rgba(76,141,255,0.28)',
    gradient: 'linear-gradient(180deg, var(--focus-2), var(--focus))',
    dot: 'var(--focus)',
    glow: '76,141,255',
  },
  amber: {
    color: '#ffd7b0',
    bg: 'rgba(255,157,92,0.12)',
    border: 'rgba(255,157,92,0.28)',
    gradient: 'linear-gradient(180deg, var(--rest-2), var(--rest))',
    dot: 'var(--rest)',
    glow: '255,157,92',
  },
  teal: {
    color: '#bff2e6',
    bg: 'rgba(79,212,196,0.12)',
    border: 'rgba(79,212,196,0.28)',
    gradient: 'linear-gradient(180deg, var(--lunch-2), var(--lunch))',
    dot: 'var(--lunch)',
    glow: '79,212,196',
  },
  violet: {
    color: '#d3c8ff',
    bg: 'rgba(124,107,255,0.14)',
    border: 'rgba(124,107,255,0.3)',
    gradient: 'linear-gradient(180deg, #a79bff, var(--focus-2))',
    dot: 'var(--focus-2)',
    glow: '124,107,255',
  },
  rose: {
    color: '#ffc4dc',
    bg: 'rgba(244,114,182,0.12)',
    border: 'rgba(244,114,182,0.28)',
    gradient: 'linear-gradient(180deg, #f9a8d4, #f472b6)',
    dot: '#f472b6',
    glow: '244,114,182',
  },
}

export const ICON_PATHS: Record<string, string> = {
  clock: 'M12 7v5l3.5 2',
  leaf: 'M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z',
  coffee: 'M7 9h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6zM7 15v3M11 15v3M8 5h1M12 5h1',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  zap: 'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
  heart: 'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  dumbbell: 'M7 8v8M17 8v8M7 5v3h10V5M7 16v3h10v-3M4 9v6M20 9v6',
  book: 'M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1-2-2zM4 19a2 2 0 0 0 2 2h14M8 7h8',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  wind: 'M3 8h9a3 3 0 1 0-3-3M3 13h13a3 3 0 1 1-3 3',
}

export const ACTIVITIES: Record<string, ActivityPreset> = {
  focus: { label: 'Фокус', color: 'blue', icon: 'clock', presets: [25, 45, 60, 90] },
  break: { label: 'Перерыв', color: 'amber', icon: 'wind', presets: [5, 10, 15, 20] },
  lunch: { label: 'Обед', color: 'teal', icon: 'coffee', presets: [30, 45, 60, 90] },
  breakfast: { label: 'Завтрак', color: 'amber', icon: 'sun', presets: [15, 20, 30] },
  dinner: { label: 'Ужин', color: 'violet', icon: 'moon', presets: [30, 45, 60] },
  smoke: { label: 'Перекур', color: 'rose', icon: 'zap', presets: [5, 10, 15] },
  rest: { label: 'Отдых', color: 'teal', icon: 'heart', presets: [30, 60, 90, 120] },
}

export const CUSTOM_ICONS = ['star', 'heart', 'moon', 'sun', 'dumbbell', 'book', 'music', 'bell', 'zap', 'coffee', 'leaf', 'clock', 'wind']

export const COLOR_KEYS: RuleColor[] = ['blue', 'amber', 'teal', 'violet', 'rose']

export const DEFAULT_RULES: Rule[] = [
  { id: '1', type: 'focus', name: 'Утренний фокус', minutes: 60, color: 'blue', icon: 'clock' },
  { id: '2', type: 'break', name: 'Перерыв', minutes: 10, color: 'amber', icon: 'wind' },
  { id: '3', type: 'focus', name: 'Код и ревью', minutes: 60, color: 'blue', icon: 'clock' },
  { id: '4', type: 'lunch', name: 'Обед', minutes: 45, color: 'teal', icon: 'coffee' },
  { id: '5', type: 'focus', name: 'После обеда', minutes: 90, color: 'blue', icon: 'clock' },
  { id: '6', type: 'smoke', name: 'Перекур', minutes: 10, color: 'rose', icon: 'zap' },
  { id: '7', type: 'focus', name: 'Вечерний фокус', minutes: 45, color: 'blue', icon: 'clock' },
  { id: '8', type: 'dinner', name: 'Ужин', minutes: 45, color: 'violet', icon: 'moon' },
  { id: '9', type: 'rest', name: 'Отдых', minutes: 60, color: 'teal', icon: 'heart' },
]

export const RESTING_TYPES = new Set(['break', 'lunch', 'breakfast', 'dinner', 'smoke', 'rest'])