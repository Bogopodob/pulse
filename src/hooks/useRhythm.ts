import { useState, useEffect, useRef } from 'react'

const DAY_START = 0
const DAY_END = 1440
const STEP_MIN = 2
const PITCH = 7
const SIM_SPEED = 2

export interface Segment {
  start: number
  end: number
  type: 'focus' | 'rest' | 'lunch' | 'off'
  task?: string
}

const focusTasks = [
  'UI компоненты',
  'API интеграция',
  'Ревью кода',
  'Документация',
  'Разработка бэкенда',
  'Дизайн-система',
  'Правки багов',
  'Ретроспектива',
  'Подготовка отчета',
  'План на завтра',
]

function buildSegments(): Segment[] {
  const segs: Segment[] = []

  if (DAY_START < 480) segs.push({ start: DAY_START, end: 480, type: 'off' })

  segs.push({ start: 480, end: 540, type: 'off' })

  let t = 540
  let taskIdx = 0
  while (t < 780) {
    const e = Math.min(t + 60, 780)
    segs.push({ start: t, end: e, type: 'focus', task: focusTasks[taskIdx++ % focusTasks.length] })
    t = e
    if (t < 780) { const e2 = Math.min(t + 10, 780); segs.push({ start: t, end: e2, type: 'rest' }); t = e2 }
  }

  segs.push({ start: 780, end: 840, type: 'lunch' })

  t = 840
  while (t < 1080) {
    const e = Math.min(t + 90, 1080)
    segs.push({ start: t, end: e, type: 'focus', task: focusTasks[taskIdx++ % focusTasks.length] })
    t = e
    if (t < 1080) { const e2 = Math.min(t + 15, 1080); segs.push({ start: t, end: e2, type: 'rest' }); t = e2 }
  }

  t = 1080
  while (t < 1200) {
    const e = Math.min(t + 45, 1200)
    segs.push({ start: t, end: e, type: 'focus', task: focusTasks[taskIdx++ % focusTasks.length] })
    t = e
    if (t < 1200) { const e2 = Math.min(t + 10, 1200); segs.push({ start: t, end: e2, type: 'rest' }); t = e2 }
  }

  segs.push({ start: 1200, end: 1260, type: 'off' })

  if (1260 < DAY_END) segs.push({ start: 1260, end: DAY_END, type: 'off' })

  return segs
}

export function fmtHM(min: number): string {
  min = Math.max(0, Math.round(min))
  const h = Math.floor(min / 60), m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function useRhythm() {
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })
  const [toast, setToast] = useState<{ title: string; text: string } | null>(null)
  const segmentsRef = useRef(buildSegments())
  const lastTypeRef = useRef<string>('focus')
  const lastTsRef = useRef<number | null>(null)

  useEffect(() => {
    let raf: number
    const loop = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      setNowMinutes((prev) => {
        let next = prev + dt * SIM_SPEED / 60 * 60
        if (next >= DAY_END - 5) next = DAY_START + 90
        return next
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const cur = segAt(nowMinutes)
    if (cur.type !== lastTypeRef.current) {
      const resting = cur.type === 'rest' || cur.type === 'lunch'
      setToast({
        title: resting ? 'Время отдохнуть' : 'Возвращаемся к работе',
        text: resting
          ? 'Встань, разомнись, посмотри вдаль'
          : `Перерыв закончен — ${cur.task ?? 'фокус'} до ${fmtHM(cur.end)}`,
      })
      setTimeout(() => setToast(null), 4200)
      lastTypeRef.current = cur.type
    }
  }, [nowMinutes])

  const segments = segmentsRef.current
  const cur = segAt(nowMinutes)
  const resting = cur.type === 'rest' || cur.type === 'lunch'
  const remain = Math.max(0, cur.end - nowMinutes)
  const total = Math.max(1, cur.end - cur.start)
  const progress = 1 - remain / total

  const totalBars = Math.ceil((DAY_END - DAY_START) / STEP_MIN)
  const rowWidth = totalBars * PITCH

  function buildBars() {
    const bars: { type: string; height: number }[] = []
    for (let m = DAY_START; m < DAY_END; m += STEP_MIN) {
      const s = segAt(m)
      const local = (m - s.start) / Math.max(1, s.end - s.start)
      let intensity: number
      const idx = Math.floor((m - DAY_START) / STEP_MIN)
      const noise = Math.sin(idx * 12.9898) * 43758.5453
      const frac = noise - Math.floor(noise)
      if (s.type === 'focus') intensity = 0.32 + 0.55 * local + 0.10 * Math.sin(idx * 0.85) * local
      else if (s.type === 'rest') intensity = 0.42 + 0.22 * Math.sin(idx * 0.6)
      else if (s.type === 'lunch') intensity = 0.28 + 0.08 * Math.sin(idx * 0.4)
      else intensity = 0.10 + 0.06 * frac
      intensity = Math.max(0.08, Math.min(1, intensity))
      const h = Math.round(8 + intensity * 70)
      bars.push({ type: s.type, height: h })
    }
    return bars
  }

  function ruleLabelAt(min: number): string {
    if (min < 540) return 'Утро'
    if (min < 780) return 'До обеда'
    if (min < 840) return 'Обед'
    if (min < 1080) return 'После обеда'
    if (min < 1200) return 'Вечер'
    return 'Ночь'
  }

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
    buildBars,
    ruleLabelAt,
    toast,
    setToast,
    DAY_START,
    DAY_END,
    STEP_MIN,
    PITCH,
    nextSegment: segments.find((s) => s.start > cur.start),
  }
}

export function segAt(min: number): Segment {
  const segments = buildSegments()
  for (const s of segments) {
    if (min >= s.start && min < s.end) return s
  }
  return segments[segments.length - 1]
}
