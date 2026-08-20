import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GanttTimeline } from '../widgets/GanttTimeline'
import { AddTaskForm } from '../features/tasks/ui/AddTaskForm'
import { useTasks } from '../entities/tasks/useTasks'

const TODAY = new Date(2026, 7, 21)

export function Schedule({ title, desc, clockStr }: { title: string; desc: string; clockStr: string }) {
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { tasks, addTask, updateTask, deleteTask, projects, addProject } = useTasks()

  const editingTask = editingId ? tasks.find((t) => t.id === editingId) ?? null : null
  const inForm = creating || editingTask !== null

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
      <div className="flex-1 flex min-h-0 relative">
        <AnimatePresence mode="wait">
          {inForm ? (
            <motion.div
              key={creating ? 'add-task' : `edit-${editingTask!.id}`}
              className="w-full flex flex-col min-h-0 min-w-0"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            >
              <AddTaskForm
                initialDay={TODAY}
                tasks={tasks}
                projects={projects}
                editing={creating ? null : editingTask}
                onAdd={(data) => {
                  if (creating) addTask(data)
                  else if (editingTask) updateTask(editingTask.id, data)
                  setCreating(false)
                  setEditingId(null)
                }}
                onAddProject={addProject}
                onBack={() => {
                  setCreating(false)
                  setEditingId(null)
                }}
                onDelete={
                  editingTask
                    ? () => {
                        deleteTask(editingTask.id)
                        setEditingId(null)
                      }
                    : undefined
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="timeline"
              className="flex-1 flex min-h-0 min-w-0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
            >
              <GanttTimeline onNewTask={() => setCreating(true)} onOpenTask={(id) => setEditingId(id)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}