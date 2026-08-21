import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ACTIVITIES, ACCENTS, ICON_PATHS, CUSTOM_ICONS, COLOR_KEYS } from '../../../entities/rhythm/activities'
import type { Rule, RuleColor } from '../../../entities/rhythm/activities'
import { fmtHM } from '../../../entities/rhythm/useRhythm'
import { DurationSlider } from './DurationSlider'

const DAY_END = 24 * 60

/** Процент от суток с защитой от выхода за 0..100%. */
const dayPct = (m: number) => `${Math.max(0, Math.min(100, (m / DAY_END) * 100))}%`

function fmtFree(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

export function BlockCreator({
  rules,
  onClose,
  presetType,
  setPresetType,
  presetMin,
  setPresetMin,
  custom,
  setCustom,
  customMin,
  setCustomMin,
  chainStart,
  onAdd,
}: {
  rules: Rule[]
  onClose: () => void
  presetType: string | null
  setPresetType: (t: string | null) => void
  presetMin: number
  setPresetMin: (m: number) => void
  custom: { name: string; icon: string; color: RuleColor }
  setCustom: (c: { name: string; icon: string; color: RuleColor }) => void
  customMin: number
  setCustomMin: (m: number) => void
  chainStart: number
  onAdd: (rule: Rule) => void
}) {
  const [showCustom, setShowCustom] = useState(false)

  const start = rules.reduce((t, r) => t + r.minutes, chainStart)
  const anchorName = rules[rules.length - 1]?.name ?? 'старта дня'

  /* Лимит суток: новый блок не может выйти за 24:00. */
  const remaining = Math.max(0, DAY_END - start)
  const MIN_BLOCK = 5
  const canFitBlock = remaining >= MIN_BLOCK

  /* Разблокировка слайдера после заполненного дня → сброс ползунка на начало.
     Невалидные сохранённые значения (0 или больше остатка) тоже нормализуем. */
  const wasLockedRef = useRef(!canFitBlock)
  useEffect(() => {
    if (!canFitBlock) {
      wasLockedRef.current = true
      return
    }
    if (wasLockedRef.current) {
      // Разблокировка после заполненного дня — ползунок на начало
      setPresetMin(MIN_BLOCK)
      setCustomMin(MIN_BLOCK)
      wasLockedRef.current = false
      return
    }
    const normPreset = presetMin < MIN_BLOCK || presetMin > remaining ? MIN_BLOCK : presetMin
    const normCustom = customMin < MIN_BLOCK || customMin > remaining ? MIN_BLOCK : customMin
    if (normPreset !== presetMin) setPresetMin(normPreset)
    if (normCustom !== customMin) setCustomMin(normCustom)
  }, [canFitBlock, remaining, presetMin, customMin])

  const rawPreviewMin = presetType ? presetMin : customMin
  const previewMinSafe = Math.min(rawPreviewMin, remaining)
  const overflowMin = rawPreviewMin - previewMinSafe
  const pEnd = Math.min(start + previewMinSafe, DAY_END)

  /* Сегменты существующей цепочки в границах суток. */
  let accT = chainStart
  const daySegs = rules.map((r) => {
    const seg = { start: accT, end: Math.min(accT + r.minutes, DAY_END), color: r.color }
    accT += r.minutes
    return seg
  })
  const previewAccent = presetType
    ? ACCENTS[ACTIVITIES[presetType].color]
    : ACCENTS[custom.color]

  return (
    <div
      className="rounded-2xl p-3.5"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-lg" style={{ background: previewAccent.bg, color: previewAccent.color }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="text-[12px] font-semibold text-[var(--text)]">
          Новый блок <span className="text-[var(--text-faint)] font-normal">после «{anchorName}»</span>
        </span>
        <button
          onClick={onClose}
          className="ml-auto grid size-6 place-items-center rounded-md text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mt-3 mb-1.5">
        Готовые блоки
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {Object.entries(ACTIVITIES).map(([type, a]) => {
          const acc = ACCENTS[a.color]
          const sel = presetType === type
          return (
            <motion.button
              key={type}
              onClick={() => {
                setPresetType(type)
                setPresetMin(Math.min(a.presets[0], remaining))
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
              className="flex flex-col items-center gap-1 rounded-lg px-1 py-2"
              style={{
                background: sel ? acc.bg : 'var(--surface-3)',
                border: `1px solid ${sel ? acc.border : 'transparent'}`,
                boxShadow: sel ? `0 0 14px rgba(${acc.glow},0.2)` : 'none',
                transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <motion.svg
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                animate={sel ? { rotate: [0, -12, 12, 0], scale: [1, 1.18, 1] } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.45 }}
              >
                <path d={ICON_PATHS[a.icon]} />
              </motion.svg>
              <span className="text-[9.5px] font-semibold" style={{ color: acc.color }}>{a.label}</span>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {presetType && (() => {
          const a = ACTIVITIES[presetType]
          const acc = ACCENTS[a.color]
          return (
            <motion.div
              key={presetType}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="mt-2.5 rounded-xl p-3"
              style={{ background: acc.bg, border: `1px solid ${acc.border}` }}
            >
              <div className="flex items-center gap-1.5">
                {a.presets.map((m) => {
                  const fits = m <= remaining
                  return (
                    <motion.button
                      key={m}
                      onClick={() => fits && setPresetMin(m)}
                      whileTap={fits ? { scale: 0.92 } : undefined}
                      className="rounded-lg px-2 py-1 text-[11px] font-mono"
                      style={
                        presetMin === m
                          ? { background: acc.dot, color: '#131418', fontWeight: 700 }
                          : { background: 'rgba(19,20,24,0.35)', color: fits ? 'var(--text-dim)' : 'var(--text-faint)', opacity: fits ? 1 : 0.45 }
                      }
                      title={fits ? undefined : `Не влезает — свободно ${fmtFree(remaining)}`}
                    >
                      {m}
                    </motion.button>
                  )
                })}
              </div>

              <div className="mt-1">
                {canFitBlock ? (
                  <DurationSlider
                    value={Math.min(presetMin, remaining)}
                    max={Math.min(240, remaining)}
                    accent={acc}
                    onChange={(m) => setPresetMin(Math.max(MIN_BLOCK, m))}
                  />
                ) : (
                  <div
                    className="rounded-lg px-2 py-1.5 text-[10.5px]"
                    style={{ background: 'rgba(19,20,24,0.35)', color: remaining <= 0 ? '#ff6b6b' : 'var(--text-faint)' }}
                  >
                    {remaining <= 0
                      ? 'День заполнен до 24:00 — освободите место'
                      : `Свободно ${fmtFree(remaining)} — меньше минимального блока (${MIN_BLOCK} мин)`}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-[10.5px]">
                <span className="uppercase tracking-[0.08em] text-[9.5px] font-semibold text-[var(--text-faint)]">Встанет в цепочку</span>
                <span className="font-mono tabular-nums font-semibold" style={{ color: acc.color }}>
                  {fmtHM(start)} → {fmtHM(Math.min(start + Math.min(presetMin, remaining), DAY_END))}
                </span>
                <span className="ml-auto font-mono tabular-nums" style={{ color: presetMin > remaining ? '#ff6b6b' : 'var(--text-faint)' }}>
                  {presetMin > remaining ? `лимит 24ч` : `свободно ${fmtFree(remaining - Math.min(presetMin, remaining))}`}
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!canFitBlock || presetMin < MIN_BLOCK || presetMin > remaining}
                onClick={() => onAdd({
                  id: crypto.randomUUID(),
                  type: presetType,
                  name: a.label,
                  minutes: Math.min(presetMin, remaining),
                  color: a.color,
                  icon: a.icon,
                })}
                className="mt-2.5 w-full rounded-xl py-2 text-[12px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: acc.gradient,
                  color: '#131418',
                  boxShadow: `0 4px 16px rgba(${acc.glow},0.35)`,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {presetMin >= MIN_BLOCK ? `Вставить · ${Math.min(presetMin, remaining)} мин` : 'Вставить'}
              </motion.button>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      <div className="mt-2.5 rounded-xl" style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)' }}>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="w-full flex items-center gap-2 px-3 py-2"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
          <span className="text-[11.5px] font-semibold text-[var(--text-dim)]">Своё правило</span>
          <motion.svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="ml-auto"
            animate={{ rotate: showCustom ? 180 : 0 }}
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        </button>
        <AnimatePresence initial={false}>
          {showCustom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-3 pt-1 pb-3 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={custom.name}
                    onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && custom.name.trim() && canFitBlock && customMin >= MIN_BLOCK) {
                        onAdd({
                          id: crypto.randomUUID(),
                          type: 'focus',
                          name: custom.name.trim(),
                          minutes: Math.min(customMin, remaining),
                          color: custom.color,
                          icon: custom.icon,
                        })
                        setCustom({ name: '', icon: 'star', color: 'blue' })
                      }
                    }}
                    placeholder="Название, например «Спортзал»"
                    className="relative z-[1] flex-1 min-w-0 rounded-lg bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none border border-[var(--stroke)] transition-[border-color,box-shadow] focus:border-[var(--focus)] focus:shadow-[0_0_0_1px_var(--focus),0_0_12px_rgba(76,141,255,0.25)] placeholder:text-[var(--text-faint)]"
                  />
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      if (!custom.name.trim() || !canFitBlock || customMin < MIN_BLOCK) return
                      onAdd({
                        id: crypto.randomUUID(),
                        type: 'focus',
                        name: custom.name.trim(),
                        minutes: Math.min(customMin, remaining),
                        color: custom.color,
                        icon: custom.icon,
                      })
                      setCustom({ name: '', icon: 'star', color: 'blue' })
                    }}
                    disabled={!custom.name.trim() || !canFitBlock || customMin < MIN_BLOCK}
                    className="shrink-0 rounded-lg px-3 py-2 text-[11.5px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: ACCENTS[custom.color].dot, color: '#131418' }}
                  >
                    Вставить
                  </motion.button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg px-1.5 py-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}>
                    {CUSTOM_ICONS.map((icon) => {
                      const sel = custom.icon === icon
                      return (
                        <motion.button
                          key={icon}
                          onClick={() => setCustom({ ...custom, icon })}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.85 }}
                          className="grid size-6 place-items-center rounded-md transition-colors"
                          style={{
                            background: sel ? ACCENTS[custom.color].bg : 'transparent',
                            boxShadow: sel ? `0 0 10px rgba(${ACCENTS[custom.color].glow},0.3)` : 'none',
                          }}
                          title={icon}
                        >
                          <svg
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={sel ? ACCENTS[custom.color].color : 'var(--text-faint)'}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d={ICON_PATHS[icon]} />
                          </svg>
                        </motion.button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}>
                    {COLOR_KEYS.map((c) => {
                      const sel = custom.color === c
                      return (
                        <motion.button
                          key={c}
                          onClick={() => setCustom({ ...custom, color: c })}
                          whileHover={{ scale: 1.25 }}
                          whileTap={{ scale: 0.85 }}
                          className="size-4 rounded-full"
                          style={{
                            background: ACCENTS[c].dot,
                            boxShadow: sel
                              ? `0 0 0 2px rgba(19,20,24,1), 0 0 0 4px ${ACCENTS[c].color}, 0 0 10px rgba(${ACCENTS[c].glow},0.5)`
                              : 'none',
                          }}
                          title={c}
                        />
                      )
                    })}
                  </div>
                </div>

                {canFitBlock ? (
                  <DurationSlider
                    value={Math.min(customMin, remaining)}
                    max={Math.min(1080, remaining)}
                    accent={ACCENTS[custom.color]}
                    onChange={(m) => setCustomMin(Math.max(MIN_BLOCK, m))}
                  />
                ) : (
                  <div
                    className="rounded-lg px-2 py-1.5 text-[10.5px]"
                    style={{ background: 'rgba(19,20,24,0.35)', color: remaining <= 0 ? '#ff6b6b' : 'var(--text-faint)' }}
                  >
                    {remaining <= 0
                      ? 'День заполнен до 24:00 — освободите место'
                      : `Свободно ${fmtFree(remaining)} — меньше минимального блока (${MIN_BLOCK} мин)`}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9.5px] uppercase tracking-[0.08em] font-semibold text-[var(--text-faint)]">Сутки · 24 ч</span>
          {remaining <= 0 ? (
            <span className="text-[10px] font-mono font-semibold tabular-nums" style={{ color: '#ff6b6b' }}>
              день заполнен до 24:00
            </span>
          ) : overflowMin > 0 ? (
            <span className="text-[10px] font-mono font-semibold tabular-nums" style={{ color: '#ff6b6b' }}>
              не влезает · {overflowMin} мин
            </span>
          ) : (
            <span className="text-[10px] font-mono tabular-nums text-[var(--text-faint)]">
              свободно до 24:00 · {fmtFree(remaining)}
            </span>
          )}
        </div>

        <motion.div
          layout
          className="relative h-[26px] rounded-lg overflow-hidden border"
          style={{
            background: 'var(--surface-3)',
            borderColor: overflowMin > 0 || remaining <= 0 ? 'rgba(255,107,107,0.55)' : 'var(--stroke)',
          }}
        >
          {/* Сетка часов */}
          {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 w-px pointer-events-none"
              style={{ left: dayPct(h * 60), background: h % 6 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.045)' }}
            />
          ))}

          {/* Существующая цепочка блоков */}
          {daySegs.map((s, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0"
              style={{
                left: dayPct(s.start),
                width: dayPct(s.end - s.start),
                background: ACCENTS[s.color as RuleColor]?.gradient ?? 'var(--off)',
                opacity: 0.75,
              }}
            />
          ))}

          {/* Пульсирующее превью нового блока */}
          {previewMinSafe > 0 && (
            <motion.div
              className="absolute top-0 bottom-0 z-[1]"
              style={{
                left: dayPct(start),
                width: dayPct(pEnd - start),
                background: previewAccent.gradient,
                boxShadow: `0 0 12px rgba(${previewAccent.glow},0.5)`,
              }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0" style={{ background: `rgba(${previewAccent.glow},0.25)` }} />
            </motion.div>
          )}

          {/* Маркер стыка — куда встанет новый блок */}
          <div
            className="absolute top-0 bottom-0 w-[2px] z-[2] pointer-events-none"
            style={{
              left: dayPct(start),
              background: '#fff',
              opacity: 0.75,
              boxShadow: '0 0 8px rgba(255,255,255,0.9)',
            }}
          />
        </motion.div>

        {/* Подписи часов */}
        <div className="relative h-[13px] mt-0.5">
          {[0, 6, 12, 18, 24].map((h) => (
            <span
              key={h}
              className="absolute text-[8.5px] font-mono text-[var(--text-faint)] tabular-nums"
              style={{
                left: dayPct(h * 60),
                transform: h === 0 ? 'none' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}