/**
 * Pure business domain logic for Hypertrophy Tracker PWA.
 * Zero DOM / network dependencies — fully unit-testable.
 */

export const CANONICAL_DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'VIERNES', 'SABADO'];

export const DAY_META = {
  LUNES:     { short: 'LUN', label: 'Lunes',     focus: 'Hombro / Brazo',          weekday: 1 },
  MARTES:    { short: 'MAR', label: 'Martes',    focus: 'Piernas',                 weekday: 2 },
  MIERCOLES: { short: 'MIÉ', label: 'Miércoles', focus: 'Tren Superior',           weekday: 3 },
  VIERNES:   { short: 'VIE', label: 'Viernes',   focus: 'Pecho / Hombro / Tríceps', weekday: 5 },
  SABADO:    { short: 'SÁB', label: 'Sábado',    focus: 'Espalda / Bíceps',        weekday: 6 },
};

export const MUSCLE_GROUPS = ['Hombro/Brazo', 'Piernas', 'Pecho', 'Espalda'];
export const EPLEY_FACTOR = 0.0333;

export function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

export function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export function parseDecimal(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const cleaned = String(raw).trim().replace(',', '.');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : null;
}

export function parsePositiveInt(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  const cleaned = String(raw).trim();
  if (!cleaned) return null;
  const num = Math.floor(Number(cleaned));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function formatWeight(kg) {
  const parsed = typeof kg === 'string' ? parseDecimal(kg) : Number(kg);
  const n = Number.isFinite(parsed) && parsed !== null ? parsed : 0;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatKgLocale(kg) {
  return Number(kg || 0).toLocaleString('es-UY', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatShortDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function computeTonnage(weightKg, reps, multiplier) {
  if (!weightKg || !reps || reps <= 0) return 0;
  return round2(weightKg * reps * (multiplier || 1));
}

export function computeEpley1RM(weightKg, reps) {
  if (!weightKg || !reps || reps <= 0) return 0;
  return round1(weightKg * (1 + EPLEY_FACTOR * reps));
}

/**
 * Pick default day tab on app launch:
 * - Today's routine day if today is Mon/Tue/Wed/Fri/Sat
 * - Otherwise the first uncompleted routine day this week, or LUNES
 */
export function pickDefaultDay(serverDateIso, loggedThisWeek = {}) {
  if (serverDateIso && /^\d{4}-\d{2}-\d{2}$/.test(serverDateIso)) {
    const [y, m, d] = serverDateIso.split('-').map(Number);
    const jsDay = new Date(y, m - 1, d, 12, 0, 0).getDay();
    const match = CANONICAL_DAYS.find((day) => DAY_META[day].weekday === jsDay);
    if (match) return match;
  }
  const firstPending = CANONICAL_DAYS.find((day) => !loggedThisWeek[day]);
  return firstPending || 'LUNES';
}

/**
 * Compute per-set suggested weight & progressive overload delta
 * strictly scoped to the previous session of the SAME (day, exercise).
 */
export function computeSuggestedSet(setIndex0, routineItem, meta, prevExerciseSets) {
  const prevSet = Array.isArray(prevExerciseSets) ? prevExerciseSets[setIndex0] : null;
  const fallbackWeight =
    Array.isArray(routineItem.baseWeights) && routineItem.baseWeights.length > 0
      ? routineItem.baseWeights[Math.min(setIndex0, routineItem.baseWeights.length - 1)]
      : 0;

  if (!prevSet) {
    return {
      weightKg: fallbackWeight,
      overloadDelta: 0,
      prevWeightKg: null,
      prevReps: null,
    };
  }

  const hitTop =
    meta &&
    meta.repMax !== null &&
    meta.repMax !== undefined &&
    prevSet.reps >= meta.repMax;

  const inc = meta ? Number(meta.incrementKg || (meta.isUnilateral ? 2.5 : 5)) : 5;
  const suggested = hitTop ? round2(prevSet.weightKg + inc) : prevSet.weightKg;

  return {
    weightKg: suggested,
    overloadDelta: hitTop ? inc : 0,
    prevWeightKg: prevSet.weightKg,
    prevReps: prevSet.reps,
  };
}

/**
 * Build fresh draft structure for a day from bootstrap data.
 */
export function buildInitialDayDraft(day, bootstrap) {
  const routineItems = (bootstrap.routine && bootstrap.routine[day]) || [];
  const dict = bootstrap.dictionary || {};
  const lastSession = (bootstrap.lastSessionsByDay && bootstrap.lastSessionsByDay[day]) || null;

  const exercises = routineItems.map((item) => {
    const meta = dict[item.exercise] || {
      name: item.exercise,
      muscleGroup: '',
      isUnilateral: false,
      multiplier: 1,
      repMin: null,
      repMax: null,
      incrementKg: 5,
      referenceDay: null,
    };
    const prevSets = (lastSession && lastSession.exercises && lastSession.exercises[item.exercise]) || [];
    const sets = [];
    for (let i = 0; i < item.setsCount; i += 1) {
      const suggestion = computeSuggestedSet(i, item, meta, prevSets);
      sets.push({
        setNumber: i + 1,
        weightKg: suggestion.weightKg,
        reps: '',
        overloadDelta: suggestion.overloadDelta,
        prevWeightKg: suggestion.prevWeightKg,
        prevReps: suggestion.prevReps,
      });
    }
    return {
      exercise: item.exercise,
      obs: '',
      sets,
    };
  });

  return {
    day,
    dateIso: bootstrap.serverDateIso || new Date().toISOString().slice(0, 10),
    updatedAt: Date.now(),
    exercises,
  };
}

/**
 * Build the 2 key reference exercise entries for the top banner of a day.
 */
export function buildReferenceBanner(day, bootstrap) {
  const dict = bootstrap.dictionary || {};
  const routineItems = (bootstrap.routine && bootstrap.routine[day]) || [];
  const lastSession = (bootstrap.lastSessionsByDay && bootstrap.lastSessionsByDay[day]) || null;

  const refNames = routineItems
    .map((item) => item.exercise)
    .filter((name) => dict[name] && dict[name].referenceDay === day);

  if (refNames.length === 0) return null;

  const items = refNames.map((name) => {
    const prevSets = (lastSession && lastSession.exercises && lastSession.exercises[name]) || [];
    const marks = prevSets.length > 0
      ? prevSets.map((s) => `${formatWeight(s.weightKg)}kg × ${s.reps}`).join(' · ')
      : 'Sin registro previo';
    return { exercise: name, marks };
  });

  return {
    dateIso: lastSession ? lastSession.dateIso : null,
    items,
  };
}

/**
 * Summarize an active draft: completed sets, total tonnage, flat payload for Apps Script,
 * and preview of sets that unlocked next week's progressive overload.
 */
export function summarizeDraft(draft, dictionary = {}) {
  let totalPlannedSets = 0;
  let completedSets = 0;
  let totalTonnage = 0;
  const flatSets = [];
  const nextWeekProgressions = [];

  for (const ex of draft.exercises || []) {
    const meta = dictionary[ex.exercise] || { multiplier: 1, repMax: null, incrementKg: 5 };
    const mult = meta.multiplier || 1;
    let exSetCounter = 0;

    for (const s of ex.sets || []) {
      totalPlannedSets += 1;
      const reps = parsePositiveInt(s.reps);
      const weightKg = parseDecimal(s.weightKg);
      if (reps === null || weightKg === null) continue;

      exSetCounter += 1;
      completedSets += 1;
      totalTonnage += computeTonnage(weightKg, reps, mult);

      flatSets.push({
        exercise: ex.exercise,
        setNumber: exSetCounter,
        weightKg,
        reps,
        obs: exSetCounter === 1 ? String(ex.obs || '').trim() : '',
      });

      if (meta.repMax !== null && meta.repMax !== undefined && reps >= meta.repMax) {
        const inc = Number(meta.incrementKg || (meta.isUnilateral ? 2.5 : 5));
        nextWeekProgressions.push({
          exercise: ex.exercise,
          setNumber: exSetCounter,
          fromKg: weightKg,
          toKg: round2(weightKg + inc),
          incKg: inc,
          reps,
        });
      }
    }
  }

  return {
    totalPlannedSets,
    completedSets,
    totalTonnage: round1(totalTonnage),
    flatSets,
    nextWeekProgressions,
  };
}
