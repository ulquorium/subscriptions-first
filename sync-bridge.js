// Міст для синхронізації налаштувань сайдбару між комп'ютерами.
// content.js працює в MAIN world і тримає prefs у localStorage youtube.com,
// де немає chrome.*. Цей скрипт (ISOLATED world, той самий localStorage)
// дзеркалить їх у chrome.storage.sync через sync-store.js:
//   - при відкритті сторінки синхронізована копія перемагає; якщо її ще нема — вивантажуємо локальну;
//   - content.js після збереження шле postMessage { ysf: 'prefs-saved' } → пишемо в sync;
//   - зміни з іншого комп'ютера/вкладки → localStorage + postMessage { ysf: 'prefs-updated' }.
(() => {
  const KEY = 'ysf-prefs-v1';
  const local = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const notify = () => window.postMessage({ ysf: 'prefs-updated' }, location.origin);
  const put = (v) => {
    const json = JSON.stringify(v);
    if (local() === json) return false;
    try { localStorage.setItem(KEY, json); } catch (e) { return false; }
    return true;
  };
  const isPrefs = (v) => v && typeof v === 'object' && !Array.isArray(v);

  syncStore.read('prefs').then((v) => {
    if (isPrefs(v)) { if (put(v)) notify(); return; }
    try {
      const mine = JSON.parse(local() || 'null');
      if (isPrefs(mine)) syncStore.write('prefs', mine);
    } catch (e) { /* зіпсований JSON — нічого не вивантажуємо */ }
  });

  // Інша вкладка могла вже записати те саме в localStorage — все одно просимо content.js перечитати.
  syncStore.onChange('prefs', (v) => { if (isPrefs(v)) { put(v); notify(); } });

  let timer = null;
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.ysf !== 'prefs-saved') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const v = JSON.parse(local() || 'null');
        if (isPrefs(v)) syncStore.write('prefs', v);
      } catch (e) { /* ignore */ }
    }, 1500);
  });
})();
