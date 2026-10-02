(() => {
  // Повторний запуск (оновлення розширення / превʼю) — прибираємо попередній екземпляр
  if (typeof window.__ysfDispose === 'function') window.__ysfDispose();
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  window.__ysfDispose = () => {
    cleanups.forEach((f) => f());
    document.querySelectorAll('#ysf-subs-entry, .ysf-section').forEach((n) => n.remove());
    document.querySelectorAll('[ysf-native-subs]').forEach((n) => n.removeAttribute('ysf-native-subs'));
  };

  const SUBS_URL = '/feed/subscriptions';
  const CHANNELS_URL = '/feed/channels';
  const PLAYLISTS_URL = '/feed/playlists';
  // LL — "Відео, які сподобалися" (вже є в блоці "Ви"), тому не показуємо
  const EXCLUDED_PLAYLISTS = ['LL'];
  // Плейлисти YouTube Music, які можна впізнати за ID (альбоми, добірки Music, мікси)
  const MUSIC_ID_PREFIXES = ['OLAK5uy_', 'RDCLAK5uy_', 'RDAMPL', 'RDAO', 'RDEM', 'RDTMAK', 'RDMM', 'SE'];
  // WL — "Переглянути пізніше": за замовчуванням першим, зі своєю іконкою
  const PINNED_FIRST = 'WL';
  const ICONS = { WL: 'WATCH_LATER_CAIRO' };
  // Скільки пунктів показувати до "Показати більше"
  const COLLAPSED_COUNT = 7;
  const CACHE_KEY = 'ysf-playlists-v2';
  const PREFS_KEY = 'ysf-prefs-v1';
  const REFRESH_MS = 60 * 1000;

  // Мова береться з інтерфейсу YouTube (<html lang>): uk / ru / en, для решти — англійська
  const lang = (document.documentElement.lang || navigator.language || 'en').slice(0, 2).toLowerCase();
  const UK = { subs: 'Підписки', algo: 'Алгоритмічна', playlists: 'Списки', edit: 'Змінити порядок', done: 'Готово', more: 'Показати більше', less: 'Показати менше', hide: 'Сховати', show: 'Показати', saveTo: 'Зберегти в…', search: 'Пошук списку', loading: 'Завантаження…', nothing: 'Нічого не знайдено', failed: 'Не вдалося — спробуй ще раз', newListName: 'Новий список', create: 'Створити', close: 'Закрити', boardHint: 'Перетягуй відео, щоб змінити порядок або перемістити в інший список. З Alt — скопіювати.', gridView: 'Звичайний вигляд', boardView: 'Показати дошкою', retry: 'Ще раз', emptyList: 'Порожньо', removeFromList: 'Вилучити з цього списку', alreadyThere: 'Це відео вже є в цьому списку', undo: 'Відмінити', removedFrom: 'Вилучено з', movedTo: 'Переміщено в', copiedTo: 'Скопійовано в' };
  const EN = { subs: 'Subscriptions', algo: 'Algorithmic', playlists: 'Playlists', edit: 'Reorder', done: 'Done', more: 'Show more', less: 'Show fewer', hide: 'Hide', show: 'Show', saveTo: 'Save to…', search: 'Search lists', loading: 'Loading…', nothing: 'Nothing found', failed: 'Failed — try again', newListName: 'New list', create: 'Create', close: 'Close', boardHint: 'Drag videos to reorder them or move them to another list. Hold Alt to copy.', gridView: 'Grid view', boardView: 'Board view', retry: 'Retry', emptyList: 'Empty', removeFromList: 'Remove from this list', alreadyThere: 'Already in this list', undo: 'Undo', removedFrom: 'Removed from', movedTo: 'Moved to', copiedTo: 'Copied to' };
  const L = {
    uk: UK,
    ru: { subs: 'Подписки', algo: 'Алгоритмическая', playlists: 'Списки', edit: 'Изменить порядок', done: 'Готово', more: 'Показать больше', less: 'Свернуть', hide: 'Скрыть', show: 'Показать', saveTo: 'Сохранить в…', search: 'Поиск списка', loading: 'Загрузка…', nothing: 'Ничего не найдено', failed: 'Не удалось — попробуй ещё раз', newListName: 'Новый список', create: 'Создать', close: 'Закрыть', boardHint: 'Перетаскивай видео, чтобы изменить порядок или переместить в другой список. С Alt — скопировать.', gridView: 'Обычный вид', boardView: 'Показать доской', retry: 'Ещё раз', emptyList: 'Пусто', removeFromList: 'Удалить из этого списка', alreadyThere: 'Это видео уже есть в этом списке', undo: 'Отменить', removedFrom: 'Удалено из', movedTo: 'Перемещено в', copiedTo: 'Скопировано в' },
    en: EN,
  }[lang] || EN;
  const NUM_LOCALE = { uk: 'uk-UA', ru: 'ru-RU', en: 'en-US' }[lang] || 'en-US';
  const fmtNum = (n) => n.toLocaleString(NUM_LOCALE);
  const quote = (name) => (lang === 'uk' || lang === 'ru' ? '«' + name + '»' : '“' + name + '”');

  // YouTube вмикає Trusted Types, тому жодного innerHTML — лише DOM API.
  const el = (tag, props = {}, children = []) => {
    const e = document.createElement(tag);
    Object.assign(e, props);
    e.append(...children);
    return e;
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgIcon(d) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    return svg;
  }
  const PATH = {
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    playlistAdd: 'M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z',
    check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    eyeOff: 'M12 7a5 5 0 0 1 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92A11.8 11.8 0 0 0 23 12c-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16A4.9 4.9 0 0 1 12 7zM2 4.27l2.74 2.74A11.8 11.8 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84L19.73 22 21 20.73 3.27 3 2 4.27zm5.53 5.53 1.55 1.55A3 3 0 0 0 12 15c.22 0 .44-.03.65-.08l1.55 1.55A5 5 0 0 1 7.53 9.8zm4.31-.78 3.15 3.15.01-.17a3 3 0 0 0-3-3l-.16.02z',
    grip: 'M9 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-1.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM16.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm1.5 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  };

  // Нативна іконка YouTube: сама перемикається на "заповнену" версію через .active
  function ytIcon(name) {
    const i = document.createElement('yt-icon');
    i.icon = name;
    return i;
  }

  // ---------- Налаштування (порядок, приховані) ----------
  let prefs = { subs: { order: [], hidden: [], expanded: false }, playlists: { order: [], hidden: [], expanded: false } };
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (p) prefs = { ...prefs, ...p, subs: { ...prefs.subs, ...p.subs }, playlists: { ...prefs.playlists, ...p.playlists } };
  } catch (_) {}
  const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_) {} };
  const editing = { subs: false, playlists: false };

  // Нові елементи (яких ще немає в збереженому порядку) — зверху, решта — як вибрав користувач
  function sortByPrefs(items, key) {
    const order = prefs[key].order;
    if (!order.length) return items;
    const pos = new Map(order.map((id, i) => [id, i]));
    const fresh = items.filter((it) => !pos.has(it.id));
    const known = items.filter((it) => pos.has(it.id)).sort((a, b) => pos.get(a.id) - pos.get(b.id));
    return [...fresh, ...known];
  }

  // ---------- SPA-навігація ----------
  function navigateEndpoint(endpoint, url) {
    const app = document.querySelector('ytd-app');
    if (!app || !endpoint) return location.assign(url);
    app.dispatchEvent(new CustomEvent('yt-navigate', { bubbles: true, composed: true, detail: { endpoint } }));
  }
  const browseEndpoint = (url, browseId, webPageType = 'WEB_PAGE_TYPE_BROWSE') =>
    ({ commandMetadata: { webCommandMetadata: { url, webPageType } }, browseEndpoint: { browseId } });
  const goSubs = () => navigateEndpoint(browseEndpoint(SUBS_URL, 'FEsubscriptions'), SUBS_URL);
  const goChannels = () => navigateEndpoint(browseEndpoint(CHANNELS_URL, 'FEchannels'), CHANNELS_URL);
  const goPlaylists = () => navigateEndpoint(browseEndpoint(PLAYLISTS_URL, 'FEplaylist_aggregation'), PLAYLISTS_URL);

  const isPlainClick = (e) => e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
  const onPlainClick = (fn) => (e) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  // Клік по логотипу → підписки
  on(document, 'click', (e) => {
    const logo = e.target.closest && e.target.closest('ytd-topbar-logo-renderer a, a#logo');
    if (!logo || !isPlainClick(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    goSubs();
  }, true);

  // ---------- Пункт "Підписки" вгорі ----------
  function buildSubsEntry() {
    const a = el('a', { id: 'ysf-subs-entry', className: 'ysf-entry', href: SUBS_URL, title: L.subs }, [
      el('span', { className: 'ysf-icon' }, [ytIcon('TAB_SHORTS_CAIRO')]),
      el('span', { className: 'ysf-title', textContent: L.subs }),
    ]);
    a.addEventListener('click', onPlainClick(goSubs));
    return a;
  }

  function setActive(entry, v) {
    entry.classList.toggle('ysf-active', v);
    const icon = entry.querySelector('.ysf-icon > yt-icon');
    if (icon && icon.active !== v) icon.active = v;
  }

  // ---------- Дані: підписки (з нативного сайдбару) ----------
  const isChannelData = (d) => !!d?.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC');
  function findNativeSubsSection(guide) {
    return [...guide.querySelectorAll('ytd-guide-section-renderer')].find((s) =>
      !s.querySelector('a[href="/feed/history"]') &&
      [...s.querySelectorAll('ytd-guide-entry-renderer')].some((e) => isChannelData(e.data)));
  }

  function readSubscriptions(section) {
    const raw = [];
    section.querySelectorAll('ytd-guide-entry-renderer').forEach((e) => e.data && raw.push(e.data));
    section.querySelectorAll('ytd-guide-collapsible-entry-renderer').forEach((c) =>
      (c.data?.expandableItems || []).forEach((x) => x.guideEntryRenderer && raw.push(x.guideEntryRenderer)));
    const seen = new Set();
    const items = [];
    for (const d of raw) {
      if (!isChannelData(d)) continue;
      const id = d.navigationEndpoint.browseEndpoint.browseId;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        title: d.formattedTitle?.simpleText || '',
        thumb: d.thumbnail?.thumbnails?.[0]?.url || '',
        url: d.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url || '/channel/' + id,
        endpoint: d.navigationEndpoint,
        isNew: String(d.presentationStyle || '').includes('NEW_CONTENT'),
        live: !!d.badges?.liveBroadcasting,
      });
    }
    return items;
  }

  // ---------- Дані: плейлисти (зі сторінки /feed/playlists) ----------
  let playlists = [];
  let lastFetch = 0;
  let fetching = false;
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Array.isArray(c.items)) playlists = c.items;
  } catch (_) {}

  // Кількість відео з бейджа на обкладинці ("22 відео", "1 287 відео", "Немає відео")
  function videoCount(lockup) {
    let text = null;
    (function find(x) {
      if (text !== null || !x || typeof x !== 'object') return;
      if (x.thumbnailBadgeViewModel && typeof x.thumbnailBadgeViewModel.text === 'string') {
        text = x.thumbnailBadgeViewModel.text;
        return;
      }
      for (const k in x) find(x[k]);
    })(lockup.contentImage);
    if (text === null) return null;
    const digits = text.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }

  const isMusicPlaylist = (id) => MUSIC_ID_PREFIXES.some((p) => id.startsWith(p));

  async function fetchPlaylists(force = false) {
    if (fetching || (!force && Date.now() - lastFetch < REFRESH_MS)) return;
    fetching = true;
    lastFetch = Date.now();
    try {
      const html = await (await fetch(PLAYLISTS_URL, { credentials: 'include' })).text();
      const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
      if (!m) return;
      const items = [];
      const seen = new Set();
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        for (const k in o) {
          if (k === 'lockupViewModel') {
            const l = o[k];
            const title = l?.metadata?.lockupMetadataViewModel?.title?.content;
            if (l?.contentId && title && !seen.has(l.contentId) &&
                String(l.contentType || '').includes('PLAYLIST') &&
                !EXCLUDED_PLAYLISTS.includes(l.contentId) && !isMusicPlaylist(l.contentId)) {
              seen.add(l.contentId);
              items.push({ id: l.contentId, title, count: videoCount(l) });
            }
          }
          walk(o[k]);
        }
      })(JSON.parse(m[1]));
      const wl = items.findIndex((p) => p.id === PINNED_FIRST);
      if (wl > 0) items.unshift(items.splice(wl, 1)[0]);
      playlists = items;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch (_) {}
      schedule();
    } catch (err) {
      console.warn('[YT Subs First] playlists fetch failed', err);
    } finally {
      fetching = false;
    }
  }

  // Якщо назва починається з емодзі — воно стає іконкою, а з назви прибирається.
  const EMOJI_RE = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}\uFE0F?)*/u;
  function splitEmoji(title) {
    const m = title.match(EMOJI_RE);
    if (!m) return { emoji: null, name: title };
    const name = title.slice(m[0].length).trim();
    return name ? { emoji: m[0], name } : { emoji: null, name: title };
  }

  // ---------- Універсальна секція з сортуванням ----------
  function buildSection(key, cfg) {
    const titleLink = el('a', { className: 'ysf-section-link', href: cfg.href, title: cfg.title }, [
      el('span', { className: 'ysf-section-title', textContent: cfg.title }),
      ytIcon('CHEVRON_RIGHT'),
    ]);
    titleLink.addEventListener('click', onPlainClick(cfg.onHeader));
    const editBtn = el('button', { className: 'ysf-edit-btn', type: 'button' });
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      editing[key] = !editing[key];
      schedule();
    });
    const header = el('div', { className: 'ysf-section-header' }, [titleLink, editBtn]);
    const box = el('div', { className: 'ysf-items' });
    setupDnD(box, key);
    return el('div', { id: 'ysf-' + key + '-section', className: 'ysf-section' }, [header, box]);
  }

  function renderSection(section, key, cfg) {
    const isEditing = editing[key];
    const hidden = new Set(prefs[key].hidden);
    const sorted = sortByPrefs(cfg.items, key);
    const shown = sorted.filter((it) => !hidden.has(it.id));
    let visible = isEditing ? sorted : shown;
    const collapsible = !isEditing && cfg.collapseAfter && shown.length > cfg.collapseAfter + 1;
    if (collapsible && !prefs[key].expanded) visible = visible.slice(0, cfg.collapseAfter);

    section.classList.toggle('ysf-editing', isEditing);
    const editBtn = section.querySelector('.ysf-edit-btn');
    const btnState = isEditing ? 'done' : 'edit';
    if (editBtn.dataset.state !== btnState) {
      editBtn.dataset.state = btnState;
      editBtn.title = isEditing ? L.done : L.edit;
      editBtn.replaceChildren(svgIcon(isEditing ? PATH.check : PATH.edit));
    }

    const box = section.querySelector('.ysf-items');
    const renderKey = JSON.stringify([isEditing, prefs[key], visible.map((it) => [it.id, it.title, it.count, it.isNew, it.live, it.thumb])]);
    if (box.dataset.key !== renderKey) {
      box.dataset.key = renderKey;
      const nodes = visible.map((it) => buildItem(key, cfg, it, isEditing, hidden.has(it.id)));
      if (collapsible) {
        const expanded = !!prefs[key].expanded;
        const t = el('a', { className: 'ysf-entry ysf-toggle', href: '#' }, [
          el('span', { className: 'ysf-icon' }, [ytIcon(expanded ? 'COLLAPSE_CAIRO' : 'EXPAND_CAIRO')]),
          el('span', { className: 'ysf-title', textContent: expanded ? L.less : L.more }),
        ]);
        t.addEventListener('click', (e) => {
          e.preventDefault();
          prefs[key].expanded = !expanded;
          savePrefs();
          schedule();
        });
        nodes.push(t);
      }
      box.replaceChildren(...nodes);
    }

    box.querySelectorAll('.ysf-entry[data-id]').forEach((a) => {
      const it = cfg.items.find((x) => x.id === a.dataset.id);
      setActive(a, !isEditing && !!it && cfg.isActive(it));
    });
  }

  function buildItem(key, cfg, it, isEditing, isHidden) {
    const a = el('a', { className: 'ysf-entry' + (isHidden ? ' ysf-hidden-item' : ''), href: cfg.url(it), title: it.title }, [
      cfg.buildIcon(it),
      el('span', { className: 'ysf-title', textContent: cfg.label ? cfg.label(it) : it.title }),
    ]);
    a.dataset.id = it.id;
    if (isEditing) {
      a.draggable = true;
      const eye = el('button', { className: 'ysf-eye-btn', type: 'button', title: isHidden ? L.show : L.hide }, [svgIcon(isHidden ? PATH.eyeOff : PATH.eye)]);
      eye.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const h = new Set(prefs[key].hidden);
        if (h.has(it.id)) h.delete(it.id); else h.add(it.id);
        prefs[key].hidden = [...h];
        savePrefs();
        schedule();
      });
      a.append(eye, el('span', { className: 'ysf-grip' }, [svgIcon(PATH.grip)]));
      a.addEventListener('click', (e) => e.preventDefault());
    } else {
      const extra = cfg.extra && cfg.extra(it);
      if (extra) a.append(extra);
      a.addEventListener('click', onPlainClick(() => navigateEndpoint(cfg.endpoint(it), cfg.url(it))));
    }
    return a;
  }

  // ---------- Drag & drop ----------
  function setupDnD(box, key) {
    let dragged = null;
    box.addEventListener('dragstart', (e) => {
      const a = e.target.closest && e.target.closest('.ysf-entry[draggable="true"]');
      if (!a) return;
      dragged = a;
      a.classList.add('ysf-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', a.dataset.id);
    });
    box.addEventListener('dragover', (e) => {
      if (!dragged) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const others = [...box.querySelectorAll('.ysf-entry[data-id]:not(.ysf-dragging)')];
      const before = others.find((n) => {
        const r = n.getBoundingClientRect();
        return e.clientY < r.top + r.height / 2;
      });
      if (before) {
        if (dragged.nextElementSibling !== before) box.insertBefore(dragged, before);
      } else if (box.lastElementChild !== dragged) {
        box.appendChild(dragged);
      }
    });
    const finish = () => {
      if (!dragged) return;
      dragged.classList.remove('ysf-dragging');
      dragged = null;
      const ids = [...box.querySelectorAll('.ysf-entry[data-id]')].map((n) => n.dataset.id);
      // зберігаємо й позиції тих, кого зараз немає в списку
      const rest = prefs[key].order.filter((id) => !ids.includes(id));
      prefs[key].order = [...ids, ...rest];
      savePrefs();
      schedule();
    };
    box.addEventListener('drop', (e) => { e.preventDefault(); finish(); });
    box.addEventListener('dragend', finish);
  }

  // ---------- Конфіги секцій ----------
  let subsItems = [];
  const subsCfg = {
    title: L.subs,
    href: CHANNELS_URL,
    onHeader: goChannels,
    collapseAfter: COLLAPSED_COUNT,
    get items() { return subsItems; },
    url: (it) => it.url,
    endpoint: (it) => it.endpoint,
    isActive: (it) => location.pathname === it.url || location.pathname.startsWith(it.url + '/'),
    buildIcon: (it) => el('span', { className: 'ysf-icon ysf-avatar' }, [el('img', { src: it.thumb, alt: '' })]),
    extra: (it) => (it.live ? el('span', { className: 'ysf-live' }) : it.isNew ? el('span', { className: 'ysf-dot' }) : null),
  };

  const playlistsCfg = {
    title: L.playlists,
    href: PLAYLISTS_URL,
    onHeader: goPlaylists,
    collapseAfter: COLLAPSED_COUNT,
    get items() { return playlists; },
    url: (it) => '/playlist?list=' + encodeURIComponent(it.id),
    endpoint: (it) => browseEndpoint('/playlist?list=' + it.id, 'VL' + it.id, 'WEB_PAGE_TYPE_PLAYLIST'),
    isActive: (it) => location.pathname === '/playlist' && new URLSearchParams(location.search).get('list') === it.id,
    label: (it) => splitEmoji(it.title).name,
    buildIcon: (it) => {
      const { emoji } = splitEmoji(it.title);
      if (emoji) return el('span', { className: 'ysf-icon ysf-emoji', textContent: emoji });
      return el('span', { className: 'ysf-icon' + (ICONS[it.id] ? '' : ' ysf-icon-muted') }, [ytIcon(ICONS[it.id] || 'PLAYLISTS_CAIRO')]);
    },
    extra: (it) => (it.count == null ? null : el('span', { className: 'ysf-count', textContent: fmtNum(it.count) })),
  };

  // =====================================================================
  // ---------- Власне вікно "Зберегти в…" (замість нативного) ----------
  // Нативне закривається після кожного вибору. Наше: високе, з пошуком,
  // можна відмітити кілька списків і зняти з поточного, закривається вручну.
  // =====================================================================

  // Запити до внутрішнього API YouTube від імені поточного користувача
  async function sha1Hex(s) {
    const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  function readCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') + '=([^;]*)'));
    return m ? m[1] : null;
  }
  async function innertube(path, body) {
    const cfg = window.ytcfg;
    const sid = readCookie('SAPISID') || readCookie('__Secure-3PAPISID');
    const ts = Math.floor(Date.now() / 1000);
    const headers = {
      'Content-Type': 'application/json',
      'X-Origin': location.origin,
      'X-Goog-AuthUser': String(cfg.get('SESSION_INDEX') || 0),
      'X-Youtube-Client-Name': String(cfg.get('INNERTUBE_CONTEXT_CLIENT_NAME')),
      'X-Youtube-Client-Version': String(cfg.get('INNERTUBE_CLIENT_VERSION')),
    };
    if (sid) headers.Authorization = 'SAPISIDHASH ' + ts + '_' + (await sha1Hex(ts + ' ' + sid + ' ' + location.origin));
    const r = await fetch('/youtubei/v1/' + path + '?prettyPrint=false', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ context: cfg.get('INNERTUBE_CONTEXT'), ...body }),
    });
    if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
    return r.json();
  }
  const api = {
    async listsForVideo(videoId) {
      const j = await innertube('playlist/get_add_to_playlist', { videoIds: [videoId], excludeWatchLater: false });
      const out = [];
      (function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (o.playlistAddToOptionRenderer) {
          const p = o.playlistAddToOptionRenderer;
          out.push({
            id: p.playlistId,
            title: p.title?.simpleText || (p.title?.runs || []).map((r) => r.text).join('') || p.playlistId,
            checked: p.containsSelectedVideos === 'ALL',
          });
          return;
        }
        for (const k in o) walk(o[k]);
      })(j);
      return out;
    },
    async add(playlistId, videoId) {
      const j = await innertube('browse/edit_playlist', { playlistId, actions: [{ action: 'ACTION_ADD_VIDEO', addedVideoId: videoId }] });
      if (j.status && j.status !== 'STATUS_SUCCEEDED') throw new Error(j.status);
    },
    async remove(playlistId, videoId) {
      const j = await innertube('browse/edit_playlist', { playlistId, actions: [{ action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: videoId }] });
      if (j.status && j.status !== 'STATUS_SUCCEEDED') throw new Error(j.status);
    },
    async move(playlistId, setId, { before, after }) {
      const action = before
        ? { action: 'ACTION_MOVE_VIDEO_BEFORE', setVideoId: setId, movedSetVideoIdSuccessor: before }
        : { action: 'ACTION_MOVE_VIDEO_AFTER', setVideoId: setId, movedSetVideoIdPredecessor: after };
      const j = await innertube('browse/edit_playlist', { playlistId, actions: [action] });
      if (j.status && j.status !== 'STATUS_SUCCEEDED') throw new Error(j.status);
    },
    async create(title, videoId) {
      const j = await innertube('playlist/create', { title, privacyStatus: 'PRIVATE', videoIds: [videoId] });
      return j.playlistId;
    },
  };

  function playlistIconEl(id, title) {
    const { emoji } = splitEmoji(title);
    if (emoji) return el('span', { className: 'ysf-icon ysf-emoji', textContent: emoji });
    return el('span', { className: 'ysf-icon' + (ICONS[id] ? '' : ' ysf-icon-muted') }, [ytIcon(ICONS[id] || 'PLAYLISTS_CAIRO')]);
  }

  // На сторінці списку: ховаємо/показуємо рядок відео, якщо його зняли з цього списку
  function markRowRemoved(playlistId, videoId, removed) {
    if (location.pathname !== '/playlist') return;
    if (new URLSearchParams(location.search).get('list') !== playlistId) return;
    document.querySelectorAll('ytd-playlist-video-renderer').forEach((r) => {
      if (r.data?.videoId === videoId) r.toggleAttribute('ysf-removed', removed);
    });
  }

  let panel = null;
  function closeSavePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
  }
  cleanups.push(closeSavePanel);

  async function openSavePanel(videoId, videoTitle) {
    closeSavePanel();
    const listBox = el('div', { className: 'ysf-sp-list' }, [el('div', { className: 'ysf-sp-empty', textContent: L.loading })]);
    const search = el('input', { className: 'ysf-sp-search', type: 'search', placeholder: L.search });
    const newInput = el('input', { className: 'ysf-sp-new-input', type: 'text', placeholder: L.newListName });
    const newBtn = el('button', { className: 'ysf-sp-btn', type: 'button', textContent: L.create });
    const doneBtn = el('button', { className: 'ysf-sp-btn ysf-sp-primary', type: 'button', textContent: L.done });
    const closeBtn = el('button', { className: 'ysf-sp-close', type: 'button', title: L.close }, [svgIcon(PATH.close)]);
    const dialog = el('div', { className: 'ysf-sp-dialog', role: 'dialog' }, [
      el('div', { className: 'ysf-sp-head' }, [
        el('img', { className: 'ysf-sp-thumb', src: 'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg', alt: '' }),
        el('div', { className: 'ysf-sp-headtext' }, [
          el('div', { className: 'ysf-sp-title', textContent: L.saveTo }),
          el('div', { className: 'ysf-sp-video', textContent: videoTitle || '' }),
        ]),
        closeBtn,
      ]),
      search,
      listBox,
      el('div', { className: 'ysf-sp-foot' }, [
        el('div', { className: 'ysf-sp-new' }, [newInput, newBtn]),
        doneBtn,
      ]),
    ]);
    panel = el('div', { className: 'ysf-sp-backdrop' }, [dialog]);
    panel.addEventListener('mousedown', (e) => { if (e.target === panel) closeSavePanel(); });
    closeBtn.addEventListener('click', closeSavePanel);
    doneBtn.addEventListener('click', closeSavePanel);
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeSavePanel(); }
      e.stopPropagation(); // не даємо гарячим клавішам YouTube (k, j, l, f…) спрацьовувати
    });
    document.body.appendChild(panel);
    search.focus();

    let lists = [];
    let changed = false;
    const render = () => {
      const q = search.value.trim().toLowerCase();
      // тут показуємо всі списки, навіть сховані в сайдбарі
      let items = lists.filter((p) => !EXCLUDED_PLAYLISTS.includes(p.id) && !isMusicPlaylist(p.id));
      items = sortByPrefs(items, 'playlists');
      const wl = items.findIndex((p) => p.id === PINNED_FIRST);
      if (wl > 0 && !prefs.playlists.order.length) items.unshift(items.splice(wl, 1)[0]);
      if (q) items = items.filter((p) => p.title.toLowerCase().includes(q));
      if (!items.length) {
        listBox.replaceChildren(el('div', { className: 'ysf-sp-empty', textContent: L.nothing }));
        return;
      }
      listBox.replaceChildren(...items.map((p) => {
        const box = el('span', { className: 'ysf-sp-check' }, [svgIcon(PATH.check)]);
        const row = el('button', { className: 'ysf-sp-row' + (p.checked ? ' ysf-on' : '') + (p.busy ? ' ysf-busy' : ''), type: 'button', title: p.title }, [
          playlistIconEl(p.id, p.title),
          el('span', { className: 'ysf-sp-name', textContent: splitEmoji(p.title).name }),
          box,
        ]);
        row.addEventListener('click', async () => {
          if (p.busy) return;
          const want = !p.checked;
          p.checked = want;
          p.busy = true;
          render();
          try {
            if (want) await api.add(p.id, videoId); else await api.remove(p.id, videoId);
            markRowRemoved(p.id, videoId, !want);
            changed = true;
          } catch (err) {
            console.warn('[YT Subs First] save failed', err);
            p.checked = !want;
            showToast(L.failed);
          } finally {
            p.busy = false;
            if (panel) render();
          }
        });
        return row;
      }));
    };
    search.addEventListener('input', render);

    const create = async () => {
      const title = newInput.value.trim();
      if (!title) { newInput.focus(); return; }
      newBtn.disabled = true;
      try {
        const id = await api.create(title, videoId);
        lists.unshift({ id: id || 'new-' + Date.now(), title, checked: true });
        newInput.value = '';
        changed = true;
        render();
      } catch (err) {
        console.warn('[YT Subs First] create failed', err);
        showToast(L.failed);
      } finally {
        newBtn.disabled = false;
      }
    };
    newBtn.addEventListener('click', create);
    newInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });

    const observer = new MutationObserver(() => {
      if (!document.body.contains(dialog)) {
        observer.disconnect();
        if (changed) onPlaylistsChanged();
      }
    });
    observer.observe(document.body, { childList: true });

    try {
      lists = await api.listsForVideo(videoId);
      if (panel) render();
    } catch (err) {
      console.warn('[YT Subs First] load lists failed', err);
      listBox.replaceChildren(el('div', { className: 'ysf-sp-empty', textContent: L.failed }));
    }
  }

  let toastTimer = 0;
  // showToast(text) або showToast(text, { undo }) — тоді 5 секунд є кнопка "Відмінити"
  function showToast(text, opts = {}) {
    let t = document.getElementById('ysf-toast');
    if (!t) { t = el('div', { id: 'ysf-toast' }); document.body.appendChild(t); }
    const children = [el('span', { textContent: text })];
    if (opts.undo) {
      const btn = el('button', { className: 'ysf-toast-undo', type: 'button', textContent: L.undo });
      btn.addEventListener('click', () => {
        clearTimeout(toastTimer);
        t.classList.remove('ysf-show');
        opts.undo();
      });
      children.push(btn);
    }
    t.replaceChildren(...children);
    t.classList.toggle('ysf-has-action', !!opts.undo);
    t.classList.add('ysf-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('ysf-show'), opts.undo ? 5000 : 3000);
  }

  // Меню "⋮" біля відео: "Зберегти в списку" — першим пунктом і відкриває наше вікно
  const isSaveMenuItem = (item) => {
    const d = item.data;
    if (!d) return false;
    const icon = d.icon?.iconType || '';
    return /^(BOOKMARK_BORDER|PLAYLIST_ADD)$/.test(icon) ||
      !!d.navigationEndpoint?.showSheetCommand?.panelLoadingStrategy ||
      !!d.serviceEndpoint?.addToPlaylistServiceEndpoint || !!d.navigationEndpoint?.addToPlaylistServiceEndpoint;
  };
  function videoIdFromPopup(popup) {
    let id = null;
    (function walk(o, depth) {
      if (id || !o || typeof o !== 'object' || depth > 16) return;
      for (const k in o) {
        if (/^(videoId|addedVideoId|removedVideoId)$/.test(k) && typeof o[k] === 'string') { id = o[k]; return; }
        if (k === 'videoIds' && Array.isArray(o[k]) && o[k].length === 1) { id = o[k][0]; return; }
        walk(o[k], depth + 1);
      }
    })(popup?.data, 0);
    return id;
  }
  // Запамʼятовуємо, біля якого відео відкрили меню (для назви й запасного ID)
  let lastMenuVideo = { id: null, title: '' };
  on(document, 'click', (e) => {
    const host = e.target.closest && e.target.closest('ytd-playlist-video-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model, ytd-playlist-panel-video-renderer');
    if (!e.target.closest || !e.target.closest('button, yt-icon-button')) return;
    if (!host) { lastMenuVideo = { id: null, title: '' }; return; }
    const link = host.querySelector('a[href*="/watch?v="]');
    const id = host.data?.videoId || (link && new URL(link.href, location.origin).searchParams.get('v'));
    const titleEl = host.querySelector('#video-title, h3 a, .yt-lockup-metadata-view-model__title, a[title]');
    lastMenuVideo = { id, title: (titleEl?.getAttribute('title') || titleEl?.textContent || '').trim() };
  }, true);

  on(document, 'click', (e) => {
    const item = e.target.closest && e.target.closest('ytd-menu-popup-renderer ytd-menu-navigation-item-renderer, ytd-menu-popup-renderer ytd-menu-service-item-renderer');
    if (!item || !isSaveMenuItem(item)) return;
    const popup = item.closest('ytd-menu-popup-renderer');
    const videoId = videoIdFromPopup(popup) || lastMenuVideo.id ||
      (location.pathname === '/watch' ? new URLSearchParams(location.search).get('v') : null);
    if (!videoId) return; // не впізнали відео — хай працює стандартне вікно
    e.preventDefault();
    e.stopImmediatePropagation();
    popup.closest('tp-yt-iron-dropdown')?.close();
    openSavePanel(videoId, lastMenuVideo.id === videoId ? lastMenuVideo.title : '');
  }, true);

  // Сторінка відео: кнопка "Зберегти" під плеєром → наше вікно
  on(document, 'click', (e) => {
    if (location.pathname !== '/watch' || !isPlainClick(e)) return;
    const bvm = e.target.closest && e.target.closest('ytd-watch-metadata button-view-model, ytd-watch-metadata ytd-button-renderer');
    if (!bvm) return;
    const d = bvm.data || bvm.polymerController?.data;
    const icon = d?.iconName || d?.icon?.iconType || '';
    if (!/PLAYLIST_ADD|BOOKMARK/.test(icon)) return;
    const videoId = new URLSearchParams(location.search).get('v');
    if (!videoId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const title = document.querySelector('ytd-watch-metadata h1')?.textContent.trim() || '';
    openSavePanel(videoId, title);
  }, true);

  // =====================================================================
  // ---------- Дошка списків на /feed/playlists ----------
  // Колонка = список. Перетягування картки в іншу колонку переміщує відео,
  // з затиснутим Alt — копіює.
  // =====================================================================
  const board = {
    root: null,
    columns: new Map(), // playlistId -> { id, title, count, videos: [], cont, loading, error, el }
    dragging: null, // { videoId, from }
    loadedFor: '',
  };

  function parseVideos(json) {
    const videos = [];
    let cont = null;
    (function walk(o) {
      if (!o || typeof o !== 'object') return;
      if (o.playlistVideoRenderer) {
        const v = o.playlistVideoRenderer;
        if (v.videoId && v.isPlayable !== false) {
          videos.push({
            id: v.videoId,
            title: (v.title?.runs || []).map((r) => r.text).join('') || v.title?.simpleText || '',
            channel: (v.shortBylineText?.runs || []).map((r) => r.text).join('') || '',
            length: v.lengthText?.simpleText || '',
            setId: v.setVideoId || null,
          });
        }
        return;
      }
      // продовження беремо лише зі списку, де лежать самі відео
      if (Array.isArray(o) && o.some((x) => x && x.playlistVideoRenderer)) {
        const last = o[o.length - 1];
        const token = last?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (token) cont = token;
      }
      for (const k in o) walk(o[k]);
    })(json);
    return { videos, cont };
  }

  async function loadColumn(col, more = false) {
    if (col.loading) return;
    col.loading = true;
    col.error = false;
    renderColumn(col);
    try {
      const j = await innertube('browse', more && col.cont ? { continuation: col.cont } : { browseId: 'VL' + col.id });
      const { videos, cont } = parseVideos(j);
      col.videos = more ? col.videos.concat(videos.filter((v) => !col.videos.some((x) => x.id === v.id))) : videos;
      col.cont = cont;
    } catch (err) {
      console.warn('[YT Subs First] load column failed', err);
      col.error = true;
    } finally {
      col.loading = false;
      renderColumn(col);
    }
  }

  function boardPlaylists() {
    const hidden = new Set(prefs.playlists.hidden);
    return sortByPrefs(playlists, 'playlists').filter((p) => !hidden.has(p.id));
  }

  function buildBoard() {
    const switchBtn = el('button', { className: 'ysf-sp-btn ysf-board-switch', type: 'button', textContent: L.gridView });
    switchBtn.addEventListener('click', () => { prefs.boardOff = true; savePrefs(); schedule(); });
    const cols = el('div', { className: 'ysf-board-cols' });
    // автопрокрутка вбік, коли тягнемо картку біля краю
    cols.addEventListener('dragover', (e) => {
      if (!board.dragging) return;
      const r = cols.getBoundingClientRect();
      if (e.clientX < r.left + 60) cols.scrollLeft -= 20;
      else if (e.clientX > r.right - 60) cols.scrollLeft += 20;
    });
    return el('div', { id: 'ysf-board' }, [
      el('div', { className: 'ysf-board-head' }, [
        el('h1', { className: 'ysf-board-title', textContent: L.playlists }),
        el('span', { className: 'ysf-board-hint', textContent: L.boardHint }),
        switchBtn,
      ]),
      cols,
    ]);
  }

  function syncBoardColumns() {
    const colsEl = board.root.querySelector('.ysf-board-cols');
    const list = boardPlaylists();
    const ids = list.map((p) => p.id);
    for (const [id, col] of board.columns) {
      if (!ids.includes(id)) { col.el.remove(); board.columns.delete(id); }
    }
    list.forEach((p, i) => {
      let col = board.columns.get(p.id);
      if (!col) {
        col = { id: p.id, title: p.title, count: p.count, videos: [], cont: null, loading: false, error: false, el: null };
        buildColumnEl(col);
        board.columns.set(p.id, col);
        loadColumn(col);
      } else if (col.title !== p.title || (!col.loading && col.count !== p.count)) {
        col.title = p.title;
        col.count = p.count;
        renderColumnHead(col);
      }
      if (colsEl.children[i] !== col.el) colsEl.insertBefore(col.el, colsEl.children[i] || null);
    });
  }

  function buildColumnEl(col) {
    const head = el('a', { className: 'ysf-col-head', href: '/playlist?list=' + encodeURIComponent(col.id) });
    head.addEventListener('click', onPlainClick(() => navigateEndpoint(browseEndpoint('/playlist?list=' + col.id, 'VL' + col.id, 'WEB_PAGE_TYPE_PLAYLIST'), '/playlist?list=' + col.id)));
    const body = el('div', { className: 'ysf-col-body' });
    const c = el('section', { className: 'ysf-col' }, [head, body]);
    c.dataset.id = col.id;
    col.el = c;
    renderColumnHead(col);

    c.addEventListener('dragover', (e) => {
      if (!board.dragging) return;
      e.preventDefault();
      const same = board.dragging.from === col.id;
      const copy = !same && e.altKey;
      e.dataTransfer.dropEffect = copy ? 'copy' : 'move';
      c.classList.toggle('ysf-drop', !same);
      c.classList.toggle('ysf-drop-copy', copy);
      placeDropLine(col, e.clientY);
    });
    c.addEventListener('dragleave', (e) => {
      if (!c.contains(e.relatedTarget)) clearDropState(c);
    });
    c.addEventListener('drop', (e) => {
      if (!board.dragging) return;
      e.preventDefault();
      const index = dropIndex(col);
      clearDropState(c);
      const { videoId, from } = board.dragging;
      board.dragging = null;
      if (from === col.id) reorderVideo(col, videoId, index);
      else moveVideo(videoId, from, col.id, e.altKey, index);
    });
    return c;
  }

  // Лінія, що показує, куди впаде картка
  let dropLine = null;
  function placeDropLine(col, y) {
    if (!dropLine) dropLine = el('div', { className: 'ysf-drop-line' });
    const body = col.el.querySelector('.ysf-col-body');
    const cards = [...body.querySelectorAll('.ysf-card:not(.ysf-dragging)')];
    const before = cards.find((n) => {
      const r = n.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (before) {
      if (dropLine.nextElementSibling !== before) body.insertBefore(dropLine, before);
    } else {
      const last = cards[cards.length - 1];
      const anchor = last ? last.nextElementSibling : body.firstElementChild;
      if (dropLine.previousElementSibling !== last || dropLine.parentElement !== body) body.insertBefore(dropLine, anchor);
    }
  }
  // Позиція вставки (індекс серед відео колонки, без перетягуваної картки)
  function dropIndex(col) {
    const body = col.el.querySelector('.ysf-col-body');
    if (!dropLine || dropLine.parentElement !== body) return col.videos.length;
    let i = 0;
    for (const n of body.children) {
      if (n === dropLine) break;
      if (n.classList.contains('ysf-card') && !n.classList.contains('ysf-dragging')) i++;
    }
    return i;
  }
  function clearDropState(c) {
    c.classList.remove('ysf-drop', 'ysf-drop-copy');
    if (dropLine && c.contains(dropLine)) dropLine.remove();
  }

  // Поставити відео (за setId) на позицію index у списку на сервері.
  // list — локальний масив уже в новому порядку.
  async function placeOnServer(playlistId, list, index) {
    const item = list[index];
    if (!item?.setId) return;
    const next = list[index + 1];
    const prev = list[index - 1];
    if (next?.setId) await api.move(playlistId, item.setId, { before: next.setId });
    else if (prev?.setId) await api.move(playlistId, item.setId, { after: prev.setId });
  }

  // Перестановка в межах одного списку — будуємо чергу
  async function reorderVideo(col, videoId, index) {
    const from = col.videos.findIndex((v) => v.id === videoId);
    if (from < 0) return;
    const [video] = col.videos.splice(from, 1);
    index = Math.max(0, Math.min(index, col.videos.length));
    col.videos.splice(index, 0, video);
    if (index === from) { renderColumn(col); return; }
    renderColumn(col);
    try {
      if (!video.setId) throw new Error('no setVideoId');
      await placeOnServer(col.id, col.videos, index);
    } catch (err) {
      console.warn('[YT Subs First] reorder failed', err);
      showToast(L.failed);
      loadColumn(col);
    }
  }

  // Після додавання відео в список: дізнаємось його setVideoId і ставимо на потрібне місце
  async function addAt(col, videoId, index) {
    await api.add(col.id, videoId);
    const atEnd = index >= col.videos.length - 1;
    const j = await innertube('browse', { browseId: 'VL' + col.id });
    const fresh = parseVideos(j).videos;
    const added = [...fresh].reverse().find((v) => v.id === videoId);
    const local = col.videos.find((v) => v.id === videoId);
    if (local && added) local.setId = added.setId;
    if (!atEnd && added?.setId) await placeOnServer(col.id, col.videos, index);
  }

  function renderColumnHead(col) {
    const head = col.el.querySelector('.ysf-col-head');
    // офіційна кількість YouTube (з недоступними відео), інакше — скільки завантажили
    const n = col.count != null ? col.count : col.videos.length;
    head.replaceChildren(
      playlistIconEl(col.id, col.title),
      el('span', { className: 'ysf-col-title', textContent: splitEmoji(col.title).name }),
      el('span', { className: 'ysf-col-count', textContent: n == null ? '' : String(n) }),
    );
  }

  function renderColumn(col) {
    if (!col.el) return;
    renderColumnHead(col);
    const body = col.el.querySelector('.ysf-col-body');
    const nodes = col.videos.map((v) => buildCard(col, v));
    if (col.loading && !col.videos.length) nodes.push(el('div', { className: 'ysf-col-note', textContent: L.loading }));
    else if (col.error) {
      const retry = el('button', { className: 'ysf-sp-btn', type: 'button', textContent: L.retry });
      retry.addEventListener('click', () => loadColumn(col));
      nodes.push(el('div', { className: 'ysf-col-note' }, [el('div', { textContent: L.failed }), retry]));
    } else if (!col.videos.length && !col.loading) nodes.push(el('div', { className: 'ysf-col-note', textContent: L.emptyList }));
    else if (col.cont && !col.loading) {
      const more = el('button', { className: 'ysf-sp-btn ysf-col-more', type: 'button', textContent: L.more });
      more.addEventListener('click', () => loadColumn(col, true));
      nodes.push(more);
    }
    body.replaceChildren(...nodes);
  }

  function buildCard(col, v) {
    const url = '/watch?v=' + v.id + '&list=' + col.id;
    const removeBtn = el('button', { className: 'ysf-card-btn', type: 'button', title: L.removeFromList }, [svgIcon(PATH.close)]);
    const saveBtn = el('button', { className: 'ysf-card-btn', type: 'button', title: L.saveTo }, [svgIcon(PATH.playlistAdd)]);
    const card = el('a', { className: 'ysf-card', href: url, draggable: true, title: v.title }, [
      el('span', { className: 'ysf-card-thumb' }, [
        el('img', { src: 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg', alt: '', loading: 'lazy', draggable: false }),
        ...(v.length ? [el('span', { className: 'ysf-card-len', textContent: v.length })] : []),
      ]),
      el('span', { className: 'ysf-card-meta' }, [
        el('span', { className: 'ysf-card-title', textContent: v.title }),
        el('span', { className: 'ysf-card-channel', textContent: v.channel }),
      ]),
      el('span', { className: 'ysf-card-actions' }, [saveBtn, removeBtn]),
    ]);
    card.addEventListener('click', onPlainClick(() => navigateEndpoint({
      commandMetadata: { webCommandMetadata: { url, webPageType: 'WEB_PAGE_TYPE_WATCH' } },
      watchEndpoint: { videoId: v.id, playlistId: col.id },
    }, url)));
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeFromColumn(col.id, v.id);
    });
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSavePanel(v.id, v.title);
    });
    card.addEventListener('dragstart', (e) => {
      board.dragging = { videoId: v.id, from: col.id };
      e.dataTransfer.effectAllowed = 'copyMove';
      e.dataTransfer.setData('text/plain', 'https://www.youtube.com/watch?v=' + v.id);
      requestAnimationFrame(() => card.classList.add('ysf-dragging'));
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('ysf-dragging');
      board.dragging = null;
      board.root?.querySelectorAll('.ysf-drop').forEach((n) => n.classList.remove('ysf-drop', 'ysf-drop-copy'));
    });
    return card;
  }

  async function removeFromColumn(playlistId, videoId) {
    const col = board.columns.get(playlistId);
    if (!col) return;
    const idx = col.videos.findIndex((v) => v.id === videoId);
    if (idx < 0) return;
    const [video] = col.videos.splice(idx, 1);
    if (col.count != null) col.count--;
    renderColumn(col);
    try {
      await api.remove(playlistId, videoId);
      onPlaylistsChanged();
      showToast(L.removedFrom + ' ' + quote(splitEmoji(col.title).name), {
        undo: async () => {
          col.videos.splice(Math.min(idx, col.videos.length), 0, video);
          if (col.count != null) col.count++;
          renderColumn(col);
          try {
            await addAt(col, videoId, idx);
            onPlaylistsChanged();
          } catch (err) {
            console.warn('[YT Subs First] undo failed', err);
            showToast(L.failed);
            loadColumn(col);
          }
        },
      });
    } catch (err) {
      console.warn('[YT Subs First] remove failed', err);
      col.videos.splice(idx, 0, video);
      if (col.count != null) col.count++;
      renderColumn(col);
      showToast(L.failed);
    }
  }

  async function moveVideo(videoId, fromId, toId, copy, index = Infinity) {
    const from = board.columns.get(fromId);
    const to = board.columns.get(toId);
    if (!from || !to) return;
    const video = from.videos.find((v) => v.id === videoId);
    if (!video) return;
    const fromIdx = from.videos.indexOf(video);
    const already = to.videos.some((v) => v.id === videoId);
    const toIdx = Math.max(0, Math.min(index, to.videos.length));
    // оптимістично оновлюємо колонки
    if (!already) { to.videos.splice(toIdx, 0, { ...video, setId: null }); if (to.count != null) to.count++; }
    if (!copy) { from.videos.splice(fromIdx, 1); if (from.count != null) from.count--; }
    renderColumn(to);
    renderColumn(from);
    try {
      if (!already) await addAt(to, videoId, toIdx);
      if (!copy) await api.remove(fromId, videoId);
      onPlaylistsChanged();
      if (already && copy) { showToast(L.alreadyThere); return; }
      const name = splitEmoji(to.title).name;
      showToast((copy ? L.copiedTo : L.movedTo) + ' ' + quote(name), {
        undo: async () => {
          try {
            if (!already) {
              to.videos = to.videos.filter((v) => v.id !== videoId);
              if (to.count != null) to.count--;
              renderColumn(to);
              await api.remove(toId, videoId);
            }
            if (!copy) {
              from.videos.splice(Math.min(fromIdx, from.videos.length), 0, video);
              if (from.count != null) from.count++;
              renderColumn(from);
              await addAt(from, videoId, fromIdx);
            }
            onPlaylistsChanged();
          } catch (err) {
            console.warn('[YT Subs First] undo failed', err);
            showToast(L.failed);
            loadColumn(from);
            loadColumn(to);
          }
        },
      });
    } catch (err) {
      console.warn('[YT Subs First] move failed', err);
      showToast(L.failed);
      // перечитуємо обидві колонки з сервера, щоб показати реальний стан
      loadColumn(from);
      loadColumn(to);
    }
  }

  let navCount = 0;
  on(window, 'yt-navigate-finish', () => { navCount++; });

  function applyBoard() {
    const onPage = location.pathname === PLAYLISTS_URL;
    const browse = onPage && [...document.querySelectorAll('ytd-browse')].find((b) => !b.hidden && b.offsetParent && b.querySelector('ytd-rich-grid-renderer'));
    const active = !!(browse && !prefs.boardOff);
    if (document.documentElement.hasAttribute('ysf-board-on') !== active) document.documentElement.toggleAttribute('ysf-board-on', active);

    let toggle = document.getElementById('ysf-board-toggle');
    if (!active) {
      if (browse && prefs.boardOff && !toggle) {
        toggle = el('button', { id: 'ysf-board-toggle', className: 'ysf-sp-btn', type: 'button', textContent: L.boardView });
        toggle.addEventListener('click', () => { prefs.boardOff = false; savePrefs(); schedule(); });
        browse.prepend(toggle);
      }
      if (!onPage && toggle) toggle.remove();
      return;
    }
    if (toggle) toggle.remove();
    if (!board.root) board.root = buildBoard();
    if (board.root.parentElement !== browse) browse.prepend(board.root);
    // при кожному відкритті сторінки — свіжі дані колонок
    if (board.loadedFor !== String(navCount)) {
      board.loadedFor = String(navCount);
      board.columns.forEach((col) => loadColumn(col));
    }
    syncBoardColumns();
  }
  cleanups.push(() => {
    board.root?.remove();
    document.getElementById('ysf-board-toggle')?.remove();
    document.documentElement.removeAttribute('ysf-board-on');
  });

  // ---------- Нові меню "⋮" (yt-sheet-view-model) у видачі, рекомендаціях, підписках ----------
  // Пункти там без даних у DOM, тож запамʼятовуємо, яке меню відкрили: беремо його вміст
  // з кнопки (button-view-model.data) і знаходимо назву пункту "Зберегти в списку".
  let lastSheetMenu = null; // { videoId, title, saveText, at }
  function saveItemTitleFrom(data) {
    let title = null;
    (function walk(o, depth) {
      if (title || !o || typeof o !== 'object' || depth > 24) return;
      if (o.listItemViewModel) {
        const s = JSON.stringify(o.listItemViewModel);
        if (/"(?:iconName|imageName)":"(?:BOOKMARK_BORDER|PLAYLIST_ADD)"/.test(s) || s.includes('addToPlaylistServiceEndpoint')) {
          title = o.listItemViewModel.title?.content || null;
        }
        return;
      }
      for (const k in o) walk(o[k], depth + 1);
    })(data, 0);
    return title;
  }
  function videoIdFrom(data) {
    const m = JSON.stringify(data).match(/"videoIds?":\[?"([\w-]{11})"/);
    return m ? m[1] : null;
  }
  on(document, 'click', (e) => {
    const bvm = e.target.closest && e.target.closest('button-view-model');
    if (!bvm) return;
    const d = bvm.data;
    if (!d || typeof d !== 'object') return;
    const saveText = saveItemTitleFrom(d);
    if (!saveText) return;
    const host = bvm.closest('yt-lockup-view-model, ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer');
    const link = host && host.querySelector('a[href*="/watch?v="]');
    const videoId = (link && new URL(link.href, location.origin).searchParams.get('v')) || videoIdFrom(d);
    if (!videoId) return;
    const titleEl = host && host.querySelector('.yt-lockup-metadata-view-model__title, h3, #video-title');
    lastSheetMenu = { videoId, title: (titleEl?.textContent || '').trim(), saveText: saveText.trim(), at: Date.now() };
  }, true);
  const isSheetSaveItem = (item) => !!lastSheetMenu && Date.now() - lastSheetMenu.at < 5 * 60 * 1000 &&
    item.textContent.trim() === lastSheetMenu.saveText;
  on(document, 'click', (e) => {
    const item = e.target.closest && e.target.closest('yt-sheet-view-model yt-list-item-view-model');
    if (!item || !isSheetSaveItem(item)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const { videoId, title } = lastSheetMenu;
    const dd = item.closest('tp-yt-iron-dropdown');
    if (dd && typeof dd.close === 'function') dd.close();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    openSavePanel(videoId, title);
  }, true);

  function markMenuItems() {
    if (lastSheetMenu) {
      document.querySelectorAll('yt-sheet-view-model yt-list-view-model > yt-list-item-view-model').forEach((item) => {
        const isSave = isSheetSaveItem(item);
        if (item.hasAttribute('ysf-save-item') !== isSave) item.toggleAttribute('ysf-save-item', isSave);
      });
    }
    document.querySelectorAll('ytd-menu-popup-renderer #items').forEach((box) => {
      box.querySelectorAll(':scope > ytd-menu-navigation-item-renderer, :scope > ytd-menu-service-item-renderer').forEach((item) => {
        const isSave = isSaveMenuItem(item);
        if (item.hasAttribute('ysf-save-item') !== isSave) item.toggleAttribute('ysf-save-item', isSave);
      });
    });
  }

  // ---------- Основна функція ----------
  function apply() {
    // Мітка поточної сторінки для CSS
    const page = location.pathname === SUBS_URL ? 'subscriptions'
      : location.pathname === PLAYLISTS_URL ? 'playlists'
      : location.pathname === '/playlist' ? 'playlist' : 'other';
    if (document.documentElement.dataset.ysfPage !== page) document.documentElement.dataset.ysfPage = page;
    markMenuItems();
    applyBoard();

    document.querySelectorAll('ytd-topbar-logo-renderer a, a#logo').forEach((a) => {
      if (a.getAttribute('href') !== SUBS_URL) a.setAttribute('href', SUBS_URL);
    });

    // Головна → Алгоритмічна
    document.querySelectorAll('ytd-guide-entry-renderer a[href="/"], ytd-mini-guide-entry-renderer a[href="/"]').forEach((a) => {
      if (a.title !== L.algo) a.title = L.algo;
      const t = a.querySelector('.title');
      if (t && t.textContent.trim() !== L.algo) t.textContent = L.algo;
    });

    const guide = document.querySelector('ytd-guide-renderer');
    if (!guide) return;

    // Пункт "Підписки" над "Алгоритмічною"
    const homeEntry = guide.querySelector('ytd-guide-entry-renderer:has(a[href="/"])');
    if (homeEntry) {
      let entry = document.getElementById('ysf-subs-entry');
      if (!entry) entry = buildSubsEntry();
      if (entry.nextElementSibling !== homeEntry) homeEntry.before(entry);
      setActive(entry, location.pathname === SUBS_URL);
    }

    // Підписки: власна секція замість нативної (порядок, приховування)
    const nativeSubs = findNativeSubsSection(guide);
    if (nativeSubs) {
      if (!nativeSubs.hasAttribute('ysf-native-subs')) nativeSubs.setAttribute('ysf-native-subs', '');
      const fresh = readSubscriptions(nativeSubs);
      if (fresh.length) subsItems = fresh;
      let section = document.getElementById('ysf-subs-section');
      if (!section) section = buildSection('subs', subsCfg);
      if (nativeSubs.nextElementSibling !== section) nativeSubs.after(section);
      renderSection(section, 'subs', subsCfg);
      section.querySelector('.ysf-section-link').classList.toggle('ysf-active', location.pathname === CHANNELS_URL);
    }

    // Списки відтворення — перед блоком "Ви" (Історія, Сподобалися), "Ви" — в самому низу
    const youSection = guide.querySelector('ytd-guide-section-renderer:has(a[href="/feed/history"])');
    if (youSection) {
      let section = document.getElementById('ysf-playlists-section');
      if (!section) section = buildSection('playlists', playlistsCfg);
      if (youSection.previousElementSibling !== section) youSection.before(section);
      renderSection(section, 'playlists', playlistsCfg);
      section.querySelector('.ysf-section-link').classList.toggle('ysf-active', location.pathname === PLAYLISTS_URL);
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  }

  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  cleanups.push(() => mo.disconnect());
  on(window, 'yt-navigate-finish', () => {
    schedule();
    const onPlaylistPage = location.pathname === PLAYLISTS_URL || location.pathname === '/playlist';
    fetchPlaylists(onPlaylistPage);
  });
  on(document, 'visibilitychange', () => { if (!document.hidden) fetchPlaylists(); });

  // Плейлист створено / видалено / змінено — оновлюємо одразу і ще раз трохи згодом
  let changeTimers = [];
  const onPlaylistsChanged = () => {
    changeTimers.forEach(clearTimeout);
    changeTimers = [600, 3000].map((ms) => setTimeout(() => fetchPlaylists(true), ms));
  };
  on(window, 'ysf-playlists-changed', onPlaylistsChanged);
  cleanups.push(() => changeTimers.forEach(clearTimeout));
  const CHANGE_RE = /\/youtubei\/v1\/(playlist\/(create|delete)|browse\/edit_playlist|playlist\/save)/;
  try {
    const po = new PerformanceObserver((list) => {
      if (list.getEntries().some((e) => CHANGE_RE.test(e.name))) onPlaylistsChanged();
    });
    po.observe({ type: 'resource', buffered: false });
    cleanups.push(() => po.disconnect());
  } catch (_) {}

  apply();
  fetchPlaylists(true);
})();
