# Frontend Security Playbook: React + Vite + TypeScript (FSD)

> Этот документ — фронтенд-часть для медицинского проекта: React, Vite, TypeScript, архитектура Feature-Sliced Design (FSD).
> Формат тот же: риск → как проверить → уязвимый код → безопасный код → автоматизация.

**Важно про модель угроз фронтенда:** клиентский код полностью виден и модифицируем пользователем (DevTools, перехват трафика, патч бандла). Поэтому фронтенд **никогда не является границей безопасности** — он дополняет бэкенд-проверки для UX, но каждая проверка прав/валидация обязана дублироваться на сервере (см. backend playbook, раздел 4/8). Все пункты ниже — про то, как не создать утечку/уязвимость *на стороне клиента*, а не про то, чтобы «защититься от собственного пользователя».

---

## Оглавление

0. [Чек-лист после каждого сеанса вайбкодинга (frontend)](#0-чек-лист-после-каждого-сеанса-вайбкодинга-frontend)
1. XSS в React (Reflected / Stored / DOM-based)
2. `dangerouslySetInnerHTML` и санитизация
3. Хранение токенов и сессии на клиенте
4. CSRF во взаимодействии с cookie-based auth
5. Секреты и переменные окружения в Vite
6. Dependency & Supply Chain Security (npm)
7. FSD-архитектура и границы безопасности
8. CSP на стороне фронтенда (сборка, nonce, инлайны)
9. Source maps и утечка через артефакты сборки
10. Сторонние скрипты, аналитика, трекеры и PHI
11. WebSocket-клиент (Pusher-js / Soketi)
12. Валидация файлов на клиенте (дополнение к бэкенду)
13. Clickjacking и защита от встраивания в iframe
14. Prototype Pollution и небезопасные npm-пакеты
15. Клиентская авторизация: route guards — UX, не security
16. Медицинские данные в браузере: маскирование, автологаут, история, буфер обмена
17. TypeScript как инструмент безопасности: strict-режим, валидация ответов API
18. Автоматизация: ESLint security, Semgrep, npm audit, CI gates
19. Release Checklist (frontend)
20. Deploy Checklist (frontend)
21. Приложения (шаблоны конфигов)
22. HeroUI: используем UI-kit вместо голого HTML
23. [Итог](#итог)

---

## 0. Чек-лист после каждого сеанса вайбкодинга (frontend)

### 0.1 Быстрый gate (5–10 минут, всегда)

- [ ] `git diff` прочитан построчно человеком.
- [ ] Не добавлено новых `dangerouslySetInnerHTML` без прогона через санитайзер (раздел 2).
- [ ] Не добавлено `eval(`, `new Function(`, `setTimeout("...")`/`setInterval("...")` со строкой вместо колбэка.
- [ ] Токены/секреты не сохраняются в `localStorage`/`sessionStorage`, если проект использует httpOnly-cookie схему (раздел 3) — AI часто «по умолчанию» тянет токен в `localStorage`, потому что так проще в туториалах.
- [ ] Новые переменные окружения с секретами не добавлены с префиксом `VITE_` (всё с `VITE_` попадает в клиентский бандл в открытом виде, раздел 5).
- [ ] Новый импорт между FSD-слоями не нарушает правило зависимостей (`shared → entities → features → widgets → pages → app`), особенно imports «наверх» или «вбок» между независимыми фичами (раздел 7).
- [ ] Новый компонент, отображающий данные пациента, не логирует их в `console.log` (частый «отладочный» артефакт AI-кода, остающийся в проде).
- [ ] Новый вызов API не отправляет PHI в query string (осядет в browser history, access-логах, Sentry breadcrumbs).
- [ ] Новый route не полагается только на клиентскую проверку роли/прав без соответствующей серверной проверки (раздел 15) — фронтенд guard — это UX, не защита.
- [ ] Новый интерактивный элемент (кнопка, инпут, модалка, таблица, dropdown, чекбокс и т.п.) реализован через компонент HeroUI, а не голым `<button>`/`<input>`/самодельным `<div onClick>` — см. раздел 22. Голый HTML для таких элементов — сигнал, что AI-агент «упростил» задачу в обход UI-kit'а, а вместе с этим и в обход встроенных в него a11y/escaping-гарантий.
- [ ] `npm audit --audit-level=high` — 0 новых high/critical.
- [ ] `tsc --noEmit` — 0 новых ошибок типов (особенно `any`, просочившийся в данные, приходящие с сервера).
- [ ] ESLint (включая security-плагины) — 0 новых warning/error.
- [ ] Не добавлено новых сторонних `<script src="https://...">`/npm-виджетов (чаты, аналитика) без ревью, что именно им доступно на странице с PHI (раздел 10).

### 0.2 Расширенный gate (для экранов с данными пациентов)

- [ ] Поле с PHI не попадает в URL (path/query params) — только в теле запроса/сторе.
- [ ] Поле с PHI не сохраняется в `localStorage`/`sessionStorage`/IndexedDB без явного обоснования (offline-режим и т.п.) — по умолчанию PHI живёт только в памяти (React state/store), исчезает при закрытии вкладки.
- [ ] Экран с PHI поддерживает автоскрытие/блокировку при неактивности (раздел 16), если это предусмотрено требованиями проекта.
- [ ] Копирование в буфер обмена (`navigator.clipboard`) для PHI-полей — осознанное решение, не побочный эффект (буфер обмена доступен другим приложениям на устройстве).
- [ ] Скриншот/печать страницы с PHI — если критично, используется `@media print`/CSS-маскирование чувствительных полей (проектное решение, не универсальное требование).
- [ ] Ответ API валидируется схемой (zod/io-ts) перед использованием в UI — AI не должен доверять `as PatientDTO` без рантайм-проверки (раздел 17).

### 0.3 Ручное чтение diff — на что смотреть глазами

| Паттерн в diff | Что проверить |
|---|---|
| `dangerouslySetInnerHTML` | источник HTML — доверенный? прогнан через DOMPurify? |
| `axios.get(\`...${userInput}...\`)` / `fetch` с шаблонной строкой | нет ли открытого редиректа/SSRF-подобной проблемы через клиентские прокси-эндпоинты |
| Новый `localStorage.setItem` / `sessionStorage.setItem` | что именно сохраняется — токен? PHI? |
| Новый `<a target="_blank">` | есть ли `rel="noopener noreferrer"` (защита от `window.opener` reverse tabnabbing) |
| Новый `window.location = userControlledValue` | открытый редирект |
| Новый импорт из другого FSD-слайса напрямую (`features/a/model` → `features/b/model`) | нарушение границ FSD, потенциальная утечка внутреннего состояния |
| Новый `<button>`, `<input>`, `<select>`, `<table>`, самодельная модалка на `<div>` | почему не соответствующий компонент HeroUI (раздел 22) — обоснование должно быть явным, не «так быстрее» |
| Новая зависимость в `package.json` | автор, дата публикации, downloads, есть ли известные CVE (`npm audit`) |
| Изменения в `vite.config.ts` | не ослаблен ли `server.cors`, не включён ли `define` с секретом |
| Новый `postMessage`/`window.addEventListener('message', ...)` | проверяется ли `event.origin` перед обработкой |

### 0.4 Если хоть один пункт не выполнен

Коммит не делается — тот же принцип, что и в backend playbook: pre-commit hook блокирует коммит при провале `tsc`, `eslint`, `npm audit` (раздел 18).
## 1. XSS в React (Reflected / Stored / DOM-based)

React по умолчанию экранирует значения в JSX (`{value}`), поэтому «классический» XSS в React реже, чем в чистом JS/PHP-шаблонах — но AI-код регулярно находит способы это обойти.

### 1.1 Безопасный дефолт

```tsx
// Безопасно — React экранирует автоматически
function PatientName({ name }: { name: string }) {
  return <span>{name}</span>; // даже если name = "<script>alert(1)</script>", выведется как текст
}
```

### 1.2 Опасные обходы

Уязвимо:
```tsx
// AI использует innerHTML напрямую через ref — React-экранирование обходится
function Notice({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html; // XSS, если html из ответа сервера/пользователя
  }, [html]);
  return <div ref={ref} />;
}
```

Уязвимо:
```tsx
// URL-based XSS через href с непроверенной схемой
<a href={patient.website}>{patient.website}</a>
// patient.website = "javascript:alert(document.cookie)" — выполнится при клике
```

Безопасно:
```tsx
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

<a href={isSafeUrl(patient.website) ? patient.website : '#'}>{patient.website}</a>
```

### 1.3 DOM-based XSS через сторонние библиотеки

Проверять любую библиотеку, которая рендерит markdown/rich text (`react-markdown`, `remark`, WYSIWYG-редакторы) — по умолчанию должны иметь `sanitize`/`allowDangerousHtml: false`.

```tsx
// Уязвимо — allowDangerousHtml включает сырой HTML внутри markdown
<ReactMarkdown rehypePlugins={[rehypeRaw]}>{patientNote}</ReactMarkdown>

// Безопасно — без rehypeRaw, markdown рендерится в safe-подмножество HTML
<ReactMarkdown>{patientNote}</ReactMarkdown>
```

---

## 2. `dangerouslySetInnerHTML` и санитизация

Если HTML действительно нужен (например, отформатированные заметки врача, сохранённые как rich text) — обязателен санитайзер, никогда не сырой HTML с сервера напрямую.

Уязвимо:
```tsx
function DoctorNote({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />; // html может содержать <script>/onerror=
}
```

Безопасно:
```tsx
import DOMPurify from 'dompurify';

function DoctorNote({ html }: { html: string }) {
  const clean = useMemo(
    () => DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'] }),
    [html],
  );
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

Чек-лист:
- [ ] `grep -rn "dangerouslySetInnerHTML" src/` — каждое вхождение проходит через `DOMPurify.sanitize` (или эквивалент) с явным whitelist тегов/атрибутов, не дефолтной конфигурацией «разрешить всё, кроме `<script>`».
- [ ] Санитизация происходит **на клиенте перед рендером**, даже если бэкенд тоже санитизирует — defense in depth (бэкенд может обновиться/сломаться независимо).
- [ ] Конфигурация DOMPurify не разрешает `data:`-схему в `src`/`href` без необходимости (вектор для встроенного JS через `data:text/html`).

---

## 3. Хранение токенов и сессии на клиенте

**Решение, принятое в этом проекте:** API работает на отдельном домене/порту от SPA, поэтому cookie-based схема (Sanctum SPA, httpOnly-cookie) здесь архитектурно не подходит — используется **Bearer-схема** с access- и refresh-токеном, хранящимися в `localStorage` (`src/shared/lib/session.ts`). Это осознанное задокументированное исключение из «идеальной» схемы ниже, и оно компенсируется контр-мерами, перечисленными в 3.2. Ниже — модель: почему httpOnly лучше «в идеале», как выглядит наш компромисс и чем он окупается.

### 3.1 Эталонная схема (httpOnly-cookie, Sanctum SPA) — для будущих интеграций

Для справки, при размещении SPA и API на одном домене более безопасна cookie-схема — httpOnly-cookie недоступен для чтения через XSS, а `localStorage`/обычная переменная — доступны:

```ts
// api/client.ts
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // отправляет httpOnly cookie автоматически, токен не виден JS
});

// Перед первым запросом — получение CSRF cookie (Sanctum stateful)
await apiClient.get('/sanctum/csrf-cookie');
```

С этой схемой XSS-уязвимость в приложении не даёт напрямую украсть токен сессии (cookie недоступна из JS), но CSRF-риск переходит в зону ответственности (раздел 4).

### 3.2 Текущая схема проекта (Bearer-токен + refresh в localStorage) — задокументированное исключение

Реализация: `src/shared/api/auth.ts` (получение сессии), `src/shared/lib/session.ts` (хранение), `src/shared/api/client.ts` (`authFetch` с Bearer-заголовком и авто-refresh по 401).

```ts
// src/shared/lib/session.ts — как это сейчас выглядит в проекте
const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refresh_token'
// … saveSession()/getSessionToken()/refresh — access и refresh лежат в localStorage
```

**Почему это менее безопасно, чем httpOnly-cookie:** любой XSS на странице может как `fetch`-ем позвать `/auth/refresh` от имени пользователя, так и вытащить refresh-токен из `localStorage` и наладить сессию уже за пределами вкладки. Поэтому локальная крепость переносится на то, чтобы:

- XSS был максимально невозможен (разделы 1–2, самый важный столб — «не допустить любой инъекции»);
- токены были **короткоживущими**: access — минуты, refresh — ограниченный TTL; refresh повернут сервером (single-use / ротация) — это уже бэкенд (см. backend playbook, раздел 7);
- Logout инвалидировал refresh на сервере, а не только чистил `localStorage` (раздел 0.2);
- PHI не лежала в `localStorage` вообще — в сторе только сессионные токены, чувствительные данные живут в памяти (`React state`/`zustand`) и исчезают при закрытии вкладки (раздел 16).

**Когда пересматривать:** если SPA и API переедут на один домен и появится возможность cookie-based auth — это наилучший кандидат для рефакторинга (разделы 4, 5 останутся актуальными для CSRF).

Чек-лист:
- [ ] Bearer-схема — это осознанный выбор проекта (документирован здесь), а не «default от туториала»; любые `localStorage.setItem('token', …)`-строки должен быть мотивирован этой секцией.
- [ ] Access-токен короткоживущий, refresh — с TTL и одноразовыми/ротацией на бэкенде (не вечный refresh в JS-доступном месте).
- [ ] Refresh-токен НЕ дублируется в других JS-доступных местах (случайные `sessionStorage`/IndexedDB-копии) — одна точка хранения.
- [ ] Logout инвалидирует токен на сервере (не просто удаление из клиентского стора).
- [ ] В быстром gate (0.1): новый `token`-код, оказавшийся в `localStorage`, просит проверку "это та же схема или забытый туториальный токен?".

---

## 4. CSRF во взаимодействии с cookie-based auth

При переходе на httpOnly-cookie (раздел 3.1) фронтенд обязан участвовать в CSRF-защите.

```ts
// axios interceptor — читает XSRF-TOKEN cookie (не httpOnly, специально для этого) и прокидывает в заголовок
apiClient.interceptors.request.use((config) => {
  const xsrfToken = getCookie('XSRF-TOKEN');
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
  }
  return config;
});
```

Чек-лист:
- [ ] Все мутирующие запросы (`POST/PUT/PATCH/DELETE`) идут через клиент с настроенным CSRF-заголовком, не «голый» `fetch` в отдельном месте кода в обход общего `apiClient`.
- [ ] `SameSite=Lax`/`Strict` на cookie сессии (настраивается на бэкенде, но фронтенд-разработчик должен знать модель и не «чинить» её отключением на клиенте).
- [ ] Формы, которые теоретически можно засабмитить с чужого сайта (если где-то остался `<form action="...">` без JS) — отсутствуют; вся отправка через `apiClient`.
## 5. Секреты и переменные окружения в Vite

Ключевая ловушка Vite: **всё, что начинается с `VITE_`, встраивается в клиентский бандл в открытом виде** и видно любому пользователю через DevTools/просмотр исходного кода собранного JS. Это не «секрет на сервере», это публичная конфигурация.

Уязвимо:
```dotenv
# .env — AI добавил секретный API-ключ с префиксом VITE_, "чтобы заработало"
VITE_STRIPE_SECRET_KEY=sk_live_...
VITE_INTERNAL_API_TOKEN=...
```
```ts
// Этот ключ буквально лежит в bundle.js в открытом виде после сборки
const token = import.meta.env.VITE_INTERNAL_API_TOKEN;
```

Безопасно:
```dotenv
# .env — только то, что действительно предназначено быть публичным
VITE_API_URL=https://api.your-domain.com
VITE_SENTRY_DSN=https://...@sentry.io/...   # DSN Sentry — публичный по дизайну, это ок
VITE_APP_ENV=production

# Секретные ключи — без префикса VITE_, используются только в build-time скриптах на Node,
# либо (что правильнее) вообще не существуют на фронтенде — вызовы к Stripe/внутренним API идут через бэкенд-прокси
```

Чек-лист:
- [ ] `grep -rn "VITE_" .env* src/` — каждая `VITE_`-переменная сверена на предмет «эта информация действительно ок быть публичной?».
- [ ] После `npm run build` выполняется `grep -r "sk_live\|SECRET\|PRIVATE_KEY" dist/` — 0 совпадений, как финальный рубеж перед деплоем.
- [ ] Любая интеграция, требующая секретного ключа (платежи, внутренние API) — реализована через бэкенд-прокси-эндпоинт, фронтенд никогда не хранит секрет сам.
- [ ] `.env.local`/`.env.production.local` — в `.gitignore`, не закоммичены.
- [ ] `grep -n "^[A-Z_]*=" .env*` — новая переменная, используемая в `src` через `import.meta.env.*`, имеет префикс `VITE_` (в проекте был найден и починен `BASE_URL` вместо `VITE_BASE_URL` — код конфигурации читал переменную с префиксом, а из окружения бралась без него, что роняло рантайм-конфиг в проде).

---

## 6. Dependency & Supply Chain Security (npm)

Frontend supply chain — один из самых частых реальных векторов атаки в 2023–2026 (компрометация популярных npm-пакетов, typosquatting, вредоносные postinstall-скрипты).

Чек-лист:
- [ ] `package-lock.json`/`pnpm-lock.yaml` коммитится всегда, `npm ci` (не `npm install`) используется в CI/сборке — гарантирует детерминированные версии.
- [ ] `npm audit --audit-level=high` — часть CI gate, 0 новых high/critical.
- [ ] Новая зависимость перед добавлением проверяется вручную: автор, число загрузок в неделю, дата последнего релиза, наличие открытого репозитория — особенно если пакет предложен AI-агентом «на автомате» (модели иногда «галлюцинируют» существующие пакеты с похожими именами — классический вектор typosquatting-атаки, когда злоумышленник заранее регистрирует такое «галлюцинированное» имя).
- [ ] `postinstall`-скрипты новых зависимостей — просмотрены (`npm view <pkg> scripts`), т.к. это исполняемый код, запускаемый при `npm install` без явного согласия разработчика.
- [ ] `.npmrc` — `ignore-scripts=true` рассматривается как опция для CI-окружений, если проект не требует build-скриптов нативных модулей.
- [ ] Регулярный `npm outdated` + Dependabot/Renovate для патч/минорных апдейтов, ручное ревью мажорных.

- [ ] Вновь обнаруженные `high`/`critical` в `npm audit` разбираются до деплоя (см. ниже статус по проекту).

**Текущий статус аудита (проверено в работе над разделом 11):** `npm audit` показывает 5 high, все — `postcss ≤8.5.22` и `vite 8.0.0–8.0.15` в dev-time цепочке сборки. `npm audit fix --force` не применён — он форсирует переход на мажорную версию вне заявленного в `package.json` range и может сломать сборку; `react-router-dom` уже обновлён `^6.23.0 → ^6.30.4` (закрыт CVE в `@remix-run/router`). До обновления уязвимых версий postcss/vite (или пока они в `devDependencies` и не попадают в runtime-бандл) их считаем известным dev-only допуском, который пересматривается при каждом релизе.

```bash
npm audit --audit-level=high
npm ci --ignore-scripts   # в CI, если нет необходимости в нативных постинсталлах
npm view <package> maintainers time.modified
```

---

## 7. FSD-архитектура и границы безопасности

Feature-Sliced Design задаёт строгую иерархию слоёв: `app → pages → widgets → features → entities → shared`. Нижние слои не знают о верхних; горизонтальные импорты между независимыми модулями одного слоя запрещены. Это не только про поддерживаемость — это прямая security-граница:

```
src/
├── app/            # инициализация, провайдеры, роутинг верхнего уровня
├── pages/          # композиция виджетов под конкретный роут
├── widgets/        # крупные самостоятельные блоки UI
├── features/       # пользовательские сценарии (запись на приём, редактирование карты)
│   └── edit-patient-note/
│       ├── ui/
│       ├── model/       # состояние фичи — НЕ импортируется напрямую из другой фичи
│       └── index.ts      # public API слайса — единственная разрешённая точка импорта извне
├── entities/       # бизнес-сущности (Patient, Appointment) — модели, минимальный UI
│   └── patient/
│       ├── model/
│       │   └── types.ts   # здесь помечаются PHI-поля (см. ниже)
│       └── index.ts
└── shared/         # переиспользуемый код без бизнес-знания (UI-kit, api-клиент, утилиты)
```

### 7.1 Почему нарушение границ FSD — это security-риск

- Прямой импорт `features/b/model/store` из `features/a` вместо `features/b/index.ts` — обходит public API слайса, где может быть намеренно **не** экспортирован чувствительный кусок состояния (например, полный объект пациента с PHI, тогда как наружу должен идти только DTO для отображения).
- AI-агент, дописывающий фичу, при отсутствии явного public API склонен «дотянуться» до внутреннего стора соседней фичи напрямую — это создаёт неконтролируемые пути распространения PHI по компонентному дереву.

### 7.2 Правило: PHI не покидает `entities`-слой в «сыром» виде

```ts
// entities/patient/model/types.ts
export interface Patient {          // полная сущность — используется только внутри entities/patient и на бэкенде-обращённых хуках
  id: string;
  fullName: string;
  diagnosisNotes: string;           // PHI
  labResults: LabResult[];          // PHI
}

export interface PatientCard {      // публичный DTO для отображения в списках/виджетах
  id: string;
  fullName: string;
  lastVisitDate: string;
  // намеренно без diagnosisNotes/labResults
}

// entities/patient/index.ts — public API слайса
export type { PatientCard } from './model/types';
export { usePatientCard } from './model/usePatientCard';
// Patient (полный тип с PHI) и хуки, возвращающие его целиком, НЕ реэкспортируются наружу без необходимости —
// компонент, которому нужны диагнозы, обязан явно использовать выделенный "виджет карты пациента", а не тянуть сырые данные в произвольное место дерева
```

### 7.3 Автоматизация контроля границ

```bash
npm install -D eslint-plugin-boundaries
# или
npm install -D @feature-sliced/eslint-config
```
```js
// eslint.config.js — фрагмент правил границ FSD
{
  rules: {
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        { from: 'features', allow: ['entities', 'shared'] },
        { from: 'widgets', allow: ['features', 'entities', 'shared'] },
        { from: 'pages', allow: ['widgets', 'features', 'entities', 'shared'] },
        { from: 'entities', allow: ['shared'] },
      ],
    }],
    'boundaries/no-private': 'error', // запрет импорта не через index.ts слайса
  },
}
```

Чек-лист:
- [ ] `eslint-plugin-boundaries`/`@feature-sliced/eslint-config` подключён и является CI gate (не warning, а error).
- [ ] Каждый слайс (`entities/*`, `features/*`) имеет `index.ts` с осознанным списком экспортов; полные PHI-типы/сторы не экспортируются «на всякий случай».
- [ ] Новая фича, работающая с PHI, ревьюится на предмет: «через какой публичный API она получает данные пациента, и не тянет ли лишнего».
## 8. CSP на стороне фронтенда (сборка, nonce, инлайны)

CSP-заголовок отдаёт бэкенд (см. backend playbook, раздел 17), но сборка фронтенда должна быть с ним совместима.

Чек-лист:
- [ ] Vite-сборка не генерирует инлайн-скрипты в `index.html` без nonce (по умолчанию Vite не делает этого для prod-сборки, но плагины/ручные вставки могут).
- [ ] Никаких `eval`/`new Function` в рантайм-коде и зависимостях — конфликтует со строгим `script-src` без `unsafe-eval`. Проверка: `grep -rn "eval(\|new Function(" src/` и аудит крупных зависимостей (некоторые старые UI-библиотеки используют `eval` внутри).
- [ ] Инлайн `style="..."` — по возможности через CSS-классы/CSS-in-JS с nonce-поддержкой (styled-components/emotion в проде генерируют `<style nonce>` при правильной настройке), а не голый `style` атрибут, если `style-src` без `unsafe-inline`.
- [ ] `index.html`, отдаваемый бэкендом/CDN, содержит `<meta http-equiv="Content-Security-Policy" ...>` как fallback (если по какой-то причине HTTP-заголовок не долетел), либо CSP выставляется только заголовком — не дублировать конфликтующие политики в двух местах без синхронизации.

```html
<!-- vite build output — если инлайн-скрипт неизбежен, nonce подставляется на бэкенде при отдаче index.html -->
<script nonce="%CSP_NONCE%">window.__APP_CONFIG__ = { ... };</script>
```

---

## 9. Source maps и утечка через артефакты сборки

Уязвимо:
```ts
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true, // в проде — исходники приложения (включая комментарии, внутреннюю логику) доступны любому через DevTools
  },
});
```

Безопасно:
```ts
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: mode !== 'production', // либо 'hidden' — маппинг генерируется, но не публикуется публично, только для внутреннего APM (Sentry release upload)
  },
}));
```

Если source maps нужны для отладки прод-ошибок (Sentry) — использовать `sourcemap: 'hidden'` и **загружать карты напрямую в Sentry через CI-шаг**, не публиковать их на CDN рядом с бандлом:
```bash
sentry-cli sourcemaps upload --release=$RELEASE ./dist
# после чего .map файлы удаляются из публичной директории деплоя
find dist -name '*.map' -delete
```

Чек-лист:
- [ ] `dist/` после прод-сборки не содержит `.map`-файлов (либо они не публикуются на CDN/статик-сервере).
- [ ] `grep -rn "console.log\|debugger" src/` — минимизировано перед релизом (helps как security через obscurity, не панацея, но снижает случайную утечку внутренней логики/данных через консоль).

---

## 10. Сторонние скрипты, аналитика, трекеры и PHI

Любой сторонний `<script>` (аналитика, чат-виджет, error-tracking SDK) выполняется с теми же правами, что и код приложения, и может читать DOM/сеть страницы, включая PHI, если она отображается на той же странице.

Чек-лист:
- [ ] Список всех сторонних скриптов на страницах с PHI — задокументирован и осознанно согласован (privacy review).
- [ ] Аналитика (GA, Hotjar, session replay) — **не подключена на экранах с PHI**, либо явно настроена на маскирование чувствительных полей (session replay инструменты типа Hotjar/FullStory умеют исключать элементы по селектору/атрибуту — обязательно настроено `data-hj-suppress`/аналог).
- [ ] Sentry/error-tracking — `beforeSend` хук скраббит PHI из breadcrumbs и payload ошибки перед отправкой:
```ts
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  beforeSend(event) {
    // удаляем потенциально чувствительные данные из URL/extra перед отправкой
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/patients\/\d+/, 'patients/[id]');
    }
    delete event.extra?.diagnosisNotes;
    return event;
  },
});
```
- [ ] Subresource Integrity (SRI) для сторонних скриптов, подключаемых с CDN напрямую (не через npm-бандл):
```html
<script src="https://cdn.example.com/widget.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

---

## 11. WebSocket-клиент (Pusher-js / Soketi)

Проект использует Pusher-protocol-клиент (`pusher-js`) с кастомным `authorizer`, который авторизует private-каналы через **Bearer-токен** (`src/features/pathogenesis-notifications/api/pusher.ts`), а не через CSRF-cookie (как было бы в Laravel Echo + httpOnly-схеме). Модель угроз та же, разница — в способе авторизации канала.

```ts
// shared/config/broadcasting.ts — сейчас в проекте
export const broadcastingConfig = {
  appKey: import.meta.env.VITE_PUSHER_APP_KEY,
  wsHost: import.meta.env.VITE_PUSHER_WS_HOST,
  wsPort: Number(import.meta.env.VITE_PUSHER_WS_PORT || 6001),
  forceTLS: import.meta.env.VITE_PUSHER_FORCE_TLS === 'true', // флаг в env
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  authEndpoint: import.meta.env.VITE_BROADCASTING_AUTH_ENDPOINT,
};
```

```ts
// features/*/api/pusher.ts — суть авторизации
const client = new Pusher(config.appKey, {
  wsHost: config.wsHost,
  wsPort: config.wsPort,
  forceTLS: config.forceTLS,
  authEndpoint: config.authEndpoint, // POST /broadcasting/auth с Bearer
  authorizer: ... // шлёт socket_id + channel_name с Authorization: Bearer <token>,
                      // при 401 делает refresh-токеном и повторяет авторизацию
});
```

### 11.1 Что обязательно менять при переходе в прод

| Параметр | Dev (сейчас в `.env`) | Прод |
|---|---|---|
| `VITE_PUSHER_WS_HOST` | `localhost` (soketi из docker-compose) | прод-домен soketi (напр. `ws.your-domain.com`) |
| `VITE_PUSHER_WS_PORT` | `6001` (ws) | `443` (wss) |
| `VITE_PUSHER_FORCE_TLS` | `false` | `true` — иначе трафик канала ходит по `ws://`, читаем и модифицируем посредником |
| `VITE_PUSHER_CLUSTER` | `mt1` (заглушка) | self-hosted Soketi не использует внешний кластер pusher — строка некритична, но не должна указывать на чужой pusher-кластер |

Именно `forceTLS: false` + `wsHost: localhost` из туториала AI-агент часто забывает поменять — на проде это открытая дверь для перехвата трафика с PHI. В dev-схеме (`docker`, soketi на `localhost:6001` по `ws://`) это допустимо, но только для разработки.

Чек-лист:
- [ ] Канал с PHI — только `private-*`/`presence-*` (`private-pathogenesis.{userId}` в проекте), никогда публичный `private…channel = 'patients'`.
- [ ] В проде: `forceTLS = true`, домен — прод, не `localhost`. Dev-режим может оставаться на `ws`, но прод-сборка обязана собираться с `VITE_PUSHER_FORCE_TLS=true`.
- [ ] Отписка (`pusher.unsubscribe`) при размонтировании компонента/логауте — иначе канал продолжает получать обновления после ухода пользователя со сцены (утечка в память, потенциально — рендер устаревших чужих данных при повторном использовании компонента).
- [ ] Авторизация канала пройдена только если `/broadcasting` вернул 200 с `auth`; при 401 — обязательный refresh и повтор; при проваленном refresh — чистим сессию и редирект на `/login` (чтобы похищенный refresh не унёс сессию).
- [ ] Обработчик входящего события валидирует форму данных (раздел 17), не доверяет слепо payload из сокета.

---

## 12. Валидация файлов на клиенте (дополнение к бэкенду)

Клиентская валидация — только UX (мгновенная обратная связь), бэкенд-проверка (backend playbook, раздел 15) обязательна в любом случае.

```tsx
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Недопустимый тип файла';
  if (file.size > MAX_SIZE) return 'Файл слишком большой';
  // file.type — предоставляется браузером на основе расширения/сигнатуры не всегда надёжно,
  // это ТОЛЬКО UX-подсказка, финальная проверка сигнатуры — на сервере
  return null;
}
```

Чек-лист:
- [ ] Клиентская проверка не единственная — сервер обязан перепроверить (magic bytes и т.д.).
- [ ] Превью загруженных изображений — через `URL.createObjectURL`, с обязательным `URL.revokeObjectURL` после использования (утечка памяти + потенциально данные остаются доступны через blob-URL дольше необходимого).
- [ ] Загрузка SVG на клиенте — если бэкенд их запрещает (backend playbook 15.3), клиент тоже не должен предлагать их в file picker (`accept=".pdf,.jpg,.jpeg,.png"`, без `.svg`).

---

## 13. Clickjacking и защита от встраивания в iframe

Основная защита — заголовок `X-Frame-Options`/`frame-ancestors` от бэкенда (backend playbook, раздел 16), но фронтенд может добавить defense-in-depth:

```ts
// app/providers/frame-guard.ts — на случай, если заголовок почему-то не долетел (напр. кэширующий CDN его срезал)
if (window.top !== window.self) {
  window.top!.location.href = window.self.location.href; // "framebusting" fallback
}
```

Чек-лист:
- [ ] Основная защита — серверный заголовок, не полагаться только на JS fallback (JS можно отключить/обойти).
- [ ] Все `<a target="_blank">` содержат `rel="noopener noreferrer"` — защита от reverse tabnabbing (открытая через `target="_blank"` страница получает доступ к `window.opener` и может подменить исходную вкладку на фишинговую).

---

## 14. Prototype Pollution и небезопасные npm-пакеты

Уязвимо:
```ts
// "Глубокое слияние" пользовательского объекта конфигурации без защиты — классический источник prototype pollution
function merge(target: any, source: any) {
  for (const key in source) {
    if (typeof source[key] === 'object') {
      target[key] = merge(target[key] || {}, source[key]); // '__proto__' как key — загрязняет Object.prototype
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
```

Безопасно:
```ts
function safeMerge<T extends object>(target: T, source: Partial<T>): T {
  for (const key of Object.keys(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue; // явный блок опасных ключей
    // ... остальная логика, либо использовать проверенную библиотеку (structuredClone/lodash.merge актуальной версии, где CVE давно пропатчены)
  }
  return target;
}
```

Чек-лист:
- [ ] Ручные рекурсивные merge/clone-функции, сгенерированные AI, — избегать, предпочитать `structuredClone()` (нативный) или свежую версию `lodash`/`es-toolkit`.
- [ ] `npm audit` целенаправленно проверяется на записи класса "Prototype Pollution" в отчёте.
## 15. Клиентская авторизация: route guards — UX, не security

Уязвимо (иллюзия защиты):
```tsx
// Единственная защита маршрута — проверка на клиенте
function AdminRoute({ children }: PropsWithChildren) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" />;
  return children;
}
// Данные для этого экрана всё равно приходят с API — если сервер не проверяет роль отдельно,
// достаточно вызвать соответствующий эндпоинт напрямую (curl/Postman), минуя React вообще
```

Безопасно (правильная ментальная модель):
```tsx
// Route guard остаётся — он нужен для UX (не показывать админ-меню обычному пользователю),
// но именно как UX-слой, а не единственная защита
function AdminRoute({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (user?.role !== 'admin') return <Navigate to="/403" replace />;
  return children;
}

// Ключевое: КАЖДЫЙ API-запрос, который эта страница делает, бэкенд проверяет независимо (backend playbook, раздел 8)
// Фронтенд НЕ хранит и не проверяет "чувствительную" бизнес-логику авторизации самостоятельно —
// он либо получает уже отфильтрованные под права пользователя данные, либо получает 403 и корректно это обрабатывает
```

Чек-лист:
- [ ] Ни один компонент/стор не принимает решение «показать PHI» на основе одной лишь клиентской проверки роли без того, чтобы данные пришли с сервера именно для этого пользователя (сервер уже применил Policy).
- [ ] 403/401 от API обрабатываются глобальным interceptor'ом (редирект на логин/страницу отказа в доступе), а не игнорируются молча.
- [ ] Скрытие UI-элемента (кнопки/раздела) на основе роли — не означает, что соответствующий API-эндпоинт открыт всем без проверки; это отдельная, независимая гарантия на бэкенде.

---

## 16. Медицинские данные в браузере: маскирование, автологаут, история, буфер обмена

### 16.1 Автоматический логаут / блокировка при неактивности

```tsx
// shared/lib/idle-timer.ts
function useIdleLogout(timeoutMs: number = 15 * 60 * 1000) {
  const { logout } = useAuth();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logout, timeoutMs);
    };
    ['mousemove', 'keydown', 'click', 'scroll'].forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      ['mousemove', 'keydown', 'click', 'scroll'].forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs, logout]);
}
```

### 16.2 История браузера и PHI

Уязвимо:
```tsx
// PHI в URL — остаётся в истории браузера, может попасть в access-логи, в Referer при переходе на внешний ресурс
navigate(`/search?query=диагноз+гипертония&patient=Иванов`);
```

Безопасно:
```tsx
// Идентификаторы в URL — ок (маршрутизация); человекочитаемые PHI-данные — только в теле запроса/состоянии
navigate(`/patients/${patientId}/notes`); // id, не диагноз
```

### 16.3 Печать и скриншоты

Если требование проекта — скрывать часть данных при печати:
```css
@media print {
  .phi-sensitive-block { display: none; }
}
```

### 16.4 Буфер обмена

- [ ] Функции «скопировать» для PHI-полей — осознанное решение продукта, не побочный эффект `onClick={() => navigator.clipboard.writeText(patient.diagnosis)}`, добавленный «для удобства» без обсуждения.

### 16.5 Вкладки/multi-tab

- [ ] При логауте в одной вкладке — остальные вкладки того же браузера тоже теряют доступ (`BroadcastChannel`/`storage`-event синхронизация состояния авторизации), иначе открытая ранее вкладка с картой пациента остаётся «залогиненной» после логаута администратором/по таймауту в другой вкладке.

```ts
// shared/lib/auth-sync.ts
const channel = new BroadcastChannel('auth');
channel.onmessage = (e) => { if (e.data === 'logout') window.location.reload(); };
export const broadcastLogout = () => channel.postMessage('logout');
```

---

## 17. TypeScript как инструмент безопасности

TypeScript сам по себе не даёт runtime-гарантий — тип «стирается» при компиляции. Данные, пришедшие с API, должны проверяться в рантайме, а не просто приводиться через `as`.

Уязвимо:
```ts
const patient = (await apiClient.get('/patients/1')).data as Patient; // AI "успокаивает" компилятор, но сервер может вернуть что угодно (в т.ч. ошибку/иную форму) — рантайм ничего не проверяет
```

Безопасно (и так сделано в текущем проекте — `zod` уже стоит в `package.json`):
```ts
import { z } from 'zod';

const PatientSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  lastVisitDate: z.string().datetime(),
});
type PatientCard = z.infer<typeof PatientSchema>;

const response = await apiClient.get('/patients/1');
const patient = PatientSchema.parse(response.data); // рантайм-валидация, бросит ошибку при несовпадении формы
```

В текущем проекте zod используется как минимум на границе авторизации (`src/shared/api/auth.ts`, парсинг `AuthSession` через `z.object`), остальные методы `shared/api/*` валидируются по мере добавления — новые эндпоинты с PHI обязаны добавлять свою схему.

`tsconfig.app.json` в проекте уже включает строгий режим (настроено, `tsc --noEmit` — 0 ошибок):
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Чек-лист:
- [ ] `strict: true` + три дополнительных флага (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`) в `tsconfig.app.json` — уже включены; CI проверяет `tsc --noEmit` как обязательный gate.
- [ ] `any` — запрещён линтером (`@typescript-eslint/no-explicit-any: as error` через `tseslint.configs.recommended`) для данных, приходящих извне (API-ответы, `JSON.parse`, `postMessage`); допустим только в явно изолированных местах с `eslint-disable` + комментарием-обоснованием (в проекте — пара таких мест в `shared/extensions`/`shared/ui`).
- [ ] Каждый новый API-клиентский метод, возвращающий данные с PHI, валидирует ответ схемой zod на границе `shared/api` — дальше по коду тип уже доверенный.
- [ ] `postMessage`-обработчики проверяют `event.origin` и валидируют `event.data` схемой перед использованием.

---

## 18. Автоматизация: ESLint security, Semgrep, npm audit, CI gates

| Инструмент | Назначение | Установка |
|---|---|---|
| `eslint-plugin-security` | базовые проверки опасных паттернов JS (правда, слабо покрывает React-специфику) | `npm i -D eslint-plugin-security` |
| `eslint-plugin-react` / `eslint-plugin-react-hooks` | корректность хуков, косвенно снижает баги с состоянием | входит в стандартный React-стек |
| `eslint-plugin-boundaries` / `@feature-sliced/eslint-config` | границы FSD (раздел 7) | см. раздел 7 |
| `@typescript-eslint` (strict-config) | `no-explicit-any`, `no-unsafe-*` правила | `npm i -D @typescript-eslint/eslint-plugin` |
| `semgrep` | кастомные и готовые правила для React/TS (XSS-паттерны, dangerouslySetInnerHTML без sanitize) | `pip install semgrep` / Docker-образ |
| `npm audit` / `pnpm audit` | известные CVE в зависимостях | встроено |
| `dompurify` + `eslint-plugin-no-unsanitized` | статическая проверка небезопасных sink'ов (`innerHTML`, `dangerouslySetInnerHTML`) | `npm i -D eslint-plugin-no-unsanitized` |
| `vite-plugin-checker` | параллельный `tsc`/`eslint` во время dev-сборки | `npm i -D vite-plugin-checker` |

**Сейчас в проекте уже установлено (проверено):** `zod@^4.4.3` (в `dependencies`, runtime-валидация), `eslint-plugin-security@^4.0.1` и `eslint-plugin-no-unsanitized@^4.1.5` (пока в `dependencies` — при ближайшем рефакторинге перенести в `devDependencies`). Плагины уже подключены в `eslint.config.js` (правила `security/*`, `no-unsanitized/{property,method}` — `error`). `react-router-dom` обновлён до `^6.30.4`.

### 18.1 Makefile / npm scripts

```json
// package.json
{
  "scripts": {
    "security": "npm run security:audit && npm run security:lint && npm run security:types && npm run security:semgrep",
    "security:audit": "npm audit --audit-level=high",
    "security:lint": "eslint . --max-warnings=0",
    "security:types": "tsc --noEmit",
    "security:semgrep": "semgrep --config p/react --config p/typescript --error"
  }
}
```

### 18.2 Пример конфигурации ESLint (фрагмент, security-relevant правила)

```js
// eslint.config.js
export default [
  {
    plugins: { security: pluginSecurity, 'no-unsanitized': pluginNoUnsanitized },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'no-unsanitized/property': 'error',   // innerHTML/outerHTML без санитизации
      'no-unsanitized/method': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      'react/jsx-no-target-blank': ['error', { enforceDynamicLinks: 'always' }],
    },
  },
];
```

### 18.3 GitHub Actions gate

```yaml
name: frontend-security
on: [pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run security:audit
      - run: npm run security:types
      - run: npm run security:lint
      - name: Build and check bundle for secrets
        run: |
          npm run build
          if grep -rEq "sk_live|SECRET_KEY|PRIVATE_KEY" dist/; then
            echo "::error::Possible secret leaked into bundle"; exit 1;
          fi
          find dist -name '*.map' -delete
      - uses: returntocorp/semgrep-action@v1
        with:
          config: p/react p/typescript
```
## 19. Release Checklist (frontend)

- [ ] Все пункты [раздела 0](#0-чек-лист-после-каждого-сеанса-вайбкодинга-frontend) выполнены для каждого коммита в релизе.
- [ ] `npm audit --audit-level=high`, `tsc --noEmit`, ESLint (включая `boundaries`, `no-unsanitized`, security-плагины) — 0 новых проблем.
- [ ] `grep -rn "dangerouslySetInnerHTML\|localStorage.*token\|VITE_.*SECRET\|VITE_.*KEY" src/` — просмотрено вручную, каждое совпадение обосновано.
- [ ] Границы FSD не нарушены (`eslint-plugin-boundaries` — 0 ошибок), новые слайсы имеют осознанный `index.ts`.
- [ ] Ревью diff по `vite.config.ts`, `.env*`, `package.json` (новые зависимости) — выполнено человеком.
- [ ] Semgrep-скан без новых findings уровня ERROR.
- [ ] Компоненты, отображающие PHI, — проверены на отсутствие лишних полей в API-ответах, используемых в UI (сверка с backend playbook, раздел 25.3).
- [ ] Изменения в аутентификации/хранении токена (раздел 3) — задокументированы, если менялась схема.

---

## 20. Deploy Checklist (frontend)

### Перед деплоем

- [ ] Прод-сборка (`npm run build` с `mode=production`) без `sourcemap: true` в публикуемой директории (раздел 9).
- [ ] `grep -rE "sk_live|SECRET|PRIVATE_KEY|password" dist/` — 0 совпадений.
- [ ] `.map`-файлы либо отсутствуют в `dist/`, либо не раздаются публично веб-сервером/CDN (правило в конфиге статик-хостинга).
- [ ] Все сторонние `<script>` с CDN — с `integrity`/`crossorigin` (SRI, раздел 10).
- [ ] `VITE_API_URL`/`VITE_PUSHER_WS_HOST` и т.п. указывают на прод-адреса, не `localhost`/staging (частая ошибка при копировании `.env` между окружениями). Для WebSocket в проде: `VITE_PUSHER_FORCE_TLS=true`, `VITE_PUSHER_WS_PORT=443` (раздел 11).
- [ ] CSP-заголовок (отдаётся бэкендом/edge-конфигом) совместим со сборкой — нет консольных ошибок `Refused to execute inline script` на staging-прогоне со включённым CSP.
- [ ] Статик-хостинг/CDN отдаёт корректные security-заголовки для фронтенд-ресурсов (`X-Content-Type-Options: nosniff` для JS/CSS-файлов — предотвращает MIME-confusion атаки).

### После деплоя (smoke checks)

- [ ] Открыть прод-URL в приватном окне, DevTools → Network → убедиться, что запросы к API идут на прод-домен, cookie выставлены с `Secure`/`HttpOnly`/`SameSite`.
- [ ] Проверить консоль браузера на CSP-violations/JS-ошибки при обычном пользовательском сценарии.
- [ ] Проверить, что `view-source:` / `dist/`-бандл (через DevTools → Sources) не содержит закомментированного debug-кода/тестовых учётных данных.
- [ ] Ручной smoke-тест: логаут в одной вкладке действительно завершает сессию (если реализована мультивкладочная синхронизация, раздел 16.5).
- [ ] Мониторинг Sentry/error-tracking не показывает всплеска новых ошибок в первые 15 минут после деплоя, и в событиях ошибок нет утечки PHI (выборочная проверка нескольких свежих событий).

---

## 21. Приложения

### 21.1 Пример `vite.config.ts` с security-осмысленными настройками

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    checker({ typescript: true, eslint: { lintCommand: 'eslint . --max-warnings=0' } }),
  ],
  build: {
    sourcemap: mode !== 'production', // либо 'hidden' + отдельная загрузка в Sentry, раздел 9
    rollupOptions: {
      output: {
        // разбивка чанков — не security-мера сама по себе, но снижает объём кода, доступного за один "просмотр" бандла
        manualChunks: { vendor: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    // dev-сервер Vite: cors по умолчанию открыт локально — не переносить это поведение в прод-конфиг
    cors: true, // допустимо только для локальной разработки
  },
  define: {
    // никогда не подставлять сюда секреты через define — они так же попадут в открытый бандл, как и VITE_-переменные
  },
}));
```

### 21.2 `.env.example` (фронтенд, аннотированный)

```dotenv
# Всё, что ниже, ПОПАДЁТ В ОТКРЫТЫЙ БАНДЛ. Не добавлять сюда секретные ключи/токены.
VITE_API_URL=https://api.your-domain.com
VITE_APP_ENV=production
VITE_SENTRY_DSN=                      # публичный DSN, ок
VITE_PUSHER_APP_KEY=                  # публичный app key Soketi/Pusher-протокола, ок (авторизация каналов — через authEndpoint)
VITE_PUSHER_WS_HOST=ws.your-domain.com
VITE_PUSHER_WS_PORT=443               # wss в проде
VITE_PUSHER_FORCE_TLS=true            # обязательно true для прод-сборки (раздел 11)
VITE_PUSHER_CLUSTER=socke             # self-hosted Soketi — заглушка, не критично
VITE_BROADCASTING_AUTH_ENDPOINT=/broadcasting/auth
```

### 21.3 Быстрый grep-набор для аудита diff (frontend)

```bash
# Опасный рендер HTML
grep -rn "dangerouslySetInnerHTML\|\.innerHTML\s*=" src/

# Токены/секреты не там, где нужно
grep -rnE "localStorage\.(set|get)Item\(['\"](token|access_token|jwt)" src/
grep -rnE "VITE_.*(SECRET|PRIVATE|API_KEY)" .env*

# Опасный eval-класс
grep -rn "eval(\|new Function(" src/

# Ссылки без защиты от tabnabbing
grep -rn 'target="_blank"' src/ | grep -v "noopener"

# PHI потенциально в URL
grep -rnE "navigate\(\`[^)]*\\\$\{.*(diagnos|note|history)" src/
```

### 21.4 Минимальный набор тестов на новую фичу с PHI (шаблон для AI-промпта)

При постановке задачи AI-агенту на фичу с PHI требуйте вместе с кодом:
1. Тест, что компонент не рендерит поля вне ожидаемого DTO (снапшот/явная проверка отсутствия «лишних» ключей в пропсах, переданных в дочерние компоненты логирования/аналитики).
2. Тест, что `dangerouslySetInnerHTML` (если используется) получает уже санитизированную строку (мок DOMPurify, проверка вызова).
3. Тест route guard'а — недостаточные права → редирект/403-экран, но не попытка отрисовать данные до получения ответа сервера.
4. Тест, что при логауте состояние стора, содержащее PHI, очищается (не остаётся в памяти/persist-сторе типа Redux-persist/Zustand persist).

---

## 22. HeroUI: используем UI-kit вместо голого HTML

Проект использует **HeroUI** как основной UI-kit. Это не просто вопрос стиля — правило «не писать голый HTML там, где есть компонент HeroUI» напрямую снижает поверхность атаки, потому что компоненты библиотеки уже централизованно решают то, что при ручной реализации AI-агент почти всегда упускает или делает небезопасно:

- корректный экранирование текста/атрибутов и предсказуемое поведение `value`/`children` (без соблазна воткнуть `dangerouslySetInnerHTML`, чтобы «быстро вставить форматированный текст»);
- встроенные aria-роли и focus-management для модалок/дропдаунов/меню — самодельный `<div role="dialog">` почти никогда не реализует focus trap корректно, а это не только a11y, но и защита от clickjacking-подобных сценариев с перехватом фокуса;
- единая точка контроля над обработчиками событий и атрибутами (`href`, `target`) — не разбросанные по всему проекту ручные `<a target="_blank">` без `rel="noopener noreferrer"` (раздел 13);
- единая точка для будущих security-патчей: если в HeroUI найдут и закроют уязвимость (XSS в каком-то компоненте), обновление версии пакета закрывает её везде разом — тогда как десятки самодельных аналогов пришлось бы патчить вручную по всему кодовому.

### 22.1 Правило

**Голый HTML для интерактивных/вводных элементов запрещён, если у HeroUI есть готовый компонент.** Голый HTML допустим только для:
- чисто семантической разметки без интерактивности (`<section>`, `<article>`, `<main>`, `<header>`, `<footer>`, оборачивающие `<div>`/`<span>` для layout/grid) — HeroUI не претендует на замену семантических тегов;
- случаев, явно не покрытых HeroUI (специфичная визуализация, кастомный SVG-график) — и то обёрнутых в отдельный переиспользуемый компонент `shared/ui/*` с явным комментарием-обоснованием, а не разбросанных инлайн по фичам.

### 22.2 Примеры

Уязвимо/нежелательно:
```tsx
// AI написал форму "напрямую", в обход UI-kit'а — теряются встроенные a11y/behavior-гарантии,
// а на PHI-формах повышается риск непоследовательной обработки ввода
function EditPatientNoteForm() {
  return (
    <div>
      <input value={note} onChange={(e) => setNote(e.target.value)} />
      <div onClick={handleSave} style={{ cursor: 'pointer' }}>Сохранить</div>
      {/* кликабельный div вместо button — не фокусируется по Tab, нет keyboard-доступности,
          и это тот же паттерн, из которого чаще всего вырастают самодельные onClick-хендлеры
          с побочными эффектами без должной валидации состояния */}
    </div>
  );
}
```

Безопасно/правильно:
```tsx
import { Input, Button, Textarea } from '@heroui/react';

function EditPatientNoteForm() {
  return (
    <form onSubmit={handleSubmit}>
      <Textarea
        label="Заметка врача"
        value={note}
        onValueChange={setNote}
        maxLength={2000} // валидация длины на уровне компонента — снижает риск переполнения полей PHI
      />
      <Button type="submit" color="primary" isLoading={isSaving}>
        Сохранить
      </Button>
    </form>
  );
}
```

Ещё один типичный случай — самодельная модалка вместо `Modal`:
```tsx
// Уязвимо/нежелательно — ручная модалка на div, без focus trap, без Escape-обработчика,
// без aria-атрибутов — пользователь скринридера/клавиатуры может "провалиться" за пределы диалога
function ConfirmDialog({ open, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50">
      <div className="bg-white p-4">
        <p>Удалить запись пациента?</p>
        <button onClick={onConfirm}>Да</button>
      </div>
    </div>
  );
}

// Безопасно/правильно
import { Modal, ModalContent, ModalBody, ModalFooter, Button } from '@heroui/react';

function ConfirmDialog({ isOpen, onOpenChange, onConfirm }: Props) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalBody>Удалить запись пациента?</ModalBody>
        <ModalFooter>
          <Button color="danger" onPress={onConfirm}>Да</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

### 22.3 Соответствие HeroUI-компонентов частым "голым" паттернам

| Голый HTML (не использовать) | Компонент HeroUI |
|---|---|
| `<button>` | `Button` |
| `<input>` | `Input` |
| `<textarea>` | `Textarea` |
| `<select>` | `Select` |
| `<table>` | `Table` |
| самодельный `<div>`-диалог | `Modal` |
| самодельный `<div>`-выпадающий список | `Dropdown` |
| `<input type="checkbox">` | `Checkbox` |
| `<input type="radio">` | `RadioGroup`/`Radio` |
| ручной toast через `alert()`/самодельный div | `useToast`/`Toast` (или принятый в проекте аналог из HeroUI-экосистемы) |
| ручная пагинация на `<button>` в цикле | `Pagination` |
| `<div role="tablist">` вручную | `Tabs` |

### 22.4 Автоматизация правила

```js
// eslint.config.js — запрет голых интерактивных HTML-тегов там, где обязателен HeroUI-компонент
{
  rules: {
    'react/forbid-elements': ['error', {
      forbid: [
        { element: 'button', message: 'Используйте <Button> из @heroui/react вместо голого <button>.' },
        { element: 'input', message: 'Используйте <Input>/<Textarea>/<Checkbox> из @heroui/react вместо голого <input>.' },
        { element: 'select', message: 'Используйте <Select> из @heroui/react вместо голого <select>.' },
        { element: 'table', message: 'Используйте <Table> из @heroui/react вместо голого <table>.' },
      ],
    }],
  },
}
```

Это правило — **hard error**, не warning: как и остальные security/consistency-gate'ы в этом playbook, оно должно физически блокировать коммит/CI (раздел 18), а не оставаться необязательной рекомендацией, которую AI-агент пропускает при генерации нового кода под давлением "сделать быстро".

### 22.5 Чек-лист

- [ ] `eslint-plugin-react` правило `react/forbid-elements` настроено и включено как `error` в CI (раздел 18.2/18.3).
- [ ] В `shared/ui/` нет дублирующих самодельных примитивов (`CustomButton`, `CustomModal`), повторяющих то, что уже даёт HeroUI, — единая точка входа снижает риск, что «забытая» самодельная версия останется без a11y/security-фиксов, которые получает основной UI-kit.
- [ ] Если голый HTML-элемент всё же оправдан (раздел 22.1, второй пункт) — рядом стоит комментарий с обоснованием, почему HeroUI-компонент не подходит; это явный сигнал для ревьюера, а не тихое исключение.
- [ ] Версия `@heroui/react` в `package.json` отслеживается на security-апдейты так же, как остальные зависимости (раздел 6) — обновления UI-kit'а иногда содержат именно security-патчи (XSS в конкретном компоненте, некорректный `dangerouslySetInnerHTML` внутри самой библиотеки и т.п.), поэтому мажорные апдейты не откладываются бесконечно.

---

## Итог

Фронтенд-плейбук работает в паре с backend-плейбуком: никакой из них не самодостаточен. Ключевая мысль для вайбкодинга — AI-агент, генерирующий frontend-код, по умолчанию оптимизирует под «быстро заработало» (токен в localStorage, `dangerouslySetInnerHTML` без sanitize, `VITE_`-секрет), потому что так проще в большинстве туториалов. Чек-лист раздела 0 — это компенсирующий контроль именно под эти системные слепые пятна генеративных моделей.
