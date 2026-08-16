import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion'
import { Dropdown } from '@heroui/react/dropdown'
import { CalendarDateTime, getLocalTimeZone } from '@internationalized/date'
import type { GanttTask } from '../types'

const BASE_HOUR_W = 160
const BASE_PX_MIN = BASE_HOUR_W / 60
const TARGET_SMALL_W = 260
const SMALL_MIN = 40
const MAX_SCALE = 260
const BUFFER_HOURS = 3
const VIS_GAP_MIN = 3
const MIN_TAG_W = 280
const MAX_TAG_TITLE = 20
const MAX_SMOOTH_PX = 162
const SMOOTH_FACTOR = 0.22
const SUPPORTS_SCROLL_TIMELINE =
  typeof CSS !== 'undefined' && typeof ScrollTimeline === 'function' && typeof Element.prototype.animate === 'function'
const TODAY = new Date(2026, 7, 21)

const TASK_H = 58
const TASK_GAP = 16
const HEADER_H = 44
const MINI_H = 28

const DAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAYS_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

type ProjectKey = 'report' | 'sales' | 'design' | 'backend' | 'research' | 'ritual'

const PROJECTS: Record<ProjectKey, { label: string; color: string }> = {
  report: { label: 'Отчёт', color: '#4c8dff' },
  sales: { label: 'Продажи', color: '#ff9d5c' },
  design: { label: 'Дизайн', color: '#4fd4c4' },
  backend: { label: 'Бэкенд', color: '#ff6b8a' },
  research: { label: 'Исследования', color: '#a78bfa' },
  ritual: { label: 'Команда', color: '#ffd43b' },
}

type GanttTaskEx = GanttTask & { tags: string[] }

const MOCK_TASKS: GanttTaskEx[] = [
  { id: '1', title: 'Send a summary to email.', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 21), progress: 0.35, assignees: ['JD', 'RK', 'ML'], startMinute: 9 * 60, endMinute: 18 * 60, tags: ["report","sales"] },
  { id: '2', title: 'Is status "MQL"?', startDate: new Date(2026, 7, 5), endDate: new Date(2026, 8, 3), progress: 0.70, assignees: ['AN'], startMinute: 10 * 60, endMinute: 16 * 60, tags: ["sales"] },
  { id: '3', title: 'Design system audit', startDate: new Date(2026, 7, 14), endDate: new Date(2026, 7, 28), progress: 0.90, assignees: ['SP', 'LJ'], startMinute: 8 * 60, endMinute: 17 * 60, tags: ["design","research"] },
  { id: '4', title: 'API integration — phase 1', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 8, 7), progress: 0.15, assignees: ['MK', 'VR'], startMinute: 7 * 60, endMinute: 15 * 60, tags: ["backend","report"] },
  { id: '5', title: 'User testing results review', startDate: new Date(2026, 7, 24), endDate: new Date(2026, 8, 14), progress: 0.45, assignees: ['JD', 'SP', 'AN', 'RK'], startMinute: 11 * 60, endMinute: 13 * 60, tags: ["research","design"] },
  { id: '6', title: 'Daily stand-up', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['JD', 'AN', 'MK', 'SP', 'VR'], startMinute: 9 * 60 + 30, endMinute: 9 * 60 + 45, tags: ["ritual"] },
  { id: '7', title: 'Design review', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: ['SP', 'LJ'], startMinute: 11 * 60, endMinute: 12 * 60 + 30, tags: ["design"] },
  { id: '8', title: 'Lunch', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 13 * 60, endMinute: 14 * 60, tags: ["ritual"] },
  { id: '9', title: 'Sprint planning', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0, assignees: ['JD', 'AN', 'MK', 'SP', 'VR', 'RK', 'LJ'], startMinute: 15 * 60, endMinute: 16 * 60 + 30, tags: ["ritual","report"] },
  { id: '10', title: 'Client demo prep', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.3, assignees: ['RK', 'MK'], startMinute: 15 * 60, endMinute: 18 * 60, tags: ["sales","design"] },
  { id: '11', title: 'Дочитать книгу', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.85, assignees: ['AN'], startMinute: 10 * 60, endMinute: 24 * 60, tags: ["research"] },
  { id: '12', title: 'Планирование недели', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: ['JD', 'AN', 'MK'], startMinute: 9 * 60, endMinute: 9 * 60 + 30, tags: ["ritual","report"] },
  { id: '13', title: 'Тренировка', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: [], startMinute: 18 * 60, endMinute: 19 * 60, tags: ["ritual"] },
  { id: '14', title: 'Ночная пробежка', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['MK'], startMinute: 0, endMinute: 2 * 60, tags: ["ritual"] },
  { id: '15', title: 'Проверить почту', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['AN'], startMinute: 9 * 60, endMinute: 9 * 60 + 5, tags: ["report","sales"] },
  { id: '16', title: 'Ответить в чате', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['RK'], startMinute: 9 * 60 + 6, endMinute: 9 * 60 + 7, tags: ["sales","report"] },
  { id: '17', title: 'Созвон с командой', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['JD', 'AN', 'MK', 'SP'], startMinute: 9 * 60 + 10, endMinute: 9 * 60 + 40, tags: ["ritual"] },
  { id: '18', title: 'Разбор бэклога', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.5, assignees: ['MK', 'VR'], startMinute: 9 * 60 + 45, endMinute: 10 * 60 + 15, tags: ["backend","ritual"] },
  { id: '19', title: 'Ретроспектива', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.8, assignees: ['JD', 'AN', 'MK', 'SP', 'VR'], startMinute: 10 * 60 + 20, endMinute: 10 * 60 + 50, tags: ["ritual","report","backend"] },
  { id: '20', title: 'Код-ревью пулл-реквеста', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.9, assignees: ['VR'], startMinute: 11 * 60, endMinute: 11 * 60 + 20, tags: ["backend","design"] },
  { id: '21', title: 'Короткая медитация', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 12 * 60 + 35, endMinute: 12 * 60 + 40, tags: ["ritual"] },
  { id: '22', title: 'Ответить клиентам', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: ['RK', 'ML'], startMinute: 14 * 60 + 15, endMinute: 14 * 60 + 30, tags: ["sales","report"] },
  { id: '23', title: 'Правки макета', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.4, assignees: ['SP', 'LJ'], startMinute: 14 * 60 + 40, endMinute: 15 * 60 + 10, tags: ["design","backend"] },
  { id: '24', title: 'Проверка метрик', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.7, assignees: ['AN', 'JD'], startMinute: 16 * 60 + 35, endMinute: 16 * 60 + 55, tags: ["research","sales"] },
  { id: '25', title: 'Чтение статей', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.2, assignees: [], startMinute: 19 * 60, endMinute: 20 * 60, tags: ["research"] },
  { id: '26', title: 'Утренний забег', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 1, assignees: ['MK'], startMinute: 7 * 60, endMinute: 8 * 60, tags: ["ritual","research"] },
  { id: '27', title: 'Подготовка к встрече', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.5, assignees: ['RK'], startMinute: 14 * 60, endMinute: 14 * 60 + 30, tags: ["sales","report"] },
  { id: '28', title: 'Анализ результатов теста', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.1, assignees: ['JD', 'AN'], startMinute: 11 * 60, endMinute: 12 * 60 + 30, tags: ["research","backend"] },
  { id: '29', title: 'Вечерний созвон', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.7, assignees: ['JD', 'AN', 'MK'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 30, tags: ["ritual","report"] },
  { id: '30', title: 'Итоги дня', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.9, assignees: ['AN'], startMinute: 20 * 60 + 40, endMinute: 21 * 60 + 10, tags: ["report","ritual"] },
  { id: '31', title: 'Чек почты перед сном', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 20 * 60 + 45, endMinute: 20 * 60 + 55, tags: ["report"] },
  { id: '32', title: 'Дайджест комьюнити', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.4, assignees: [], startMinute: 21 * 60 + 40, endMinute: 22 * 60 + 15, tags: ["research","sales"] },
  { id: '33', title: 'Чтение главы книги', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.5, assignees: [], startMinute: 21 * 60 + 45, endMinute: 22 * 60 + 30, tags: ["research","ritual"] },
  { id: '34', title: 'Слушаю подкаст', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: [], startMinute: 22 * 60, endMinute: 22 * 60 + 50, tags: ["research"] },
  { id: '35', title: 'Короткая медитация', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 22 * 60 + 55, endMinute: 23 * 60 + 5, tags: ["ritual"] },
  { id: '36', title: 'План на завтра', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.3, assignees: ['JD'], startMinute: 23 * 60, endMinute: 23 * 60 + 30, tags: ["ritual","report"] },
  { id: '37', title: 'Спокойная музыка', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.8, assignees: [], startMinute: 23 * 60 + 30, endMinute: 23 * 60 + 45, tags: ["ritual"] },
  { id: '38', title: 'Последний чай', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 23 * 60 + 50, endMinute: 23 * 60 + 55, tags: ["ritual"] },
  { id: '39', title: 'Совещание по продукту', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.5, assignees: ['MK', 'VR'], startMinute: 17 * 60 + 30, endMinute: 18 * 60 + 30, tags: ["backend","sales","report"] },
  { id: '40', title: 'Тренировка', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 1, assignees: ['MK'], startMinute: 19 * 60, endMinute: 20 * 60, tags: ["ritual","research"] },
  { id: '41', title: 'Ужин с командой', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.7, assignees: ['JD', 'SP', 'VR'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 30, tags: ["ritual"] },
  { id: '42', title: 'Встреча с ментором', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.4, assignees: ['AN'], startMinute: 20 * 60 + 45, endMinute: 21 * 60 + 15, tags: ["report","research"] },
  { id: '43', title: 'Разбор кода', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.6, assignees: ['VR'], startMinute: 22 * 60, endMinute: 23 * 60, tags: ["backend"] },
  { id: '44', title: 'Чтение документации', startDate: new Date(2026, 7, 22), endDate: new Date(2026, 7, 22), progress: 0.3, assignees: [], startMinute: 23 * 60, endMinute: 23 * 60 + 30, tags: ["backend","research"] },
  { id: '45', title: 'Итоги дня', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.8, assignees: ['AN'], startMinute: 20 * 60 + 30, endMinute: 21 * 60 + 15, tags: ["report","ritual"] },
  { id: '46', title: 'Лёгкая прогулка', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 1, assignees: ['MK'], startMinute: 20 * 60 + 45, endMinute: 21 * 60 + 30, tags: ["ritual"] },
  { id: '47', title: 'Чтение', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.4, assignees: [], startMinute: 21 * 60 + 45, endMinute: 22 * 60 + 30, tags: ["research","ritual"] },
  { id: '48', title: 'Подготовка ко сну', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 7, 20), progress: 0.9, assignees: [], startMinute: 22 * 60, endMinute: 23 * 60, tags: ["ritual"] },
  { id: '49', title: 'Внедрение фичи', startDate: new Date(2026, 7, 15), endDate: new Date(2026, 8, 5), progress: 0.55, assignees: ['MK', 'VR'], startMinute: 9 * 60, endMinute: 18 * 60, tags: ["backend","sales"] },
  { id: '50', title: 'Подготовка релиза', startDate: new Date(2026, 7, 18), endDate: new Date(2026, 7, 30), progress: 0.4, assignees: ['JD', 'AN', 'MK'], startMinute: 10 * 60, endMinute: 19 * 60, tags: ["report","backend","design"] },
  { id: '51', title: 'Квартальный отчёт', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 25), progress: 0.65, assignees: ['AN', 'JD'], startMinute: 8 * 60, endMinute: 17 * 60, tags: ["report","sales"] },
  { id: '52', title: 'Миграция базы данных', startDate: new Date(2026, 7, 19), endDate: new Date(2026, 7, 27), progress: 0.3, assignees: ['VR', 'MK'], startMinute: 7 * 60, endMinute: 16 * 60, tags: ["backend","research"] },
  { id: '53', title: 'Опрос пользователей', startDate: new Date(2026, 7, 10), endDate: new Date(2026, 8, 3), progress: 0.5, assignees: ['SP', 'AN'], startMinute: 11 * 60, endMinute: 14 * 60, tags: ["research","design"] },
  { id: '54', title: 'Документация API', startDate: new Date(2026, 7, 20), endDate: new Date(2026, 8, 4), progress: 0.75, assignees: ['VR'], startMinute: 13 * 60, endMinute: 18 * 60, tags: ["backend","research","report"] },
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

function fmtExact(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function pluralDays(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} день`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} дня`
  return `${n} дней`
}

function pluralTasks(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} задача`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} задачи`
  return `${n} задач`
}

const ADD_MODAL_VARIANTS = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, delayChildren: 0.28, staggerChildren: 0.07 } },
}

const ADD_MODAL_ITEM = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } },
}

const MAC_GRID_VARIANTS = {
  hidden: (dir: number) => ({ opacity: 0, x: dir * 34 }),
  show: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 320, damping: 30, staggerChildren: 0.011, delayChildren: 0.04 },
  },
}

const MAC_CELL_VARIANTS = {
  hidden: { opacity: 0, y: 16, scale: 0.6 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 480, damping: 26 },
  },
}

const TAG_PALETTE = ['#ff4d4d', '#ff9d5c', '#4fd4c4', '#4c8dff', '#a78bfa', '#ffd43b', '#69db7c', '#f783ac']

const WHEEL_ITEM_H = 40
const WHEEL_VISIBLE = 5
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 60 }, (_, m) => m)

function TimeWheel({ options, value, onChange }: { options: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const idx = options.indexOf(value)
    if (idx < 0) return
    if (Math.abs(el.scrollTop - idx * WHEEL_ITEM_H) > WHEEL_ITEM_H / 2) {
      el.scrollTop = idx * WHEEL_ITEM_H
    }
    lastEmitted.current = value
  }, [value, options])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = Math.round(el.scrollTop / WHEEL_ITEM_H)
    if (idx >= 0 && idx < options.length) {
      const v = options[idx]
      if (v !== lastEmitted.current) {
        lastEmitted.current = v
        onChange(v)
      }
    }
  }

  return (
    <div className="mac-wheel">
      <div
        ref={ref}
        onScroll={onScroll}
        className="mac-wheel-list"
        style={{
          height: WHEEL_ITEM_H * WHEEL_VISIBLE,
          paddingTop: (WHEEL_ITEM_H * (WHEEL_VISIBLE - 1)) / 2,
          paddingBottom: (WHEEL_ITEM_H * (WHEEL_VISIBLE - 1)) / 2,
        }}
      >
        {options.map((o) => (
          <div key={o} className="mac-wheel-item" style={{ height: WHEEL_ITEM_H }}>
            <span className={`mac-wheel-val${o === value ? ' on' : ''}`}>{String(o).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className="mac-wheel-mask top" />
      <div className="mac-wheel-mask bottom" />
      <div className="mac-wheel-bar" />
    </div>
  )
}

function fmtRange(a: Date, b: Date) {
  const f = (d: Date) => `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
  return `от ${f(a)} до ${f(b)}`
}

type PresetKey = 'today' | 'tomorrow' | 'week' | 'nextweek' | 'month'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'week', label: 'Эта неделя' },
  { key: 'nextweek', label: 'След. неделя' },
  { key: 'month', label: 'Месяц' },
]

function MacCalendar({
  mode,
  start,
  end,
  periodStage,
  month,
  tasks,
  projects,
  onMonthChange,
  onPick,
  hover,
  onHover,
}: {
  mode: 'single' | 'range'
  start: CalendarDateTime
  end: CalendarDateTime
  periodStage: 0 | 1 | 2
  month: Date
  tasks: GanttTaskEx[]
  projects: Record<string, { label: string; color: string }>
  onMonthChange: (m: Date) => void
  onPick: (d: Date) => void
  hover: Date | null
  onHover: (d: Date | null) => void
}) {
  const y = month.getFullYear()
  const m = month.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const dim = new Date(y, m + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < 6 * 7; i++) {
    const d = i - offset + 1
    cells.push(d >= 1 && d <= dim ? new Date(y, m, d) : null)
  }

  const sT = start.toDate(getLocalTimeZone()).getTime()
  const hasRange = mode === 'range' && periodStage >= 1
  const previewEnd = mode === 'range' && periodStage === 1 && hover && hover.getTime() !== sT ? hover : null
  const finalEnd = mode === 'range' && periodStage === 2 ? end.toDate(getLocalTimeZone()) : null
  const rangeEnd = previewEnd ?? finalEnd
  const lo = rangeEnd ? Math.min(sT, rangeEnd.getTime()) : 0
  const hi = rangeEnd ? Math.max(sT, rangeEnd.getTime()) : 0

  const taskColor = (t: GanttTaskEx) => (t.tags[0] ? projects[t.tags[0]]?.color : undefined) ?? 'rgba(255,255,255,0.45)'

  const dayTasksFor = (d: Date) => tasks.filter((t) => d >= t.startDate && d <= t.endDate)

  const selDate = start.toDate(getLocalTimeZone())
  const footFrom = selDate
  const footTo = mode === 'range' && periodStage === 2 ? end.toDate(getLocalTimeZone()) : selDate
  const footCount = tasks.filter((t) => t.startDate <= footTo && t.endDate >= footFrom).length

  const monthDir = useRef(0)
  const prevMonthKey = useRef(month.getTime())
  if (month.getTime() !== prevMonthKey.current) {
    monthDir.current = month.getTime() > prevMonthKey.current ? 1 : -1
    prevMonthKey.current = month.getTime()
  }

  const spotX = useMotionValue(50)
  const spotY = useMotionValue(50)
  const spotBg = useMotionTemplate`radial-gradient(150px circle at ${spotX}% ${spotY}%, rgba(10,132,255,0.14), transparent 70%)`

  const onSpotMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    spotX.set(((e.clientX - r.left) / r.width) * 100)
    spotY.set(((e.clientY - r.top) / r.height) * 100)
  }

  return (
    <div className="mac-cal-wrap">
      <div className="mac-cal-head">
        <button
          type="button"
          className="mac-cal-today"
          onClick={() => onMonthChange(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}
        >
          Сегодня
        </button>
        <motion.div
          key={`${y}-${m}`}
          className="mac-cal-title"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {MONTHS_NOM[m]} {y}
        </motion.div>
        <div className="mac-cal-nav">
          <button
            type="button"
            className="mac-cal-nav-btn"
            onClick={() => onMonthChange(new Date(y, m - 1, 1))}
            aria-label="Предыдущий месяц"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="mac-cal-nav-btn"
            onClick={() => onMonthChange(new Date(y, m + 1, 1))}
            aria-label="Следующий месяц"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <motion.div
        key={`grid-${y}-${m}`}
        custom={monthDir.current}
        variants={MAC_GRID_VARIANTS}
        initial="hidden"
        animate="show"
      >
        <div className="mac-cal-week">
          {WEEKDAYS_SHORT.map((w, i) => (
            <div key={w} className={i >= 5 ? 'we' : ''}>
              {w}
            </div>
          ))}
        </div>
        <div className="mac-cal-grid" onMouseLeave={() => onHover(null)} onMouseMove={onSpotMove}>
          <div className="mac-cal-spot" style={{ background: spotBg } as unknown as React.CSSProperties} />
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="mac-cal-day" />
            const t = d.getTime()
            const today = isSameDay(d, TODAY)
            const isStart = hasRange && t === sT
            const isEnd = finalEnd ? t === finalEnd.getTime() : false
            const isPreview = previewEnd ? t === previewEnd.getTime() : false
            const selSingle = mode === 'single' && isSameDay(d, start.toDate(getLocalTimeZone()))
            const selected = isStart || isEnd || selSingle
            const inPill = hasRange && rangeEnd && t >= lo && t <= hi
            const hasPill = inPill && !(lo === hi && t === lo)
            const dayTasks = dayTasksFor(d)
            return (
              <motion.button
                key={i}
                variants={MAC_CELL_VARIANTS}
                type="button"
                className="mac-cal-day"
                onClick={() => onPick(d)}
                onMouseEnter={() => onHover(d)}
              >
                {hasPill && (
                  <span
                    key={periodStage}
                    className={`mac-cal-bar${previewEnd ? ' prev' : ''}`}
                    style={previewEnd ? undefined : { animationDelay: `${Math.min(280, ((t - lo) / 86400000) * 20)}ms` }}
                  />
                )}
                <span
                  className={`mac-cal-num${selected ? ' sel' : ''}${isPreview ? ' preview' : ''}${today ? ' today' : ''}`}
                >
                  {d.getDate()}
                </span>
                {selected && <span className="mac-cal-ripple" />}
                {dayTasks.length > 0 && (
                  <span className={`mac-cal-dots${selected ? ' on-sel' : ''}${today && !selected ? ' on-today' : ''}`}>
                    {dayTasks.slice(0, 3).map((tk) => (
                      <span
                        key={tk.id}
                        className="mac-cal-dot"
                        style={selected || today ? undefined : { background: taskColor(tk) }}
                      />
                    ))}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
      <div className="mac-cal-foot">
        {mode === 'range' && periodStage === 0 && (
          <span className="mac-cal-hint">
            <span className="mac-dot" />
            Выберите дату начала
          </span>
        )}
        {mode === 'range' && periodStage === 1 && (
          <span className="mac-cal-hint">
            <span className="mac-dot" />
            Выберите дату окончания
          </span>
        )}
        {!(mode === 'range' && periodStage < 2) && footCount > 0 && (
          <span className="mac-cal-foot-info">
            <span className="mac-foot-dot" />
            {pluralTasks(footCount)}
            {mode === 'range' ? ' в периоде' : ' на этот день'}
          </span>
        )}
      </div>
    </div>
  )
}

type AddTaskData = {
  title: string
  startDate: Date
  endDate: Date
  startMinute: number
  endMinute: number
  tags: string[]
}

function AddTaskModal({
  open,
  initialDay,
  projects,
  tasks,
  onClose,
  onAdd,
  onAddProject,
}: {
  open: boolean
  initialDay: Date
  projects: Record<string, { label: string; color: string }>
  tasks: GanttTaskEx[]
  onClose: () => void
  onAdd: (data: AddTaskData) => void
  onAddProject: (key: string, project: { label: string; color: string }) => void
}) {
  const [newTitle, setNewTitle] = useState('')
  const [date, setDate] = useState<CalendarDateTime | null>(null)
  const [endDate, setEndDate] = useState<CalendarDateTime | null>(null)
  const [usePeriod, setUsePeriod] = useState(false)
  const [periodStage, setPeriodStage] = useState<0 | 1 | 2>(0)
  const [allDay, setAllDay] = useState(false)
  const [picker, setPicker] = useState<'start' | 'end' | null>(null)
  const [newTags, setNewTags] = useState<string[]>(['ritual'])
  const [newProjOpen, setNewProjOpen] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [calMonth, setCalMonth] = useState<Date>(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [calHover, setCalHover] = useState<Date | null>(null)
  const wasOpen = useRef(false)
  const pickerWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true
      const now = new Date()
      const m = isSameDay(initialDay, now) ? now.getHours() * 60 + now.getMinutes() : 9 * 60
      const em = Math.min(24 * 60 - 1, m + 30)
      const mk = (min: number) =>
        new CalendarDateTime(initialDay.getFullYear(), initialDay.getMonth() + 1, initialDay.getDate(), Math.floor(min / 60), min % 60)
      setDate(mk(m))
      setEndDate(mk(em))
      setUsePeriod(false)
      setPeriodStage(0)
      setAllDay(false)
      setPicker(null)
      setNewTitle('')
      setNewTags(['ritual'])
      setNewProjOpen(false)
      setNewProjName('')
      setCalMonth(new Date(initialDay.getFullYear(), initialDay.getMonth(), 1))
      setCalHover(null)
    }
    if (!open) wasOpen.current = false
  }, [open, initialDay])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (picker) setPicker(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, picker])

  useEffect(() => {
    if (!picker) return
    const onDown = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) setPicker(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [picker])

  const setTime = (side: 'start' | 'end', part: { hour?: number; minute?: number }) => {
    if (side === 'start') setDate((d) => (d ? d.set(part) : d))
    else setEndDate((d) => (d ? d.set(part) : d))
  }

  const pickDay = (d: Date) => {
    if (!date || !endDate) return
    const day = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
    if (!usePeriod) {
      setDate(date.set(day))
      setEndDate(endDate.set(day))
      return
    }
    if (periodStage === 0 || periodStage === 2) {
      setDate(date.set(day))
      setEndDate(endDate.set(day))
      setPeriodStage(1)
      return
    }
    if (d.getTime() < date.toDate(getLocalTimeZone()).getTime()) setDate(date.set(day))
    else setEndDate(endDate.set(day))
    setPeriodStage(2)
  }

  const setPeriod = (v: boolean) => {
    setUsePeriod(v)
    setPeriodStage(0)
    setPicker(null)
  }

  const toggleAllDay = () => {
    setAllDay((a) => !a)
    setPicker(null)
  }

  const applyPreset = (key: PresetKey) => {
    if (!date || !endDate) return
    const set = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() })
    const d0 = new Date(TODAY)
    let s: Date
    let e: Date
    const wd = (d0.getDay() + 6) % 7
    switch (key) {
      case 'tomorrow': {
        s = new Date(d0)
        s.setDate(s.getDate() + 1)
        e = s
        break
      }
      case 'week': {
        s = new Date(d0)
        s.setDate(s.getDate() - wd)
        e = new Date(s)
        e.setDate(e.getDate() + 6)
        break
      }
      case 'nextweek': {
        s = new Date(d0)
        s.setDate(s.getDate() - wd + 7)
        e = new Date(s)
        e.setDate(e.getDate() + 6)
        break
      }
      case 'month': {
        s = new Date(d0.getFullYear(), d0.getMonth(), 1)
        e = new Date(d0.getFullYear(), d0.getMonth() + 1, 0)
        break
      }
      default: {
        s = new Date(d0)
        e = s
      }
    }
    setDate(date.set(set(s)))
    setEndDate(endDate.set(set(e)))
    setCalMonth(new Date(s.getFullYear(), s.getMonth(), 1))
    setPicker(null)
    if (s.getTime() !== e.getTime()) {
      setUsePeriod(true)
      setPeriodStage(2)
    } else {
      setPeriodStage(0)
    }
  }

  const dayCount =
    usePeriod && periodStage === 2 && date && endDate
      ? Math.round((endDate.toDate(getLocalTimeZone()).getTime() - date.toDate(getLocalTimeZone()).getTime()) / 86400000) + 1
      : null

  const toggleNewTag = (key: string) => {
    setNewTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))
  }

  const addProject = (color: string) => {
    const name = newProjName.trim()
    if (!name) return
    const key = `custom-${Date.now()}`
    onAddProject(key, { label: name, color })
    setNewTags((prev) => [...prev, key])
    setNewProjName('')
    setNewProjOpen(false)
  }

  const submit = () => {
    const trimmed = newTitle.trim()
    if (!trimmed || !date || !endDate) return
    const sd = date.toDate(getLocalTimeZone())
    const ed = endDate.toDate(getLocalTimeZone())
    let startMin = allDay ? 0 : date.hour * 60 + date.minute
    let endMin = allDay ? 24 * 60 : endDate.hour * 60 + endDate.minute
    if (isSameDay(sd, ed) && endMin <= startMin) endMin = Math.min(24 * 60, startMin + 30)
    onAdd({
      title: trimmed,
      startDate: sd,
      endDate: ed,
      startMinute: startMin,
      endMinute: endMin,
      tags: newTags.length > 0 ? newTags : ['ritual'],
    })
    setNewTitle('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="add-modal" className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ background: 'rgba(4,5,8,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={onClose}
          />
          <motion.div
            layoutId="add-modal"
            variants={ADD_MODAL_VARIANTS}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 250, damping: 30 }}
            className="absolute inset-0 flex items-center justify-center p-5 overflow-y-auto"
          >
            <div
              className="add-glow"
              style={{
                width: 560,
                height: 560,
                top: '-12%',
                left: '-6%',
                background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 65%)',
              }}
            />
            <div
              className="add-glow"
              style={{
                width: 460,
                height: 460,
                bottom: '-14%',
                right: '-5%',
                background: 'radial-gradient(circle, rgba(192,38,211,0.24) 0%, transparent 65%)',
              }}
            />
            <div
              className="add-glow"
              style={{
                width: 400,
                height: 400,
                top: '28%',
                right: '18%',
                background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 65%)',
              }}
            />
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
              className="modal-glass relative z-10 w-full max-w-[840px] p-7 flex flex-col gap-5"
            >
              <motion.div variants={ADD_MODAL_ITEM} className="flex items-start justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[#fff] leading-none">Новая задача</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  title="Закрыть (Esc)"
                  className="flex items-center justify-center size-9 rounded-xl btn-icon border transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                </button>
              </motion.div>

              <motion.div variants={ADD_MODAL_ITEM}>
                <div
                  className="flex items-center rounded-xl border transition-colors px-4"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Что добавить в расписание?"
                    className="input-base flex-1 py-3.5 text-[15px] focus:outline-none"
                  />
                  <span className="text-[10px] text-[var(--text-faint)] shrink-0">задача</span>
                </div>
              </motion.div>

              <motion.div
                variants={ADD_MODAL_ITEM}
                className="rounded-[22px] p-5"
                style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div className="mac-section-title">Дата и время</div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[rgba(245,245,247,0.5)] select-none">Весь день</span>
                      <button type="button" className={`mac-switch${allDay ? ' on' : ''}`} onClick={toggleAllDay} aria-label="Весь день">
                        <span className="mac-switch-knob" />
                      </button>
                    </div>
                    <div className="mac-seg">
                      <button type="button" className={!usePeriod ? 'on' : ''} onClick={() => setPeriod(false)}>
                        {!usePeriod && (
                          <motion.span
                            layoutId="mac-seg-thumb"
                            className="mac-seg-thumb"
                            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                          />
                        )}
                        <span className="mac-seg-label">День</span>
                      </button>
                      <button type="button" className={usePeriod ? 'on' : ''} onClick={() => setPeriod(true)}>
                        {usePeriod && (
                          <motion.span
                            layoutId="mac-seg-thumb"
                            className="mac-seg-thumb"
                            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                          />
                        )}
                        <span className="mac-seg-label">Период</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="flex-1 min-w-0 flex flex-col gap-4">
                    <div className="mac-datehead select-none">
                      {!usePeriod && date && (
                        <motion.div
                          key={`single-${date.year}-${date.month}-${date.day}`}
                          initial={{ opacity: 0, y: 14, rotateX: 55, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                          style={{ transformPerspective: 640 }}
                        >
                          <div className={`mac-dow${isSameDay(date.toDate(getLocalTimeZone()), TODAY) ? ' today' : ''}`}>
                            {WEEKDAYS_FULL[date.toDate(getLocalTimeZone()).getDay()]}
                          </div>
                          <div className="mac-date-big">
                            {date.day} {MONTHS_GEN[date.month - 1]}
                          </div>
                          <div className="mac-date-sub">{fmtExact(date.hour * 60 + date.minute)}</div>
                        </motion.div>
                      )}
                      {usePeriod && periodStage === 0 && (
                        <div className="mac-hint">
                          <span className="mac-dot" />
                          Выберите дату начала
                        </div>
                      )}
                      {usePeriod && periodStage === 1 && date && (
                        <motion.div
                          key={`pick-${date.year}-${date.month}-${date.day}`}
                          initial={{ opacity: 0, y: 14, rotateX: 55, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                          style={{ transformPerspective: 640 }}
                        >
                          <div className="mac-dow">
                            Начало · {WEEKDAYS_FULL[date.toDate(getLocalTimeZone()).getDay()]}
                          </div>
                          <div className="mac-date-big">
                            {date.day} {MONTHS_GEN[date.month - 1]}
                          </div>
                          <div className="mac-hint" style={{ marginTop: 12 }}>
                            <span className="mac-dot" />
                            Выберите дату окончания
                          </div>
                        </motion.div>
                      )}
                      {usePeriod && periodStage === 2 && date && endDate && (
                        <motion.div
                          key={`range-${date.year}-${date.month}-${date.day}-${endDate.day}`}
                          initial={{ opacity: 0, y: 14, rotateX: 55, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                          style={{ transformPerspective: 640 }}
                        >
                          <div className="mac-dow">
                            {WEEKDAYS_FULL[date.toDate(getLocalTimeZone()).getDay()]} —{' '}
                            {WEEKDAYS_FULL[endDate.toDate(getLocalTimeZone()).getDay()]}
                          </div>
                          <div className="mac-date-big mac-sheen">
                            {date.month === endDate.month
                              ? `${date.day} — ${endDate.day} ${MONTHS_GEN[endDate.month - 1]}`
                              : `${date.day} ${MONTHS_GEN[date.month - 1]} — ${endDate.day} ${MONTHS_GEN[endDate.month - 1]}`}
                          </div>
                          {dayCount && (
                            <div className="mac-date-sub" style={{ marginTop: 8 }}>
                              <span className="mac-days">{pluralDays(dayCount)}</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    <div className="mac-presets">
                      {PRESETS.map((p) => (
                        <button key={p.key} type="button" className="mac-preset" onClick={() => applyPreset(p.key)}>
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {!allDay && date && (
                      <div className="mt-auto">
                        <div ref={pickerWrapRef} className="relative">
                          <div className="mac-time">
                            <button
                              type="button"
                              onClick={() => setPicker(picker === 'start' ? null : 'start')}
                              className={`mac-time-pill${picker === 'start' ? ' on' : ''}`}
                            >
                              {usePeriod && <span className="mac-time-label">с</span>}
                              {fmtExact(date.hour * 60 + date.minute)}
                            </button>
                            {usePeriod && endDate && (
                              <>
                                <span className="mac-time-arrow">—</span>
                                <button
                                  type="button"
                                  onClick={() => setPicker(picker === 'end' ? null : 'end')}
                                  className={`mac-time-pill${picker === 'end' ? ' on' : ''}`}
                                >
                                  <span className="mac-time-label">по</span>
                                  {fmtExact(endDate.hour * 60 + endDate.minute)}
                                </button>
                              </>
                            )}
                          </div>
                          <AnimatePresence>
                            {picker && date && (!usePeriod || endDate) && (
                              <motion.div
                                key="time-popover"
                                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                className="mac-picker"
                              >
                                <TimeWheel
                                  options={HOURS}
                                  value={(picker === 'start' ? date : endDate!).hour}
                                  onChange={(h) => setTime(picker, { hour: h })}
                                />
                                <span className="text-[20px] font-bold text-[rgba(245,245,247,0.35)]">:</span>
                                <TimeWheel
                                  options={MINUTES}
                                  value={(picker === 'start' ? date : endDate!).minute}
                                  onChange={(m) => setTime(picker, { minute: m })}
                                />
                                <button type="button" onClick={() => setPicker(null)} className="mac-picker-done">
                                  Готово
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </div>

                  {date && endDate && (
                    <MacCalendar
                      mode={usePeriod ? 'range' : 'single'}
                      start={date}
                      end={endDate}
                      periodStage={periodStage}
                      month={calMonth}
                      tasks={tasks}
                      projects={projects}
                      onMonthChange={setCalMonth}
                      onPick={pickDay}
                      hover={calHover}
                      onHover={setCalHover}
                    />
                  )}
                </div>
              </motion.div>

              <motion.div variants={ADD_MODAL_ITEM}>
                <div className="text-[9px] uppercase tracking-widest text-[var(--text-faint)] mb-2 flex items-center gap-1.5">
                  <span className="size-[5px] rounded-full" style={{ background: '#ff4d4d', boxShadow: '0 0 6px rgba(255,77,77,0.8)' }} />
                  Проекты
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.entries(projects).map(([key, p]) => {
                    const on = newTags.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleNewTag(key)}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[10px] font-semibold transition-all select-none"
                        style={{
                          background: on ? `${p.color}22` : 'rgba(255,255,255,0.03)',
                          color: on ? p.color : 'rgba(255,255,255,0.4)',
                          border: `1px solid ${on ? `${p.color}88` : 'rgba(255,255,255,0.08)'}`,
                          boxShadow: on ? `0 0 10px ${p.color}30` : undefined,
                        }}
                      >
                        <span
                          className="size-[6px] rounded-full"
                          style={{ background: on ? p.color : 'rgba(255,255,255,0.3)', boxShadow: on ? `0 0 6px ${p.color}` : undefined }}
                        />
                        {p.label}
                      </button>
                    )
                  })}
                  {newProjOpen ? (
                    <div className="flex items-center gap-1.5 rounded-full pl-2 pr-1.5 py-1 border transition-colors" style={{ borderColor: 'rgba(255,77,77,0.35)', background: 'rgba(255,255,255,0.03)' }}>
                      <input
                        autoFocus
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addProject(TAG_PALETTE[0])
                          if (e.key === 'Escape') setNewProjOpen(false)
                        }}
                        placeholder="Название проекта"
                        className="input-base w-[110px] text-[10px] font-semibold"
                      />
                      <div className="flex items-center gap-1">
                        {TAG_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            title={c}
                            onClick={() => addProject(c)}
                            className="size-[14px] rounded-full transition-transform hover:scale-125"
                            style={{ background: c, boxShadow: `0 0 6px ${c}66`, border: '1px solid rgba(0,0,0,0.3)' }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNewProjOpen(true)}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-semibold transition-all select-none"
                      style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)', border: '1px dashed rgba(255,255,255,0.18)' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Новый
                    </button>
                  )}
                </div>
              </motion.div>

              <motion.div variants={ADD_MODAL_ITEM} className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn h-11 px-5 rounded-xl text-[12px] font-semibold transition-all hover:brightness-110"
                  style={{ color: '#ff8f8f', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.35)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn flex-1 h-11 rounded-xl text-[13px] font-semibold justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #15803d)',
                    color: '#fff',
                    boxShadow: '0 4px 22px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Добавить задачу
                </button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
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
  const indicatorRef = useRef<HTMLDivElement>(null)
  const scrollLeftRef = useRef(0)
  const miniWRef = useRef(1)
  const centeredRef = useRef(false)
  const rafRef = useRef(0)
  const scrollAnimRef = useRef<Animation | null>(null)
  const layoutRef = useRef({ offset: 0, mainW: 0, totalW: 0, viewportW: 0, prevDay: new Date(TODAY), nextDay: new Date(TODAY), currentDay: new Date(TODAY) })
  const [viewDay, setViewDay] = useState<Date>(new Date(TODAY))
  const [currentDay, setCurrentDay] = useState(new Date(TODAY))
  const [nowMinute, setNowMinute] = useState(() => new Date().getHours() * 60 + new Date().getMinutes())
  const [viewportW, setViewportW] = useState(0)
  const [hoverMin, setHoverMin] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set())
  const [extraProjects, setExtraProjects] = useState<Record<string, { label: string; color: string }>>({})
  const [mockTasks, setMockTasks] = useState<GanttTaskEx[]>(MOCK_TASKS)
  const [adding, setAdding] = useState(false)
  const pendingScrollMin = useRef<number | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ key: number; x: number; y: number; task: GanttTaskEx } | null>(null)
  const ctxAnchorRef = useRef<HTMLDivElement>(null)

  const prevDay = useMemo(() => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() - 1)
    return d
  }, [currentDay])
  const nextDay = useMemo(() => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() + 1)
    return d
  }, [currentDay])

  const tasksForDay = useCallback(
    (day: Date) => mockTasks.filter((t) => day >= t.startDate && day <= t.endDate && t.tags.some((tag) => !hiddenProjects.has(tag))),
    [mockTasks, hiddenProjects]
  )

  const hasPrevTasks = tasksForDay(prevDay).length > 0
  const hasNextTasks = tasksForDay(nextDay).length > 0

  const buildScale = useCallback(
    (day: Date, winStart: number, winLen: number) => {
    const winEnd = winStart + winLen

    const smalls: { l: number; r: number; dur: number }[] = []
    for (const t of tasksForDay(day)) {
      const l = isSameDay(day, t.startDate) ? t.startMinute : 0
      const r = isSameDay(day, t.endDate) ? t.endMinute : 24 * 60
      const cl = Math.max(l, winStart)
      const cr = Math.min(r, winEnd)
      if (cr <= cl) continue
      const dur = cr - cl
      if (dur < SMALL_MIN) smalls.push({ l: cl, r: cr, dur })
    }

    const xOf = (min: number) => Math.max(0, min - winStart) * BASE_PX_MIN
    if (smalls.length === 0) {
      return { xOf, width: winLen * BASE_PX_MIN, invert: (x: number) => winStart + x / BASE_PX_MIN, segs: [{ start: winStart, end: winEnd, pxPerMin: BASE_PX_MIN }] }
    }

    smalls.sort((a, b) => a.l - b.l)
    const groups: { l: number; r: number; members: { l: number; r: number; dur: number }[] }[] = []
    for (const s of smalls) {
      const last = groups[groups.length - 1]
      if (last && s.l <= last.r) {
        last.r = Math.max(last.r, s.r)
        last.members.push(s)
      } else {
        groups.push({ l: s.l, r: s.r, members: [s] })
      }
    }

    const segs: { start: number; end: number; pxPerMin: number }[] = []
    let cursor = winStart
    for (const g of groups) {
      if (g.l > cursor) segs.push({ start: cursor, end: g.l, pxPerMin: BASE_PX_MIN })
      const bounds = Array.from(new Set(g.members.flatMap((m) => [m.l, m.r]))).sort((a, b) => a - b)
      for (let bi = 0; bi < bounds.length - 1; bi++) {
        const a = bounds[bi]
        const b = bounds[bi + 1]
        let ppm = BASE_PX_MIN
        for (const m of g.members) {
          if (m.l <= a && m.r >= b) ppm = Math.max(ppm, Math.min(MAX_SCALE, TARGET_SMALL_W / m.dur))
        }
        segs.push({ start: a, end: b, pxPerMin: ppm })
      }
      cursor = g.r
    }
    if (cursor < winEnd) segs.push({ start: cursor, end: winEnd, pxPerMin: BASE_PX_MIN })

    const offsets: number[] = [0]
    for (let i = 0; i < segs.length; i++) offsets.push(offsets[i] + (segs[i].end - segs[i].start) * segs[i].pxPerMin)
    const width = offsets[offsets.length - 1]

    const xOfB = (min: number) => {
      const m = Math.max(winStart, Math.min(winEnd, min))
      let lo = 0
      let hi = segs.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (segs[mid].end < m) lo = mid + 1
        else hi = mid
      }
      return offsets[lo] + (m - segs[lo].start) * segs[lo].pxPerMin
    }

    const invert = (x: number) => {
      let lo = 0
      let hi = segs.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (offsets[mid] <= x) lo = mid
        else hi = mid - 1
      }
      return winStart + segs[lo].start + (x - offsets[lo]) / segs[lo].pxPerMin
    }

    return { xOf: xOfB, width, invert, segs }
  }, [tasksForDay])

  const mainScale = useMemo(() => buildScale(currentDay, 0, 24 * 60), [buildScale, currentDay])
  const prevScale = useMemo(() => buildScale(prevDay, hasPrevTasks ? 0 : (24 - BUFFER_HOURS) * 60, hasPrevTasks ? 24 * 60 : BUFFER_HOURS * 60), [buildScale, prevDay, hasPrevTasks])
  const nextScale = useMemo(() => buildScale(nextDay, 0, hasNextTasks ? 24 * 60 : BUFFER_HOURS * 60), [buildScale, nextDay, hasNextTasks])

  const mainW = mainScale.width
  const prevW = prevScale.width
  const nextW = nextScale.width
  const offset = prevW
  const totalW = prevW + mainW + nextW

  layoutRef.current = { offset, mainW, totalW, viewportW, prevDay, nextDay, currentDay }

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNowMinute(d.getHours() * 60 + d.getMinutes())
    }, 60000)
    return () => clearInterval(id)
  }, [])

  const centerXRef = useRef(0)
  centerXRef.current = offset + mainScale.xOf(8 * 60)

  const syncIndicator = useCallback(() => {
    const ind = indicatorRef.current
    if (!ind) return
    ind.style.transform = `translateX(${(scrollLeftRef.current / layoutRef.current.totalW) * miniWRef.current}px)`
  }, [])

  const updateViewDay = useCallback(() => {
    const L = layoutRef.current
    const start = scrollLeftRef.current
    const end = start + (L.viewportW || 0)
    const overlap = (rs: number, re: number) => Math.max(0, Math.min(re, end) - Math.max(rs, start))
    const ovPrev = overlap(0, L.offset)
    const ovMain = overlap(L.offset, L.offset + L.mainW)
    const ovNext = overlap(L.offset + L.mainW, L.totalW)
    const next = ovNext > ovMain && ovNext > ovPrev ? L.nextDay : ovPrev > ovMain && ovPrev > ovNext ? L.prevDay : L.currentDay
    setViewDay((prev) => (prev.getTime() === next.getTime() ? prev : next))
  }, [])

  const applyCenter = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return false
    el.scrollLeft = centerXRef.current - el.clientWidth / 2
    scrollLeftRef.current = el.scrollLeft
    if (!SUPPORTS_SCROLL_TIMELINE) syncIndicator()
    return true
  }, [syncIndicator])

  useEffect(() => {
    centeredRef.current = false
    applyCenter()
    updateViewDay()
  }, [currentDay, applyCenter, updateViewDay])

  useLayoutEffect(() => {
    const ind = indicatorRef.current
    if (!ind) return
    const p = ind.parentElement
    if (!p) return
    miniWRef.current = p.clientWidth
    const indW = (layoutRef.current.viewportW / layoutRef.current.totalW) * miniWRef.current
    const end = Math.max(0, miniWRef.current - indW)
    if (SUPPORTS_SCROLL_TIMELINE) {
      const el = scrollRef.current
      if (!el) return
      scrollAnimRef.current?.cancel()
      scrollAnimRef.current = ind.animate(
        [{ transform: 'translateX(0px)' }, { transform: `translateX(${end}px)` }],
        { timeline: new ScrollTimeline({ source: el, axis: 'inline' }), duration: 1, fill: 'both' }
      )
    } else {
      syncIndicator()
    }
  })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth
      setViewportW(cw)
      if (cw > 0 && !centeredRef.current) applyCenter()
      updateViewDay()
    })
    ro.observe(el)
    setViewportW(el.clientWidth)
    return () => ro.disconnect()
  }, [applyCenter, updateViewDay])

  useLayoutEffect(() => {
    if (pendingScrollMin.current == null) return
    const min = pendingScrollMin.current
    pendingScrollMin.current = null
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return
    el.scrollLeft = Math.max(0, offset + mainScale.xOf(min) - el.clientWidth * 0.25)
    scrollLeftRef.current = el.scrollLeft
    if (!SUPPORTS_SCROLL_TIMELINE) syncIndicator()
  }, [mockTasks, mainScale, offset, syncIndicator])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    scrollLeftRef.current = el.scrollLeft
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        updateViewDay()
      })
    }
  }, [updateViewDay])

  useEffect(() => {
    if (SUPPORTS_SCROLL_TIMELINE) return
    let raf = 0
    const tick = () => {
      const el = scrollRef.current
      if (el && el.scrollLeft !== scrollLeftRef.current) {
        scrollLeftRef.current = el.scrollLeft
        syncIndicator()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [syncIndicator])

  const smoothTargetRef = useRef(0)
  const smoothRAFRef = useRef(0)

  const smoothTick = useCallback(() => {
    smoothRAFRef.current = 0
    const el = scrollRef.current
    if (!el) return
    const diff = smoothTargetRef.current - el.scrollLeft
    if (Math.abs(diff) < 0.5) return
    const step = Math.max(-MAX_SMOOTH_PX, Math.min(MAX_SMOOTH_PX, diff * SMOOTH_FACTOR))
    el.scrollLeft = el.scrollLeft + step
    scrollLeftRef.current = el.scrollLeft
    smoothRAFRef.current = requestAnimationFrame(smoothTick)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX
      const dy = e.deltaY
      if (Math.abs(dx) <= Math.abs(dy)) return
      e.preventDefault()
      const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1
      const max = el.scrollWidth - el.clientWidth
      smoothTargetRef.current = Math.max(0, Math.min(max, el.scrollLeft + dx * mult))
      if (!smoothRAFRef.current) smoothRAFRef.current = requestAnimationFrame(smoothTick)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [smoothTick])

  const scrollToHour = useCallback((hour: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = offset + mainScale.xOf(hour * 60) - el.clientWidth / 2
    el.scrollTo({ left: target, behavior: 'smooth' })
  }, [offset, mainScale])

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
    const minute = mainScale.invert(absX - offset)
    if (minute >= -30 && minute <= 24 * 60 + 30) {
      setHoverMin(Math.round(Math.max(0, Math.min(24 * 60, minute))))
      setHoverX(absX)
    } else {
      setHoverMin(null)
    }
  }, [offset, mainScale])

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

  const viewToday = isSameDay(viewDay, TODAY)

  const dayRelName = (d: Date) => {
    if (isSameDay(d, TODAY)) return 'Сегодня'
    const tm = new Date(TODAY)
    tm.setDate(tm.getDate() + 1)
    if (isSameDay(d, tm)) return 'Завтра'
    const yd = new Date(TODAY)
    yd.setDate(yd.getDate() - 1)
    if (isSameDay(d, yd)) return 'Вчера'
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
  }

  const toggleProject = (key: string) => {
    setHiddenProjects((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hourSlots: { x: number; hour: number; isBuffer: boolean }[] = []
  const addHours = (scale: ReturnType<typeof buildScale>, xOffset: number, isBuffer: boolean) => {
    for (let h = 0; h < 24; h++) hourSlots.push({ x: xOffset + scale.xOf(h * 60), hour: h, isBuffer })
  }
  if (hasPrevTasks) {
    addHours(prevScale, 0, true)
  } else {
    for (let h = 24 - BUFFER_HOURS; h < 24; h++) hourSlots.push({ x: prevScale.xOf(h * 60), hour: h, isBuffer: true })
  }
  addHours(mainScale, offset, false)
  if (hasNextTasks) {
    addHours(nextScale, offset + mainW, true)
  } else {
    for (let h = 0; h < BUFFER_HOURS; h++) hourSlots.push({ x: offset + mainW + nextScale.xOf(h * 60), hour: h, isBuffer: true })
  }

  const minTicks: { x: number; isBuffer: boolean }[] = []
  const collectTicks = (scale: ReturnType<typeof buildScale>, xOffset: number, isBuffer: boolean) => {
    for (const seg of scale.segs) {
      if (seg.pxPerMin <= BASE_PX_MIN * 1.5) continue
      const step = Math.max(1, Math.round(40 / seg.pxPerMin))
      for (let m = Math.ceil(seg.start / step) * step; m < seg.end; m += step) {
        minTicks.push({ x: xOffset + scale.xOf(m), isBuffer })
      }
    }
  }
  collectTicks(prevScale, 0, true)
  collectTicks(mainScale, offset, false)
  collectTicks(nextScale, offset + mainW, true)

  const minLabels: { x: number; text: string; isBuffer: boolean }[] = []
  const collectLabels = (scale: ReturnType<typeof buildScale>, xOffset: number, isBuffer: boolean) => {
    for (const seg of scale.segs) {
      if (seg.pxPerMin <= BASE_PX_MIN * 1.5) continue
      const step = Math.max(5, Math.round(50 / seg.pxPerMin / 5) * 5)
      for (let m = Math.ceil(seg.start / step) * step; m < seg.end; m += step) {
        if (m % 60 === 0) continue
        minLabels.push({
          x: xOffset + scale.xOf(m),
          text: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
          isBuffer,
        })
      }
    }
  }
  collectLabels(prevScale, 0, true)
  collectLabels(mainScale, offset, false)
  collectLabels(nextScale, offset + mainW, true)

  type RenderedTask = { task: GanttTaskEx; x: number; y: number; width: number; leftMin: number; rightMin: number; l0: number; r0: number; w0: number; w1: number; day: Date }

  const layoutDay = (day: Date, xOrigin: number, windowStartMin: number, windowLenMin: number, scale: ReturnType<typeof buildScale>): RenderedTask[] => {
    const windowEndMin = windowStartMin + windowLenMin
    const withBounds = tasksForDay(day)
      .map((t) => {
        const l = isSameDay(day, t.startDate) ? t.startMinute : 0
        const r = isSameDay(day, t.endDate) ? t.endMinute : 24 * 60
        const leftMin = Math.max(l, windowStartMin)
        const rightMin = Math.min(r, windowEndMin)
        return { task: t, l, r, leftMin, rightMin }
      })
      .filter((i) => i.rightMin > i.leftMin)
    withBounds.sort((a, b) => a.leftMin - b.leftMin)

    const rows: { end: number; items: typeof withBounds }[] = []
    for (const item of withBounds) {
      let placed = false
      for (let ri = 0; ri < rows.length; ri++) {
        if (rows[ri].end + VIS_GAP_MIN <= item.leftMin) {
          rows[ri].items.push(item)
          rows[ri].end = Math.max(rows[ri].end, item.rightMin)
          placed = true
          break
        }
      }
      if (!placed) rows.push({ end: item.rightMin, items: [item] })
    }

    const result: RenderedTask[] = []
    const regionRight = xOrigin + scale.width
    rows.forEach((row, ri) => {
      row.items.forEach((item) => {
        const x = xOrigin + scale.xOf(item.leftMin)
        const rawWidth = scale.xOf(item.rightMin) - scale.xOf(item.leftMin)
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

  const mainDayTasks = layoutDay(currentDay, offset, 0, 24 * 60, mainScale)
  const prevDayTasks = layoutDay(prevDay, 0, hasPrevTasks ? 0 : (24 - BUFFER_HOURS) * 60, hasPrevTasks ? 24 * 60 : BUFFER_HOURS * 60, prevScale)
  const nextDayTasks = layoutDay(nextDay, offset + mainW, 0, hasNextTasks ? 24 * 60 : BUFFER_HOURS * 60, nextScale)

  const renderTasks = [...prevDayTasks, ...mainDayTasks, ...nextDayTasks]

  const openAdd = () => {
    setAdding(true)
  }

  const allProjects = useMemo(
    () => ({ ...PROJECTS, ...extraProjects }) as Record<string, { label: string; color: string }>,
    [extraProjects]
  )

  const handleAddTask = (data: AddTaskData) => {
    setMockTasks((ts) => [
      ...ts,
      {
        id: `new-${Date.now()}`,
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        progress: 0,
        assignees: [],
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        tags: data.tags,
      },
    ])
    data.tags.forEach((tag) => {
      setHiddenProjects((prev) => {
        if (!prev.has(tag)) return prev
        const next = new Set(prev)
        next.delete(tag)
        return next
      })
    })
    if (isSameDay(data.startDate, currentDay)) pendingScrollMin.current = data.startMinute
    setAdding(false)
  }

  const maxY = renderTasks.reduce((m, p) => Math.max(m, p.y + TASK_H), 0)
  const contentH = maxY > 0 ? maxY + TASK_GAP : '100%'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 relative"
    >
      <div className="absolute top-0 left-0 w-[40px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }} />
      <div className="absolute top-0 right-0 w-[40px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }} />

      <div className="flex items-center justify-between shrink-0 px-2 h-[34px] gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <NavBtn dir="prev" onClick={goPrev} />
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 h-[24px] px-2.5 rounded-md cursor-pointer text-[11px] font-semibold shrink-0 transition-colors"
            style={
              viewToday
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
            whileHover={viewToday ? undefined : { background: 'rgba(255,255,255,0.08)', color: '#fff' }}
            onClick={goToday}
            title={viewToday ? 'К сегодняшнему дню (Home)' : 'Вернуться к сегодняшнему дню'}
          >
            <span
              className="size-[6px] rounded-full"
              style={viewToday ? { background: 'rgba(10,11,14,0.7)' } : { background: 'var(--focus)', boxShadow: '0 0 6px var(--focus)' }}
            />
            {dayRelName(viewDay)}
          </motion.button>
          <NavBtn dir="next" onClick={goNext} />
          <motion.button
            layoutId="add-modal"
            whileTap={{ scale: 0.94 }}
            onClick={openAdd}
            title="Добавить задачу"
            className="flex items-center gap-1 h-[22px] px-2.5 rounded-full cursor-pointer transition-all text-[10px] font-semibold select-none hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, var(--focus), var(--focus-2))', color: '#0a0b0e', border: 'none' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Новая
          </motion.button>
        </div>

        <div className="text-[12px] font-semibold tracking-[-0.01em] shrink-0 select-none" style={{ color: viewToday ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
          {fmtDate(viewDay)}
        </div>

        <div className="flex items-center gap-1.5 justify-end shrink-0 min-w-0 flex-wrap">
          {Object.entries(allProjects).map(([key, p]) => {
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
          {hourSlots.map((s) => (
            <div
              key={`mt-${s.x}`}
              className="absolute top-0 rounded-full"
              style={{
                left: `${(s.x / totalW) * 100}%`,
                width: s.hour % 6 === 0 ? 1.5 : 0.5,
                height: s.hour % 6 === 0 ? MINI_H : 8,
                top: s.hour % 6 === 0 ? 0 : (MINI_H - 8) / 2,
                background: s.hour % 6 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                transform: 'translateX(-50%)',
              }}
            />
          ))}
          <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${(offset / totalW) * 100}%`, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${((offset + mainW) / totalW) * 100}%`, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div
            ref={indicatorRef}
            className="absolute top-0 h-full rounded-sm pointer-events-none"
            style={{
              left: 0,
              width: `${(viewportW / totalW) * 100}%`,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
              willChange: 'transform',
            }}
          />
          {isToday && (
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none z-10"
              style={{ left: `${((offset + mainScale.xOf(nowMinute)) / totalW) * 100}%`, width: 5, height: 5, background: '#ff3b30', boxShadow: '0 0 8px rgba(255,59,48,0.8)' }}
            />
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--surface-3) transparent',
          overscrollBehavior: 'none',
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
            <div className="absolute top-0 left-0 right-0 z-[3] select-none" style={{ height: 14, contentVisibility: 'auto' }}>
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
              style={{ top: 16, left: 0, right: 0, height: 26, contentVisibility: 'auto' }}
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
              {minTicks.map((t) => (
                <div
                  key={`mt-${t.x}`}
                  className="absolute bottom-0"
                  style={{
                    left: t.x,
                    width: 0.5,
                    height: 6,
                    background: t.isBuffer ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                  }}
                />
              ))}
              {minLabels.map((l) => (
                <div
                  key={`ml-${l.x}`}
                  className="absolute top-0 pointer-events-none select-none"
                  style={{ left: l.x, transform: 'translateX(-50%)' }}
                >
                  <span
                    className="text-[9.5px] font-medium tabular-nums leading-none"
                    style={{ color: l.isBuffer ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)' }}
                  >
                    {l.text}
                  </span>
                </div>
              ))}
              <div className="absolute bottom-0" style={{ left: totalW, width: 1, height: 10, background: 'rgba(255,255,255,0.03)' }} />
              <div className="absolute bottom-0 rounded-full" style={{ left: offset, width: 2, height: 26, transform: 'translateX(-1px)', background: 'rgba(255,255,255,0.18)' }} />
              <div className="absolute bottom-0 rounded-full" style={{ left: offset + mainW, width: 2, height: 26, transform: 'translateX(-1px)', background: 'rgba(255,255,255,0.18)' }} />
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

            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: 0, width: prevW, background: 'linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.02))' }} />
            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: offset + mainW, width: nextW, background: 'linear-gradient(270deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.02))' }} />

            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: 0, width: prevW, top: 0, height: 14, contentVisibility: 'auto' }}>
              <span className="text-[11px] font-semibold tracking-[0.02em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {hasPrevTasks ? `← вчера · ${fmtDate(prevDay)}` : '← вчера'}
              </span>
            </div>
            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: offset + mainW, width: nextW, top: 0, height: 14, contentVisibility: 'auto' }}>
              <span className="text-[11px] font-semibold tracking-[0.02em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {hasNextTasks ? `завтра · ${fmtDate(nextDay)} →` : 'завтра →'}
              </span>
            </div>

            {isToday && (
              <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: offset + mainScale.xOf(nowMinute) }}>
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

            <div className="absolute z-[1] pointer-events-none" style={{ top: 0, left: 0, width: totalW, contentVisibility: 'auto' }}>
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
              const showTags = width >= MIN_TAG_W && task.title.length <= MAX_TAG_TITLE
              const maxFit = width >= 520 ? 3 : width >= 380 ? 2 : 1
              const tagsShown = showTags ? task.tags.slice(0, maxFit) : []

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
                  style={{ left: left + insetL, top, width: width - insetL - insetR, height: TASK_H, padding: '10px 14px 10px 14px', contentVisibility: 'auto' }}
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

                  <div className="flex items-center gap-2 relative z-[1] min-h-0 shrink-0 min-w-0">
                    <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: cc.base, opacity: 0.7 }} />
                    <span className="text-[13px] font-medium text-[var(--text)] leading-tight truncate tracking-[-0.01em]">
                      {task.title}
                    </span>
                    {tagsShown.map((tagKey, ti) => {
                      const p = allProjects[tagKey] ?? { label: tagKey, color: '#8b93a5' }
                      return (
                        <span
                          key={ti}
                          className="shrink-0 rounded-full px-1.5 py-px text-[8.5px] font-semibold leading-none tracking-[-0.01em] select-none"
                          style={{ color: p.color, background: `${p.color}1a`, border: `1px solid ${p.color}30` }}
                        >
                          {p.label}
                        </span>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-2 relative z-[1] mt-auto min-w-0" style={{ paddingTop: 4 }}>
                    {startsBefore ? (
                      <span className="text-[10px] font-medium truncate min-w-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {fmtRange(task.startDate, task.endDate)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {fmtExact(leftMin)}–{fmtExact(rightMin)}
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
        <Dropdown.Popover key={ctxMenu?.key} triggerRef={ctxAnchorRef} placement="right top" offset={4}>
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

      <AddTaskModal
        open={adding}
        initialDay={currentDay}
        projects={allProjects}
        tasks={mockTasks}
        onClose={() => setAdding(false)}
        onAdd={handleAddTask}
        onAddProject={(key, p) => setExtraProjects((prev) => ({ ...prev, [key]: p }))}
      />
    </motion.div>
  )
}
