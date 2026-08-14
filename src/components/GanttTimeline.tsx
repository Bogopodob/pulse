import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dropdown } from '@heroui/react/dropdown'
import type { GanttTask } from '../types'

const HOUR_W = 160
const BUFFER_HOURS = 3
const MIN_W = 220
const MIN_SPAN_MIN = MIN_W / HOUR_W * 60
const VIS_GAP_MIN = 3
const TODAY = new Date(2026, 7, 21)

const TASK_H = 58
const TASK_GAP = 16
const HEADER_H = 44
const MINI_H = 28

const DAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

type ProjectKey = 'report' | 'sales' | 'design' | 'backend' | 'research' | 'ritual'

const PROJECTS: Record<ProjectKey, { label: string; color: string }> = {
  report: { label: 'Отчёт', color: '#4c8dff' },
  sales: { label: 'Продажи', color: '#ff9d5c' },
  design: { label: 'Дизайн', color: '#4fd4c4' },
  backend: { label: 'Бэкенд', color: '#ff6b8a' },
  research: { label: 'Исследования', color: '#a78bfa' },
  ritual: { label: 'Команда', color: '#ffd43b' },
}

type GanttTaskEx = GanttTask & { project: ProjectKey }

const MOCK_TASKS: GanttTaskEx[] = [
  { id: '1', title: 'Send a summary to email.', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 21), progress: 0.35, assignees: ['JD', 'RK', 'ML'], startMinute: 9 * 60, endMinute: 18 * 60, project: 'report' },
  { id: '2', title: 'Is status "MQL"?', startDate: new Date(2026, 7, 5), endDate: new Date(2026, 8, 3), progress: 0.70, assignees: ['AN'], startMinute: 10 * 60, endMinute: 16 * 60, project: 'sales' },
  { id: '3', title: 'Design system audit', startDate: new Date(2026, 7, 14), endDate: new Date(2026, 7, 28), progress: 0.90, assignees: ['SP', 'LJ'], startMinute: 8 * 60, endMinute: 17 * 60, project: 'design' },
  { id: '4', title: 'API integration — phase 1', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 8, 7), progress: 0.15, assignees: ['MK', 'VR'], startMinute: 7 * 60, endMinute: 15 * 60, project: 'backend' },
  { id: '5', title: 'User testing results review', startDate: new Date(2026, 7, 24), endDate: new Date(2026, 8, 14), progress: 0.45, assignees: ['JD', 'SP', 'AN', 'RK'], startMinute: 11 * 60, endMinute: 13 * 60, project: 'research' },
  { id: '6', title: 'Daily stand-up', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['JD', 'AN', 'MK', 'SP', 'VR'], startMinute: 9 * 60 + 30, endMinute: 9 * 60 + 45, project: 'ritual' },
  { id: '7', title: 'Design review', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: ['SP', 'LJ'], startMinute: 11 * 60, endMinute: 12 * 60 + 30, project: 'design' },
  { id: '8', title: 'Lunch', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 13 * 60, endMinute: 14 * 60, project: 'ritual' },
  { id: '9', title: 'Sprint planning', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0, assignees: ['JD', 'AN', 'MK', 'SP', 'VR', 'RK', 'LJ'], startMinute: 15 * 60, endMinute: 16 * 60 + 30, project: 'ritual' },
  { id: '10', title: 'Client demo prep', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.3, assignees: ['RK', 'MK'], startMinute: 15 * 60, endMinute: 18 * 60, project: 'sales' },
  { id: '11', title: 'Дочитать книгу', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.85, assignees: ['AN'], startMinute: 10 * 60, endMinute: 24 * 60, project: 'research' },
  { id: '12', title: 'Планирование недели', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: ['JD', 'AN', 'MK'], startMinute: 9 * 60, endMinute: 9 * 60 + 30, project: 'ritual' },
  { id: '13', title: 'Тренировка', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: [], startMinute: 18 * 60, endMinute: 19 * 60, project: 'ritual' },
  { id: '14', title: 'Ночная пробежка', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['MK'], startMinute: 0, endMinute: 2 * 60 + 30, project: 'ritual' },
  { id: '15', title: 'Проверить почту', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['AN'], startMinute: 9 * 60, endMinute: 9 * 60 + 5, project: 'report' },
  { id: '16', title: 'Ответить в чате', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['RK'], startMinute: 9 * 60 + 6, endMinute: 9 * 60 + 7, project: 'sales' },
  { id: '17', title: 'Созвон с командой', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['JD', 'AN', 'MK', 'SP'], startMinute: 9 * 60 + 10, endMinute: 9 * 60 + 40, project: 'ritual' },
  { id: '18', title: 'Разбор бэклога', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.5, assignees: ['MK', 'VR'], startMinute: 9 * 60 + 45, endMinute: 10 * 60 + 15, project: 'backend' },
  { id: '19', title: 'Ретроспектива', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.8, assignees: ['JD', 'AN', 'MK', 'SP', 'VR'], startMinute: 10 * 60 + 20, endMinute: 10 * 60 + 50, project: 'ritual' },
  { id: '20', title: 'Код-ревью пулл-реквеста', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.9, assignees: ['VR'], startMinute: 11 * 60, endMinute: 11 * 60 + 20, project: 'backend' },
  { id: '21', title: 'Короткая медитация', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 12 * 60 + 35, endMinute: 12 * 60 + 40, project: 'ritual' },
  { id: '22', title: 'Ответить клиентам', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: ['RK', 'ML'], startMinute: 14 * 60 + 15, endMinute: 14 * 60 + 30, project: 'sales' },
  { id: '23', title: 'Правки макета', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.4, assignees: ['SP', 'LJ'], startMinute: 14 * 60 + 40, endMinute: 15 * 60 + 10, project: 'design' },
  { id: '24', title: 'Проверка метрик', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.7, assignees: ['AN', 'JD'], startMinute: 16 * 60 + 35, endMinute: 16 * 60 + 55, project: 'research' },
  { id: '25', title: 'Чтение статей', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.2, assignees: [], startMinute: 19 * 60, endMinute: 20 * 60, project: 'research' },
  { id: '26', title: 'Утренний забег', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 1, assignees: ['MK'], startMinute: 7 * 60, endMinute: 8 * 60, project: 'ritual' },
  { id: '27', title: 'Подготовка к встрече', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.5, assignees: ['RK'], startMinute: 14 * 60, endMinute: 14 * 60 + 30, project: 'sales' },
  { id: '28', title: 'Анализ результатов теста', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.1, assignees: ['JD', 'AN'], startMinute: 11 * 60, endMinute: 12 * 60 + 30, project: 'research' },
  { id: '29', title: 'Вечерний созвон', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.7, assignees: ['JD', 'AN', 'MK'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 30, project: 'ritual' },
  { id: '30', title: 'Итоги дня', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.9, assignees: ['AN'], startMinute: 20 * 60 + 40, endMinute: 21 * 60 + 10, project: 'report' },
  { id: '31', title: 'Чек почты перед сном', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 20 * 60 + 45, endMinute: 20 * 60 + 55, project: 'report' },
  { id: '32', title: 'Дайджест комьюнити', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.4, assignees: [], startMinute: 21 * 60 + 40, endMinute: 22 * 60 + 15, project: 'research' },
  { id: '33', title: 'Чтение главы книги', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.5, assignees: [], startMinute: 21 * 60 + 45, endMinute: 22 * 60 + 30, project: 'research' },
  { id: '34', title: 'Слушаю подкаст', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: [], startMinute: 22 * 60, endMinute: 22 * 60 + 50, project: 'research' },
  { id: '35', title: 'Короткая медитация', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 22 * 60 + 55, endMinute: 23 * 60 + 5, project: 'ritual' },
  { id: '36', title: 'План на завтра', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.3, assignees: ['JD'], startMinute: 23 * 60, endMinute: 23 * 60 + 30, project: 'ritual' },
  { id: '37', title: 'Спокойная музыка', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.8, assignees: [], startMinute: 23 * 60 + 30, endMinute: 23 * 60 + 45, project: 'ritual' },
  { id: '38', title: 'Последний чай', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 23 * 60 + 50, endMinute: 23 * 60 + 55, project: 'ritual' },
  { id: '39', title: 'Совещание по продукту', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.5, assignees: ['MK', 'VR'], startMinute: 17 * 60 + 30, endMinute: 18 * 60 + 30, project: 'backend' },
  { id: '40', title: 'Тренировка', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 1, assignees: ['MK'], startMinute: 19 * 60, endMinute: 20 * 60, project: 'ritual' },
  { id: '41', title: 'Ужин с командой', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.7, assignees: ['JD', 'SP', 'VR'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 30, project: 'ritual' },
  { id: '42', title: 'Встреча с ментором', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.4, assignees: ['AN'], startMinute: 20 * 60 + 45, endMinute: 21 * 60 + 15, project: 'report' },
  { id: '43', title: 'Разбор кода', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.6, assignees: ['VR'], startMinute: 22 * 60, endMinute: 23 * 60, project: 'backend' },
  { id: '44', title: 'Чтение документации', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.3, assignees: [], startMinute: 23 * 60, endMinute: 23 * 60 + 30, project: 'research' },
  { id: '45', title: 'Итоги дня', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.8, assignees: ['AN'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 15, project: 'report' },
  { id: '46', title: 'Лёгкая прогулка', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: ['MK'], startMinute: 20 * 60 + 45, endMinute: 21 * 60 + 30, project: 'ritual' },
  { id: '47', title: 'Чтение', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.4, assignees: [], startMinute: 21 * 60 + 45, endMinute: 22 * 60 + 30, project: 'research' },
  { id: '48', title: 'Подготовка ко сну', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.9, assignees: [], startMinute: 22 * 60 + 45, endMinute: 23 * 60 + 10, project: 'ritual' },
  { id: '49', title: 'Внедрение фичи', startDate: new Date(2026, 7, 15), endDate: new Date(2026, 8, 5), progress: 0.55, assignees: ['MK', 'VR'], startMinute: 9 * 60, endMinute: 18 * 60, project: 'backend' },
  { id: '50', title: 'Подготовка релиза', startDate: new Date(2026, 7, 18), endDate: new Date(2026, 7, 30), progress: 0.4, assignees: ['JD', 'AN', 'MK'], startMinute: 10 * 60, endMinute: 19 * 60, project: 'report' },
  { id: '51', title: 'Квартальный отчёт', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 25), progress: 0.65, assignees: ['AN', 'JD'], startMinute: 8 * 60, endMinute: 17 * 60, project: 'report' },
  { id: '52', title: 'Миграция базы данных', startDate: new Date(2026, 7, 19), endDate: new Date(2026, 7, 27), progress: 0.3, assignees: ['VR', 'MK'], startMinute: 7 * 60, endMinute: 16 * 60, project: 'backend' },
  { id: '53', title: 'Опрос пользователей', startDate: new Date(2026, 7, 10), endDate: new Date(2026, 8, 3), progress: 0.5, assignees: ['SP', 'AN'], startMinute: 11 * 60, endMinute: 14 * 60, project: 'research' },
  { id: '54', title: 'Документация API', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 8, 4), progress: 0.75, assignees: ['VR'], startMinute: 13 * 60, endMinute: 18 * 60, project: 'backend' },
]

const C = [
  { base: '#4c8dff' },
  { base: '#ff9d5c' },
  { base: '#4fd4c4' },
  { base: '#ff6b8a' },
  { base: '#a78bfa' },
  { base: '#ffd43b' },
  { base: '#69db7c' },
  { base: '#f783ac' },
  { base: '#748ffc' },
]

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function fmtDate(d: Date) {
  return `${DAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
}

function fmtHour(m: number) {
  const h = Math.floor(m / 60)
  return `${String(h).padStart(2, '0')}h`
}

function fmtExact(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function fmtRange(a: Date, b: Date) {
  const f = (d: Date) => `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
  return `от ${f(a)} до ${f(b)}`
}

const contentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 24,
      delay: i * 0.05,
    },
  }),
}

function NavBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      className="flex items-center justify-center size-[24px] rounded-md cursor-pointer shrink-0 transition-colors"
      style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      whileHover={{ color: '#fff', background: 'rgba(255,255,255,0.08)' }}
      onClick={onClick}
      title={dir === 'prev' ? 'Предыдущий день (←)' : 'Следующий день (→)'}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </motion.button>
  )
}

export function GanttTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentDay, setCurrentDay] = useState(new Date(TODAY))
  const [nowMinute, setNowMinute] = useState(() => new Date().getHours() * 60 + new Date().getMinutes())
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportW, setViewportW] = useState(0)
  const [hoverMin, setHoverMin] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [hiddenProjects, setHiddenProjects] = useState<Set<ProjectKey>>(new Set())
  const [mockTasks, setMockTasks] = useState<GanttTaskEx[]>(MOCK_TASKS)
  const [ctxMenu, setCtxMenu] = useState<{ key: number; x: number; y: number; task: GanttTaskEx } | null>(null)
  const ctxAnchorRef = useRef<HTMLDivElement>(null)

  const prevDay = new Date(currentDay)
  prevDay.setDate(prevDay.getDate() - 1)
  const nextDay = new Date(currentDay)
  nextDay.setDate(nextDay.getDate() + 1)

  const tasksForDay = (day: Date) => mockTasks.filter((t) => day >= t.startDate && day <= t.endDate && !hiddenProjects.has(t.project))

  const hasPrevTasks = tasksForDay(prevDay).length > 0
  const hasNextTasks = tasksForDay(nextDay).length > 0
  const prevW = hasPrevTasks ? 24 * HOUR_W : BUFFER_HOURS * HOUR_W
  const nextW = hasNextTasks ? 24 * HOUR_W : BUFFER_HOURS * HOUR_W
  const offset = prevW
  const totalW = prevW + 24 * HOUR_W + nextW

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNowMinute(d.getHours() * 60 + d.getMinutes())
    }, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = offset + 8 * HOUR_W - el.clientWidth / 2
  }, [currentDay, offset])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth))
    ro.observe(el)
    setViewportW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const handleGanttScroll = useCallback(() => {
    const el = scrollRef.current
    if (el) setScrollLeft(el.scrollLeft)
  }, [])

  const scrollToHour = useCallback((hour: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = offset + hour * HOUR_W - el.clientWidth / 2
    el.scrollTo({ left: target, behavior: 'smooth' })
  }, [offset])

  const handleMiniClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.scrollTo({ left: ratio * totalW - el.clientWidth / 2, behavior: 'smooth' })
  }, [totalW])

  const handleTickHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const absX = e.clientX - rect.left
    const minute = (absX - offset) / HOUR_W * 60
    if (minute >= -30 && minute <= 24 * 60 + 30) {
      setHoverMin(Math.round(Math.max(0, Math.min(24 * 60, minute))))
      setHoverX(absX)
    } else {
      setHoverMin(null)
    }
  }, [offset])

  const handleTickLeave = useCallback(() => {
    setHoverMin(null)
  }, [])

  const openContextMenu = useCallback((e: React.MouseEvent, task: GanttTaskEx) => {
    e.preventDefault()
    setCtxMenu((prev) => ({ key: (prev?.key ?? 0) + 1, x: e.clientX, y: e.clientY, task }))
  }, [])

  const closeContextMenu = useCallback(() => {
    setCtxMenu(null)
  }, [])

  const handleCtxAction = useCallback(
    (actionKey: React.Key) => {
      const cur = ctxMenu
      setCtxMenu(null)
      if (!cur) return
      const { task } = cur
      if (actionKey === 'duplicate') {
        const copy: GanttTaskEx = { ...task, id: `${task.id}-dup-${Date.now()}` }
        setMockTasks((prev) => [...prev, copy])
      } else if (actionKey === 'delete') {
        setMockTasks((prev) => prev.filter((t) => t.id !== task.id))
      } else if (actionKey === 'done') {
        setMockTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, progress: t.progress >= 1 ? 0 : 1 } : t)))
      }
    },
    [ctxMenu],
  )

  const goPrev = () => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() - 1)
    setCurrentDay(d)
  }

  const goNext = () => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() + 1)
    setCurrentDay(d)
  }

  const goToday = () => {
    setCurrentDay(new Date(TODAY))
  }

  const isToday = isSameDay(currentDay, TODAY)

  const toggleProject = (key: ProjectKey) => {
    setHiddenProjects((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hourSlots: { x: number; hour: number; isBuffer: boolean }[] = []
  if (hasPrevTasks) {
    for (let h = 0; h < 24; h++) hourSlots.push({ x: h * HOUR_W, hour: h, isBuffer: true })
  } else {
    for (let h = 24 - BUFFER_HOURS; h < 24; h++) hourSlots.push({ x: (h - (24 - BUFFER_HOURS)) * HOUR_W, hour: h, isBuffer: true })
  }
  for (let h = 0; h < 24; h++) hourSlots.push({ x: offset + h * HOUR_W, hour: h, isBuffer: false })
  if (hasNextTasks) {
    for (let h = 0; h < 24; h++) hourSlots.push({ x: offset + 24 * HOUR_W + h * HOUR_W, hour: h, isBuffer: true })
  } else {
    for (let h = 0; h < BUFFER_HOURS; h++) hourSlots.push({ x: offset + 24 * HOUR_W + h * HOUR_W, hour: h, isBuffer: true })
  }

  type RenderedTask = { task: GanttTaskEx; x: number; y: number; width: number; leftMin: number; rightMin: number; l0: number; r0: number; w0: number; w1: number; day: Date }

  const layoutDay = (day: Date, xOrigin: number, windowStartMin: number, windowLenMin: number): RenderedTask[] => {
    const windowEndMin = windowStartMin + windowLenMin
    const withBounds = tasksForDay(day)
      .map((t) => {
        const l = isSameDay(day, t.startDate) ? t.startMinute : 0
        const r = isSameDay(day, t.endDate) ? t.endMinute : 24 * 60
        const leftMin = Math.max(l, windowStartMin)
        const rightMin = Math.min(r, windowEndMin)
        const visEnd = leftMin + Math.max(rightMin - leftMin, MIN_SPAN_MIN)
        return { task: t, l, r, leftMin, rightMin, visEnd }
      })
      .filter((i) => i.rightMin > i.leftMin)
    withBounds.sort((a, b) => a.leftMin - b.leftMin)

    const rows: { end: number; items: typeof withBounds }[] = []
    for (const item of withBounds) {
      let placed = false
      for (let ri = 0; ri < rows.length; ri++) {
        if (rows[ri].end + VIS_GAP_MIN <= item.leftMin) {
          rows[ri].items.push(item)
          rows[ri].end = Math.max(rows[ri].end, item.visEnd)
          placed = true
          break
        }
      }
      if (!placed) rows.push({ end: item.visEnd, items: [item] })
    }

    const result: RenderedTask[] = []
    const regionRight = xOrigin + windowLenMin / 60 * HOUR_W
    rows.forEach((row, ri) => {
      row.items.forEach((item) => {
        const x = xOrigin + (item.leftMin - windowStartMin) / 60 * HOUR_W
        const rawWidth = Math.max((item.rightMin - item.leftMin) / 60 * HOUR_W, MIN_W)
        result.push({
          task: item.task,
          x,
          y: HEADER_H + ri * (TASK_H + TASK_GAP),
          width: Math.min(rawWidth, regionRight - x),
          leftMin: item.leftMin,
          rightMin: item.rightMin,
          l0: item.l,
          r0: item.r,
          w0: windowStartMin,
          w1: windowEndMin,
          day,
        })
      })
    })
    return result
  }

  const mainDayTasks = layoutDay(currentDay, offset, 0, 24 * 60)
  const prevDayTasks = layoutDay(prevDay, 0, hasPrevTasks ? 0 : (24 - BUFFER_HOURS) * 60, hasPrevTasks ? 24 * 60 : BUFFER_HOURS * 60)
  const nextDayTasks = layoutDay(nextDay, offset + 24 * HOUR_W, 0, hasNextTasks ? 24 * 60 : BUFFER_HOURS * 60)

  const renderTasks = [...prevDayTasks, ...mainDayTasks, ...nextDayTasks]

  const maxY = renderTasks.reduce((m, p) => Math.max(m, p.y + TASK_H), 0)
  const contentH = maxY > 0 ? maxY + TASK_GAP : '100%'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 relative"
    >
      <div className="absolute top-0 left-0 w-[60px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }} />
      <div className="absolute top-0 right-0 w-[60px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }} />

      <div className="flex items-center justify-between shrink-0 px-2 h-[34px] gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <NavBtn dir="prev" onClick={goPrev} />
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 h-[24px] px-2.5 rounded-md cursor-pointer text-[11px] font-semibold shrink-0 transition-colors"
            style={
              isToday
                ? {
                    background: 'linear-gradient(135deg, var(--focus), var(--focus-2))',
                    color: '#0a0b0e',
                    boxShadow: '0 0 12px rgba(76,141,255,0.3)',
                  }
                : {
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }
            }
            whileHover={isToday ? undefined : { background: 'rgba(255,255,255,0.08)', color: '#fff' }}
            onClick={goToday}
            title="К сегодняшнему дню (Home)"
          >
            <span
              className="size-[6px] rounded-full"
              style={isToday ? { background: 'rgba(10,11,14,0.7)' } : { background: 'var(--focus)', boxShadow: '0 0 6px var(--focus)' }}
            />
            Сегодня
          </motion.button>
          <NavBtn dir="next" onClick={goNext} />
        </div>

        <div className="text-[12px] font-semibold tracking-[-0.01em] shrink-0 select-none" style={{ color: isToday ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
          {fmtDate(currentDay)}
        </div>

        <div className="flex items-center gap-1.5 justify-end shrink-0 min-w-0 flex-wrap">
          {(Object.keys(PROJECTS) as ProjectKey[]).map((key) => {
            const p = PROJECTS[key]
            const hidden = hiddenProjects.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleProject(key)}
                title={`${p.label} — ${hidden ? 'показать' : 'скрыть'}`}
                className={`flex items-center gap-1.5 h-[22px] px-2 rounded-full cursor-pointer transition-all text-[10px] font-semibold select-none ${hidden ? 'opacity-25' : ''}`}
                style={{ background: `${p.color}12`, color: hidden ? 'rgba(255,255,255,0.5)' : p.color, border: `1px solid ${p.color}30` }}
              >
                <span
                  className="size-[5px] rounded-full"
                  style={hidden ? { background: 'rgba(255,255,255,0.35)' } : { background: p.color, boxShadow: `0 0 6px ${p.color}` }}
                />
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {viewportW > 0 && (
        <div
          className="relative shrink-0 cursor-pointer mx-2 rounded-sm select-none"
          style={{ height: MINI_H, background: 'rgba(255,255,255,0.03)' }}
          onClick={handleMiniClick}
        >
          {Array.from({ length: totalW / HOUR_W + 1 }, (_, i) => (
            <div
              key={`mt-${i}`}
              className="absolute top-0 rounded-full"
              style={{
                left: `${(i / (totalW / HOUR_W)) * 100}%`,
                width: i % 6 === 0 ? 1.5 : 0.5,
                height: i % 6 === 0 ? MINI_H : 8,
                top: i % 6 === 0 ? 0 : (MINI_H - 8) / 2,
                background: i % 6 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                transform: 'translateX(-50%)',
              }}
            />
          ))}
          <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${(offset / totalW) * 100}%`, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${((offset + 24 * HOUR_W) / totalW) * 100}%`, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div
            className="absolute top-0 h-full rounded-sm pointer-events-none"
            style={{
              left: `${(scrollLeft / totalW) * 100}%`,
              width: `${(viewportW / totalW) * 100}%`,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
            }}
          />
          {isToday && (
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none z-10"
              style={{ left: `${((offset + nowMinute / 60 * HOUR_W) / totalW) * 100}%`, width: 5, height: 5, background: '#ff3b30', boxShadow: '0 0 8px rgba(255,59,48,0.8)' }}
            />
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleGanttScroll}
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--surface-3) transparent',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDay.toISOString()}
            className="relative"
            style={{ width: totalW, minHeight: '100%', height: contentH }}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="absolute top-0 left-0 right-0 z-[3] select-none" style={{ height: 14 }}>
              {hourSlots.map((s) => (
                <div
                  key={`hl-${s.x}`}
                  className="absolute cursor-pointer"
                  style={{ left: s.x, top: '50%', transform: 'translate(-50%, -50%)' }}
                  onClick={() => scrollToHour(s.hour)}
                >
                  <span className="text-[9.5px] font-semibold tabular-nums" style={{ color: s.isBuffer ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)' }}>
                    {String(s.hour).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="absolute z-[1]"
              style={{ top: 16, left: 0, right: 0, height: 26 }}
              onMouseMove={handleTickHover}
              onMouseLeave={handleTickLeave}
            >
              {hourSlots.map((s) => {
                const isMajor = s.hour % 6 === 0
                return (
                  <div
                    key={`t-${s.x}`}
                    className="absolute bottom-0"
                    style={{
                      left: s.x,
                      width: isMajor ? 1.5 : 1,
                      height: isMajor ? 26 : 10,
                      background: s.isBuffer ? 'rgba(255,255,255,0.015)' : (isMajor ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'),
                    }}
                  />
                )
              })}
              <div className="absolute bottom-0" style={{ left: totalW, width: 1, height: 10, background: 'rgba(255,255,255,0.03)' }} />
              <div className="absolute bottom-0 rounded-full" style={{ left: offset, width: 2, height: 26, transform: 'translateX(-1px)', background: 'rgba(255,255,255,0.18)' }} />
              <div className="absolute bottom-0 rounded-full" style={{ left: offset + 24 * HOUR_W, width: 2, height: 26, transform: 'translateX(-1px)', background: 'rgba(255,255,255,0.18)' }} />
              {hoverMin !== null && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: -20,
                    left: hoverX,
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.02em',
                  }}
                >
                  {fmtExact(hoverMin)}
                </div>
              )}
            </div>

            <div className="absolute top-[44px] left-0 right-0 z-[1] pointer-events-none" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 10%, rgba(255,255,255,0.06) 90%, transparent 100%)' }} />

            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: 0, width: prevW, background: 'linear-gradient(90deg, rgba(0,0,0,0.22), rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.1))' }} />
            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: offset + 24 * HOUR_W, width: nextW, background: 'linear-gradient(270deg, rgba(0,0,0,0.22), rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.1))' }} />

            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: 0, width: prevW, top: 0, height: 14 }}>
              <span className="text-[11px] font-semibold tracking-[0.02em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {hasPrevTasks ? `← вчера · ${fmtDate(prevDay)}` : '← вчера'}
              </span>
            </div>
            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: offset + 24 * HOUR_W, width: nextW, top: 0, height: 14 }}>
              <span className="text-[11px] font-semibold tracking-[0.02em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {hasNextTasks ? `завтра · ${fmtDate(nextDay)} →` : 'завтра →'}
              </span>
            </div>

            {isToday && (
              <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: offset + nowMinute / 60 * HOUR_W }}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="relative h-full"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{
                      scale: 1,
                      boxShadow: [
                        '0 0 6px rgba(255,59,48,0.4)',
                        '0 0 14px rgba(255,59,48,0.7)',
                        '0 0 6px rgba(255,59,48,0.4)',
                      ],
                    }}
                    transition={{
                      scale: { type: 'spring' as const, stiffness: 300, damping: 10 },
                      boxShadow: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                    }}
                    className="absolute rounded-full"
                    style={{
                      width: 6, height: 6, top: 4, left: '50%', marginLeft: -3,
                      background: '#ff3b30',
                    }}
                  />
                  <div className="absolute top-[13px] bottom-0 left-1/2 rounded-full" style={{
                    width: 1.5,
                    background: 'linear-gradient(180deg, #ff3b30 0%, #ff3b30 15%, rgba(255,59,48,0.15) 50%, transparent 100%)',
                  }} />
                </motion.div>
              </div>
            )}

            <div className="absolute z-[1] pointer-events-none" style={{ top: 0, left: 0, width: totalW }}>
              {Array.from(new Set(renderTasks.map((p) => p.y))).map((y) => (
                <div key={`reel-${y}`} className="absolute left-0 w-full" style={{
                  top: y + TASK_H / 2,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.025) 10%, rgba(255,255,255,0.025) 90%, transparent 100%)',
                }} />
              ))}
            </div>

            {renderTasks.map((p, idx) => {
              const { task } = p
              const leftMin = p.leftMin
              const rightMin = p.rightMin
              const left = p.x
              const width = p.width
              const top = p.y
              const cc = C[idx % C.length]

              const startsBefore = p.leftMin === p.l0 && p.day > task.startDate
              const endsAfter = p.rightMin === p.r0 && p.day < task.endDate

              const connectLeft = startsBefore
              const connectRight = endsAfter
              const atLeftEdge = p.leftMin === p.w0
              const atRightEdge = p.rightMin === p.w1
              const insetL = atLeftEdge && !connectLeft ? 7 : 0
              const insetR = atRightEdge && !connectRight ? 7 : 0
              const radiusL = connectLeft ? 0 : 12
              const radiusR = connectRight ? 0 : 12

              return (
                <motion.div
                  key={`${p.day.toISOString()}-${task.id}`}
                  custom={idx}
                  variants={cardVariants}
                  className="absolute group cursor-pointer select-none flex flex-col"
                  style={{ left: left + insetL, top, width: width - insetL - insetR, height: TASK_H, padding: '10px 14px 10px 14px' }}
                  onContextMenu={(e) => openContextMenu(e, task)}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderLeftWidth: connectLeft ? 0 : 1,
                      borderRightWidth: connectRight ? 0 : 1,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: `${radiusL}px ${radiusR}px ${radiusR}px ${radiusL}px`,
                    }}
                    whileHover={{
                      y: -2,
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderLeftColor: connectLeft ? 'transparent' : 'rgba(255,255,255,0.15)',
                      borderRightColor: connectRight ? 'transparent' : 'rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.07)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                      transition: { type: 'spring' as const, stiffness: 350, damping: 14 },
                    }}
                  />

                  <div className="flex items-center gap-2 relative z-[1] min-h-0 shrink-0">
                    <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: cc.base, opacity: 0.7 }} />
                    <span className="text-[13px] font-medium text-[var(--text)] leading-tight truncate tracking-[-0.01em]">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 relative z-[1] mt-auto min-w-0" style={{ paddingTop: 4 }}>
                    {startsBefore ? (
                      <span className="text-[10px] font-medium truncate min-w-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {fmtRange(task.startDate, task.endDate)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {fmtHour(leftMin)}–{fmtHour(rightMin)}
                      </span>
                    )}
                    {endsAfter && (
                      <span className="text-[10px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        → {fmtRange(task.startDate, task.endDate)}
                      </span>
                    )}
                    <span className="text-[10.5px] font-semibold tabular-nums shrink-0" style={{ color: cc.base, opacity: 0.6 }}>
                      {Math.round(task.progress * 100)}%
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={ctxAnchorRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          pointerEvents: 'none',
          transform: ctxMenu ? `translate(${ctxMenu.x}px, ${ctxMenu.y}px)` : 'translate(-400px, -400px)',
        }}
      />

      <Dropdown.Root isOpen={ctxMenu !== null} onOpenChange={closeContextMenu}>
        <Dropdown.Popover key={ctxMenu?.key} triggerRef={ctxAnchorRef} placement="right top" offset={4} isNonModal>
          <Dropdown.Menu className="min-w-[200px] max-w-[280px]" onAction={handleCtxAction}>
            <Dropdown.Item
              key="header"
              isDisabled
              style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.6, fontSize: 11, fontWeight: 600 }}
            >
              {ctxMenu?.task.title}
            </Dropdown.Item>
            <Dropdown.Item key="open">Открыть</Dropdown.Item>
            <Dropdown.Item key="edit">Редактировать</Dropdown.Item>
            <Dropdown.Item key="duplicate">Дублировать</Dropdown.Item>
            <Dropdown.Item key="done">{ctxMenu && ctxMenu.task.progress >= 1 ? 'Снять выполнение' : 'Отметить выполненной'}</Dropdown.Item>
            <Dropdown.Item key="delete" style={{ color: '#ff6b8a' }}>
              Удалить
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </motion.div>
  )
}
