/**
 * Hypertrophy Tracker — Google Apps Script Web App Backend
 * Adjunto al spreadsheet: "Tracker Gym - Base de Datos"
 *
 * Configuración requerida (1 sola vez):
 *   Extensiones -> Apps Script -> Configuración del proyecto -> Propiedades de secuencia de comandos
 *   Agregar propiedad:
 *     Clave: APP_PIN
 *     Valor: <tu PIN privado, ej. 4829>
 *
 * Despliegue:
 *   Implementar -> Nueva implementación -> Aplicación web
 *   - Ejecutar como: Yo
 *   - Quién tiene acceso: Cualquier usuario
 */

var TZ = 'America/Montevideo';
var CANONICAL_DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'VIERNES', 'SABADO'];
var MUSCLE_GROUPS = ['Hombro/Brazo', 'Piernas', 'Pecho', 'Espalda'];
var EPLEY_FACTOR = 0.0333;

/**
 * GET ?action=bootstrap&pin=XXXX
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var authError = verifyPin_(params.pin);
    if (authError) return jsonResponse_(authError);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = String(params.action || 'bootstrap').trim();

    if (action === 'ping') {
      return jsonResponse_({ ok: true, message: 'pong', serverDateIso: todayIso_() });
    }
    if (action === 'bootstrap') {
      return jsonResponse_({ ok: true, data: buildBootstrapPayload_(ss) });
    }
    return jsonResponse_({ ok: false, code: 'UNKNOWN_ACTION', message: 'Acción GET no soportada: ' + action });
  } catch (err) {
    return jsonResponse_({ ok: false, code: 'SERVER_ERROR', message: String(err && err.message ? err.message : err) });
  }
}

/**
 * POST (Content-Type: text/plain;charset=utf-8 para evitar CORS preflight en Safari iOS)
 * Body JSON: { pin, action: 'saveSession', dateIso, day, replaceExisting?, sets: [...] }
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(rawBody);

    var authError = verifyPin_(payload.pin);
    if (authError) return jsonResponse_(authError);

    var action = String(payload.action || 'saveSession').trim();
    if (action !== 'saveSession') {
      return jsonResponse_({ ok: false, code: 'UNKNOWN_ACTION', message: 'Acción POST no soportada: ' + action });
    }

    lock.waitLock(15000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = saveSession_(ss, payload);
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ ok: false, code: 'SERVER_ERROR', message: String(err && err.message ? err.message : err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // Lock was not acquired
    }
  }
}

/* ==========================================================================
 * Auth & Response Helpers
 * ========================================================================== */

function verifyPin_(incomingPin) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_PIN');
  if (!expected) {
    return {
      ok: false,
      code: 'PIN_NOT_CONFIGURED',
      message: 'Falta configurar APP_PIN en Propiedades de secuencia de comandos de Apps Script.'
    };
  }
  if (String(incomingPin || '').trim() !== String(expected).trim()) {
    return {
      ok: false,
      code: 'PIN_INVALID',
      message: 'PIN incorrecto.'
    };
  }
  return null;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ==========================================================================
 * Date & Normalization Helpers
 * ========================================================================== */

function todayIso_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function toIsoDate_(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, TZ, 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, TZ, 'yyyy-MM-dd');
  }
  return '';
}

function isoToNoonDate_(iso) {
  var parts = String(iso).split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
}

function addDaysIso_(iso, days) {
  var d = isoToNoonDate_(iso);
  d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function getWeekBounds_(refIso) {
  var d = isoToNoonDate_(refIso);
  // getDay(): Sun=0, Mon=1..Sat=6 -> offset from Monday
  var jsDay = d.getDay();
  var offsetFromMon = (jsDay === 0) ? 6 : (jsDay - 1);
  var startIso = addDaysIso_(refIso, -offsetFromMon);
  var endIso = addDaysIso_(startIso, 6);
  var prevStartIso = addDaysIso_(startIso, -7);
  var prevEndIso = addDaysIso_(startIso, -1);
  return {
    startIso: startIso,
    endIso: endIso,
    prevStartIso: prevStartIso,
    prevEndIso: prevEndIso
  };
}

function normalizeKey_(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseNumber_(val, fallback) {
  if (val === '' || val === null || val === undefined) return fallback;
  if (typeof val === 'number' && !isNaN(val)) return val;
  var cleaned = String(val).trim().replace(',', '.');
  var num = Number(cleaned);
  return isNaN(num) ? fallback : num;
}

function parseBaseWeights_(raw, setsCount) {
  var text = String(raw || '').trim();
  var weights = [];
  if (text) {
    var parts = text.split('|');
    for (var i = 0; i < parts.length; i++) {
      var n = parseNumber_(parts[i], null);
      if (n !== null) weights.push(n);
    }
  }
  if (weights.length === 0) {
    for (var j = 0; j < setsCount; j++) weights.push(0);
    return weights;
  }
  while (weights.length < setsCount) {
    weights.push(weights[weights.length - 1]);
  }
  return weights.slice(0, setsCount);
}

/* ==========================================================================
 * Sheet Readers
 * ========================================================================== */

function readDictionary_(ss) {
  var sheet = ss.getSheetByName('Diccionario');
  if (!sheet) throw new Error('No se encontró la pestaña "Diccionario".');
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { byName: {}, byLookup: {}, list: [] };

  var headers = values[0].map(normalizeKey_);
  var idxOf = function(names) {
    for (var i = 0; i < names.length; i++) {
      var idx = headers.indexOf(names[i]);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  var cName = idxOf(['ejercicio']);
  var cGroup = idxOf(['grupo muscular']);
  var cUnil = idxOf(['¿es unilateral?', 'es unilateral', 'unilateral']);
  var cRepMin = idxOf(['rep_min', 'rep min']);
  var cRepMax = idxOf(['rep_max', 'rep max']);
  var cInc = idxOf(['incremento_kg', 'incremento kg']);
  var cRef = idxOf(['dia_referencia', 'dia referencia']);
  var cAlias = idxOf(['aliases', 'alias']);

  var byName = {};
  var byLookup = {};
  var list = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var name = String(cName >= 0 ? row[cName] : '').trim();
    if (!name) continue;

    var unilNorm = normalizeKey_(cUnil >= 0 ? row[cUnil] : '');
    var isUnilateral = (unilNorm === 'si' || unilNorm === 'yes' || unilNorm === 'true' || unilNorm === '1' || unilNorm === '2');
    var repMin = cRepMin >= 0 ? parseNumber_(row[cRepMin], null) : null;
    var repMax = cRepMax >= 0 ? parseNumber_(row[cRepMax], null) : null;
    var incKg = cInc >= 0 ? parseNumber_(row[cInc], isUnilateral ? 2.5 : 5.0) : (isUnilateral ? 2.5 : 5.0);
    var refDay = cRef >= 0 ? normalizeKey_(row[cRef]).toUpperCase() : '';
    if (CANONICAL_DAYS.indexOf(refDay) === -1) refDay = null;

    var aliasesRaw = cAlias >= 0 ? String(row[cAlias] || '').trim() : '';
    var aliases = aliasesRaw ? aliasesRaw.split(',').map(function(a) { return a.trim(); }).filter(Boolean) : [];

    var meta = {
      name: name,
      muscleGroup: String(cGroup >= 0 ? row[cGroup] : '').trim(),
      isUnilateral: isUnilateral,
      multiplier: isUnilateral ? 2 : 1,
      repMin: repMin,
      repMax: repMax,
      incrementKg: incKg,
      referenceDay: refDay,
      aliases: aliases
    };

    byName[name] = meta;
    byLookup[normalizeKey_(name)] = meta;
    for (var a = 0; a < aliases.length; a++) {
      var ak = normalizeKey_(aliases[a]);
      if (ak && !byLookup[ak]) byLookup[ak] = meta;
    }
    list.push(meta);
  }

  return { byName: byName, byLookup: byLookup, list: list };
}

function readRoutine_(ss) {
  var sheet = ss.getSheetByName('Rutina');
  if (!sheet) throw new Error('No se encontró la pestaña "Rutina".');
  var values = sheet.getDataRange().getValues();
  var routine = {};
  for (var d = 0; d < CANONICAL_DAYS.length; d++) {
    routine[CANONICAL_DAYS[d]] = [];
  }
  if (values.length < 2) return routine;

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var day = normalizeKey_(row[0]).toUpperCase();
    var order = parseNumber_(row[1], r);
    var exercise = String(row[2] || '').trim();
    var setsCount = Math.max(1, Math.round(parseNumber_(row[3], 2)));
    var baseWeights = parseBaseWeights_(row[4], setsCount);

    if (CANONICAL_DAYS.indexOf(day) === -1 || !exercise) continue;
    routine[day].push({
      order: order,
      exercise: exercise,
      setsCount: setsCount,
      baseWeights: baseWeights
    });
  }

  for (var k = 0; k < CANONICAL_DAYS.length; k++) {
    routine[CANONICAL_DAYS[k]].sort(function(a, b) { return a.order - b.order; });
  }
  return routine;
}

function readHistory_(ss) {
  var sheet = ss.getSheetByName('Base de Datos');
  if (!sheet) throw new Error('No se encontró la pestaña "Base de Datos".');
  var values = sheet.getDataRange().getValues();
  var records = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var dateIso = toIsoDate_(row[0]);
    var day = normalizeKey_(row[1]).toUpperCase();
    var exercise = String(row[3] || '').trim();
    if (!dateIso || !day || !exercise) continue;

    var weightKg = parseNumber_(row[5], 0);
    var reps = Math.round(parseNumber_(row[6], 0));
    var mult = Math.round(parseNumber_(row[7], 1));
    var tonnage = Math.round(weightKg * reps * mult * 100) / 100;
    var est1rm = Math.round(weightKg * (1 + EPLEY_FACTOR * reps) * 100) / 100;

    records.push({
      rowNumber: r + 1,
      dateIso: dateIso,
      day: day,
      muscleGroup: String(row[2] || '').trim(),
      exercise: exercise,
      setNumber: Math.round(parseNumber_(row[4], 1)),
      weightKg: weightKg,
      reps: reps,
      multiplier: mult,
      tonnage: tonnage,
      est1rm: est1rm,
      obs: String(row[10] || '').trim()
    });
  }
  return records;
}

/* ==========================================================================
 * Bootstrap Payload Builder
 * ========================================================================== */

function buildBootstrapPayload_(ss) {
  var serverDateIso = todayIso_();
  var weekRange = getWeekBounds_(serverDateIso);
  var dict = readDictionary_(ss);
  var routine = readRoutine_(ss);
  var records = readHistory_(ss);

  // Group records by day -> dateIso -> exercise -> sets[]
  var byDayDate = {};
  for (var d = 0; d < CANONICAL_DAYS.length; d++) {
    byDayDate[CANONICAL_DAYS[d]] = {};
  }

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    if (!byDayDate[rec.day]) byDayDate[rec.day] = {};
    if (!byDayDate[rec.day][rec.dateIso]) byDayDate[rec.day][rec.dateIso] = {};
    if (!byDayDate[rec.day][rec.dateIso][rec.exercise]) {
      byDayDate[rec.day][rec.dateIso][rec.exercise] = [];
    }
    byDayDate[rec.day][rec.dateIso][rec.exercise].push({
      setNumber: rec.setNumber,
      weightKg: rec.weightKg,
      reps: rec.reps,
      multiplier: rec.multiplier,
      tonnage: rec.tonnage,
      est1rm: rec.est1rm,
      obs: rec.obs
    });
  }

  var lastSessionsByDay = {};
  var loggedThisWeek = {};

  for (var di = 0; di < CANONICAL_DAYS.length; di++) {
    var dayName = CANONICAL_DAYS[di];
    var datesMap = byDayDate[dayName] || {};
    var sortedDates = Object.keys(datesMap).sort(); // ascending YYYY-MM-DD

    if (sortedDates.length > 0) {
      var latestDate = sortedDates[sortedDates.length - 1];
      var latestExercises = sortExercisesSets_(datesMap[latestDate]);
      lastSessionsByDay[dayName] = {
        dateIso: latestDate,
        exercises: latestExercises
      };

      // Check if logged in current week
      for (var sIdx = sortedDates.length - 1; sIdx >= 0; sIdx--) {
        var dt = sortedDates[sIdx];
        if (dt >= weekRange.startIso && dt <= weekRange.endIso) {
          var daySets = 0;
          var dayTonnage = 0;
          var dayBest1rm = 0;
          var exMap = datesMap[dt];
          Object.keys(exMap).forEach(function(exName) {
            exMap[exName].forEach(function(s) {
              daySets += 1;
              dayTonnage += s.tonnage;
              if (s.est1rm > dayBest1rm) dayBest1rm = s.est1rm;
            });
          });
          loggedThisWeek[dayName] = {
            dateIso: dt,
            setsCount: daySets,
            tonnage: Math.round(dayTonnage * 10) / 10,
            best1rm: Math.round(dayBest1rm * 10) / 10
          };
          break;
        }
      }
    } else {
      lastSessionsByDay[dayName] = null;
    }
  }

  // Weekly Summary (current week vs previous week)
  var weeklySummary = computeWeeklySummary_(records, weekRange, loggedThisWeek);

  return {
    spreadsheetUrl: ss.getUrl(),
    serverDateIso: serverDateIso,
    weekRange: weekRange,
    dictionary: dict.byName,
    routine: routine,
    lastSessionsByDay: lastSessionsByDay,
    loggedThisWeek: loggedThisWeek,
    weeklySummary: weeklySummary
  };
}

function sortExercisesSets_(exMap) {
  var out = {};
  Object.keys(exMap).forEach(function(exName) {
    out[exName] = exMap[exName].slice().sort(function(a, b) {
      return a.setNumber - b.setNumber;
    });
  });
  return out;
}

function computeWeeklySummary_(records, weekRange, loggedThisWeek) {
  var groupStats = {};
  for (var g = 0; g < MUSCLE_GROUPS.length; g++) {
    groupStats[MUSCLE_GROUPS[g]] = {
      muscleGroup: MUSCLE_GROUPS[g],
      sets: 0,
      reps: 0,
      tonnage: 0,
      prevTonnage: 0
    };
  }

  var totalSets = 0;
  var totalReps = 0;
  var totalTonnage = 0;
  var prevTotalTonnage = 0;

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var bucket = groupStats[rec.muscleGroup];
    if (rec.dateIso >= weekRange.startIso && rec.dateIso <= weekRange.endIso) {
      totalSets += 1;
      totalReps += rec.reps;
      totalTonnage += rec.tonnage;
      if (bucket) {
        bucket.sets += 1;
        bucket.reps += rec.reps;
        bucket.tonnage += rec.tonnage;
      }
    } else if (rec.dateIso >= weekRange.prevStartIso && rec.dateIso <= weekRange.prevEndIso) {
      prevTotalTonnage += rec.tonnage;
      if (bucket) {
        bucket.prevTonnage += rec.tonnage;
      }
    }
  }

  var byMuscleGroup = MUSCLE_GROUPS.map(function(grp) {
    var b = groupStats[grp];
    var ton = Math.round(b.tonnage * 10) / 10;
    var prev = Math.round(b.prevTonnage * 10) / 10;
    return {
      muscleGroup: grp,
      sets: b.sets,
      reps: b.reps,
      tonnage: ton,
      prevTonnage: prev,
      deltaKg: Math.round((ton - prev) * 10) / 10,
      deltaPct: prev > 0 ? Math.round(((ton - prev) / prev) * 1000) / 10 : null
    };
  });

  var daysCompleted = 0;
  var adherence = CANONICAL_DAYS.map(function(dayName) {
    var info = loggedThisWeek[dayName] || null;
    if (info) daysCompleted += 1;
    return {
      day: dayName,
      completed: Boolean(info),
      dateIso: info ? info.dateIso : null,
      setsCount: info ? info.setsCount : 0,
      tonnage: info ? info.tonnage : 0,
      best1rm: info ? info.best1rm : 0
    };
  });

  totalTonnage = Math.round(totalTonnage * 10) / 10;
  prevTotalTonnage = Math.round(prevTotalTonnage * 10) / 10;

  return {
    totalSets: totalSets,
    totalReps: totalReps,
    totalTonnage: totalTonnage,
    prevTotalTonnage: prevTotalTonnage,
    deltaKg: Math.round((totalTonnage - prevTotalTonnage) * 10) / 10,
    deltaPct: prevTotalTonnage > 0 ? Math.round(((totalTonnage - prevTotalTonnage) / prevTotalTonnage) * 1000) / 10 : null,
    daysCompleted: daysCompleted,
    totalDays: CANONICAL_DAYS.length,
    byMuscleGroup: byMuscleGroup,
    adherence: adherence
  };
}

/* ==========================================================================
 * Save Session (Idempotent + Typed Values + Locale-Safe Formulas)
 * ========================================================================== */

function saveSession_(ss, payload) {
  var day = normalizeKey_(payload.day).toUpperCase();
  if (CANONICAL_DAYS.indexOf(day) === -1) {
    return { ok: false, code: 'INVALID_DAY', message: 'Día inválido: ' + payload.day };
  }

  var dateIso = String(payload.dateIso || todayIso_()).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return { ok: false, code: 'INVALID_DATE', message: 'Fecha inválida (esperado YYYY-MM-DD): ' + dateIso };
  }

  var incomingSets = Array.isArray(payload.sets) ? payload.sets : [];
  var dict = readDictionary_(ss);

  // Filter & validate completed sets (ignore blank/0 reps)
  var validRows = [];
  var unknown = [];
  for (var i = 0; i < incomingSets.length; i++) {
    var item = incomingSets[i];
    var reps = Math.round(parseNumber_(item.reps, 0));
    if (reps <= 0) continue;

    var weightKg = Math.abs(parseNumber_(item.weightKg, 0));
    var rawEx = String(item.exercise || '').trim();
    var meta = dict.byLookup[normalizeKey_(rawEx)];
    if (!meta) {
      if (unknown.indexOf(rawEx) === -1) unknown.push(rawEx);
      continue;
    }

    validRows.push({
      dateObj: isoToNoonDate_(dateIso),
      day: day,
      muscleGroup: meta.muscleGroup,
      exercise: meta.name,
      setNumber: Math.max(1, Math.round(parseNumber_(item.setNumber, 1))),
      weightKg: weightKg,
      reps: reps,
      multiplier: meta.multiplier,
      obs: String(item.obs || '').trim()
    });
  }

  if (unknown.length > 0) {
    return {
      ok: false,
      code: 'UNKNOWN_EXERCISES',
      message: 'Ejercicios no encontrados en Diccionario: ' + unknown.join(', ')
    };
  }

  if (validRows.length === 0) {
    return {
      ok: false,
      code: 'EMPTY_SESSION',
      message: 'No hay series con repeticiones cargadas para guardar.'
    };
  }

  var bdSheet = ss.getSheetByName('Base de Datos');
  if (!bdSheet) throw new Error('No se encontró la pestaña "Base de Datos".');

  // Idempotency check for (dateIso, day)
  var existingValues = bdSheet.getDataRange().getValues();
  var matchingRowIndices = []; // 1-based sheet row numbers
  for (var r = 1; r < existingValues.length; r++) {
    var rDate = toIsoDate_(existingValues[r][0]);
    var rDay = normalizeKey_(existingValues[r][1]).toUpperCase();
    if (rDate === dateIso && rDay === day) {
      matchingRowIndices.push(r + 1);
    }
  }

  if (matchingRowIndices.length > 0 && !payload.replaceExisting) {
    return {
      ok: false,
      code: 'DUPLICATE_SESSION',
      message: 'Ya existe una sesión guardada para ' + day + ' (' + dateIso + ') con ' + matchingRowIndices.length + ' series.',
      existingCount: matchingRowIndices.length
    };
  }

  // If replacing an existing session for the same (dateIso, day), delete bottom-to-top
  if (matchingRowIndices.length > 0 && payload.replaceExisting) {
    for (var del = matchingRowIndices.length - 1; del >= 0; del--) {
      bdSheet.deleteRow(matchingRowIndices[del]);
    }
  }

  var startRow = bdSheet.getLastRow() + 1;
  var numRows = validRows.length;

  var staticCols = validRows.map(function(v) {
    return [
      v.dateObj,
      v.day,
      v.muscleGroup,
      v.exercise,
      v.setNumber,
      v.weightKg,
      v.reps,
      v.multiplier
    ];
  });

  // Write columns A:H with strict native types
  var rangeAH = bdSheet.getRange(startRow, 1, numRows, 8);
  rangeAH.setValues(staticCols);
  bdSheet.getRange(startRow, 1, numRows, 1).setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center');
  bdSheet.getRange(startRow, 2, numRows, 1).setHorizontalAlignment('center');
  bdSheet.getRange(startRow, 5, numRows, 1).setNumberFormat('0').setHorizontalAlignment('center');
  bdSheet.getRange(startRow, 6, numRows, 1).setNumberFormat('0.0').setHorizontalAlignment('right');
  bdSheet.getRange(startRow, 7, numRows, 1).setNumberFormat('0').setHorizontalAlignment('center');
  bdSheet.getRange(startRow, 8, numRows, 1).setNumberFormat('0').setHorizontalAlignment('center');

  // Write locale-independent R1C1 formulas for Tonelaje (I) and 1RM Estimado (J)
  var formulasIJ = [];
  for (var f = 0; f < numRows; f++) {
    formulasIJ.push([
      '=RC[-3]*RC[-2]*RC[-1]',
      '=RC[-4]*(1+(333/10000*RC[-3]))'
    ]);
  }
  bdSheet.getRange(startRow, 9, numRows, 2)
    .setFormulasR1C1(formulasIJ)
    .setNumberFormat('0.0')
    .setHorizontalAlignment('right');

  // Write Obs column (K)
  var obsCol = validRows.map(function(v) { return [v.obs]; });
  bdSheet.getRange(startRow, 11, numRows, 1).setValues(obsCol).setHorizontalAlignment('left');

  // Consistent typography matching existing Base de Datos rows
  bdSheet.getRange(startRow, 1, numRows, 11)
    .setFontFamily('Montserrat')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  SpreadsheetApp.flush();

  return {
    ok: true,
    insertedCount: numRows,
    replaced: matchingRowIndices.length > 0,
    dateIso: dateIso,
    day: day,
    data: buildBootstrapPayload_(ss)
  };
}
