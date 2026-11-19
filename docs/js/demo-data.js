/**
 * Realistic snapshot matching Diego's real "Tracker Gym - Base de Datos" Sheet
 * for instant local / offline preview before deploying Apps Script.
 */

export function createDemoBootstrap() {
  return {
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1joiW8WvrMwz590vKn-jg5niUo9JgFgr-tnqfxTpl7Yc/edit',
    serverDateIso: '2026-11-18',
    weekRange: {
      startIso: '2026-11-16',
      endIso: '2026-11-22',
      prevStartIso: '2026-11-09',
      prevEndIso: '2026-11-15',
    },
    dictionary: {
      'Shoulder Press DB':       { name: 'Shoulder Press DB',       muscleGroup: 'Hombro/Brazo', isUnilateral: true,  multiplier: 2, repMin: 6,  repMax: 10, incrementKg: 2.5, referenceDay: 'LUNES' },
      'Lat raise machine':       { name: 'Lat raise machine',       muscleGroup: 'Hombro/Brazo', isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: 'LUNES' },
      'Lat raise polea':         { name: 'Lat raise polea',         muscleGroup: 'Hombro/Brazo', isUnilateral: true,  multiplier: 2, repMin: 10, repMax: 20, incrementKg: 5.0, referenceDay: null },
      'Posterior':               { name: 'Posterior',               muscleGroup: 'Hombro/Brazo', isUnilateral: true,  multiplier: 2, repMin: 8,  repMax: 20, incrementKg: 5.0, referenceDay: null },
      'Martillo':                { name: 'Martillo',                muscleGroup: 'Hombro/Brazo', isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Pushdown':                { name: 'Pushdown',                muscleGroup: 'Hombro/Brazo', isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Preacher':                { name: 'Preacher',                muscleGroup: 'Hombro/Brazo', isUnilateral: true,  multiplier: 2, repMin: 8,  repMax: 12, incrementKg: 2.5, referenceDay: null },
      'Curl':                    { name: 'Curl',                    muscleGroup: 'Hombro/Brazo', isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'JM':                      { name: 'JM',                      muscleGroup: 'Hombro/Brazo', isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Katana':                  { name: 'Katana',                  muscleGroup: 'Hombro/Brazo', isUnilateral: true,  multiplier: 2, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Katana invert':           { name: 'Katana invert',           muscleGroup: 'Hombro/Brazo', isUnilateral: true,  multiplier: 2, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Bayesian db':             { name: 'Bayesian db',             muscleGroup: 'Hombro/Brazo', isUnilateral: true,  multiplier: 2, repMin: 8,  repMax: 12, incrementKg: 2.5, referenceDay: null },
      'Hacka':                   { name: 'Hacka',                   muscleGroup: 'Piernas',      isUnilateral: false, multiplier: 1, repMin: 6,  repMax: 10, incrementKg: 5.0, referenceDay: 'MARTES' },
      'RDL':                     { name: 'RDL',                     muscleGroup: 'Piernas',      isUnilateral: false, multiplier: 1, repMin: 6,  repMax: 10, incrementKg: 5.0, referenceDay: 'MARTES' },
      'Leg ext':                 { name: 'Leg ext',                 muscleGroup: 'Piernas',      isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Leg curl':                { name: 'Leg curl',                muscleGroup: 'Piernas',      isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Aductores':               { name: 'Aductores',               muscleGroup: 'Piernas',      isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 15, incrementKg: 5.0, referenceDay: null },
      'Gemelos':                 { name: 'Gemelos',                 muscleGroup: 'Piernas',      isUnilateral: false, multiplier: 1, repMin: 10, repMax: 15, incrementKg: 2.5, referenceDay: null },
      'Bench':                   { name: 'Bench',                   muscleGroup: 'Pecho',        isUnilateral: false, multiplier: 1, repMin: 6,  repMax: 10, incrementKg: 5.0, referenceDay: 'VIERNES' },
      'Inclinado c/barra':       { name: 'Inclinado c/barra',       muscleGroup: 'Pecho',        isUnilateral: false, multiplier: 1, repMin: 6,  repMax: 10, incrementKg: 5.0, referenceDay: 'MIERCOLES' },
      'Inclinado con mancuerna': { name: 'Inclinado con mancuerna', muscleGroup: 'Pecho',        isUnilateral: true,  multiplier: 2, repMin: 8,  repMax: 12, incrementKg: 2.5, referenceDay: 'VIERNES' },
      'Plano c/pausa':           { name: 'Plano c/pausa',           muscleGroup: 'Pecho',        isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Cruces':                  { name: 'Cruces',                  muscleGroup: 'Pecho',        isUnilateral: true,  multiplier: 2, repMin: 10, repMax: 15, incrementKg: 5.0, referenceDay: null },
      'Jalon wide':              { name: 'Jalon wide',              muscleGroup: 'Espalda',      isUnilateral: false, multiplier: 1, repMin: 6,  repMax: 10, incrementKg: 5.0, referenceDay: 'MIERCOLES' },
      'Gironda':                 { name: 'Gironda',                 muscleGroup: 'Espalda',      isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: null },
      'Remo T':                  { name: 'Remo T',                  muscleGroup: 'Espalda',      isUnilateral: false, multiplier: 1, repMin: 6,  repMax: 10, incrementKg: 2.5, referenceDay: 'SABADO' },
      'Jalon close':             { name: 'Jalon close',             muscleGroup: 'Espalda',      isUnilateral: false, multiplier: 1, repMin: 8,  repMax: 12, incrementKg: 5.0, referenceDay: 'SABADO' },
      'Pull over':               { name: 'Pull over',               muscleGroup: 'Espalda',      isUnilateral: true,  multiplier: 2, repMin: null, repMax: null, incrementKg: 5.0, referenceDay: null },
    },
    routine: {
      LUNES: [
        { order: 1, exercise: 'Shoulder Press DB', setsCount: 2, baseWeights: [20, 17.5] },
        { order: 2, exercise: 'Lat raise machine', setsCount: 2, baseWeights: [25, 25] },
        { order: 3, exercise: 'Posterior',         setsCount: 2, baseWeights: [15, 10] },
        { order: 4, exercise: 'Martillo',          setsCount: 2, baseWeights: [35, 35] },
        { order: 5, exercise: 'Pushdown',          setsCount: 2, baseWeights: [50, 50] },
        { order: 6, exercise: 'Lat raise polea',   setsCount: 2, baseWeights: [10, 10] },
        { order: 7, exercise: 'Preacher',          setsCount: 2, baseWeights: [12.5, 10] },
        { order: 8, exercise: 'Katana invert',     setsCount: 2, baseWeights: [20, 20] },
      ],
      MARTES: [
        { order: 1, exercise: 'Hacka',     setsCount: 2, baseWeights: [60, 60] },
        { order: 2, exercise: 'RDL',       setsCount: 2, baseWeights: [50, 50] },
        { order: 3, exercise: 'Leg ext',   setsCount: 2, baseWeights: [70, 70] },
        { order: 4, exercise: 'Leg curl',  setsCount: 2, baseWeights: [60, 60] },
        { order: 5, exercise: 'Aductores', setsCount: 2, baseWeights: [50, 50] },
        { order: 6, exercise: 'Gemelos',   setsCount: 3, baseWeights: [35, 35, 35] },
      ],
      MIERCOLES: [
        { order: 1, exercise: 'Jalon wide',        setsCount: 2, baseWeights: [55, 55] },
        { order: 2, exercise: 'Gironda',           setsCount: 2, baseWeights: [50, 50] },
        { order: 3, exercise: 'Inclinado c/barra', setsCount: 2, baseWeights: [50, 50] },
        { order: 4, exercise: 'Plano c/pausa',     setsCount: 2, baseWeights: [40, 40] },
        { order: 5, exercise: 'Lat raise machine', setsCount: 3, baseWeights: [25, 25, 20] },
        { order: 6, exercise: 'Curl',              setsCount: 2, baseWeights: [25, 25] },
        { order: 7, exercise: 'JM',                setsCount: 2, baseWeights: [25, 20] },
      ],
      VIERNES: [
        { order: 1, exercise: 'Bench',                   setsCount: 2, baseWeights: [60, 60] },
        { order: 2, exercise: 'Inclinado con mancuerna', setsCount: 2, baseWeights: [20, 20] },
        { order: 3, exercise: 'Cruces',                  setsCount: 2, baseWeights: [20, 15] },
        { order: 4, exercise: 'Lat raise machine',       setsCount: 3, baseWeights: [20, 20, 20] },
        { order: 5, exercise: 'Katana',                  setsCount: 3, baseWeights: [15, 15, 15] },
        { order: 6, exercise: 'Katana invert',           setsCount: 3, baseWeights: [20, 20, 15] },
      ],
      SABADO: [
        { order: 1, exercise: 'Remo T',      setsCount: 2, baseWeights: [30, 30] },
        { order: 2, exercise: 'Jalon close', setsCount: 2, baseWeights: [55, 55] },
        { order: 3, exercise: 'Pull over',   setsCount: 2, baseWeights: [20, 20] },
        { order: 4, exercise: 'Preacher',    setsCount: 3, baseWeights: [12.5, 10, 10] },
        { order: 5, exercise: 'Bayesian db', setsCount: 3, baseWeights: [7.5, 7.5, 7.5] },
      ],
    },
    lastSessionsByDay: {
      LUNES: {
        dateIso: '2026-11-16',
        exercises: {
          'Shoulder Press DB': [
            { setNumber: 1, weightKg: 20,   reps: 8,  est1rm: 25.3 },
            { setNumber: 2, weightKg: 17.5, reps: 10, est1rm: 23.3 },
          ],
          'Lat raise machine': [
            { setNumber: 1, weightKg: 25, reps: 12, est1rm: 35.0 },
            { setNumber: 2, weightKg: 25, reps: 11, est1rm: 34.2 },
          ],
          'Posterior': [
            { setNumber: 1, weightKg: 15, reps: 8,  est1rm: 19.0 },
            { setNumber: 2, weightKg: 10, reps: 15, est1rm: 15.0 },
          ],
          'Martillo': [
            { setNumber: 1, weightKg: 35, reps: 11, est1rm: 47.8 },
            { setNumber: 2, weightKg: 35, reps: 10, est1rm: 46.7 },
          ],
          'Pushdown': [
            { setNumber: 1, weightKg: 50, reps: 15, est1rm: 75.0 },
            { setNumber: 2, weightKg: 50, reps: 10, est1rm: 66.7 },
          ],
          'Lat raise polea': [
            { setNumber: 1, weightKg: 10, reps: 22, est1rm: 17.3 },
            { setNumber: 2, weightKg: 10, reps: 14, est1rm: 14.7 },
          ],
          'Preacher': [
            { setNumber: 1, weightKg: 12.5, reps: 9,  est1rm: 16.2 },
            { setNumber: 2, weightKg: 10,   reps: 11, est1rm: 13.7 },
          ],
          'Katana invert': [
            { setNumber: 1, weightKg: 20, reps: 12, est1rm: 28.0 },
            { setNumber: 2, weightKg: 20, reps: 9,  est1rm: 26.0 },
          ],
        },
      },
      MARTES: {
        dateIso: '2026-11-03',
        exercises: {
          'Hacka':     [{ setNumber: 1, weightKg: 60, reps: 6, est1rm: 72.0 }, { setNumber: 2, weightKg: 60, reps: 6, est1rm: 72.0 }],
          'RDL':       [{ setNumber: 1, weightKg: 50, reps: 8, est1rm: 63.3 }, { setNumber: 2, weightKg: 50, reps: 8, est1rm: 63.3 }],
          'Leg ext':   [{ setNumber: 1, weightKg: 70, reps: 10, est1rm: 93.3 }, { setNumber: 2, weightKg: 70, reps: 10, est1rm: 93.3 }],
          'Leg curl':  [{ setNumber: 1, weightKg: 60, reps: 12, est1rm: 84.0 }, { setNumber: 2, weightKg: 60, reps: 10, est1rm: 80.0 }],
          'Aductores': [{ setNumber: 1, weightKg: 50, reps: 10, est1rm: 66.7 }, { setNumber: 2, weightKg: 50, reps: 7, est1rm: 61.7 }],
          'Gemelos':   [{ setNumber: 1, weightKg: 35, reps: 15, est1rm: 52.5 }, { setNumber: 2, weightKg: 35, reps: 13, est1rm: 50.2 }, { setNumber: 3, weightKg: 35, reps: 11, est1rm: 47.8 }],
        },
      },
      MIERCOLES: {
        dateIso: '2026-11-11',
        exercises: {
          'Jalon wide':        [{ setNumber: 1, weightKg: 55, reps: 9, est1rm: 71.5 }, { setNumber: 2, weightKg: 55, reps: 7, est1rm: 67.8 }],
          'Gironda':           [{ setNumber: 1, weightKg: 50, reps: 8, est1rm: 63.3 }, { setNumber: 2, weightKg: 50, reps: 8, est1rm: 63.3 }],
          'Inclinado c/barra': [{ setNumber: 1, weightKg: 50, reps: 7, est1rm: 61.7 }, { setNumber: 2, weightKg: 50, reps: 6, est1rm: 60.0 }],
          'Plano c/pausa':     [{ setNumber: 1, weightKg: 40, reps: 10, est1rm: 53.3 }, { setNumber: 2, weightKg: 40, reps: 9, est1rm: 52.0 }],
          'Lat raise machine': [{ setNumber: 1, weightKg: 25, reps: 11, est1rm: 34.2 }, { setNumber: 2, weightKg: 25, reps: 11, est1rm: 34.2 }, { setNumber: 3, weightKg: 20, reps: 16, est1rm: 30.7 }],
          'Curl':              [{ setNumber: 1, weightKg: 25, reps: 12, est1rm: 35.0 }, { setNumber: 2, weightKg: 25, reps: 12, est1rm: 35.0 }],
          'JM':                [{ setNumber: 1, weightKg: 25, reps: 8, est1rm: 31.7 }, { setNumber: 2, weightKg: 20, reps: 13, est1rm: 28.7 }],
        },
      },
      VIERNES: {
        dateIso: '2026-11-13',
        exercises: {
          'Bench':                   [{ setNumber: 1, weightKg: 60, reps: 6, est1rm: 72.0 }, { setNumber: 2, weightKg: 60, reps: 6, est1rm: 72.0 }],
          'Inclinado con mancuerna': [{ setNumber: 1, weightKg: 20, reps: 8, est1rm: 25.3 }, { setNumber: 2, weightKg: 20, reps: 9, est1rm: 26.0 }],
          'Cruces':                  [{ setNumber: 1, weightKg: 20, reps: 12, est1rm: 28.0 }, { setNumber: 2, weightKg: 15, reps: 11, est1rm: 20.5 }],
          'Lat raise machine':       [{ setNumber: 1, weightKg: 20, reps: 18, est1rm: 32.0 }, { setNumber: 2, weightKg: 20, reps: 16, est1rm: 30.7 }, { setNumber: 3, weightKg: 20, reps: 14, est1rm: 29.3 }],
          'Katana':                  [{ setNumber: 1, weightKg: 15, reps: 8, est1rm: 19.0 }, { setNumber: 2, weightKg: 15, reps: 9, est1rm: 19.5 }, { setNumber: 3, weightKg: 15, reps: 8, est1rm: 19.0 }],
          'Katana invert':           [{ setNumber: 1, weightKg: 20, reps: 8, est1rm: 25.3 }, { setNumber: 2, weightKg: 20, reps: 8, est1rm: 25.3 }, { setNumber: 3, weightKg: 15, reps: 12, est1rm: 21.0 }],
        },
      },
      SABADO: null,
    },
    loggedThisWeek: {
      LUNES: { dateIso: '2026-11-16', setsCount: 16, tonnage: 5775.0, best1rm: 75.0 },
    },
    weeklySummary: {
      totalSets: 16,
      totalReps: 187,
      totalTonnage: 5775.0,
      prevTotalTonnage: 9940.0,
      deltaKg: -4165.0,
      deltaPct: -41.9,
      daysCompleted: 1,
      totalDays: 5,
      byMuscleGroup: [
        { muscleGroup: 'Hombro/Brazo', sets: 16, reps: 187, tonnage: 5775.0, prevTonnage: 4640.0, deltaKg: 1135.0,  deltaPct: 24.5 },
        { muscleGroup: 'Piernas',      sets: 0,  reps: 0,   tonnage: 0.0,    prevTonnage: 0.0,    deltaKg: 0.0,     deltaPct: null },
        { muscleGroup: 'Pecho',        sets: 0,  reps: 0,   tonnage: 0.0,    prevTonnage: 3620.0, deltaKg: -3620.0, deltaPct: -100.0 },
        { muscleGroup: 'Espalda',      sets: 0,  reps: 0,   tonnage: 0.0,    prevTonnage: 1680.0, deltaKg: -1680.0, deltaPct: -100.0 },
      ],
      adherence: [
        { day: 'LUNES',     completed: true,  dateIso: '2026-11-16', setsCount: 16, tonnage: 5775.0, best1rm: 75.0 },
        { day: 'MARTES',    completed: false, dateIso: null,         setsCount: 0,  tonnage: 0,      best1rm: 0 },
        { day: 'MIERCOLES', completed: false, dateIso: null,         setsCount: 0,  tonnage: 0,      best1rm: 0 },
        { day: 'VIERNES',   completed: false, dateIso: null,         setsCount: 0,  tonnage: 0,      best1rm: 0 },
        { day: 'SABADO',    completed: false, dateIso: null,         setsCount: 0,  tonnage: 0,      best1rm: 0 },
      ],
    },
  };
}
