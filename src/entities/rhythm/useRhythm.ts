import { useState, useEffect, useRef, useMemo } from 'react'
import { RESTING_TYPES } from './activities'
import type { Rule } from './activities'

const DAY_START = 0
const DAY_END = 1440
const STEP_MIN = 2
const PITCH = 7
const SIM_SPEED = 2
export const CHAIN_START = 540

export interface Segment {
  start: number
  end: number
  type: string
  label: string
  color: string
  task?: string
}

export function buildSegments(rules: Rule[]): Segment[] {
  const segs: Segment[] = []
  if (DAY_START < CHAIN_START) {
    segs.push({ start: DAY_START, end: CHAIN_START, type: 'off', label: 'Вне графика', color: 'gray' })
  }
  let t = CHAIN_START
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

export function useRhythm(rules: Rule[]) {
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })
  const [toast, setToast] = useState<{ title: string; text: string } | null>(null)
  const lastTypeRef = useRef<string>('focus')
  const lastTsRef = useRef<number | null>(null)

  useEffect(() => {
    let raf: number
    let acc = 0
    const TICK = 0.1
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      acc += dt * SIM_SPEED
      if (acc >= TICK) {
        const step = Math.floor(acc / TICK) * TICK
        acc -= step
        setNowMinutes((prev) => {
          let next = prev + step
          if (next >= DAY_END - 5) next = DAY_START + 90
          return next
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const segments = useMemo(() => buildSegments(rules), [rules])

  useEffect(() => {
    const cur = segAt(nowMinutes, segments)
    if (cur.type !== lastTypeRef.current) {
      const resting = RESTING_TYPES.has(cur.type)
      setToast({
        title: resting ? 'Время отдохнуть' : 'Возвращаемся к работе',
        text: resting
          ? 'Встань, разомнись, посмотри вдаль'
          : `Блок начался — ${cur.label} до ${fmtHM(cur.end)}`,
      })
      setTimeout(() => setToast(null), 4200)
      lastTypeRef.current = cur.type
    }
  }, [nowMinutes, segments])

  const cur = segAt(nowMinutes, segments)
  const resting = RESTING_TYPES.has(cur.type)
  const remain = Math.max(0, cur.end - nowMinutes)
  const total = Math.max(1, cur.end - cur.start)
  const progress = 1 - remain / total

  const totalBars = Math.ceil((DAY_END - DAY_START) / STEP_MIN)
  const rowWidth = totalBars * PITCH

  return {
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
    nextSegment: segments.find((s) => s.start > cur.start),
  }
}