/**
 * Offline-first localStorage persistence layer:
 * - Connection config (Apps Script URL, PIN, demoMode)
 * - Cached bootstrap snapshot (so app opens instantly offline in the gym)
 * - Active workout drafts per day (auto-saved on every tap/keystroke)
 * - Pending offline sync queue (retried automatically when signal returns)
 */

const KEYS = {
  CONFIG: 'ht_config_v1',
  BOOTSTRAP: 'ht_bootstrap_v1',
  DRAFTS: 'ht_drafts_v1',
  QUEUE: 'ht_pending_queue_v1',
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getConfig() {
  return readJson(KEYS.CONFIG, { apiUrl: '', pin: '', demoMode: false });
}

export function saveConfig(cfg) {
  writeJson(KEYS.CONFIG, {
    apiUrl: String(cfg.apiUrl || '').trim(),
    pin: String(cfg.pin || '').trim(),
    demoMode: Boolean(cfg.demoMode),
  });
}

export function getCachedBootstrap() {
  return readJson(KEYS.BOOTSTRAP, null);
}

export function saveCachedBootstrap(data) {
  writeJson(KEYS.BOOTSTRAP, data);
}

export function getDraft(day) {
  const all = readJson(KEYS.DRAFTS, {});
  return all[day] || null;
}

export function saveDraft(day, draft) {
  const all = readJson(KEYS.DRAFTS, {});
  all[day] = { ...draft, updatedAt: Date.now() };
  writeJson(KEYS.DRAFTS, all);
}

export function clearDraft(day) {
  const all = readJson(KEYS.DRAFTS, {});
  delete all[day];
  writeJson(KEYS.DRAFTS, all);
}

export function getPendingQueue() {
  return readJson(KEYS.QUEUE, []);
}

export function enqueueSession(sessionPayload) {
  const queue = getPendingQueue();
  // Replace if same (dateIso, day) is already queued
  const filtered = queue.filter(
    (item) => !(item.dateIso === sessionPayload.dateIso && item.day === sessionPayload.day)
  );
  filtered.push({ ...sessionPayload, queuedAt: Date.now() });
  writeJson(KEYS.QUEUE, filtered);
  return filtered;
}

export function removeQueuedSession(dateIso, day) {
  const filtered = getPendingQueue().filter(
    (item) => !(item.dateIso === dateIso && item.day === day)
  );
  writeJson(KEYS.QUEUE, filtered);
  return filtered;
}

export function clearAllCache() {
  localStorage.removeItem(KEYS.BOOTSTRAP);
  localStorage.removeItem(KEYS.DRAFTS);
}
