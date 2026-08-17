# Frontend Architecture — Feature-Sliced Design (FSD)

## Архитектурный подход

Проект использует **Feature-Sliced Design (FSD)** — архитектуру для крупных frontend-приложений.

Основная идея: код разделяется **по бизнес-возможностям**, а не по типам файлов.

## Структура

```text
src/
├── app/          # Инициализация приложения
├── pages/        # Страницы
├── widgets/      # Крупные блоки интерфейса
├── features/     # Пользовательские сценарии
├── entities/     # Бизнес-сущности
├── shared/       # Общие компоненты
│   ├── api/
│   ├── ui/
│   ├── lib/
│   ├── hooks/
│   ├── config/
│   ├── assets/
│   └── types/
```

## Ответственность слоёв

| Слой | Назначение |
|------|------------|
| app | Router, Providers, Theme, Store |
| pages | Сборка страницы из widgets/features |
| widgets | Крупные UI-блоки |
| features | Завершённые пользовательские действия |
| entities | Бизнес-модель и отображение сущностей |
| shared | Переиспользуемый код |

## Что хранить

### app
- Router
- QueryClient
- Providers
- Theme
- Store

### pages
```text
pages/
 └── Schedule/
     ├── ui/
     └── index.ts
```

### widgets
```text
widgets/
 ├── Sidebar/
 ├── Header/
 ├── Schedule/
```

### features
```text
features/
 ├── SearchSchedule/
```

Каждая feature:

```text
Feature/
├── api/
├── model/
├── ui/
├── lib/
├── config/
└── index.ts
```

### entities

```text
entities/
├── Schedule/
```

Структура сущности:

```text
Disease/
├── api/
├── model/
├── ui/
├── lib/
└── index.ts
```

### shared

```text
shared/
├── api/
├── ui/
├── hooks/
├── lib/
├── config/
├── assets/
├── types/
└── constants/
```

## Правила зависимостей

```text
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

Запрещено направлять зависимости вверх.

## Для проекта Curatio

```text
pages/
├── Dashboard
├── Schedule
└── Settings

widgets/
├── Sidebar
├── Timeline

features/
├── SearchSchedule
├── Login

entities/
├── Schedule
├── Setting
```

## Фактическая структура проекта (pulse)

```text
src/
├── main.tsx                       # корневой вход (index.html → /src/main.tsx)
├── app/
│   ├── App.tsx                    # состояние правил, useRhythm, переключение страниц, clock
│   └── styles/index.css           # глобальные стили (карты, aurora, glow)
├── pages/
│   ├── Today.tsx                  # СЕГОДНЯ: header, сетка NextUp/Timeline/TodayTasks/RuleChips
│   ├── Schedule.tsx               # РАСПИСАНИЕ: GanttTimeline
│   └── Stats.tsx                  # СТАТИСТИКА: AreaChart (bklit) + сводные карточки
├── widgets/
│   ├── TitleBar.tsx               # верхняя панель (статус rest/focus/idle)
│   ├── Sidebar.tsx                # навигация по страницам
│   ├── NextUp.tsx                 # карточка ближайшего события + кнопка «+5 мин»
│   ├── Timeline.tsx               # график «Ритм дня» (BarsLayer мемоизирован)
│   ├── TodayTasks.tsx             # список дел дня
│   ├── SegmentStatus.tsx          # статус сегмента (не используется)
│   ├── GanttTimeline.tsx          # шкала расписания
│   ├── Toast.tsx                  # уведомление о смене сегмента
│   └── Header.tsx, StatsBar.tsx, QuickActions.tsx, QuickCreate.tsx  # устаревшие, не используются
├── features/
│   ├── add-rule/                  # редактор «Правила дня»
│   │   ├── index.tsx              # RuleChips (memo): список, drag-сортировка, «Блок»
│   │   └── ui/
│   │       ├── RuleRow.tsx        # строка правила (inline-редактирование, EditState)
│   │       ├── BlockCreator.tsx   # панель создания блока (пресеты/своё правило, превью)
│   │       └── DurationSlider.tsx # слайдер длительности с пузырём значения
│   └── reminders/                 # устаревшее, не используется (ActiveReminders, UpcomingAlerts, CompletedSection, ReminderCard, model/useReminders.ts)
├── entities/
│   └── rhythm/                    # бизнес-сущность «Ритм дня»
│       ├── activities.ts          # Rule, ACCENTS (glow), ACTIVITIES, ICON_PATHS, COLOR_KEYS, DEFAULT_RULES, RESTING_TYPES
│       └── useRhythm.ts           # useRhythm(rules), buildSegments, buildBars, fmtHM, CHAIN_START=540
└── shared/
    ├── hooks/
    │   ├── useTheme.tsx           # тёмная/светлая тема
    │   └── useI18n.tsx            # локализация
    ├── ui/
    │   ├── charts/                # bklit area-chart (shadcn-регистр, visx + motion)
    │   └── shimmering-text.tsx    # мерцающий текст (bklit)
    ├── lib/
    │   └── utils.ts               # cn()
    ├── config/
    │   └── i18n.ts                # переводы (ru/en)
    └── types/
        └── index.ts               # общие типы
```

Особенности:
- **Пат-алиасов нет** — только относительные импорты; слои соединяются `../../`-путями.
- Алиас `@/` → `./src/*` добавлен исключительно для bklit-чартов (tsconfig.app.json paths + vite resolve.alias + components.json).
- Импорты направлены строго вниз (entities → shared, features → entities/shared, widgets → entities/shared).
- `RuleChips`/`Timeline`/`BarsLayer` обёрнуты в `memo`, `buildBars` — чистая функция вне хука, `useRhythm` пишет DOM напрямую в rAF и обновляет состояние не чаще 1 раза за 0.1 мин симуляции.
- Устаревшие компоненты (Header, reminders, QuickActions, QuickCreate, StatsBar, SegmentStatus) перемещены, но не подключены — удалять только по согласованию.

## Checklist

- Бизнес-логика в features/entities
- Shared только общий код
- Widgets не содержат бизнес-логики
- Pages только собирают экран
- App только конфигурация
- Зависимости только сверху вниз
