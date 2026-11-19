/**
 * Renders the "Semana" tab:
 * - Current week range & 3 KPI cards (Tonelaje vs sem. anterior, Series, Días X/5)
 * - 5-day adherence checklist (tap any day to jump to Entrenar)
 * - Muscle group volume comparison bars (Hombro/Brazo, Piernas, Pecho, Espalda)
 * - Direct link to Google Sheets for long-term Dashboard charts
 */

import { DAY_META, formatKgLocale, formatShortDate } from '../domain.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDeltaPct(pct) {
  if (pct === null || pct === undefined) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
}

export function renderWeekView(container, bootstrap, onSelectDay) {
  const summary = bootstrap && bootstrap.weeklySummary;
  const weekRange = bootstrap && bootstrap.weekRange;
  if (!summary || !weekRange) {
    container.innerHTML = '<p class="modal-desc">Sin datos semanales disponibles todavía.</p>';
    return;
  }

  const deltaClass = summary.deltaPct > 0 ? 'pos' : summary.deltaPct < 0 ? 'neg' : '';
  const maxMuscleTon = Math.max(
    1,
    ...summary.byMuscleGroup.map((g) => Math.max(g.tonnage || 0, g.prevTonnage || 0))
  );

  let html = `
    <div class="week-range-label">
      Semana actual: <strong>${formatShortDate(weekRange.startIso)}</strong> al <strong>${formatShortDate(weekRange.endIso)}</strong>
      · Ant: ${formatShortDate(weekRange.prevStartIso)}–${formatShortDate(weekRange.prevEndIso)}
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Tonelaje</div>
        <div class="kpi-value">${formatKgLocale(summary.totalTonnage)}</div>
        <div class="kpi-sub ${deltaClass}">${formatDeltaPct(summary.deltaPct)} vs ant.</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Series</div>
        <div class="kpi-value">${summary.totalSets}</div>
        <div class="kpi-sub">${summary.totalReps} reps</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Días</div>
        <div class="kpi-value">${summary.daysCompleted}/${summary.totalDays}</div>
        <div class="kpi-sub">${summary.daysCompleted === summary.totalDays ? 'Completa' : 'En curso'}</div>
      </div>
    </div>

    <div class="section-card">
      <h2 class="section-title">Adherencia semanal</h2>
      <div class="adherence-list">
        ${summary.adherence
          .map((item) => {
            const meta = DAY_META[item.day];
            return `
            <div class="adherence-row" data-jump-day="${escapeHtml(item.day)}" role="button" tabindex="0">
              <div class="adherence-left">
                <span class="status-dot ${item.completed ? 'done' : ''}"></span>
                <div>
                  <div class="adherence-day">${escapeHtml(meta.label)}</div>
                  <div class="adherence-sub">${
                    item.completed
                      ? `${formatShortDate(item.dateIso)} · ${escapeHtml(meta.focus)}`
                      : `Pendiente · ${escapeHtml(meta.focus)}`
                  }</div>
                </div>
              </div>
              <div class="adherence-right">
                <div class="adherence-ton">${item.completed ? `${formatKgLocale(item.tonnage)} kg` : '—'}</div>
                <div class="adherence-sets">${item.completed ? `${item.setsCount} ${item.setsCount === 1 ? 'serie' : 'series'}` : 'Sin cargar'}</div>
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </div>

    <div class="section-card">
      <h2 class="section-title">Volumen por grupo muscular</h2>
      <div class="muscle-list">
        ${summary.byMuscleGroup
          .map((g) => {
            const currPct = Math.min(100, Math.round((g.tonnage / maxMuscleTon) * 100));
            const prevPct = Math.min(100, Math.round((g.prevTonnage / maxMuscleTon) * 100));
            const dSign = g.deltaKg > 0 ? '+' : '';
            return `
            <div class="muscle-row">
              <div class="muscle-row-head">
                <span class="muscle-name">${escapeHtml(g.muscleGroup)}</span>
                <span class="muscle-nums"><strong>${formatKgLocale(g.tonnage)} kg</strong> · ${g.sets} s</span>
              </div>
              <div class="muscle-bar-track">
                <div class="muscle-bar-prev" style="width:${prevPct}%"></div>
                <div class="muscle-bar-curr" style="width:${currPct}%"></div>
              </div>
              <div class="muscle-foot">
                <span>Ant: ${formatKgLocale(g.prevTonnage)} kg</span>
                <span>${dSign}${formatKgLocale(g.deltaKg)} kg (${formatDeltaPct(g.deltaPct)})</span>
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </div>
  `;

  if (bootstrap.spreadsheetUrl) {
    html += `
      <a class="sheet-link-btn" href="${escapeHtml(bootstrap.spreadsheetUrl)}" target="_blank" rel="noopener noreferrer">
        Abrir Google Sheet (Dashboard histórico) ↗
      </a>
    `;
  }

  container.innerHTML = html;

  container.onclick = (e) => {
    const row = e.target.closest('[data-jump-day]');
    if (row && onSelectDay) {
      onSelectDay(row.dataset.jumpDay);
    }
  };
}
