// Фоновий скрипт: "що нового" після оновлення + перевірка нових версій.
//
// UPDATE_URL — адреса файлу version.json, який ти викладаєш разом із релізом
// (наприклад, у GitHub-репозиторії). Поки порожньо — перевірка вимкнена.
// Формат: { version, url, notes: { uk, en, ru } } — див. version.json у корені репо.
// Розширення НЕ завантажує й не виконує код звідти — лише читає номер версії,
// посилання і короткий текст.
const UPDATE_URL = '';
const CHECK_EVERY_MIN = 6 * 60;

const currentVersion = () => chrome.runtime.getManifest().version;

function isNewer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

// З version.json приймаємо лише прості дані: номер версії, https-посилання, текст.
function parseRemote(j) {
  if (!j || typeof j.version !== 'string' || !/^\d+(\.\d+){0,3}$/.test(j.version)) return null;
  if (typeof j.url !== 'string' || !/^https:\/\//.test(j.url)) return null;
  const notes = {};
  if (j.notes && typeof j.notes === 'object') {
    for (const [k, v] of Object.entries(j.notes)) if (typeof v === 'string') notes[k] = v.slice(0, 2000);
  }
  return { version: j.version, url: j.url, notes };
}

async function refreshBadge() {
  const { remote, seenVersion } = await chrome.storage.local.get(['remote', 'seenVersion']);
  if (UPDATE_URL && remote && isNewer(remote.version, currentVersion())) {
    await chrome.action.setBadgeText({ text: '↑' });
    await chrome.action.setBadgeBackgroundColor({ color: '#2ba640' });
  } else if (seenVersion !== currentVersion()) {
    await chrome.action.setBadgeText({ text: 'NEW' });
    await chrome.action.setBadgeBackgroundColor({ color: '#065fd4' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

function pickLang(obj) {
  if (!obj || typeof obj !== 'object') return obj || '';
  const ui = chrome.i18n.getMessage('langCode') || 'en';
  return obj[ui] || obj.en || Object.values(obj)[0] || '';
}

async function checkForUpdate() {
  if (!UPDATE_URL) return;
  try {
    const r = await fetch(UPDATE_URL + (UPDATE_URL.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const info = parseRemote(await r.json());
    if (!info) return;
    await chrome.storage.local.set({ remote: info, checkedAt: Date.now() });
    if (isNewer(info.version, currentVersion())) {
      const { notifiedVersion } = await chrome.storage.local.get('notifiedVersion');
      if (notifiedVersion !== info.version) {
        chrome.notifications.create('ysf-update', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: chrome.i18n.getMessage('updateAvailableTitle', [info.version]),
          message: pickLang(info.notes) || chrome.i18n.getMessage('updateAvailableBody'),
          priority: 1,
        });
        await chrome.storage.local.set({ notifiedVersion: info.version });
      }
    }
  } catch (_) {
    // мережа недоступна — спробуємо наступного разу
  } finally {
    refreshBadge();
  }
}

function scheduleChecks() {
  chrome.alarms.create('ysf-update-check', { delayInMinutes: 1, periodInMinutes: CHECK_EVERY_MIN });
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') await chrome.storage.local.set({ seenVersion: currentVersion() });
  scheduleChecks();
  checkForUpdate();
  refreshBadge();
});
chrome.runtime.onStartup.addListener(() => {
  scheduleChecks();
  refreshBadge();
});
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'ysf-update-check') checkForUpdate();
});
chrome.notifications.onClicked.addListener(async (id) => {
  if (id !== 'ysf-update') return;
  const { remote } = await chrome.storage.local.get('remote');
  if (remote?.url) chrome.tabs.create({ url: remote.url });
  chrome.notifications.clear(id);
});
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg === 'ysf-check-now') {
    checkForUpdate().then(() => reply(true));
    return true;
  }
  if (msg === 'ysf-refresh-badge') {
    refreshBadge().then(() => reply(true));
    return true;
  }
  return false;
});
