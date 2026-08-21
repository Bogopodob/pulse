let resolveDataReady: (() => void) | null = null
let resolveAppWarm: (() => void) | null = null

export const dataReady = new Promise<void>((resolve) => {
  resolveDataReady = resolve
})

/** Резолвится, когда все страницы приложения смонтированы и отрисованы. */
export const appWarm = new Promise<void>((resolve) => {
  resolveAppWarm = resolve
})

export function markDataReady() {
  resolveDataReady?.()
  resolveDataReady = null
}

export function markAppWarm() {
  resolveAppWarm?.()
  resolveAppWarm = null
}

export function hideBootSplash() {
  const el = document.getElementById('boot-splash')
  if (!el || el.classList.contains('done')) return
  el.classList.add('done')
  window.setTimeout(() => el.remove(), 700)
}

/* ── Плавный прогресс сплэша ────────────────────────────────────────────
   Полоса плавно ползёт к 82%, пока грузятся данные и прогреваются страницы;
   когда готовы И данные, И все вкладки — доезжает до 100% и растворяется.
   После скрытия сплэша приложение находится в состоянии «второго захода»:
   все страницы уже отрисованы, клик по любой вкладке мгновенный. */
const MIN_SHOW_MS = 900
const MAX_WAIT_MS = 8000

const t0 = performance.now()
let dataDone = false
let warmDone = false
let shown = 0

void dataReady.then(() => {
  dataDone = true
})
void appWarm.then(() => {
  warmDone = true
})

function done() {
  return (dataDone && warmDone) || performance.now() - t0 > MAX_WAIT_MS
}

function applyBar(p: number) {
  const bar = document.getElementById('splash-bar-fill')
  if (bar) bar.style.width = `${(p * 100).toFixed(1)}%`
}

function tick() {
  if (done()) {
    shown += (1 - shown) * 0.12
    applyBar(shown)
    if (shown > 0.995) {
      applyBar(1)
      const wait = Math.max(0, MIN_SHOW_MS - (performance.now() - t0))
      window.setTimeout(hideBootSplash, wait)
      return
    }
  } else {
    const elapsedS = (performance.now() - t0) / 1000
    const target = Math.min(0.82, 0.14 + elapsedS * 0.22)
    shown += (target - shown) * 0.06
    applyBar(shown)
  }
  requestAnimationFrame(tick)
}

if (typeof document !== 'undefined' && document.getElementById('boot-splash')) {
  requestAnimationFrame(tick)
}
