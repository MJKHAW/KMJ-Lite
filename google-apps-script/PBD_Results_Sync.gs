/**
 * KMJ-Lite — Google Sheet sync + license validation
 *
 * Sheets:
 * - PBD_Results (assessment sync, latest-only upsert)
 * - Cabaran_Results (Cabaran summary upsert, one row per student/checkpoint)
 * - Licenses (commercial activation)
 *
 * PBD_Results unique key (latest attempt per student/question):
 *   schoolCode + classId + studentId + checkpointId + targetText
 *
 * Cabaran_Results unique key (latest Cabaran per student/checkpoint):
 *   schoolCode + classId + studentId + checkpointId
 *
 * Cabaran_Research (action research: first attempt vs latest attempt):
 *   same key — first* columns are written once and never changed;
 *   latest* columns update on every sync; improvementPercentage = latest - first.
 *
 * Setup:
 * 1. Create a Google Sheet with tabs PBD_Results, Cabaran_Results, and Licenses.
 * 2. Extensions → Apps Script → paste this file.
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL into pronunciation-verify.js:
 *    const KMJ_SYNC_ENDPOINT = "YOUR_URL_HERE";
 */

var PBD_RESULTS_SHEET_NAME = "PBD_Results";
var CABARAN_RESULTS_SHEET_NAME = "Cabaran_Results";
var CABARAN_RESEARCH_SHEET_NAME = "Cabaran_Research";
var LICENSES_SHEET_NAME = "Licenses";
var STUDENT_ROSTER_SHEET_NAME = "Student_Roster";
var STUDENT_SUMMARY_SHEET_NAME = "Student_Summary";

var LICENSE_HEADERS = [
  "SchoolCode",
  "SchoolName",
  "AdminEmail",
  "LicenseKey",
  "MaxStudents",
  "Status",
  "ExpiryDate",
  "LastActivatedAt",
];

var PBD_RESULTS_HEADERS = [
  "recordId",
  "schoolCode",
  "classId",
  "studentId",
  "studentName",
  "checkpointId",
  "category",
  "targetText",
  "transcript",
  "confidence",
  "aiResult",
  "aiScore",
  "teacherTP",
  "finalResult",
  "resultSource",
  "timestamp",
  "syncedAt",
];

var CABARAN_RESULTS_HEADERS = [
  "schoolCode",
  "classId",
  "studentId",
  "studentName",
  "checkpointId",
  "totalCorrect",
  "totalQuestions",
  "percentage",
  "suggestedTP",
  "cabaranCompleted",
  "updatedAt",
  "syncedAt",
];

var CABARAN_RESEARCH_HEADERS = [
  "schoolCode",
  "classId",
  "studentId",
  "studentName",
  "checkpointId",
  "firstCorrect",
  "firstTotal",
  "firstPercentage",
  "firstSuggestedTP",
  "firstDate",
  "latestCorrect",
  "latestTotal",
  "latestPercentage",
  "latestSuggestedTP",
  "latestDate",
  "improvementPercentage",
];

var STUDENT_ROSTER_HEADERS = [
  "SchoolCode",
  "ClassId",
  "StudentName",
  "StudentId",
  "CreatedAt",
  "UpdatedAt",
];

var STUDENT_SUMMARY_HEADERS = [
  "classId",
  "studentId",
  "studentName",
  "completedCheckpoints",
  "averagePercentage",
  "latestSuggestedTP",
  "averageImprovementPercentage",
  "lastUpdated",
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({
        success: false,
        error: "Tiada data POST diterima.",
      });
    }

    var body = JSON.parse(e.postData.contents);

    if (body.action === "validateLicense") {
      return validateLicense_(body);
    }

    if (body.action === "uploadRoster") {
      return uploadRoster_(body);
    }

    if (body.action === "getRoster") {
      return getRoster_(body);
    }

    if (body.action === "syncCabaranSummaries") {
      return syncCabaranSummaries_(body);
    }

    if (body.action === "getCabaranResults") {
      return getCabaranResults_(body);
    }

    if (body.action === "generateSchoolReport") {
      return generateSchoolReport_(body);
    }

    var records = body.records;

    if (!records || !records.length) {
      return jsonResponse_({ success: true, inserted: 0, updated: 0 });
    }

    var sheet = getOrCreateSheet_(PBD_RESULTS_SHEET_NAME);
    ensureHeaders_(sheet, PBD_RESULTS_HEADERS);

    var syncedAt = new Date().toISOString();
    var keyIndex = buildLatestKeyRowMap_(sheet);
    var inserted = 0;
    var updated = 0;
    var i;
    var row;
    var latestKey;
    var rowValues;
    var targetRow;

    for (i = 0; i < records.length; i += 1) {
      row = records[i] || {};
      latestKey = buildLatestSyncKeyFromPayload_(row);

      if (!latestKey) {
        continue;
      }

      rowValues = rowValuesFromRecord_(row, syncedAt);
      targetRow = keyIndex[latestKey];

      if (targetRow) {
        sheet
          .getRange(targetRow, 1, 1, PBD_RESULTS_HEADERS.length)
          .setValues([rowValues]);
        removeDuplicateKeyRows_(sheet, latestKey, targetRow);
        updated += 1;
      } else {
        sheet.appendRow(rowValues);
        keyIndex[latestKey] = sheet.getLastRow();
        inserted += 1;
      }
    }

    return jsonResponse_({ success: true, inserted: inserted, updated: updated });
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: err && err.message ? err.message : String(err),
    });
  }
}

function doGet() {
  return jsonResponse_({
    success: true,
    message:
      "KMJ-Lite endpoint is ready (PBD_Results + Cabaran_Results upsert + getCabaranResults + Cabaran_Research + validateLicense + roster sync).",
  });
}

function normalizeRosterKeyPart_(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildRosterKey_(schoolCode, classId, studentName) {
  var a = normalizeRosterKeyPart_(schoolCode);
  var b = normalizeRosterKeyPart_(classId);
  var c = normalizeRosterKeyPart_(studentName);

  if (!a || !b || !c) {
    return "";
  }

  return a + "|" + b + "|" + c;
}

function normalizeRosterStudentId_(classId, studentName) {
  return (
    String(classId || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") +
    "__" +
    String(studentName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

function sanitizeRosterItem_(item) {
  var classId = String((item && item.classId) || "").trim();
  var studentName = String((item && item.studentName) || "").trim();
  var studentId = String((item && item.studentId) || "").trim();
  var createdAt = String((item && item.createdAt) || "").trim();

  if (!classId || !studentName) {
    return null;
  }

  if (!studentId) {
    studentId = normalizeRosterStudentId_(classId, studentName);
  }

  if (!createdAt) {
    createdAt = new Date().toISOString();
  }

  return {
    classId: classId,
    studentName: studentName,
    studentId: studentId,
    createdAt: createdAt,
  };
}

function uploadRoster_(body) {
  var schoolCode = String(body.schoolCode || "")
    .trim()
    .toUpperCase();
  var roster = Array.isArray(body.roster) ? body.roster : [];
  var nowIso = new Date().toISOString();
  var inserted = 0;
  var updated = 0;
  var i;
  var item;
  var key;
  var targetRow;

  if (!schoolCode) {
    return jsonResponse_({ success: false, error: "schoolCode diperlukan." });
  }

  var sheet = getOrCreateSheet_(STUDENT_ROSTER_SHEET_NAME);
  ensureHeaders_(sheet, STUDENT_ROSTER_HEADERS);
  var rowMap = buildRosterRowMap_(sheet);

  for (i = 0; i < roster.length; i += 1) {
    item = sanitizeRosterItem_(roster[i]);

    if (!item) {
      continue;
    }

    key = buildRosterKey_(schoolCode, item.classId, item.studentName);

    if (!key) {
      continue;
    }

    targetRow = rowMap[key];

    if (targetRow) {
      sheet
        .getRange(targetRow, 1, 1, STUDENT_ROSTER_HEADERS.length)
        .setValues([
          [
            schoolCode,
            item.classId,
            item.studentName,
            item.studentId,
            sheet.getRange(targetRow, 5).getValue() || item.createdAt,
            nowIso,
          ],
        ]);
      removeDuplicateRosterRows_(sheet, key, targetRow);
      updated += 1;
    } else {
      sheet.appendRow([
        schoolCode,
        item.classId,
        item.studentName,
        item.studentId,
        item.createdAt,
        nowIso,
      ]);
      rowMap[key] = sheet.getLastRow();
      inserted += 1;
    }
  }

  return getRosterBySchool_(schoolCode, inserted, updated);
}

function getRoster_(body) {
  var schoolCode = String(body.schoolCode || "")
    .trim()
    .toUpperCase();

  if (!schoolCode) {
    return jsonResponse_({ success: false, error: "schoolCode diperlukan." });
  }

  return getRosterBySchool_(schoolCode, 0, 0);
}

function getRosterBySchool_(schoolCode, inserted, updated) {
  var sheet = getOrCreateSheet_(STUDENT_ROSTER_SHEET_NAME);
  ensureHeaders_(sheet, STUDENT_ROSTER_HEADERS);
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var row;
  var roster = [];

  if (lastRow < 2) {
    return jsonResponse_({
      success: true,
      inserted: inserted || 0,
      updated: updated || 0,
      roster: [],
    });
  }

  values = sheet.getRange(2, 1, lastRow - 1, STUDENT_ROSTER_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    row = values[i];

    if (String(row[0] || "").trim().toUpperCase() !== schoolCode) {
      continue;
    }

    roster.push({
      schoolCode: String(row[0] || "").trim(),
      classId: String(row[1] || "").trim(),
      studentName: String(row[2] || "").trim(),
      studentId: String(row[3] || "").trim(),
      createdAt: String(row[4] || "").trim(),
      updatedAt: String(row[5] || "").trim(),
    });
  }

  return jsonResponse_({
    success: true,
    inserted: inserted || 0,
    updated: updated || 0,
    roster: roster,
  });
}

function buildRosterRowMap_(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var rowValues;
  var key;

  if (lastRow < 2) {
    return map;
  }

  values = sheet.getRange(2, 1, lastRow - 1, STUDENT_ROSTER_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    rowValues = values[i];
    key = buildRosterKey_(rowValues[0], rowValues[1], rowValues[2]);

    if (key) {
      map[key] = i + 2;
    }
  }

  return map;
}

function removeDuplicateRosterRows_(sheet, key, keepRow) {
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var rowNumber;
  var rowsToDelete = [];

  if (lastRow < 2 || !key || !keepRow) {
    return;
  }

  values = sheet.getRange(2, 1, lastRow - 1, STUDENT_ROSTER_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    rowNumber = i + 2;

    if (rowNumber === keepRow) {
      continue;
    }

    if (buildRosterKey_(values[i][0], values[i][1], values[i][2]) === key) {
      rowsToDelete.push(rowNumber);
    }
  }

  rowsToDelete.sort(function (a, b) {
    return b - a;
  });

  for (i = 0; i < rowsToDelete.length; i += 1) {
    sheet.deleteRow(rowsToDelete[i]);
  }
}

function normalizeKeyPart_(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildLatestSyncKey_(schoolCode, classId, studentId, checkpointId, targetText) {
  var parts = [
    normalizeKeyPart_(schoolCode),
    normalizeKeyPart_(classId),
    normalizeKeyPart_(studentId),
    normalizeKeyPart_(checkpointId),
    normalizeKeyPart_(targetText),
  ];
  var i;

  for (i = 0; i < parts.length; i += 1) {
    if (!parts[i]) {
      return "";
    }
  }

  return parts.join("|");
}

function buildLatestSyncKeyFromPayload_(row) {
  return buildLatestSyncKey_(
    row.schoolCode,
    row.classId,
    row.studentId,
    row.checkpointId,
    row.targetText
  );
}

function buildLatestSyncKeyFromSheetRow_(rowValues) {
  if (!rowValues || !rowValues.length) {
    return "";
  }

  return buildLatestSyncKey_(
    rowValues[1],
    rowValues[2],
    rowValues[3],
    rowValues[5],
    rowValues[7]
  );
}

function rowTimestampMs_(rowValues) {
  var ts = String((rowValues && rowValues[15]) || "").trim();
  var syncedAt = String((rowValues && rowValues[16]) || "").trim();
  var parsed = Date.parse(ts || syncedAt);

  if (isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function buildLatestKeyRowMap_(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var rowValues;
  var latestKey;
  var sheetRow;
  var existingRow;
  var existingValues;

  if (lastRow < 2) {
    return map;
  }

  values = sheet.getRange(2, 1, lastRow, PBD_RESULTS_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    rowValues = values[i];
    latestKey = buildLatestSyncKeyFromSheetRow_(rowValues);

    if (!latestKey) {
      continue;
    }

    sheetRow = i + 2;
    existingRow = map[latestKey];

    if (!existingRow) {
      map[latestKey] = sheetRow;
      continue;
    }

    existingValues = values[existingRow - 2];

    if (rowTimestampMs_(rowValues) >= rowTimestampMs_(existingValues)) {
      map[latestKey] = sheetRow;
    }
  }

  return map;
}

function removeDuplicateKeyRows_(sheet, latestKey, keepRow) {
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var sheetRow;
  var rowsToDelete = [];

  if (lastRow < 2 || !latestKey || !keepRow) {
    return;
  }

  values = sheet.getRange(2, 1, lastRow, PBD_RESULTS_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    sheetRow = i + 2;

    if (sheetRow === keepRow) {
      continue;
    }

    if (buildLatestSyncKeyFromSheetRow_(values[i]) === latestKey) {
      rowsToDelete.push(sheetRow);
    }
  }

  rowsToDelete.sort(function (a, b) {
    return b - a;
  });

  for (i = 0; i < rowsToDelete.length; i += 1) {
    sheet.deleteRow(rowsToDelete[i]);
  }
}

function validateLicense_(body) {
  var schoolCode = String(body.schoolCode || "")
    .trim()
    .toUpperCase();
  var adminEmail = String(body.adminEmail || "")
    .trim()
    .toLowerCase();
  var licenseKey = String(body.licenseKey || "").trim();

  if (!schoolCode || !adminEmail || !licenseKey) {
    return jsonResponse_({
      success: false,
      error: "Kod sekolah, email admin dan license key diperlukan.",
    });
  }

  var sheet = getOrCreateSheet_(LICENSES_SHEET_NAME);
  ensureHeaders_(sheet, LICENSE_HEADERS);

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse_({ success: false, error: "Lesen tidak dijumpai." });
  }

  var values = sheet.getRange(2, 1, lastRow, LICENSE_HEADERS.length).getValues();
  var i;
  var row;
  var matchIndex = -1;

  for (i = 0; i < values.length; i += 1) {
    row = values[i];

    if (String(row[0] || "").trim().toUpperCase() === schoolCode) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex < 0) {
    return jsonResponse_({ success: false, error: "Kod sekolah tidak dijumpai." });
  }

  row = values[matchIndex];

  var rowAdminEmail = String(row[2] || "")
    .trim()
    .toLowerCase();
  var rowLicenseKey = String(row[3] || "").trim();
  var schoolName = String(row[1] || "").trim();
  var maxStudents = Number(row[4]) || 0;
  var status = String(row[5] || "")
    .trim()
    .toUpperCase();
  var expiryDate = parseExpiryDate_(row[6]);
  var schoolReportUrlColumn = findHeaderColumn_(sheet, "SchoolReportUrl");
  var schoolReportUrl = "";

  if (schoolReportUrlColumn > 0) {
    schoolReportUrl = String(
      sheet.getRange(matchIndex + 2, schoolReportUrlColumn).getValue() || ""
    ).trim();
  }

  if (rowAdminEmail !== adminEmail) {
    return jsonResponse_({ success: false, error: "Email admin tidak sepadan." });
  }

  if (rowLicenseKey !== licenseKey) {
    return jsonResponse_({ success: false, error: "License key tidak sah." });
  }

  if (status !== "ACTIVE") {
    return jsonResponse_({ success: false, error: "Lesen tidak aktif." });
  }

  if (!expiryDate) {
    return jsonResponse_({
      success: false,
      error: "Tarikh luput lesen tidak sah.",
    });
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var expiryDay = new Date(expiryDate.getTime());
  expiryDay.setHours(0, 0, 0, 0);

  if (expiryDay < today) {
    return jsonResponse_({ success: false, error: "Lesen telah tamat tempoh." });
  }

  sheet.getRange(matchIndex + 2, 8).setValue(new Date());

  return jsonResponse_({
    success: true,
    schoolName: schoolName,
    maxStudents: maxStudents,
    expiryDate: formatIsoDate_(expiryDate),
    schoolReportUrl: schoolReportUrl,
  });
}

function findHeaderColumn_(sheet, headerName) {
  var lastColumn = sheet.getLastColumn();
  var target = String(headerName || "")
    .trim()
    .toLowerCase();
  var headers;
  var i;

  if (!target || lastColumn < 1) {
    return -1;
  }

  headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  for (i = 0; i < headers.length; i += 1) {
    if (
      String(headers[i] || "")
        .trim()
        .toLowerCase() === target
    ) {
      return i + 1;
    }
  }

  return -1;
}

function generateSchoolReport_(body) {
  var schoolCode = String((body && body.schoolCode) || "")
    .trim()
    .toUpperCase();
  var master = SpreadsheetApp.getActiveSpreadsheet();
  var licenseInfo;
  var reportSpreadsheet;
  var generatedAt;
  var pbdRows;
  var cabaranRows;
  var researchRows;
  var studentSummaryRows;

  if (!schoolCode) {
    return jsonResponse_({ success: false, error: "schoolCode diperlukan." });
  }

  licenseInfo = getSchoolReportLicenseInfo_(schoolCode);

  if (!licenseInfo) {
    return jsonResponse_({ success: false, error: "Kod sekolah tidak dijumpai." });
  }

  if (!licenseInfo.schoolReportUrl) {
    return jsonResponse_({
      success: false,
      error: "SchoolReportUrl belum ditetapkan untuk sekolah ini.",
    });
  }

  reportSpreadsheet = SpreadsheetApp.openByUrl(licenseInfo.schoolReportUrl);
  generatedAt = new Date().toISOString();

  pbdRows = getFilteredRowsBySchoolCode_(
    master,
    PBD_RESULTS_SHEET_NAME,
    PBD_RESULTS_HEADERS,
    schoolCode
  );
  cabaranRows = getFilteredRowsBySchoolCode_(
    master,
    CABARAN_RESULTS_SHEET_NAME,
    CABARAN_RESULTS_HEADERS,
    schoolCode
  );
  researchRows = getFilteredRowsBySchoolCode_(
    master,
    CABARAN_RESEARCH_SHEET_NAME,
    CABARAN_RESEARCH_HEADERS,
    schoolCode
  );
  studentSummaryRows = buildStudentSummaryRows_(cabaranRows, researchRows);

  writeReportSheet_(
    reportSpreadsheet,
    PBD_RESULTS_SHEET_NAME,
    PBD_RESULTS_HEADERS,
    pbdRows
  );
  writeReportSheet_(
    reportSpreadsheet,
    CABARAN_RESULTS_SHEET_NAME,
    CABARAN_RESULTS_HEADERS,
    cabaranRows
  );
  writeReportSheet_(
    reportSpreadsheet,
    CABARAN_RESEARCH_SHEET_NAME,
    CABARAN_RESEARCH_HEADERS,
    researchRows
  );
  writeReportSheet_(
    reportSpreadsheet,
    STUDENT_SUMMARY_SHEET_NAME,
    STUDENT_SUMMARY_HEADERS,
    studentSummaryRows
  );
  writeDashboardSheet_(
    reportSpreadsheet,
    licenseInfo.schoolName,
    schoolCode,
    generatedAt,
    pbdRows.length,
    cabaranRows.length,
    researchRows.length,
    cabaranRows,
    researchRows,
    studentSummaryRows
  );

  return jsonResponse_({
    success: true,
    schoolCode: schoolCode,
    schoolName: licenseInfo.schoolName,
    generatedAt: generatedAt,
    pbdRecords: pbdRows.length,
    cabaranCheckpoints: cabaranRows.length,
    researchRecords: researchRows.length,
    studentSummaryRecords: studentSummaryRows.length,
  });
}

function refreshAllSchoolReports() {
  var sheet = getOrCreateSheet_(LICENSES_SHEET_NAME);
  var lastRow;
  var lastColumn;
  var values;
  var reportUrlColumn;
  var totalProcessed = 0;
  var totalSuccess = 0;
  var totalFailed = 0;
  var i;
  var row;
  var schoolCode;
  var status;
  var schoolReportUrl;
  var resultText;

  ensureHeaders_(sheet, LICENSE_HEADERS);
  lastRow = sheet.getLastRow();
  lastColumn = sheet.getLastColumn();
  reportUrlColumn = findHeaderColumn_(sheet, "SchoolReportUrl");

  if (lastRow < 2 || reportUrlColumn < 1) {
    return {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
    };
  }

  values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  for (i = 0; i < values.length; i += 1) {
    row = values[i] || [];
    schoolCode = String(row[0] || "")
      .trim()
      .toUpperCase();
    status = String(row[5] || "")
      .trim()
      .toUpperCase();
    schoolReportUrl = String(row[reportUrlColumn - 1] || "").trim();

    if (status !== "ACTIVE" || !schoolCode || !schoolReportUrl) {
      continue;
    }

    totalProcessed += 1;

    try {
      resultText = generateSchoolReport_({ schoolCode: schoolCode }).getContent();
      Logger.log("School report refreshed: " + schoolCode + " " + resultText);
      totalSuccess += 1;
    } catch (error) {
      Logger.log(
        "School report refresh failed: " +
          schoolCode +
          " " +
          (error && error.message ? error.message : String(error))
      );
      totalFailed += 1;
    }
  }

  return {
    totalProcessed: totalProcessed,
    totalSuccess: totalSuccess,
    totalFailed: totalFailed,
  };
}

function getSchoolReportLicenseInfo_(schoolCode) {
  var sheet = getOrCreateSheet_(LICENSES_SHEET_NAME);
  var lastRow;
  var lastColumn;
  var values;
  var reportUrlColumn;
  var i;
  var row;

  ensureHeaders_(sheet, LICENSE_HEADERS);
  lastRow = sheet.getLastRow();
  lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return null;
  }

  values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  reportUrlColumn = findHeaderColumn_(sheet, "SchoolReportUrl");

  for (i = 0; i < values.length; i += 1) {
    row = values[i] || [];

    if (String(row[0] || "").trim().toUpperCase() === schoolCode) {
      return {
        schoolCode: schoolCode,
        schoolName: String(row[1] || "").trim(),
        schoolReportUrl:
          reportUrlColumn > 0
            ? String(row[reportUrlColumn - 1] || "").trim()
            : "",
      };
    }
  }

  return null;
}

function getFilteredRowsBySchoolCode_(spreadsheet, sheetName, headers, schoolCode) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  var lastRow;
  var values;
  var schoolCodeIndex;
  var rows = [];
  var i;
  var row;

  if (!sheet) {
    return rows;
  }

  lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return rows;
  }

  schoolCodeIndex = getHeaderIndex_(headers, "schoolCode");

  if (schoolCodeIndex < 0) {
    return rows;
  }

  values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    row = values[i] || [];

    if (String(row[schoolCodeIndex] || "").trim().toUpperCase() === schoolCode) {
      rows.push(row);
    }
  }

  return rows;
}

function getHeaderIndex_(headers, headerName) {
  var target = String(headerName || "")
    .trim()
    .toLowerCase();
  var i;

  for (i = 0; i < headers.length; i += 1) {
    if (
      String(headers[i] || "")
        .trim()
        .toLowerCase() === target
    ) {
      return i;
    }
  }

  return -1;
}

function getOrCreateSheetInSpreadsheet_(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  return sheet;
}

function writeReportSheet_(spreadsheet, sheetName, headers, rows) {
  var sheet = getOrCreateSheetInSpreadsheet_(spreadsheet, sheetName);

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function writeDashboardSheet_(
  spreadsheet,
  schoolName,
  schoolCode,
  generatedAt,
  totalPbdRecords,
  totalCabaranCheckpoints,
  totalResearchRecords,
  cabaranRows,
  researchRows,
  studentSummaryRows
) {
  var sheet = getOrCreateSheetInSpreadsheet_(spreadsheet, "Dashboard");
  var averageClassPercentage = averageStudentSummaryValue_(
    studentSummaryRows,
    "averagePercentage"
  );
  var averageImprovementPercentage = averageStudentSummaryValue_(
    studentSummaryRows,
    "averageImprovementPercentage"
  );
  var studentsBelowTp3 = countStudentsBelowTp_(studentSummaryRows, "TP3");
  var rows = [
    ["School name", schoolName || "-"],
    ["School code", schoolCode],
    ["Last generated timestamp", generatedAt],
    ["Total PBD records", totalPbdRecords],
    ["Total Cabaran checkpoints", totalCabaranCheckpoints],
    ["Total Research records", totalResearchRecords],
    ["Total students", studentSummaryRows.length],
    ["Average class percentage", averageClassPercentage],
    ["Average improvement percentage", averageImprovementPercentage],
    ["Students below TP3", studentsBelowTp3],
  ];
  var cabaranAverageRows = buildAverageSummaryRows_(
    cabaranRows,
    CABARAN_RESULTS_HEADERS,
    "checkpointId",
    "percentage"
  );
  var suggestedTpRows = buildCountSummaryRows_(
    cabaranRows,
    CABARAN_RESULTS_HEADERS,
    "suggestedTP"
  );
  var improvementRows = buildAverageSummaryRows_(
    researchRows,
    CABARAN_RESEARCH_HEADERS,
    "checkpointId",
    "improvementPercentage"
  );
  var tpDistributionRows = buildCountSummaryRows_(
    studentSummaryRows,
    STUDENT_SUMMARY_HEADERS,
    "latestSuggestedTP"
  );

  sheet.clear();
  removeDashboardCharts_(sheet);
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(13, 1).setValue("Cabaran average percentage by checkpointId");
  writeSummarySection_(
    sheet,
    14,
    1,
    ["checkpointId", "averagePercentage"],
    cabaranAverageRows,
    "Tiada rekod"
  );
  addDashboardChart_(
    sheet,
    "Cabaran average percentage by checkpointId",
    14,
    1,
    cabaranAverageRows.length,
    13,
    4,
    Charts.ChartType.BAR
  );

  sheet.getRange(13, 10).setValue("Suggested TP count");
  writeSummarySection_(
    sheet,
    14,
    10,
    ["suggestedTP", "count"],
    suggestedTpRows,
    "Tiada rekod"
  );
  addDashboardChart_(
    sheet,
    "Suggested TP count",
    14,
    10,
    suggestedTpRows.length,
    13,
    13,
    Charts.ChartType.BAR
  );

  sheet.getRange(32, 1).setValue("Research average improvement by checkpointId");
  writeSummarySection_(
    sheet,
    33,
    1,
    ["checkpointId", "averageImprovementPercentage"],
    improvementRows,
    "Tiada rekod"
  );
  addDashboardChart_(
    sheet,
    "Research average improvement by checkpointId",
    33,
    1,
    improvementRows.length,
    32,
    4,
    Charts.ChartType.COLUMN
  );

  sheet.getRange(50, 1).setValue("TP distribution from Student_Summary");
  writeSummarySection_(
    sheet,
    51,
    1,
    ["latestSuggestedTP", "count"],
    tpDistributionRows,
    "Tiada rekod"
  );
  addDashboardChart_(
    sheet,
    "TP distribution from Student_Summary",
    51,
    1,
    tpDistributionRows.length,
    50,
    4,
    Charts.ChartType.COLUMN
  );

  sheet.autoResizeColumns(1, 11);
}

function removeDashboardCharts_(sheet) {
  var charts = sheet.getCharts();
  var i;

  for (i = 0; i < charts.length; i += 1) {
    sheet.removeChart(charts[i]);
  }
}

function writeSummarySection_(sheet, startRow, startColumn, headers, rows, emptyMessage) {
  sheet.getRange(startRow, startColumn, 1, headers.length).setValues([headers]);

  if (!rows.length) {
    sheet.getRange(startRow + 1, startColumn).setValue(emptyMessage);
    return;
  }

  sheet.getRange(startRow + 1, startColumn, rows.length, headers.length).setValues(rows);
}

function addDashboardChart_(
  sheet,
  title,
  tableStartRow,
  tableStartColumn,
  rowCount,
  chartRow,
  chartColumn,
  chartType
) {
  var chart;

  if (!rowCount) {
    return;
  }

  chart = sheet
    .newChart()
    .setChartType(chartType)
    .addRange(sheet.getRange(tableStartRow, tableStartColumn, rowCount + 1, 2))
    .setOption("title", title)
    .setOption("legend", { position: "none" })
    .setPosition(chartRow, chartColumn, 0, 0)
    .build();

  sheet.insertChart(chart);
}

function buildAverageSummaryRows_(rows, headers, groupHeader, valueHeader) {
  var groupIndex = getHeaderIndex_(headers, groupHeader);
  var valueIndex = getHeaderIndex_(headers, valueHeader);
  var buckets = {};
  var keys;
  var result = [];
  var i;
  var row;
  var key;
  var value;

  if (groupIndex < 0 || valueIndex < 0) {
    return result;
  }

  for (i = 0; i < rows.length; i += 1) {
    row = rows[i] || [];
    key = String(row[groupIndex] || "").trim();
    value = Number(row[valueIndex]);

    if (!key || isNaN(value)) {
      continue;
    }

    if (!buckets[key]) {
      buckets[key] = { sum: 0, count: 0 };
    }

    buckets[key].sum += value;
    buckets[key].count += 1;
  }

  keys = Object.keys(buckets).sort();

  for (i = 0; i < keys.length; i += 1) {
    key = keys[i];
    result.push([key, roundReportNumber_(buckets[key].sum / buckets[key].count)]);
  }

  return result;
}

function buildCountSummaryRows_(rows, headers, groupHeader) {
  var groupIndex = getHeaderIndex_(headers, groupHeader);
  var counts = {};
  var keys;
  var result = [];
  var i;
  var key;

  if (groupIndex < 0) {
    return result;
  }

  for (i = 0; i < rows.length; i += 1) {
    key = String((rows[i] || [])[groupIndex] || "").trim();

    if (!key) {
      continue;
    }

    counts[key] = (counts[key] || 0) + 1;
  }

  keys = Object.keys(counts).sort();

  for (i = 0; i < keys.length; i += 1) {
    key = keys[i];
    result.push([key, counts[key]]);
  }

  return result;
}

function averageStudentSummaryValue_(studentSummaryRows, headerName) {
  var valueIndex = getHeaderIndex_(STUDENT_SUMMARY_HEADERS, headerName);
  var sum = 0;
  var count = 0;
  var i;
  var value;

  if (valueIndex < 0) {
    return "";
  }

  for (i = 0; i < studentSummaryRows.length; i += 1) {
    value = Number((studentSummaryRows[i] || [])[valueIndex]);

    if (isNaN(value)) {
      continue;
    }

    sum += value;
    count += 1;
  }

  return count ? roundReportNumber_(sum / count) : "";
}

function countStudentsBelowTp_(studentSummaryRows, thresholdTp) {
  var tpIndex = getHeaderIndex_(STUDENT_SUMMARY_HEADERS, "latestSuggestedTP");
  var threshold = parseTpLevel_(thresholdTp);
  var count = 0;
  var i;
  var level;

  if (tpIndex < 0 || !threshold) {
    return 0;
  }

  for (i = 0; i < studentSummaryRows.length; i += 1) {
    level = parseTpLevel_((studentSummaryRows[i] || [])[tpIndex]);

    if (level && level < threshold) {
      count += 1;
    }
  }

  return count;
}

function parseTpLevel_(value) {
  var match = String(value || "")
    .trim()
    .toUpperCase()
    .match(/^TP\s*([1-6])$/);

  return match ? Number(match[1]) : 0;
}

function buildStudentSummaryRows_(cabaranRows, researchRows) {
  var classIndex = getHeaderIndex_(CABARAN_RESULTS_HEADERS, "classId");
  var studentIdIndex = getHeaderIndex_(CABARAN_RESULTS_HEADERS, "studentId");
  var studentNameIndex = getHeaderIndex_(CABARAN_RESULTS_HEADERS, "studentName");
  var checkpointIndex = getHeaderIndex_(CABARAN_RESULTS_HEADERS, "checkpointId");
  var percentageIndex = getHeaderIndex_(CABARAN_RESULTS_HEADERS, "percentage");
  var suggestedTpIndex = getHeaderIndex_(CABARAN_RESULTS_HEADERS, "suggestedTP");
  var updatedAtIndex = getHeaderIndex_(CABARAN_RESULTS_HEADERS, "updatedAt");
  var researchClassIndex = getHeaderIndex_(CABARAN_RESEARCH_HEADERS, "classId");
  var researchStudentIdIndex = getHeaderIndex_(CABARAN_RESEARCH_HEADERS, "studentId");
  var researchStudentNameIndex = getHeaderIndex_(CABARAN_RESEARCH_HEADERS, "studentName");
  var improvementIndex = getHeaderIndex_(
    CABARAN_RESEARCH_HEADERS,
    "improvementPercentage"
  );
  var students = {};
  var keys;
  var result = [];
  var i;
  var row;
  var key;
  var student;
  var percentage;
  var updatedAt;
  var improvement;

  for (i = 0; i < cabaranRows.length; i += 1) {
    row = cabaranRows[i] || [];
    key = buildStudentSummaryKey_(
      row[classIndex],
      row[studentIdIndex],
      row[studentNameIndex]
    );

    if (!key) {
      continue;
    }

    student = getOrCreateStudentSummary_(students, key, {
      classId: row[classIndex],
      studentId: row[studentIdIndex],
      studentName: row[studentNameIndex],
    });
    student.checkpoints[String(row[checkpointIndex] || "").trim()] = true;
    percentage = Number(row[percentageIndex]);

    if (!isNaN(percentage)) {
      student.percentageSum += percentage;
      student.percentageCount += 1;
    }

    updatedAt = String(row[updatedAtIndex] || "").trim();

    if (
      updatedAt &&
      (!student.lastUpdated ||
        Date.parse(updatedAt) >= Date.parse(student.lastUpdated || ""))
    ) {
      student.lastUpdated = updatedAt;
      student.latestSuggestedTP = String(row[suggestedTpIndex] || "").trim();
    }
  }

  for (i = 0; i < researchRows.length; i += 1) {
    row = researchRows[i] || [];
    key = buildStudentSummaryKey_(
      row[researchClassIndex],
      row[researchStudentIdIndex],
      row[researchStudentNameIndex]
    );

    if (!key) {
      continue;
    }

    student = getOrCreateStudentSummary_(students, key, {
      classId: row[researchClassIndex],
      studentId: row[researchStudentIdIndex],
      studentName: row[researchStudentNameIndex],
    });
    improvement = Number(row[improvementIndex]);

    if (!isNaN(improvement)) {
      student.improvementSum += improvement;
      student.improvementCount += 1;
    }
  }

  keys = Object.keys(students).sort(function (a, b) {
    var studentA = students[a];
    var studentB = students[b];
    var classCompare = String(studentA.classId || "").localeCompare(
      String(studentB.classId || "")
    );

    if (classCompare !== 0) {
      return classCompare;
    }

    return String(studentA.studentName || "").localeCompare(
      String(studentB.studentName || "")
    );
  });

  for (i = 0; i < keys.length; i += 1) {
    student = students[keys[i]];
    result.push([
      student.classId,
      student.studentId,
      student.studentName,
      Object.keys(student.checkpoints).filter(Boolean).length,
      student.percentageCount
        ? roundReportNumber_(student.percentageSum / student.percentageCount)
        : "",
      student.latestSuggestedTP,
      student.improvementCount
        ? roundReportNumber_(student.improvementSum / student.improvementCount)
        : "",
      student.lastUpdated,
    ]);
  }

  return result;
}

function buildStudentSummaryKey_(classId, studentId, studentName) {
  var normalizedClassId = String(classId || "")
    .trim()
    .toLowerCase();
  var normalizedStudentId = String(studentId || "")
    .trim()
    .toLowerCase();
  var normalizedStudentName = String(studentName || "")
    .trim()
    .toLowerCase();

  if (normalizedStudentId) {
    return "id|" + normalizedStudentId;
  }

  if (normalizedClassId && normalizedStudentName) {
    return "name|" + normalizedClassId + "|" + normalizedStudentName;
  }

  return "";
}

function getOrCreateStudentSummary_(students, key, values) {
  if (!students[key]) {
    students[key] = {
      classId: String((values && values.classId) || "").trim(),
      studentId: String((values && values.studentId) || "").trim(),
      studentName: String((values && values.studentName) || "").trim(),
      checkpoints: {},
      percentageSum: 0,
      percentageCount: 0,
      latestSuggestedTP: "",
      improvementSum: 0,
      improvementCount: 0,
      lastUpdated: "",
    };
  }

  return students[key];
}

function roundReportNumber_(value) {
  return Math.round(Number(value) * 100) / 100;
}

function parseExpiryDate_(value) {
  if (!value) {
    return null;
  }

  if (
    Object.prototype.toString.call(value) === "[object Date]" &&
    !isNaN(value.getTime())
  ) {
    return value;
  }

  var parsed = new Date(String(value).trim());

  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

function formatIsoDate_(date) {
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();

  return (
    year +
    "-" +
    (month < 10 ? "0" : "") +
    month +
    "-" +
    (day < 10 ? "0" : "") +
    day
  );
}

function rowValuesFromRecord_(row, syncedAt) {
  return [
    row.id || "",
    row.schoolCode || "",
    row.classId || "",
    row.studentId || "",
    row.studentName || "",
    row.checkpointId || "",
    row.category || "",
    row.targetText || "",
    row.transcript || "",
    row.confidence !== undefined && row.confidence !== null ? row.confidence : "",
    row.aiResult || "",
    row.aiScore !== undefined && row.aiScore !== null ? row.aiScore : "",
    row.teacherTP || "",
    row.finalResult || "",
    row.resultSource || "",
    row.timestamp || "",
    syncedAt,
  ];
}

function buildCabaranSummarySyncKey_(schoolCode, classId, studentId, checkpointId) {
  var parts = [
    normalizeKeyPart_(schoolCode),
    normalizeKeyPart_(classId),
    normalizeKeyPart_(studentId),
    normalizeKeyPart_(checkpointId),
  ];
  var i;

  for (i = 0; i < parts.length; i += 1) {
    if (!parts[i]) {
      return "";
    }
  }

  return parts.join("|");
}

function buildCabaranSummarySyncKeyFromPayload_(row) {
  return buildCabaranSummarySyncKey_(
    row.schoolCode,
    row.classId,
    row.studentId,
    row.checkpointId
  );
}

function buildCabaranSummarySyncKeyFromSheetRow_(rowValues) {
  if (!rowValues || !rowValues.length) {
    return "";
  }

  return buildCabaranSummarySyncKey_(
    rowValues[0],
    rowValues[1],
    rowValues[2],
    rowValues[4]
  );
}

function cabaranSummaryTimestampMs_(rowValues) {
  var ts = String((rowValues && rowValues[10]) || "").trim();
  var syncedAt = String((rowValues && rowValues[11]) || "").trim();
  var parsed = Date.parse(ts || syncedAt);

  if (isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function buildCabaranSummaryKeyRowMap_(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var rowValues;
  var summaryKey;
  var sheetRow;
  var existingRow;
  var existingValues;

  if (lastRow < 2) {
    return map;
  }

  values = sheet.getRange(2, 1, lastRow, CABARAN_RESULTS_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    rowValues = values[i];
    summaryKey = buildCabaranSummarySyncKeyFromSheetRow_(rowValues);

    if (!summaryKey) {
      continue;
    }

    sheetRow = i + 2;
    existingRow = map[summaryKey];

    if (!existingRow) {
      map[summaryKey] = sheetRow;
      continue;
    }

    existingValues = values[existingRow - 2];

    if (cabaranSummaryTimestampMs_(rowValues) >= cabaranSummaryTimestampMs_(existingValues)) {
      map[summaryKey] = sheetRow;
    }
  }

  return map;
}

function removeDuplicateCabaranSummaryRows_(sheet, summaryKey, keepRow) {
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var sheetRow;
  var rowsToDelete = [];

  if (lastRow < 2 || !summaryKey || !keepRow) {
    return;
  }

  values = sheet.getRange(2, 1, lastRow, CABARAN_RESULTS_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    sheetRow = i + 2;

    if (sheetRow === keepRow) {
      continue;
    }

    if (buildCabaranSummarySyncKeyFromSheetRow_(values[i]) === summaryKey) {
      rowsToDelete.push(sheetRow);
    }
  }

  rowsToDelete.sort(function (a, b) {
    return b - a;
  });

  for (i = 0; i < rowsToDelete.length; i += 1) {
    sheet.deleteRow(rowsToDelete[i]);
  }
}

function cabaranSummaryRowValuesFromRecord_(row, syncedAt) {
  return [
    row.schoolCode || "",
    row.classId || "",
    row.studentId || "",
    row.studentName || "",
    row.checkpointId || "",
    row.totalCorrect !== undefined && row.totalCorrect !== null ? row.totalCorrect : "",
    row.totalQuestions !== undefined && row.totalQuestions !== null ? row.totalQuestions : "",
    row.percentage !== undefined && row.percentage !== null ? row.percentage : "",
    row.suggestedTP || "",
    row.cabaranCompleted === false ? false : true,
    row.updatedAt || "",
    syncedAt,
  ];
}

function syncCabaranSummaries_(body) {
  var records = (body && body.records) || [];
  var sheet = getOrCreateSheet_(CABARAN_RESULTS_SHEET_NAME);
  var syncedAt = new Date().toISOString();
  var keyIndex = buildCabaranSummaryKeyRowMap_(sheet);
  var inserted = 0;
  var updated = 0;
  var i;
  var row;
  var summaryKey;
  var rowValues;
  var targetRow;

  ensureHeaders_(sheet, CABARAN_RESULTS_HEADERS);

  for (i = 0; i < records.length; i += 1) {
    row = records[i] || {};
    summaryKey = buildCabaranSummarySyncKeyFromPayload_(row);

    if (!summaryKey) {
      continue;
    }

    rowValues = cabaranSummaryRowValuesFromRecord_(row, syncedAt);
    targetRow = keyIndex[summaryKey];

    if (targetRow) {
      sheet
        .getRange(targetRow, 1, 1, CABARAN_RESULTS_HEADERS.length)
        .setValues([rowValues]);
      removeDuplicateCabaranSummaryRows_(sheet, summaryKey, targetRow);
      updated += 1;
    } else {
      sheet.appendRow(rowValues);
      keyIndex[summaryKey] = sheet.getLastRow();
      inserted += 1;
    }
  }

  var research = upsertCabaranResearch_(records, syncedAt);

  return jsonResponse_({
    success: true,
    inserted: inserted,
    updated: updated,
    researchInserted: research.inserted,
    researchUpdated: research.updated,
  });
}

function getCabaranResults_(body) {
  var schoolCode = String((body && body.schoolCode) || "")
    .trim()
    .toUpperCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CABARAN_RESULTS_SHEET_NAME);
  var lastRow;
  var values;
  var records = [];
  var i;
  var row;
  var record;

  if (!sheet) {
    return jsonResponse_({ success: true, records: [] });
  }

  lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse_({ success: true, records: [] });
  }

  values = sheet.getRange(2, 1, lastRow - 1, CABARAN_RESULTS_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    row = values[i] || [];

    if (schoolCode && String(row[0] || "").trim().toUpperCase() !== schoolCode) {
      continue;
    }

    record = {
      schoolCode: row[0] || "",
      classId: row[1] || "",
      studentId: row[2] || "",
      studentName: row[3] || "",
      checkpointId: row[4] || "",
      totalCorrect: row[5],
      totalQuestions: row[6],
      percentage: row[7],
      suggestedTP: row[8] || "",
      cabaranCompleted: row[9] === false ? false : true,
      updatedAt: formatSheetDateValue_(row[10]),
      syncedAt: formatSheetDateValue_(row[11]),
    };

    records.push(record);
  }

  records.sort(function (a, b) {
    return Date.parse(b.updatedAt || b.syncedAt || "") - Date.parse(a.updatedAt || a.syncedAt || "");
  });

  return jsonResponse_({ success: true, records: records });
}

function formatSheetDateValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  return String(value || "");
}

function buildCabaranResearchKeyRowMap_(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  var values;
  var i;
  var key;

  if (lastRow < 2) {
    return map;
  }

  values = sheet.getRange(2, 1, lastRow - 1, CABARAN_RESEARCH_HEADERS.length).getValues();

  for (i = 0; i < values.length; i += 1) {
    key = buildCabaranSummarySyncKey_(
      values[i][0],
      values[i][1],
      values[i][2],
      values[i][4]
    );

    if (key && !map[key]) {
      map[key] = i + 2;
    }
  }

  return map;
}

function cabaranNumberOrEmpty_(value) {
  return value !== undefined && value !== null && value !== "" ? Number(value) : "";
}

function formatImprovement_(firstPercentage, latestPercentage) {
  var first = Number(firstPercentage);
  var latest = Number(latestPercentage);

  if (isNaN(first) || isNaN(latest)) {
    return "";
  }

  var diff = latest - first;
  return diff > 0 ? "+" + diff : String(diff);
}

function upsertCabaranResearch_(records, syncedAt) {
  var sheet = getOrCreateSheet_(CABARAN_RESEARCH_SHEET_NAME);
  ensureHeaders_(sheet, CABARAN_RESEARCH_HEADERS);

  var keyIndex = buildCabaranResearchKeyRowMap_(sheet);
  var inserted = 0;
  var updated = 0;
  var i;
  var row;
  var key;
  var targetRow;
  var attemptDate;
  var correct;
  var total;
  var percentage;
  var suggestedTP;
  var firstPercentage;

  for (i = 0; i < records.length; i += 1) {
    row = records[i] || {};

    if (row.cabaranCompleted === false) {
      continue;
    }

    key = buildCabaranSummarySyncKeyFromPayload_(row);

    if (!key) {
      continue;
    }

    attemptDate = String(row.updatedAt || "").trim() || syncedAt;
    correct = cabaranNumberOrEmpty_(row.totalCorrect);
    total = cabaranNumberOrEmpty_(row.totalQuestions);
    percentage = cabaranNumberOrEmpty_(row.percentage);
    suggestedTP = row.suggestedTP || "";
    targetRow = keyIndex[key];

    if (targetRow) {
      // Existing row: first* columns (6-10) are never touched.
      firstPercentage = sheet.getRange(targetRow, 8).getValue();
      sheet.getRange(targetRow, 11, 1, 6).setValues([
        [
          correct,
          total,
          percentage,
          suggestedTP,
          attemptDate,
          formatImprovement_(firstPercentage, percentage),
        ],
      ]);
      updated += 1;
    } else {
      sheet.appendRow([
        row.schoolCode || "",
        row.classId || "",
        row.studentId || "",
        row.studentName || "",
        row.checkpointId || "",
        correct,
        total,
        percentage,
        suggestedTP,
        attemptDate,
        correct,
        total,
        percentage,
        suggestedTP,
        attemptDate,
        formatImprovement_(percentage, percentage),
      ]);
      keyIndex[key] = sheet.getLastRow();
      inserted += 1;
    }
  }

  return { inserted: inserted, updated: updated };
}

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  var existing = [];
  var i;
  var match = true;

  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];

  for (i = 0; i < headers.length; i += 1) {
    if (String(existing[i] || "") !== headers[i]) {
      match = false;
      break;
    }
  }

  if (!match) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
