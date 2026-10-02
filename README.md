# YouTube: Subscriptions First

Chrome-розширення для youtube.com: підписки й власні списки замість алгоритмічної стрічки.
Інтерфейс українською, англійською й російською (за мовою YouTube; вікно розширення — за мовою Chrome).

*English below.*

- **Головна = підписки.** Логотип і `youtube.com/` ведуть на підписки; алгоритмічна стрічка лишається як «Алгоритмічна».
- **Без Shorts** — ні в сайдбарі, ні на головній, ні в підписках.
- **Чистий сайдбар:** свої секції «Підписки» і «Списки» з порядком перетягуванням і приховуванням; зайві пункти прибрані.
- **Вікно «Зберегти в…»:** високе, з пошуком, кілька списків поспіль, створення нового списку.
- **Дошка списків** на `/feed/playlists`: колонка = список, перетягування відео між списками й усередині.

<!-- Скріншот: додати сюди docs/screenshot.png -->

## Встановлення
1. Завантаж zip з [останнього релізу](https://github.com/ulquorium/youtube-subs-first/releases/latest) і розпакуй у папку.
2. Відкрий `chrome://extensions` і ввімкни **Режим розробника**.
3. **Завантажити розпаковане** → вибери цю папку.
4. Перезавантаж вкладку YouTube.

## Оновлення
Розширення раз на 6 годин перевіряє, чи вийшла нова версія. Якщо так — на іконці **↑** і системне сповіщення; клік відкриває сторінку релізу.
Розпакуй новий zip **поверх тієї ж папки** і натисни ↻ на картці розширення в `chrome://extensions`. Папку не міняй: з іншої папки Chrome вважає це новим розширенням.
Після оновлення на іконці **NEW**, доки не відкриєш вікно розширення («Що нового», уся історія змін, кнопка «Перевірити»).

## Приватність
Розширення нічого не збирає й нікуди не передає. Запити йдуть лише на YouTube (від твого імені — для керування твоїми плейлистами) і на GitHub за файлом `version.json`. Налаштування зберігаються локально в браузері.

## Випуск нової версії (для автора)
Потрібні Node 18+ і git.

1. Додай нову версію **першим** записом у `changelog.json`, трьома мовами:
   ```json
   { "version": "1.11.0", "uk": ["…"], "en": ["…"], "ru": ["…"] }
   ```
2. `node scripts/release.mjs 1.11.0` — оновлює `version` у `manifest.json`, пише `version.json` (notes із changelog, посилання на реліз `v1.11.0`), перевіряє синтаксис `.js`/`.json` і паритет локалізацій, збирає `dist/youtube-subs-first-1.11.0.zip` лише з файлів розширення, комітить і ставить тег `v1.11.0`. (`--no-git` — без коміту й тегу.)
3. `git push --follow-tags` — GitHub Action (`.github/workflows/release.yml`) збирає zip із тегу й створює реліз із текстом із changelog (~1 хв).
4. Протягом ~6 годин усі користувачі отримують сповіщення.

**Важливо:** `version.json` з новою версією не повинен потрапити в `main` раніше за реліз — тільки через скрипт і `git push --follow-tags`, щоб коміт і тег прийшли разом. Якщо Action упав — виправ і перезапусти його, або відкоти `version.json`.

Інші команди: `--build` (лише zip), `--build --store` (zip для Chrome Web Store з вимкненою перевіркою оновлень — магазин оновлює сам), `--notes 1.11.0` (текст релізу), `--setup owner/repo` (одноразово: прописати `UPDATE_URL`).

### Перевірка сповіщень локально
1. Підніми локальний сервер із `version.json` з вищою версією і заголовком `Access-Control-Allow-Origin: *` (порт 8765).
2. Тимчасово `UPDATE_URL = 'http://localhost:8765/version.json'` у `background.js`, онови розширення, натисни «Перевірити» в popup → ↑, сповіщення, блок у popup.
3. Поверни `UPDATE_URL`.
4. NEW: відкрий popup, підвищ `version` у `manifest.json`, онови розширення → **NEW**; відкрий popup → зникає.

---

## English

Chrome extension for youtube.com: your subscriptions and your own playlists instead of the algorithmic feed.

- Home = Subscriptions (the algorithmic feed stays available as "Algorithmic").
- No Shorts anywhere.
- Clean sidebar with your own "Subscriptions" and "Lists" sections (drag to reorder, hide).
- A better "Save to…" dialog: tall, searchable, several lists in a row, create a new list.
- Playlist board on `/feed/playlists`: drag videos between and within lists.

**Install:** download the zip from the [latest release](https://github.com/ulquorium/youtube-subs-first/releases/latest), unzip, `chrome://extensions` → Developer mode → **Load unpacked** → the folder.

**Update:** you get a **↑** badge and a notification when a new version is out. Unzip it over the same folder and click ↻ on the extension card.

**Privacy:** no data is collected or sent anywhere. Requests go only to YouTube (on your behalf, to manage your playlists) and to GitHub for `version.json`. Settings stay in your browser.

**Releasing:** add the changelog entry first, then `node scripts/release.mjs X.Y.Z` and `git push --follow-tags` (details above).

License: MIT.
