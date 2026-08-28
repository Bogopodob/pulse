-- Статусы задач: todo / in_progress / done / overdue / cancelled
ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'todo';
