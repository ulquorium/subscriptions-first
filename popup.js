const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;
const lang = chrome.i18n.getMessage('langCode') || 'en'; // та сама мова, якою показані тексти розширення
const pick = (o) => (o && typeof o === 'object' ? o[lang] || o.en || Object.values(o)[0] : o || '');
const current = chrome.runtime.getManifest().version;
const $ = (id) => document.getElementById(id);

function isNewer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

function renderChanges(log, all) {
  const box = $('changes');
  box.replaceChildren();
  const entries = all ? log : log.filter((e) => e.version === current).concat(log.find((e) => e.version === current) ? [] : log.slice(0, 1));
  for (const e of entries) {
    const head = document.createElement('div');
    head.className = 'ver';
    head.textContent = e.version;
    const ul = document.createElement('ul');
    for (const line of e[lang] || e.en || []) {
      const li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    }
    box.append(head, ul);
  }
  $('show-all').hidden = all || log.length <= entries.length;
}

async function renderUpdate() {
  const { remote, checkedAt } = await chrome.storage.local.get(['remote', 'checkedAt']);
  if (remote && isNewer(remote.version, current)) {
    $('update').hidden = false;
    $('update-title').textContent = t('updateAvailableTitle', [remote.version]);
    $('update-notes').textContent = pick(remote.notes) || '';
    $('update-link').textContent = t('download');
    $('update-link').href = remote.url || '#';
  } else {
    $('update').hidden = true;
  }
  $('check-status').textContent = checkedAt
    ? t('lastChecked', [new Date(checkedAt).toLocaleString(chrome.i18n.getUILanguage())])
    : t('checkDisabledOrPending');
}

(async () => {
  $('name').textContent = t('extName');
  $('version').textContent = t('versionLabel', [current]);
  $('whats-new-title').textContent = t('whatsNew');
  $('show-all').textContent = t('showAllChanges');
  $('check-now').textContent = t('checkNow');

  const log = await (await fetch(chrome.runtime.getURL('changelog.json'))).json();
  renderChanges(log, false);
  $('show-all').addEventListener('click', () => renderChanges(log, true));

  await renderUpdate();
  $('check-now').addEventListener('click', async () => {
    $('check-status').textContent = t('checking');
    await chrome.runtime.sendMessage('ysf-check-now');
    renderUpdate();
  });

  // Відкрили вікно — "NEW" на іконці більше не потрібен
  await chrome.storage.local.set({ seenVersion: current });
  chrome.runtime.sendMessage('ysf-refresh-badge');
})();
