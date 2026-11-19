/**
 * Renders the "Entrenar" tab:
 * - Day focus + already-logged indicator
 * - Reference card ("REFERENCIA SEMANA ANTERIOR")
 * - Exercise cards with collapsible previous session drawer ("Ant. ▾")
 * - Per-set weight input (with overload ↑ badge), +/- & numeric reps, + Serie, folded Obs
 *
 * Updates row state & footer summary in-place on typing so iOS keyboard never loses focus.
 */

import {
  DAY_META,
  buildReferenceBanner,
  computeTonnage,
  formatKgLocale,
  formatShortDate,
  formatWeight,
  parseDecimal,
  parsePositiveInt,
} from '../domain.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTrainView(container, state, callbacks) {
  const { activeDay, bootstrap, draft, openPrevDrawers, openNoteInputs } = state;
  const dict = (bootstrap && bootstrap.dictionary) || {};
  const lastSession = (bootstrap && bootstrap.lastSessionsByDay && bootstrap.lastSessionsByDay[activeDay]) || null;
  const loggedInfo = (bootstrap && bootstrap.loggedThisWeek && bootstrap.loggedThisWeek[activeDay]) || null;
  const dayMeta = DAY_META[activeDay];
  const refBanner = buildReferenceBanner(activeDay, bootstrap);

  let html = '';

  // Day metadata header
  html += `
    <div class="day-meta-bar">
      <span class="day-focus">${escapeHtml(dayMeta.label)} · ${escapeHtml(dayMeta.focus)}</span>
      ${loggedInfo ? `<span class="logged-badge">✓ Guardado (${formatShortDate(loggedInfo.dateIso)})</span>` : ''}
    </div>
  `;

  // Reference card (2 key exercises)
  if (refBanner) {
    html += `
      <div class="ref-card">
        <div class="ref-card-header">
          <span class="ref-card-title">Referencia semana anterior</span>
          ${refBanner.dateIso ? `<span class="ref-card-date">${formatShortDate(refBanner.dateIso)}</span>` : ''}
        </div>
        <div class="ref-list">
          ${refBanner.items
            .map(
              (item) => `
            <div class="ref-item">
              <span class="ref-ex-name">${escapeHtml(item.exercise)}</span>
              <span class="ref-ex-marks">${escapeHtml(item.marks)}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  // Exercise cards
  html += '<div class="exercise-list">';
  (draft.exercises || []).forEach((ex, exIdx) => {
    const meta = dict[ex.exercise] || {
      name: ex.exercise,
      muscleGroup: '',
      isUnilateral: false,
      multiplier: 1,
      repMin: null,
      repMax: null,
      incrementKg: 5,
    };
    const prevSets = (lastSession && lastSession.exercises && lastSession.exercises[ex.exercise]) || [];
    const hasPrev = prevSets.length > 0;
    const isPrevOpen = openPrevDrawers.has(ex.exercise);
    const isNoteOpen = openNoteInputs.has(ex.exercise) || Boolean(ex.obs && ex.obs.trim());

    const completedCount = ex.sets.filter((s) => parsePositiveInt(s.reps) !== null).length;
    const allDone = ex.sets.length > 0 && completedCount === ex.sets.length;
    const exTonnage = ex.sets.reduce((acc, s) => {
      const w = parseDecimal(s.weightKg);
      const r = parsePositiveInt(s.reps);
      return acc + (w && r ? computeTonnage(w, r, meta.multiplier) : 0);
    }, 0);

    const rangeLabel =
      meta.repMin && meta.repMax
        ? `${meta.repMin}–${meta.repMax} reps`
        : meta.repMax
          ? `≤ ${meta.repMax} reps`
          : 'Sin rango';

    html += `
      <article class="exercise-card ${allDone ? 'all-done' : ''}" data-ex-idx="${exIdx}">
        <div class="ex-header">
          <div class="ex-title-wrap">
            <h2 class="ex-name">${escapeHtml(ex.exercise)}</h2>
            <div class="ex-tags">
              <span class="tag">${escapeHtml(rangeLabel)}</span>
              ${meta.isUnilateral ? '<span class="tag tag-unil">Unil. ×2</span>' : ''}
            </div>
          </div>
          <button
            type="button"
            class="prev-toggle-btn ${isPrevOpen ? 'open' : ''}"
            data-action="toggle-prev"
            data-ex-name="${escapeHtml(ex.exercise)}"
            ${hasPrev ? '' : 'disabled'}
          >
            ${hasPrev ? `Ant. ${isPrevOpen ? '▴' : '▾'}` : 'Sin ant.'}
          </button>
        </div>

        ${
          hasPrev && isPrevOpen
            ? `
          <div class="prev-drawer">
            <div class="prev-drawer-head">
              <span>Última sesión (${escapeHtml(dayMeta.label)})</span>
              <span>${formatShortDate(lastSession.dateIso)}</span>
            </div>
            <div class="prev-sets-grid">
              ${prevSets
                .map(
                  (ps) => `
                <div class="prev-set-line">
                  <span>S${ps.setNumber}: <strong>${formatWeight(ps.weightKg)} kg × ${ps.reps}</strong>${ps.obs ? ` · ${escapeHtml(ps.obs)}` : ''}</span>
                  <span class="prev-set-1rm">1RM ${formatKgLocale(ps.est1rm)}</span>
                </div>`
                )
                .join('')}
            </div>
          </div>`
            : ''
        }

        <div class="sets-table-head">
          <span>#</span>
          <span>Peso</span>
          <span>Reps</span>
        </div>

        <div class="sets-list">
          ${ex.sets
            .map((s, setIdx) => {
              const parsedReps = parsePositiveInt(s.reps);
              const isCompleted = parsedReps !== null;
              const hitTarget = isCompleted && meta.repMax !== null && parsedReps >= meta.repMax;
              const placeholder = s.prevReps ? String(s.prevReps) : '—';
              return `
              <div class="set-row ${isCompleted ? 'completed' : ''} ${hitTarget ? 'hit-target' : ''}" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">
                <span class="set-num">${setIdx + 1}</span>
                <div class="weight-cell">
                  <div class="weight-input-wrap">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="weight-input"
                      data-field="weight"
                      data-ex-idx="${exIdx}"
                      data-set-idx="${setIdx}"
                      value="${escapeHtml(formatWeight(s.weightKg))}"
                      aria-label="Peso serie ${setIdx + 1} de ${escapeHtml(ex.exercise)}"
                    />
                    <span class="weight-unit">kg</span>
                  </div>
                  ${
                    s.overloadDelta > 0
                      ? `<span class="overload-badge" title="Sobrecarga progresiva aplicada">↑+${formatWeight(s.overloadDelta)}</span>`
                      : ''
                  }
                </div>
                <div class="reps-control">
                  <button type="button" class="step-btn" data-action="step-reps" data-delta="-1" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" aria-label="Restar repetición">−</button>
                  <input
                    type="text"
                    inputmode="numeric"
                    class="reps-input"
                    data-field="reps"
                    data-ex-idx="${exIdx}"
                    data-set-idx="${setIdx}"
                    value="${s.reps === '' || s.reps === null || s.reps === undefined ? '' : escapeHtml(s.reps)}"
                    placeholder="${escapeHtml(placeholder)}"
                    aria-label="Repeticiones serie ${setIdx + 1} de ${escapeHtml(ex.exercise)}"
                  />
                  <button type="button" class="step-btn" data-action="step-reps" data-delta="1" data-ex-idx="${exIdx}" data-set-idx="${setIdx}" aria-label="Sumar repetición">+</button>
                </div>
              </div>`;
            })
            .join('')}
        </div>

        <div class="ex-footer">
          <div class="ex-footer-left">
            <button type="button" class="ghost-btn" data-action="add-set" data-ex-idx="${exIdx}">+ Serie</button>
            <button type="button" class="ghost-btn ${ex.obs && ex.obs.trim() ? 'has-note' : ''}" data-action="toggle-note" data-ex-name="${escapeHtml(ex.exercise)}">✎ Nota</button>
          </div>
          <span class="ex-live-metric" data-ex-metric="${exIdx}">
            ${exTonnage > 0 ? `${formatKgLocale(exTonnage)} kg` : `${completedCount}/${ex.sets.length}`}
          </span>
        </div>

        ${
          isNoteOpen
            ? `
          <div class="note-wrap">
            <input
              type="text"
              class="note-input"
              data-field="obs"
              data-ex-idx="${exIdx}"
              value="${escapeHtml(ex.obs || '')}"
              placeholder="Obs opcional (ej. pausa, al fallo, molestia)..."
              aria-label="Nota para ${escapeHtml(ex.exercise)}"
            />
          </div>`
            : ''
        }
      </article>
    `;
  });
  html += '</div>';

  container.innerHTML = html;

  // Bind delegated events cleanly (only once per render via direct listeners)
  container.onclick = (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'toggle-prev') {
      callbacks.onTogglePrev(btn.dataset.exName);
    } else if (action === 'toggle-note') {
      callbacks.onToggleNote(btn.dataset.exName);
    } else if (action === 'add-set') {
      callbacks.onAddSet(Number(btn.dataset.exIdx));
    } else if (action === 'step-reps') {
      const exIdx = Number(btn.dataset.exIdx);
      const setIdx = Number(btn.dataset.setIdx);
      const delta = Number(btn.dataset.delta);
      callbacks.onStepReps(exIdx, setIdx, delta);
    }
  };

  container.oninput = (e) => {
    const input = e.target;
    const field = input.dataset.field;
    if (!field) return;
    const exIdx = Number(input.dataset.exIdx);
    const setIdx = input.dataset.setIdx !== undefined ? Number(input.dataset.setIdx) : null;

    if (field === 'weight') {
      callbacks.onEditWeight(exIdx, setIdx, input.value);
    } else if (field === 'reps') {
      callbacks.onEditReps(exIdx, setIdx, input.value);
    } else if (field === 'obs') {
      callbacks.onEditObs(exIdx, input.value);
    }
  };
}

/**
 * Targeted DOM patch for a single set row + exercise metric without re-rendering inputs.
 */
export function patchSetRowVisuals(container, exIdx, setIdx, ex, meta) {
  const rowEl = container.querySelector(`.set-row[data-ex-idx="${exIdx}"][data-set-idx="${setIdx}"]`);
  const cardEl = container.querySelector(`.exercise-card[data-ex-idx="${exIdx}"]`);
  if (!rowEl || !cardEl) return;

  const s = ex.sets[setIdx];
  const parsedReps = parsePositiveInt(s.reps);
  const isCompleted = parsedReps !== null;
  const hitTarget = isCompleted && meta && meta.repMax !== null && parsedReps >= meta.repMax;

  rowEl.classList.toggle('completed', isCompleted);
  rowEl.classList.toggle('hit-target', hitTarget);

  const repsInput = rowEl.querySelector('.reps-input');
  if (repsInput && document.activeElement !== repsInput) {
    repsInput.value = s.reps === '' || s.reps === null || s.reps === undefined ? '' : String(s.reps);
  }

  const completedCount = ex.sets.filter((item) => parsePositiveInt(item.reps) !== null).length;
  cardEl.classList.toggle('all-done', ex.sets.length > 0 && completedCount === ex.sets.length);

  const mult = (meta && meta.multiplier) || 1;
  const exTonnage = ex.sets.reduce((acc, item) => {
    const w = parseDecimal(item.weightKg);
    const r = parsePositiveInt(item.reps);
    return acc + (w && r ? computeTonnage(w, r, mult) : 0);
  }, 0);

  const metricEl = container.querySelector(`[data-ex-metric="${exIdx}"]`);
  if (metricEl) {
    metricEl.textContent = exTonnage > 0 ? `${formatKgLocale(exTonnage)} kg` : `${completedCount}/${ex.sets.length}`;
  }
}
