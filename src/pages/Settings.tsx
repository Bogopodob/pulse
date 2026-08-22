import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings } from '../shared/hooks/useSettings'
import { useTheme } from '../shared/hooks/useTheme'
import { useI18n } from '../shared/hooks/useI18n'
import { fmtClock, tzOffsetLabel, type DateFormat, type TimeFormat } from '../shared/lib/date'
import { TIMEZONES } from '../shared/lib/timezones'
import { Time } from '@internationalized/date'
import { Select } from '@heroui/react/select'
import { ListBox } from '@heroui/react/list-box'
import { ListBoxItem } from '@heroui/react/list-box-item'
import { TimeField } from '@heroui/react/time-field'

function TimezoneSelect({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  return (
    <Select.Root selectedKey={value} onSelectionChange={(k) => onChange(String(k))} className="w-[300px]">
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Select.Indicator>
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={TIMEZONES.map((tz) => ({ tz }))} className="max-h-[260px] overflow-y-auto">
          {({ tz }) => (
            <ListBoxItem key={tz} id={tz} textValue={tz}>
              {tz.replace(/_/g, ' ')} · {tzOffsetLabel(tz)}
            </ListBoxItem>
          )}
        </ListBox>
      </Select.Popover>
    </Select.Root>
  )
}

type Tab = 'profile' | 'general' | 'rhythm' | 'services' | 'about'

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  {
    key: 'profile',
    label: 'Профиль',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="17" height="17">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20.5c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
      </svg>
    ),
  },
  {
    key: 'general',
    label: 'Общие',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="17" height="17">
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
      </svg>
    ),
  },
  {
    key: 'rhythm',
    label: 'Ритм дня',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="17" height="17">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
  },
  {
    key: 'services',
    label: 'Сервисы',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="17" height="17">
        <path d="M9 17H6a4 4 0 0 1 0-8h3M15 7h3a4 4 0 0 1 0 8h-3M8 12h8" />
      </svg>
    ),
  },
  {
    key: 'about',
    label: 'О приложении',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="17" height="17">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5v.5" />
      </svg>
    ),
  },
]

function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} мин`
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex gap-1 p-[3px] rounded-[10px] border border-[var(--surface-3)] bg-[var(--surface-2)]/70">
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className="px-3.5 py-[7px] rounded-[7px] text-[12px] font-medium cursor-pointer transition-all"
            style={
              active
                ? {
                    background: 'var(--surface-3)',
                    color: 'var(--text)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                  }
                : { background: 'transparent', color: 'var(--text-dim)' }
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className="relative w-[40px] h-[24px] rounded-full cursor-pointer transition-colors duration-200 shrink-0"
      style={{
        background: on ? 'rgba(76,141,255,0.9)' : 'var(--surface-3)',
        boxShadow: on ? '0 0 12px rgba(76,141,255,0.45)' : 'none',
      }}
    >
      <span
        className="absolute top-[3px] size-[18px] rounded-full transition-all duration-200"
        style={{
          left: on ? 19 : 3,
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      />
    </button>
  )
}

function Row({
  title,
  hint,
  control,
  last,
}: {
  title: ReactNode
  hint?: string
  control: ReactNode
  last?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-6 py-4"
      style={last ? undefined : { borderBottom: '1px solid var(--stroke)' }}
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-[var(--text)]">{title}</div>
        {hint && <div className="text-[12px] text-[var(--text-faint)] mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

interface Service {
  key: string
  name: string
  desc: string
  color: string
  glow: string
  icon: ReactNode
}

const SERVICES: Service[] = [
  {
    key: 'telegram',
    name: 'Telegram',
    desc: 'Уведомления о смене блоков',
    color: '#29a9eb',
    glow: '41,169,235',
    icon: (
      <path d="M21.5 4.5 2.8 11.6c-1 .4-1 1.6.1 2l4.6 1.4 1.7 5.3c.3 1 1.5 1.2 2.1.4l2.4-3 4.8 3.5c.8.6 2 .2 2.2-.9l3-15.6c.2-1.2-.9-2.2-2.2-1.7ZM8.5 14.9l10.4-7.3c.4-.3.9.3.5.6l-8.4 7.6-.3 4.1-2.2-5Z" />
    ),
  },
  {
    key: 'google-calendar',
    name: 'Google Календарь',
    desc: 'Синхронизация расписания',
    color: '#4285f4',
    glow: '66,133,244',
    icon: (
      <path d="M5 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v10h10V5H5Zm3 2.2a1.6 1.6 0 0 1 1.2.5l.8.7.8-.7a1.6 1.6 0 0 1 2.3 0 1.7 1.7 0 0 1 0 2.3l-.8.8L13 12l-3 3-3-3 1.1-1.2-.8-.8a1.7 1.7 0 0 1 0-2.3c.3-.3.7-.5 1.2-.5Zm9-1h2v10a3 3 0 0 1-3 3h-1v-2h1a1 1 0 0 0 1-1V4.2Z" />
    ),
  },
  {
    key: 'github',
    name: 'GitHub',
    desc: 'Фокус-сессии в репозиториях',
    color: '#8b949e',
    glow: '139,148,158',
    icon: (
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    ),
  },
  {
    key: 'notion',
    name: 'Notion',
    desc: 'Задачи и заметки',
    color: '#a1a1aa',
    glow: '161,161,170',
    icon: (
      <path d="M6 3h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1.5 3v2h2.5v10h2V8h2.5V6H7.5Zm6 0v2h3V6h-3Z" />
    ),
  },
  {
    key: 'slack',
    name: 'Slack',
    desc: 'Статус «в фокусе» во время блоков',
    color: '#e01e5a',
    glow: '224,30,90',
    icon: (
      <path d="M6 15a2 2 0 1 1-2 2 2 2 0 0 1 2-2Zm4 0a2 2 0 1 1-2 2 2 2 0 0 1 2-2Zm-2-4a2 2 0 1 1 2 2 2 2 0 0 1-2-2Zm0-4a2 2 0 1 1 2 2 2 2 0 0 1-2-2Zm6 6a2 2 0 1 1 2 2 2 2 0 0 1-2-2Zm-4 0a2 2 0 1 1 2 2 2 2 0 0 1-2-2Zm2-2a2 2 0 1 1 2-2 2 2 0 0 1-2 2Zm0-4a2 2 0 1 1 2-2 2 2 0 0 1-2 2Z" />
    ),
  },
  {
    key: 'todoist',
    name: 'Todoist',
    desc: 'Задачи дня и напоминания',
    color: '#e44332',
    glow: '228,67,50',
    icon: (
      <path d="M12 2 5.6 4.9v5.4c0 4.6 2.8 8.4 6.4 9.7 3.6-1.3 6.4-5.1 6.4-9.7V4.9L12 2Zm-1.3 12.3-2.6-2.6 1.1-1.1 1.5 1.5 3.7-3.7 1.1 1.1-4.8 4.8Z" />
    ),
  },
]

const SERVICES_KEY = 'pulse-services'

function loadServices(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SERVICES_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

const TAB_META: Record<Tab, { title: string; desc: string }> = {
  profile: { title: 'Профиль', desc: 'Как вы выглядите в Pulse' },
  general: { title: 'Общие', desc: 'Внешний вид и язык интерфейса' },
  rhythm: { title: 'Ритм дня', desc: 'Цель фокуса и расписание дня' },
  services: { title: 'Сервисы', desc: 'Подключите сервисы, чтобы усилить ритм' },
  about: { title: 'О приложении', desc: 'Версия и данные' },
}

export function Settings() {
  const [tab, setTab] = useState<Tab>('profile')
  const meta = TAB_META[tab]

  return (
    <div className="w-full max-w-[1400px] mx-auto flex gap-12">
      <nav className="w-[240px] shrink-0 flex flex-col gap-[2px] pt-1">
        {TABS.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className="flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13px] font-medium cursor-pointer transition-colors"
              style={{
                background: active ? 'rgba(76,141,255,0.12)' : 'transparent',
                color: active ? 'var(--focus)' : 'var(--text-dim)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--surface-2)'
                  e.currentTarget.style.color = 'var(--text)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-dim)'
                }
              }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      <section className="flex-1 min-w-0 border-l border-[var(--stroke)] pl-12 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <h2 className="font-[var(--font-display)] text-[19px] font-semibold tracking-[-0.01em]">{meta.title}</h2>
            <p className="text-[12.5px] text-[var(--text-faint)] mt-0.5 mb-2">{meta.desc}</p>

            {tab === 'profile' && <ProfileBody />}
            {tab === 'general' && <GeneralBody />}
            {tab === 'rhythm' && <RhythmBody />}
            {tab === 'services' && <ServicesBody />}
            {tab === 'about' && <AboutBody />}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  )
}

function ProfileBody() {
  const { name, email, updateName, updateEmail } = useSettings()
  const [confirmOut, setConfirmOut] = useState(false)

  const initials = useMemo(
    () =>
      name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'Г',
    [name],
  )

  const fieldCls =
    'w-[240px] bg-[var(--surface-2)] border border-[var(--surface-3)] rounded-md px-2.5 py-[7px] text-[13px] text-[var(--text)] outline-none transition-colors'

  return (
    <div className="flex flex-col">
      <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--stroke)' }}>
        <div
          className="h-[96px]"
          style={{
            background:
              'linear-gradient(160deg, rgba(76,141,255,0.22), rgba(76,141,255,0.05) 45%, rgba(79,212,196,0.08) 75%, transparent)',
          }}
        />
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(76,141,255,0.18), transparent 70%)' }}
        />
      </div>

      <div className="flex flex-col items-center -mt-[44px] gap-1 pb-6">
        <div
          className="relative size-[88px] rounded-full grid place-items-center font-[var(--font-display)] text-[30px] font-bold text-[#0b0e13]"
          style={{
            background: 'linear-gradient(135deg, var(--focus-2), var(--focus))',
            boxShadow: '0 0 30px rgba(76,141,255,0.45), 0 4px 14px rgba(0,0,0,0.4)',
            border: '3px solid var(--surface-1)',
          }}
        >
          {initials}
        </div>
        <div className="font-[var(--font-display)] text-[21px] font-semibold tracking-[-0.01em] mt-2">
          {name.trim() || 'Гость'}
        </div>
        <div className="text-[12.5px] text-[var(--text-faint)] font-mono">{email}</div>
        <span
          className="mt-1.5 flex items-center gap-1.5 rounded-full px-3 py-[4px] text-[10.5px] font-bold uppercase tracking-[0.08em]"
          style={{
            color: '#ffd76a',
            background: 'rgba(255,215,106,0.1)',
            border: '1px solid rgba(255,215,106,0.3)',
            boxShadow: '0 0 14px rgba(255,215,106,0.12)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 15.6 5.6 20.5 5.5l-.1 4.9L24 12l-3.6 1.6.1 4.9-4.9-.1L12 22l-3.6-3.6-4.9.1.1-4.9L0 12l3.6-1.6-.1-4.9 4.9.1L12 2Z" />
          </svg>
          Бесплатный план
        </span>
      </div>

      <div className="flex flex-col">
        <Row
          title="Имя"
          hint="Как вас видно другим"
          control={
            <input
              value={name}
              onChange={(e) => updateName(e.target.value)}
              placeholder="Ваше имя"
              className={fieldCls}
            />
          }
        />
        <Row
          title="Email"
          hint="Для уведомлений и входа"
          control={
            <input
              type="email"
              value={email}
              onChange={(e) => updateEmail(e.target.value)}
              placeholder="you@pulse.app"
              className={fieldCls}
            />
          }
        />
        <Row
          title="План"
          hint="Бесплатный — без ограничений по ритму"
          control={
            <span
              className="rounded-full px-3 py-[5px] text-[11.5px] font-semibold"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-3)', color: 'var(--text-dim)' }}
            >
              Free
            </span>
          }
        />
        <div className="pt-6 pb-2 flex">
          <button
            onClick={() => {
              if (confirmOut) {
                updateName('Гость')
                updateEmail('you@pulse.app')
                setConfirmOut(false)
              } else {
                setConfirmOut(true)
                setTimeout(() => setConfirmOut(false), 3000)
              }
            }}
            className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-medium cursor-pointer transition-all"
            style={
              confirmOut
                ? { background: 'rgba(255,99,99,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,99,99,0.4)' }
                : { background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--surface-3)' }
            }
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {confirmOut ? 'Точно выйти?' : 'Выйти из аккаунта'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GeneralBody() {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale } = useI18n()
  const { weekStart, setWeekStart, systemNotifications, setSystemNotifications } = useSettings()

  return (
    <div className="flex flex-col">
      <Row
        title="Тема"
        hint="Оформление интерфейса"
        control={
          <Segmented
            options={[
              { key: 'dark', label: 'Тёмная' },
              { key: 'light', label: 'Светлая' },
            ]}
            value={theme}
            onChange={(t) => setTheme(t as 'dark' | 'light')}
          />
        }
      />
      <Row
        title="Язык"
        hint="Язык интерфейса"
        control={
          <Segmented
            options={[
              { key: 'ru', label: 'Русский' },
              { key: 'en', label: 'English' },
            ]}
            value={locale}
            onChange={(l) => setLocale(l as 'ru' | 'en')}
          />
        }
      />
      <Row
        title="Первый день недели"
        hint="Начало недели в календарях и статистике"
        control={
          <Segmented
            options={[
              { key: 'mon', label: 'Понедельник' },
              { key: 'sun', label: 'Воскресенье' },
            ]}
            value={weekStart}
            onChange={(w) => setWeekStart(w as 'mon' | 'sun')}
          />
        }
      />
      <Row
        title="Системные уведомления"
        hint="Смена блоков — через уведомления ОС (Windows 11, macOS, Linux)"
        control={
          <Switch
            on={systemNotifications}
            onChange={() => setSystemNotifications(!systemNotifications)}
          />
        }
        last
      />
    </div>
  )
}

function RhythmBody() {
  const {
    dailyGoalMin,
    setDailyGoalMin,
    chainStartMin,
    setChainStartMin,
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat,
    timezone,
    setTimezone,
  } = useSettings()
  const goalHours = Math.round(dailyGoalMin / 60)

  const preview = useMemo(
    () => fmtClock(new Date(), { timezone, timeFormat, dateFormat }),
    [timezone, timeFormat, dateFormat],
  )

  return (
    <div className="flex flex-col">
      <Row
        title="Цель фокуса"
        hint={`${goalHours} ч в день — ориентир для статистики`}
        control={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDailyGoalMin(Math.max(180, dailyGoalMin - 60))}
              className="btn-icon"
              title="−1 час"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>
            <div
              className="w-[86px] text-center font-[var(--font-display)] text-[15px] font-semibold tabular-nums"
              style={{ color: 'var(--focus)', textShadow: '0 0 14px rgba(76,141,255,0.3)' }}
            >
              {fmtDur(dailyGoalMin)}
            </div>
            <button
              onClick={() => setDailyGoalMin(Math.min(720, dailyGoalMin + 60))}
              className="btn-icon"
              title="+1 час"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        }
      />
      <Row
        title="Начало дня"
        hint="Первый блок ритма стартует в это время"
        control={
          <TimeField.Root
            value={new Time(Math.floor(chainStartMin / 60), Math.round(chainStartMin % 60))}
            onChange={(t) => {
              if (t) setChainStartMin(t.hour * 60 + t.minute)
            }}
            granularity="minute"
            hourCycle={timeFormat === '12h' ? 12 : 24}
          >
            <TimeField.Group>
              <TimeField.Input>
                {(segment) => <TimeField.Segment segment={segment} />}
              </TimeField.Input>
            </TimeField.Group>
          </TimeField.Root>
        }
      />
      <Row
        title="Формат даты"
        hint="Как дата отображается в интерфейсе"
        control={
          <Segmented
            options={[
              { key: 'DD.MM.YYYY', label: 'ДД.ММ.ГГГГ' },
              { key: 'MM/DD/YYYY', label: 'ММ/ДД/ГГГГ' },
              { key: 'YYYY.MM.DD', label: 'ГГГГ.ММ.ДД' },
            ]}
            value={dateFormat}
            onChange={(f) => setDateFormat(f as DateFormat)}
          />
        }
      />
      <Row
        title="Формат времени"
        hint="24 часа или 12 с AM/PM"
        control={
          <Segmented
            options={[
              { key: '24h', label: '24 ч' },
              { key: '12h', label: '12 ч' },
            ]}
            value={timeFormat}
            onChange={(f) => setTimeFormat(f as TimeFormat)}
          />
        }
      />
      <Row
        title="Часовой пояс"
        hint="По умолчанию для отображения времени"
        control={<TimezoneSelect value={timezone} onChange={setTimezone} />}
      />
      <div
        className="mt-5 flex items-center gap-2.5 rounded-xl px-4 py-3"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--surface-3)' }}
      >
        <span
          className="size-[7px] rounded-full shrink-0"
          style={{ background: 'var(--focus)', boxShadow: '0 0 8px var(--focus)' }}
        />
        <span className="text-[12.5px] text-[var(--text-faint)]">Сейчас в этом формате:</span>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--text)]">{preview}</span>
      </div>
    </div>
  )
}

function ServicesBody() {
  const [connected, setConnected] = useState<Record<string, boolean>>(loadServices)

  useEffect(() => {
    localStorage.setItem(SERVICES_KEY, JSON.stringify(connected))
  }, [connected])

  const connectedCount = SERVICES.filter((s) => connected[s.key]).length

  const sorted = useMemo(
    () =>
      [...SERVICES].sort((a, b) => Number(!!connected[b.key]) - Number(!!connected[a.key])),
    [connected],
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between py-3">
        <div className="text-[12px] text-[var(--text-faint)]">
          {connectedCount === 0
            ? 'Ничего не подключено'
            : `Подключено ${connectedCount} из ${SERVICES.length}`}
        </div>
        <div className="flex gap-1.5">
          {SERVICES.map((s) => (
            <span
              key={s.key}
              className="size-[7px] rounded-full"
              style={{
                background: connected[s.key] ? s.color : 'var(--surface-3)',
                boxShadow: connected[s.key] ? `0 0 6px ${s.color}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
      {sorted.map((s, i) => {
        const isOn = !!connected[s.key]
        return (
          <Row
            key={s.key}
            title={
              <span className="flex items-center gap-3">
                <span
                  className="grid size-[30px] place-items-center rounded-[8px] transition-all duration-300"
                  style={{
                    background: isOn ? `rgba(${s.glow},0.16)` : 'var(--surface-2)',
                    border: `1px solid ${isOn ? `rgba(${s.glow},0.35)` : 'var(--surface-3)'}`,
                    color: isOn ? s.color : 'var(--text-faint)',
                    boxShadow: isOn ? `0 0 14px rgba(${s.glow},0.18)` : 'none',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    {s.icon}
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-[13.5px] font-medium text-[var(--text)]">{s.name}</span>
                  <span className="text-[12px] text-[var(--text-faint)] font-normal">{s.desc}</span>
                </span>
              </span>
            }
            control={<Switch on={isOn} onChange={() => setConnected((c) => ({ ...c, [s.key]: !c[s.key] }))} />}
            last={i === sorted.length - 1}
          />
        )
      })}
    </div>
  )
}

function AboutBody() {
  const { reset } = useSettings()
  const { theme } = useTheme()
  const [confirmReset, setConfirmReset] = useState(false)
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'up-to-date'>('idle')

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 py-5">
        <div
          className="relative size-[58px] rounded-2xl grid place-items-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--focus-2), var(--focus))',
            boxShadow: '0 0 24px rgba(76,141,255,0.35)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0b0e13" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
          </svg>
        </div>
        <div>
          <div className="font-[var(--font-display)] text-[19px] font-semibold tracking-[-0.01em]">Pulse</div>
          <div className="text-[12px] text-[var(--text-faint)]">Ритм дня · фокус · продуктивность</div>
        </div>
      </div>
      <Row
        title="Версия"
        hint="Текущий релиз приложения"
        control={<span className="font-mono text-[12.5px] text-[var(--text-dim)]">0.1.0</span>}
      />
      <Row
        title="Обновления"
        hint="Проверка актуальной версии"
        control={
          <button
            onClick={() => {
              setCheckState('checking')
              setTimeout(() => setCheckState('up-to-date'), 1200)
            }}
            className="rounded-lg px-3.5 py-2 text-[12px] font-medium cursor-pointer transition-all"
            style={{
              background: checkState === 'up-to-date' ? 'rgba(79,212,196,0.12)' : 'var(--surface-2)',
              color: checkState === 'up-to-date' ? '#4fd4c4' : 'var(--text-dim)',
              border: `1px solid ${checkState === 'up-to-date' ? 'rgba(79,212,196,0.4)' : 'var(--surface-3)'}`,
            }}
          >
            {checkState === 'checking' ? 'Проверяем…' : checkState === 'up-to-date' ? 'Актуальная версия ✓' : 'Проверить'}
          </button>
        }
      />
      <Row
        title="Платформа"
        hint="Desktop · нативные компоненты"
        control={<span className="font-mono text-[12.5px] text-[var(--text-dim)]">Tauri 2 · WebKitGTK</span>}
      />
      <Row
        title="Режим интерфейса"
        hint="Текущее оформление"
        control={<span className="font-mono text-[12.5px] text-[var(--text-dim)]">{theme === 'dark' ? 'тёмный' : 'светлый'}</span>}
      />
      <Row
        title="Сбросить настройки"
        hint="Вернуть все параметры по умолчанию"
        control={
          <button
            onClick={() => {
              if (confirmReset) {
                reset()
                setConfirmReset(false)
              } else {
                setConfirmReset(true)
                setTimeout(() => setConfirmReset(false), 3000)
              }
            }}
            className="rounded-lg px-3.5 py-2 text-[12px] font-medium cursor-pointer transition-all"
            style={
              confirmReset
                ? { background: 'rgba(255,99,99,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,99,99,0.4)' }
                : { background: 'var(--surface-2)', color: 'var(--text-dim)', border: '1px solid var(--surface-3)' }
            }
          >
            {confirmReset ? 'Точно сбросить?' : 'Сбросить'}
          </button>
        }
        last
      />
    </div>
  )
}