import { GanttTimeline } from '../widgets/GanttTimeline'

export function Schedule({ title, desc, clockStr, onNewTask }: { title: string; desc: string; clockStr: string; onNewTask: () => void }) {
  return (
    <>
      <div className="flex items-end justify-between px-6 sm:px-8 md:px-10 pb-3">
        <div>
          <h1 className="font-[var(--font-display)] text-[24px] font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="text-[13px] text-[var(--text-dim)] mt-1">{desc}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-faint)]">
            <span className="w-[8px] h-[8px] inline-block rounded-full" style={{ background: '#ff5a1f', boxShadow: '0 0 8px rgba(255,90,31,0.6)' }} />
            сегодня
          </div>
          <div className="text-[12px] text-[var(--text-dim)] bg-[var(--surface)] border border-[var(--stroke)] px-3 py-1.5 rounded-full tabular-nums">
            {clockStr}
          </div>
        </div>
      </div>
      <GanttTimeline onNewTask={onNewTask} />
    </>
  )
}