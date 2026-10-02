# YouTube: Subscriptions First — контекст для Claude Code

Chrome-розширення (Manifest V3), яке перебудовує інтерфейс youtube.com під сценарій
«підписки й власні списки замість алгоритмічної стрічки». Без збирання, без залежностей:
чистий JS/CSS, файли вантажаться в Chrome як є.

Що робити далі — у [`docs/TASKS.md`](docs/TASKS.md). Цей файл — як влаштований код
і чого не можна ламати.

## Функціональність (поточна версія — див. `manifest.json` → `version`)

- **Головна = підписки.** `youtube.com/` при повному завантаженні редіректить на `/feed/subscriptions`
  (`early.js`). Логотип веде туди ж. Рідна «Головна» перейменована на «Алгоритмічна»
  (обхід редіректу: `/?algo`).
- **Shorts прибрані** звідусіль (сайдбар, полиці на головній і в підписках).
- **Сайдбар:**
  - пункт «Підписки» над «Алгоритмічною» з рідною іконкою Shorts (`yt-icon` + `.active` дає заповнену версію);
  - власна секція «Підписки» (канали з даних рідного сайдбару) і «Списки» (плейлисти з `/feed/playlists`)
    з лічильником відео, «Показати більше/менше», режимом ✎ (drag & drop порядок + приховування оком);
  - емодзі на початку назви плейлиста стає іконкою;
  - прибрані: «Що нового», «Більше з YouTube», «Історія скарг», футер, заголовок «Ви»,
    «Ваш канал», «Ваші відео», «Завантаження», «Фільми», «Показати більше» в блоці «Ви»;
    «Переглянути пізніше» перенесене в «Списки» першим; «Ви» (Історія, Сподобалися) — внизу.
- **Сторінка підписок:** без заголовка «Нові» / «Усі підписки».
- **Вікно «Зберегти в…»** (своє, замість рідного): високе, пошук, кілька списків поспіль, не закривається,
  створення нового списку. Відкривається з меню ⋮ біля відео (пункт піднятий першим) і з кнопки
  «Зберегти» на сторінці відео.
- **Дошка на `/feed/playlists`:** колонка = список; DnD між колонками (переміщення; Alt — копія),
  DnD всередині колонки (порядок/черга), «×» вилучити, тост «Відмінити» на 5 с. Перемикач «Звичайний вигляд».
- **Синхронізація:** зміни плейлистів ловляться через перехоплення `fetch`/XHR (`early.js`)
  і `PerformanceObserver` (`content.js`) → перечитування `/feed/playlists`.
- **Локалізація:** uk / en / ru. Контент-скрипт — за `<html lang>` YouTube (fallback en);
  popup і назва розширення — `_locales/` (мова Chrome).
- **Оновлення:** `background.js` раз на 6 год читає `version.json` за `UPDATE_URL`
  (raw.githubusercontent.com репозиторію; порожній → вимкнено), бейдж ↑ + системне сповіщення;
  бейдж NEW після оновлення; popup з історією змін (`changelog.json`).
  Реліз — лише через `node scripts/release.mjs X.Y.Z` + `git push --follow-tags` (див. `README.uk.md`).

## Файли

| Файл | Що робить |
|---|---|
| `manifest.json` | MV3. Обидва контент-скрипти в `"world": "MAIN"`. Дозволи: `alarms`, `notifications`, `storage`. Host permissions немає. |
| `early.js` | `document_start`: редірект `/` → підписки; обгортка `fetch`/XHR для сигналу `ysf-playlists-changed`. |
| `content.js` | Уся логіка UI (один IIFE). Секції позначені коментарями `// ---------- … ----------`. |
| `styles.css` | Усі стилі. Префікс класів/атрибутів — `ysf-`. |
| `background.js` | Service worker: перевірка оновлень, бейдж, сповіщення. `UPDATE_URL` вгорі файлу. Спільний з Instagram (див. нижче). |
| `popup.html/.js/.css` | Вікно розширення: версія, «Що нового», статус оновлень. |
| `changelog.json` | Історія змін, тексти `uk`/`en`/`ru`. Нова версія — новий запис **першим**. |
| `version.json` | Корінь репо, **не** в zip: `{ version, url, notes:{uk,en,ru} }` — те, що читають розширення користувачів. Пише лише `scripts/release.mjs`. |
| `scripts/release.mjs` | Node 18+, без залежностей: `--setup owner/repo`, `<X.Y.Z>` (версія, перевірки, zip, коміт, тег), `--build [--store]`, `--notes`. Процес — у `README.uk.md`. |
| `.github/workflows/release.yml` | На тег `v*`: збирає zip і створює GitHub-реліз із текстом із `changelog.json`. |
| `_locales/{en,uk,ru}/messages.json` | Тексти popup/назви/сповіщень. Ключ `langCode` — мова локалі. |
| `icons/` | 16/32/48/128 PNG. |

### Карта `content.js`
1. Dispose попереднього екземпляра (`window.__ysfDispose`) — скрипт можна безпечно виконати повторно.
2. Константи, словники `UK`/`EN`/`ru` (`L`), `fmtNum`, `quote`.
3. `prefs` у `localStorage['ysf-prefs-v1']`: `{ subs:{order,hidden,expanded}, playlists:{order,hidden,expanded}, boardOff }`.
   Кеш плейлистів — `localStorage['ysf-playlists-v2']`.
4. SPA-навігація: `navigateEndpoint()` шле `yt-navigate` на `ytd-app` з innertube endpoint.
5. Секції сайдбару (`buildSection` / `renderSection` / `setupDnD`) — спільний код для підписок і списків.
6. `innertube(path, body)` — запити до `/youtubei/v1/*` з `SAPISIDHASH` (cookie `SAPISID`) і контекстом з `ytcfg`.
   `api.*`: `listsForVideo`, `add`, `remove`, `move`, `create`.
7. Вікно «Зберегти в…» (`openSavePanel`), тост із «Відмінити» (`showToast(text, {undo})`).
8. Дошка (`applyBoard`, `loadColumn`, `moveVideo`, `reorderVideo`, `addAt`, `placeOnServer`).
9. `apply()` — ідемпотентна, викликається через `MutationObserver` + `requestAnimationFrame` і на `yt-navigate-finish`.

## Спільне з розширенням Instagram
`background.js`, `popup.html`, `popup.js`, `scripts/release.mjs` і
`.github/workflows/release.yml` **однакові** тут і в `ulquorium/instagram-follow-lists`
(сусідня папка `../instagram-follow-lists`). Відрізняються лише `UPDATE_URL` (background.js),
`ZIP_NAME` (release.mjs) і кольори в `popup.css`; ключі `_locales` однакові. Міняти — в обох.
Деталі роботи сповіщень (alarm, storage, бейджі, повідомлення `check-now` / `refresh-badge` / `status`) —
розділ «Update notifier» у CLAUDE.md Instagram.

## Правила, які не можна порушувати

- **Trusted Types.** YouTube вмикає TT: жодного `innerHTML`/`outerHTML =`/`insertAdjacentHTML`.
  Лише `document.createElement` / helper `el()` / `svgIcon()` / `textContent`.
- **Ніякого віддаленого коду** (вимога MV3 і Chrome Web Store). Ззовні можна читати тільки дані
  (`version.json`), не скрипти. Без `eval`/`new Function` у коді розширення.
- **MAIN world** обраний свідомо: потрібен доступ до `ytcfg`, Polymer-даних (`el.data`) і події `yt-navigate`.
  У MAIN world немає `chrome.*` — усе, що потребує API розширення, живе в `background.js`/popup.
- **`apply()` має бути ідемпотентною й дешевою** — вона викликається на кожну мутацію DOM.
  Перебудова списків — лише коли змінився `dataset.key`.
- **Рідні Polymer-елементи не переносити й не клонувати** — ховати CSS-ом і будувати свої поруч.
- **Мовонезалежні селектори.** Шукаємо за `href`, `iconType`/`iconName`, структурою даних —
  не за текстом українською.
- **Будь-який новий текст** — в усі три словники в `content.js` (і в `_locales`, якщо це popup/фон).
  Перевірка паритету ключів — див. `docs/TASKS.md`, задача 6.
- Зміни на акаунті користувача (додати/вилучити/перемістити) — оптимістично в UI, при помилці — відкат + тост.

## Як перевіряти

- Встановлення: `chrome://extensions` → Режим розробника → «Завантажити розпаковане» → ця папка.
  Після змін — «Оновити» на картці й перезавантажити вкладку YouTube.
- Синтаксис, паритет ключів `_locales` і мов у `changelog.json`, тестовий zip: `node scripts/release.mjs --build`.
- Popup і service worker можна проганяти в Playwright з `--load-extension` (Chromium, `--headless=new`).
  Сторінки YouTube потребують залогіненого користувача — їх перевіряє людина.
- Чекліст ручної перевірки після змін у `content.js`: сайдбар (обидві секції, ✎, DnD, око), підписки,
  меню ⋮ → «Зберегти», кнопка «Зберегти» на сторінці відео, дошка (перетягування між колонками,
  всередині колонки, «×» + «Відмінити»), світла й темна тема, вузьке вікно (міні-сайдбар).

## Відомі обмеження

- YouTube часто міняє DOM/внутрішні API — найкрихкіші місця: `isSaveMenuItem`, пошук кнопки «Зберегти»
  (`button-view-model` з `iconName: PLAYLIST_ADD`), парсинг `lockupViewModel` і `playlistVideoRenderer`.
- Порядок і приховування в сайдбарі зберігаються в `localStorage` youtube.com — не синхронізуються між пристроями.
- Плейлисти, створені в YouTube Music, не відрізнити від звичайних (фільтруються лише альбоми й мікси за ID-префіксами).
- Без Chrome Web Store розширення не оновлюється автоматично — лише сповіщає.
