import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { RESTING_TYPES } from './activities'
import type { Rule } from './activities'
import { useSettings } from '../../shared/hooks/useSettings'
import { notify } from '../../shared/lib/notify'

export const DAY_START = 0
export const DAY_END = 1440
/** Жёсткий лимит цепочки правил: сутки. */
export const DAY_LIMIT = DAY_END
export const STEP_MIN = 2
/** Шаг ленты подобран так, чтобы полная ширина суток (720·PITCH = 3600px)
    была меньше лимита GPU-текстуры (обычно 4096px): иначе WebKitGTK
    не растеризует хвост ленты и он «пропадает» на экране. */
export const PITCH = 5
/** Реальное время: 1 минута за минуту (для плавной интерполяции в Timeline). */
const SIM_SPEED = 1 / 60
export const SIM_SPEED_MIN_PER_SEC = SIM_SPEED
export const CHAIN_START = 540

export interface Segment {
  start: number
  end: number
  type: string
  label: string
  color: string
  task?: string
}

export function buildSegments(rules: Rule[], chainStart = CHAIN_START): Segment[] {
  const segs: Segment[] = []
  if (DAY_START < chainStart) {
    segs.push({ start: DAY_START, end: chainStart, type: 'off', label: 'Вне графика', color: 'gray' })
  }
  let t = chainStart
  for (const r of rules) {
    const end = Math.min(t + r.minutes, DAY_END)
    if (end > t) {
      segs.push({ start: t, end, type: r.type, label: r.name, color: r.color, task: r.type === 'focus' ? r.name : undefined })
    }
    t = end
    if (t >= DAY_END) break
  }
  if (t < DAY_END) {
    segs.push({ start: t, end: DAY_END, type: 'off', label: 'Вне графика', color: 'gray' })
  }
  return segs
}

export function fmtHM(min: number): string {
  min = Math.max(0, Math.round(min))
  const h = Math.floor(min / 60), m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function fmtHMS(min: number): string {
  min = Math.max(0, min)
  const h = Math.floor(min / 60)
  const m = Math.floor(min % 60)
  const s = Math.floor((min % 1) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Обратный отсчёт с секундами: ММ:СС или Ч:ММ:СС. */
export function fmtMS(min: number): string {
  const totalS = Math.max(0, Math.round(min * 60))
  const h = Math.floor(totalS / 3600)
  const m = Math.floor((totalS % 3600) / 60)
  const s = totalS % 60
  const core = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${core}` : core
}

function segAt(min: number, segs: Segment[]): Segment {
  for (const s of segs) {
    if (min >= s.start && min < s.end) return s
  }
  return segs[segs.length - 1]
}

export function buildBars(segments: Segment[]): { type: string; height: number; color: string }[] {
  const bars: { type: string; height: number; color: string }[] = []
  for (let m = DAY_START; m < DAY_END; m += STEP_MIN) {
    const s = segAt(m, segments)
    const local = (m - s.start) / Math.max(1, s.end - s.start)
    let intensity: number
    const idx = Math.floor((m - DAY_START) / STEP_MIN)
    const noise = Math.sin(idx * 12.9898) * 43758.5453
    const frac = noise - Math.floor(noise)
    if (s.type === 'focus') intensity = 0.32 + 0.55 * local + 0.10 * Math.sin(idx * 0.85) * local
    else if (s.type === 'off') intensity = 0.10 + 0.06 * frac
    else if (s.type === 'break' || s.type === 'smoke') intensity = 0.42 + 0.22 * Math.sin(idx * 0.6)
    else if (s.type === 'lunch' || s.type === 'breakfast' || s.type === 'dinner') intensity = 0.28 + 0.08 * Math.sin(idx * 0.4)
    else intensity = 0.38 + 0.12 * Math.sin(idx * 0.5)
    intensity = Math.max(0.08, Math.min(1, intensity))
    const h = Math.round(8 + intensity * 70)
    bars.push({ type: s.type, height: h, color: s.color })
  }
  return bars
}

export function useRhythm(rules: Rule[], chainStart = CHAIN_START) {
  const [nowClock, setNowClock] = useState(() => new Date())
  const [toast, setToast] = useState<{ title: string; text: string } | null>(null)
  const lastTypeRef = useRef<string>('focus')

  /** Часы: реальное время, пауза во вкладке hidden экономит CPU. */
  useEffect(() => {
    let id: number | null = null
    const sync = () => setNowClock(new Date())
    const start = () => {
      sync()
      if (id) clearInterval(id)
      id = window.setInterval(() => {
        if (document.hidden) return
        sync()
      }, 1000)
    }
    const onVis = () => {
      if (!document.hidden) sync()
    }
    start()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      if (id) clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const nowMinutes = useMemo(
    () => nowClock.getHours() * 60 + nowClock.getMinutes() + nowClock.getSeconds() / 60,
    [nowClock],
  )

  const segments = useMemo(() => buildSegments(rules, chainStart), [rules, chainStart])

  /* Смена блока: системное уведомление через ОС (Win11 toast / macOS / Linux),
     при недоступности — внутренний тост. Управляется тумблером в Настройках. */
  const { systemNotifications } = useSettings()
  const showToast = useCallback((title: string, text: string) => {
    setToast({ title, text })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  useEffect(() => {
    const cur = segAt(nowMinutes, segments)
    if (cur.type === lastTypeRef.current) return
    lastTypeRef.current = cur.type
    const resting = RESTING_TYPES.has(cur.type)
    const title = resting ? 'Время отдохнуть' : 'Возвращаемся к работе'
    const text = resting
      ? 'Встань, разомнись, посмотри вдаль'
      : `Блок начался — ${cur.label} до ${fmtHM(cur.end)}`
    if (!systemNotifications) {
      showToast(title, text)
      return
    }
    void notify(title, text).then((sent) => {
      if (!sent) showToast(title, text)
    })
  }, [nowMinutes, segments, systemNotifications, showToast])

  const cur = useMemo(() => segAt(nowMinutes, segments), [nowMinutes, segments])
  const resting = useMemo(() => RESTING_TYPES.has(cur.type), [cur.type])
  const remain = useMemo(() => Math.max(0, cur.end - nowMinutes), [cur.end, nowMinutes])
  const total = useMemo(() => Math.max(1, cur.end - cur.start), [cur])
  const progress = useMemo(() => 1 - remain / total, [remain, total])

  const totalBars = useMemo(() => Math.ceil((DAY_END - DAY_START) / STEP_MIN), [])
  const rowWidth = useMemo(() => totalBars * PITCH, [totalBars])
  const nextSegment = useMemo(() => segments.find((s) => s.start > cur.start), [segments, cur.start])

  return useMemo(
    () => ({
      nowMinutes,
      segments,
      cur,
      resting,
      remain,
      total,
      progress,
      totalBars,
      rowWidth,
      toast,
      setToast,
      DAY_START,
      DAY_END,
      STEP_MIN,
      PITCH,
      nextSegment,
    }),
    [nowMinutes, segments, cur, resting, remain, total, progress, totalBars, rowWidth, toast, nextSegment],
  )
}