export type DateFormat = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY.MM.DD'
export type TimeFormat = '24h' | '12h'
export type WeekStart = 'mon' | 'sun'

const TZ_CACHE = new Map<string, Intl.DateTimeFormat>()

/** Текущая дата в локальной полночи — единая точка истины для «сегодня». */
export function startOfToday(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function fmtClock(
  d: Date,
  opts: { timezone: string; timeFormat: TimeFormat; dateFormat: DateFormat },
): string {
  const is12 = opts.timeFormat === '12h'
  const key = `${opts.timezone}|${is12}`
  let fmt = TZ_CACHE.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('ru-RU', {
      timeZone: opts.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: is12,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    TZ_CACHE.set(key, fmt)
  }
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const hh = get('hour')
  const mm = get('minute')
  const wd = get('weekday')
  const day = get('day')
  const mon = get('month')
  const yr = get('year')
  const dp = get('dayPeriod')
  const time = is12 ? `${hh}:${mm} ${dp}` : `${hh}:${mm}`
  const date =
    opts.dateFormat === 'DD.MM.YYYY'
      ? `${day}.${mon}.${yr}`
      : opts.dateFormat === 'MM/DD/YYYY'
        ? `${mon}/${day}/${yr}`
        : `${yr}.${mon}.${day}`
  return `${time} · ${wd}, ${date}`
}

export function tzOffsetLabel(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}