/**
 * Main PWA entry point — orchestrates offline-first state, 2 tabs (Entrenar | Semana),
 * localStorage draft auto-save, offline sync queue, and Apps Script communication.
 */

import { ApiError, applyDemoSessionSave, fetchBootstrap, postSession } from './api.js';
import { createDemoBootstrap } from './demo-data.js';
import {
  CANONICAL_DAYS,
  DAY_META,
  buildInitialDayDraft,
  formatKgLocale,
  parsePositiveInt,
  pickDefaultDay,
  summarizeDraft,
} from './domain.js';
import {
  clearDraft,
  enqueueSession,
  getCachedBootstrap,
  getConfig,
  getDraft,
  getPendingQueue,
  removeQueuedSession,
  saveCachedBootstrap,
  saveConfig,
  saveDraft,
} from './storage.js';
import { createModalController } from './ui/setup-modal.js';
import { patchSetRowVisuals, renderTrainView } from './ui/train-view.js';
import { renderWeekView } from './ui/week-view.js';

const el = {
  connDot: document.getElementById('conn-dot'),
  headerTitle: document.getElementById('header-title'),
  demoPill: document.getElementById('demo-pill'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnSettings: document.getElementById('btn-settings'),
  syncBanner: document.getElementById('sync-banner'),
  syncBannerText: document.getElementById('sync-banner-text'),
  btnFlushQueue: document.getElementById('btn-flush-queue'),
  daySelector: document.getElementById('day-selector'),
  mainContent: document.getElementById('main-content'),
  viewTrain: document.getElementById('view-train'),
  viewWeek: document.getElementById('view-week'),
  trainFooter: document.getElementById('train-footer'),
  summarySets: document.getElementById('summary-sets'),
  summaryTonnage: document.getElementById('summary-tonnage'),
  btnFinish: document.getElementById('btn-finish-session'),
  tabTrain: document.getElementById('tab-train'),
  tabWeek: document.getElementById('tab-week'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalCard: document.getElementById('modal-card'),
  toast: document.getElementById('toast'),
};

const modal = createModalController(el.modalBackdrop, el.modalCard);

const state = {
  config: getConfig(),
  bootstrap: null,
  activeTab: 'train',
  activeDay: 'LUNES',
  draft: null,
  openPrevDrawers: new Set(),
  openNoteInputs: new Set(),
  toastTimer: null,
};

function showToast(msg, variant = '') {
  clearTimeout(state.toastTimer);
  el.toast.textContent = msg;
  el.toast.className = `toast ${variant}`.trim();
  state.toastTimer = setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 3000);
}

function updateConnectionIndicator() {
  const isDemo = Boolean(state.config.demoMode);
  const isOnline = navigator.onLine;
  el.demoPill.classList.toggle('hidden', !isDemo);
  el.connDot.className = 'brand-dot';
  if (isDemo) {
    el.connDot.classList.add('demo');
  } else if (!isOnline) {
    el.connDot.classList.add('offline');
  }
  renderSyncBanner();
}

function renderSyncBanner() {
  const queue = getPendingQueue();
  if (queue.length > 0) {
    el.syncBanner.classList.remove('hidden');
    el.syncBannerText.textContent = `${queue.length} ${queue.length === 1 ? 'sesión pendiente' : 'sesiones pendientes'} de subir al Sheet`;
    el.btnFlushQueue.classList.remove('hidden');
  } else if (!navigator.onLine && !state.config.demoMode) {
    el.syncBanner.classList.remove('hidden');
    el.syncBannerText.textContent = 'Sin conexión — tus series se guardan en el iPhone';
    el.btnFlushQueue.classList.add('hidden');
  } else {
    el.syncBanner.classList.add('hidden');
  }
}

function loadOrCreateDraft(day) {
  const saved = getDraft(day);
  if (saved && Array.isArray(saved.exercises) && saved.exercises.length > 0) {
    return saved;
  }
  return buildInitialDayDraft(day, state.bootstrap);
}

function renderDayPills() {
  const logged = (state.bootstrap && state.bootstrap.loggedThisWeek) || {};
  el.daySelector.innerHTML = CANONICAL_DAYS.map((day) => {
    const isActive = day === state.activeDay;
    const isDone = Boolean(logged[day]);
    return `
      <button type="button" class="day-pill ${isActive ? 'active' : ''}" data-day="${day}">
        <span>${DAY_META[day].short}</span>
        ${isDone ? '<span class="day-pill-dot" aria-label="Completado esta semana"></span>' : ''}
      </button>
    `;
  }).join('');
}

function updateTrainFooter() {
  if (!state.draft || !state.bootstrap) return;
  const summary = summarizeDraft(state.draft, state.bootstrap.dictionary);
  el.summarySets.textContent = `${summary.completedSets} / ${summary.totalPlannedSets} series`;
  el.summaryTonnage.textContent = `${formatKgLocale(summary.totalTonnage)} kg`;
  el.btnFinish.disabled = summary.completedSets === 0;
}

function renderCurrentView() {
  if (!state.bootstrap) return;

  const isTrain = state.activeTab === 'train';
  el.headerTitle.textContent = isTrain ? 'Entrenar' : 'Semana';
  el.daySelector.classList.toggle('hidden', !isTrain);
  el.trainFooter.classList.toggle('hidden', !isTrain);
  el.viewTrain.classList.toggle('hidden', !isTrain);
  el.viewWeek.classList.toggle('hidden', isTrain);
  el.mainContent.classList.toggle('week-mode', !isTrain);
  el.tabTrain.classList.toggle('active', isTrain);
  el.tabWeek.classList.toggle('active', !isTrain);

  if (isTrain) {
    renderDayPills();
    renderTrainView(el.viewTrain, state, {
      onTogglePrev: (exName) => {
        if (state.openPrevDrawers.has(exName)) {
          state.openPrevDrawers.delete(exName);
        } else {
          state.openPrevDrawers.add(exName);
        }
        renderCurrentView();
      },
      onToggleNote: (exName) => {
        if (state.openNoteInputs.has(exName)) {
          state.openNoteInputs.delete(exName);
        } else {
          state.openNoteInputs.add(exName);
        }
        renderCurrentView();
      },
      onAddSet: (exIdx) => {
        const ex = state.draft.exercises[exIdx];
        if (!ex) return;
        const last = ex.sets[ex.sets.length - 1];
        ex.sets.push({
          setNumber: ex.sets.length + 1,
          weightKg: last ? last.weightKg : 0,
          reps: '',
          overloadDelta: 0,
          prevWeightKg: null,
          prevReps: null,
        });
        saveDraft(state.activeDay, state.draft);
        renderCurrentView();
      },
      onStepReps: (exIdx, setIdx, delta) => {
        const ex = state.draft.exercises[exIdx];
        const s = ex && ex.sets[setIdx];
        if (!s) return;
        const meta = state.bootstrap.dictionary[ex.exercise];
        const current = parsePositiveInt(s.reps);
        let nextVal;
        if (current === null) {
          if (delta > 0) {
            nextVal = s.prevReps || (meta && meta.repMin) || 1;
          } else {
            return;
          }
        } else {
          const candidate = current + delta;
          nextVal = candidate <= 0 ? '' : candidate;
        }
        s.reps = nextVal;
        saveDraft(state.activeDay, state.draft);
        patchSetRowVisuals(el.viewTrain, exIdx, setIdx, ex, meta);
        updateTrainFooter();
      },
      onEditWeight: (exIdx, setIdx, rawVal) => {
        const ex = state.draft.exercises[exIdx];
        const s = ex && ex.sets[setIdx];
        if (!s) return;
        s.weightKg = rawVal;
        saveDraft(state.activeDay, state.draft);
        patchSetRowVisuals(el.viewTrain, exIdx, setIdx, ex, state.bootstrap.dictionary[ex.exercise]);
        updateTrainFooter();
      },
      onEditReps: (exIdx, setIdx, rawVal) => {
        const ex = state.draft.exercises[exIdx];
        const s = ex && ex.sets[setIdx];
        if (!s) return;
        s.reps = rawVal.replace(/[^\d]/g, '');
        saveDraft(state.activeDay, state.draft);
        patchSetRowVisuals(el.viewTrain, exIdx, setIdx, ex, state.bootstrap.dictionary[ex.exercise]);
        updateTrainFooter();
      },
      onEditObs: (exIdx, rawVal) => {
        const ex = state.draft.exercises[exIdx];
        if (!ex) return;
        ex.obs = rawVal;
        saveDraft(state.activeDay, state.draft);
      },
    });
    updateTrainFooter();
  } else {
    renderWeekView(el.viewWeek, state.bootstrap, (day) => {
      selectDay(day);
      state.activeTab = 'train';
      renderCurrentView();
    });
  }
}

function selectDay(day) {
  state.activeDay = day;
  state.openPrevDrawers.clear();
  state.openNoteInputs.clear();
  state.draft = loadOrCreateDraft(day);
  renderCurrentView();
}

async function refreshFromBackend(silent = false) {
  if (state.config.demoMode) {
    if (!silent) showToast('Modo Demo activo', '');
    return;
  }
  if (!state.config.apiUrl || !state.config.pin) return;

  el.btnRefresh.classList.add('spinning');
  try {
    const fresh = await fetchBootstrap(state.config);
    state.bootstrap = fresh;
    saveCachedBootstrap(fresh);
    state.draft = loadOrCreateDraft(state.activeDay);
    renderCurrentView();
    if (!silent) showToast('Sincronizado con Google Sheets', 'success');
  } catch (err) {
    if (!silent) showToast(err.message || 'Sin conexión al Sheet', 'warn');
  } finally {
    el.btnRefresh.classList.remove('spinning');
    updateConnectionIndicator();
  }
}

async function flushPendingQueue(silent = false) {
  const queue = getPendingQueue();
  if (queue.length === 0 || state.config.demoMode || !navigator.onLine) return;

  let synced = 0;
  for (const item of queue) {
    try {
      const res = await postSession(state.config, item);
      removeQueuedSession(item.dateIso, item.day);
      if (res.data) {
        state.bootstrap = res.data;
        saveCachedBootstrap(res.data);
      }
      synced += 1;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_SESSION') {
        removeQueuedSession(item.dateIso, item.day);
      }
      break;
    }
  }
  renderSyncBanner();
  if (synced > 0) {
    state.draft = loadOrCreateDraft(state.activeDay);
    renderCurrentView();
    if (!silent) showToast(`${synced} sesión(es) sincronizadas`, 'success');
  }
}

function activateDemoMode() {
  state.config = { ...state.config, demoMode: true };
  saveConfig(state.config);
  const existingDemo = getCachedBootstrap();
  state.bootstrap = existingDemo || createDemoBootstrap();
  saveCachedBootstrap(state.bootstrap);
  state.activeDay = pickDefaultDay(state.bootstrap.serverDateIso, state.bootstrap.loggedThisWeek);
  state.draft = loadOrCreateDraft(state.activeDay);
  updateConnectionIndicator();
  renderCurrentView();
  showToast('Modo Demo listo con tus datos reales', 'success');
}

function openSettingsModal(canCancel = true) {
  modal.openSetup({
    config: state.config,
    canCancel,
    onConnect: async (newCfg) => {
      const data = await fetchBootstrap(newCfg);
      state.config = newCfg;
      saveConfig(newCfg);
      state.bootstrap = data;
      saveCachedBootstrap(data);
      state.activeDay = pickDefaultDay(data.serverDateIso, data.loggedThisWeek);
      state.draft = loadOrCreateDraft(state.activeDay);
      updateConnectionIndicator();
      renderCurrentView();
      showToast('Conectado a Tracker Gym', 'success');
    },
    onUseDemo: activateDemoMode,
    onResetDayDraft: () => {
      clearDraft(state.activeDay);
      state.draft = buildInitialDayDraft(state.activeDay, state.bootstrap);
      renderCurrentView();
      showToast(`Borrador de ${DAY_META[state.activeDay].label} reiniciado`);
    },
  });
}

function bindGlobalEvents() {
  el.daySelector.addEventListener('click', (e) => {
    const pill = e.target.closest('button[data-day]');
    if (pill && pill.dataset.day !== state.activeDay) {
      selectDay(pill.dataset.day);
    }
  });

  el.tabTrain.addEventListener('click', () => {
    state.activeTab = 'train';
    renderCurrentView();
  });

  el.tabWeek.addEventListener('click', () => {
    state.activeTab = 'week';
    renderCurrentView();
  });

  el.btnRefresh.addEventListener('click', async () => {
    await flushPendingQueue(true);
    await refreshFromBackend(false);
  });

  el.btnSettings.addEventListener('click', () => openSettingsModal(true));
  el.btnFlushQueue.addEventListener('click', () => flushPendingQueue(false));

  el.btnFinish.addEventListener('click', () => {
    const summary = summarizeDraft(state.draft, state.bootstrap.dictionary);
    if (summary.completedSets === 0) return;

    const todayIso = state.bootstrap.serverDateIso || new Date().toISOString().slice(0, 10);
    modal.openConfirmSave({
      day: state.activeDay,
      dateIso: todayIso,
      summary,
      isDemo: Boolean(state.config.demoMode),
      onConfirm: async (chosenDate, replaceExisting) => {
        const payload = {
          day: state.activeDay,
          dateIso: chosenDate,
          replaceExisting,
          sets: summary.flatSets,
        };

        if (state.config.demoMode) {
          const res = applyDemoSessionSave(state.bootstrap, payload);
          state.bootstrap = res.data;
          saveCachedBootstrap(res.data);
          clearDraft(state.activeDay);
          state.draft = buildInitialDayDraft(state.activeDay, state.bootstrap);
          renderCurrentView();
          showToast(`Guardado (Demo): ${res.insertedCount} series`, 'success');
          return;
        }

        try {
          const res = await postSession(state.config, payload);
          if (res.data) {
            state.bootstrap = res.data;
            saveCachedBootstrap(res.data);
          }
          clearDraft(state.activeDay);
          state.draft = buildInitialDayDraft(state.activeDay, state.bootstrap);
          renderCurrentView();
          showToast(`Guardado en Sheets: ${res.insertedCount} series`, 'success');
        } catch (err) {
          if (err instanceof ApiError && err.code === 'DUPLICATE_SESSION') {
            throw err; // Handled by modal to offer replacement
          }
          if (!navigator.onLine || !(err instanceof ApiError)) {
            // Network/offline failure -> queue cleanly so zero sets are lost
            enqueueSession(payload);
            clearDraft(state.activeDay);
            state.draft = buildInitialDayDraft(state.activeDay, state.bootstrap);
            renderSyncBanner();
            renderCurrentView();
            showToast('Sin señal: sesión guardada en cola offline', 'warn');
            return;
          }
          throw err;
        }
      },
    });
  });

  window.addEventListener('online', () => {
    updateConnectionIndicator();
    flushPendingQueue(false);
  });
  window.addEventListener('offline', updateConnectionIndicator);
}

async function init() {
  bindGlobalEvents();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Allow one-tap demo bootstrap via ?demo=1 query string
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    activateDemoMode();
    return;
  }

  const cached = getCachedBootstrap();
  if (state.config.demoMode) {
    state.bootstrap = cached || createDemoBootstrap();
    state.activeDay = pickDefaultDay(state.bootstrap.serverDateIso, state.bootstrap.loggedThisWeek);
    state.draft = loadOrCreateDraft(state.activeDay);
    updateConnectionIndicator();
    renderCurrentView();
    return;
  }

  if (state.config.apiUrl && state.config.pin) {
    if (cached) {
      state.bootstrap = cached;
      state.activeDay = pickDefaultDay(cached.serverDateIso, cached.loggedThisWeek);
      state.draft = loadOrCreateDraft(state.activeDay);
      updateConnectionIndicator();
      renderCurrentView();
      await flushPendingQueue(true);
      await refreshFromBackend(true);
    } else {
      try {
        const data = await fetchBootstrap(state.config);
        state.bootstrap = data;
        saveCachedBootstrap(data);
        state.activeDay = pickDefaultDay(data.serverDateIso, data.loggedThisWeek);
        state.draft = loadOrCreateDraft(state.activeDay);
        updateConnectionIndicator();
        renderCurrentView();
      } catch {
        openSettingsModal(false);
      }
    }
    return;
  }

  // First launch with no config -> open setup modal (with Demo mode option)
  state.bootstrap = createDemoBootstrap();
  state.activeDay = pickDefaultDay(state.bootstrap.serverDateIso, state.bootstrap.loggedThisWeek);
  state.draft = loadOrCreateDraft(state.activeDay);
  updateConnectionIndicator();
  renderCurrentView();
  openSettingsModal(false);
}

init();
