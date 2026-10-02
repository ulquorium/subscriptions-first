// Виконується на самому початку завантаження сторінки (MAIN world).

// 1) При відкритті youtube.com (повне завантаження) — одразу на підписки.
//    Перехід на "Алгоритмічну" всередині сайту працює як звичайно.
if (location.pathname === '/' && !location.search.includes('algo')) {
  location.replace('/feed/subscriptions');
}

// 2) Слідкуємо за запитами YouTube, що змінюють плейлисти
//    (створення, видалення, додавання/видалення відео, перейменування),
//    і повідомляємо content.js, щоб він одразу оновив сайдбар.
(() => {
  const WATCH = /\/youtubei\/v1\/(playlist\/(create|delete)|browse\/edit_playlist|playlist\/save)/;
  const notify = () => window.dispatchEvent(new Event('ysf-playlists-changed'));

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const p = origFetch.apply(this, arguments);
    if (WATCH.test(url)) p.then((r) => { if (r.ok) notify(); }).catch(() => {});
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (WATCH.test(String(url))) {
      this.addEventListener('load', () => { if (this.status >= 200 && this.status < 300) notify(); });
    }
    return origOpen.apply(this, arguments);
  };
})();
