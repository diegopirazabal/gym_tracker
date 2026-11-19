/**
 * Google Apps Script HTTP client (CORS-safe for Safari iOS) + Demo simulator.
 */

import { computeEpley1RM, computeTonnage, round1 } from './domain.js';

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function fetchBootstrap(config) {
  const url = new URL(config.apiUrl);
  url.searchParams.set('action', 'bootstrap');
  url.searchParams.set('pin', config.pin);

  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new ApiError(`Error HTTP ${res.status}`, 'HTTP_ERROR');
  }
  const json = await res.json();
  if (!json.ok) {
    throw new ApiError(json.message || 'Error al cargar datos del Sheet', json.code || 'API_ERROR', json);
  }
  return json.data;
}

export async function postSession(config, sessionPayload) {
  // text/plain avoids CORS OPTIONS preflight which Google Apps Script does not serve
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      pin: config.pin,
      action: 'saveSession',
      dateIso: sessionPayload.dateIso,
      day: sessionPayload.day,
      replaceExisting: Boolean(sessionPayload.replaceExisting),
      sets: sessionPayload.sets,
    }),
  });
  if (!res.ok) {
    throw new ApiError(`Error HTTP ${res.status}`, 'HTTP_ERROR');
  }
  const json = await res.json();
  if (!json.ok) {
    throw new ApiError(json.message || 'Error al guardar sesión', json.code || 'API_ERROR', json);
  }
  return json;
}

/**
 * Local in-memory simulation for Demo mode so Diego can preview the full save +
 * Semana update cycle locally before pasting Apps Script.
 */
export function applyDemoSessionSave(bootstrap, sessionPayload) {
  const next = JSON.parse(JSON.stringify(bootstrap));
  const { day, dateIso, sets } = sessionPayload;
  const dict = next.dictionary || {};

  const exMap = {};
  let daySets = 0;
  let dayTonnage = 0;
  let dayBest1rm = 0;

  for (const s of sets) {
    const meta = dict[s.exercise] || { muscleGroup: 'Hombro/Brazo', multiplier: 1 };
    const ton = computeTonnage(s.weightKg, s.reps, meta.multiplier);
    const rm = computeEpley1RM(s.weightKg, s.reps);
    daySets += 1;
    dayTonnage += ton;
    if (rm > dayBest1rm) dayBest1rm = rm;

    if (!exMap[s.exercise]) exMap[s.exercise] = [];
    exMap[s.exercise].push({
      setNumber: s.setNumber,
      weightKg: s.weightKg,
      reps: s.reps,
      multiplier: meta.multiplier,
      tonnage: ton,
      est1rm: rm,
      obs: s.obs || '',
    });

    const grp = next.weeklySummary.byMuscleGroup.find((g) => g.muscleGroup === meta.muscleGroup);
    if (grp) {
      grp.sets += 1;
      grp.reps += s.reps;
      grp.tonnage = round1(grp.tonnage + ton);
      grp.deltaKg = round1(grp.tonnage - grp.prevTonnage);
      grp.deltaPct = grp.prevTonnage > 0 ? round1(((grp.tonnage - grp.prevTonnage) / grp.prevTonnage) * 100) : null;
    }
  }

  dayTonnage = round1(dayTonnage);
  dayBest1rm = round1(dayBest1rm);

  next.lastSessionsByDay[day] = { dateIso, exercises: exMap };
  next.loggedThisWeek[day] = { dateIso, setsCount: daySets, tonnage: dayTonnage, best1rm: dayBest1rm };

  const adh = next.weeklySummary.adherence.find((a) => a.day === day);
  if (adh) {
    adh.completed = true;
    adh.dateIso = dateIso;
    adh.setsCount = daySets;
    adh.tonnage = dayTonnage;
    adh.best1rm = dayBest1rm;
  }

  next.weeklySummary.daysCompleted = next.weeklySummary.adherence.filter((a) => a.completed).length;
  next.weeklySummary.totalSets = next.weeklySummary.byMuscleGroup.reduce((acc, g) => acc + g.sets, 0);
  next.weeklySummary.totalReps = next.weeklySummary.byMuscleGroup.reduce((acc, g) => acc + g.reps, 0);
  next.weeklySummary.totalTonnage = round1(
    next.weeklySummary.byMuscleGroup.reduce((acc, g) => acc + g.tonnage, 0)
  );
  next.weeklySummary.deltaKg = round1(
    next.weeklySummary.totalTonnage - next.weeklySummary.prevTotalTonnage
  );
  next.weeklySummary.deltaPct =
    next.weeklySummary.prevTotalTonnage > 0
      ? round1((next.weeklySummary.deltaKg / next.weeklySummary.prevTotalTonnage) * 100)
      : null;

  return { ok: true, insertedCount: daySets, data: next };
}
