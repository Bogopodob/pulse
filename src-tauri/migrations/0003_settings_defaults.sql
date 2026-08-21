-- Настройки приложения: сидируем значения по умолчанию для всех ключей,
-- КРОМЕ сервисов/интеграций (Telegram и т.п.) — они живут на фронте
-- в отдельном хранилище и в эту таблицу не попадают.
-- INSERT OR IGNORE: пользовательские данные никогда не перетираются.
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('name',            'Гость'),
  ('email',           'you@pulse.app'),
  ('daily_goal_min',  '480'),
  ('chain_start_min', '540'),
  ('date_format',     'DD.MM.YYYY'),
  ('time_format',     '24h'),
  ('week_start',      'mon'),
  ('timezone',        'Europe/Moscow');
