/**
 * KMJ-Lite Hybrid Assessment Engine
 * - Short-sound mode (vokal, konsonan, suku_kata_kv): record + teacher review
 * - Word mode (perkataan*, ayat): Malay Web Speech (ms-MY) token matching
 */
(function (global) {
  "use strict";

  const DB_NAME = "kmj_lite_assessment";
  const DB_VERSION = 3;
  const STORE_NAME = "recordings";
  const ROSTER_STORE_NAME = "student_roster";
  const DEFAULT_MAX_ROSTER_STUDENTS = 40;
  const ROSTER_LIMIT_MSG = "Had maksimum lesen dicapai.";
  const LICENSE_STORAGE_KEY = "kmj_license_activation";
  const STUDENT_HOME_MODE_KEY = "kmj_student_home_mode";
  const LICENSE_OFFLINE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
  const LICENSE_EXPIRED_OFFLINE_MSG =
    "Lesen tamat tempoh. Sila sambung internet untuk pengesahan lesen.";

  const REFERENCE_AUDIO_BASE = "audio";

  const SHORT_SOUND_CHECKPOINTS = ["vokal", "konsonan", "suku_kata_kv"];
  const DEFERRED_CHECKPOINTS = SHORT_SOUND_CHECKPOINTS;
  const AI_CHECKPOINTS = ["perkataan_vkv", "perkataan_kvkv"];

  const MAX_RECORD_MS = 5000;
  const SPEECH_TIMEOUT_MS = 3500;
  const MINIMUM_CONFIDENCE = 0.75;
  const SPEECH_INFRASTRUCTURE_ERRORS = [
    "not-allowed",
    "network",
    "service-not-allowed",
    "audio-capture",
  ];

  const SCORE_AI_PASS = 90;
  const SCORE_AI_FAIL = 45;

  const AI_RESULT_PASS = "AI Lulus";
  const AI_RESULT_RETRY = "AI Cuba Lagi";
  const FINAL_WAITING_TP = "Menunggu TP Guru";
  const FINAL_PENDING_GURU = "Pending Guru";
  const RESULT_SOURCE_GURU = "Guru";
  const RESULT_SOURCE_AI = "AI";
  const RESULT_SOURCE_PENDING = "Pending";

  const STATUS_TEACHER_WAITING = "Menunggu Semakan Guru";
  const STATUS_PENDING_REVIEW = STATUS_TEACHER_WAITING;

  const MOBILE_AUDIO_CONSTRAINTS = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      channelCount: 1,
    },
  };

  const MIC_SECURE_ALERT =
    "Akses Mic Disekat! Sila pastikan link laman web bermula dengan 'https://' untuk keselamatan telefon pintar.";

  const SPEECH_INSECURE_ALERT =
    "Pengecaman suara tidak tersedia pada HTTP. Sila guna pautan yang bermula dengan 'https://' pada telefon pintar.";

  const RECORDER_MIME_CANDIDATES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  const TP_LEVELS = ["TP1", "TP2", "TP3", "TP4", "TP5", "TP6"];

  const TP_SCORES = {
    TP1: 17,
    TP2: 33,
    TP3: 50,
    TP4: 67,
    TP5: 83,
    TP6: 100,
  };

  const PHONETIC_LEAK_PATTERNS = [
    "happy",
    "eboo",
    "e-boo",
    "heboo",
    "he-boo",
    "a p",
    "e boo",
    "he boo",
  ];

  /** Paste your deployed Apps Script Web App URL here for manual result sync */
  const KMJ_SYNC_ENDPOINT = "https://script.google.com/macros/s/AKfycbwz77lQooPONeYbQWSHUQ-xfLrwQ2A5ILNoj7RPgePzFzkKlOg8q48OIB92sVuEMmK3/exec";  /** @deprecated Use KMJ_SYNC_ENDPOINT */
  const GOOGLE_SHEETS_WEBAPP_URL = KMJ_SYNC_ENDPOINT;

  const SYNC_STATUS_PENDING = "pending";
  const SYNC_STATUS_SYNCED = "synced";
  const SYNC_STATUS_FAILED = "failed";
  const ROSTER_SYNC_COOLDOWN_MS = 60000;

  const REFERENCE_AUDIO_FOLDERS = {
    vokal: "vokal",
    konsonan: "konsonan",
    suku_kata_kv: "suku_kata_kv",
    perkataan_vkv: "perkataan_vkv",
    perkataan_kvkv: "perkataan_kvkv",
  };

  let dbPromise = null;
  let activeCapture = null;
  let activeRecognition = null;
  let isSyncing = false;
  let lastRosterCloudSyncAt = 0;

  function log() {
    const args = Array.prototype.slice.call(arguments);
    args.unshift("[KMJ]");
    console.log.apply(console, args);
  }

  function isInsecureOrigin() {
    return global.isSecureContext === false;
  }

  function getSpeechRecognitionConstructor() {
    return (
      global.SpeechRecognition ||
      global.webkitSpeechRecognition ||
      global.mozSpeechRecognition ||
      global.msSpeechRecognition ||
      global.oSpeechRecognition ||
      null
    );
  }

  function handleMicrophoneError(error) {
    if (isInsecureOrigin()) {
      const secureError = new Error(MIC_SECURE_ALERT);
      secureError.code = "insecure-mic";
      throw secureError;
    }

    throw error || new Error("Akses mikrofon ditolak.");
  }

  function selectSupportedMimeType() {
    if (typeof MediaRecorder === "undefined") {
      return "";
    }

    if (typeof MediaRecorder.isTypeSupported !== "function") {
      return "audio/webm";
    }

    let i;

    for (i = 0; i < RECORDER_MIME_CANDIDATES.length; i += 1) {
      if (MediaRecorder.isTypeSupported(RECORDER_MIME_CANDIDATES[i])) {
        log("MediaRecorder mime:", RECORDER_MIME_CANDIDATES[i]);
        return RECORDER_MIME_CANDIDATES[i];
      }
    }

    return "";
  }

  function createMediaRecorder(stream) {
    const mimeType = selectSupportedMimeType();

    if (mimeType) {
      try {
        return new MediaRecorder(stream, { mimeType: mimeType });
      } catch (error) {
        log("MediaRecorder mime fallback:", mimeType, error);
      }
    }

    return new MediaRecorder(stream);
  }

  function isPendingReviewStatus(status) {
    return (
      status === STATUS_TEACHER_WAITING ||
      status === "Pending Review" ||
      status === "pending_teacher_review" ||
      status === "pending_review"
    );
  }

  function getClassId() {
    return global.sessionStorage.getItem("kmj_class_id") || "";
  }

  function setClassId(classId) {
    global.sessionStorage.setItem("kmj_class_id", String(classId || "").trim());
  }

  function getStudentName() {
    return global.sessionStorage.getItem("kmj_student_name") || "";
  }

  function setStudentName(studentName) {
    global.sessionStorage.setItem("kmj_student_name", String(studentName || "").trim());
  }

  function setStudentSession(session) {
    setClassId(session.classId);
    setStudentId(session.studentId);
    setStudentName(session.studentName);
  }

  function getLoggedInStudent() {
    const classId = getClassId();
    const studentId = getStudentId();
    const studentName = getStudentName();

    if (!classId || !studentId || !studentName) {
      return null;
    }

    return {
      classId: classId,
      studentId: studentId,
      studentName: studentName,
    };
  }

  function getSessionStudentContext() {
    const loggedIn = getLoggedInStudent();

    if (loggedIn) {
      return loggedIn;
    }

    return {
      classId: "Unknown",
      studentId: "Unknown",
      studentName: "Unknown",
    };
  }

  function resolveStudentName(record) {
    if (record && record.studentName && String(record.studentName).trim()) {
      return String(record.studentName).trim();
    }

    if (record && record.studentId && String(record.studentId).indexOf("pelajar_") !== 0) {
      return String(record.studentId);
    }

    return "Unknown";
  }

  function resolveClassId(record) {
    const classId = record && record.classId != null ? String(record.classId).trim() : "";

    if (!classId || classId === "NaN") {
      return "Unknown";
    }

    return classId;
  }

  function getStudentDisplayName(studentIdOrRecord) {
    if (studentIdOrRecord && typeof studentIdOrRecord === "object") {
      return resolveStudentName(studentIdOrRecord);
    }

    const custom = getStudentName();

    if (custom && custom.trim()) {
      return custom.trim();
    }

    if (studentIdOrRecord && String(studentIdOrRecord).indexOf("pelajar_") !== 0) {
      return String(studentIdOrRecord);
    }

    return "Unknown";
  }

  function rosterSlugPart(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function makeRosterStudentId(classId, studentName) {
    return rosterSlugPart(classId) + "__" + rosterSlugPart(studentName);
  }

  function rosterKey(classId, studentName) {
    return normalizeMalayText(classId) + "|" + normalizeMalayText(studentName);
  }

  function rosterCloudKey(schoolCode, classId, studentName) {
    return (
      normalizeMalayText(schoolCode) +
      "|" +
      normalizeMalayText(classId) +
      "|" +
      normalizeMalayText(studentName)
    );
  }

  function getCategoryFromCheckpoint(checkpointId) {
    return String(checkpointId || "");
  }

  function toIsoTimestamp(value) {
    if (!value && value !== 0) {
      return "";
    }

    let date = null;

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) {
        return "";
      }

      const parsed = new Date(trimmed);

      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
      }
    } else if (typeof value === "number") {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
      }
    } else if (value instanceof Date && !Number.isNaN(value.getTime())) {
      date = value;
    }

    if (!date) {
      return "";
    }

    return date.toISOString();
  }

  function timestampSortValue(record) {
    const iso = toIsoTimestamp(record && record.timestamp);

    if (!iso) {
      return -1;
    }

    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? -1 : parsed;
  }

  function normalizeIdentityText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function buildAttemptKey(classId, studentId, checkpointId, targetText) {
    return [
      normalizeIdentityText(classId),
      normalizeIdentityText(studentId),
      normalizeIdentityText(checkpointId),
      normalizeIdentityText(targetText),
    ].join("|");
  }

  function buildSchoolScopedAttemptKey(
    schoolCode,
    classId,
    studentId,
    checkpointId,
    targetText
  ) {
    return (
      normalizeIdentityText(schoolCode) +
      "|" +
      buildAttemptKey(classId, studentId, checkpointId, targetText)
    );
  }

  function buildAttemptKeyFromRecord(record) {
    if (!record) {
      return "";
    }

    return buildAttemptKey(
      record.classId,
      record.studentId,
      record.checkpointId,
      record.targetText
    );
  }

  function buildLatestRecordKey(
    schoolCode,
    classId,
    studentId,
    checkpointId,
    targetText
  ) {
    return buildSchoolScopedAttemptKey(
      schoolCode,
      classId,
      studentId,
      checkpointId,
      targetText
    );
  }

  function buildLatestRecordKeyFromRecord(record) {
    if (!record) {
      return "";
    }

    return buildLatestRecordKey(
      record.schoolCode || getSchoolCode(),
      record.classId,
      record.studentId,
      record.checkpointId,
      record.targetText
    );
  }

  function getLatestAttemptRecords(records) {
    const latestMap = {};
    let i;
    let row;
    let key;
    let existing;

    for (i = 0; i < records.length; i += 1) {
      row = records[i];
      key = buildLatestRecordKeyFromRecord(row);

      if (!key) {
        continue;
      }

      existing = latestMap[key];

      if (!existing || timestampSortValue(row) >= timestampSortValue(existing)) {
        latestMap[key] = row;
      }
    }

    return Object.keys(latestMap).map(function (mapKey) {
      return latestMap[mapKey];
    });
  }

  function dedupeSyncRecordsByLatestKey(records) {
    const latest = getLatestAttemptRecords(records);
    const pending = {};

    latest.forEach(function (record) {
      const key = buildLatestRecordKeyFromRecord(record);

      if (key) {
        pending[key] = record;
      }
    });

    return Object.keys(pending).map(function (mapKey) {
      return pending[mapKey];
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const dataUrl = String(reader.result || "");
        const commaIndex = dataUrl.indexOf(",");

        if (commaIndex === -1) {
          reject(new Error("Format audio base64 tidak sah."));
          return;
        }

        resolve(dataUrl.slice(commaIndex + 1));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("Gagal baca audio blob."));
      };
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(base64, mimeType) {
    if (!base64 || typeof base64 !== "string") {
      return null;
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    let i;

    for (i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mimeType || "application/octet-stream" });
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") {
      return null;
    }

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

    if (!match) {
      return null;
    }

    return base64ToBlob(match[2], match[1]);
  }

  function normalizeRecord(record) {
    if (!record) {
      return null;
    }

    const r = Object.assign({}, record);
    const checkpointId = r.checkpointId || "";
    const shortSound = isShortSoundCheckpoint(checkpointId);

    r.classId = resolveClassId(r);
    r.schoolCode = String(r.schoolCode || "").trim();
    r.studentName = resolveStudentName(r);
    r.category = r.category || getCategoryFromCheckpoint(checkpointId);
    r.transcript = r.transcript != null ? r.transcript : "";
    r.confidence =
      r.confidence !== undefined && r.confidence !== null ? r.confidence : "";
    r.teacherTP = r.teacherTP || r.tpLevel || "";
    r.aiResult = r.aiResult != null ? r.aiResult : "";
    r.aiScore = r.aiScore !== undefined && r.aiScore !== null ? r.aiScore : "";
    r.timestamp = toIsoTimestamp(r.timestamp);

    if (r.teacherTP) {
      r.resultSource = RESULT_SOURCE_GURU;
      r.finalResult = r.teacherTP;
    } else if (!r.finalResult) {
      if (r.status === "ai_verified") {
        r.aiResult = AI_RESULT_PASS;
        r.aiScore = SCORE_AI_PASS;
        r.finalResult = AI_RESULT_PASS;
        r.resultSource = RESULT_SOURCE_AI;
      } else if (r.status === "ai_failed") {
        r.aiResult = AI_RESULT_RETRY;
        r.aiScore = SCORE_AI_FAIL;
        r.finalResult = AI_RESULT_RETRY;
        r.resultSource = RESULT_SOURCE_AI;
      } else if (shortSound && isPendingReviewStatus(r.status)) {
        r.aiResult = "";
        r.aiScore = "";
        r.teacherTP = "";
        r.finalResult = FINAL_PENDING_GURU;
        r.resultSource = RESULT_SOURCE_PENDING;
      }
    }

    if (
      shortSound &&
      !r.teacherTP &&
      (r.resultSource === RESULT_SOURCE_PENDING ||
        r.finalResult === FINAL_PENDING_GURU ||
        r.finalResult === FINAL_WAITING_TP)
    ) {
      r.teacherTP = "";
      r.finalResult = FINAL_PENDING_GURU;
      r.resultSource = RESULT_SOURCE_PENDING;
    }

    r.tpLevel = r.tpLevel || r.teacherTP || "";

    if (
      r.syncStatus !== SYNC_STATUS_PENDING &&
      r.syncStatus !== SYNC_STATUS_SYNCED &&
      r.syncStatus !== SYNC_STATUS_FAILED
    ) {
      r.syncStatus = SYNC_STATUS_PENDING;
    }

    return r;
  }

  function recordToSyncPayload(record) {
    const r = normalizeRecord(record);

    return {
      id: r.id || "",
      schoolCode: r.schoolCode || getSchoolCode(),
      classId: r.classId || "",
      studentId: r.studentId || "",
      studentName: r.studentName || "",
      checkpointId: r.checkpointId || "",
      category: r.category || "",
      targetText: r.targetText || "",
      transcript: r.transcript || "",
      confidence: r.confidence !== "" ? r.confidence : "",
      aiResult: r.aiResult || "",
      aiScore: r.aiScore !== "" ? r.aiScore : "",
      teacherTP: r.teacherTP || "",
      finalResult: r.finalResult || "",
      resultSource: r.resultSource || "",
      timestamp: r.timestamp || "",
    };
  }

  function cabaranSummaryToSyncPayload(summary) {
    return {
      schoolCode: String((summary && summary.schoolCode) || getSchoolCode() || "").trim(),
      classId: String((summary && summary.classId) || "").trim(),
      studentId: String((summary && summary.studentId) || "").trim(),
      studentName: String((summary && summary.studentName) || "").trim(),
      checkpointId: String((summary && summary.checkpointId) || "").trim(),
      totalCorrect:
        summary && summary.totalCorrect !== undefined && summary.totalCorrect !== null
          ? summary.totalCorrect
          : "",
      totalQuestions:
        summary &&
        summary.totalQuestions !== undefined &&
        summary.totalQuestions !== null
          ? summary.totalQuestions
          : "",
      percentage:
        summary && summary.percentage !== undefined && summary.percentage !== null
          ? summary.percentage
          : "",
      suggestedTP: String((summary && summary.suggestedTP) || "").trim(),
      cabaranCompleted: summary ? summary.cabaranCompleted !== false : true,
      updatedAt: String((summary && summary.updatedAt) || new Date().toISOString()).trim(),
    };
  }

  async function syncCabaranSummariesToGoogleSheet(summaries) {
    if (!isSyncEndpointConfigured()) {
      throw new Error(
        "Sila tetapkan KMJ_SYNC_ENDPOINT dalam pronunciation-verify.js."
      );
    }

    if (isBrowserOffline()) {
      return { ok: false, reason: "offline" };
    }

    const records = (summaries || [])
      .map(cabaranSummaryToSyncPayload)
      .filter(function (record) {
        return (
          record.schoolCode &&
          record.classId &&
          record.studentId &&
          record.checkpointId
        );
      });

    if (!records.length) {
      return { ok: false, reason: "empty" };
    }

    let response = null;
    let result = null;
    let responseText = "";

    try {
      response = await fetch(KMJ_SYNC_ENDPOINT, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "syncCabaranSummaries",
          records: records,
        }),
      });

      responseText = await response.text();

      try {
        result = responseText ? JSON.parse(responseText) : {};
        console.log("[KMJ] Cabaran summary sync response:", result);
      } catch (parseError) {
        console.error("[KMJ] Cabaran summary sync invalid JSON", {
          parseError: parseError,
          responseText: responseText,
          status: response.status,
        });
        throw new Error(
          "Respons tidak sah daripada server: " +
            String(responseText || "").slice(0, 180)
        );
      }

      if (!response.ok || result.success !== true) {
        const failMessage = buildSyncErrorMessage(
          null,
          response,
          responseText,
          result
        );
        throw new Error(failMessage);
      }

      return {
        ok: true,
        inserted: result.inserted || 0,
        updated: result.updated || 0,
      };
    } catch (syncError) {
      console.error("[KMJ] Cabaran summary sync error", syncError);
      throw syncError;
    }
  }

  async function getSyncStatusCounts() {
    const all = getLatestAttemptRecords(await getAllRecordings());
    let pendingCount = 0;
    let syncedCount = 0;
    let i;
    let status;

    for (i = 0; i < all.length; i += 1) {
      status = all[i].syncStatus || SYNC_STATUS_PENDING;

      if (status === SYNC_STATUS_SYNCED) {
        syncedCount += 1;
      } else {
        pendingCount += 1;
      }
    }

    return {
      pending: pendingCount,
      synced: syncedCount,
      total: all.length,
    };
  }

  async function getRecordsNeedingSync() {
    const all = await getAllRecordings();
    const latest = getLatestAttemptRecords(all);

    return latest
      .filter(function (record) {
        const status = record.syncStatus || SYNC_STATUS_PENDING;
        return status === SYNC_STATUS_PENDING || status === SYNC_STATUS_FAILED;
      })
      .map(normalizeRecord);
  }

  function isSyncEndpointConfigured() {
    const url = String(KMJ_SYNC_ENDPOINT || "").trim();
    return url && url.indexOf("PASTE_APPS_SCRIPT") === -1;
  }

  async function markRecordsSyncStatus(records, status) {
    let i;

    for (i = 0; i < records.length; i += 1) {
      await updateRecording(records[i].id, { syncStatus: status });
    }
  }

  async function markRecordsSyncStatusByIds(recordIds, status) {
    let i;

    for (i = 0; i < recordIds.length; i += 1) {
      if (recordIds[i]) {
        await updateRecording(recordIds[i], { syncStatus: status });
      }
    }
  }

  function isGoogleSheetSyncInProgress() {
    return isSyncing;
  }

  function isBrowserOffline() {
    return (
      typeof global.navigator !== "undefined" && global.navigator.onLine === false
    );
  }

  function buildSyncErrorMessage(fetchError, response, responseText, result) {
    if (isBrowserOffline()) {
      return "Tiada internet. Data disimpan offline.";
    }

    if (response) {
      if (response.status === 401 || response.status === 403) {
        return (
          "Ralat kebenaran HTTP " +
          response.status +
          ". Semak deployment Apps Script (Anyone)."
        );
      }

      if (!response.ok) {
        return (
          "HTTP " +
          response.status +
          ": " +
          ((result && result.error) || responseText || "Sync gagal.")
        );
      }

      if (!result || result.success !== true) {
        return (result && result.error) || "Respons server tidak sah.";
      }
    }

    if (fetchError) {
      const msg = fetchError.message || String(fetchError);

      if (
        msg.indexOf("Failed to fetch") !== -1 ||
        msg.indexOf("NetworkError") !== -1 ||
        msg.indexOf("Load failed") !== -1
      ) {
        return "Ralat fetch/CORS: " + msg;
      }

      return msg;
    }

    return "Sync gagal.";
  }

  async function syncPendingResultsToGoogleSheet() {
    if (isSyncing) {
      throw new Error("Sync sedang berjalan...");
    }

    if (!isSyncEndpointConfigured()) {
      throw new Error(
        "Sila tetapkan KMJ_SYNC_ENDPOINT dalam pronunciation-verify.js."
      );
    }

    if (isBrowserOffline()) {
      throw new Error("Tiada internet. Data disimpan offline.");
    }

    isSyncing = true;

    let batchRecordIds = [];
    let pendingRecords = [];

    try {
      await initDatabase();

      pendingRecords = dedupeSyncRecordsByLatestKey(await getRecordsNeedingSync());
      batchRecordIds = pendingRecords.map(function (record) {
        return record.id;
      });

      if (!pendingRecords.length) {
        const emptyCounts = await getSyncStatusCounts();

        return {
          ok: true,
          noPending: true,
          synced: 0,
          inserted: 0,
          updated: 0,
          failed: 0,
          pending: emptyCounts.pending,
          syncedCount: emptyCounts.synced,
          message:
            "Tiada rekod baharu untuk disync. Semua rekod tempatan sudah ditandakan sebagai synced.",
        };
      }

      const payload = {
        records: pendingRecords.map(recordToSyncPayload),
      };

      let response = null;
      let result = null;
      let responseText = "";

      try {
        response = await fetch(KMJ_SYNC_ENDPOINT, {
          method: "POST",
          redirect: "follow",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(payload),
        });

        responseText = await response.text();

        try {
          result = responseText ? JSON.parse(responseText) : {};
          console.log("Sync response:", result);
        } catch (parseError) {
          console.error("Roster sync failed: invalid JSON response", {
            parseError: parseError,
            responseText: responseText,
            status: response.status,
          });
          await markRecordsSyncStatusByIds(batchRecordIds, SYNC_STATUS_FAILED);
          throw new Error(
            "Respons tidak sah daripada server: " +
              String(responseText || "").slice(0, 180)
          );
        }

        if (!response.ok || result.success !== true) {
          const failMessage = buildSyncErrorMessage(
            null,
            response,
            responseText,
            result
          );
          console.error("Roster sync failed:", {
            status: response.status,
            result: result,
            responseText: responseText,
          });
          await markRecordsSyncStatusByIds(batchRecordIds, SYNC_STATUS_FAILED);
          throw new Error(failMessage);
        }
      } catch (syncError) {
        if (
          syncError &&
          syncError.message &&
          syncError.message.indexOf("Respons tidak sah") === 0
        ) {
          throw syncError;
        }

        if (
          syncError &&
          syncError.message &&
          (syncError.message.indexOf("HTTP ") === 0 ||
            syncError.message.indexOf("Ralat kebenaran") === 0 ||
            syncError.message.indexOf("Respons server") === 0)
        ) {
          throw syncError;
        }

        console.error("Roster sync failed:", syncError);
        const failMessage = buildSyncErrorMessage(
          syncError,
          response,
          responseText,
          result
        );

        if (batchRecordIds.length) {
          await markRecordsSyncStatusByIds(batchRecordIds, SYNC_STATUS_FAILED);
        }

        throw new Error(failMessage);
      }

      await markRecordsSyncStatusByIds(batchRecordIds, SYNC_STATUS_SYNCED);

      const counts = await getSyncStatusCounts();
      const inserted =
        typeof result.inserted === "number" ? result.inserted : 0;
      const updated = typeof result.updated === "number" ? result.updated : 0;

      return {
        ok: true,
        noPending: false,
        synced: batchRecordIds.length,
        inserted: inserted,
        updated: updated,
        failed: 0,
        pending: counts.pending,
        syncedCount: counts.synced,
        message:
          "Sync berjaya dihantar ke Google Sheet. Sila tunggu 5–10 saat dan refresh Google Sheet jika data belum kelihatan.\n\n" +
          "Ditambah: " +
          inserted +
          ", dikemas kini: " +
          updated,
      };
    } finally {
      isSyncing = false;
    }
  }

  async function getCabaranResultsFromGoogleSheet() {
    if (!isSyncEndpointConfigured()) {
      throw new Error(
        "Sila tetapkan KMJ_SYNC_ENDPOINT dalam pronunciation-verify.js."
      );
    }

    if (isBrowserOffline()) {
      throw new Error("Tiada internet. Data Cabaran PBD tidak dapat dimuat.");
    }

    const response = await fetch(KMJ_SYNC_ENDPOINT, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "getCabaranResults",
        schoolCode: getSchoolCode(),
      }),
    });
    const responseText = await response.text();
    let result = null;

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(
        "Respons tidak sah daripada server: " +
          String(responseText || "").slice(0, 180)
      );
    }

    if (!response.ok || !result || result.success !== true) {
      throw new Error(buildSyncErrorMessage(null, response, responseText, result));
    }

    if (!Array.isArray(result.records)) {
      throw new Error(
        "Apps Script belum ada action getCabaranResults. Deploy semula PBD_Results_Sync.gs."
      );
    }

    return result.records;
  }

  function getDisplayResult(record) {
    const r = normalizeRecord(record);

    if (!r) {
      return "";
    }

    if (r.resultSource === RESULT_SOURCE_GURU && r.teacherTP) {
      return r.teacherTP;
    }

    return r.finalResult || FINAL_WAITING_TP;
  }

  function recordNeedsTeacherReview(record) {
    const r = normalizeRecord(record);

    if (!r) {
      return false;
    }

    if (r.resultSource === RESULT_SOURCE_GURU && r.teacherTP) {
      return false;
    }

    if (isShortSoundCheckpoint(r.checkpointId)) {
      return (
        r.finalResult === FINAL_PENDING_GURU ||
        r.finalResult === FINAL_WAITING_TP
      );
    }

    if (isWordModeCheckpoint(r.checkpointId)) {
      return !!r.audioBlob && !r.teacherTP;
    }

    return isPendingReviewStatus(r.status) && !!r.audioBlob;
  }

  async function getPendingReviewRecords() {
    const records = await getTeacherDashboardRecords();
    return records.filter(recordNeedsTeacherReview);
  }

  async function getTeacherDashboardRecords() {
    await initDatabase();
    const all = await getAllRecordings();
    const latest = getLatestAttemptRecords(all);

    return latest
      .map(normalizeRecord)
      .sort(function (a, b) {
        return timestampSortValue(b) - timestampSortValue(a);
      });
  }

  function initMobileEnvironment() {
    log("Mobile init — secure context:", global.isSecureContext !== false);

    if (isInsecureOrigin()) {
      log("Warning: insecure origin — mic/speech may be blocked on mobile.");
    }

    schedulePendingSyncRetryOnLoad();

    return {
      secure: global.isSecureContext !== false,
      speechAvailable: !!getSpeechRecognitionConstructor(),
      mediaRecorderAvailable: typeof MediaRecorder !== "undefined",
    };
  }

  function notifySyncStatusChanged() {
    if (typeof global.dispatchEvent === "function") {
      global.dispatchEvent(new CustomEvent("kmj-sync-status-changed"));
    }
  }

  function schedulePendingSyncRetryOnLoad() {
    if (global.__kmjPendingSyncRetryBound) {
      return;
    }

    global.__kmjPendingSyncRetryBound = true;

    async function retryPendingSync() {
      if (!isSyncEndpointConfigured() || isBrowserOffline() || isSyncing) {
        notifySyncStatusChanged();
        return;
      }

      try {
        await initDatabase();
        const pending = await getRecordsNeedingSync();

        if (pending.length) {
          await syncPendingResultsToGoogleSheet();
        }
      } catch (retryError) {
        log("Pending sync retry skipped", retryError);
      }

      if (typeof global.KMJ_retryPendingCabaranSummariesSync === "function") {
        try {
          await global.KMJ_retryPendingCabaranSummariesSync();
        } catch (cabaranRetryError) {
          log("Cabaran summary sync retry skipped", cabaranRetryError);
        }
      }

      notifySyncStatusChanged();
    }

    global.addEventListener("online", function () {
      window.setTimeout(retryPendingSync, 500);
    });

    window.setTimeout(retryPendingSync, 1200);
  }

  async function tryAutoSyncAfterAssessment() {
    if (!isSyncEndpointConfigured()) {
      return { ok: false, skipped: true, reason: "no_endpoint" };
    }

    if (isBrowserOffline()) {
      return { ok: false, skipped: true, reason: "offline" };
    }

    try {
      const result = await syncPendingResultsToGoogleSheet();
      notifySyncStatusChanged();
      return result;
    } catch (syncError) {
      notifySyncStatusChanged();
      return {
        ok: false,
        skipped: false,
        error: syncError && syncError.message ? syncError.message : String(syncError),
      };
    }
  }

  async function getStudentSyncStatusSummary() {
    const session = getLoggedInStudent();

    if (!session) {
      return {
        label: "",
        hasPending: false,
        pendingCount: 0,
        syncedCount: 0,
      };
    }

    const all = await getAllRecordings();
    const latest = getLatestAttemptRecords(all).filter(function (record) {
      return (
        normalizeIdentityText(record.classId) ===
          normalizeIdentityText(session.classId) &&
        normalizeIdentityText(record.studentId) ===
          normalizeIdentityText(session.studentId)
      );
    });
    let pendingCount = 0;
    let syncedCount = 0;
    let i;
    let status;

    for (i = 0; i < latest.length; i += 1) {
      status = latest[i].syncStatus || SYNC_STATUS_PENDING;

      if (status === SYNC_STATUS_SYNCED) {
        syncedCount += 1;
      } else {
        pendingCount += 1;
      }
    }

    return {
      label: pendingCount > 0 ? "Belum Sync" : latest.length ? "Sudah Sync" : "",
      hasPending: pendingCount > 0,
      pendingCount: pendingCount,
      syncedCount: syncedCount,
    };
  }

  function generateId() {
    return "rec_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function isShortSoundCheckpoint(checkpointId) {
    return SHORT_SOUND_CHECKPOINTS.indexOf(checkpointId) !== -1;
  }

  function isDeferredCheckpoint(checkpointId) {
    return isShortSoundCheckpoint(checkpointId);
  }

  function isWordModeCheckpoint(checkpointId) {
    const id = String(checkpointId || "");

    if (id === "perkataan_vkv" || id === "perkataan_kvkv") {
      return true;
    }

    if (id.indexOf("perkataan") === 0) {
      return true;
    }

    if (id === "ayat" || id.indexOf("ayat_") === 0) {
      return true;
    }

    return false;
  }

  function isAiCheckpoint(checkpointId) {
    return isWordModeCheckpoint(checkpointId);
  }

  function getReferenceAudioPath(checkpoint, targetText) {
    const folder = REFERENCE_AUDIO_FOLDERS[checkpoint];
    const key = String(targetText || "").trim().toLowerCase();

    if (!folder || !key) {
      return null;
    }

    return REFERENCE_AUDIO_BASE + "/" + folder + "/" + key + ".mp3";
  }

  function normalizeMalayText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[.,!?;:'"()[\]\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenizeMalayText(text) {
    const normalized = normalizeMalayText(text);

    if (!normalized) {
      return [];
    }

    return normalized.split(" ").filter(function (token) {
      return token.length > 0;
    });
  }

  function containsTargetSequence(transcript, target) {
    const transcriptTokens = tokenizeMalayText(transcript);
    const targetTokens = tokenizeMalayText(target);
    let i;
    let j;
    let matched;

    if (!targetTokens.length || !transcriptTokens.length) {
      return false;
    }

    if (targetTokens.length === 1) {
      return transcriptTokens.indexOf(targetTokens[0]) !== -1;
    }

    for (i = 0; i <= transcriptTokens.length - targetTokens.length; i += 1) {
      matched = true;

      for (j = 0; j < targetTokens.length; j += 1) {
        if (transcriptTokens[i + j] !== targetTokens[j]) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return true;
      }
    }

    return false;
  }

  function isTextMatch(recognizedText, targetText) {
    return containsTargetSequence(recognizedText, targetText);
  }

  function normalizeSpeechText(text) {
    return normalizeMalayText(text);
  }

  function hasEnglishPhoneticLeak(alternatives) {
    let i;
    let j;
    let normAlt;
    let normLeak;

    if (!alternatives || !alternatives.length) {
      return false;
    }

    for (i = 0; i < alternatives.length; i += 1) {
      normAlt = normalizeMalayText(alternatives[i].transcript || "");

      if (!normAlt) {
        continue;
      }

      for (j = 0; j < PHONETIC_LEAK_PATTERNS.length; j += 1) {
        normLeak = normalizeMalayText(PHONETIC_LEAK_PATTERNS[j]);

        if (normLeak && normAlt.indexOf(normLeak) !== -1) {
          return true;
        }
      }
    }

    return false;
  }

  function getAlternativeConfidence(alt) {
    if (typeof alt.confidence === "number" && alt.confidence > 0) {
      return alt.confidence;
    }

    return null;
  }

  function evaluateWordModeSpeech(targetText, speech) {
    const alternatives = speech.alternatives || [];
    const transcript = String(speech.transcript || "").trim();
    let i;
    let alt;
    let tokenMatch;
    let confidence;
    let bestMatch = null;

    if (hasEnglishPhoneticLeak(alternatives)) {
      return {
        pass: false,
        failReason: "malay_only",
        transcript: transcript,
        confidence: speech.confidence,
        score: SCORE_AI_FAIL,
        aiResult: AI_RESULT_RETRY,
        aiScore: SCORE_AI_FAIL,
        finalResult: AI_RESULT_RETRY,
        resultSource: RESULT_SOURCE_AI,
      };
    }

    for (i = 0; i < alternatives.length; i += 1) {
      alt = alternatives[i];
      tokenMatch = containsTargetSequence(alt.transcript, targetText);

      if (!tokenMatch) {
        continue;
      }

      confidence = getAlternativeConfidence(alt);

      if (!bestMatch || (confidence !== null && confidence > (bestMatch.confidence || 0))) {
        bestMatch = {
          transcript: String(alt.transcript || "").trim(),
          confidence: confidence,
        };
      }
    }

    if (!bestMatch && transcript && containsTargetSequence(transcript, targetText)) {
      bestMatch = {
        transcript: transcript,
        confidence: typeof speech.confidence === "number" ? speech.confidence : null,
      };
    }

    if (!bestMatch) {
      return {
        pass: false,
        failReason: "no_match",
        transcript: transcript,
        confidence: speech.confidence,
        score: SCORE_AI_FAIL,
        aiResult: AI_RESULT_RETRY,
        aiScore: SCORE_AI_FAIL,
        finalResult: AI_RESULT_RETRY,
        resultSource: RESULT_SOURCE_AI,
      };
    }

    if (bestMatch.confidence === null) {
      return {
        pass: true,
        failReason: null,
        transcript: bestMatch.transcript,
        confidence: null,
        score: SCORE_AI_PASS,
        aiResult: AI_RESULT_PASS,
        aiScore: SCORE_AI_PASS,
        finalResult: AI_RESULT_PASS,
        resultSource: RESULT_SOURCE_AI,
      };
    }

    if (bestMatch.confidence >= MINIMUM_CONFIDENCE) {
      return {
        pass: true,
        failReason: null,
        transcript: bestMatch.transcript,
        confidence: bestMatch.confidence,
        score: SCORE_AI_PASS,
        aiResult: AI_RESULT_PASS,
        aiScore: SCORE_AI_PASS,
        finalResult: AI_RESULT_PASS,
        resultSource: RESULT_SOURCE_AI,
      };
    }

    return {
      pass: false,
      failReason: "unclear",
      transcript: bestMatch.transcript,
      confidence: bestMatch.confidence,
      score: SCORE_AI_FAIL,
      aiResult: AI_RESULT_RETRY,
      aiScore: SCORE_AI_FAIL,
      finalResult: AI_RESULT_RETRY,
      resultSource: RESULT_SOURCE_AI,
    };
  }

  function escapeCsvCell(value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  async function exportAllRecordsCsv() {
    await initDatabase();
    const all = getLatestAttemptRecords(await getAllRecordings());
    const header =
      "classId,studentName,studentId,checkpointId,category,targetText,transcript,confidence," +
      "aiResult,aiScore,teacherTP,finalResult,resultSource,timestamp,status,score,tpLevel,reviewType\n";
    let rows = header;
    let i;
    let record;
    let r;

    for (i = 0; i < all.length; i += 1) {
      r = normalizeRecord(all[i]);
      rows +=
        escapeCsvCell(r.classId) +
        "," +
        escapeCsvCell(r.studentName) +
        "," +
        escapeCsvCell(r.studentId) +
        "," +
        escapeCsvCell(r.checkpointId) +
        "," +
        escapeCsvCell(r.category) +
        "," +
        escapeCsvCell(r.targetText) +
        "," +
        escapeCsvCell(r.transcript) +
        "," +
        escapeCsvCell(r.confidence) +
        "," +
        escapeCsvCell(r.aiResult) +
        "," +
        escapeCsvCell(r.aiScore) +
        "," +
        escapeCsvCell(r.teacherTP) +
        "," +
        escapeCsvCell(r.finalResult) +
        "," +
        escapeCsvCell(r.resultSource) +
        "," +
        escapeCsvCell(r.timestamp) +
        "," +
        escapeCsvCell(r.status) +
        "," +
        escapeCsvCell(r.score) +
        "," +
        escapeCsvCell(r.tpLevel) +
        "," +
        escapeCsvCell(r.reviewType) +
        "\n";
    }

    return rows;
  }

  const DEFAULT_SCHOOL_CODE = "TEST001";

  function readLicenseActivation() {
    try {
      const raw = global.localStorage.getItem(LICENSE_STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);

      if (!parsed || !parsed.schoolCode) {
        return null;
      }

      return parsed;
    } catch (storageError) {
      return null;
    }
  }

  function saveLicenseActivation(activation) {
    global.localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(activation));
  }

  function clearLicenseActivation() {
    try {
      global.localStorage.removeItem(LICENSE_STORAGE_KEY);
    } catch (storageError) {
      /* ignore */
    }
  }

  function normalizeLicenseSchoolCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }

  function parseLicenseExpiryDate(value) {
    if (!value && value !== 0) {
      return null;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return null;
    }

    date.setHours(23, 59, 59, 999);
    return date;
  }

  function isLicenseExpiryDateValid(expiryDate) {
    const expiry = parseLicenseExpiryDate(expiryDate);

    if (!expiry) {
      return false;
    }

    return Date.now() <= expiry.getTime();
  }

  function isWithinOfflineGrace(activatedAt) {
    const activatedMs = new Date(activatedAt).getTime();

    if (isNaN(activatedMs)) {
      return false;
    }

    return Date.now() - activatedMs < LICENSE_OFFLINE_GRACE_MS;
  }

  function getLicenseStatus() {
    const license = readLicenseActivation();

    if (!license || !license.schoolCode) {
      return { active: false, reason: "not_activated" };
    }

    if (!isLicenseExpiryDateValid(license.expiryDate)) {
      return { active: false, reason: "expired" };
    }

    const online = global.navigator ? global.navigator.onLine !== false : true;

    if (!online && !isWithinOfflineGrace(license.activatedAt)) {
      return {
        active: false,
        reason: "offline_expired",
        message: LICENSE_EXPIRED_OFFLINE_MSG,
      };
    }

    return { active: true, license: license };
  }

  function isLicenseActive() {
    return getLicenseStatus().active;
  }

  function getMaxRosterStudents() {
    if (!isLicenseActive()) {
      return 0;
    }

    const license = readLicenseActivation();
    const maxStudents =
      license && license.maxStudents != null ? Number(license.maxStudents) : 0;

    if (maxStudents > 0) {
      return maxStudents;
    }

    return DEFAULT_MAX_ROSTER_STUDENTS;
  }

  async function validateLicenseOnline(schoolCode, adminEmail, licenseKey) {
    if (!isSyncEndpointConfigured()) {
      throw new Error("Endpoint lesen belum dikonfigurasi (KMJ_SYNC_ENDPOINT).");
    }

    if (global.navigator && global.navigator.onLine === false) {
      throw new Error(LICENSE_EXPIRED_OFFLINE_MSG);
    }

    const payload = JSON.stringify({
      action: "validateLicense",
      schoolCode: normalizeLicenseSchoolCode(schoolCode),
      adminEmail: String(adminEmail || "")
        .trim()
        .toLowerCase(),
      licenseKey: String(licenseKey || "").trim(),
    });

    let response;

    try {
      response = await fetch(KMJ_SYNC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: payload,
      });
    } catch (networkError) {
      throw new Error(
        "Gagal menghubungi pelayan lesen. Semak sambungan internet."
      );
    }

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error("Respons lesen tidak sah.");
    }

    if (!data || !data.success) {
      throw new Error(
        (data && data.error) || "Pengaktifan lesen gagal. Semak maklumat anda."
      );
    }

    return data;
  }

  async function activateLicense(schoolCode, adminEmail, licenseKey) {
    const data = await validateLicenseOnline(schoolCode, adminEmail, licenseKey);
    const activation = {
      schoolCode: normalizeLicenseSchoolCode(schoolCode),
      schoolName: String(data.schoolName || "").trim(),
      maxStudents:
        data.maxStudents != null
          ? Number(data.maxStudents)
          : DEFAULT_MAX_ROSTER_STUDENTS,
      expiryDate: String(data.expiryDate || "").trim(),
      activatedAt: new Date().toISOString(),
      adminEmail: String(adminEmail || "")
        .trim()
        .toLowerCase(),
    };

    saveLicenseActivation(activation);

    try {
      global.sessionStorage.setItem("kmj_school_code", activation.schoolCode);
    } catch (storageError) {
      /* ignore */
    }

    await syncRosterFromCloud({ force: true });

    return activation;
  }

  function isStudentHomeAccessMode() {
    try {
      return global.sessionStorage.getItem(STUDENT_HOME_MODE_KEY) === "1";
    } catch (storageError) {
      return false;
    }
  }

  function setStudentHomeAccessMode(active) {
    try {
      if (active) {
        global.sessionStorage.setItem(STUDENT_HOME_MODE_KEY, "1");
      } else {
        global.sessionStorage.removeItem(STUDENT_HOME_MODE_KEY);
      }
    } catch (storageError) {
      /* ignore */
    }
  }

  function enableStudentHomeSchoolCode(schoolCode) {
    const code = normalizeLicenseSchoolCode(schoolCode);

    if (!code) {
      return { ok: false };
    }

    try {
      global.sessionStorage.setItem("kmj_school_code", code);
    } catch (storageError) {
      /* ignore */
    }

    setStudentHomeAccessMode(true);

    return { ok: true, schoolCode: code };
  }

  function getSchoolCode() {
    const license = readLicenseActivation();

    if (license && license.schoolCode) {
      return license.schoolCode;
    }

    try {
      const stored = String(global.sessionStorage.getItem("kmj_school_code") || "").trim();

      if (stored) {
        return stored;
      }
    } catch (storageError) {
      /* ignore */
    }

    return DEFAULT_SCHOOL_CODE;
  }

  function isRosterCloudSyncAvailable() {
    if (!isSyncEndpointConfigured()) {
      return false;
    }

    if (!String(getSchoolCode() || "").trim()) {
      return false;
    }

    return isLicenseActive() || isStudentHomeAccessMode();
  }

  async function loadRosterForStudentHome() {
    if (!isStudentHomeAccessMode()) {
      return { ok: false, count: 0 };
    }

    await initDatabase();

    if (typeof global.navigator !== "undefined" && global.navigator.onLine === false) {
      throw new Error("offline");
    }

    const cloudRoster = await getRosterFromCloud();

    if (cloudRoster.length) {
      await mergeRosterIntoLocal(cloudRoster);
      lastRosterCloudSyncAt = Date.now();
    } else {
      const localCount = (await getAllRosterStudentsLocal()).length;

      if (!localCount) {
        throw new Error("empty");
      }
    }

    const count = await getRosterStudentCount();

    if (!count) {
      throw new Error("empty");
    }

    return { ok: true, count: count };
  }

  function sanitizeCloudRosterItem(item) {
    const classId = String(item && item.classId ? item.classId : "").trim();
    const studentName = String(item && item.studentName ? item.studentName : "").trim();

    if (!classId || !studentName) {
      return null;
    }

    return {
      studentId:
        String(item && item.studentId ? item.studentId : "").trim() ||
        makeRosterStudentId(classId, studentName),
      classId: classId,
      studentName: studentName,
      createdAt:
        item && item.createdAt ? item.createdAt : new Date().toISOString(),
      updatedAt: item && item.updatedAt ? item.updatedAt : "",
    };
  }

  function getStudentId() {
    return global.sessionStorage.getItem("kmj_student_id") || "";
  }

  function setStudentId(studentId) {
    global.sessionStorage.setItem("kmj_student_id", String(studentId || "").trim());
  }

  function initDatabase() {
    if (dbPromise) {
      return dbPromise;
    }

    dbPromise = new Promise(function (resolve, reject) {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("studentId", "studentId", { unique: false });
          store.createIndex("checkpointId", "checkpointId", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains(ROSTER_STORE_NAME)) {
          const rosterStore = db.createObjectStore(ROSTER_STORE_NAME, {
            keyPath: "studentId",
          });
          rosterStore.createIndex("classId", "classId", { unique: false });
          rosterStore.createIndex("studentName", "studentName", { unique: false });
        }
      };

      request.onsuccess = function (event) {
        log("IndexedDB ready");
        resolve(event.target.result);
      };

      request.onerror = function () {
        reject(request.error || new Error("IndexedDB gagal dibuka."));
      };
    });

    return dbPromise;
  }

  function dbTransaction(mode) {
    return initDatabase().then(function (db) {
      return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    });
  }

  function rosterTransaction(mode) {
    return initDatabase().then(function (db) {
      return db.transaction(ROSTER_STORE_NAME, mode).objectStore(ROSTER_STORE_NAME);
    });
  }

  function getAllRosterStudentsLocal() {
    return rosterTransaction("readonly").then(function (store) {
      return new Promise(function (resolve, reject) {
        const request = store.getAll();

        request.onsuccess = function () {
          const list = request.result || [];
          list.sort(function (a, b) {
            if (a.classId === b.classId) {
              return String(a.studentName).localeCompare(String(b.studentName), "ms");
            }

            return String(a.classId).localeCompare(String(b.classId), "ms");
          });
          resolve(list);
        };

        request.onerror = function () {
          reject(request.error || new Error("Gagal baca senarai murid."));
        };
      });
    });
  }

  async function mergeRosterIntoLocal(students) {
    const db = await initDatabase();
    const local = await getAllRosterStudentsLocal();
    const seen = {};
    const toSave = [];
    let i;
    let row;
    let key;

    for (i = 0; i < local.length; i += 1) {
      key = rosterKey(local[i].classId, local[i].studentName);
      seen[key] = true;
    }

    for (i = 0; i < students.length; i += 1) {
      row = sanitizeCloudRosterItem(students[i]);

      if (!row) {
        continue;
      }

      key = rosterKey(row.classId, row.studentName);

      if (seen[key]) {
        continue;
      }

      seen[key] = true;
      toSave.push({
        studentId: row.studentId,
        studentName: row.studentName,
        classId: row.classId,
        createdAt:
          typeof row.createdAt === "number"
            ? row.createdAt
            : Date.parse(row.createdAt) || Date.now(),
      });
    }

    if (!toSave.length) {
      return { merged: 0 };
    }

    await new Promise(function (resolve, reject) {
      const tx = db.transaction(ROSTER_STORE_NAME, "readwrite");
      const store = tx.objectStore(ROSTER_STORE_NAME);

      for (i = 0; i < toSave.length; i += 1) {
        store.put(toSave[i]);
      }

      tx.oncomplete = function () {
        resolve();
      };

      tx.onerror = function () {
        reject(tx.error || new Error("Gagal merge roster cloud ke lokal."));
      };
    });

    return { merged: toSave.length };
  }

  async function getRosterFromCloud() {
    if (!isRosterCloudSyncAvailable()) {
      return [];
    }

    if (typeof global.navigator !== "undefined" && global.navigator.onLine === false) {
      return [];
    }

    const response = await fetch(KMJ_SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getRoster",
        schoolCode: getSchoolCode(),
      }),
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok || !json.success) {
      throw new Error((json && json.error) || "Gagal ambil roster cloud.");
    }

    return Array.isArray(json.roster) ? json.roster : [];
  }

  async function syncRosterFromCloud(options) {
    const force = !!(options && options.force);

    if (!isRosterCloudSyncAvailable()) {
      return { merged: 0, skipped: true };
    }

    if (typeof global.navigator !== "undefined" && global.navigator.onLine === false) {
      return { merged: 0, skipped: true };
    }

    if (!force && Date.now() - lastRosterCloudSyncAt < ROSTER_SYNC_COOLDOWN_MS) {
      return { merged: 0, skipped: true };
    }

    try {
      const cloudRoster = await getRosterFromCloud();
      const merged = await mergeRosterIntoLocal(cloudRoster);
      lastRosterCloudSyncAt = Date.now();
      return merged;
    } catch (error) {
      log("Roster cloud sync skipped:", error);
      return { merged: 0, skipped: true, error: error.message || String(error) };
    }
  }

  async function uploadRosterToCloud(students) {
    if (!isRosterCloudSyncAvailable()) {
      return { success: false, skipped: true };
    }

    if (typeof global.navigator !== "undefined" && global.navigator.onLine === false) {
      return { success: false, skipped: true };
    }

    const payload = {
      action: "uploadRoster",
      schoolCode: getSchoolCode(),
      roster: (students || []).map(function (student) {
        return {
          classId: student.classId,
          studentName: student.studentName,
          studentId: student.studentId,
          createdAt: student.createdAt,
        };
      }),
    };

    try {
      const response = await fetch(KMJ_SYNC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const json = text ? JSON.parse(text) : {};

      if (!response.ok || !json.success) {
        throw new Error((json && json.error) || "Gagal upload roster cloud.");
      }

      if (Array.isArray(json.roster)) {
        await mergeRosterIntoLocal(json.roster);
      }

      lastRosterCloudSyncAt = Date.now();

      return {
        success: true,
        inserted: typeof json.inserted === "number" ? json.inserted : 0,
        updated: typeof json.updated === "number" ? json.updated : 0,
      };
    } catch (error) {
      log("Roster cloud upload skipped:", error);
      return { success: false, skipped: true, error: error.message || String(error) };
    }
  }

  async function getAllRosterStudents() {
    await syncRosterFromCloud({ force: false });
    return getAllRosterStudentsLocal();
  }

  function saveRosterStudent(student) {
    return rosterTransaction("readwrite").then(function (store) {
      return new Promise(function (resolve, reject) {
        const request = store.put(student);

        request.onsuccess = function () {
          resolve(student);
        };

        request.onerror = function () {
          reject(request.error || new Error("Gagal simpan murid."));
        };
      });
    });
  }

  function deleteRosterStudent(studentId) {
    return rosterTransaction("readwrite").then(function (store) {
      return new Promise(function (resolve, reject) {
        const request = store.delete(studentId);

        request.onsuccess = function () {
          resolve();
        };

        request.onerror = function () {
          reject(request.error || new Error("Gagal padam murid."));
        };
      });
    });
  }

  async function getRosterStudentCount() {
    const all = await getAllRosterStudents();
    return all.length;
  }

  async function getRosterClasses() {
    const all = await getAllRosterStudents();
    const map = {};
    let i;

    for (i = 0; i < all.length; i += 1) {
      map[all[i].classId] = true;
    }

    return Object.keys(map).sort(function (a, b) {
      return a.localeCompare(b, "ms");
    });
  }

  async function getStudentsByClass(classId) {
    const all = await getAllRosterStudents();
    const key = String(classId || "").trim();

    return all
      .filter(function (student) {
        return student.classId === key;
      })
      .sort(function (a, b) {
        return String(a.studentName).localeCompare(String(b.studentName), "ms");
      });
  }

  function isRosterImportHeaderLine(line) {
    const parts = String(line || "")
      .trim()
      .split(/[\t,]+/)
      .map(function (part) {
        return part.trim().toLowerCase();
      })
      .filter(Boolean);

    if (parts.length !== 2) {
      return false;
    }

    return (
      (parts[0] === "kelas" || parts[0] === "class") &&
      (parts[1] === "nama" || parts[1] === "name")
    );
  }

  function parseBulkImportLine(line) {
    const trimmed = String(line || "").trim();

    if (!trimmed || isRosterImportHeaderLine(trimmed)) {
      return null;
    }

    let classId = "";
    let studentName = "";
    const tabIndex = trimmed.indexOf("\t");

    if (tabIndex !== -1) {
      classId = trimmed.slice(0, tabIndex).trim();
      studentName = trimmed.slice(tabIndex + 1).trim();
    } else {
      const commaIndex = trimmed.indexOf(",");

      if (commaIndex !== -1) {
        classId = trimmed.slice(0, commaIndex).trim();
        studentName = trimmed.slice(commaIndex + 1).trim();
      } else {
        const spaceMatch = trimmed.match(/^(\S+)\s+(.+)$/);

        if (!spaceMatch) {
          return null;
        }

        classId = spaceMatch[1].trim();
        studentName = spaceMatch[2].trim();
      }
    }

    if (!classId || !studentName) {
      return null;
    }

    const studentId = makeRosterStudentId(classId, studentName);

    if (!studentId || studentId === "__") {
      return null;
    }

    return {
      classId: classId,
      studentName: studentName,
      studentId: studentId,
    };
  }

  async function importStudentsFromText(text) {
    const maxAllowed = getMaxRosterStudents();

    if (!isLicenseActive() || maxAllowed < 1) {
      return {
        ok: false,
        error: "Lesen sekolah belum diaktifkan.",
        added: 0,
        skipped: 0,
        total: 0,
      };
    }

    const db = await initDatabase();
    const existing = await getAllRosterStudents();
    const existingKeys = {};
    const toSave = [];
    let i;
    let row;
    let lines;
    let added = 0;
    let skipped = 0;
    let currentCount = existing.length;

    for (i = 0; i < existing.length; i += 1) {
      existingKeys[rosterKey(existing[i].classId, existing[i].studentName)] = true;
    }

    lines = String(text || "").split(/\r?\n/);

    for (i = 0; i < lines.length; i += 1) {
      row = parseBulkImportLine(lines[i]);

      if (!row) {
        if (String(lines[i] || "").trim()) {
          skipped += 1;
        }
        continue;
      }

      if (existingKeys[rosterKey(row.classId, row.studentName)]) {
        skipped += 1;
        continue;
      }

      if (currentCount + toSave.length >= getMaxRosterStudents()) {
        return {
          ok: false,
          error: ROSTER_LIMIT_MSG,
          added: added,
          skipped: skipped,
          total: currentCount,
        };
      }

      toSave.push({
        studentId: row.studentId,
        studentName: row.studentName,
        classId: row.classId,
        createdAt: Date.now(),
      });
      existingKeys[rosterKey(row.classId, row.studentName)] = true;
      added += 1;
    }

    if (!toSave.length) {
      const verifiedEmpty = await getAllRosterStudents();
      return {
        ok: true,
        added: 0,
        skipped: skipped,
        total: verifiedEmpty.length,
      };
    }

    await new Promise(function (resolve, reject) {
      const tx = db.transaction(ROSTER_STORE_NAME, "readwrite");
      const store = tx.objectStore(ROSTER_STORE_NAME);

      for (i = 0; i < toSave.length; i += 1) {
        store.put(toSave[i]);
      }

      tx.oncomplete = function () {
        resolve();
      };

      tx.onerror = function () {
        reject(tx.error || new Error("Gagal simpan senarai murid ke IndexedDB."));
      };

      tx.onabort = function () {
        reject(tx.error || new Error("Import murid dibatalkan."));
      };
    });

    const verified = await getAllRosterStudents();
    const cloudSync = await uploadRosterToCloud(verified);

    return {
      ok: true,
      added: added,
      skipped: skipped,
      total: verified.length,
      cloudSync: cloudSync,
    };
  }

  async function clearAllRosterStudents() {
    const db = await initDatabase();

    await new Promise(function (resolve, reject) {
      const tx = db.transaction(ROSTER_STORE_NAME, "readwrite");
      const store = tx.objectStore(ROSTER_STORE_NAME);
      const request = store.clear();

      request.onerror = function () {
        reject(request.error || new Error("Gagal kosongkan senarai murid."));
      };

      tx.oncomplete = function () {
        resolve();
      };

      tx.onerror = function () {
        reject(tx.error || new Error("Gagal kosongkan senarai murid."));
      };

      tx.onabort = function () {
        reject(tx.error || new Error("Reset senarai murid dibatalkan."));
      };
    });

    const verified = await getAllRosterStudents();
    return verified.length;
  }

  async function exportFullBackup() {
    await initDatabase();
    const roster = await getAllRosterStudents();
    const allRecords = await getAllRecordings();
    const records = [];
    let i;
    let normalized;
    let payload;

    for (i = 0; i < allRecords.length; i += 1) {
      normalized = normalizeRecord(allRecords[i]);
      payload = Object.assign({}, normalized);

      if (payload.audioBlob instanceof Blob) {
        payload.audioBase64 = await blobToBase64(payload.audioBlob);
        payload.audioMimeType = payload.audioBlob.type || "";
      }

      delete payload.audioBlob;
      records.push(payload);
    }

    return {
      backupType: "KMJLITE_FULL_BACKUP",
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      student_roster: roster,
      assessment_records: records,
    };
  }

  function sanitizeBackupRosterItem(item) {
    const classId = String(item && item.classId ? item.classId : "").trim();
    const studentName = String(item && item.studentName ? item.studentName : "").trim();

    if (!classId || !studentName) {
      return null;
    }

    return {
      studentId: makeRosterStudentId(classId, studentName),
      classId: classId,
      studentName: studentName,
      createdAt:
        typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
          ? item.createdAt
          : Date.now(),
    };
  }

  async function restoreFullBackup(backupData) {
    if (!backupData || typeof backupData !== "object") {
      throw new Error("Format backup tidak sah.");
    }

    await initDatabase();

    const db = await initDatabase();
    const rawRoster = Array.isArray(backupData.student_roster)
      ? backupData.student_roster
      : Array.isArray(backupData.roster)
      ? backupData.roster
      : [];
    const rawRecords = Array.isArray(backupData.assessment_records)
      ? backupData.assessment_records
      : Array.isArray(backupData.recordings)
      ? backupData.recordings
      : [];
    const roster = [];
    const rosterSeen = {};
    const records = [];
    let i;
    let rosterItem;
    let rosterKeyValue;
    let rawRecord;
    let normalized;

    for (i = 0; i < rawRoster.length; i += 1) {
      rosterItem = sanitizeBackupRosterItem(rawRoster[i]);

      if (!rosterItem) {
        continue;
      }

      rosterKeyValue = rosterKey(rosterItem.classId, rosterItem.studentName);

      if (rosterSeen[rosterKeyValue]) {
        continue;
      }

      rosterSeen[rosterKeyValue] = true;
      roster.push(rosterItem);
    }

    if (roster.length > getMaxRosterStudents()) {
      throw new Error(ROSTER_LIMIT_MSG);
    }

    for (i = 0; i < rawRecords.length; i += 1) {
      rawRecord = Object.assign({}, rawRecords[i]);

      if (!rawRecord.id) {
        rawRecord.id = generateId();
      }

      if (!rawRecord.audioBlob && rawRecord.audioBase64) {
        rawRecord.audioBlob = base64ToBlob(
          rawRecord.audioBase64,
          rawRecord.audioMimeType
        );
      }

      if (!rawRecord.audioBlob && rawRecord.audioBlobDataUrl) {
        rawRecord.audioBlob = dataUrlToBlob(rawRecord.audioBlobDataUrl);
      }

      delete rawRecord.audioBase64;
      delete rawRecord.audioMimeType;
      delete rawRecord.audioBlobDataUrl;
      delete rawRecord.audioBlobType;
      delete rawRecord.audioBlobSize;

      normalized = normalizeRecord(rawRecord);

      if (normalized) {
        records.push(normalized);
      }
    }

    await new Promise(function (resolve, reject) {
      const tx = db.transaction([ROSTER_STORE_NAME, STORE_NAME], "readwrite");
      const rosterStore = tx.objectStore(ROSTER_STORE_NAME);
      const recordStore = tx.objectStore(STORE_NAME);
      let j;

      rosterStore.clear();
      recordStore.clear();

      for (j = 0; j < roster.length; j += 1) {
        rosterStore.put(roster[j]);
      }

      for (j = 0; j < records.length; j += 1) {
        recordStore.put(records[j]);
      }

      tx.oncomplete = function () {
        resolve();
      };

      tx.onerror = function () {
        reject(tx.error || new Error("Gagal memulihkan backup."));
      };

      tx.onabort = function () {
        reject(tx.error || new Error("Pemulihan backup dibatalkan."));
      };
    });

    return {
      restoredRoster: roster.length,
      restoredRecords: records.length,
    };
  }

  async function resetAllData() {
    const db = await initDatabase();

    await new Promise(function (resolve, reject) {
      const tx = db.transaction([ROSTER_STORE_NAME, STORE_NAME], "readwrite");
      const rosterStore = tx.objectStore(ROSTER_STORE_NAME);
      const recordStore = tx.objectStore(STORE_NAME);

      rosterStore.clear();
      recordStore.clear();

      tx.oncomplete = function () {
        resolve();
      };

      tx.onerror = function () {
        reject(tx.error || new Error("Gagal reset semua data."));
      };

      tx.onabort = function () {
        reject(tx.error || new Error("Reset semua data dibatalkan."));
      };
    });

    return {
      rosterCount: 0,
      recordCount: 0,
    };
  }

  async function resetAllSyncStatusToPending() {
    await initDatabase();

    const all = await getAllRecordings();
    let i;
    let resetCount = 0;

    for (i = 0; i < all.length; i += 1) {
      if (!all[i] || !all[i].id) {
        continue;
      }

      await updateRecording(all[i].id, { syncStatus: SYNC_STATUS_PENDING });
      resetCount += 1;
    }

    return {
      reset: resetCount,
      total: all.length,
    };
  }

  function saveRecordingRaw(record) {
    return dbTransaction("readwrite").then(function (store) {
      return new Promise(function (resolve, reject) {
        const request = store.put(record);

        request.onsuccess = function () {
          log("IndexedDB saved", record.id);
          resolve(record);
        };

        request.onerror = function () {
          reject(request.error || new Error("Gagal simpan rakaman."));
        };
      });
    });
  }

  async function dedupeLatestRecordDuplicates(keepRecord) {
    const keep = normalizeRecord(keepRecord);
    const keepKey = buildLatestRecordKeyFromRecord(keep);
    const keepId = keep && keep.id;

    if (!keepKey || !keepId) {
      return { deletedCount: 0 };
    }

    const all = await getAllRecordings();
    let deletedCount = 0;
    let i;

    for (i = 0; i < all.length; i += 1) {
      if (
        all[i] &&
        all[i].id !== keepId &&
        buildLatestRecordKeyFromRecord(all[i]) === keepKey
      ) {
        await deleteRecording(all[i].id);
        deletedCount += 1;
      }
    }

    if (deletedCount) {
      log("Removed", deletedCount, "older duplicate(s) for", keepKey);
    }

    return { deletedCount: deletedCount };
  }

  async function upsertLatestRecording(record) {
    await initDatabase();

    const toSave = normalizeRecord(Object.assign({}, record));

    if (!toSave.schoolCode) {
      toSave.schoolCode = getSchoolCode();
    }

    const latestExisting = await findLatestAttemptRecording({
      schoolCode: toSave.schoolCode,
      classId: toSave.classId,
      studentId: toSave.studentId,
      checkpointId: toSave.checkpointId,
      targetText: toSave.targetText,
    });

    if (latestExisting && latestExisting.id) {
      toSave.id = latestExisting.id;
    } else if (!toSave.id) {
      toSave.id = generateId();
    }

    toSave.latestRecordKey = buildLatestRecordKeyFromRecord(toSave);
    toSave.attemptKey = buildAttemptKey(
      toSave.classId,
      toSave.studentId,
      toSave.checkpointId,
      toSave.targetText
    );
    toSave.schoolScopedAttemptKey = toSave.latestRecordKey;

    if (
      !toSave.syncStatus ||
      (toSave.syncStatus !== SYNC_STATUS_PENDING &&
        toSave.syncStatus !== SYNC_STATUS_SYNCED &&
        toSave.syncStatus !== SYNC_STATUS_FAILED)
    ) {
      toSave.syncStatus = SYNC_STATUS_PENDING;
    }

    await saveRecordingRaw(toSave);
    await dedupeLatestRecordDuplicates(toSave);

    return toSave;
  }

  function saveRecording(record) {
    return upsertLatestRecording(record);
  }

  function getRecording(recordId) {
    return dbTransaction("readonly").then(function (store) {
      return new Promise(function (resolve, reject) {
        const request = store.get(recordId);

        request.onsuccess = function () {
          resolve(request.result || null);
        };

        request.onerror = function () {
          reject(request.error || new Error("Gagal baca rakaman."));
        };
      });
    });
  }

  function getAllRecordings() {
    return dbTransaction("readonly").then(function (store) {
      return new Promise(function (resolve, reject) {
        const request = store.getAll();

        request.onsuccess = function () {
          resolve(request.result || []);
        };

        request.onerror = function () {
          reject(request.error || new Error("Gagal baca senarai rakaman."));
        };
      });
    });
  }

  function deleteRecording(recordId) {
    return dbTransaction("readwrite").then(function (store) {
      return new Promise(function (resolve, reject) {
        const request = store.delete(recordId);

        request.onsuccess = function () {
          log("IndexedDB deleted", recordId);
          resolve();
        };

        request.onerror = function () {
          reject(request.error || new Error("Gagal padam rakaman."));
        };
      });
    });
  }

  function matchesAttempt(record, classId, studentId, checkpointId, targetText) {
    const schoolCode = (record && record.schoolCode) || getSchoolCode();

    return (
      record &&
      buildLatestRecordKey(
        schoolCode,
        classId,
        studentId,
        checkpointId,
        targetText
      ) === buildLatestRecordKeyFromRecord(record)
    );
  }

  async function findLatestAttemptRecording(options) {
    const all = await getAllRecordings();
    const targetKey = buildLatestRecordKey(
      options.schoolCode || getSchoolCode(),
      options.classId,
      options.studentId,
      options.checkpointId,
      options.targetText
    );
    let latest = null;
    let i;
    let row;

    for (i = 0; i < all.length; i += 1) {
      row = all[i];

      if (buildLatestRecordKeyFromRecord(row) !== targetKey) {
        continue;
      }

      if (!latest || timestampSortValue(row) >= timestampSortValue(latest)) {
        latest = row;
      }
    }

    return latest;
  }

  /**
   * Remove every stored attempt for this student + checkpoint + target word.
   * Ensures only the latest Sebut recording is kept for teacher review.
   */
  async function clearAttemptRecordings(options) {
    const studentId = options.studentId || getStudentId();
    const classId = options.classId || getClassId();
    const checkpointId = options.checkpointId;
    const targetText = options.targetText;

    await initDatabase();

    const all = await getAllRecordings();
    const toDelete = all.filter(function (record) {
      return matchesAttempt(record, classId, studentId, checkpointId, targetText);
    });

    let i;

    for (i = 0; i < toDelete.length; i += 1) {
      await deleteRecording(toDelete[i].id);
    }

    if (toDelete.length) {
      log(
        "Cleared",
        toDelete.length,
        "previous attempt(s) for",
        checkpointId,
        targetText
      );
    }

    return {
      deletedCount: toDelete.length,
      deletedIds: toDelete.map(function (record) {
        return record.id;
      }),
    };
  }

  function updateRecording(recordId, updates) {
    return getRecording(recordId).then(function (existing) {
      if (!existing) {
        throw new Error("Rekod tidak dijumpai.");
      }

      const merged = Object.assign({}, existing, updates, { id: recordId });
      return upsertLatestRecording(merged);
    });
  }

  function queueSheetPayload(payload) {
    try {
      const key = "kmj_sheets_queue";
      const queue = JSON.parse(global.localStorage.getItem(key) || "[]");
      queue.push(payload);
      global.localStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      log("Sheet queue error", error);
    }
  }

  function pushToGoogleSheet(record) {
    const r = normalizeRecord(record);
    const payload = {
      classId: r.classId,
      studentName: r.studentName,
      studentId: r.studentId,
      checkpointId: r.checkpointId,
      category: r.category,
      targetText: r.targetText,
      timestamp: r.timestamp,
      score: r.score,
      status: r.status || "",
      reviewType: r.reviewType || "",
      transcript: r.transcript || "",
      confidence: r.confidence,
      aiResult: r.aiResult,
      aiScore: r.aiScore,
      teacherTP: r.teacherTP,
      finalResult: r.finalResult,
      resultSource: r.resultSource,
      tpLevel: r.tpLevel || r.teacherTP || "",
    };

    queueSheetPayload(payload);
    log("Google Sheets payload queued", payload);

    if (!GOOGLE_SHEETS_WEBAPP_URL) {
      return Promise.resolve({ queued: true, pushed: false });
    }

    return fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function () {
        log("Google Sheets push sent");
        return { queued: true, pushed: true };
      })
      .catch(function (error) {
        log("Google Sheets push failed", error);
        return { queued: true, pushed: false, error: error };
      });
  }

  function stopRecording() {
    if (!activeCapture) {
      return;
    }

    const capture = activeCapture;
    activeCapture = null;

    if (capture.maxTimer !== null) {
      global.clearTimeout(capture.maxTimer);
    }

    if (capture.mediaStream) {
      capture.mediaStream.getTracks().forEach(function (track) {
        track.stop();
      });
    }

    if (capture.mediaRecorder && capture.mediaRecorder.state === "recording") {
      try {
        if (typeof capture.mediaRecorder.requestData === "function") {
          capture.mediaRecorder.requestData();
        }
        capture.mediaRecorder.stop();
      } catch (error) {
        // Ignore.
      }
    }
  }

  function stopSpeechRecognition() {
    if (!activeRecognition) {
      return;
    }

    const recognition = activeRecognition;
    activeRecognition = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.stop();
    } catch (error) {
      // Ignore.
    }
  }

  function stopActiveSession() {
    stopRecording();
    stopSpeechRecognition();
  }

  function recordStudentAudio(options) {
    const maxMs =
      options && typeof options.maxMs === "number" ? options.maxMs : MAX_RECORD_MS;

    return new Promise(function (resolve, reject) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        try {
          handleMicrophoneError(new Error("Mikrofon tidak disokong."));
        } catch (micBlock) {
          reject(micBlock);
        }
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        try {
          handleMicrophoneError(new Error("MediaRecorder tidak disokong."));
        } catch (micBlock) {
          reject(micBlock);
        }
        return;
      }

      let settled = false;
      const chunks = [];
      let mediaStream = null;
      let mediaRecorder = null;

      function finish(error, blob) {
        if (settled) {
          return;
        }

        settled = true;
        activeCapture = null;

        if (mediaStream) {
          mediaStream.getTracks().forEach(function (track) {
            track.stop();
          });
        }

        if (error) {
          reject(error);
          return;
        }

        resolve(blob);
      }

      function requestStop(reason) {
        log("Stop recording:", reason);

        if (mediaRecorder && mediaRecorder.state === "recording") {
          try {
            if (typeof mediaRecorder.requestData === "function") {
              mediaRecorder.requestData();
            }
            mediaRecorder.stop();
          } catch (stopError) {
            if (chunks.length) {
              finish(
                null,
                new Blob(chunks, {
                  type: mediaRecorder.mimeType || "audio/webm",
                })
              );
            } else {
              finish(stopError);
            }
          }
          return;
        }

        if (chunks.length) {
          finish(
            null,
            new Blob(chunks, {
              type: (mediaRecorder && mediaRecorder.mimeType) || "audio/webm",
            })
          );
          return;
        }

        finish(new Error("Rakaman kosong."));
      }

      log("Start recording (clean MediaRecorder pipeline)");

      navigator.mediaDevices
        .getUserMedia(MOBILE_AUDIO_CONSTRAINTS)
        .then(function (stream) {
          if (settled) {
            stream.getTracks().forEach(function (track) {
              track.stop();
            });
            return;
          }

          mediaStream = stream;
          const mimeType = selectSupportedMimeType();
          mediaRecorder = createMediaRecorder(stream);

          mediaRecorder.ondataavailable = function (event) {
            if (event.data && event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onerror = function () {
            finish(mediaRecorder.error || new Error("Rakaman gagal."));
          };

          mediaRecorder.onstop = function () {
            if (settled) {
              return;
            }

            if (!chunks.length) {
              finish(new Error("Rakaman kosong."));
              return;
            }

            finish(
              null,
              new Blob(chunks, {
                type: mediaRecorder.mimeType || mimeType || "audio/webm",
              })
            );
          };

          const captureState = {
            mediaStream: mediaStream,
            mediaRecorder: mediaRecorder,
            maxTimer: null,
          };

          activeCapture = captureState;

          captureState.maxTimer = global.setTimeout(function () {
            requestStop("max-timeout");
          }, maxMs);

          try {
            mediaRecorder.start(250);
          } catch (startError) {
            finish(startError);
          }
        })
        .catch(function (micError) {
          try {
            handleMicrophoneError(micError);
          } catch (handledError) {
            finish(handledError);
          }
        });
    });
  }

  function listenMalaySpeech(timeoutMs) {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      if (isInsecureOrigin()) {
        return Promise.reject(new Error(SPEECH_INSECURE_ALERT));
      }

      return Promise.reject(
        new Error("Pengecaman suara tidak disokong. Guna Chrome.")
      );
    }

    return new Promise(function (resolve) {
      let settled = false;
      let bestTranscript = "";
      let bestConfidence = null;
      const alternatives = [];
      const recognition = new SpeechRecognition();
      activeRecognition = recognition;

      recognition.lang = "ms-MY";
      recognition.continuous = false;
      recognition.interimResults = false;

      try {
        recognition.maxAlternatives = 3;
      } catch (maxAltError) {
        log("maxAlternatives not supported", maxAltError);
      }

      function collectAlternatives(event) {
        let i;
        let j;
        let row;
        let alt;
        let altCount;

        for (i = event.resultIndex; i < event.results.length; i += 1) {
          row = event.results[i];

          if (!row.isFinal) {
            continue;
          }

          altCount = typeof row.length === "number" ? row.length : 1;

          for (j = 0; j < altCount; j += 1) {
            alt = row[j];

            if (!alt || !alt.transcript) {
              continue;
            }

            alternatives.push({
              transcript: String(alt.transcript).trim(),
              confidence:
                typeof alt.confidence === "number" ? alt.confidence : null,
            });
          }
        }
      }

      function finish(result) {
        if (settled) {
          return;
        }

        settled = true;
        global.clearTimeout(timer);
        activeRecognition = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;

        try {
          recognition.stop();
        } catch (error) {
          // Ignore.
        }

        resolve(result);
      }

      recognition.onresult = function (event) {
        collectAlternatives(event);

        if (alternatives.length) {
          bestTranscript = alternatives[0].transcript;
          bestConfidence = alternatives[0].confidence;
        }

        log("Speech heard:", bestTranscript, "alts:", alternatives.length);
      };

      recognition.onerror = function (event) {
        log("Speech error:", event.error);
        finish({
          timedOut: false,
          failed: true,
          error: event.error,
          transcript: bestTranscript,
          confidence: bestConfidence,
          alternatives: alternatives.slice(),
        });
      };

      recognition.onend = function () {
        finish({
          timedOut: false,
          failed: false,
          transcript: bestTranscript,
          confidence: bestConfidence,
          alternatives: alternatives.slice(),
        });
      };

      const timer = global.setTimeout(function () {
        log("Speech timeout", timeoutMs);
        finish({
          timedOut: true,
          failed: true,
          transcript: bestTranscript,
          confidence: bestConfidence,
          alternatives: alternatives.slice(),
        });
      }, timeoutMs);

      try {
        recognition.start();
        log("Speech recognition started (ms-MY)");
      } catch (startError) {
        finish({
          timedOut: false,
          failed: true,
          error: String(startError),
          transcript: "",
          confidence: null,
          alternatives: [],
        });
      }
    });
  }

  function buildBaseRecord(options) {
    const checkpointId = options.checkpointId || "";
    const session = getSessionStudentContext();
    const schoolCode = options.schoolCode || getSchoolCode();
    const classId = options.classId || session.classId;
    const studentId = options.studentId || session.studentId;
    const targetText = options.targetText;

    return normalizeRecord({
      id: options.id || generateId(),
      schoolCode: schoolCode,
      schoolScopedAttemptKey: buildSchoolScopedAttemptKey(
        schoolCode,
        classId,
        studentId,
        checkpointId,
        targetText
      ),
      attemptKey: buildAttemptKey(classId, studentId, checkpointId, targetText),
      classId: classId,
      studentId: studentId,
      studentName: options.studentName || session.studentName,
      checkpointId: checkpointId,
      category: options.category || getCategoryFromCheckpoint(checkpointId),
      targetText: targetText,
      transcript: options.transcript != null ? options.transcript : "",
      confidence:
        options.confidence !== undefined && options.confidence !== null
          ? options.confidence
          : "",
      audioBlob: options.audioBlob || null,
      aiResult: options.aiResult != null ? options.aiResult : "",
      aiScore: options.aiScore !== undefined && options.aiScore !== null ? options.aiScore : "",
      teacherTP: options.teacherTP || "",
      finalResult: options.finalResult || "",
      resultSource: options.resultSource || "",
      timestamp: toIsoTimestamp(options.timestamp) || new Date().toISOString(),
      score: typeof options.score === "number" ? options.score : null,
      status: options.status || "pending_review",
      reviewType: options.reviewType || "",
      tpLevel: options.tpLevel || options.teacherTP || "",
      syncStatus: options.syncStatus || SYNC_STATUS_PENDING,
    });
  }

  /**
   * Checkpoints 1-3: record, save to IndexedDB, return for teacher review UI.
   */
  async function runDeferredCapture(options) {
    await initDatabase();
    stopActiveSession();

    const session = getLoggedInStudent();

    if (!session) {
      throw new Error("Sila log masuk melalui Pilih Kelas dan Pilih Nama Anda.");
    }

    const studentId = options.studentId || session.studentId;
    const checkpointId = options.checkpointId;
    const targetText = options.targetText;

    const latestExisting = await findLatestAttemptRecording({
      classId: session.classId,
      studentId: studentId,
      checkpointId: checkpointId,
      targetText: targetText,
    });

    log("Deferred capture", checkpointId, targetText);

    const audioBlob = await recordStudentAudio({
      maxMs: MAX_RECORD_MS,
    });

    const record = buildBaseRecord({
      id: latestExisting && latestExisting.id ? latestExisting.id : undefined,
      classId: session.classId,
      studentId: session.studentId,
      studentName: session.studentName,
      checkpointId: checkpointId,
      targetText: targetText,
      status: STATUS_TEACHER_WAITING,
      reviewType: "short_sound",
      audioBlob: audioBlob,
      aiResult: "",
      aiScore: "",
      teacherTP: "",
      finalResult: FINAL_PENDING_GURU,
      resultSource: RESULT_SOURCE_PENDING,
      transcript: "",
      confidence: "",
      syncStatus: SYNC_STATUS_PENDING,
    });

    await upsertLatestRecording(record);

    return {
      mode: "deferred_review",
      recordId: record.id,
      audioBlob: audioBlob,
      record: record,
    };
  }

  function isSpeechRecognitionAvailable() {
    if (isInsecureOrigin()) {
      return false;
    }

    return !!getSpeechRecognitionConstructor();
  }

  function isImmediateSpeechInfrastructureError(speechError) {
    const err = String(speechError || "").toLowerCase();
    let i;

    for (i = 0; i < SPEECH_INFRASTRUCTURE_ERRORS.length; i += 1) {
      if (err.indexOf(SPEECH_INFRASTRUCTURE_ERRORS[i]) !== -1) {
        return true;
      }
    }

    return false;
  }

  function buildBelajarGoogleSpeechDebug(targetText, speech, evaluation) {
    return {
      targetText: targetText,
      transcript: String(speech.transcript || "").trim(),
      confidence: speech.confidence,
      timedOut: !!speech.timedOut,
      failed: !!speech.failed,
      error: speech.error || null,
      alternatives: (speech.alternatives || []).map(function (alt) {
        return {
          transcript: alt.transcript,
          confidence: alt.confidence,
        };
      }),
      pass: evaluation.pass,
      failReason: evaluation.failReason || null,
    };
  }

  function isGoogleSpeechApiFailure(speech) {
    if (!speech) {
      return false;
    }

    if (speech.timedOut) {
      return false;
    }

    if (!speech.failed) {
      return false;
    }

    return isImmediateSpeechInfrastructureError(speech.error);
  }

  /**
   * Belajar word Sebut: same flow as runAutomatedMalay; no save when Google API fails.
   */
  async function runBelajarWordSebut(options) {
    await initDatabase();
    stopActiveSession();

    const targetText = options.targetText;
    const checkpointId = options.checkpointId;
    const session = getLoggedInStudent();

    if (!session) {
      throw new Error("Sila log masuk melalui Pilih Kelas dan Pilih Nama Anda.");
    }

    if (!isWordModeCheckpoint(checkpointId)) {
      throw new Error("Bukan mod perkataan: " + checkpointId);
    }

    if (!isSpeechRecognitionAvailable()) {
      return {
        mode: "api_unavailable",
        reasonKey: isInsecureOrigin() ? "insecure_origin" : "no_speech_api",
      };
    }

    const studentId = options.studentId || session.studentId;

    const latestExisting = await findLatestAttemptRecording({
      classId: session.classId,
      studentId: studentId,
      checkpointId: checkpointId,
      targetText: targetText,
    });

    log("Belajar word speech + record", checkpointId, targetText);

    let speech;
    let audioBlob = null;

    try {
      const speechPromise = listenMalaySpeech(SPEECH_TIMEOUT_MS);
      const audioPromise = recordStudentAudio({ maxMs: MAX_RECORD_MS }).catch(
        function (recError) {
          log("Belajar word audio capture optional fail", recError);
          return null;
        }
      );

      speech = await speechPromise;
      audioBlob = await audioPromise;
    } catch (listenError) {
      return {
        mode: "api_unavailable",
        reasonKey: "speech_rejected",
        message: String(
          listenError && listenError.message ? listenError.message : listenError
        ),
      };
    }

    if (isGoogleSpeechApiFailure(speech)) {
      return {
        mode: "api_unavailable",
        reasonKey: String(speech.error || "speech_error"),
      };
    }

    stopActiveSession();

    const evaluation = evaluateWordModeSpeech(targetText, speech);
    const rawTranscript = String(speech.transcript || "").trim();
    const transcript = String(evaluation.transcript || rawTranscript || "").trim();
    const status = evaluation.pass ? "ai_verified" : "ai_failed";
    const googleDebug = buildBelajarGoogleSpeechDebug(targetText, speech, evaluation);

    log("Belajar Google API result", googleDebug);

    const record = buildBaseRecord({
      id: latestExisting && latestExisting.id ? latestExisting.id : undefined,
      classId: session.classId,
      studentId: session.studentId,
      studentName: session.studentName,
      checkpointId: checkpointId,
      targetText: targetText,
      score: evaluation.score,
      status: status,
      reviewType: "word_mode",
      transcript: transcript,
      confidence:
        evaluation.confidence !== null && evaluation.confidence !== undefined
          ? evaluation.confidence
          : "",
      audioBlob: audioBlob,
      aiResult: evaluation.aiResult,
      aiScore: evaluation.aiScore,
      teacherTP: "",
      finalResult: evaluation.finalResult,
      resultSource: evaluation.resultSource,
      syncStatus: SYNC_STATUS_PENDING,
    });

    await upsertLatestRecording(record);

    if (evaluation.pass) {
      return {
        mode: "ai_verified",
        isCorrect: true,
        similarityPercent: evaluation.score,
        transcript: transcript,
        rawTranscript: rawTranscript,
        detectedText: transcript,
        confidence: evaluation.confidence,
        failReason: null,
        timedOut: !!speech.timedOut,
        aiResult: evaluation.aiResult,
        finalResult: evaluation.finalResult,
        recordId: record.id,
        record: record,
        googleDebug: googleDebug,
      };
    }

    return {
      mode: "ai_failed",
      isCorrect: false,
      similarityPercent: evaluation.score,
      failReason: evaluation.failReason,
      transcript: transcript,
      rawTranscript: rawTranscript,
      detectedText: transcript,
      confidence: evaluation.confidence,
      timedOut: !!speech.timedOut,
      aiResult: evaluation.aiResult,
      finalResult: evaluation.finalResult,
      recordId: record.id,
      record: record,
      googleDebug: googleDebug,
    };
  }

  /**
   * Word mode: ms-MY speech + classroom audio archive for teacher override.
   */
  async function runAutomatedMalay(options) {
    await initDatabase();
    stopActiveSession();

    const targetText = options.targetText;
    const checkpointId = options.checkpointId;
    const session = getLoggedInStudent();

    if (!session) {
      throw new Error("Sila log masuk melalui Pilih Kelas dan Pilih Nama Anda.");
    }

    const studentId = options.studentId || session.studentId;

    if (!isWordModeCheckpoint(checkpointId)) {
      throw new Error("Bukan mod perkataan: " + checkpointId);
    }

    const latestExisting = await findLatestAttemptRecording({
      classId: session.classId,
      studentId: studentId,
      checkpointId: checkpointId,
      targetText: targetText,
    });

    log("Word mode speech + record", checkpointId, targetText);

    const speechPromise = listenMalaySpeech(SPEECH_TIMEOUT_MS);
    const audioPromise = recordStudentAudio({ maxMs: MAX_RECORD_MS }).catch(function (recError) {
      log("Word mode audio capture optional fail", recError);
      return null;
    });

    const speech = await speechPromise;
    const audioBlob = await audioPromise;
    stopActiveSession();

    const evaluation = evaluateWordModeSpeech(targetText, speech);
    const transcript = evaluation.transcript || "";
    const status = evaluation.pass ? "ai_verified" : "ai_failed";

    const record = buildBaseRecord({
      id: latestExisting && latestExisting.id ? latestExisting.id : undefined,
      classId: session.classId,
      studentId: session.studentId,
      studentName: session.studentName,
      checkpointId: checkpointId,
      targetText: targetText,
      score: evaluation.score,
      status: status,
      reviewType: "word_mode",
      transcript: transcript,
      confidence:
        evaluation.confidence !== null && evaluation.confidence !== undefined
          ? evaluation.confidence
          : "",
      audioBlob: audioBlob,
      aiResult: evaluation.aiResult,
      aiScore: evaluation.aiScore,
      teacherTP: "",
      finalResult: evaluation.finalResult,
      resultSource: evaluation.resultSource,
      syncStatus: SYNC_STATUS_PENDING,
    });

    await upsertLatestRecording(record);

    if (evaluation.pass) {
      return {
        mode: "ai_verified",
        isCorrect: true,
        similarityPercent: evaluation.score,
        transcript: transcript,
        confidence: evaluation.confidence,
        failReason: null,
        aiResult: evaluation.aiResult,
        finalResult: evaluation.finalResult,
        recordId: record.id,
        record: record,
      };
    }

    return {
      mode: "ai_failed",
      isCorrect: false,
      similarityPercent: evaluation.score,
      failReason: evaluation.failReason,
      transcript: transcript,
      confidence: evaluation.confidence,
      aiResult: evaluation.aiResult,
      finalResult: evaluation.finalResult,
      recordId: record.id,
      record: record,
    };
  }

  async function commitTeacherScore(recordId, tpLevel, score) {
    return commitTeacherTP(recordId, tpLevel, score);
  }

  async function commitTeacherTP(recordId, tpLevel, score) {
    await initDatabase();

    const existing = normalizeRecord(await getRecording(recordId));

    if (!existing) {
      throw new Error("Rekod tidak dijumpai.");
    }

    const tpScore =
      typeof score === "number" ? score : TP_SCORES[tpLevel] || TP_SCORES.TP1;

    const updated = await updateRecording(recordId, {
      teacherTP: tpLevel,
      tpLevel: tpLevel,
      finalResult: tpLevel,
      resultSource: RESULT_SOURCE_GURU,
      timestamp: new Date().toISOString(),
      score: tpScore,
      status: "teacher_graded",
      reviewType: "teacher_pbd",
      syncStatus: SYNC_STATUS_PENDING,
    });

    const normalized = normalizeRecord(updated);

    return {
      recordId: recordId,
      score: tpScore,
      tpLevel: tpLevel,
      teacherTP: tpLevel,
      finalResult: tpLevel,
      resultSource: RESULT_SOURCE_GURU,
      record: normalized,
    };
  }

  const engine = {
    DB_NAME: DB_NAME,
    REFERENCE_AUDIO_BASE: REFERENCE_AUDIO_BASE,
    REFERENCE_AUDIO_FOLDERS: REFERENCE_AUDIO_FOLDERS,
    SHORT_SOUND_CHECKPOINTS: SHORT_SOUND_CHECKPOINTS,
    DEFERRED_CHECKPOINTS: DEFERRED_CHECKPOINTS,
    AI_CHECKPOINTS: AI_CHECKPOINTS,
    TP_LEVELS: TP_LEVELS,
    TP_SCORES: TP_SCORES,
    MINIMUM_CONFIDENCE: MINIMUM_CONFIDENCE,
    KMJ_SYNC_ENDPOINT: KMJ_SYNC_ENDPOINT,
    GOOGLE_SHEETS_WEBAPP_URL: GOOGLE_SHEETS_WEBAPP_URL,
    SYNC_STATUS_PENDING: SYNC_STATUS_PENDING,
    SYNC_STATUS_SYNCED: SYNC_STATUS_SYNCED,
    SYNC_STATUS_FAILED: SYNC_STATUS_FAILED,
    AI_RESULT_PASS: AI_RESULT_PASS,
    AI_RESULT_RETRY: AI_RESULT_RETRY,
    FINAL_WAITING_TP: FINAL_WAITING_TP,
    FINAL_PENDING_GURU: FINAL_PENDING_GURU,
    RESULT_SOURCE_GURU: RESULT_SOURCE_GURU,
    RESULT_SOURCE_AI: RESULT_SOURCE_AI,
    RESULT_SOURCE_PENDING: RESULT_SOURCE_PENDING,
    buildLatestRecordKey: buildLatestRecordKey,
    buildLatestRecordKeyFromRecord: buildLatestRecordKeyFromRecord,
    STATUS_TEACHER_WAITING: STATUS_TEACHER_WAITING,
    STATUS_PENDING_REVIEW: STATUS_PENDING_REVIEW,
    initDatabase: initDatabase,
    initMobileEnvironment: initMobileEnvironment,
    clearAttemptRecordings: clearAttemptRecordings,
    getPendingReviewRecords: getPendingReviewRecords,
    getTeacherDashboardRecords: getTeacherDashboardRecords,
    getDisplayResult: getDisplayResult,
    normalizeRecord: normalizeRecord,
    getClassId: getClassId,
    setClassId: setClassId,
    getStudentDisplayName: getStudentDisplayName,
    getSpeechRecognitionConstructor: getSpeechRecognitionConstructor,
    isSpeechRecognitionAvailable: isSpeechRecognitionAvailable,
    isImmediateSpeechInfrastructureError: isImmediateSpeechInfrastructureError,
    isGoogleSpeechApiFailure: isGoogleSpeechApiFailure,
    isInsecureOrigin: isInsecureOrigin,
    DEFAULT_MAX_ROSTER_STUDENTS: DEFAULT_MAX_ROSTER_STUDENTS,
    MAX_ROSTER_STUDENTS: DEFAULT_MAX_ROSTER_STUDENTS,
    getMaxRosterStudents: getMaxRosterStudents,
    ROSTER_LIMIT_MSG: ROSTER_LIMIT_MSG,
    LICENSE_EXPIRED_OFFLINE_MSG: LICENSE_EXPIRED_OFFLINE_MSG,
    readLicenseActivation: readLicenseActivation,
    clearLicenseActivation: clearLicenseActivation,
    getLicenseStatus: getLicenseStatus,
    isLicenseActive: isLicenseActive,
    validateLicenseOnline: validateLicenseOnline,
    activateLicense: activateLicense,
    getStudentId: getStudentId,
    setStudentId: setStudentId,
    getStudentName: getStudentName,
    setStudentSession: setStudentSession,
    getLoggedInStudent: getLoggedInStudent,
    getAllRosterStudents: getAllRosterStudents,
    getRosterClasses: getRosterClasses,
    getStudentsByClass: getStudentsByClass,
    importStudentsFromText: importStudentsFromText,
    clearAllRosterStudents: clearAllRosterStudents,
    exportFullBackup: exportFullBackup,
    restoreFullBackup: restoreFullBackup,
    resetAllData: resetAllData,
    resetAllSyncStatusToPending: resetAllSyncStatusToPending,
    deleteRosterStudent: deleteRosterStudent,
    getRosterStudentCount: getRosterStudentCount,
    resolveStudentName: resolveStudentName,
    resolveClassId: resolveClassId,
    isShortSoundCheckpoint: isShortSoundCheckpoint,
    isWordModeCheckpoint: isWordModeCheckpoint,
    isDeferredCheckpoint: isDeferredCheckpoint,
    isAiCheckpoint: isAiCheckpoint,
    getReferenceAudioPath: getReferenceAudioPath,
    normalizeMalayText: normalizeMalayText,
    containsTargetSequence: containsTargetSequence,
    evaluateWordModeSpeech: evaluateWordModeSpeech,
    hasEnglishPhoneticLeak: hasEnglishPhoneticLeak,
    normalizeSpeechText: normalizeSpeechText,
    isTextMatch: isTextMatch,
    exportAllRecordsCsv: exportAllRecordsCsv,
    recordStudentAudio: recordStudentAudio,
    runDeferredCapture: runDeferredCapture,
    runBelajarWordSebut: runBelajarWordSebut,
    runAutomatedMalay: runAutomatedMalay,
    commitTeacherScore: commitTeacherScore,
    commitTeacherTP: commitTeacherTP,
    pushToGoogleSheet: pushToGoogleSheet,
    getSyncStatusCounts: getSyncStatusCounts,
    getRecordsNeedingSync: getRecordsNeedingSync,
    syncPendingResultsToGoogleSheet: syncPendingResultsToGoogleSheet,
    getCabaranResultsFromGoogleSheet: getCabaranResultsFromGoogleSheet,
    cabaranSummaryToSyncPayload: cabaranSummaryToSyncPayload,
    syncCabaranSummariesToGoogleSheet: syncCabaranSummariesToGoogleSheet,
    tryAutoSyncAfterAssessment: tryAutoSyncAfterAssessment,
    getStudentSyncStatusSummary: getStudentSyncStatusSummary,
    isGoogleSheetSyncInProgress: isGoogleSheetSyncInProgress,
    isSyncEndpointConfigured: isSyncEndpointConfigured,
    getSchoolCode: getSchoolCode,
    isStudentHomeAccessMode: isStudentHomeAccessMode,
    enableStudentHomeSchoolCode: enableStudentHomeSchoolCode,
    loadRosterForStudentHome: loadRosterForStudentHome,
    stopActiveSession: stopActiveSession,
  };

  global.KMJ_Assessment = engine;
  global.KMJ_Pronunciation = engine;
})(typeof window !== "undefined" ? window : globalThis);
