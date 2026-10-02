# YouTube: Subscriptions First

A Chrome extension that turns youtube.com into a subscriptions-first site: your
channels and your own playlists instead of the algorithmic feed, no Shorts, and much
better tools for organizing videos into lists.

*Українською: [README.uk.md](README.uk.md).*

## Why

YouTube's home page is built to keep you watching whatever the algorithm picks. If you
mostly watch channels you subscribed to and keep your own playlists, the useful parts are
buried: Subscriptions is one click away, Shorts are everywhere, the sidebar is cluttered,
and the "Save to…" dialog is tiny and shows a few lists at a time. This extension
rearranges the site around what you chose to follow — without any account, server or
tracking.

## Features

- **Home = Subscriptions.** The logo and `youtube.com/` open your subscriptions feed.
  The original home stays available as "Algorithmic".
- **No Shorts** — removed from the sidebar, the home page and the subscriptions feed.
- **Clean sidebar** with your own **Subscriptions** and **Lists** sections: drag to reorder,
  hide with the eye icon, video counts, emoji at the start of a playlist name becomes its icon.
  Clutter ("More from YouTube", "Report history", the footer, etc.) is removed.
- **A better "Save to…" dialog:** tall, searchable, add to several lists in a row without it
  closing, create a new list. Opens from the ⋮ menu of any video and from the Save button.
- **Playlist board** on `/feed/playlists`: every list is a column; drag videos between lists
  (Alt = copy) or within a list to reorder; remove with ×, with a 5-second Undo.
- **Languages:** English, Ukrainian, Russian — follows YouTube's language (the extension popup follows Chrome's).

## Install

The extension is not in the Chrome Web Store; it is installed from a GitHub release.

1. Open the [latest release](https://github.com/ulquorium/youtube-subs-first/releases/latest) and download
   `youtube-subs-first-X.Y.Z.zip` under **Assets**.
2. Unzip it into a folder you will keep, e.g. `~/Extensions/youtube-subs-first`.
3. Open `chrome://extensions` and turn on **Developer mode** (top right).
4. Click **Load unpacked** and select that folder.
5. Reload youtube.com.

Works in Chrome and other Chromium browsers (Edge, Brave, Arc, Opera).

## Updates

Every 6 hours the extension checks whether a new version is out. If so, you get a **↑**
badge on its icon and a system notification; clicking it opens the release page.

To update: download the new zip, unzip it **over the same folder** (replace the files),
then click ↻ on the extension card in `chrome://extensions`. Keeping the same folder is simplest
(don't remove the extension to update — use ↻).

After an update the icon shows **NEW** until you open the popup, which shows the version,
what's new, the full changelog and a **Check now** button.

## Your data across computers

Sidebar order and hidden items are saved to your Chrome account (`chrome.storage.sync`) and appear automatically on
every computer where you are signed in to Chrome with sync on — Settings → You and Google →
Sync → make sure **Extensions** is included. They also survive turning the extension off and on,
updates, and moving its folder (the extension has a fixed ID).

On a new computer, install the extension and give Chrome a minute to bring your sidebar settings before
changing anything. If Chrome sync is off, everything still works, just on this computer only.

## Privacy

- No data is collected or sent anywhere. No analytics, no accounts, no servers of our own.
  (Chrome's own sync carries your settings between your computers, if you have it on.)
- Requests go only to youtube.com (on your behalf, to read and change *your* playlists when
  you ask) and to GitHub to read a small `version.json` file with the latest version number.
- Sidebar order and hidden items are stored in your browser and, if Chrome sync is on, in your Chrome account.
- No remote code: the extension only runs the files you installed.

## Permissions

| Permission | Why |
|---|---|
| Access to `www.youtube.com` | The extension works on YouTube pages. |
| `storage` | Syncs sidebar settings through your Chrome account; remembers the update-check state. |
| `alarms` | Schedules the update check every 6 hours. |
| `notifications` | Tells you a new version is out. |

## For developers

Plain JavaScript and CSS, Manifest V3, no build step. Architecture and rules: [`CLAUDE.md`](CLAUDE.md),
roadmap: [`docs/TASKS.md`](docs/TASKS.md).
Release process (changelog → `node scripts/release.mjs X.Y.Z` → `git push --follow-tags`):
[README.uk.md](README.uk.md#випуск-нової-версії-для-автора).

## License

[MIT](LICENSE)
