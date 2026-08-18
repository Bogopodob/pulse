import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ACTIVITIES, ACCENTS, ICON_PATHS, CUSTOM_ICONS, COLOR_KEYS } from '../../../entities/rhythm/activities'
import type { Rule, RuleColor } from '../../../entities/rhythm/activities'
import { fmtHM } from '../../../entities/rhythm/useRhythm'
import { useSettings } from '../../../shared/hooks/useSettings'
import { DurationSlider } from './DurationSlider'

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
  onAdd: (rule: Rule) => void
}) {
  const [showCustom, setShowCustom] = useState(false)
  const { chainStartMin } = useSettings()

  const start = rules.reduce((t, r) => t + r.minutes, chainStartMin)
  const anchorName = rules[rules.length - 1]?.name ?? 'старта дня'
  const previewMin = presetType ? presetMin : customMin
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
                setPresetMin(a.presets[0])
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
                {a.presets.map((m) => (
                  <motion.button
                    key={m}
                    onClick={() => setPresetMin(m)}
                    whileTap={{ scale: 0.92 }}
                    className="rounded-lg px-2 py-1 text-[11px] font-mono"
                    style={
                      presetMin === m
                        ? { background: acc.dot, color: '#131418', fontWeight: 700 }
                        : { background: 'rgba(19,20,24,0.35)', color: 'var(--text-dim)' }
                    }
                  >
                    {m}
                  </motion.button>
                ))}
              </div>

              <div className="mt-1">
                <DurationSlider value={presetMin} max={240} accent={acc} onChange={setPresetMin} />
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-[var(--text-faint)]">
                <span className="uppercase tracking-[0.08em] text-[9.5px] font-semibold">Встанет в цепочку</span>
                <span className="font-mono tabular-nums font-semibold" style={{ color: acc.color }}>
                  {fmtHM(start)} → {fmtHM(start + presetMin)}
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onAdd({
                  id: crypto.randomUUID(),
                  type: presetType,
                  name: a.label,
                  minutes: presetMin,
                  color: a.color,
                  icon: a.icon,
                })}
                className="mt-2.5 w-full rounded-xl py-2 text-[12px] font-bold flex items-center justify-center gap-1.5"
                style={{
                  background: acc.gradient,
                  color: '#131418',
                  boxShadow: `0 4px 16px rgba(${acc.glow},0.35)`,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Вставить · {presetMin} мин
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
              <div className="px-3 pb-3 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={custom.name}
                    onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && custom.name.trim()) {
                        onAdd({
                          id: crypto.randomUUID(),
                          type: 'focus',
                          name: custom.name.trim(),
                          minutes: customMin,
                          color: custom.color,
                          icon: custom.icon,
                        })
                        setCustom({ name: '', icon: 'star', color: 'blue' })
                      }
                    }}
                    placeholder="Название, например «Спортзал»"
                    className="flex-1 min-w-0 rounded-lg bg-[var(--surface-2)] px-2.5 py-2 text-[12px] outline-none border border-[var(--stroke)] transition-colors focus:border-[var(--focus)] placeholder:text-[var(--text-faint)]"
                  />
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      if (!custom.name.trim()) return
                      onAdd({
                        id: crypto.randomUUID(),
                        type: 'focus',
                        name: custom.name.trim(),
                        minutes: customMin,
                        color: custom.color,
                        icon: custom.icon,
                      })
                      setCustom({ name: '', icon: 'star', color: 'blue' })
                    }}
                    disabled={!custom.name.trim()}
                    className="shrink-0 rounded-lg px-3 py-2 text-[11.5px] font-bold disabled:opacity-40"
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

                <DurationSlider value={customMin} max={1080} accent={ACCENTS[custom.color]} onChange={setCustomMin} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2.5 mt-2.5">
        <div className="flex-1 flex h-6 rounded-lg overflow-hidden border border-[var(--stroke)] bg-[var(--surface-3)]">
          {rules.map((r) => (
            <div key={r.id} className="h-full" style={{ flex: r.minutes, background: ACCENTS[r.color].gradient, opacity: 0.4 }} />
          ))}
          <div className="relative h-full" style={{ flex: previewMin, background: previewAccent.gradient }}>
            <motion.div
              animate={{ opacity: [0.35, 0.9, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              className="absolute inset-0"
              style={{ background: `rgba(${previewAccent.glow},0.35)` }}
            />
          </div>
        </div>
        <div className="text-[10px] font-mono text-[var(--text-faint)] whitespace-nowrap tabular-nums">
          {fmtHM(start)} → {fmtHM(start + previewMin)}
        </div>
      </div>
    </div>
  )
}