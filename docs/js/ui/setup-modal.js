/**
 * Modal dialogs:
 * 1. Connection & Settings modal (Apps Script URL, PIN, Demo mode, reset draft)
 * 2. Finish & Save confirmation modal (summary + upcoming progressive overload preview)
 * 3. Duplicate session prompt (replace existing or cancel)
 */

import { DAY_META, formatKgLocale, formatWeight } from '../domain.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createModalController(backdropEl, cardEl) {
  function close() {
    backdropEl.classList.add('hidden');
    cardEl.innerHTML = '';
  }

  backdropEl.addEventListener('click', (e) => {
    if (e.target === backdropEl && !cardEl.dataset.locked) {
      close();
    }
  });

  function openSetup({ config, canCancel, onConnect, onUseDemo, onResetDayDraft }) {
    cardEl.dataset.locked = canCancel ? '' : '1';
    cardEl.innerHTML = `
      <h2 class="modal-title">Conectar con Google Sheets</h2>
      <p class="modal-desc">
        Ingresá la URL de tu Google Apps Script Web App y tu PIN privado (se guardan una sola vez en este iPhone).
      </p>
      <form id="setup-form">
        <div class="field">
          <label for="cfg-url">URL del Web App (Apps Script)</label>
          <input id="cfg-url" type="url" placeholder="https://script.google.com/macros/s/.../exec" value="${escapeHtml(config.apiUrl || '')}" autocomplete="off" />
        </div>
        <div class="field">
          <label for="cfg-pin">PIN privado (APP_PIN)</label>
          <input id="cfg-pin" type="password" inputmode="numeric" placeholder="Tu PIN" value="${escapeHtml(config.pin || '')}" autocomplete="off" />
        </div>
        <div id="setup-error" class="modal-error hidden"></div>
        <div class="modal-actions">
          ${canCancel ? '<button type="button" class="btn-secondary" id="btn-setup-cancel">Cancelar</button>' : ''}
          <button type="submit" class="btn-primary" id="btn-setup-save">Conectar</button>
        </div>
      </form>
      <div class="modal-actions" style="margin-top: 10px;">
        <button type="button" class="btn-secondary" id="btn-setup-demo">Usar modo Demo local</button>
        ${canCancel ? '<button type="button" class="btn-secondary" id="btn-reset-draft">Reiniciar día actual</button>' : ''}
      </div>
    `;

    backdropEl.classList.remove('hidden');

    const errEl = cardEl.querySelector('#setup-error');
    const showErr = (msg) => {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    };

    cardEl.querySelector('#setup-form').onsubmit = async (e) => {
      e.preventDefault();
      errEl.classList.add('hidden');
      const apiUrl = cardEl.querySelector('#cfg-url').value.trim();
      const pin = cardEl.querySelector('#cfg-pin').value.trim();
      if (!apiUrl || !apiUrl.startsWith('https://')) {
        showErr('Ingresá una URL válida que empiece con https://');
        return;
      }
      if (!pin) {
        showErr('Ingresá tu PIN.');
        return;
      }
      const btn = cardEl.querySelector('#btn-setup-save');
      btn.disabled = true;
      btn.textContent = 'Conectando...';
      try {
        await onConnect({ apiUrl, pin, demoMode: false });
        close();
      } catch (err) {
        showErr(err.message || 'No se pudo conectar con Apps Script.');
        btn.disabled = false;
        btn.textContent = 'Conectar';
      }
    };

    const cancelBtn = cardEl.querySelector('#btn-setup-cancel');
    if (cancelBtn) cancelBtn.onclick = close;

    cardEl.querySelector('#btn-setup-demo').onclick = () => {
      onUseDemo();
      close();
    };

    const resetBtn = cardEl.querySelector('#btn-reset-draft');
    if (resetBtn) {
      resetBtn.onclick = () => {
        onResetDayDraft();
        close();
      };
    }
  }

  function openConfirmSave({ day, dateIso, summary, isDemo, onConfirm }) {
    cardEl.dataset.locked = '';
    const dayLabel = DAY_META[day] ? DAY_META[day].label : day;
    const progs = summary.nextWeekProgressions || [];

    cardEl.innerHTML = `
      <h2 class="modal-title">Guardar ${escapeHtml(dayLabel)}</h2>
      <p class="modal-desc">
        ${isDemo ? 'Modo Demo: se simulará el guardado localmente.' : 'Se subirán las series completadas a Tracker Gym - Base de Datos.'}
      </p>
      <div class="field">
        <label for="save-date">Fecha de la sesión</label>
        <input id="save-date" type="date" value="${escapeHtml(dateIso)}" />
      </div>
      <div class="modal-summary-list">
        <div><strong>${summary.completedSets}</strong> series completadas · <strong>${formatKgLocale(summary.totalTonnage)} kg</strong> de tonelaje</div>
        ${
          progs.length > 0
            ? `<div class="progression-chip">↑ Próxima semana suben ${progs.length} ${progs.length === 1 ? 'serie' : 'series'}: ${progs
                .slice(0, 4)
                .map((p) => `${escapeHtml(p.exercise)} S${p.setNumber} (${formatWeight(p.fromKg)}→${formatWeight(p.toKg)}kg)`)
                .join(' · ')}${progs.length > 4 ? ' …' : ''}</div>`
            : '<div style="color:var(--muted);font-size:12px;">Sin cambios de peso para la próxima semana.</div>'
        }
      </div>
      <div id="save-error" class="modal-error hidden"></div>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="btn-save-cancel">Seguir editando</button>
        <button type="button" class="btn-primary" id="btn-save-confirm">Confirmar y guardar</button>
      </div>
    `;

    backdropEl.classList.remove('hidden');

    cardEl.querySelector('#btn-save-cancel').onclick = close;
    cardEl.querySelector('#btn-save-confirm').onclick = async () => {
      const chosenDate = cardEl.querySelector('#save-date').value || dateIso;
      const btn = cardEl.querySelector('#btn-save-confirm');
      const errEl = cardEl.querySelector('#save-error');
      errEl.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      try {
        await onConfirm(chosenDate, false);
        close();
      } catch (err) {
        if (err.code === 'DUPLICATE_SESSION') {
          openDuplicatePrompt({
            message: err.message,
            onReplace: async () => {
              await onConfirm(chosenDate, true);
              close();
            },
          });
          return;
        }
        errEl.textContent = err.message || 'Error al guardar sesión.';
        errEl.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Confirmar y guardar';
      }
    };
  }

  function openDuplicatePrompt({ message, onReplace }) {
    cardEl.dataset.locked = '';
    cardEl.innerHTML = `
      <h2 class="modal-title">Sesión ya registrada</h2>
      <p class="modal-desc">${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="btn-dup-cancel">Cancelar</button>
        <button type="button" class="btn-primary" id="btn-dup-replace">Reemplazar sesión</button>
      </div>
    `;
    backdropEl.classList.remove('hidden');
    cardEl.querySelector('#btn-dup-cancel').onclick = close;
    cardEl.querySelector('#btn-dup-replace').onclick = async () => {
      const btn = cardEl.querySelector('#btn-dup-replace');
      btn.disabled = true;
      btn.textContent = 'Reemplazando...';
      await onReplace();
    };
  }

  return { openSetup, openConfirmSave, openDuplicatePrompt, close };
}
