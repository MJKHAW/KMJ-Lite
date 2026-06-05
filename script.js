(function () {
  "use strict";

  const DEBUG_HOTSPOTS = false;
  const DEBUG_TULIS_HOTSPOTS = false;
  /** Set true to show red outline boxes for every Cabaran HTML overlay (adjust CABARAN_OVERLAY_LAYOUT). */
  const DEBUG_CABARAN_LAYOUT = false;
  const LATIHAN_CALIBRATION_MODE = false;
  const LATIHAN_EASY_ADJUST_MODE = false;

  /** Single source for Latihan Choice overlay + hotspot positions (%). */
  const LATIHAN_LAYOUT = {
    progress: { left: 17, top: 35.3, width: 71, height: 6 },
    question: { left: 10, top: 46, width: 80, height: 14 },
    answerA: { left: 11, top: 57, width: 25, height: 25 },
    answerB: { left: 40, top: 57, width: 19, height: 25 },
    answerC: { left: 67, top: 57, width: 25, height: 25 },
    kembali: { left: 4, top: 88, width: 25, height: 7 },
    ulang: { left: 38.2, top: 84.7, width: 24, height: 7 },
    seterusnya: { left: 67, top: 88, width: 25, height: 7 },
    reinforcement: { left: 41.6, top: 20.1, width: 36.1, height: 13.8 },
    feedback: { left: 31, top: 40, width: 38, height: 6 },
  };

  /** Original cabaran.png answer button positions (%). */
  const CABARAN_ANSWER_OVERLAY_ORIGINAL = {
    answerA: { left: 12, top: 58, width: 24, height: 11 },
    answerB: { left: 38, top: 58, width: 24, height: 11 },
    answerC: { left: 64, top: 58, width: 24, height: 11 },
  };

  /**
   * Cabaran HTML overlay positions (% of screen). Edit values here to adjust phone/tablet layout.
   * Visual reference: assets/cabaran.png — set DEBUG_CABARAN_LAYOUT = true to see red boxes.
   */
  const CABARAN_OVERLAY_LAYOUT = {
    progressBox: { left: 19.4, top: 23.5, width: 64, height: 5 },
    instructionText: { left: 12, top: 33, width: 76, height: 5 },
    blankQuestion: { left: 11.6, top: 39.4, width: 77, height: 12.8 },
    audioVisual: { left: 40, top: 40, width: 20, height: 10 },
    answerA: { left: 12.4, top: 57.9, width: 24, height: 11 },
    answerB: { left: 38.6, top: 57.9, width: 24, height: 11 },
    answerC: { left: 64.4, top: 57.9, width: 24, height: 11 },
    feedbackText: { left: 26.2, top: 72.9, width: 48, height: 6, fontSize: 2.6 },
    targetWord: { left: 12, top: 40, width: 76, height: 10 },
    susunAnswer: { left: 10, top: 46, width: 80, height: 12 },
    susunDrag: { left: 10.4, top: 59.9, width: 80, height: 12 },
    timerBox: { left: 73.9, top: 81.6, width: 12, height: 8, fontSize: 6 },
    typingInput: { left: 12.1, top: 53.8, width: 76.4, height: 14.1, fontSize: 3.2 },
    typingSubmit: { left: 76.2, top: 68.6, width: 14.2, height: 7.8, fontSize: 4.2 },
  };
  
  
  const CABARAN_OVERLAY_LAYOUT_DEFAULT = JSON.parse(
    JSON.stringify(CABARAN_OVERLAY_LAYOUT)
  );

  ["answerA", "answerB", "answerC"].forEach(function (key) {
    const original = CABARAN_ANSWER_OVERLAY_ORIGINAL[key];

    CABARAN_OVERLAY_LAYOUT[key] = JSON.parse(JSON.stringify(original));
    CABARAN_OVERLAY_LAYOUT_DEFAULT[key] = JSON.parse(JSON.stringify(original));
  });

  /** Cabaran fixed button hotspots (%). Calibrate with DEBUG_CABARAN_LAYOUT = true. */
  const CABARAN_BUTTON_LAYOUT = {
    exitButton: { left: 84, top: 3, width: 11, height: 8 },
    submenuButton: { left: 3, top: 3, width: 14, height: 8 },
    ulangButton: { left: 38.2, top: 84.7, width: 24, height: 7 },
  };
    
  const CABARAN_BUTTON_LAYOUT_DEFAULT = JSON.parse(
    JSON.stringify(CABARAN_BUTTON_LAYOUT)
  );
  const CABARAN_BUTTON_LAYOUT_KEYS = [
    "exitButton",
    "submenuButton",
    "ulangButton",
  ];

  const CABARAN_LAYOUT_STORAGE_KEY = "kmj_cabaran_overlay_layout_debug_v1";
  const CABARAN_LAYOUT_PANEL_HIDDEN_KEY = "kmj_cabaran_layout_panel_hidden_v1";
  const CABARAN_LAYOUT_KEYS = [
    "progressBox",
    "instructionText",
    "blankQuestion",
    "audioVisual",
    "answerA",
    "answerB",
    "answerC",
    "feedbackText",
    "targetWord",
    "susunAnswer",
    "susunDrag",
    "timerBox",
    "typingInput",
    "typingSubmit",
  ];
  const CABARAN_CALIBRATION_KEYS = CABARAN_LAYOUT_KEYS.concat(
    CABARAN_BUTTON_LAYOUT_KEYS
  );

  const CABARAN_CHOICE_COUNTDOWN_SEC = 10;
  const CABARAN_SUSUN_COUNTDOWN_SEC = 20;

  const CABARAN_SHORT_EASY_COUNT = 4;
  const CABARAN_SHORT_MEDIUM_COUNT = 3;
  const CABARAN_SHORT_HARD_COUNT = 3;

  /** Measured from assets/tulis.png (1080x1920). */
  const TULIS_BOTTOM_HOTSPOT_RECTS = [
    { id: "tulis_kembali", left: 5.6, top: 76.6, width: 21.5, height: 10.4 },
    { id: "tulis_padam", left: 30.2, top: 75, width: 32.9, height: 8.7 },
    { id: "tulis_seterusnya", left: 63.7, top: 76.7, width: 32.2, height: 8.5 },
  ];

  /** @type {Record<string, { image: string, hotspots: Array<{ id?: string, label: string, left: number, top: number, width: number, height: number, action: string, target?: string, message?: string }> }>} */
  const SCREENS = {
    home: {
      image: "assets/home.png",
      hotspots: [
        {
          id: "help",
          label: "Bantuan",
          left: 4,
          top: 4,
          width: 11,
          height: 6,
          action: "alert",
          message: "Bantuan",
        },
        {
          id: "close",
          label: "Keluar",
          left: 85,
          top: 4,
          width: 11,
          height: 6,
          action: "alert",
          message: "Keluar aplikasi?",
        },
        {
          id: "mula",
          label: "Mula",
          left: 28,
          top: 47,
          width: 44,
          height: 9,
          action: "go",
          target: "login",
        },
      ],
    },
    login: {
      image: "assets/login.png",
      hotspots: [
        {
          id: "home",
          label: "Laman utama",
          left: 9,
          top: 4,
          width: 11,
          height: 6,
          action: "go",
          target: "home",
        },
        {
          id: "close",
          label: "Tutup",
          left: 84,
          top: 4,
          width: 11,
          height: 6,
          action: "alert",
          message: "Keluar aplikasi?",
        },
        {
          id: "masuk",
          label: "Masuk",
          left: 25,
          top: 69,
          width: 50,
          height: 9,
          action: "student-login",
          target: "map",
        },
      ],
    },
    map: {
      image: "assets/map.png",
      hotspots: [
        {
          id: "home",
          label: "Laman utama",
          left: 9,
          top: 4,
          width: 11,
          height: 6,
          action: "go",
          target: "home",
        },
        {
          id: "close",
          label: "Tutup",
          left: 84,
          top: 4,
          width: 11,
          height: 6,
          action: "alert",
          message: "Keluar aplikasi?",
        },
        {
          id: "station6_puncak",
          label: "Puncak",
          left: 9.1,
          top: 29.6,
          width: 25.75,
          height: 14,
          action: "alert",
          message: "Pulau 6 akan datang",
        },
        {
          id: "station5_gunung",
          label: "Gunung",
          left: 64.25,
          top: 29.6,
          width: 25.75,
          height: 14,
          action: "alert",
          message: "Pulau 5 akan datang",
        },
        {
          id: "station4_lembah",
          label: "Lembah",
          left: 9.1,
          top: 52.6,
          width: 25.75,
          height: 13,
          action: "alert",
          message: "Pulau 4 akan datang",
        },
        {
          id: "station3_kota",
          label: "Kota",
          left: 64.25,
          top: 52.6,
          width: 25.75,
          height: 13,
          action: "alert",
          message: "Pulau 3 akan datang",
        },
        {
          id: "station1_kampung",
          label: "Kampung",
          left: 9.1,
          top: 77.6,
          width: 25.75,
          height: 13,
          action: "go",
          target: "island1",
        },
        {
          id: "station2_pulau",
          label: "Pulau",
          left: 63.1,
          top: 77.6,
          width: 29.25,
          height: 13,
          action: "alert",
          message: "Pulau 2 akan datang",
        },
      ],
    },
    island1: {
      image: "assets/island1.png",
      hotspots: [
        // LOCKED checkpoint grid (do not change without visual retest)
        {
          id: "menu",
          label: "Menu",
          left: 10,
          top: 4,
          width: 11,
          height: 6,
          action: "go",
          target: "map",
        },
        {
          id: "close",
          label: "Tutup",
          left: 84,
          top: 4,
          width: 11,
          height: 6,
          action: "alert",
          message: "Keluar aplikasi?",
        },
        // vokal: 33/24/43/10 | konsonan: 33/35/43/10 | suku_kata_kv: 33/49/43/10
        // perkataan_vkv: 33/61/43/10 | perkataan_kvkv: 33/75/43/10 -> transition -> belajar
        {
          id: "vokal",
          label: "Vokal",
          left: 33,
          top: 24,
          width: 43,
          height: 10,
          action: "transition",
        },
        {
          id: "konsonan",
          label: "Konsonan",
          left: 33,
          top: 35,
          width: 43,
          height: 10,
          action: "transition",
        },
        {
          id: "suku_kata_kv",
          label: "Suku kata KV",
          left: 33,
          top: 49,
          width: 43,
          height: 10,
          action: "transition",
        },
        {
          id: "perkataan_vkv",
          label: "Perkataan VKV",
          left: 33,
          top: 61,
          width: 43,
          height: 10,
          action: "transition",
        },
        {
          id: "perkataan_kvkv",
          label: "Perkataan KVKV",
          left: 33,
          top: 75,
          width: 43,
          height: 10,
          action: "transition",
        },
      ],
    },
    transition: {
      image: "assets/transition.png",
      hotspots: [],
    },
    belajar: {
      image: "assets/belajar.png",
      hotspots: [
        {
          id: "screen_back",
          label: "Kembali ke Kampung",
          left: 8.3,
          top: 3.8,
          width: 6.9,
          height: 4.9,
          action: "go",
          target: "island1",
        },
        {
          id: "close",
          label: "Tutup",
          left: 83.3,
          top: 3.2,
          width: 10.8,
          height: 6,
          action: "alert",
          message: "Keluar aplikasi?",
        },
        {
          id: "word_prev",
          label: "Perkataan sebelumnya",
          left: 11.1,
          top: 57.8,
          width: 12,
          height: 6.8,
          action: "belajar-prev",
        },
        {
          id: "word_next",
          label: "Perkataan seterusnya",
          left: 76.9,
          top: 57.8,
          width: 12,
          height: 6.8,
          action: "belajar-next",
        },
        {
          id: "dengar",
          label: "Dengar",
          left: 44.9,
          top: 62.2,
          width: 13.9,
          height: 7.8,
          action: "belajar-dengar",
          message: "Dengar audio akan ditambah selepas ini",
        },
        {
          id: "sebut",
          label: "Sebut",
          left: 44.9,
          top: 74.2,
          width: 13.9,
          height: 7.8,
          action: "belajar-sebut",
        },
        {
          id: "tulis",
          label: "Tulis",
          left: 44.9,
          top: 86.3,
          width: 13.9,
          height: 7.4,
          action: "go",
          target: "tulis",
        },
        {
          id: "latihan",
          label: "Latihan",
          left: 74.1,
          top: 74,
          width: 22.2,
          height: 11.3,
          action: "go",
          target: "latihan",
        },
      ],
    },
    tulis: {
      image: "assets/tulis.png",
      hotspots: [
        {
          id: "tulis_back_top",
          label: "Kembali (atas)",
          left: 4.2,
          top: 3.6,
          width: 12.2,
          height: 7.2,
          action: "tulis-back",
        },
        {
          id: "tulis_exit_top",
          label: "Keluar",
          left: 84.2,
          top: 3.5,
          width: 11.5,
          height: 7.2,
          action: "tulis-back",
        },
        {
          id: "tulis_kembali",
          label: "Kembali",
          left: 5.6,
          top: 76.6,
          width: 21.5,
          height: 10.4,
          action: "tulis-back",
        },
        {
          id: "tulis_padam",
          label: "Padam",
          left: 30.2,
          top: 75,
          width: 32.9,
          height: 8.7,
          action: "tulis-clear",
        },
        {
          id: "tulis_seterusnya",
          label: "Seterusnya",
          left: 63.7,
          top: 76.7,
          width: 32.2,
          height: 8.5,
          action: "tulis-next",
        },
        {
          id: "tulis_demo_replay",
          label: "Tonton animasi cara menulis",
          left: 11.5,
          top: 41.9,
          width: 77.2,
          height: 8.4,
          action: "tulis-replay-demo",
        },
      ],
    },
    latihan: {
      image: "assets/latihan_choice.png",
      hotspots: [],
    },
    latihan_susun: {
      image: "assets/latihan_susun.png",
      hotspots: [],
    },
    cabaran: {
      image: "assets/cabaran.png",
      hotspots: [],
    },
    result: {
      image: "assets/result.png",
      hotspots: [],
    },
    lencana: {
      image: "assets/lencana.png",
      hotspots: [
        {
          id: "kembali",
          label: "Kembali",
          left: 28,
          top: 88,
          width: 44,
          height: 9,
          action: "go",
          target: "map",
        },
      ],
    },
  };

  const TRANSITION_MS = 1500;

  const BELAJAR_CONTENT = {
    vokal: ["a", "e", "i", "o", "u"],
    konsonan: [
      "b", "c", "d", "f", "g", "h", "j", "k", "l", "m",
      "n", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z",
    ],
    perkataan_vkv: ["api", "ibu", "ubi", "abu", "itu"],
    perkataan_kvkv: [
      "buku", "bola", "baju", "kaki", "mata", "susu",
      "roti", "gigi", "kuda", "topi",
    ],
  };

  const SUKU_KATA_KV_LEVELS = [
    { level: "Level 1", title: "ba bi bu be bo", items: ["ba", "bi", "bu", "be", "bo"] },
    { level: "Level 2", title: "ca ci cu ce co", items: ["ca", "ci", "cu", "ce", "co"] },
    { level: "Level 3", title: "da di du de do", items: ["da", "di", "du", "de", "do"] },
    { level: "Level 4", title: "fa fi fu fe fo", items: ["fa", "fi", "fu", "fe", "fo"] },
    { level: "Level 5", title: "ga gi gu ge go", items: ["ga", "gi", "gu", "ge", "go"] },
    { level: "Level 6", title: "ha hi hu he ho", items: ["ha", "hi", "hu", "he", "ho"] },
    { level: "Level 7", title: "ja ji ju je jo", items: ["ja", "ji", "ju", "je", "jo"] },
    { level: "Level 8", title: "ka ki ku ke ko", items: ["ka", "ki", "ku", "ke", "ko"] },
    { level: "Level 9", title: "la li lu le lo", items: ["la", "li", "lu", "le", "lo"] },
    { level: "Level 10", title: "ma mi mu me mo", items: ["ma", "mi", "mu", "me", "mo"] },
    { level: "Level 11", title: "na ni nu ne no", items: ["na", "ni", "nu", "ne", "no"] },
    { level: "Level 12", title: "pa pi pu pe po", items: ["pa", "pi", "pu", "pe", "po"] },
    { level: "Level 13", title: "ra ri ru re ro", items: ["ra", "ri", "ru", "re", "ro"] },
    { level: "Level 14", title: "sa si su se so", items: ["sa", "si", "su", "se", "so"] },
    { level: "Level 15", title: "ta ti tu te to", items: ["ta", "ti", "tu", "te", "to"] },
    { level: "Level 16", title: "wa wi wu we wo", items: ["wa", "wi", "wu", "we", "wo"] },
    { level: "Level 17", title: "ya yi yu ye yo", items: ["ya", "yi", "yu", "ye", "yo"] },
    { level: "Level 18", title: "za zi zu ze zo", items: ["za", "zi", "zu", "ze", "zo"] },
  ];

  const BELAJAR_FONT =
    "'Comic Neue', 'Comic Sans MS', 'Comic Sans', Arial, sans-serif";

  const BELAJAR_FONT_SIZES = {
    vokal: "7.4rem",
    konsonan: "7.4rem",
    suku_kata_kv: "7rem",
    perkataan_vkv: "6.6rem",
    perkataan_kvkv: "6.6rem",
  };

  const BELAJAR_WRITING_ZONE_STYLE =
    "position:absolute;left:20%;top:32%;width:66%;height:13%;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "text-align:center;pointer-events:none;overflow:visible;";

  const BELAJAR_LEVEL_FONT_SIZE = "1.1rem";

  const BELAJAR_AUDIO_CHECKPOINTS = [
    "vokal",
    "konsonan",
    "suku_kata_kv",
    "perkataan_vkv",
    "perkataan_kvkv",
  ];

  const BELAJAR_AUDIO_FOLDERS = {
    vokal: "vokal",
    konsonan: "konsonan",
    suku_kata_kv: "suku_kata_kv",
    perkataan_vkv: "perkataan_vkv",
    perkataan_kvkv: "perkataan_kvkv",
  };

  const PRONUNCIATION_FEEDBACK = {
    belajar: {
      showDetected: true,
      correct: "Hebat! Betul!",
      incorrect: "Cuba lagi 😊",
      unsupported: "Sebut tidak disokong pada pelayar ini. Guna Chrome.",
      listeningError: "Cuba lagi 😊",
    },
    latihan: {
      showDetected: true,
      correct: "Wah! Betul! +1 ⭐",
      incorrect: "Cuba lagi! Kamu boleh!",
      unsupported: "Sebut tidak disokong pada pelayar ini. Guna Chrome.",
      listeningError: "Cuba lagi! Kamu boleh!",
    },
    cabaran: {
      showDetected: true,
      correct: "Betul! +10 mata! 🏆",
      incorrect: "Cuba lagi! Mata masih boleh naik!",
      unsupported: "Sebut tidak disokong pada pelayar ini. Guna Chrome.",
      listeningError: "Cuba lagi! Mata masih boleh naik!",
    },
  };

  const TEACHER_PIN = "1234";
  const TEACHER_MODE_KEY = "kmj_teacher_mode";
  const STUDENT_RECORD_SAVED_MSG = "Rakaman berjaya disimpan! Sila teruskan.";
  const STUDENT_OFFLINE_SAVED_MSG =
    "Rekod disimpan dalam peranti ini. Belum Sync.";
  const HOME_LONG_PRESS_MS = 6000;

  const stage = document.getElementById("stage");
  let activeScreen = "home";
  let transitionTimer = null;
  let selectedCheckpoint = "vokal";
  let belajarItemIndex = 0;
  let belajarLevelIndex = 0;
  let belajarLevelItemIndex = 0;
  let belajarLevelDisplay = null;
  let belajarWordDisplay = null;
  let belajarFeedback = null;
  let belajarStudentSyncBadge = null;
  let belajarAudio = null;
  let belajarAudioGeneration = 0;
  let belajarSebutOverlayEl = null;
  let belajarSebutOverlayMessageEl = null;
  let belajarSebutOverlayMicEl = null;
  let belajarWordAiFallbackOverlayEl = null;
  let belajarWordGoogleApiFailStreak = 0;
  const BELAJAR_WORD_GOOGLE_API_FAIL_THRESHOLD = 3;
  let pronunciationFeedbackTimer = null;
  let pronunciationRecordingBusy = false;
  let latihanFeedback = null;
  let latihanReinforcementEl = null;
  let latihanReinforcementWordEl = null;
  let latihanReinforcementBreakdownEl = null;
  let latihanLayoutCopyBtn = null;
  let latihanChoiceQuestionEl = null;
  let latihanChoiceQuestionItems = [];
  let latihanChoiceAnswerEls = [];
  let latihanChoiceCorrectIndex = -1;
  let latihanChoiceSelectedIndex = -1;
  let latihanChoiceInfoEl = null;
  let latihanChoiceLabelEl = null;
  let latihanChoiceProgressEl = null;
  let latihanChoiceProgressFillEl = null;
  let latihanChoiceQuestionNum = 1;
  let latihanChoiceResetTimer = null;
  let latihanChoiceWrongAttempts = 0;
  let latihanChoiceAnsweredCorrectly = false;
  let latihanChoiceHintVisible = false;
  let latihanCompletionOverlayEl = null;
  let latihanCompletionSecondaryBtn = null;
  const CABARAN_TOTAL_QUESTIONS = 10;
  const CABARAN_SPEECH_TIMEOUT_MS = 3500;
  const CABARAN_DB_NAME = "KMJ_Cabaran_Lite";
  const CABARAN_DB_VERSION = 3;
  const CABARAN_SUMMARIES_STORE = "cabaran_summaries";
  const CABARAN_LEARNING_UNLOCKS_STORE = "learning_unlocks";
  /** One row per school + class + student + checkpoint; repeated Cabaran overwrites via IndexedDB put. */
  const CABARAN_SUMMARY_SYNC_MODE = "upsert";
  /** updatedAt = latest Cabaran completion time (ISO 8601, e.g. 2026-06-07T09:12:05.000Z). */
  const CABARAN_CORRECT_FEEDBACK = "Betul ⭐";
  const CABARAN_WRONG_FEEDBACK = "Cuba lagi 😊";
  let latihanQuestionStartToken = 0;

  const LATIHAN_CHOICE_TOTAL = 10;
  const LATIHAN_CHOICE_LABEL = "Pilih jawapan yang betul";
  const LATIHAN_GUIDANCE_LISTEN = "Mari dengar dahulu";
  const LATIHAN_CHOICE_GUIDANCE = "Mari cuba!";
  const LATIHAN_FEEDBACK_HIDE_MS = 2000;
  const STUDENT_HOME_ROSTER_ERROR_MSG =
    "Sila sambung internet atau minta guru semak kod sekolah.";

  const LATIHAN_ANSWER_KEYS = ["answerA", "answerB", "answerC"];
  const LATIHAN_ANSWER_IDS = ["a", "b", "c"];
  let cabaranFeedback = null;
  let cabaranZoneEl = null;
  let cabaranProgressEl = null;
  let cabaranQuestionEl = null;
  let cabaranAudioVisualEl = null;
  let cabaranBlankQuestionEl = null;
  let cabaranBlankPrefixEl = null;
  let cabaranBlankSlotEl = null;
  let cabaranBlankSuffixEl = null;
  let cabaranTypeInputWrapEl = null;
  let cabaranTypeLabelEl = null;
  let cabaranTypeInputEl = null;
  let cabaranTypeSubmitBtn = null;
  let cabaranTargetEl = null;
  let cabaranAnswersEl = null;
  let cabaranAnswerBtns = [];
  let cabaranSusunAnswerEl = null;
  let cabaranSusunDragEl = null;
  let cabaranSusunSlotEls = [];
  let cabaranSusunChipEls = [];
  let cabaranSusunCurrentRound = null;
  let cabaranSusunPointerDrag = null;
  let cabaranSummaryOverlayEl = null;
  let cabaranQuestionNum = 1;
  let cabaranQuestionItems = [];
  let cabaranCorrectCount = 0;
  let cabaranSessionAnswers = [];
  let cabaranChoiceCorrectIndex = -1;
  let cabaranQuestionLocked = false;
  let cabaranBusy = false;
  let cabaranAdvanceTimer = null;
  let cabaranTimerEl = null;
  let cabaranCountdownInterval = null;
  let cabaranCountdownSeconds = 0;
  let cabaranDbPromise = null;
  let cabaranActiveRecognition = null;
  let cabaranLayoutDebugPanelEl = null;
  let cabaranLayoutDebugInfoEl = null;
  let cabaranLayoutDebugShowTabEl = null;
  let cabaranLayoutDebugPanelHidden = false;
  let cabaranLayoutDebugKeybound = false;
  let cabaranLayoutDragState = null;
  let cabaranButtonHotspotEls = {};
  let teacherPinOverlay = null;
  let teacherLicenseOverlay = null;
  let teacherDashboardOverlay = null;
  let teacherDashboardListEl = null;
  let teacherRosterPanelEl = null;
  let teacherRosterTableBody = null;
  let teacherRosterCountEl = null;
  let teacherSyncStatusEl = null;
  let teacherSyncSheetBtn = null;
  let teacherShowAllRecords = false;
  let teacherRecordFilterToggleBtn = null;
  let isSyncing = false;
  let teacherImportTextarea = null;
  let teacherBlobUrls = [];
  let homeLongPressTimer = null;
  let homeLongPressPointerId = null;
  let loginClassSelect = null;
  let loginNameSelect = null;
  let loginRosterStatusEl = null;
  let latihanFeedbackHideTimer = null;
  let tulisPreviousScreen = "belajar";
  let tulisDemoDisplay = null;
  let tulisCanvas = null;
  let tulisCtx = null;
  let tulisDrawing = false;
  let tulisPointerId = null;
  let tulisLastPoint = null;
  let tulisAnimationTimer = null;
  let tulisAutoReplayTimer = null;


  function applyDebugMode() {
    document.body.classList.toggle("debug-hotspots", DEBUG_HOTSPOTS);
    applyCabaranDebugMode();
  }

  function roundCabaranPct(value) {
    return Math.round(value * 10) / 10;
  }

  function clampCabaranLayoutRect(rect) {
    rect.width = roundCabaranPct(Math.max(2, Math.min(100 - rect.left, rect.width)));
    rect.height = roundCabaranPct(Math.max(2, Math.min(100 - rect.top, rect.height)));
    rect.left = roundCabaranPct(Math.max(0, Math.min(100 - rect.width, rect.left)));
    rect.top = roundCabaranPct(Math.max(0, Math.min(100 - rect.height, rect.top)));
  }

  function isCabaranButtonLayoutKey(layoutKey) {
    return CABARAN_BUTTON_LAYOUT_KEYS.indexOf(layoutKey) >= 0;
  }

  function getCabaranLayoutRect(layoutKey) {
    if (isCabaranButtonLayoutKey(layoutKey)) {
      return CABARAN_BUTTON_LAYOUT[layoutKey] || null;
    }

    return CABARAN_OVERLAY_LAYOUT[layoutKey] || null;
  }

  function getCabaranOverlayPointerEvents(layoutKey) {
    if (DEBUG_CABARAN_LAYOUT) {
      return "auto";
    }

    if (
      layoutKey === "answerA" ||
      layoutKey === "answerB" ||
      layoutKey === "answerC" ||
      layoutKey === "susunAnswer" ||
      layoutKey === "susunDrag" ||
      layoutKey === "typingInput" ||
      layoutKey === "typingSubmit"
    ) {
      return "auto";
    }

    return "none";
  }

  function loadCabaranLayoutDebugPanelHidden() {
    if (!DEBUG_CABARAN_LAYOUT || !window.localStorage) {
      return;
    }

    try {
      cabaranLayoutDebugPanelHidden =
        window.localStorage.getItem(CABARAN_LAYOUT_PANEL_HIDDEN_KEY) === "1";
    } catch (error) {
      cabaranLayoutDebugPanelHidden = false;
    }
  }

  function saveCabaranLayoutDebugPanelHidden() {
    if (!DEBUG_CABARAN_LAYOUT || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(
        CABARAN_LAYOUT_PANEL_HIDDEN_KEY,
        cabaranLayoutDebugPanelHidden ? "1" : "0"
      );
    } catch (error) {
      // Ignore.
    }
  }

  function positionCabaranLayoutDebugPanel() {
    if (!cabaranLayoutDebugPanelEl || cabaranLayoutDebugPanelHidden) {
      return;
    }

    const stage = document.getElementById("stage");
    const panel = cabaranLayoutDebugPanelEl;

    if (!stage || !panel) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 220;
    const gap = 12;
    const canDockRight = stageRect.right + gap + panelWidth <= window.innerWidth - 8;

    panel.classList.toggle("is-docked-right", canDockRight);
    panel.classList.toggle("is-docked-fallback", !canDockRight);

    if (canDockRight) {
      panel.style.left = Math.round(stageRect.right + gap) + "px";
      panel.style.top = Math.max(8, Math.round(stageRect.top + 8)) + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    } else {
      panel.style.left = "auto";
      panel.style.right = "8px";
      panel.style.top = "auto";
      panel.style.bottom = "8px";
    }

    if (cabaranLayoutDebugShowTabEl) {
      if (canDockRight) {
        cabaranLayoutDebugShowTabEl.style.left =
          Math.round(stageRect.right + gap) + "px";
        cabaranLayoutDebugShowTabEl.style.top =
          Math.max(8, Math.round(stageRect.top + 8)) + "px";
        cabaranLayoutDebugShowTabEl.style.right = "auto";
        cabaranLayoutDebugShowTabEl.style.bottom = "auto";
      } else {
        cabaranLayoutDebugShowTabEl.style.left = "auto";
        cabaranLayoutDebugShowTabEl.style.right = "8px";
        cabaranLayoutDebugShowTabEl.style.top = "auto";
        cabaranLayoutDebugShowTabEl.style.bottom = "8px";
      }
    }
  }

  function updateCabaranLayoutDebugPanelVisibility() {
    if (!DEBUG_CABARAN_LAYOUT) {
      if (cabaranLayoutDebugPanelEl) {
        cabaranLayoutDebugPanelEl.style.display = "none";
      }

      if (cabaranLayoutDebugShowTabEl) {
        cabaranLayoutDebugShowTabEl.style.display = "none";
      }

      return;
    }

    const onCabaran = activeScreen === "cabaran";

    if (cabaranLayoutDebugPanelEl) {
      cabaranLayoutDebugPanelEl.style.display =
        onCabaran && !cabaranLayoutDebugPanelHidden ? "block" : "none";
    }

    if (cabaranLayoutDebugShowTabEl) {
      cabaranLayoutDebugShowTabEl.style.display =
        onCabaran && cabaranLayoutDebugPanelHidden ? "block" : "none";
    }

    if (onCabaran && !cabaranLayoutDebugPanelHidden) {
      positionCabaranLayoutDebugPanel();
    } else if (onCabaran && cabaranLayoutDebugPanelHidden) {
      positionCabaranLayoutDebugPanel();
    }
  }

  function setCabaranLayoutDebugPanelHidden(hidden) {
    cabaranLayoutDebugPanelHidden = !!hidden;
    saveCabaranLayoutDebugPanelHidden();
    updateCabaranLayoutDebugPanelVisibility();
  }

  function toggleCabaranLayoutDebugPanelVisibility() {
    setCabaranLayoutDebugPanelHidden(!cabaranLayoutDebugPanelHidden);
  }

  function bindCabaranLayoutDebugKeyboard() {
    if (cabaranLayoutDebugKeybound) {
      return;
    }

    cabaranLayoutDebugKeybound = true;

    document.addEventListener("keydown", function (event) {
      if (!DEBUG_CABARAN_LAYOUT || activeScreen !== "cabaran") {
        return;
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const tag = event.target && event.target.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }

      if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        toggleCabaranLayoutDebugPanelVisibility();
      }
    });
  }

  function getCabaranOverlayElementByKey(layoutKey) {
    switch (layoutKey) {
      case "progressBox":
        return cabaranProgressEl;
      case "instructionText":
        return cabaranQuestionEl;
      case "blankQuestion":
        return cabaranBlankQuestionEl;
      case "audioVisual":
        return cabaranAudioVisualEl;
      case "answerA":
        return cabaranAnswerBtns[0] || null;
      case "answerB":
        return cabaranAnswerBtns[1] || null;
      case "answerC":
        return cabaranAnswerBtns[2] || null;
      case "feedbackText":
        return cabaranFeedback;
      case "targetWord":
        return cabaranTargetEl;
      case "susunAnswer":
        return cabaranSusunAnswerEl;
      case "susunDrag":
        return cabaranSusunDragEl;
      case "timerBox":
        return cabaranTimerEl;
      case "typingInput":
        return cabaranTypeInputWrapEl;
      case "typingSubmit":
        return cabaranTypeSubmitBtn;
      default:
        return null;
    }
  }

  function appendCabaranLayoutBlockForCopy(output, objectName, keys, layoutStore) {
    output += "const " + objectName + " = {\n";

    keys.forEach(function (key) {
      const rect = layoutStore[key];

      if (!rect) {
        return;
      }

      output +=
        "  " +
        key +
        ": { left: " +
        roundCabaranPct(rect.left) +
        ", top: " +
        roundCabaranPct(rect.top) +
        ", width: " +
        roundCabaranPct(rect.width) +
        ", height: " +
        roundCabaranPct(rect.height);

      if (rect.fontSize != null) {
        output += ", fontSize: " + rect.fontSize;
      }

      output += " },\n";
    });

    output += "};";
    return output;
  }

  function serializeCabaranOverlayLayoutForCopy() {
    let output = appendCabaranLayoutBlockForCopy(
      "",
      "CABARAN_OVERLAY_LAYOUT",
      CABARAN_LAYOUT_KEYS,
      CABARAN_OVERLAY_LAYOUT
    );

    output += "\n\n";
    output += appendCabaranLayoutBlockForCopy(
      "",
      "CABARAN_BUTTON_LAYOUT",
      CABARAN_BUTTON_LAYOUT_KEYS,
      CABARAN_BUTTON_LAYOUT
    );

    return output;
  }

  function saveCabaranLayoutDebugToStorage() {
    if (!DEBUG_CABARAN_LAYOUT || !window.localStorage) {
      return;
    }

    const payload = {};
    CABARAN_CALIBRATION_KEYS.forEach(function (key) {
      const rect = getCabaranLayoutRect(key);
      if (rect) {
        payload[key] = {
          left: roundCabaranPct(rect.left),
          top: roundCabaranPct(rect.top),
          width: roundCabaranPct(rect.width),
          height: roundCabaranPct(rect.height),
        };

        if (rect.fontSize != null) {
          payload[key].fontSize = rect.fontSize;
        }
      }
    });

    try {
      window.localStorage.setItem(CABARAN_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage quota/privacy errors in debug mode.
    }
  }

  function loadCabaranLayoutDebugFromStorage() {
    if (!DEBUG_CABARAN_LAYOUT || !window.localStorage) {
      return;
    }

    let raw;
    let parsed;

    try {
      raw = window.localStorage.getItem(CABARAN_LAYOUT_STORAGE_KEY);
      if (!raw) {
        return;
      }
      parsed = JSON.parse(raw);
    } catch (error) {
      return;
    }

    CABARAN_CALIBRATION_KEYS.forEach(function (key) {
      if (!parsed[key]) {
        return;
      }

      const rect = getCabaranLayoutRect(key);

      if (!rect) {
        return;
      }

      rect.left = Number(parsed[key].left);
      rect.top = Number(parsed[key].top);
      rect.width = Number(parsed[key].width);
      rect.height = Number(parsed[key].height);

      if (parsed[key].fontSize != null) {
        rect.fontSize = parsed[key].fontSize;
      }

      clampCabaranLayoutRect(rect);
    });
  }

  function resetCabaranLayoutDebug() {
    CABARAN_LAYOUT_KEYS.forEach(function (key) {
      if (!CABARAN_OVERLAY_LAYOUT[key] || !CABARAN_OVERLAY_LAYOUT_DEFAULT[key]) {
        return;
      }

      CABARAN_OVERLAY_LAYOUT[key].left = CABARAN_OVERLAY_LAYOUT_DEFAULT[key].left;
      CABARAN_OVERLAY_LAYOUT[key].top = CABARAN_OVERLAY_LAYOUT_DEFAULT[key].top;
      CABARAN_OVERLAY_LAYOUT[key].width = CABARAN_OVERLAY_LAYOUT_DEFAULT[key].width;
      CABARAN_OVERLAY_LAYOUT[key].height = CABARAN_OVERLAY_LAYOUT_DEFAULT[key].height;

      if (CABARAN_OVERLAY_LAYOUT_DEFAULT[key].fontSize != null) {
        CABARAN_OVERLAY_LAYOUT[key].fontSize =
          CABARAN_OVERLAY_LAYOUT_DEFAULT[key].fontSize;
      }
    });

    CABARAN_BUTTON_LAYOUT_KEYS.forEach(function (key) {
      if (!CABARAN_BUTTON_LAYOUT[key] || !CABARAN_BUTTON_LAYOUT_DEFAULT[key]) {
        return;
      }

      CABARAN_BUTTON_LAYOUT[key].left = CABARAN_BUTTON_LAYOUT_DEFAULT[key].left;
      CABARAN_BUTTON_LAYOUT[key].top = CABARAN_BUTTON_LAYOUT_DEFAULT[key].top;
      CABARAN_BUTTON_LAYOUT[key].width = CABARAN_BUTTON_LAYOUT_DEFAULT[key].width;
      CABARAN_BUTTON_LAYOUT[key].height = CABARAN_BUTTON_LAYOUT_DEFAULT[key].height;
    });

    try {
      window.localStorage.removeItem(CABARAN_LAYOUT_STORAGE_KEY);
    } catch (error) {
      // Ignore.
    }

    applyCabaranOverlayLayout();
    applyCabaranButtonLayout();
    updateCabaranLayoutDebugInfo();
  }

  function updateCabaranLayoutDebugInfo(layoutKey) {
    if (!cabaranLayoutDebugInfoEl) {
      return;
    }

    const key = layoutKey || (cabaranLayoutDragState && cabaranLayoutDragState.layoutKey);

    const rect = key ? getCabaranLayoutRect(key) : null;

    if (!key || !rect) {
      cabaranLayoutDebugInfoEl.textContent = "Tap a red box to calibrate";
      return;
    }
    let infoText =
      key +
      "\nleft: " +
      roundCabaranPct(rect.left) +
      "\ntop: " +
      roundCabaranPct(rect.top) +
      "\nwidth: " +
      roundCabaranPct(rect.width) +
      "\nheight: " +
      roundCabaranPct(rect.height);

    if (rect.fontSize != null) {
      infoText += "\nfontSize: " + rect.fontSize;
    }

    cabaranLayoutDebugInfoEl.textContent = infoText;
  }

  function endCabaranLayoutDrag() {
    if (!cabaranLayoutDragState) {
      return;
    }

    cabaranLayoutDragState = null;
    saveCabaranLayoutDebugToStorage();
  }

  function onCabaranLayoutPointerMove(event) {
    if (!DEBUG_CABARAN_LAYOUT || !cabaranLayoutDragState) {
      return;
    }

    const state = cabaranLayoutDragState;
    const currentRect = getCabaranLayoutRect(state.layoutKey);

    if (!state.screenRect || !currentRect) {
      return;
    }

    event.preventDefault();

    const deltaXPct = ((event.clientX - state.startX) / state.screenRect.width) * 100;
    const deltaYPct = ((event.clientY - state.startY) / state.screenRect.height) * 100;

    if (state.mode === "resize") {
      currentRect.width = state.startRect.width + deltaXPct;
      currentRect.height = state.startRect.height + deltaYPct;
    } else {
      currentRect.left = state.startRect.left + deltaXPct;
      currentRect.top = state.startRect.top + deltaYPct;
    }

    clampCabaranLayoutRect(currentRect);

    if (isCabaranButtonLayoutKey(state.layoutKey)) {
      applyCabaranButtonLayout();
    } else {
      applyCabaranOverlayLayout();
    }

    updateCabaranLayoutDebugInfo(state.layoutKey);
  }

  function beginCabaranLayoutDrag(event, layoutKey, mode) {
    if (!DEBUG_CABARAN_LAYOUT) {
      return;
    }

    const screen = document.getElementById("screen-cabaran");
    const rect = getCabaranLayoutRect(layoutKey);

    if (!screen || !rect) {
      return;
    }

    const screenRect = screen.getBoundingClientRect();
    const target = event.currentTarget;

    cabaranLayoutDragState = {
      layoutKey: layoutKey,
      mode: mode || "move",
      startX: event.clientX,
      startY: event.clientY,
      startRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      screenRect: screenRect,
    };

    updateCabaranLayoutDebugInfo(layoutKey);

    if (target && target.setPointerCapture) {
      target.setPointerCapture(event.pointerId);
    }
  }

  function attachCabaranOverlayDebugInteractions(el, layoutKey) {
    if (!el || !layoutKey || el.dataset.cabaranDebugBound === "1") {
      return;
    }

    el.dataset.cabaranDebugBound = "1";
    el.classList.add("cabaran-layout-debug-target");

    el.addEventListener("pointerdown", function (event) {
      if (!DEBUG_CABARAN_LAYOUT) {
        return;
      }

      if (event.target && event.target.classList.contains("cabaran-layout-resize-handle")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      beginCabaranLayoutDrag(event, layoutKey, "move");
    });

    const handle = document.createElement("span");
    handle.className = "cabaran-layout-resize-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.addEventListener("pointerdown", function (event) {
      if (!DEBUG_CABARAN_LAYOUT) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      beginCabaranLayoutDrag(event, layoutKey, "resize");
    });
    el.appendChild(handle);
  }

  function ensureCabaranLayoutDebugUi() {
    if (!DEBUG_CABARAN_LAYOUT) {
      return;
    }

    const appRoot = document.getElementById("app");

    if (!appRoot || cabaranLayoutDebugPanelEl) {
      return;
    }

    loadCabaranLayoutDebugPanelHidden();

    const panel = document.createElement("div");
    panel.id = "cabaran-layout-debug-panel";

    const titleRow = document.createElement("div");
    titleRow.className = "cabaran-layout-debug-title-row";

    const title = document.createElement("p");
    title.className = "cabaran-layout-debug-title";
    title.textContent = "Cabaran Layout Debug";

    const hideBtn = document.createElement("button");
    hideBtn.type = "button";
    hideBtn.className = "cabaran-layout-debug-btn cabaran-layout-debug-hide-btn";
    hideBtn.textContent = "Hide Panel";
    hideBtn.addEventListener("click", function () {
      setCabaranLayoutDebugPanelHidden(true);
    });

    titleRow.appendChild(title);
    titleRow.appendChild(hideBtn);

    const info = document.createElement("pre");
    info.className = "cabaran-layout-debug-info";
    info.textContent = "Tap a red box to calibrate";
    cabaranLayoutDebugInfoEl = info;

    const actions = document.createElement("div");
    actions.className = "cabaran-layout-debug-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "cabaran-layout-debug-btn";
    copyBtn.textContent = "Copy Layout";
    copyBtn.addEventListener("click", function () {
      const payload = serializeCabaranOverlayLayoutForCopy();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).catch(function () {
          window.prompt("Salin Cabaran layout:", payload);
        });
      } else {
        window.prompt("Salin Cabaran layout:", payload);
      }
    });

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "cabaran-layout-debug-btn";
    resetBtn.textContent = "Reset Layout";
    resetBtn.addEventListener("click", function () {
      resetCabaranLayoutDebug();
    });

    actions.appendChild(copyBtn);
    actions.appendChild(resetBtn);
    panel.appendChild(titleRow);
    panel.appendChild(info);
    panel.appendChild(actions);
    appRoot.appendChild(panel);
    cabaranLayoutDebugPanelEl = panel;

    const showTab = document.createElement("button");
    showTab.type = "button";
    showTab.id = "cabaran-layout-debug-show-tab";
    showTab.className = "cabaran-layout-debug-show-tab";
    showTab.textContent = "Show Panel (D)";
    showTab.addEventListener("click", function () {
      setCabaranLayoutDebugPanelHidden(false);
    });
    appRoot.appendChild(showTab);
    cabaranLayoutDebugShowTabEl = showTab;

    updateCabaranLayoutDebugInfo();
    bindCabaranLayoutDebugKeyboard();
    updateCabaranLayoutDebugPanelVisibility();

    document.addEventListener("pointermove", onCabaranLayoutPointerMove, { passive: false });
    document.addEventListener("pointerup", endCabaranLayoutDrag);
    document.addEventListener("pointercancel", endCabaranLayoutDrag);
    window.addEventListener("resize", positionCabaranLayoutDebugPanel);
  }

  function applyCabaranDebugMode() {
    const section = document.getElementById("screen-cabaran");

    if (!section) {
      return;
    }

    if (!DEBUG_CABARAN_LAYOUT) {
      section.classList.remove("debug-cabaran-layout");
      updateCabaranLayoutDebugPanelVisibility();
      return;
    }

    ensureCabaranLayoutDebugUi();
    section.classList.add("debug-cabaran-layout");
    updateCabaranLayoutDebugPanelVisibility();
  }

  function formatCabaranLayoutDebugLabel(name, rect) {
    return (
      name +
      " " +
      rect.left +
      "%," +
      rect.top +
      "%," +
      rect.width +
      "%," +
      rect.height +
      "%"
    );
  }

  function markCabaranLayoutDebug(el, layoutKey) {
    if (!el) {
      return;
    }

    const rect = getCabaranLayoutRect(layoutKey);

    if (DEBUG_CABARAN_LAYOUT) {
      el.setAttribute("data-cabaran-overlay", "true");
      el.dataset.cabaranLayoutKey = layoutKey;

      if (rect) {
        el.dataset.debugLabel = formatCabaranLayoutDebugLabel(layoutKey, rect);
      } else {
        el.dataset.debugLabel = layoutKey;
      }

      attachCabaranOverlayDebugInteractions(el, layoutKey);
      return;
    }

    el.removeAttribute("data-cabaran-overlay");
    el.removeAttribute("data-debug-label");
  }

  function markCabaranOverlayDebug(el, layoutKey) {
    markCabaranLayoutDebug(el, layoutKey);
  }

  function applyTulisDebugMode() {
    const section = document.getElementById("screen-tulis");
    if (section) {
      section.classList.toggle("debug-tulis-hotspots", DEBUG_TULIS_HOTSPOTS);
    }
  }

  function isLatihanAdjustActive() {
    return LATIHAN_EASY_ADJUST_MODE || LATIHAN_CALIBRATION_MODE;
  }

  function formatLatihanLayoutDebugLabel(name, rect) {
    return (
      name +
      " " +
      rect.left +
      "%," +
      rect.top +
      "%," +
      rect.width +
      "%," +
      rect.height +
      "%"
    );
  }

  function applyLayoutRect(el, rect) {
    if (!el || !rect) {
      return;
    }

    el.style.left = rect.left + "%";
    el.style.top = rect.top + "%";
    el.style.width = rect.width + "%";
    el.style.height = rect.height + "%";
  }

  function applyLatihanFeedbackLayout() {
    if (!latihanFeedback || !LATIHAN_LAYOUT.feedback) {
      return;
    }

    applyLayoutRect(latihanFeedback, LATIHAN_LAYOUT.feedback);
    latihanFeedback.style.transform = "none";
    latihanFeedback.style.maxWidth = "none";
    latihanFeedback.style.boxSizing = "border-box";
    latihanFeedback.style.display = "flex";
    latihanFeedback.style.alignItems = "center";
    latihanFeedback.style.justifyContent = "center";
    latihanFeedback.style.textAlign = "center";
  }

  function createLatihanHotspotConfigs() {
    const layout = LATIHAN_LAYOUT;

    return [
      {
        id: "latihan_kembali",
        label: "Kembali",
        left: layout.kembali.left,
        top: layout.kembali.top,
        width: layout.kembali.width,
        height: layout.kembali.height,
        action: "latihan-back",
      },
      {
        id: "latihan_ulang",
        label: "Ulang",
        left: layout.ulang.left,
        top: layout.ulang.top,
        width: layout.ulang.width,
        height: layout.ulang.height,
        action: "latihan-replay-audio",
      },
      {
        id: "latihan_seterusnya",
        label: "Seterusnya",
        left: layout.seterusnya.left,
        top: layout.seterusnya.top,
        width: layout.seterusnya.width,
        height: layout.seterusnya.height,
        action: "latihan-next",
      },
    ];
  }

  function applyLatihanLayout() {
    const layout = LATIHAN_LAYOUT;

    applyLayoutRect(latihanChoiceInfoEl, layout.progress);
    applyLayoutRect(
      document.getElementById("latihan-choice-content"),
      layout.question
    );

    latihanChoiceAnswerEls.forEach(function (btn, index) {
      const key = LATIHAN_ANSWER_KEYS[index];
      if (key && layout[key]) {
        applyLayoutRect(btn, layout[key]);
      }
    });

    const section = document.getElementById("screen-latihan");
    if (!section) {
      return;
    }

    createLatihanHotspotConfigs().forEach(function (spot) {
      const btn = section.querySelector('[data-hotspot="' + spot.id + '"]');
      if (!btn) {
        return;
      }

      applyLayoutRect(btn, spot);
    });

    if (latihanReinforcementEl && layout.reinforcement) {
      applyLayoutRect(latihanReinforcementEl, layout.reinforcement);
    }

    applyLatihanFeedbackLayout();

    syncLatihanEasyAdjustPreview();
  }

  function setLatihanDebugLabels() {
    const layout = LATIHAN_LAYOUT;

    if (latihanChoiceInfoEl) {
      latihanChoiceInfoEl.dataset.debugLabel = formatLatihanLayoutDebugLabel(
        "PROGRESS_AREA",
        layout.progress
      );
    }

    const contentWrap = document.getElementById("latihan-choice-content");
    if (contentWrap) {
      contentWrap.dataset.debugLabel = formatLatihanLayoutDebugLabel(
        "QUESTION_AREA",
        layout.question
      );
    }

    const answerNames = ["ANSWER_A", "ANSWER_B", "ANSWER_C"];
    latihanChoiceAnswerEls.forEach(function (btn, index) {
      const key = LATIHAN_ANSWER_KEYS[index];
      if (key && layout[key]) {
        btn.dataset.debugLabel = formatLatihanLayoutDebugLabel(
          answerNames[index],
          layout[key]
        );
      }
    });

    const section = document.getElementById("screen-latihan");
    if (!section) {
      return;
    }

    const hotspotNames = {
      latihan_kembali: "KEMBALI",
      latihan_ulang: "ULANG",
      latihan_seterusnya: "SETERUSNYA",
    };

    createLatihanHotspotConfigs().forEach(function (spot) {
      const btn = section.querySelector('[data-hotspot="' + spot.id + '"]');
      if (!btn) {
        return;
      }

      const name = hotspotNames[spot.id] || spot.id;
      btn.dataset.debugLabel = formatLatihanLayoutDebugLabel(name, {
        left: spot.left,
        top: spot.top,
        width: spot.width,
        height: spot.height,
      });
    });

    if (latihanReinforcementEl && layout.reinforcement) {
      latihanReinforcementEl.dataset.debugLabel = formatLatihanLayoutDebugLabel(
        "REINFORCEMENT_AREA",
        layout.reinforcement
      );
    }

    if (latihanFeedback && layout.feedback) {
      latihanFeedback.dataset.debugLabel = formatLatihanLayoutDebugLabel(
        "FEEDBACK",
        layout.feedback
      );
    }
  }

  let latihanCalSession = null;

  function roundLatihanPct(value) {
    return Math.round(value * 10) / 10;
  }

  function clampLatihanLayoutRect(rect) {
    rect.width = roundLatihanPct(Math.max(2, Math.min(100 - rect.left, rect.width)));
    rect.height = roundLatihanPct(Math.max(2, Math.min(100 - rect.top, rect.height)));
    rect.left = roundLatihanPct(Math.max(0, Math.min(100 - rect.width, rect.left)));
    rect.top = roundLatihanPct(Math.max(0, Math.min(100 - rect.top, rect.top)));
  }

  function latihanClientToPct(clientX, clientY, screenRect) {
    return {
      left: ((clientX - screenRect.left) / screenRect.width) * 100,
      top: ((clientY - screenRect.top) / screenRect.height) * 100,
    };
  }

  function logLatihanLayoutForCopy() {
    const json = JSON.stringify(LATIHAN_LAYOUT, null, 2);

    console.log("========== LATIHAN_LAYOUT (paste into script.js) ==========");
    console.log(json);
    console.log("===========================================================");
    return json;
  }

  function copyLatihanLayoutToClipboard() {
    const json = logLatihanLayoutForCopy();

    function showCopiedAlert() {
      window.alert("LATIHAN_LAYOUT disalin ke clipboard.");
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(showCopiedAlert).catch(function () {
        window.prompt("Salin LATIHAN_LAYOUT:", json);
      });
      return;
    }

    window.prompt("Salin LATIHAN_LAYOUT:", json);
  }

  function onLatihanCalPointerMove(event) {
    if (!latihanCalSession) {
      return;
    }

    const layoutRect = LATIHAN_LAYOUT[latihanCalSession.layoutKey];
    if (!layoutRect) {
      return;
    }

    const pointer = latihanClientToPct(
      event.clientX,
      event.clientY,
      latihanCalSession.screenRect
    );
    const start = latihanCalSession.startRect;
    const deltaLeft = pointer.left - latihanCalSession.startPointer.left;
    const deltaTop = pointer.top - latihanCalSession.startPointer.top;

    if (latihanCalSession.mode === "move") {
      layoutRect.left = start.left + deltaLeft;
      layoutRect.top = start.top + deltaTop;
    } else {
      layoutRect.width = start.width + deltaLeft;
      layoutRect.height = start.height + deltaTop;
    }

    clampLatihanLayoutRect(layoutRect);
    applyLatihanLayout();
    setLatihanDebugLabels();
  }

  function onLatihanCalPointerUp() {
    if (!latihanCalSession) {
      return;
    }

    latihanCalSession = null;
    logLatihanLayoutForCopy();
  }

  function startLatihanCalAdjust(event, layoutKey, mode) {
    if (!isLatihanAdjustActive()) {
      return;
    }

    const section = document.getElementById("screen-latihan");
    const layoutRect = LATIHAN_LAYOUT[layoutKey];
    if (!section || !layoutRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const screenRect = section.getBoundingClientRect();
    latihanCalSession = {
      layoutKey: layoutKey,
      mode: mode,
      screenRect: screenRect,
      startPointer: latihanClientToPct(event.clientX, event.clientY, screenRect),
      startRect: {
        left: layoutRect.left,
        top: layoutRect.top,
        width: layoutRect.width,
        height: layoutRect.height,
      },
    };

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function bindLatihanAdjustTarget(el, layoutKey) {
    if (!el || el.dataset.latihanCalBound === "1") {
      return;
    }

    el.dataset.latihanCalBound = "1";
    el.dataset.latihanLayoutKey = layoutKey;
    el.classList.add("latihan-cal-target");

    if (!el.querySelector(".latihan-cal-resize-handle")) {
      const resizeHandle = document.createElement("span");
      resizeHandle.className = "latihan-cal-resize-handle";
      resizeHandle.setAttribute("aria-hidden", "true");
      el.appendChild(resizeHandle);

      resizeHandle.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        event.stopPropagation();
        startLatihanCalAdjust(event, layoutKey, "resize");
      });
    }

    el.addEventListener("pointerdown", function (event) {
      if (event.target.classList.contains("latihan-cal-resize-handle")) {
        return;
      }

      startLatihanCalAdjust(event, layoutKey, "move");
    });
  }

  function initLatihanEasyAdjustDrag() {
    if (!isLatihanAdjustActive()) {
      return;
    }

    const section = document.getElementById("screen-latihan");
    if (!section) {
      return;
    }

    const targets = [
      { key: "progress", label: "PROGRESS_AREA", el: function () { return latihanChoiceInfoEl; } },
      {
        key: "question",
        label: "QUESTION_AREA",
        el: function () {
          return document.getElementById("latihan-choice-content");
        },
      },
      { key: "answerA", label: "ANSWER_A", el: function () { return latihanChoiceAnswerEls[0]; } },
      { key: "answerB", label: "ANSWER_B", el: function () { return latihanChoiceAnswerEls[1]; } },
      { key: "answerC", label: "ANSWER_C", el: function () { return latihanChoiceAnswerEls[2]; } },
      {
        key: "feedback",
        label: "FEEDBACK",
        el: function () {
          return latihanFeedback;
        },
      },
      {
        key: "reinforcement",
        label: "REINFORCEMENT_AREA",
        el: function () {
          return latihanReinforcementEl;
        },
      },
      {
        key: "kembali",
        label: "KEMBALI",
        el: function () {
          return section.querySelector('[data-hotspot="latihan_kembali"]');
        },
      },
      {
        key: "ulang",
        label: "ULANG",
        el: function () {
          return section.querySelector('[data-hotspot="latihan_ulang"]');
        },
      },
      {
        key: "seterusnya",
        label: "SETERUSNYA",
        el: function () {
          return section.querySelector('[data-hotspot="latihan_seterusnya"]');
        },
      },
    ];

    targets.forEach(function (target) {
      const el = target.el();
      const rect = LATIHAN_LAYOUT[target.key];

      if (!el || !rect) {
        return;
      }

      el.dataset.debugLabel = formatLatihanLayoutDebugLabel(target.label, rect);
      bindLatihanAdjustTarget(el, target.key);
    });

    if (section.dataset.latihanEasyAdjustListeners !== "1") {
      section.addEventListener("pointermove", onLatihanCalPointerMove);
      section.addEventListener("pointerup", onLatihanCalPointerUp);
      section.addEventListener("pointercancel", onLatihanCalPointerUp);
      section.dataset.latihanEasyAdjustListeners = "1";
    }
  }

  function ensureLatihanLayoutCopyButton(section) {
    if (!section || latihanLayoutCopyBtn) {
      return;
    }

    latihanLayoutCopyBtn = document.createElement("button");
    latihanLayoutCopyBtn.type = "button";
    latihanLayoutCopyBtn.id = "latihan-layout-copy-btn";
    latihanLayoutCopyBtn.textContent = "Copy LATIHAN_LAYOUT";
    latihanLayoutCopyBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      copyLatihanLayoutToClipboard();
    });
    section.appendChild(latihanLayoutCopyBtn);
  }

  function syncLatihanEasyAdjustPreview() {
    if (!isLatihanAdjustActive()) {
      if (latihanReinforcementEl) {
        latihanReinforcementEl.classList.remove("is-calibration-active");

        if (!latihanReinforcementEl.classList.contains("is-visible")) {
          latihanReinforcementEl.setAttribute("aria-hidden", "true");

          if (latihanReinforcementWordEl) {
            latihanReinforcementWordEl.textContent = "";
          }

          if (latihanReinforcementBreakdownEl) {
            latihanReinforcementBreakdownEl.textContent = "";
            latihanReinforcementBreakdownEl.style.display = "none";
          }
        }
      }

      if (latihanLayoutCopyBtn) {
        latihanLayoutCopyBtn.style.display = "none";
      }

      return;
    }

    setLatihanDebugLabels();

    const answerSamples = ["bola", "buku", "baju"];

    latihanChoiceAnswerEls.forEach(function (btn, index) {
      if (btn && !latihanChoiceAnsweredCorrectly) {
        btn.textContent = answerSamples[index] || "";
      }
    });

    if (latihanReinforcementEl && LATIHAN_LAYOUT.reinforcement) {
      applyLayoutRect(latihanReinforcementEl, LATIHAN_LAYOUT.reinforcement);
      latihanReinforcementEl.classList.add("is-calibration-active");
      latihanReinforcementEl.setAttribute("aria-hidden", "false");

      if (!latihanReinforcementEl.classList.contains("is-visible")) {
        if (latihanReinforcementWordEl) {
          latihanReinforcementWordEl.textContent = "buku";
        }

        if (latihanReinforcementBreakdownEl) {
          latihanReinforcementBreakdownEl.textContent = "bu - ku";
          latihanReinforcementBreakdownEl.style.display = "block";
        }
      }
    }

    if (latihanFeedback && LATIHAN_LAYOUT.feedback) {
      applyLatihanFeedbackLayout();
      clearLatihanFeedbackHideTimer();
      showPronunciationFeedbackMessage(latihanFeedback, LATIHAN_GUIDANCE_LISTEN);
    }

    if (latihanLayoutCopyBtn) {
      latihanLayoutCopyBtn.style.display = "block";
    }
  }

  function applyLatihanEasyAdjustMode() {
    const section = document.getElementById("screen-latihan");
    if (!section) {
      return;
    }

    const active = isLatihanAdjustActive();

    section.classList.toggle("latihan-easy-adjust-mode", active);
    section.classList.toggle("latihan-calibration-mode", active);

    if (active) {
      ensureLatihanLayoutCopyButton(section);
      initLatihanEasyAdjustDrag();
      applyLatihanLayout();
      syncLatihanEasyAdjustPreview();
    } else {
      syncLatihanEasyAdjustPreview();
    }
  }

  function applyLatihanCalibrationMode() {
    applyLatihanEasyAdjustMode();
  }

  const LATIHAN_SUSUN_ADJUST_MODE = false;
  const LATIHAN_SUSUN_TOTAL = 5;
  const LATIHAN_SUSUN_GUIDANCE_START = "Mari susun 😊";
  const LATIHAN_SUSUN_FEEDBACK_HIDE_MS = 2000;

  const LATIHAN_SUSUN_LAYOUT = {
    feedbackText: { left: 10.9, top: 40.3, width: 79, height: 5.5, fontSize: 2.5 },
    progress: { left: 16, top: 32.6, width: 71, height: 6 },
    answerSlots: { left: 9.8, top: 45.6, width: 80, height: 18 },
    dragSlots: { left: 10, top: 72, width: 80, height: 16 },
    reinforcement: { left: 37.9, top: 18.2, width: 36.1, height: 13.8 },
    kembali: { left: 4, top: 91, width: 25, height: 7 },
    ulang: { left: 38, top: 91, width: 24, height: 7 },
    seterusnya: { left: 67, top: 91, width: 25, height: 7 },
  };

  const LATIHAN_SUSUN_AYAT_ENABLED = false;

  const LATIHAN_SUSUN_AYAT_SAMPLES = [
    { words: ["Saya", "pakai", "baju", "biru"], readAloud: "Saya pakai baju biru" },
    { words: ["Ali", "baca", "buku", "baru"], readAloud: "Ali baca buku baru" },
    { words: ["Ibu", "masak", "nasi", "panas"], readAloud: "Ibu masak nasi panas" },
  ];

  let latihanSusunQuestionWords = [];
  let latihanSusunQuestionNum = 1;
  let latihanSusunQuestionsCompleted = 0;
  let latihanSusunFeedbackEl = null;
  let latihanSusunReinforcementEl = null;
  let latihanSusunReinforcementTextEl = null;
  let latihanSusunProgressEl = null;
  let latihanSusunAnswerAreaEl = null;
  let latihanSusunDragAreaEl = null;
  let latihanSusunSlotEls = [];
  let latihanSusunChipEls = [];
  let latihanSusunCurrentRound = null;
  let latihanSusunAnsweredCorrectly = false;
  let latihanSusunWrongAttempts = 0;
  let latihanSusunFeedbackHideTimer = null;
  let latihanSusunQuestionStartToken = 0;
  let latihanSusunCompletionOverlayEl = null;
  let latihanSusunLayoutCopyBtn = null;
  let latihanSusunCalSession = null;
  let latihanSusunPointerDrag = null;

  function isLatihanSusunAdjustActive() {
    return LATIHAN_SUSUN_ADJUST_MODE;
  }

  function formatLatihanSusunDebugLabel(name, rect) {
    let label = formatLatihanLayoutDebugLabel(name, rect);

    if (rect && rect.fontSize != null) {
      label += " fontSize:" + rect.fontSize;
    }

    return label;
  }

  function applyLatihanSusunRect(el, rect) {
    applyLayoutRect(el, rect);
  }

  function createLatihanSusunHotspotConfigs() {
    const L = LATIHAN_SUSUN_LAYOUT;

    return [
      {
        id: "latihan_susun_kembali",
        label: "Kembali",
        left: L.kembali.left,
        top: L.kembali.top,
        width: L.kembali.width,
        height: L.kembali.height,
        action: "latihan-susun-back",
      },
      {
        id: "latihan_susun_ulang",
        label: "Ulang",
        left: L.ulang.left,
        top: L.ulang.top,
        width: L.ulang.width,
        height: L.ulang.height,
        action: "latihan-susun-replay",
      },
      {
        id: "latihan_susun_seterusnya",
        label: "Seterusnya",
        left: L.seterusnya.left,
        top: L.seterusnya.top,
        width: L.seterusnya.width,
        height: L.seterusnya.height,
        action: "latihan-susun-next",
      },
    ];
  }

  function splitLatihanSusunSyllables(word) {
    const text = String(word || "").trim().toLowerCase();
    const breakdown = buildLatihanSyllableBreakdown(text);

    if (breakdown && breakdown.indexOf(" - ") >= 0) {
      return breakdown.split(" - ").map(function (part) {
        return part.trim();
      });
    }

    if (text.length <= 2) {
      return [text];
    }

    if (text.length === 3) {
      return [text.charAt(0), text.slice(1)];
    }

    if (text.length === 4) {
      return [text.slice(0, 2), text.slice(2)];
    }

    const parts = [];

    for (let i = 0; i < text.length; i += 2) {
      parts.push(text.slice(i, i + 2));
    }

    return parts.filter(Boolean);
  }

  function resolveLatihanSusunModeForQuestion() {
    if (selectedCheckpoint === "suku_kata_kv") {
      return "suku_kata";
    }

    return "perkataan";
  }

  function getLatihanSusunWordPool() {
    return getLatihanPracticePool()
      .map(function (word) {
        return String(word || "").trim().toLowerCase();
      })
      .filter(Boolean);
  }

  function ensureLatihanSusunQuestionPlan(forceNew) {
    if (
      !forceNew &&
      latihanSusunQuestionWords.length === LATIHAN_SUSUN_TOTAL
    ) {
      return;
    }

    const pool = getLatihanSusunWordPool();

    if (!pool.length) {
      latihanSusunQuestionWords = [];
      return;
    }

    latihanSusunQuestionWords = buildPracticeSequence(pool, LATIHAN_SUSUN_TOTAL);
  }

  function getLatihanSusunTargetWord() {
    const index = latihanSusunQuestionNum - 1;

    if (latihanSusunQuestionWords[index]) {
      return latihanSusunQuestionWords[index];
    }

    return String(getCurrentBelajarAudioText() || "")
      .trim()
      .toLowerCase();
  }

  function buildLatihanSusunRound() {
    const mode = resolveLatihanSusunModeForQuestion();
    const target = getLatihanSusunTargetWord();
    let answerOrder = [];
    let audioTarget = target;
    let readAloud = "";

    if (LATIHAN_SUSUN_AYAT_ENABLED && mode === "ayat") {
      const sample =
        LATIHAN_SUSUN_AYAT_SAMPLES[
          (latihanSusunQuestionNum - 1) % LATIHAN_SUSUN_AYAT_SAMPLES.length
        ];
      answerOrder = sample.words.slice();
      audioTarget = sample.readAloud;
      readAloud = sample.readAloud;
    } else {
      answerOrder = splitLatihanSusunSyllables(target);
    }

    return {
      mode: mode,
      target: target,
      audioTarget: audioTarget,
      readAloud: readAloud,
      answerOrder: answerOrder,
      dragPieces: shuffleArray(answerOrder.slice()),
    };
  }

  function clearLatihanSusunFeedbackHideTimer() {
    if (latihanSusunFeedbackHideTimer !== null) {
      window.clearTimeout(latihanSusunFeedbackHideTimer);
      latihanSusunFeedbackHideTimer = null;
    }
  }

  function clearLatihanSusunFeedbackAnimation() {
    if (!latihanSusunFeedbackEl) {
      return;
    }

    latihanSusunFeedbackEl.classList.remove(
      "latihan-susun-feedback--correct",
      "latihan-susun-feedback--wrong"
    );
    latihanSusunFeedbackEl.style.animation = "none";
  }

  function showLatihanSusunFeedback(message, autoHide) {
    if (!latihanSusunFeedbackEl) {
      return;
    }

    applyLatihanSusunFeedbackLayout();
    clearLatihanSusunFeedbackAnimation();

    const text = String(message || "");
    showPronunciationFeedbackMessage(latihanSusunFeedbackEl, message);

    if (text.indexOf("Hebat") === 0 || text.indexOf("Betul") === 0) {
      void latihanSusunFeedbackEl.offsetWidth;
      latihanSusunFeedbackEl.style.animation = "";
      latihanSusunFeedbackEl.classList.add("latihan-susun-feedback--correct");
    } else if (text.indexOf("Cuba lagi") === 0 || text.indexOf("Susun semua") === 0) {
      void latihanSusunFeedbackEl.offsetWidth;
      latihanSusunFeedbackEl.style.animation = "";
      latihanSusunFeedbackEl.classList.add("latihan-susun-feedback--wrong");
    }

    clearLatihanSusunFeedbackHideTimer();

    if (autoHide !== false) {
      latihanSusunFeedbackHideTimer = window.setTimeout(function () {
        latihanSusunFeedbackHideTimer = null;

        if (activeScreen === "latihan_susun") {
          hidePronunciationFeedback(latihanSusunFeedbackEl);
          clearLatihanSusunFeedbackAnimation();

          if (isLatihanSusunAdjustActive()) {
            syncLatihanSusunAdjustPreview();
          }
        }
      }, LATIHAN_SUSUN_FEEDBACK_HIDE_MS);
    }
  }

  function applyLatihanSusunFeedbackFontSize() {
    const rect = LATIHAN_SUSUN_LAYOUT.feedbackText;

    if (!latihanSusunFeedbackEl || !rect || rect.fontSize == null) {
      return;
    }

    if (typeof rect.fontSize === "number") {
      latihanSusunFeedbackEl.style.fontSize =
        "clamp(1rem, " + rect.fontSize + "vmin, 2.2rem)";
      return;
    }

    latihanSusunFeedbackEl.style.fontSize = String(rect.fontSize);
  }

  function applyLatihanSusunFeedbackLayout() {
    const rect = LATIHAN_SUSUN_LAYOUT.feedbackText;

    if (!latihanSusunFeedbackEl || !rect) {
      return;
    }

    applyLatihanSusunRect(latihanSusunFeedbackEl, rect);
    latihanSusunFeedbackEl.style.position = "absolute";
    latihanSusunFeedbackEl.style.transform = "none";
    latihanSusunFeedbackEl.style.maxWidth = "none";
    latihanSusunFeedbackEl.style.boxSizing = "border-box";
    latihanSusunFeedbackEl.style.display = "flex";
    latihanSusunFeedbackEl.style.alignItems = "center";
    latihanSusunFeedbackEl.style.justifyContent = "center";
    latihanSusunFeedbackEl.style.textAlign = "center";
    applyLatihanSusunFeedbackFontSize();

    if (isLatihanSusunAdjustActive()) {
      ensureLatihanSusunCalResizeHandle(latihanSusunFeedbackEl, "feedbackText");
    }
  }

  function hideLatihanSusunReinforcement() {
    if (!latihanSusunReinforcementEl) {
      return;
    }

    latihanSusunReinforcementEl.classList.remove("is-visible");

    if (isLatihanSusunAdjustActive()) {
      syncLatihanSusunAdjustPreview();
      return;
    }

    latihanSusunReinforcementEl.setAttribute("aria-hidden", "true");

    if (latihanSusunReinforcementTextEl) {
      latihanSusunReinforcementTextEl.textContent = "";
    }
  }

  function showLatihanSusunReinforcement(round) {
    if (!latihanSusunReinforcementEl || !latihanSusunReinforcementTextEl) {
      return;
    }

    applyLatihanSusunRect(
      latihanSusunReinforcementEl,
      LATIHAN_SUSUN_LAYOUT.reinforcement
    );

    if (LATIHAN_SUSUN_AYAT_ENABLED && round.mode === "ayat") {
      latihanSusunReinforcementTextEl.textContent =
        "Baca:\n" + (round.readAloud || round.target);
      latihanSusunReinforcementTextEl.style.whiteSpace = "pre-line";
    } else {
      const word = String(round.target || "").trim().toLowerCase();
      const breakdown = buildLatihanSyllableBreakdown(word);

      if (breakdown && breakdown !== word) {
        latihanSusunReinforcementTextEl.textContent = word + "\n" + breakdown;
      } else {
        latihanSusunReinforcementTextEl.textContent = word;
      }

      latihanSusunReinforcementTextEl.style.whiteSpace = "pre-line";
    }

    latihanSusunReinforcementEl.classList.add("is-visible");
    latihanSusunReinforcementEl.setAttribute("aria-hidden", "false");
  }

  function playLatihanSusunAudio(options) {
    const opts = options || {};
    const silentAutoplay = opts.silentAutoplay === true;
    const round = latihanSusunCurrentRound;
    const audioText = round ? round.audioTarget || round.target : "";

    if (!audioText) {
      if (opts.onFinish) {
        opts.onFinish();
      }

      return;
    }

    if (
      !isBelajarAudioCheckpoint() ||
      (LATIHAN_SUSUN_AYAT_ENABLED && round.mode === "ayat")
    ) {
      const spoke = speakLatihanText(audioText);

      if (!spoke && !silentAutoplay) {
        showPronunciationFeedbackMessage(
          latihanSusunFeedbackEl,
          "Audio belum tersedia."
        );
      }

      if (spoke) {
        window.setTimeout(function () {
          if (opts.onFinish) {
            opts.onFinish();
          }
        }, 1200);
      } else if (opts.onFinish) {
        opts.onFinish();
      }

      return;
    }

    stopBelajarAudio();

    if (!silentAutoplay) {
      hidePronunciationFeedback(latihanSusunFeedbackEl);
    }

    const audioPath = getBelajarAudioPath(audioText);
    const generation = belajarAudioGeneration;
    const audio = new Audio(audioPath);

    belajarAudio = audio;

    function finishPlayback() {
      if (generation !== belajarAudioGeneration) {
        return;
      }

      belajarAudio = null;

      if (opts.onFinish) {
        opts.onFinish();
      }
    }

    audio.addEventListener("ended", finishPlayback);
    audio.addEventListener("error", finishPlayback);
    audio.play().catch(finishPlayback);
  }

  function updateLatihanSusunProgress() {
    if (!latihanSusunProgressEl) {
      return;
    }

    const done = Math.min(latihanSusunQuestionsCompleted, LATIHAN_SUSUN_TOTAL);
    let html = "";

    for (let i = 0; i < LATIHAN_SUSUN_TOTAL; i += 1) {
      if (i < done) {
        html +=
          '<span class="latihan-susun-star is-filled" aria-hidden="true">⭐</span>';
      } else {
        html +=
          '<span class="latihan-susun-star is-empty" aria-hidden="true">☆</span>';
      }
    }

    latihanSusunProgressEl.innerHTML = html;
  }

  function getLatihanSusunPlacedOrder() {
    const order = [];

    latihanSusunSlotEls.forEach(function (slot) {
      const chip = slot.querySelector(".latihan-susun-chip");

      if (chip) {
        order.push(chip.dataset.pieceText || chip.textContent.trim());
      } else {
        order.push("");
      }
    });

    return order;
  }

  function isLatihanSusunAnswerComplete() {
    const order = getLatihanSusunPlacedOrder();

    return (
      order.length === latihanSusunCurrentRound.answerOrder.length &&
      order.every(function (text) {
        return !!text;
      })
    );
  }

  function isLatihanSusunPlacedAnswerCorrect() {
    if (!latihanSusunCurrentRound || !isLatihanSusunAnswerComplete()) {
      return false;
    }

    const placed = getLatihanSusunPlacedOrder();
    const expected = latihanSusunCurrentRound.answerOrder;

    for (let i = 0; i < expected.length; i += 1) {
      if (placed[i] !== expected[i]) {
        return false;
      }
    }

    return true;
  }

  function submitLatihanSusunAnswer() {
    if (!latihanSusunCurrentRound || latihanSusunAnsweredCorrectly) {
      return;
    }

    if (!isLatihanSusunAnswerComplete()) {
      showLatihanSusunFeedback("Susun semua bahagian dulu 😊");
      return;
    }

    if (isLatihanSusunPlacedAnswerCorrect()) {
      latihanSusunAnsweredCorrectly = true;
      latihanSusunQuestionsCompleted = Math.min(
        latihanSusunQuestionsCompleted + 1,
        LATIHAN_SUSUN_TOTAL
      );
      updateLatihanSusunProgress();
      showLatihanSusunFeedback("Hebat ⭐");
      showLatihanSusunReinforcement(latihanSusunCurrentRound);
      pulseLatihanSusunSeterusnya();
      return;
    }

    latihanSusunWrongAttempts += 1;
    showLatihanSusunFeedback("Cuba lagi 😊");
    playLatihanSusunAudio({ silentAutoplay: true });
  }

  function handleLatihanSusunSeterusnyaClick() {
    if (!latihanSusunAnsweredCorrectly) {
      submitLatihanSusunAnswer();
      return;
    }

    advanceLatihanSusunQuestion();
  }

  function pulseLatihanSusunSeterusnya() {
    const section = document.getElementById("screen-latihan_susun");

    if (!section) {
      return;
    }

    const btn = section.querySelector('[data-hotspot="latihan_susun_seterusnya"]');

    if (!btn) {
      return;
    }

    btn.classList.remove("is-latihan-susun-next-glow");
    void btn.offsetWidth;
    btn.classList.add("is-latihan-susun-next-glow");

    window.setTimeout(function () {
      btn.classList.remove("is-latihan-susun-next-glow");
    }, 2400);
  }

  function returnChipToDragPool(chipEl) {
    if (!latihanSusunDragAreaEl || !chipEl) {
      return;
    }

    latihanSusunDragAreaEl.appendChild(chipEl);
    chipEl.classList.remove("is-in-slot");
  }

  function placeChipInSlot(chipEl, slotEl) {
    const existing = slotEl.querySelector(".latihan-susun-chip");

    if (existing && existing !== chipEl) {
      returnChipToDragPool(existing);
    }

    slotEl.appendChild(chipEl);
    chipEl.classList.add("is-in-slot");
  }

  function onLatihanSusunPointerMove(event) {
    if (!latihanSusunPointerDrag) {
      return;
    }

    latihanSusunPointerDrag.el.style.left = event.clientX - latihanSusunPointerDrag.offsetX + "px";
    latihanSusunPointerDrag.el.style.top = event.clientY - latihanSusunPointerDrag.offsetY + "px";
  }

  function endLatihanSusunPointerDrag(event) {
    if (!latihanSusunPointerDrag) {
      return;
    }

    const drag = latihanSusunPointerDrag;
    latihanSusunPointerDrag = null;

    drag.el.classList.remove("is-dragging");
    drag.el.style.position = "";
    drag.el.style.left = "";
    drag.el.style.top = "";
    drag.el.style.zIndex = "";

    let dropped = false;

    latihanSusunSlotEls.forEach(function (slot) {
      if (dropped) {
        return;
      }

      const rect = slot.getBoundingClientRect();

      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        placeChipInSlot(drag.el, slot);
        dropped = true;
      }
    });

    if (!dropped) {
      if (drag.fromSlot) {
        placeChipInSlot(drag.el, drag.fromSlot);
      } else {
        returnChipToDragPool(drag.el);
      }
    }
  }

  function bindLatihanSusunChip(chipEl) {
    chipEl.addEventListener("pointerdown", function (event) {
      if (isLatihanSusunAdjustActive() || latihanSusunAnsweredCorrectly) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = chipEl.getBoundingClientRect();
      const fromSlot = chipEl.closest(".latihan-susun-slot");

      latihanSusunPointerDrag = {
        el: chipEl,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        fromSlot: fromSlot,
      };

      chipEl.classList.add("is-dragging");
      chipEl.style.position = "fixed";
      chipEl.style.zIndex = "10050";
      chipEl.style.left = rect.left + "px";
      chipEl.style.top = rect.top + "px";

      if (chipEl.setPointerCapture) {
        chipEl.setPointerCapture(event.pointerId);
      }
    });

    chipEl.addEventListener("pointermove", onLatihanSusunPointerMove);
    chipEl.addEventListener("pointerup", endLatihanSusunPointerDrag);
    chipEl.addEventListener("pointercancel", endLatihanSusunPointerDrag);
  }

  function renderLatihanSusunBoard(round) {
    latihanSusunCurrentRound = round;
    latihanSusunAnsweredCorrectly = false;
    latihanSusunWrongAttempts = 0;
    latihanSusunSlotEls = [];
    latihanSusunChipEls = [];

    if (!latihanSusunAnswerAreaEl || !latihanSusunDragAreaEl) {
      return;
    }

    latihanSusunAnswerAreaEl.innerHTML = "";
    latihanSusunDragAreaEl.innerHTML = "";

    round.answerOrder.forEach(function (_, index) {
      const slot = document.createElement("div");
      slot.className = "latihan-susun-slot";
      slot.dataset.slotIndex = String(index);
      latihanSusunAnswerAreaEl.appendChild(slot);
      latihanSusunSlotEls.push(slot);
    });

    round.dragPieces.forEach(function (piece, index) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "latihan-susun-chip";
      chip.textContent = piece;
      chip.dataset.pieceText = piece;
      chip.dataset.chipIndex = String(index);
      chip.style.animationDelay = String(index * 0.35) + "s";
      bindLatihanSusunChip(chip);
      latihanSusunDragAreaEl.appendChild(chip);
      latihanSusunChipEls.push(chip);
    });

    updateLatihanSusunProgress();
    hideLatihanSusunReinforcement();

    if (!isLatihanSusunAdjustActive()) {
      clearLatihanSusunFeedbackAnimation();
      hidePronunciationFeedback(latihanSusunFeedbackEl);
    }

    applyLatihanSusunLayout();
    setLatihanSusunDebugLabels();
    syncLatihanSusunAdjustPreview();
  }

  function runLatihanSusunQuestionStart() {
    const token = (latihanSusunQuestionStartToken += 1);

    if (!isLatihanSusunAdjustActive()) {
      clearLatihanSusunFeedbackAnimation();
      hidePronunciationFeedback(latihanSusunFeedbackEl);
    }

    window.setTimeout(function () {
      if (token !== latihanSusunQuestionStartToken || activeScreen !== "latihan_susun") {
        return;
      }

      playLatihanSusunAudio({
        silentAutoplay: true,
        onFinish: function () {
          if (token !== latihanSusunQuestionStartToken) {
            return;
          }
        },
      });
    }, 350);
  }

  function prepareLatihanSusunScreen() {
    applyLatihanSusunAdjustMode();
    hideLatihanSusunCompletionOverlay();
    renderLatihanSusunBoard(buildLatihanSusunRound());
    runLatihanSusunQuestionStart();
  }

  function resetLatihanSusunQuestion() {
    latihanSusunQuestionStartToken += 1;
    clearLatihanSusunFeedbackHideTimer();
    clearLatihanSusunFeedbackAnimation();
    hidePronunciationFeedback(latihanSusunFeedbackEl);
    hideLatihanSusunReinforcement();
    renderLatihanSusunBoard(buildLatihanSusunRound());
    playLatihanSusunAudio({ silentAutoplay: true });
  }

  function hideLatihanSusunCompletionOverlay() {
    if (latihanSusunCompletionOverlayEl) {
      latihanSusunCompletionOverlayEl.style.display = "none";
      latihanSusunCompletionOverlayEl.setAttribute("aria-hidden", "true");
    }
  }

  function showLatihanSusunCompletionOverlay() {
    if (!latihanSusunCompletionOverlayEl) {
      return;
    }

    hidePronunciationFeedback(latihanSusunFeedbackEl);
    hideLatihanSusunReinforcement();
    void markCabaranLearningStep("latihan_susun");
    latihanSusunCompletionOverlayEl.style.display = "flex";
    latihanSusunCompletionOverlayEl.setAttribute("aria-hidden", "false");
  }

  function restartLatihanSusun() {
    hideLatihanSusunCompletionOverlay();
    latihanSusunQuestionNum = 1;
    latihanSusunQuestionsCompleted = 0;
    ensureLatihanSusunQuestionPlan(true);
    prepareLatihanSusunScreen();
  }

  function advanceLatihanSusunQuestion() {
    hideLatihanSusunReinforcement();

    if (latihanSusunQuestionNum >= LATIHAN_SUSUN_TOTAL) {
      showLatihanSusunCompletionOverlay();
      return;
    }

    latihanSusunQuestionNum += 1;
    prepareLatihanSusunScreen();
  }

  function applyLatihanSusunLayout() {
    const L = LATIHAN_SUSUN_LAYOUT;

    if (latihanSusunProgressEl && L.progress) {
      applyLatihanSusunRect(latihanSusunProgressEl, L.progress);
    }

    if (latihanSusunAnswerAreaEl && L.answerSlots) {
      applyLatihanSusunRect(latihanSusunAnswerAreaEl, L.answerSlots);
    }

    if (latihanSusunDragAreaEl && L.dragSlots) {
      applyLatihanSusunRect(latihanSusunDragAreaEl, L.dragSlots);
    }

    if (latihanSusunReinforcementEl && L.reinforcement) {
      applyLatihanSusunRect(latihanSusunReinforcementEl, L.reinforcement);
    }

    applyLatihanSusunFeedbackLayout();

    const section = document.getElementById("screen-latihan_susun");

    if (section) {
      createLatihanSusunHotspotConfigs().forEach(function (spot) {
        const btn = section.querySelector('[data-hotspot="' + spot.id + '"]');

        if (btn) {
          applyLatihanSusunRect(btn, spot);
        }
      });
    }

    syncLatihanSusunAdjustPreview();
  }

  function setLatihanSusunDebugLabels() {
    const L = LATIHAN_SUSUN_LAYOUT;

    if (latihanSusunProgressEl && L.progress) {
      latihanSusunProgressEl.dataset.debugLabel = formatLatihanSusunDebugLabel(
        "PROGRESS",
        L.progress
      );
    }

    if (latihanSusunAnswerAreaEl && L.answerSlots) {
      latihanSusunAnswerAreaEl.dataset.debugLabel = formatLatihanSusunDebugLabel(
        "ANSWER_AREA",
        L.answerSlots
      );
    }

    if (latihanSusunDragAreaEl && L.dragSlots) {
      latihanSusunDragAreaEl.dataset.debugLabel = formatLatihanSusunDebugLabel(
        "DRAG_AREA",
        L.dragSlots
      );
    }

    if (latihanSusunFeedbackEl && L.feedbackText) {
      latihanSusunFeedbackEl.dataset.debugLabel = formatLatihanSusunDebugLabel(
        "FEEDBACK_TEXT",
        L.feedbackText
      );
    }

    if (latihanSusunReinforcementEl && L.reinforcement) {
      latihanSusunReinforcementEl.dataset.debugLabel = formatLatihanSusunDebugLabel(
        "REINFORCEMENT_AREA",
        L.reinforcement
      );
    }

    const section = document.getElementById("screen-latihan_susun");

    if (!section) {
      return;
    }

    const names = {
      latihan_susun_kembali: "KEMBALI",
      latihan_susun_ulang: "ULANG",
      latihan_susun_seterusnya: "SETERUSNYA",
    };

    createLatihanSusunHotspotConfigs().forEach(function (spot) {
      const btn = section.querySelector('[data-hotspot="' + spot.id + '"]');

      if (btn) {
        btn.dataset.debugLabel = formatLatihanSusunDebugLabel(
          names[spot.id] || spot.id,
          {
            left: spot.left,
            top: spot.top,
            width: spot.width,
            height: spot.height,
          }
        );
      }
    });
  }

  function logLatihanSusunLayoutForCopy() {
    const json = JSON.stringify(LATIHAN_SUSUN_LAYOUT, null, 2);

    console.log("========== LATIHAN_SUSUN_LAYOUT (paste into script.js) ==========");
    console.log(json);
    console.log("==================================================================");
    return json;
  }

  function copyLatihanSusunLayoutToClipboard() {
    const json = logLatihanSusunLayoutForCopy();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () {
        window.alert("LATIHAN_SUSUN_LAYOUT disalin ke clipboard.");
      });
      return;
    }

    window.prompt("Salin LATIHAN_SUSUN_LAYOUT:", json);
  }

  function onLatihanSusunCalPointerMove(event) {
    if (!latihanSusunCalSession) {
      return;
    }

    const layoutRect = LATIHAN_SUSUN_LAYOUT[latihanSusunCalSession.layoutKey];
    if (!layoutRect) {
      return;
    }

    event.preventDefault();

    const pointer = latihanClientToPct(
      event.clientX,
      event.clientY,
      latihanSusunCalSession.screenRect
    );
    const start = latihanSusunCalSession.startRect;
    const deltaLeft = pointer.left - latihanSusunCalSession.startPointer.left;
    const deltaTop = pointer.top - latihanSusunCalSession.startPointer.top;

    if (latihanSusunCalSession.mode === "move") {
      layoutRect.left = start.left + deltaLeft;
      layoutRect.top = start.top + deltaTop;
    } else {
      layoutRect.width = start.width + deltaLeft;
      layoutRect.height = start.height + deltaTop;
    }

    clampLatihanLayoutRect(layoutRect);
    applyLatihanSusunLayout();
    setLatihanSusunDebugLabels();
  }

  function onLatihanSusunCalPointerUp() {
    if (!latihanSusunCalSession) {
      return;
    }

    latihanSusunCalSession = null;
    logLatihanSusunLayoutForCopy();
  }

  function startLatihanSusunCalAdjust(event, layoutKey, mode) {
    if (!isLatihanSusunAdjustActive()) {
      return;
    }

    const section = document.getElementById("screen-latihan_susun");
    const layoutRect = LATIHAN_SUSUN_LAYOUT[layoutKey];

    if (!section || !layoutRect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    latihanSusunCalSession = {
      layoutKey: layoutKey,
      mode: mode,
      screenRect: section.getBoundingClientRect(),
      startPointer: latihanClientToPct(event.clientX, event.clientY, section.getBoundingClientRect()),
      startRect: {
        left: layoutRect.left,
        top: layoutRect.top,
        width: layoutRect.width,
        height: layoutRect.height,
      },
    };

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function ensureLatihanSusunCalResizeHandle(el, layoutKey) {
    if (!el) {
      return;
    }

    let handle = el.querySelector(".latihan-cal-resize-handle");

    if (handle) {
      return;
    }

    handle = document.createElement("span");
    handle.className = "latihan-cal-resize-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      startLatihanSusunCalAdjust(event, layoutKey, "resize");
    });
    el.appendChild(handle);
  }

  function bindLatihanSusunAdjustTarget(el, layoutKey) {
    if (!el) {
      return;
    }

    ensureLatihanSusunCalResizeHandle(el, layoutKey);

    if (el.dataset.latihanSusunCalBound === "1") {
      return;
    }

    el.dataset.latihanSusunCalBound = "1";
    el.classList.add("latihan-susun-cal-target");

    el.addEventListener("pointerdown", function (event) {
      if (
        event.target &&
        event.target.classList &&
        event.target.classList.contains("latihan-cal-resize-handle")
      ) {
        return;
      }

      startLatihanSusunCalAdjust(event, layoutKey, "move");
    });
  }

  function initLatihanSusunAdjustDrag() {
    if (!isLatihanSusunAdjustActive()) {
      return;
    }

    const section = document.getElementById("screen-latihan_susun");

    if (!section) {
      return;
    }

    const targets = [
      { key: "feedbackText", label: "FEEDBACK_TEXT", el: function () { return latihanSusunFeedbackEl; } },
      { key: "progress", label: "PROGRESS", el: function () { return latihanSusunProgressEl; } },
      { key: "answerSlots", label: "ANSWER_AREA", el: function () { return latihanSusunAnswerAreaEl; } },
      { key: "dragSlots", label: "DRAG_AREA", el: function () { return latihanSusunDragAreaEl; } },
      { key: "reinforcement", label: "REINFORCEMENT_AREA", el: function () { return latihanSusunReinforcementEl; } },
      {
        key: "kembali",
        label: "KEMBALI",
        el: function () {
          return section.querySelector('[data-hotspot="latihan_susun_kembali"]');
        },
      },
      {
        key: "ulang",
        label: "ULANG",
        el: function () {
          return section.querySelector('[data-hotspot="latihan_susun_ulang"]');
        },
      },
      {
        key: "seterusnya",
        label: "SETERUSNYA",
        el: function () {
          return section.querySelector('[data-hotspot="latihan_susun_seterusnya"]');
        },
      },
    ];

    targets.forEach(function (target) {
      const el = target.el();
      const rect = LATIHAN_SUSUN_LAYOUT[target.key];

      if (!el || !rect) {
        return;
      }

      el.dataset.debugLabel = formatLatihanSusunDebugLabel(target.label, rect);
      bindLatihanSusunAdjustTarget(el, target.key);
    });

    if (section.dataset.latihanSusunCalListeners !== "1") {
      document.addEventListener("pointermove", onLatihanSusunCalPointerMove, { passive: false });
      document.addEventListener("pointerup", onLatihanSusunCalPointerUp);
      document.addEventListener("pointercancel", onLatihanSusunCalPointerUp);
      section.dataset.latihanSusunCalListeners = "1";
    }
  }

  function syncLatihanSusunAdjustPreview() {
    if (!isLatihanSusunAdjustActive()) {
      if (latihanSusunLayoutCopyBtn) {
        latihanSusunLayoutCopyBtn.style.display = "none";
      }

      if (latihanSusunReinforcementEl) {
        latihanSusunReinforcementEl.classList.remove("is-calibration-active");
      }

      return;
    }

    setLatihanSusunDebugLabels();

    if (latihanSusunAnswerAreaEl && latihanSusunDragAreaEl) {
      const samples = ["bola", "buku", "baju"];
      const syllables = ["ju", "ba"];

      if (!latihanSusunAnswerAreaEl.querySelector(".latihan-susun-slot")) {
        latihanSusunAnswerAreaEl.innerHTML = "";
        latihanSusunDragAreaEl.innerHTML = "";

        for (let i = 0; i < 2; i += 1) {
          const slot = document.createElement("div");
          slot.className = "latihan-susun-slot";
          latihanSusunAnswerAreaEl.appendChild(slot);
        }

        syllables.forEach(function (text) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "latihan-susun-chip";
          chip.textContent = text;
          latihanSusunDragAreaEl.appendChild(chip);
        });
      }

      latihanSusunSlotEls = Array.prototype.slice.call(
        latihanSusunAnswerAreaEl.querySelectorAll(".latihan-susun-slot")
      );
      latihanSusunChipEls = Array.prototype.slice.call(
        latihanSusunDragAreaEl.querySelectorAll(".latihan-susun-chip")
      );
    }

    if (latihanSusunReinforcementEl) {
      latihanSusunReinforcementEl.classList.add("is-calibration-active");

      if (!latihanSusunReinforcementEl.classList.contains("is-visible") && latihanSusunReinforcementTextEl) {
        latihanSusunReinforcementTextEl.textContent = "buku\nbu - ku";
        latihanSusunReinforcementTextEl.style.whiteSpace = "pre-line";
      }
    }

    if (latihanSusunFeedbackEl) {
      applyLatihanSusunFeedbackLayout();
      clearLatihanSusunFeedbackHideTimer();
      showLatihanSusunFeedback("Hebat ⭐", false);

      if (isLatihanSusunAdjustActive()) {
        ensureLatihanSusunCalResizeHandle(latihanSusunFeedbackEl, "feedbackText");
        bindLatihanSusunAdjustTarget(latihanSusunFeedbackEl, "feedbackText");
        setLatihanSusunDebugLabels();
      }
    }

    if (latihanSusunLayoutCopyBtn) {
      latihanSusunLayoutCopyBtn.style.display = "block";
    }
  }

  function ensureLatihanSusunLayoutCopyButton(section) {
    if (!section || latihanSusunLayoutCopyBtn) {
      return;
    }

    latihanSusunLayoutCopyBtn = document.createElement("button");
    latihanSusunLayoutCopyBtn.type = "button";
    latihanSusunLayoutCopyBtn.id = "latihan-susun-layout-copy-btn";
    latihanSusunLayoutCopyBtn.textContent = "Copy LATIHAN_SUSUN_LAYOUT";
    latihanSusunLayoutCopyBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      copyLatihanSusunLayoutToClipboard();
    });
    section.appendChild(latihanSusunLayoutCopyBtn);
  }

  function applyLatihanSusunAdjustMode() {
    const section = document.getElementById("screen-latihan_susun");

    if (!section) {
      return;
    }

    const active = isLatihanSusunAdjustActive();

    section.classList.toggle("latihan-susun-adjust-mode", active);

    if (active) {
      ensureLatihanSusunLayoutCopyButton(section);
      initLatihanSusunAdjustDrag();
      applyLatihanSusunLayout();
      syncLatihanSusunAdjustPreview();
    } else {
      syncLatihanSusunAdjustPreview();
    }
  }

  function raiseLatihanSusunBottomHotspots() {
    const section = document.getElementById("screen-latihan_susun");

    if (!section) {
      return;
    }

    ["latihan_susun_kembali", "latihan_susun_ulang", "latihan_susun_seterusnya"].forEach(
      function (id) {
        const btn = section.querySelector('[data-hotspot="' + id + '"]');

        if (btn) {
          btn.style.zIndex = "100";
          btn.style.pointerEvents = "auto";
          section.appendChild(btn);
        }
      }
    );
  }

  function setupLatihanSusunScreen(section) {
    const zone = document.createElement("div");
    zone.id = "latihan-susun-zone";

    latihanSusunProgressEl = document.createElement("div");
    latihanSusunProgressEl.id = "latihan-susun-progress";
    latihanSusunProgressEl.setAttribute("aria-live", "polite");
    zone.appendChild(latihanSusunProgressEl);

    latihanSusunReinforcementEl = document.createElement("div");
    latihanSusunReinforcementEl.id = "latihan-susun-reinforcement";
    latihanSusunReinforcementEl.setAttribute("aria-hidden", "true");
    latihanSusunReinforcementTextEl = document.createElement("p");
    latihanSusunReinforcementTextEl.id = "latihan-susun-reinforcement-text";
    latihanSusunReinforcementEl.appendChild(latihanSusunReinforcementTextEl);
    zone.appendChild(latihanSusunReinforcementEl);

    latihanSusunAnswerAreaEl = document.createElement("div");
    latihanSusunAnswerAreaEl.id = "latihan-susun-answer";
    zone.appendChild(latihanSusunAnswerAreaEl);

    latihanSusunDragAreaEl = document.createElement("div");
    latihanSusunDragAreaEl.id = "latihan-susun-drag";
    zone.appendChild(latihanSusunDragAreaEl);

    section.appendChild(zone);

    latihanSusunFeedbackEl = createPronunciationFeedbackElement(section);
    latihanSusunFeedbackEl.id = "latihan-susun-feedback";

    latihanSusunCompletionOverlayEl = document.createElement("div");
    latihanSusunCompletionOverlayEl.id = "latihan-susun-completion-overlay";
    latihanSusunCompletionOverlayEl.setAttribute("aria-hidden", "true");

    const completionTitle = document.createElement("p");
    completionTitle.id = "latihan-susun-completion-title";
    completionTitle.textContent = "Hebat! Semua latihan selesai ⭐";

    const completionActions = document.createElement("div");
    completionActions.className = "latihan-susun-completion-actions";

    const ulangBtn = document.createElement("button");
    ulangBtn.type = "button";
    ulangBtn.className = "latihan-susun-completion-btn";
    ulangBtn.textContent = "Ulang Latihan";
    ulangBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      restartLatihanSusun();
    });

    const cabaranBtn = document.createElement("button");
    cabaranBtn.type = "button";
    cabaranBtn.className = "latihan-susun-completion-btn";
    cabaranBtn.textContent = "Mula Cabaran";
    cabaranBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      startCabaran();
    });

    completionActions.appendChild(ulangBtn);
    completionActions.appendChild(cabaranBtn);
    latihanSusunCompletionOverlayEl.appendChild(completionTitle);
    latihanSusunCompletionOverlayEl.appendChild(completionActions);
    section.appendChild(latihanSusunCompletionOverlayEl);

    applyLatihanSusunLayout();
    setLatihanSusunDebugLabels();
  }

  function buildScreens() {
    Object.keys(SCREENS).forEach(function (name) {
      const config = SCREENS[name];
      const section = document.createElement("section");
      section.className = "screen";
      section.id = "screen-" + name;
      section.dataset.screen = name;
      section.setAttribute("aria-hidden", "true");

      const img = document.createElement("img");
      img.className = "screen-bg";
      img.src = config.image;
      img.alt = "";
      img.width = 1080;
      img.height = 1920;
      img.decoding = "async";
      section.appendChild(img);

      if (name === "home") {
        section.style.webkitTouchCallout = "none";
      }

      if (name === "login") {
        setupLoginScreen(section);
      }

      if (name === "belajar") {
        const writingZone = document.createElement("div");
        writingZone.id = "belajar-writing-zone";
        writingZone.style.cssText = BELAJAR_WRITING_ZONE_STYLE;

        belajarLevelDisplay = document.createElement("p");
        belajarLevelDisplay.id = "belajar-level-display";
        belajarLevelDisplay.setAttribute("aria-live", "polite");
        belajarLevelDisplay.style.cssText =
          "margin:0;padding:0;width:100%;flex-shrink:0;" +
          "font-family:" +
          BELAJAR_FONT +
          ";font-size:" +
          BELAJAR_LEVEL_FONT_SIZE +
          ";font-weight:600;color:#5c4a32;" +
          "text-shadow:0 1px 1px rgba(255,255,255,0.45);line-height:1;";

        belajarWordDisplay = document.createElement("p");
        belajarWordDisplay.id = "belajar-word-display";
        belajarWordDisplay.setAttribute("aria-live", "polite");
        belajarWordDisplay.style.cssText =
          "margin:0;padding:0;width:100%;flex-shrink:0;" +
          "font-family:" +
          BELAJAR_FONT +
          ";font-weight:700;color:#2a1f14;" +
          "text-shadow:0 2px 2px rgba(255,255,255,0.35);line-height:1;" +
          "overflow:visible;white-space:nowrap;";

        writingZone.appendChild(belajarLevelDisplay);
        writingZone.appendChild(belajarWordDisplay);
        section.appendChild(writingZone);

        belajarFeedback = createPronunciationFeedbackElement(section);
        belajarFeedback.id = "belajar-feedback";

        belajarStudentSyncBadge = document.createElement("p");
        belajarStudentSyncBadge.id = "belajar-student-sync-badge";
        belajarStudentSyncBadge.setAttribute("aria-live", "polite");
        belajarStudentSyncBadge.style.display = "none";
        section.appendChild(belajarStudentSyncBadge);
      }

      if (name === "latihan") {
        setupLatihanChoiceScreen(section);
      }

      if (name === "latihan_susun") {
        setupLatihanSusunScreen(section);
      }

      if (name === "cabaran") {
        cabaranFeedback = createPronunciationFeedbackElement(section);
        cabaranFeedback.id = "cabaran-feedback";
        setupCabaranScreen(section);
      }

      if (name === "tulis") {
        setupTulisScreen(section);
      }

      const screenHotspots =
        name === "latihan"
          ? createLatihanHotspotConfigs()
          : name === "latihan_susun"
          ? createLatihanSusunHotspotConfigs()
          : config.hotspots;

      screenHotspots.forEach(function (spot) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hotspot";
        btn.setAttribute("aria-label", spot.label);
        if (spot.id) {
          btn.dataset.hotspot = spot.id;
        }
        btn.style.left = spot.left + "%";
        btn.style.top = spot.top + "%";
        btn.style.width = spot.width + "%";
        btn.style.height = spot.height + "%";
        btn.dataset.debugLabel =
          (spot.id || spot.label) +
          " (" +
          spot.left +
          "," +
          spot.top +
          " " +
          spot.width +
          "x" +
          spot.height +
          ")";
        if (name === "latihan" && spot.id) {
          const latihanDebugNames = {
            latihan_kembali: "KEMBALI",
            latihan_ulang: "ULANG",
            latihan_seterusnya: "SETERUSNYA",
          };
          const debugName = latihanDebugNames[spot.id];
          if (debugName) {
            btn.dataset.debugLabel =
              debugName +
              " " +
              spot.left +
              "%," +
              spot.top +
              "%," +
              spot.width +
              "%," +
              spot.height +
              "%";
          }
        }
        btn.dataset.action = spot.action;
        if (spot.target) {
          btn.dataset.target = spot.target;
        }
        if (spot.message) {
          btn.dataset.message = spot.message;
        }
        if (
          name === "tulis" &&
          (spot.id === "tulis_kembali" ||
            spot.id === "tulis_padam" ||
            spot.id === "tulis_seterusnya")
        ) {
          btn.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (spot.action === "tulis-back") {
              showScreen(tulisPreviousScreen || "belajar");
            } else if (spot.action === "tulis-clear") {
              clearTulisCanvas();
            } else if (spot.action === "tulis-next") {
              openNextWritingTarget();
            }
          });
        }
        if (
          name === "latihan" &&
          (spot.id === "latihan_kembali" ||
            spot.id === "latihan_ulang" ||
            spot.id === "latihan_seterusnya")
        ) {
          btn.addEventListener("click", function (event) {
            if (isLatihanAdjustActive()) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            if (spot.action === "latihan-back") {
              showScreen("belajar");
            } else if (spot.action === "latihan-replay-audio") {
              playLatihanChoiceAudio();
            } else if (spot.action === "latihan-next") {
              openNextLatihanChoiceQuestion();
            }
          });
        }
        if (
          name === "latihan_susun" &&
          (spot.id === "latihan_susun_kembali" ||
            spot.id === "latihan_susun_ulang" ||
            spot.id === "latihan_susun_seterusnya")
        ) {
          btn.addEventListener("click", function (event) {
            if (isLatihanSusunAdjustActive()) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (spot.action === "latihan-susun-back") {
              showScreen("belajar");
            } else if (spot.action === "latihan-susun-replay") {
              resetLatihanSusunQuestion();
            } else if (spot.action === "latihan-susun-next") {
              handleLatihanSusunSeterusnyaClick();
            }
          });
        }
        section.appendChild(btn);
      });

      if (name === "latihan") {
        applyLatihanLayout();
        setLatihanDebugLabels();
        raiseLatihanBottomHotspots();
        if (isLatihanAdjustActive()) {
          applyLatihanEasyAdjustMode();
        }
      }

      if (name === "latihan_susun") {
        applyLatihanSusunLayout();
        setLatihanSusunDebugLabels();
        raiseLatihanSusunBottomHotspots();
        if (isLatihanSusunAdjustActive()) {
          applyLatihanSusunAdjustMode();
        }
      }

      stage.appendChild(section);
    });

    stage.addEventListener("click", onStageClick);
  }

  function clearTransitionTimer() {
    if (transitionTimer !== null) {
      window.clearTimeout(transitionTimer);
      transitionTimer = null;
    }
  }

  function isLatihanSusunCheckpointEligible() {
    return (
      selectedCheckpoint === "perkataan_vkv" ||
      selectedCheckpoint === "perkataan_kvkv"
    );
  }

  function canEnterLatihanSusunScreen(previousScreen) {
    if (previousScreen === "latihan_susun") {
      return true;
    }

    return previousScreen === "latihan" && isLatihanSusunCheckpointEligible();
  }

  function isCabaranChoiceCheckpoint() {
    return (
      selectedCheckpoint === "vokal" ||
      selectedCheckpoint === "konsonan" ||
      selectedCheckpoint === "suku_kata_kv"
    );
  }

  function isCabaranWordCheckpoint() {
    return (
      selectedCheckpoint === "perkataan_vkv" ||
      selectedCheckpoint === "perkataan_kvkv"
    );
  }

  function getCabaranSuggestedTP(totalCorrect) {
    if (totalCorrect >= 10) {
      return "TP6";
    }

    if (totalCorrect >= 9) {
      return "TP5";
    }

    if (totalCorrect >= 7) {
      return "TP4";
    }

    if (totalCorrect >= 5) {
      return "TP3";
    }

    if (totalCorrect >= 3) {
      return "TP2";
    }

    return "TP1";
  }

  function getCabaranSchoolCode() {
    const engine = getAssessmentEngine();

    if (engine && engine.getSchoolCode) {
      return String(engine.getSchoolCode() || "");
    }

    return "";
  }

  function getCabaranStudentSession() {
    const engine = getAssessmentEngine();

    if (!engine || !engine.getLoggedInStudent) {
      return null;
    }

    return engine.getLoggedInStudent();
  }

  function initCabaranDatabase() {
    if (cabaranDbPromise) {
      return cabaranDbPromise;
    }

    cabaranDbPromise = new Promise(function (resolve, reject) {
      const request = indexedDB.open(CABARAN_DB_NAME, CABARAN_DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (db.objectStoreNames.contains("cabaran_results")) {
          db.deleteObjectStore("cabaran_results");
        }

        if (!db.objectStoreNames.contains(CABARAN_SUMMARIES_STORE)) {
          db.createObjectStore(CABARAN_SUMMARIES_STORE, {
            keyPath: "summaryKey",
          });
        }

        if (!db.objectStoreNames.contains(CABARAN_LEARNING_UNLOCKS_STORE)) {
          db.createObjectStore(CABARAN_LEARNING_UNLOCKS_STORE, {
            keyPath: "unlockKey",
          });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error || new Error("Cabaran DB gagal dibuka."));
      };
    });

    return cabaranDbPromise;
  }

  function cabaranStorePut(storeName, record) {
    return initCabaranDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        // IndexedDB put = upsert by keyPath; repeated Cabaran updates the same row.
        const request = store.put(record);

        request.onsuccess = function () {
          resolve(request.result);
        };

        request.onerror = function () {
          reject(request.error);
        };
      });
    });
  }

  function cabaranStoreGet(storeName, key) {
    return initCabaranDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = function () {
          resolve(request.result || null);
        };

        request.onerror = function () {
          reject(request.error);
        };
      });
    });
  }

  function buildCabaranUnlockKey(session, checkpointId) {
    return [
      normalizeCabaranIdentityText(getCabaranSchoolCode()),
      normalizeCabaranIdentityText(session.classId),
      normalizeCabaranIdentityText(session.studentId),
      normalizeCabaranIdentityText(checkpointId),
    ].join("|");
  }

  function markCabaranLearningStep(step) {
    const session = getCabaranStudentSession();

    if (!session || !selectedCheckpoint) {
      return Promise.resolve();
    }

    const unlockKey = buildCabaranUnlockKey(session, selectedCheckpoint);

    return cabaranStoreGet(CABARAN_LEARNING_UNLOCKS_STORE, unlockKey).then(
      function (existing) {
        const record = existing || {
          unlockKey: unlockKey,
          schoolCode: getCabaranSchoolCode(),
          classId: session.classId,
          studentId: session.studentId,
          checkpointId: selectedCheckpoint,
          belajarComplete: false,
          latihanChoiceComplete: false,
          latihanSusunComplete: false,
        };

        if (step === "belajar") {
          record.belajarComplete = true;
        }

        if (step === "latihan_choice") {
          record.latihanChoiceComplete = true;
        }

        if (step === "latihan_susun") {
          record.latihanSusunComplete = true;
        }

        record.updatedAt = new Date().toISOString();
        return cabaranStorePut(CABARAN_LEARNING_UNLOCKS_STORE, record);
      }
    );
  }

  function canAccessCabaran() {
    const session = getCabaranStudentSession();

    if (!session || !selectedCheckpoint) {
      return Promise.resolve(false);
    }

    const unlockKey = buildCabaranUnlockKey(session, selectedCheckpoint);

    return cabaranStoreGet(CABARAN_LEARNING_UNLOCKS_STORE, unlockKey).then(
      function (record) {
        if (!record || !record.belajarComplete || !record.latihanChoiceComplete) {
          return false;
        }

        if (isCabaranWordCheckpoint()) {
          return !!record.latihanSusunComplete;
        }

        return true;
      }
    );
  }

  function normalizeCabaranIdentityText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getCabaranCompletionTimestamp() {
    return new Date().toISOString();
  }

  function buildCabaranSummaryKey(session, checkpointId) {
    return [
      normalizeCabaranIdentityText(getCabaranSchoolCode()),
      normalizeCabaranIdentityText(session.classId),
      normalizeCabaranIdentityText(session.studentId),
      normalizeCabaranIdentityText(checkpointId),
    ].join("|");
  }

  function buildCabaranSummaryRecord(session, checkpointId, stats) {
    const schoolCode = String(getCabaranSchoolCode() || "").trim();
    const summaryKey = buildCabaranSummaryKey(session, checkpointId);

    return {
      summaryKey: summaryKey,
      schoolCode: schoolCode,
      classId: String(session.classId || "").trim(),
      studentId: String(session.studentId || "").trim(),
      studentName: String(session.studentName || "").trim(),
      checkpointId: String(checkpointId || "").trim(),
      totalCorrect: stats.totalCorrect,
      totalQuestions: stats.totalQuestions,
      percentage: stats.percentage,
      suggestedTP: stats.suggestedTP,
      cabaranCompleted: true,
      updatedAt: getCabaranCompletionTimestamp(),
      syncStatus: "pending",
      syncMode: CABARAN_SUMMARY_SYNC_MODE,
      sheetUpsertKey: summaryKey,
    };
  }

  function saveCabaranSummary(payload) {
    const schoolCode = String(payload.schoolCode || getCabaranSchoolCode() || "").trim();
    const classId = String(payload.classId || "").trim();
    const studentId = String(payload.studentId || "").trim();
    const checkpointId = String(payload.checkpointId || "").trim();

    if (!schoolCode || !classId || !studentId || !checkpointId) {
      return Promise.reject(
        new Error("Cabaran summary missing identity fields for upsert key.")
      );
    }

    const summaryKey = [
      normalizeCabaranIdentityText(schoolCode),
      normalizeCabaranIdentityText(classId),
      normalizeCabaranIdentityText(studentId),
      normalizeCabaranIdentityText(checkpointId),
    ].join("|");
    const updatedAt = getCabaranCompletionTimestamp();
    const record = {
      summaryKey: summaryKey,
      schoolCode: schoolCode,
      classId: classId,
      studentId: studentId,
      studentName: String(payload.studentName || "").trim(),
      checkpointId: checkpointId,
      totalCorrect: payload.totalCorrect,
      totalQuestions: payload.totalQuestions,
      percentage: payload.percentage,
      suggestedTP: payload.suggestedTP,
      cabaranCompleted: payload.cabaranCompleted !== false,
      updatedAt: updatedAt,
      syncStatus: payload.syncStatus || "pending",
      syncMode: CABARAN_SUMMARY_SYNC_MODE,
      sheetUpsertKey: summaryKey,
    };

    console.log("[Cabaran] Summary upsert (latest result + timestamp)", {
      summaryKey: summaryKey,
      totalCorrect: record.totalCorrect,
      suggestedTP: record.suggestedTP,
      updatedAt: updatedAt,
    });

    return cabaranStorePut(CABARAN_SUMMARIES_STORE, record);
  }

  function resetCabaranSessionMemory() {
    cabaranSessionAnswers = [];
    cabaranCorrectCount = 0;
  }

  function rememberCabaranAnswer(payload) {
    const entry = {
      questionNo: cabaranQuestionNum,
      targetText: payload.targetText,
      answer: payload.answer || "",
      transcript: payload.transcript || "",
      confidence:
        payload.confidence !== undefined && payload.confidence !== null
          ? payload.confidence
          : "",
      isCorrect: !!payload.isCorrect,
    };

    cabaranSessionAnswers.push(entry);
    console.log("[Cabaran] Answer (memory only)", entry);
  }

  function applyCabaranOverlayRect(el, rect) {
    applyLayoutRect(el, rect);
  }

  function raiseCabaranButtonHotspots() {
    const section = document.getElementById("screen-cabaran");

    if (!section) {
      return;
    }

    CABARAN_BUTTON_LAYOUT_KEYS.forEach(function (key) {
      const btn = cabaranButtonHotspotEls[key];

      if (btn) {
        btn.style.zIndex = "25";
        btn.style.pointerEvents = "auto";
        section.appendChild(btn);
      }
    });
  }

  function raiseCabaranChoiceAnswers() {
    const section = document.getElementById("screen-cabaran");

    if (!section || getCabaranQuestionMode() !== "choice") {
      return;
    }

    cabaranAnswerBtns.forEach(function (btn) {
      if (!btn) {
        return;
      }

      btn.style.zIndex = "20";
      btn.style.pointerEvents = "auto";
      section.appendChild(btn);
    });
  }

  function applyCabaranButtonLayout() {
    CABARAN_BUTTON_LAYOUT_KEYS.forEach(function (key) {
      const btn = cabaranButtonHotspotEls[key];
      const rect = CABARAN_BUTTON_LAYOUT[key];

      if (!btn || !rect) {
        return;
      }

      applyLayoutRect(btn, rect);
      btn.style.zIndex = "25";
      btn.style.pointerEvents = "auto";
      markCabaranLayoutDebug(btn, key);
    });

    raiseCabaranButtonHotspots();
  }

  function createCabaranButtonHotspots(section) {
    const buttonConfigs = [
      {
        key: "exitButton",
        id: "cabaran_exit",
        label: "Keluar",
        action: "cabaran-exit",
      },
      {
        key: "submenuButton",
        id: "cabaran_submenu",
        label: "Submenu",
        action: "cabaran-submenu",
      },
      {
        key: "ulangButton",
        id: "cabaran_ulang",
        label: "Ulang",
        action: "cabaran-ulang",
      },
    ];

    buttonConfigs.forEach(function (config) {
      if (cabaranButtonHotspotEls[config.key]) {
        return;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hotspot cabaran-button-hotspot";
      btn.dataset.hotspot = config.id;
      btn.dataset.action = config.action;
      btn.setAttribute("aria-label", config.label);
      btn.style.zIndex = "25";
      btn.style.pointerEvents = "auto";

      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (DEBUG_CABARAN_LAYOUT) {
          return;
        }

        if (config.action === "cabaran-exit") {
          exitCabaranToHome();
          return;
        }

        if (config.action === "cabaran-submenu") {
          returnToCurrentCheckpointSubmenu();
          return;
        }

        if (config.action === "cabaran-ulang") {
          replayCabaranQuestionAudioOnly();
        }
      });

      section.appendChild(btn);
      cabaranButtonHotspotEls[config.key] = btn;
    });
  }

  function applyCabaranOverlayLayout() {
    const L = CABARAN_OVERLAY_LAYOUT;

    function applyOverlay(layoutKey, el) {
      if (!el || !L[layoutKey]) {
        return;
      }

      applyCabaranOverlayRect(el, L[layoutKey]);
      el.style.pointerEvents = getCabaranOverlayPointerEvents(layoutKey);
      markCabaranOverlayDebug(el, layoutKey);
    }

    applyOverlay("progressBox", cabaranProgressEl);
    applyOverlay("instructionText", cabaranQuestionEl);
    applyOverlay("blankQuestion", cabaranBlankQuestionEl);
    applyOverlay("audioVisual", cabaranAudioVisualEl);
    applyOverlay("targetWord", cabaranTargetEl);
    ["answerA", "answerB", "answerC"].forEach(function (layoutKey, index) {
      applyOverlay(layoutKey, cabaranAnswerBtns[index]);
    });
    raiseCabaranChoiceAnswers();
    applyOverlay("susunAnswer", cabaranSusunAnswerEl);
    applyOverlay("susunDrag", cabaranSusunDragEl);

    if (cabaranFeedback && L.feedbackText) {
      applyOverlay("feedbackText", cabaranFeedback);
      cabaranFeedback.style.transform = "none";
      cabaranFeedback.style.maxWidth = "none";
      cabaranFeedback.style.boxSizing = "border-box";
      cabaranFeedback.style.display = "flex";
      cabaranFeedback.style.alignItems = "center";
      cabaranFeedback.style.justifyContent = "center";
      cabaranFeedback.style.textAlign = "center";
      cabaranFeedback.style.background = "transparent";
    }

    if (cabaranTimerEl && L.timerBox) {
      applyOverlay("timerBox", cabaranTimerEl);
      applyCabaranTimerFontSize();
    }

    if (getCabaranQuestionMode() === "type") {
      if (cabaranTypeInputWrapEl && L.typingInput) {
        applyOverlay("typingInput", cabaranTypeInputWrapEl);
        cabaranTypeInputWrapEl.style.zIndex = "30";
        applyCabaranTypingInputFontSize();
      }
    } else if (!DEBUG_CABARAN_LAYOUT) {
      clearCabaranTypingDebugMarkers();
    }

    syncCabaranTypingDebugCalibration();
    bindCabaranTypingSubmitLayout();

    if (getCabaranQuestionMode() === "type" && cabaranBlankQuestionEl) {
      cabaranBlankQuestionEl.style.zIndex = "9";
    }

    applyCabaranButtonLayout();
    applyCabaranDebugMode();
    positionCabaranLayoutDebugPanel();
  }

  function getCabaranTaughtWordPool() {
    return BELAJAR_CONTENT.perkataan_vkv.concat(BELAJAR_CONTENT.perkataan_kvkv);
  }

  function getCabaranWordAudioFolder(word) {
    const w = String(word || "").trim().toLowerCase();

    if (BELAJAR_CONTENT.perkataan_vkv.indexOf(w) >= 0) {
      return "perkataan_vkv";
    }

    return "perkataan_kvkv";
  }

  function getCabaranTaughtSyllablePool() {
    const seen = {};
    const items = [];

    SUKU_KATA_KV_LEVELS.forEach(function (level) {
      level.items.forEach(function (item) {
        const key = String(item || "").trim().toLowerCase();

        if (key && !seen[key]) {
          seen[key] = true;
          items.push(key);
        }
      });
    });

    return items;
  }

  function buildCabaranVokalBlankRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const vowels = BELAJAR_CONTENT.vokal;
    const vowelPositions = [];

    for (let i = 0; i < w.length; i += 1) {
      if (vowels.indexOf(w.charAt(i)) >= 0) {
        vowelPositions.push(i);
      }
    }

    if (!vowelPositions.length) {
      return null;
    }

    const blankPos = vowelPositions[Math.floor(Math.random() * vowelPositions.length)];
    const correctAnswer = w.charAt(blankPos);
    const prefix = w.slice(0, blankPos);
    const suffix = w.slice(blankPos + 1);
    const distractors = shuffleArray(
      vowels.filter(function (v) {
        return v !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: getCabaranWordAudioFolder(w),
      prefix: prefix,
      suffix: suffix,
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
    };
  }

  function buildCabaranKonsonanBlankRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const konsonan = BELAJAR_CONTENT.konsonan;
    const consonantPositions = [];

    for (let i = 0; i < w.length; i += 1) {
      if (konsonan.indexOf(w.charAt(i)) >= 0) {
        consonantPositions.push(i);
      }
    }

    if (!consonantPositions.length) {
      return null;
    }

    const blankPos = consonantPositions[0];
    const correctAnswer = w.charAt(blankPos);
    const prefix = w.slice(0, blankPos);
    const suffix = w.slice(blankPos + 1);
    const distractors = shuffleArray(
      konsonan.filter(function (k) {
        return k !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: getCabaranWordAudioFolder(w),
      prefix: prefix,
      suffix: suffix,
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
    };
  }

  function buildCabaranSukuKataBlankRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const syllables = splitLatihanSusunSyllables(w);

    if (syllables.length < 2) {
      return null;
    }

    const taughtSyllables = getCabaranTaughtSyllablePool();
    let blankIndex = -1;

    for (let i = syllables.length - 1; i >= 0; i -= 1) {
      if (taughtSyllables.indexOf(syllables[i]) >= 0) {
        blankIndex = i;
        break;
      }
    }

    if (blankIndex < 0) {
      blankIndex = syllables.length - 1;
    }

    const correctAnswer = syllables[blankIndex];
    const prefix = syllables.slice(0, blankIndex).join("");
    const suffix = syllables.slice(blankIndex + 1).join("");
    const distractors = shuffleArray(
      taughtSyllables.filter(function (s) {
        return s !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: getCabaranWordAudioFolder(w),
      prefix: prefix,
      suffix: suffix,
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
    };
  }

  function buildCabaranShortSoundBlankRound(word) {
    if (selectedCheckpoint === "vokal") {
      return buildCabaranVokalBlankRound(word);
    }

    if (selectedCheckpoint === "konsonan") {
      return buildCabaranKonsonanBlankRound(word);
    }

    return buildCabaranSukuKataBlankRound(word);
  }

  function buildCabaranKvkvHardBlankRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const syllables = splitLatihanSusunSyllables(w);

    if (syllables.length < 2) {
      return buildCabaranShortSoundBlankRound(w);
    }

    const blankIndex = syllables.length - 1;
    const correctAnswer = syllables[blankIndex];
    const prefix = syllables.slice(0, blankIndex).join("");
    const suffix = syllables.slice(blankIndex + 1).join("");
    const taughtSyllables = getCabaranTaughtSyllablePool();
    const distractors = shuffleArray(
      taughtSyllables.filter(function (s) {
        return s !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: "perkataan_kvkv",
      prefix: prefix,
      suffix: suffix,
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
      difficulty: "hard",
      showBlank: true,
    };
  }

  function buildCabaranEasyChoiceRound(targetItem) {
    const correctAnswer = String(targetItem || "").trim();
    const pool = getLatihanPracticePool().filter(function (item) {
      return String(item) !== correctAnswer;
    });
    const distractors = shuffleArray(pool).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: correctAnswer,
      audioFolder: selectedCheckpoint,
      difficulty: "easy",
      showBlank: false,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
    };
  }

  function buildCabaranMediumBlankRound(word) {
    const round = buildCabaranShortSoundBlankRound(word);

    if (!round) {
      return null;
    }

    round.difficulty = "medium";
    round.showBlank = true;
    round.audioFolder = "perkataan_vkv";
    return round;
  }

  function buildCabaranVokalFirstLetterRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const vowels = BELAJAR_CONTENT.vokal;

    if (!w.length || vowels.indexOf(w.charAt(0)) < 0) {
      return null;
    }

    const correctAnswer = w.charAt(0);
    const distractors = shuffleArray(
      vowels.filter(function (v) {
        return v !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: "perkataan_vkv",
      prefix: "",
      suffix: w.slice(1),
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
      difficulty: "medium",
      showBlank: true,
    };
  }

  function buildCabaranVokalLastLetterRound(syllable) {
    const w = String(syllable || "").trim().toLowerCase();
    const vowels = BELAJAR_CONTENT.vokal;

    if (!w.length || vowels.indexOf(w.charAt(w.length - 1)) < 0) {
      return null;
    }

    const correctAnswer = w.charAt(w.length - 1);
    const distractors = shuffleArray(
      vowels.filter(function (v) {
        return v !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: "suku_kata_kv",
      prefix: w.slice(0, -1),
      suffix: "",
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
      difficulty: "hard",
      showBlank: true,
    };
  }

  function buildCabaranVokalQuestionSequence(total) {
    const vowelItems = buildPracticeSequence(
      BELAJAR_CONTENT.vokal.slice(),
      CABARAN_SHORT_EASY_COUNT
    );
    const vkvWords = buildPracticeSequence(
      BELAJAR_CONTENT.perkataan_vkv.slice(),
      CABARAN_SHORT_MEDIUM_COUNT
    );
    const kvSyllables = buildPracticeSequence(
      getCabaranTaughtSyllablePool(),
      CABARAN_SHORT_HARD_COUNT
    );
    const rounds = [];

    vowelItems.forEach(function (item) {
      rounds.push(buildCabaranEasyChoiceRound(item));
    });

    vkvWords.forEach(function (word) {
      const round = buildCabaranVokalFirstLetterRound(word);

      if (round) {
        rounds.push(round);
      }
    });

    kvSyllables.forEach(function (syllable) {
      const round = buildCabaranVokalLastLetterRound(syllable);

      if (round) {
        rounds.push(round);
      }
    });

    while (rounds.length < total) {
      rounds.push(buildCabaranEasyChoiceRound(BELAJAR_CONTENT.vokal[0] || "a"));
    }

    return rounds.slice(0, total);
  }

  function buildCabaranKonsonanFirstLetterRound(syllable) {
    const w = String(syllable || "").trim().toLowerCase();
    const konsonan = BELAJAR_CONTENT.konsonan;

    if (!w.length || konsonan.indexOf(w.charAt(0)) < 0) {
      return null;
    }

    const correctAnswer = w.charAt(0);
    const distractors = shuffleArray(
      konsonan.filter(function (k) {
        return k !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: "suku_kata_kv",
      prefix: "",
      suffix: w.slice(1),
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
      difficulty: "medium",
      showBlank: true,
    };
  }

  function buildCabaranKonsonanMiddleLetterRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const konsonan = BELAJAR_CONTENT.konsonan;
    const middlePos = 1;

    if (w.length < 3 || konsonan.indexOf(w.charAt(middlePos)) < 0) {
      return null;
    }

    const correctAnswer = w.charAt(middlePos);
    const distractors = shuffleArray(
      konsonan.filter(function (k) {
        return k !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: "perkataan_vkv",
      prefix: w.charAt(0),
      suffix: w.slice(middlePos + 1),
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
      difficulty: "hard",
      showBlank: true,
    };
  }

  function buildCabaranKonsonanQuestionSequence(total) {
    const konsonanItems = buildPracticeSequence(
      BELAJAR_CONTENT.konsonan.slice(),
      CABARAN_SHORT_EASY_COUNT
    );
    const kvSyllables = buildPracticeSequence(
      getCabaranTaughtSyllablePool(),
      CABARAN_SHORT_MEDIUM_COUNT
    );
    const vkvWords = buildPracticeSequence(
      BELAJAR_CONTENT.perkataan_vkv.slice(),
      CABARAN_SHORT_HARD_COUNT
    );
    const rounds = [];

    konsonanItems.forEach(function (item) {
      rounds.push(buildCabaranEasyChoiceRound(item));
    });

    kvSyllables.forEach(function (syllable) {
      const round = buildCabaranKonsonanFirstLetterRound(syllable);

      if (round) {
        rounds.push(round);
      }
    });

    vkvWords.forEach(function (word) {
      const round = buildCabaranKonsonanMiddleLetterRound(word);

      if (round) {
        rounds.push(round);
      }
    });

    while (rounds.length < total) {
      rounds.push(buildCabaranEasyChoiceRound(BELAJAR_CONTENT.konsonan[0] || "b"));
    }

    return rounds.slice(0, total);
  }

  function buildCabaranSukuKataVkvSuffixRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const syllables = splitLatihanSusunSyllables(w);

    if (syllables.length < 2) {
      return null;
    }

    const blankIndex = syllables.length - 1;
    const correctAnswer = syllables[blankIndex];
    const taughtSyllables = getCabaranTaughtSyllablePool();
    const distractors = shuffleArray(
      taughtSyllables.filter(function (s) {
        return s !== correctAnswer;
      })
    ).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: w,
      audioFolder: "perkataan_vkv",
      prefix: syllables.slice(0, blankIndex).join(""),
      suffix: syllables.slice(blankIndex + 1).join(""),
      correctAnswer: correctAnswer,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
      difficulty: "medium",
      showBlank: true,
      questionMode: "choice",
    };
  }

  function buildCabaranSukuKataKvkvTypeRound(word) {
    const w = String(word || "").trim().toLowerCase();
    const syllables = splitLatihanSusunSyllables(w);

    if (syllables.length < 2) {
      return null;
    }

    const blankIndex = syllables.length - 1;
    const correctAnswer = syllables[blankIndex];

    return {
      audioWord: w,
      audioFolder: "perkataan_kvkv",
      prefix: syllables.slice(0, blankIndex).join(""),
      suffix: syllables.slice(blankIndex + 1).join(""),
      correctAnswer: correctAnswer,
      difficulty: "hard",
      showBlank: true,
      showTypeInput: true,
      questionMode: "type",
    };
  }

  function buildCabaranSukuKataQuestionSequence(total) {
    const syllableItems = buildPracticeSequence(
      getCabaranTaughtSyllablePool(),
      CABARAN_SHORT_EASY_COUNT
    );
    const vkvWords = buildPracticeSequence(
      BELAJAR_CONTENT.perkataan_vkv.slice(),
      CABARAN_SHORT_MEDIUM_COUNT
    );
    const kvkvWords = buildPracticeSequence(
      BELAJAR_CONTENT.perkataan_kvkv.slice(),
      CABARAN_SHORT_HARD_COUNT
    );
    const rounds = [];

    syllableItems.forEach(function (item) {
      rounds.push(buildCabaranEasyChoiceRound(item));
    });

    vkvWords.forEach(function (word) {
      const round = buildCabaranSukuKataVkvSuffixRound(word);

      if (round) {
        rounds.push(round);
      }
    });

    kvkvWords.forEach(function (word) {
      const round = buildCabaranSukuKataKvkvTypeRound(word);

      if (round) {
        rounds.push(round);
      }
    });

    while (rounds.length < total) {
      rounds.push(
        buildCabaranEasyChoiceRound(getCabaranTaughtSyllablePool()[0] || "ba")
      );
    }

    return rounds.slice(0, total);
  }

  function buildCabaranShortSoundQuestionSequence(total) {
    const easyItems = buildPracticeSequence(
      getLatihanPracticePool(),
      CABARAN_SHORT_EASY_COUNT
    );
    const mediumWords = buildPracticeSequence(
      BELAJAR_CONTENT.perkataan_vkv.slice(),
      CABARAN_SHORT_MEDIUM_COUNT
    );
    const hardWords = buildPracticeSequence(
      BELAJAR_CONTENT.perkataan_kvkv.slice(),
      CABARAN_SHORT_HARD_COUNT
    );
    const rounds = [];

    easyItems.forEach(function (item) {
      rounds.push(buildCabaranEasyChoiceRound(item));
    });

    mediumWords.forEach(function (word) {
      const round = buildCabaranMediumBlankRound(word);

      if (round) {
        rounds.push(round);
      }
    });

    hardWords.forEach(function (word) {
      const round = buildCabaranKvkvHardBlankRound(word);

      if (round) {
        rounds.push(round);
      }
    });

    while (rounds.length < total) {
      rounds.push(buildCabaranEasyChoiceRound(getLatihanPracticePool()[0] || "a"));
    }

    return rounds.slice(0, total);
  }

  function ensureCabaranQuestionPlan(forceNew) {
    if (
      !forceNew &&
      cabaranQuestionItems.length === CABARAN_TOTAL_QUESTIONS
    ) {
      return;
    }

    if (isCabaranChoiceCheckpoint()) {
      if (selectedCheckpoint === "vokal") {
        cabaranQuestionItems = buildCabaranVokalQuestionSequence(
          CABARAN_TOTAL_QUESTIONS
        );
      } else if (selectedCheckpoint === "konsonan") {
        cabaranQuestionItems = buildCabaranKonsonanQuestionSequence(
          CABARAN_TOTAL_QUESTIONS
        );
      } else if (selectedCheckpoint === "suku_kata_kv") {
        cabaranQuestionItems = buildCabaranSukuKataQuestionSequence(
          CABARAN_TOTAL_QUESTIONS
        );
      } else {
        cabaranQuestionItems = buildCabaranShortSoundQuestionSequence(
          CABARAN_TOTAL_QUESTIONS
        );
      }
      return;
    }

    const pool = getLatihanPracticePool();

    if (!pool.length) {
      cabaranQuestionItems = [];
      return;
    }

    cabaranQuestionItems = buildPracticeSequence(pool, CABARAN_TOTAL_QUESTIONS).map(
      function (word) {
        return {
          audioWord: String(word || "").trim().toLowerCase(),
          audioFolder: selectedCheckpoint,
        };
      }
    );
  }

  function getCabaranCurrentRound() {
    const index = cabaranQuestionNum - 1;

    if (cabaranQuestionItems[index] != null) {
      return cabaranQuestionItems[index];
    }

    return null;
  }

  function getCabaranTargetItem() {
    const round = getCabaranCurrentRound();

    if (round && round.audioWord) {
      return round.audioWord;
    }

    return "";
  }

  function renderCabaranBlankQuestion(round) {
    if (!cabaranBlankQuestionEl) {
      return;
    }

    if (cabaranBlankPrefixEl) {
      cabaranBlankPrefixEl.textContent = round.prefix || "";
    }

    if (cabaranBlankSuffixEl) {
      cabaranBlankSuffixEl.textContent = round.suffix || "";
    }

    if (cabaranBlankSlotEl) {
      const isType = round && round.questionMode === "type";
      cabaranBlankSlotEl.textContent = isType ? "?" : "";
    }

    cabaranBlankQuestionEl.style.display = "flex";
  }

  function getCabaranQuestionMode() {
    const round = getCabaranCurrentRound();

    if (round && round.questionMode) {
      return round.questionMode;
    }

    if (isCabaranChoiceCheckpoint()) {
      return "choice";
    }

    if (cabaranQuestionNum <= 3) {
      return "sebut";
    }

    if (cabaranQuestionNum <= 7) {
      return "choice";
    }

    return "susun";
  }

  function getCabaranQuestionInstruction() {
    const mode = getCabaranQuestionMode();

    if (mode === "sebut") {
      return "Sebut perkataan ini dengan jelas.";
    }

    if (mode === "susun") {
      return "Susun jawapan yang betul.";
    }

    if (mode === "type") {
      return "Taip jawapan yang betul.";
    }

    return "Pilih jawapan yang betul.";
  }

  function buildCabaranChoiceRound() {
    if (isCabaranChoiceCheckpoint()) {
      const round = getCabaranCurrentRound();

      if (round) {
        return round;
      }
    }

    const correctAnswer = getCabaranTargetItem();
    const pool = getLatihanPracticePool().filter(function (item) {
      return item !== correctAnswer;
    });
    const distractors = shuffleArray(pool).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      audioWord: correctAnswer,
      audioFolder: selectedCheckpoint,
      options: options,
      correctIndex: options.indexOf(correctAnswer),
    };
  }

  function buildCabaranSusunRound() {
    const target = String(getCabaranTargetItem() || "")
      .trim()
      .toLowerCase();
    const answerOrder = splitLatihanSusunSyllables(target);

    return {
      target: target,
      audioTarget: target,
      answerOrder: answerOrder,
      dragPieces: shuffleArray(answerOrder.slice()),
    };
  }

  function clearCabaranAdvanceTimer() {
    if (cabaranAdvanceTimer !== null) {
      window.clearTimeout(cabaranAdvanceTimer);
      cabaranAdvanceTimer = null;
    }
  }

  function clearCabaranCountdownTimer() {
    if (cabaranCountdownInterval !== null) {
      window.clearInterval(cabaranCountdownInterval);
      cabaranCountdownInterval = null;
    }
  }

  function getCabaranCountdownDuration() {
    const mode = getCabaranQuestionMode();

    if (mode === "choice") {
      return CABARAN_CHOICE_COUNTDOWN_SEC;
    }

    if (mode === "susun" || mode === "type") {
      return CABARAN_SUSUN_COUNTDOWN_SEC;
    }

    return 0;
  }

  function hideCabaranTimer() {
    if (!cabaranTimerEl) {
      return;
    }

    cabaranTimerEl.style.display = "none";
    cabaranTimerEl.setAttribute("aria-hidden", "true");
    cabaranTimerEl.classList.remove("cabaran-timer--tick", "cabaran-timer--urgent");
  }

  function applyCabaranTimerFontSize() {
    if (!cabaranTimerEl || !CABARAN_OVERLAY_LAYOUT.timerBox) {
      return;
    }

    const fontSize = CABARAN_OVERLAY_LAYOUT.timerBox.fontSize;

    if (fontSize == null) {
      return;
    }

    if (typeof fontSize === "number") {
      cabaranTimerEl.style.fontSize =
        "clamp(1.2rem, " + fontSize + "vmin, 2.8rem)";
      return;
    }

    cabaranTimerEl.style.fontSize = String(fontSize);
  }

  function applyCabaranTypingInputFontSize() {
    if (!cabaranTypeInputEl || !CABARAN_OVERLAY_LAYOUT.typingInput) {
      return;
    }

    const fontSize = CABARAN_OVERLAY_LAYOUT.typingInput.fontSize;

    if (fontSize == null) {
      return;
    }

    if (typeof fontSize === "number") {
      cabaranTypeInputEl.style.fontSize =
        "clamp(0.9rem, " + fontSize + "vmin, 2.2rem)";
      return;
    }

    cabaranTypeInputEl.style.fontSize = String(fontSize);
  }

  function clearCabaranTypingDebugMarkers() {
    if (DEBUG_CABARAN_LAYOUT) {
      return;
    }

    [cabaranTypeInputWrapEl, cabaranTypeSubmitBtn].forEach(function (el) {
      if (!el) {
        return;
      }

      el.removeAttribute("data-cabaran-overlay");
      el.removeAttribute("data-debug-label");
    });
  }

  function bindCabaranTypingSubmitLayout() {
    const rect = CABARAN_OVERLAY_LAYOUT.typingSubmit;

    if (!cabaranTypeSubmitBtn || !rect || getCabaranQuestionMode() !== "type") {
      return;
    }

    applyCabaranOverlayRect(cabaranTypeSubmitBtn, rect);
    cabaranTypeSubmitBtn.style.position = "absolute";
    cabaranTypeSubmitBtn.style.boxSizing = "border-box";
    cabaranTypeSubmitBtn.style.zIndex = "31";
    cabaranTypeSubmitBtn.style.pointerEvents = getCabaranOverlayPointerEvents("typingSubmit");
    markCabaranOverlayDebug(cabaranTypeSubmitBtn, "typingSubmit");
    applyCabaranTypingSubmitFontSize();
  }

  function resetCabaranTypingUiAnimations() {
    if (cabaranTypeInputEl) {
      cabaranTypeInputEl.classList.remove("cabaran-type-input--attention");
    }

    if (cabaranTypeSubmitBtn) {
      cabaranTypeSubmitBtn.classList.remove("cabaran-type-submit--attention");
    }
  }

  function startCabaranTypingInputAttention() {
    if (!cabaranTypeInputEl || DEBUG_CABARAN_LAYOUT) {
      return;
    }

    cabaranTypeInputEl.classList.remove("cabaran-type-input--attention");
    void cabaranTypeInputEl.offsetWidth;
    cabaranTypeInputEl.classList.add("cabaran-type-input--attention");
  }

  function stopCabaranTypingInputAttention() {
    if (cabaranTypeInputEl) {
      cabaranTypeInputEl.classList.remove("cabaran-type-input--attention");
    }
  }

  function startCabaranTypingSubmitAttention() {
    if (!cabaranTypeSubmitBtn || cabaranTypeSubmitBtn.disabled || DEBUG_CABARAN_LAYOUT) {
      return;
    }

    cabaranTypeSubmitBtn.classList.add("cabaran-type-submit--attention");
  }

  function stopCabaranTypingSubmitAttention() {
    if (cabaranTypeSubmitBtn) {
      cabaranTypeSubmitBtn.classList.remove("cabaran-type-submit--attention");
    }
  }

  function focusCabaranTypeInputIfSafe() {
    if (
      DEBUG_CABARAN_LAYOUT ||
      !cabaranTypeInputEl ||
      cabaranQuestionLocked ||
      cabaranBusy ||
      getCabaranQuestionMode() !== "type"
    ) {
      return;
    }

    window.requestAnimationFrame(function () {
      if (
        activeScreen !== "cabaran" ||
        cabaranQuestionLocked ||
        getCabaranQuestionMode() !== "type" ||
        !cabaranTypeInputEl
      ) {
        return;
      }

      cabaranTypeInputEl.focus({ preventScroll: true });
    });
  }

  function syncCabaranTypingDebugCalibration() {
    const showTypingUi = getCabaranQuestionMode() === "type";

    if (cabaranTypeInputWrapEl) {
      cabaranTypeInputWrapEl.style.display = showTypingUi ? "flex" : "none";
      cabaranTypeInputWrapEl.style.pointerEvents = showTypingUi ? "auto" : "none";
      cabaranTypeInputWrapEl.style.zIndex = showTypingUi ? "30" : "";
    }

    if (cabaranTypeLabelEl) {
      cabaranTypeLabelEl.style.display = showTypingUi ? "block" : "none";
    }

    if (cabaranTypeInputEl) {
      cabaranTypeInputEl.style.display = showTypingUi ? "block" : "none";

      if (!showTypingUi) {
        cabaranTypeInputEl.value = "";
        cabaranTypeInputEl.disabled = false;
        cabaranTypeInputEl.readOnly = false;
        cabaranTypeInputEl.style.pointerEvents = "none";
      } else if (DEBUG_CABARAN_LAYOUT) {
        cabaranTypeInputEl.style.pointerEvents = "none";
      } else {
        cabaranTypeInputEl.disabled = false;
        cabaranTypeInputEl.readOnly = false;
        cabaranTypeInputEl.style.pointerEvents = "auto";
      }
    }

    if (cabaranTypeSubmitBtn) {
      cabaranTypeSubmitBtn.style.display = showTypingUi ? "flex" : "none";
      cabaranTypeSubmitBtn.style.pointerEvents = showTypingUi ? "auto" : "none";
      cabaranTypeSubmitBtn.style.zIndex = showTypingUi ? "31" : "";

      if (!showTypingUi) {
        cabaranTypeSubmitBtn.disabled = false;
      }
    }

    if (!showTypingUi) {
      resetCabaranTypingUiAnimations();

      if (!DEBUG_CABARAN_LAYOUT) {
        clearCabaranTypingDebugMarkers();
      }
    }
  }

  function applyCabaranTypingSubmitFontSize() {
    if (!cabaranTypeSubmitBtn || !CABARAN_OVERLAY_LAYOUT.typingSubmit) {
      return;
    }

    const fontSize = CABARAN_OVERLAY_LAYOUT.typingSubmit.fontSize;

    if (fontSize == null) {
      return;
    }

    if (typeof fontSize === "number") {
      cabaranTypeSubmitBtn.style.fontSize =
        "clamp(1rem, " + fontSize + "vmin, 2.6rem)";
      return;
    }

    cabaranTypeSubmitBtn.style.fontSize = String(fontSize);
  }

  function renderCabaranTimerDisplay(seconds) {
    if (!cabaranTimerEl) {
      return;
    }

    cabaranTimerEl.textContent = String(seconds);
    cabaranTimerEl.classList.remove("cabaran-timer--tick", "cabaran-timer--urgent");
    void cabaranTimerEl.offsetWidth;
    cabaranTimerEl.classList.add(
      seconds <= 3 ? "cabaran-timer--urgent" : "cabaran-timer--tick"
    );
  }

  function showCabaranTimer(seconds) {
    if (!cabaranTimerEl) {
      return;
    }

    cabaranTimerEl.style.display = "flex";
    cabaranTimerEl.setAttribute("aria-hidden", "false");
    renderCabaranTimerDisplay(seconds);
  }

  function startCabaranCountdown() {
    clearCabaranCountdownTimer();

    const duration = getCabaranCountdownDuration();

    if (!duration) {
      hideCabaranTimer();
      return;
    }

    cabaranCountdownSeconds = duration;
    showCabaranTimer(cabaranCountdownSeconds);

    cabaranCountdownInterval = window.setInterval(function () {
      if (activeScreen !== "cabaran" || cabaranQuestionLocked || cabaranBusy) {
        clearCabaranCountdownTimer();
        return;
      }

      cabaranCountdownSeconds -= 1;

      if (cabaranCountdownSeconds <= 0) {
        clearCabaranCountdownTimer();
        handleCabaranQuestionTimeout();
        return;
      }

      showCabaranTimer(cabaranCountdownSeconds);
    }, 1000);
  }

  function handleCabaranQuestionTimeout() {
    if (
      cabaranQuestionLocked ||
      cabaranBusy ||
      cabaranQuestionNum > CABARAN_TOTAL_QUESTIONS
    ) {
      return;
    }

    const mode = getCabaranQuestionMode();

    if (mode !== "choice" && mode !== "susun" && mode !== "type") {
      return;
    }

    cabaranQuestionLocked = true;
    const targetText = getCabaranTargetItem();

    showCabaranFeedbackMessage(CABARAN_WRONG_FEEDBACK);

    if (mode === "choice") {
      cabaranAnswerBtns.forEach(function (btn) {
        btn.disabled = true;
      });

      rememberCabaranAnswer({
        targetText: targetText,
        answer: "",
        transcript: "",
        confidence: "",
        isCorrect: false,
      });
    } else if (mode === "type") {
      stopCabaranTypingInputAttention();
      stopCabaranTypingSubmitAttention();

      if (cabaranTypeInputEl) {
        cabaranTypeInputEl.disabled = true;
      }

      if (cabaranTypeSubmitBtn) {
        cabaranTypeSubmitBtn.disabled = true;
      }

      rememberCabaranAnswer({
        targetText: targetText,
        answer: cabaranTypeInputEl ? cabaranTypeInputEl.value : "",
        transcript: "",
        confidence: "",
        isCorrect: false,
      });
    } else {
      rememberCabaranAnswer({
        targetText: targetText,
        answer: getCabaranSusunPlacedOrder().join(""),
        transcript: "",
        confidence: "",
        isCorrect: false,
      });
    }

    scheduleCabaranAdvance();
  }

  function updateCabaranProgress() {
    if (!cabaranProgressEl) {
      return;
    }

    const mission = Math.min(cabaranQuestionNum, CABARAN_TOTAL_QUESTIONS);
    cabaranProgressEl.textContent = "Soalan " + mission + " / 10";
  }

  function hideCabaranSummaryOverlay() {
    if (!cabaranSummaryOverlayEl) {
      return;
    }

    cabaranSummaryOverlayEl.style.display = "none";
    cabaranSummaryOverlayEl.setAttribute("aria-hidden", "true");
  }

  function showCabaranSummaryOverlay(summary) {
    if (!cabaranSummaryOverlayEl) {
      return;
    }

    const title = cabaranSummaryOverlayEl.querySelector("#cabaran-summary-title");
    const body = cabaranSummaryOverlayEl.querySelector("#cabaran-summary-body");

    if (title) {
      title.textContent = "Tahniah 🎉";
    }

    if (body) {
      body.textContent =
        "Betul: " +
        summary.totalCorrect +
        "/" +
        summary.totalQuestions +
        "\nPeratus: " +
        summary.percentage +
        "%\nCadangan:\n" +
        summary.suggestedTP +
        "\n\nKeputusan disimpan";
    }

    cabaranSummaryOverlayEl.style.display = "flex";
    cabaranSummaryOverlayEl.setAttribute("aria-hidden", "false");
  }

  function finishCabaranSession() {
    const session = getCabaranStudentSession();
    const totalQuestions = CABARAN_TOTAL_QUESTIONS;
    const percentage = Math.round((cabaranCorrectCount / totalQuestions) * 100);
    const suggestedTP = getCabaranSuggestedTP(cabaranCorrectCount);

    if (!session || !selectedCheckpoint) {
      console.warn("[Cabaran] Cannot upsert summary without student session/checkpoint");
      cabaranBusy = false;
      return;
    }

    const summary = buildCabaranSummaryRecord(session, selectedCheckpoint, {
      totalCorrect: cabaranCorrectCount,
      totalQuestions: totalQuestions,
      percentage: percentage,
      suggestedTP: suggestedTP,
    });

    console.log("[Cabaran] Session answers (memory only)", cabaranSessionAnswers);

    void saveCabaranSummary(summary).catch(function (error) {
      console.warn("[Cabaran] Summary upsert error", error);
    });

    clearCabaranCountdownTimer();
    hideCabaranTimer();
    showCabaranSummaryOverlay(summary);
    cabaranBusy = false;
  }

  function openNextCabaranQuestion() {
    clearCabaranAdvanceTimer();
    clearCabaranCountdownTimer();
    clearCabaranFeedback();

    if (cabaranQuestionNum >= CABARAN_TOTAL_QUESTIONS) {
      finishCabaranSession();
      return;
    }

    cabaranQuestionNum += 1;
    cabaranQuestionLocked = false;
    renderCabaranRound();
  }

  function scheduleCabaranAdvance() {
    clearCabaranAdvanceTimer();
    cabaranAdvanceTimer = window.setTimeout(function () {
      cabaranAdvanceTimer = null;
      openNextCabaranQuestion();
    }, 1400);
  }

  function clearCabaranFeedback() {
    clearPronunciationFeedbackTimer();

    if (!cabaranFeedback) {
      return;
    }

    cabaranFeedback.classList.remove(
      "cabaran-feedback--correct",
      "cabaran-feedback--wrong"
    );
    cabaranFeedback.style.animation = "none";
    cabaranFeedback.textContent = "";
    cabaranFeedback.style.opacity = "0";
  }

  function showCabaranFeedbackMessage(message) {
    if (cabaranFeedback) {
      cabaranFeedback.style.whiteSpace = "pre-line";
      cabaranFeedback.style.textAlign = "center";
      cabaranFeedback.classList.remove(
        "cabaran-feedback--correct",
        "cabaran-feedback--wrong"
      );
      cabaranFeedback.style.animation = "none";
    }

    showPronunciationFeedbackMessage(cabaranFeedback, message);

    if (cabaranFeedback) {
      const text = String(message || "");

      if (text.indexOf(CABARAN_CORRECT_FEEDBACK) === 0) {
        void cabaranFeedback.offsetWidth;
        cabaranFeedback.style.animation = "";
        cabaranFeedback.classList.add("cabaran-feedback--correct");
      } else if (text.indexOf(CABARAN_WRONG_FEEDBACK) === 0) {
        void cabaranFeedback.offsetWidth;
        cabaranFeedback.style.animation = "";
        cabaranFeedback.classList.add("cabaran-feedback--wrong");
      }
    }
  }

  function playCabaranTargetAudio(onFinish) {
    const round = getCabaranCurrentRound();
    const target = getCabaranTargetItem();
    const finish =
      typeof onFinish === "function"
        ? onFinish
        : function () {};

    if (!target) {
      finish();
      return;
    }

    stopBelajarAudio();
    clearCabaranFeedback();

    let audioPath;

    if (round && round.audioFolder) {
      audioPath = "audio/" + round.audioFolder + "/" + target + ".mp3";
    } else if (isBelajarAudioCheckpoint()) {
      audioPath = getBelajarAudioPath(target);
    } else {
      finish();
      return;
    }
    const generation = belajarAudioGeneration;
    const audio = new Audio(audioPath);

    belajarAudio = audio;

    audio.addEventListener("ended", function () {
      if (generation === belajarAudioGeneration) {
        belajarAudio = null;
      }

      finish();
    });

    audio.addEventListener("error", function () {
      if (generation === belajarAudioGeneration) {
        belajarAudio = null;
      }

      finish();
    });

    audio.play().catch(function () {
      finish();
    });
  }

  function stopCabaranRecognition() {
    if (!cabaranActiveRecognition) {
      return;
    }

    try {
      cabaranActiveRecognition.stop();
    } catch (error) {
      // Ignore.
    }

    cabaranActiveRecognition = null;
  }

  function listenCabaranMalaySpeech(timeoutMs) {
    const engine = getAssessmentEngine();
    const SpeechRecognition =
      engine && engine.getSpeechRecognitionConstructor
        ? engine.getSpeechRecognitionConstructor()
        : window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
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

      cabaranActiveRecognition = recognition;
      recognition.lang = "ms-MY";
      recognition.continuous = false;
      recognition.interimResults = false;

      try {
        recognition.maxAlternatives = 3;
      } catch (maxAltError) {
        // Ignore.
      }

      function finish(result) {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timer);
        cabaranActiveRecognition = null;
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

        if (alternatives.length) {
          bestTranscript = alternatives[0].transcript;
          bestConfidence = alternatives[0].confidence;
        }
      };

      recognition.onerror = function (event) {
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

      const timer = window.setTimeout(function () {
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

  async function runCabaranWordSpeechCheck(targetText) {
    const engine = getAssessmentEngine();

    if (!engine || !engine.evaluateWordModeSpeech) {
      return { ok: false, apiUnavailable: true, reasonKey: "no_engine" };
    }

    if (engine.isSpeechRecognitionAvailable && !engine.isSpeechRecognitionAvailable()) {
      return { ok: false, apiUnavailable: true, reasonKey: "no_speech_api" };
    }

    if (engine.stopActiveSession) {
      engine.stopActiveSession();
    }

    stopCabaranRecognition();

    let speech;

    try {
      speech = await listenCabaranMalaySpeech(CABARAN_SPEECH_TIMEOUT_MS);
    } catch (listenError) {
      return {
        ok: false,
        apiUnavailable: true,
        reasonKey: "speech_rejected",
        message: String(listenError && listenError.message ? listenError.message : listenError),
      };
    }

    if (engine.isGoogleSpeechApiFailure && engine.isGoogleSpeechApiFailure(speech)) {
      return {
        ok: false,
        apiUnavailable: true,
        reasonKey: String(speech.error || "speech_error"),
      };
    }

    const evaluation = engine.evaluateWordModeSpeech(targetText, speech);
    const transcript = String(
      evaluation.transcript || speech.transcript || ""
    ).trim();

    console.log("[Cabaran] Google speech", {
      targetText: targetText,
      transcript: transcript,
      confidence: evaluation.confidence,
      pass: evaluation.pass,
      failReason: evaluation.failReason,
    });

    return {
      ok: true,
      isCorrect: !!evaluation.pass,
      transcript: transcript,
      confidence: evaluation.confidence,
      failReason: evaluation.failReason || null,
      aiResult: evaluation.aiResult,
    };
  }

  function setCabaranModeUi(mode) {
    const isChoice = mode === "choice";
    const isSebut = mode === "sebut";
    const isSusun = mode === "susun";
    const isType = mode === "type";
    const round = getCabaranCurrentRound();
    const showBlank =
      (isChoice && isCabaranChoiceCheckpoint() && round && round.showBlank) ||
      (isType && round && round.showBlank);
    const showAudioVisual =
      isChoice && isCabaranChoiceCheckpoint() && round && !round.showBlank;

    cabaranAnswerBtns.forEach(function (btn) {
      btn.style.display = isChoice ? "flex" : "none";
      btn.style.pointerEvents = isChoice ? "auto" : "none";
    });

    if (isChoice) {
      raiseCabaranChoiceAnswers();
    }

    if (cabaranBlankQuestionEl) {
      cabaranBlankQuestionEl.style.display = showBlank || isType ? "flex" : "none";
      cabaranBlankQuestionEl.style.pointerEvents = "none";
      cabaranBlankQuestionEl.style.zIndex = "9";
    }

    if (cabaranBlankSlotEl) {
      if (isType || showBlank) {
        cabaranBlankSlotEl.style.display = "inline-flex";
        cabaranBlankSlotEl.textContent = isType ? "?" : "";
      } else {
        cabaranBlankSlotEl.style.display = "none";
        cabaranBlankSlotEl.textContent = "";
      }
    }

    syncCabaranTypingDebugCalibration();

    if (cabaranAudioVisualEl) {
      cabaranAudioVisualEl.style.display = showAudioVisual ? "flex" : "none";
    }

    if (cabaranTargetEl) {
      cabaranTargetEl.style.display = isSebut ? "flex" : "none";
    }

    if (cabaranSusunAnswerEl) {
      cabaranSusunAnswerEl.style.display = isSusun ? "flex" : "none";
    }

    if (cabaranSusunDragEl) {
      cabaranSusunDragEl.style.display = isSusun ? "flex" : "none";
    }
  }

  function getCabaranSusunPlacedOrder() {
    const order = [];

    cabaranSusunSlotEls.forEach(function (slot) {
      const chip = slot.querySelector(".latihan-susun-chip");

      if (chip) {
        order.push(chip.dataset.pieceText || chip.textContent.trim());
      } else {
        order.push("");
      }
    });

    return order;
  }

  function isCabaranSusunAnswerComplete() {
    const order = getCabaranSusunPlacedOrder();

    return (
      cabaranSusunCurrentRound &&
      order.length === cabaranSusunCurrentRound.answerOrder.length &&
      order.every(function (text) {
        return !!text;
      })
    );
  }

  function isCabaranSusunPlacedAnswerCorrect() {
    if (!cabaranSusunCurrentRound || !isCabaranSusunAnswerComplete()) {
      return false;
    }

    const placed = getCabaranSusunPlacedOrder();
    const expected = cabaranSusunCurrentRound.answerOrder;

    for (let i = 0; i < expected.length; i += 1) {
      if (placed[i] !== expected[i]) {
        return false;
      }
    }

    return true;
  }

  function returnCabaranChipToDragPool(chipEl) {
    if (!cabaranSusunDragEl || !chipEl) {
      return;
    }

    cabaranSusunDragEl.appendChild(chipEl);
    chipEl.classList.remove("is-in-slot");
  }

  function placeCabaranChipInSlot(chipEl, slotEl) {
    const existing = slotEl.querySelector(".latihan-susun-chip");

    if (existing && existing !== chipEl) {
      returnCabaranChipToDragPool(existing);
    }

    slotEl.appendChild(chipEl);
    chipEl.classList.add("is-in-slot");
  }

  function onCabaranSusunPointerMove(event) {
    if (!cabaranSusunPointerDrag) {
      return;
    }

    cabaranSusunPointerDrag.el.style.left =
      event.clientX - cabaranSusunPointerDrag.offsetX + "px";
    cabaranSusunPointerDrag.el.style.top =
      event.clientY - cabaranSusunPointerDrag.offsetY + "px";
  }

  function endCabaranSusunPointerDrag(event) {
    if (!cabaranSusunPointerDrag) {
      return;
    }

    const drag = cabaranSusunPointerDrag;
    cabaranSusunPointerDrag = null;

    drag.el.classList.remove("is-dragging");
    drag.el.style.position = "";
    drag.el.style.left = "";
    drag.el.style.top = "";
    drag.el.style.zIndex = "";

    let dropped = false;

    cabaranSusunSlotEls.forEach(function (slot) {
      if (dropped) {
        return;
      }

      const rect = slot.getBoundingClientRect();

      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        placeCabaranChipInSlot(drag.el, slot);
        dropped = true;
      }
    });

    if (!dropped) {
      if (drag.fromSlot) {
        placeCabaranChipInSlot(drag.el, drag.fromSlot);
      } else {
        returnCabaranChipToDragPool(drag.el);
      }
    }

    if (!cabaranQuestionLocked && isCabaranSusunAnswerComplete()) {
      submitCabaranSusunAnswer();
    }
  }

  function bindCabaranSusunChip(chipEl) {
    chipEl.addEventListener("pointerdown", function (event) {
      if (cabaranQuestionLocked || cabaranBusy) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = chipEl.getBoundingClientRect();
      const fromSlot = chipEl.closest(".latihan-susun-slot");

      cabaranSusunPointerDrag = {
        el: chipEl,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        fromSlot: fromSlot,
      };

      chipEl.classList.add("is-dragging");
      chipEl.style.position = "fixed";
      chipEl.style.zIndex = "10050";
      chipEl.style.left = rect.left + "px";
      chipEl.style.top = rect.top + "px";

      if (chipEl.setPointerCapture) {
        chipEl.setPointerCapture(event.pointerId);
      }
    });

    chipEl.addEventListener("pointermove", onCabaranSusunPointerMove);
    chipEl.addEventListener("pointerup", endCabaranSusunPointerDrag);
    chipEl.addEventListener("pointercancel", endCabaranSusunPointerDrag);
  }

  function renderCabaranSusunBoard(round) {
    cabaranSusunCurrentRound = round;
    cabaranSusunSlotEls = [];
    cabaranSusunChipEls = [];

    if (!cabaranSusunAnswerEl || !cabaranSusunDragEl) {
      return;
    }

    cabaranSusunAnswerEl.innerHTML = "";
    cabaranSusunDragEl.innerHTML = "";

    round.answerOrder.forEach(function (_, index) {
      const slot = document.createElement("div");
      slot.className = "latihan-susun-slot";
      slot.dataset.slotIndex = String(index);
      cabaranSusunAnswerEl.appendChild(slot);
      cabaranSusunSlotEls.push(slot);
    });

    round.dragPieces.forEach(function (piece, index) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "latihan-susun-chip";
      chip.textContent = piece;
      chip.dataset.pieceText = piece;
      chip.dataset.chipIndex = String(index);
      bindCabaranSusunChip(chip);
      cabaranSusunDragEl.appendChild(chip);
      cabaranSusunChipEls.push(chip);
    });
  }

  function submitCabaranSusunAnswer() {
    if (cabaranQuestionLocked || cabaranBusy || !cabaranSusunCurrentRound) {
      return;
    }

    if (!isCabaranSusunAnswerComplete()) {
      return;
    }

    clearCabaranCountdownTimer();
    cabaranQuestionLocked = true;
    const isCorrect = isCabaranSusunPlacedAnswerCorrect();
    const targetText = getCabaranTargetItem();

    if (isCorrect) {
      cabaranCorrectCount += 1;
      showCabaranFeedbackMessage(CABARAN_CORRECT_FEEDBACK);
    } else {
      showCabaranFeedbackMessage(CABARAN_WRONG_FEEDBACK);
    }

    rememberCabaranAnswer({
      targetText: targetText,
      answer: getCabaranSusunPlacedOrder().join(""),
      transcript: "",
      confidence: "",
      isCorrect: isCorrect,
    });
    scheduleCabaranAdvance();
  }

  function submitCabaranTypeAnswer() {
    if (cabaranQuestionLocked || cabaranBusy) {
      return;
    }

    const round = getCabaranCurrentRound();

    if (!round || !cabaranTypeInputEl) {
      return;
    }

    const typed = String(cabaranTypeInputEl.value || "").trim().toLowerCase();

    if (!typed) {
      return;
    }

    clearCabaranCountdownTimer();
    cabaranQuestionLocked = true;
    const expected = String(round.correctAnswer || "").trim().toLowerCase();
    const isCorrect = typed === expected;
    const targetText = getCabaranTargetItem();

    if (isCorrect) {
      cabaranCorrectCount += 1;
      showCabaranFeedbackMessage(CABARAN_CORRECT_FEEDBACK);
    } else {
      showCabaranFeedbackMessage(CABARAN_WRONG_FEEDBACK);
    }

    cabaranTypeInputEl.disabled = true;
    stopCabaranTypingInputAttention();
    stopCabaranTypingSubmitAttention();

    if (cabaranTypeSubmitBtn) {
      cabaranTypeSubmitBtn.disabled = true;
    }

    rememberCabaranAnswer({
      targetText: targetText,
      answer: typed,
      transcript: "",
      confidence: "",
      isCorrect: isCorrect,
    });
    scheduleCabaranAdvance();
  }

  function renderCabaranTypeRound() {
    const round = getCabaranCurrentRound();

    if (!round) {
      return;
    }

    cabaranQuestionLocked = false;
    resetCabaranTypingUiAnimations();

    if (cabaranQuestionEl) {
      cabaranQuestionEl.textContent = getCabaranQuestionInstruction();
    }

    renderCabaranBlankQuestion(round);

    if (cabaranTypeInputEl) {
      cabaranTypeInputEl.value = "";
      cabaranTypeInputEl.disabled = false;
      cabaranTypeInputEl.readOnly = false;
    }

    if (cabaranTypeSubmitBtn) {
      cabaranTypeSubmitBtn.disabled = false;
    }

    applyCabaranOverlayLayout();
    setCabaranModeUi("type");
    playCabaranTargetAudio();
    startCabaranCountdown();
    startCabaranTypingInputAttention();
    startCabaranTypingSubmitAttention();
    focusCabaranTypeInputIfSafe();
  }

  function renderCabaranChoiceRound() {
    const round = buildCabaranChoiceRound();
    cabaranChoiceCorrectIndex = round.correctIndex;
    cabaranQuestionLocked = false;

    if (cabaranQuestionEl) {
      cabaranQuestionEl.textContent = getCabaranQuestionInstruction();
    }

    if (isCabaranChoiceCheckpoint()) {
      if (round && round.showBlank) {
        renderCabaranBlankQuestion(round);
      } else if (cabaranBlankQuestionEl) {
        cabaranBlankQuestionEl.style.display = "none";
      }
    } else if (cabaranBlankQuestionEl) {
      cabaranBlankQuestionEl.style.display = "none";
    }

    cabaranAnswerBtns.forEach(function (btn, index) {
      btn.textContent = round.options[index] || "";
      btn.disabled = false;
      btn.style.opacity = "1";
    });

    setCabaranModeUi("choice");
    applyCabaranOverlayLayout();
    playCabaranTargetAudio();
    startCabaranCountdown();
  }

  function renderCabaranSebutRound() {
    const target = getCabaranTargetItem();
    cabaranQuestionLocked = false;

    if (cabaranQuestionEl) {
      cabaranQuestionEl.textContent = getCabaranQuestionInstruction();
    }

    if (cabaranTargetEl) {
      cabaranTargetEl.textContent = target;
    }

    setCabaranModeUi("sebut");
    applyCabaranOverlayLayout();
    clearCabaranCountdownTimer();
    hideCabaranTimer();
    playCabaranTargetAudio(function () {
      void runCabaranSebutAuto();
    });
  }

  function renderCabaranSusunRound() {
    const round = buildCabaranSusunRound();
    cabaranQuestionLocked = false;

    if (cabaranQuestionEl) {
      cabaranQuestionEl.textContent = getCabaranQuestionInstruction();
    }

    renderCabaranSusunBoard(round);
    setCabaranModeUi("susun");
    applyCabaranOverlayLayout();
    playCabaranTargetAudio();
    startCabaranCountdown();
  }

  function renderCabaranRound() {
    if (!cabaranZoneEl) {
      return;
    }

    hideCabaranSummaryOverlay();
    updateCabaranProgress();
    clearCabaranCountdownTimer();
    clearCabaranFeedback();
    cabaranSusunPointerDrag = null;

    const mode = getCabaranQuestionMode();

    if (mode === "choice") {
      renderCabaranChoiceRound();
      return;
    }

    if (mode === "sebut") {
      renderCabaranSebutRound();
      return;
    }

    if (mode === "type") {
      renderCabaranTypeRound();
      return;
    }

    renderCabaranSusunRound();
  }

  function replayCabaranCurrentQuestion() {
    if (cabaranBusy || cabaranQuestionNum > CABARAN_TOTAL_QUESTIONS) {
      return;
    }

    clearCabaranAdvanceTimer();
    stopCabaranRecognition();
    clearCabaranFeedback();

    const mode = getCabaranQuestionMode();

    if (mode === "choice") {
      cabaranQuestionLocked = false;
      playCabaranTargetAudio();
      return;
    }

    if (mode === "sebut") {
      cabaranQuestionLocked = false;
      cabaranBusy = false;
      playCabaranTargetAudio(function () {
        void runCabaranSebutAuto();
      });
      return;
    }

    playCabaranTargetAudio();
  }

  function handleCabaranChoiceAnswer(index) {
    if (
      cabaranQuestionLocked ||
      cabaranBusy ||
      !cabaranAnswerBtns.length ||
      index < 0 ||
      index >= cabaranAnswerBtns.length
    ) {
      return;
    }

    clearCabaranCountdownTimer();
    cabaranQuestionLocked = true;
    const isCorrect = index === cabaranChoiceCorrectIndex;
    const targetText = getCabaranTargetItem();
    const answer = cabaranAnswerBtns[index]
      ? cabaranAnswerBtns[index].textContent
      : "";

    if (isCorrect) {
      cabaranCorrectCount += 1;
      showCabaranFeedbackMessage(CABARAN_CORRECT_FEEDBACK);
    } else {
      showCabaranFeedbackMessage(CABARAN_WRONG_FEEDBACK);
    }

    cabaranAnswerBtns.forEach(function (btn, btnIndex) {
      btn.disabled = true;

      if (btnIndex === cabaranChoiceCorrectIndex) {
        btn.style.opacity = "1";
      } else if (btnIndex === index && !isCorrect) {
        btn.style.opacity = "0.55";
      }
    });

    rememberCabaranAnswer({
      targetText: targetText,
      answer: answer,
      transcript: "",
      confidence: "",
      isCorrect: isCorrect,
    });
    scheduleCabaranAdvance();
  }

  async function runCabaranSebutAuto() {
    if (cabaranQuestionLocked || cabaranBusy || getCabaranQuestionMode() !== "sebut") {
      return;
    }

    const session = getCabaranStudentSession();

    if (!session) {
      window.alert("Sila log masuk: Pilih Kelas dan Nama Anda.");
      return;
    }

    const targetText = getCabaranTargetItem();

    if (!targetText) {
      return;
    }

    cabaranBusy = true;
    cabaranQuestionLocked = true;

    const result = await runCabaranWordSpeechCheck(targetText);

    if (activeScreen !== "cabaran") {
      cabaranBusy = false;
      return;
    }

    if (!result.ok) {
      showCabaranFeedbackMessage("Google tidak dapat mendengar dengan jelas.");
      rememberCabaranAnswer({
        targetText: targetText,
        answer: "",
        transcript: "",
        confidence: "",
        isCorrect: false,
      });
      cabaranBusy = false;
      scheduleCabaranAdvance();
      return;
    }

    const heard = String(result.transcript || "").trim();
    const isCorrect = !!result.isCorrect;

    if (isCorrect) {
      cabaranCorrectCount += 1;
      showCabaranFeedbackMessage(
        CABARAN_CORRECT_FEEDBACK + "\nGoogle dengar: " + (heard || "(kosong)")
      );
    } else if (!heard) {
      showCabaranFeedbackMessage("Google tidak dapat mendengar dengan jelas.");
    } else {
      showCabaranFeedbackMessage(
        CABARAN_WRONG_FEEDBACK + "\nGoogle dengar: " + heard
      );
    }

    rememberCabaranAnswer({
      targetText: targetText,
      answer: heard,
      transcript: heard,
      confidence: result.confidence,
      isCorrect: isCorrect,
    });
    cabaranBusy = false;
    scheduleCabaranAdvance();
  }

  function setupCabaranScreen(section) {
    createCabaranButtonHotspots(section);

    cabaranProgressEl = document.createElement("p");
    cabaranProgressEl.id = "cabaran-progress";
    cabaranProgressEl.setAttribute("aria-live", "polite");
    cabaranProgressEl.style.cssText =
      "position:absolute;margin:0;padding:0.2em 0;text-align:center;font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(0.9rem,3.2vmin,1.1rem);font-weight:700;color:#2a1f14;" +
      "background:rgba(255,252,240,0.72);border-radius:12px;" +
      "box-shadow:0 0 10px rgba(255,220,120,0.75);pointer-events:none;z-index:9;" +
      "box-sizing:border-box;display:flex;align-items:center;justify-content:center;";

    cabaranTimerEl = document.createElement("p");
    cabaranTimerEl.id = "cabaran-timer";
    cabaranTimerEl.setAttribute("aria-live", "off");
    cabaranTimerEl.setAttribute("aria-hidden", "true");
    cabaranTimerEl.style.cssText =
      "position:absolute;margin:0;display:none;align-items:center;justify-content:center;" +
      "text-align:center;font-family:" +
      BELAJAR_FONT +
      ";font-weight:800;color:#2a1f14;line-height:1;" +
      "background:transparent;pointer-events:none;z-index:11;box-sizing:border-box;";

    cabaranQuestionEl = document.createElement("p");
    cabaranQuestionEl.id = "cabaran-question";
    cabaranQuestionEl.setAttribute("aria-live", "polite");
    cabaranQuestionEl.style.cssText =
      "position:absolute;margin:0;text-align:center;font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(0.95rem,3.5vmin,1.15rem);font-weight:700;color:#2a1f14;" +
      "background:transparent;box-sizing:border-box;pointer-events:none;z-index:9;" +
      "display:flex;align-items:center;justify-content:center;";

    cabaranAudioVisualEl = document.createElement("div");
    cabaranAudioVisualEl.id = "cabaran-audio-visual";
    cabaranAudioVisualEl.setAttribute("aria-hidden", "true");
    cabaranAudioVisualEl.style.cssText =
      "position:absolute;display:none;align-items:center;justify-content:center;" +
      "font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(1.6rem,6vmin,2.4rem);font-weight:700;color:#2a1f14;" +
      "background:transparent;pointer-events:none;z-index:9;box-sizing:border-box;";
    cabaranAudioVisualEl.textContent = "🔊";

    cabaranBlankQuestionEl = document.createElement("div");
    cabaranBlankQuestionEl.id = "cabaran-blank-question";
    cabaranBlankQuestionEl.setAttribute("aria-live", "polite");
    cabaranBlankQuestionEl.style.cssText =
      "position:absolute;display:none;align-items:center;justify-content:center;" +
      "gap:0.35em;flex-wrap:wrap;font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(2rem,8vmin,3.4rem);font-weight:700;color:#2a1f14;" +
      "background:transparent;pointer-events:none;z-index:9;box-sizing:border-box;";

    cabaranBlankPrefixEl = document.createElement("span");
    cabaranBlankPrefixEl.className = "cabaran-blank-prefix";

    cabaranBlankSlotEl = document.createElement("span");
    cabaranBlankSlotEl.className = "cabaran-blank-slot";
    cabaranBlankSlotEl.setAttribute("aria-hidden", "true");
    cabaranBlankSlotEl.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "min-width:1.2em;min-height:1.2em;padding:0.1em 0.3em;" +
      "border:3px dashed #5c4a32;border-radius:12px;" +
      "background:rgba(255,255,255,0.55);box-shadow:inset 0 0 6px rgba(255,220,120,0.25);";

    cabaranBlankSuffixEl = document.createElement("span");
    cabaranBlankSuffixEl.className = "cabaran-blank-suffix";

    cabaranTypeInputWrapEl = document.createElement("div");
    cabaranTypeInputWrapEl.id = "cabaran-type-input-wrap";

    cabaranTypeLabelEl = document.createElement("p");
    cabaranTypeLabelEl.id = "cabaran-type-label";
    cabaranTypeLabelEl.textContent = "\u270F\uFE0F Taip jawapan kamu";

    cabaranTypeInputEl = document.createElement("input");
    cabaranTypeInputEl.type = "text";
    cabaranTypeInputEl.id = "cabaran-type-input";
    cabaranTypeInputEl.setAttribute("aria-label", "Taip jawapan");
    cabaranTypeInputEl.placeholder = "Taip jawapan di sini";
    cabaranTypeInputEl.autocomplete = "off";
    cabaranTypeInputEl.autocapitalize = "off";
    cabaranTypeInputEl.spellcheck = false;
    cabaranTypeInputEl.addEventListener("pointerdown", function (event) {
      if (DEBUG_CABARAN_LAYOUT) {
        return;
      }

      event.stopPropagation();
    });
    cabaranTypeInputEl.addEventListener("touchstart", function () {
      cabaranTypeInputEl.focus();
    }, { passive: true });
    cabaranTypeInputEl.addEventListener("input", function () {
      stopCabaranTypingInputAttention();
    });
    cabaranTypeInputEl.addEventListener("animationend", function (event) {
      if (event.animationName === "cabaran-type-input-attention") {
        stopCabaranTypingInputAttention();
      }
    });
    cabaranTypeInputEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitCabaranTypeAnswer();
      }
    });
    cabaranTypeInputWrapEl.addEventListener("click", function (event) {
      if (DEBUG_CABARAN_LAYOUT || !cabaranTypeInputEl) {
        return;
      }

      if (event.target !== cabaranTypeInputEl) {
        cabaranTypeInputEl.focus();
      }
    });

    cabaranTypeSubmitBtn = document.createElement("button");
    cabaranTypeSubmitBtn.type = "button";
    cabaranTypeSubmitBtn.id = "cabaran-type-submit";
    cabaranTypeSubmitBtn.setAttribute("aria-label", "Semak");
    cabaranTypeSubmitBtn.textContent = "\u27A1\uFE0F";
    cabaranTypeSubmitBtn.style.position = "absolute";
    cabaranTypeSubmitBtn.style.boxSizing = "border-box";
    cabaranTypeSubmitBtn.addEventListener("pointerdown", function (event) {
      if (DEBUG_CABARAN_LAYOUT) {
        return;
      }

      event.stopPropagation();
    });
    cabaranTypeSubmitBtn.addEventListener("click", function (event) {
      if (DEBUG_CABARAN_LAYOUT) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      submitCabaranTypeAnswer();
    });

    cabaranBlankQuestionEl.appendChild(cabaranBlankPrefixEl);
    cabaranBlankQuestionEl.appendChild(cabaranBlankSlotEl);
    cabaranBlankQuestionEl.appendChild(cabaranBlankSuffixEl);
    cabaranTypeInputWrapEl.appendChild(cabaranTypeLabelEl);
    cabaranTypeInputWrapEl.appendChild(cabaranTypeInputEl);

    cabaranTargetEl = document.createElement("p");
    cabaranTargetEl.id = "cabaran-target";
    cabaranTargetEl.setAttribute("aria-live", "polite");
    cabaranTargetEl.style.cssText =
      "position:absolute;margin:0;text-align:center;font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(2rem,8vmin,3.4rem);font-weight:700;color:#2a1f14;line-height:1;" +
      "background:transparent;box-sizing:border-box;pointer-events:none;z-index:9;" +
      "display:none;align-items:center;justify-content:center;";

    cabaranSusunAnswerEl = document.createElement("div");
    cabaranSusunAnswerEl.id = "cabaran-susun-answer";
    cabaranSusunAnswerEl.style.cssText =
      "position:absolute;display:none;justify-content:center;gap:0.45em;flex-wrap:wrap;" +
      "box-sizing:border-box;pointer-events:auto;z-index:9;";

    cabaranSusunDragEl = document.createElement("div");
    cabaranSusunDragEl.id = "cabaran-susun-drag";
    cabaranSusunDragEl.style.cssText =
      "position:absolute;display:none;justify-content:center;gap:0.45em;flex-wrap:wrap;" +
      "box-sizing:border-box;pointer-events:auto;z-index:9;";

    cabaranAnswersEl = document.createElement("div");
    cabaranAnswersEl.id = "cabaran-answers";
    cabaranAnswersEl.style.cssText = "display:contents;";

    const cabaranAnswerIds = ["cabaran-answer-a", "cabaran-answer-b", "cabaran-answer-c"];

    cabaranAnswerBtns = [0, 1, 2].map(function (index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = cabaranAnswerIds[index];
      btn.className = "cabaran-choice-answer";
      btn.dataset.cabaranAnswerIndex = String(index);
      btn.style.cssText =
        "position:absolute;margin:0;padding:0.35em 0.5em;" +
        "border:2px solid #5c4a32;border-radius:16px;" +
        "background:linear-gradient(180deg,rgba(255,248,232,0.95) 0%,rgba(255,231,184,0.95) 100%);" +
        "color:#2a1f14;cursor:pointer;font-family:" +
        BELAJAR_FONT +
        ";font-size:clamp(1.1rem,5vmin,2rem);font-weight:700;touch-action:manipulation;" +
        "z-index:20;box-sizing:border-box;display:flex;align-items:center;" +
        "justify-content:center;box-shadow:0 3px 8px rgba(92,74,50,0.12);";

      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        handleCabaranChoiceAnswer(index);
      });

      cabaranAnswersEl.appendChild(btn);
      return btn;
    });

    const zone = document.createElement("div");
    zone.id = "cabaran-zone";
    zone.style.cssText = "display:contents;";
    zone.appendChild(cabaranAnswersEl);
    section.appendChild(cabaranProgressEl);
    section.appendChild(cabaranTimerEl);
    section.appendChild(cabaranQuestionEl);
    section.appendChild(cabaranAudioVisualEl);
    section.appendChild(cabaranBlankQuestionEl);
    section.appendChild(cabaranTypeInputWrapEl);
    section.appendChild(cabaranTypeSubmitBtn);
    section.appendChild(cabaranTargetEl);
    section.appendChild(cabaranSusunAnswerEl);
    section.appendChild(cabaranSusunDragEl);
    section.appendChild(zone);
    cabaranZoneEl = zone;

    cabaranSummaryOverlayEl = document.createElement("div");
    cabaranSummaryOverlayEl.id = "cabaran-summary-overlay";
    cabaranSummaryOverlayEl.setAttribute("aria-hidden", "true");
    cabaranSummaryOverlayEl.style.cssText =
      "position:absolute;inset:0;z-index:120;display:none;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:1rem;padding:1.25em;" +
      "background:rgba(255,252,245,0.94);pointer-events:auto;";

    const summaryTitle = document.createElement("p");
    summaryTitle.id = "cabaran-summary-title";
    summaryTitle.style.cssText =
      "margin:0;font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(1.1rem,4.5vmin,1.6rem);font-weight:700;color:#2a1f14;text-align:center;";

    const summaryBody = document.createElement("p");
    summaryBody.id = "cabaran-summary-body";
    summaryBody.style.cssText =
      "margin:0;font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(0.95rem,3.8vmin,1.2rem);font-weight:700;color:#2a1f14;" +
      "text-align:center;white-space:pre-line;line-height:1.4;";

    const summaryActions = document.createElement("div");
    summaryActions.style.cssText =
      "display:flex;flex-wrap:wrap;justify-content:center;gap:0.75em;width:100%;max-width:22em;";

    function makeSummaryBtn(label, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText =
        "flex:1 1 9em;margin:0;padding:0.65em 1em;border:2px solid #5c4a32;" +
        "border-radius:14px;background:linear-gradient(180deg,#fff8e8 0%,#ffe7b8 100%);" +
        "color:#2a1f14;cursor:pointer;font-family:" +
        BELAJAR_FONT +
        ";font-size:clamp(0.95rem,3.6vmin,1.1rem);font-weight:700;" +
        "touch-action:manipulation;";
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      });
      return btn;
    }

    summaryActions.appendChild(
      makeSummaryBtn("Cuba Lagi", function () {
        hideCabaranSummaryOverlay();
        startCabaran();
      })
    );
    summaryActions.appendChild(
      makeSummaryBtn("Submenu", function () {
        returnToCurrentCheckpointSubmenu();
      })
    );

    cabaranSummaryOverlayEl.appendChild(summaryTitle);
    cabaranSummaryOverlayEl.appendChild(summaryBody);
    cabaranSummaryOverlayEl.appendChild(summaryActions);
    section.appendChild(cabaranSummaryOverlayEl);

    if (cabaranFeedback) {
      cabaranFeedback.style.whiteSpace = "pre-line";
      cabaranFeedback.style.textAlign = "center";
    }

    applyCabaranOverlayLayout();
    applyCabaranDebugMode();
  }

  function returnToCurrentCheckpointSubmenu() {
    clearCabaranAdvanceTimer();
    clearCabaranCountdownTimer();
    hideCabaranTimer();
    stopCabaranRecognition();
    clearCabaranFeedback();
    hideCabaranSummaryOverlay();
    cabaranQuestionLocked = false;
    cabaranBusy = false;
    stopBelajarAudio();
    showScreen("island1");
  }

  function exitCabaranToHome() {
    clearCabaranAdvanceTimer();
    clearCabaranCountdownTimer();
    hideCabaranTimer();
    stopCabaranRecognition();
    stopPronunciationCapture();
    clearPronunciationFeedbackTimer();
    clearCabaranFeedback();
    hideCabaranSummaryOverlay();
    cabaranQuestionLocked = false;
    cabaranBusy = false;
    cabaranQuestionNum = 1;
    pronunciationRecordingBusy = false;
    resetCabaranSessionMemory();
    stopBelajarAudio();

    const engine = getAssessmentEngine();

    if (engine && engine.setStudentSession) {
      engine.setStudentSession({
        classId: "",
        studentId: "",
        studentName: "",
      });
    }

    showScreen("home");
  }

  function replayCabaranQuestionAudioOnly() {
    if (cabaranBusy || cabaranQuestionNum > CABARAN_TOTAL_QUESTIONS) {
      return;
    }

    stopCabaranRecognition();
    playCabaranTargetAudio();
  }

  function prepareCabaranScreen() {
    const session = getCabaranStudentSession();

    if (!session) {
      window.alert("Sila log masuk: Pilih Kelas dan Nama Anda.");
      showScreen("login");
      return;
    }

    void initCabaranDatabase();
    hideCabaranSummaryOverlay();
    clearCabaranAdvanceTimer();
    stopCabaranRecognition();
    clearCabaranFeedback();

    void canAccessCabaran().then(function (allowed) {
      if (!allowed) {
        window.alert("Selesaikan Belajar dan Latihan dahulu sebelum Cabaran.");
        returnToCurrentCheckpointSubmenu();
        return;
      }

      renderCabaranRound();
    });
  }

  function startCabaran() {
    hideLatihanCompletionOverlay();
    hideLatihanSusunCompletionOverlay();
    hidePronunciationFeedback(latihanFeedback);
    hidePronunciationFeedback(latihanSusunFeedbackEl);

    void canAccessCabaran().then(function (allowed) {
      if (!allowed) {
        window.alert("Selesaikan Belajar dan Latihan dahulu sebelum Cabaran.");
        return;
      }

      cabaranQuestionNum = 1;
      cabaranQuestionLocked = false;
      cabaranBusy = false;
      resetCabaranSessionMemory();
      ensureCabaranQuestionPlan(true);
      showScreen("cabaran");
    });
  }

  function continueFromLatihanChoiceCompletion() {
    hideLatihanCompletionOverlay();
    showScreen("latihan_susun");
  }

  function handleLatihanChoiceCompletionSecondary() {
    if (isLatihanSusunCheckpointEligible()) {
      continueFromLatihanChoiceCompletion();
      return;
    }

    startCabaran();
  }

  function showScreen(name) {
    if (!SCREENS[name]) {
      return;
    }

    const previousScreen = activeScreen;

    if (name === "latihan_susun" && !canEnterLatihanSusunScreen(previousScreen)) {
      return;
    }

    clearTransitionTimer();

    document.querySelectorAll(".screen").forEach(function (el) {
      const isActive = el.dataset.screen === name;
      el.classList.toggle("is-active", isActive);
      el.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    activeScreen = name;

    if (name === "tulis") {
      tulisPreviousScreen = previousScreen || "belajar";
      prepareTulisScreen();
    }

    if (name === "latihan") {
      if (previousScreen === "belajar") {
        void markCabaranLearningStep("belajar");
      }

      if (previousScreen !== "latihan") {
        latihanChoiceQuestionNum = 1;
        ensureLatihanChoiceQuestionPlan(true);
      }

      prepareLatihanChoiceScreen();
    }

    if (name === "latihan_susun") {
      if (previousScreen !== "latihan_susun") {
        latihanSusunQuestionNum = 1;
        latihanSusunQuestionsCompleted = 0;
        ensureLatihanSusunQuestionPlan(true);
      }

      prepareLatihanSusunScreen();
    }

    if (name === "cabaran") {
      if (previousScreen !== "cabaran") {
        cabaranQuestionNum = 1;
        resetCabaranSessionMemory();
        ensureCabaranQuestionPlan(true);
      }

      prepareCabaranScreen();
    }

    if (name !== "tulis") {
      stopTulisDemoAnimation();
      stopTulisAutoReplay();
      stopTulisDrawing();
    }

    if (name !== "latihan") {
      clearLatihanChoiceResetTimer();
      clearLatihanFeedbackHideTimer();
      latihanQuestionStartToken += 1;
      hideLatihanCompletionOverlay();
      hideLatihanPersistentHint();
      hideLatihanReinforcement();
    }

    if (name !== "latihan_susun") {
      clearLatihanSusunFeedbackHideTimer();
      latihanSusunQuestionStartToken += 1;
      hideLatihanSusunCompletionOverlay();
      hideLatihanSusunReinforcement();
      latihanSusunPointerDrag = null;
    }

    if (name !== "belajar") {
      stopBelajarAudio();
      hideBelajarFeedback();
      hideBelajarSebutOverlay();
      hideBelajarWordAiFallbackOverlay();
      belajarWordGoogleApiFailStreak = 0;
      pronunciationRecordingBusy = false;
    }

    if (name !== "cabaran") {
      clearCabaranAdvanceTimer();
      stopCabaranRecognition();
      hideCabaranSummaryOverlay();
      cabaranBusy = false;
    }

    if (
      name !== "belajar" &&
      name !== "latihan" &&
      name !== "latihan_susun" &&
      name !== "cabaran"
    ) {
      stopPronunciationCapture();
    }

    if (name === "belajar" && previousScreen !== "belajar") {
      resetBelajarSession();
    }

    if (name === "belajar") {
      void refreshStudentSyncBadge();
    }

    if (name === "login") {
      refreshLoginDropdowns();
    }

    updateCabaranLayoutDebugPanelVisibility();
  }

  function getCurrentWritingTargetText() {
    const text = getCurrentBelajarAudioText();
    return String(text || "").trim();
  }

  function stopTulisDemoAnimation() {
    if (tulisAnimationTimer !== null) {
      window.clearTimeout(tulisAnimationTimer);
      tulisAnimationTimer = null;
    }
  }

  function stopTulisAutoReplay() {
    if (tulisAutoReplayTimer !== null) {
      window.clearInterval(tulisAutoReplayTimer);
      tulisAutoReplayTimer = null;
    }
  }

  function runTulisDemoAnimation() {
    const targetText = getCurrentWritingTargetText();
    let index = 0;

    if (!tulisDemoDisplay) {
      return;
    }

    stopTulisDemoAnimation();
    tulisDemoDisplay.textContent = "";

    function step() {
      if (activeScreen !== "tulis" || !tulisDemoDisplay) {
        stopTulisDemoAnimation();
        return;
      }

      tulisDemoDisplay.textContent = targetText.slice(0, index);
      index += 1;

      if (index <= targetText.length) {
        tulisAnimationTimer = window.setTimeout(step, 110);
      } else {
        tulisAnimationTimer = null;
      }
    }

    step();
  }

  function clearTulisCanvas() {
    if (!tulisCanvas || !tulisCtx) {
      return;
    }

    tulisCtx.clearRect(0, 0, tulisCanvas.width, tulisCanvas.height);
  }

  function resizeTulisCanvas() {
    if (!tulisCanvas || !tulisCtx) {
      return;
    }

    const rect = tulisCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    tulisCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
    tulisCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
    tulisCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    tulisCtx.lineCap = "round";
    tulisCtx.lineJoin = "round";
    tulisCtx.strokeStyle = "#2a1f14";
    tulisCtx.lineWidth = 4;
  }

  function getCanvasPointFromEvent(event) {
    if (!tulisCanvas) {
      return null;
    }

    const rect = tulisCanvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function isTulisPointerOverBottomHotspot(event) {
    const stage = document.getElementById("stage");
    if (!stage) {
      return false;
    }

    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    return TULIS_BOTTOM_HOTSPOT_RECTS.some(function (spot) {
      return (
        x >= spot.left &&
        x <= spot.left + spot.width &&
        y >= spot.top &&
        y <= spot.top + spot.height
      );
    });
  }

  function handleTulisPointerDown(event) {
    if (isTulisPointerOverBottomHotspot(event)) {
      return;
    }

    const point = getCanvasPointFromEvent(event);

    if (!point) {
      return;
    }

    tulisDrawing = true;
    tulisPointerId = event.pointerId;
    tulisLastPoint = point;
    tulisCanvas.setPointerCapture(event.pointerId);
  }

  function handleTulisPointerMove(event) {
    if (!tulisDrawing || event.pointerId !== tulisPointerId || !tulisCtx || !tulisLastPoint) {
      return;
    }

    const point = getCanvasPointFromEvent(event);

    if (!point) {
      return;
    }

    tulisCtx.beginPath();
    tulisCtx.moveTo(tulisLastPoint.x, tulisLastPoint.y);
    tulisCtx.lineTo(point.x, point.y);
    tulisCtx.stroke();
    tulisLastPoint = point;
  }

  function stopTulisDrawing(event) {
    if (tulisCanvas && tulisPointerId !== null) {
      try {
        tulisCanvas.releasePointerCapture(tulisPointerId);
      } catch (err) {
        /* ignore if capture was not set */
      }
    }

    tulisDrawing = false;
    tulisPointerId = null;
    tulisLastPoint = null;
  }

  function raiseTulisBottomHotspots() {
    const section = document.getElementById("screen-tulis");
    if (!section) {
      return;
    }

    ["tulis_kembali", "tulis_padam", "tulis_seterusnya"].forEach(function (id) {
      const btn = section.querySelector('[data-hotspot="' + id + '"]');
      if (btn) {
        btn.style.zIndex = "80";
        section.appendChild(btn);
      }
    });
  }

  function shuffleArray(items) {
    const list = items.slice();

    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }

    return list;
  }

  function getLatihanPracticePool() {
    if (selectedCheckpoint === "suku_kata_kv") {
      const seen = {};
      const items = [];

      SUKU_KATA_KV_LEVELS.forEach(function (level) {
        level.items.forEach(function (item) {
          const key = String(item || "").trim();

          if (key && !seen[key]) {
            seen[key] = true;
            items.push(item);
          }
        });
      });

      return items;
    }

    return getBelajarListItems().slice();
  }

  function pickLatihanPracticeItemAvoiding(pool, avoidItem) {
    const avoid = avoidItem != null ? String(avoidItem) : "";
    const candidates = pool.filter(function (item) {
      return String(item) !== avoid;
    });

    if (!candidates.length) {
      return pool[Math.floor(Math.random() * pool.length)];
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function hasPracticeSequenceAdjacentDuplicates(sequence) {
    for (let i = 1; i < sequence.length; i += 1) {
      if (String(sequence[i]) === String(sequence[i - 1])) {
        return true;
      }
    }

    return false;
  }

  function repairPracticeSequenceAdjacentDuplicates(sequence) {
    const list = sequence.slice();

    for (let i = 1; i < list.length; i += 1) {
      if (String(list[i]) === String(list[i - 1])) {
        let swapped = false;

        for (let j = i + 1; j < list.length; j += 1) {
          if (String(list[j]) !== String(list[i - 1])) {
            const temp = list[i];
            list[i] = list[j];
            list[j] = temp;
            swapped = true;
            break;
          }
        }

        if (!swapped && list.length > 1) {
          for (let j = 0; j < i - 1; j += 1) {
            if (
              String(list[j]) !== String(list[i]) &&
              (j === 0 || String(list[j - 1]) !== String(list[i]))
            ) {
              const temp = list[i];
              list[i] = list[j];
              list[j] = temp;
              break;
            }
          }
        }
      }
    }

    return list;
  }

  function buildPracticeSequence(items, totalQuestions) {
    const total = totalQuestions == null ? 10 : totalQuestions;
    const seen = {};
    const pool = [];

    items.forEach(function (item) {
      const key = String(item == null ? "" : item).trim();

      if (key && !seen[key]) {
        seen[key] = true;
        pool.push(item);
      }
    });

    if (!pool.length) {
      return [];
    }

    if (pool.length === 1) {
      const single = [];

      while (single.length < total) {
        single.push(pool[0]);
      }

      return single;
    }

    let sequence;

    if (pool.length >= total) {
      return shuffleArray(pool).slice(0, total);
    }

    sequence = shuffleArray(pool).slice();

    while (sequence.length < total) {
      sequence.push(
        pickLatihanPracticeItemAvoiding(pool, sequence[sequence.length - 1])
      );
    }

    const maxAttempts = 12;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const shuffled = shuffleArray(sequence);

      if (!hasPracticeSequenceAdjacentDuplicates(shuffled)) {
        return shuffled;
      }

      attempt += 1;
    }

    return repairPracticeSequenceAdjacentDuplicates(shuffleArray(sequence));
  }

  function ensureLatihanChoiceQuestionPlan(forceNew) {
    if (
      !forceNew &&
      latihanChoiceQuestionItems.length === LATIHAN_CHOICE_TOTAL
    ) {
      return;
    }

    const pool = getLatihanPracticePool();

    if (!pool.length) {
      latihanChoiceQuestionItems = [];
      return;
    }

    latihanChoiceQuestionItems = buildPracticeSequence(pool, LATIHAN_CHOICE_TOTAL);
  }

  function getLatihanChoiceTargetItem() {
    const index = latihanChoiceQuestionNum - 1;

    if (latihanChoiceQuestionItems[index] != null) {
      return latihanChoiceQuestionItems[index];
    }

    return getCurrentBelajarAudioText();
  }

  function getLatihanChoicePool() {
    return getLatihanPracticePool();
  }

  function getLatihanChoiceQuestionText(correctAnswer) {
    if (
      selectedCheckpoint === "perkataan_vkv" ||
      selectedCheckpoint === "perkataan_kvkv"
    ) {
      return "Pilih perkataan yang betul.";
    }

    if (
      selectedCheckpoint === "vokal" ||
      selectedCheckpoint === "konsonan" ||
      selectedCheckpoint === "suku_kata_kv"
    ) {
      return "Pilih jawapan yang betul.";
    }

    return "Pilih jawapan yang betul.";
  }

  function buildLatihanChoiceRound() {
    const correctAnswer = getLatihanChoiceTargetItem();
    const pool = getLatihanChoicePool().filter(function (item) {
      return item !== correctAnswer;
    });
    const distractors = shuffleArray(pool).slice(0, 2);
    const options = shuffleArray([correctAnswer].concat(distractors));

    return {
      question: getLatihanChoiceQuestionText(correctAnswer),
      options: options,
      correctIndex: options.indexOf(correctAnswer),
    };
  }

  function clearLatihanChoiceResetTimer() {
    if (latihanChoiceResetTimer !== null) {
      window.clearTimeout(latihanChoiceResetTimer);
      latihanChoiceResetTimer = null;
    }
  }

  function clearLatihanFeedbackHideTimer() {
    if (latihanFeedbackHideTimer !== null) {
      window.clearTimeout(latihanFeedbackHideTimer);
      latihanFeedbackHideTimer = null;
    }
  }

  function scheduleLatihanFeedbackAutoHide(delayMs) {
    if (isLatihanAdjustActive()) {
      return;
    }

    clearLatihanFeedbackHideTimer();
    latihanFeedbackHideTimer = window.setTimeout(function () {
      latihanFeedbackHideTimer = null;

      if (activeScreen === "latihan" && !latihanChoiceHintVisible) {
        hidePronunciationFeedback(latihanFeedback);

        if (isLatihanAdjustActive()) {
          syncLatihanEasyAdjustPreview();
        }
      }
    }, typeof delayMs === "number" ? delayMs : LATIHAN_FEEDBACK_HIDE_MS);
  }

  function showLatihanFeedbackMessage(message, options) {
    const opts = options || {};
    const autoHide = opts.autoHide !== false;

    if (autoHide) {
      latihanChoiceHintVisible = false;
    } else {
      latihanChoiceHintVisible = true;
      clearLatihanFeedbackHideTimer();
    }

    if (latihanFeedback) {
      latihanFeedback.style.whiteSpace =
        String(message).indexOf("\n") >= 0 ? "pre-line" : "normal";
    }

    showPronunciationFeedbackMessage(latihanFeedback, message);

    if (autoHide) {
      scheduleLatihanFeedbackAutoHide(opts.durationMs);
    }
  }

  function hideLatihanPersistentHint() {
    latihanChoiceHintVisible = false;

    if (activeScreen === "latihan") {
      hidePronunciationFeedback(latihanFeedback);

      if (isLatihanAdjustActive()) {
        syncLatihanEasyAdjustPreview();
      }
    }
  }

  function buildLatihanChoiceHint(target) {
    const word = String(target || "").trim().toLowerCase();

    if (!word) {
      return "Cuba lagi ya 😊";
    }

    if (selectedCheckpoint === "vokal" || selectedCheckpoint === "konsonan") {
      return "Petunjuk: huruf '" + word.charAt(0) + "'";
    }

    if (selectedCheckpoint === "suku_kata_kv") {
      return "Bunyi pertama: " + word.charAt(0);
    }

    if (word.length === 1) {
      return "Petunjuk: " + word;
    }

    const blanks = [];

    for (let i = 1; i < word.length; i += 1) {
      blanks.push("_");
    }

    return word.charAt(0) + " " + blanks.join(" ");
  }

  function buildLatihanSyllableBreakdown(word) {
    const text = String(word || "").trim().toLowerCase();

    if (!text) {
      return "";
    }

    if (selectedCheckpoint === "suku_kata_kv" || text.length <= 2) {
      return text;
    }

    if (selectedCheckpoint === "perkataan_vkv") {
      return text.charAt(0) + " - " + text.slice(1);
    }

    if (selectedCheckpoint === "perkataan_kvkv") {
      if (text.length === 4) {
        return text.slice(0, 2) + " - " + text.slice(2);
      }

      if (text.length === 3) {
        return text.charAt(0) + " - " + text.slice(1);
      }
    }

    if (text.length === 3) {
      return text.charAt(0) + " - " + text.slice(1);
    }

    if (text.length === 4) {
      return text.slice(0, 2) + " - " + text.slice(2);
    }

    return text;
  }

  function hideLatihanReinforcement() {
    if (!latihanReinforcementEl) {
      return;
    }

    latihanReinforcementEl.classList.remove("is-visible");

    if (isLatihanAdjustActive()) {
      syncLatihanEasyAdjustPreview();
      return;
    }

    latihanReinforcementEl.setAttribute("aria-hidden", "true");

    if (latihanReinforcementWordEl) {
      latihanReinforcementWordEl.textContent = "";
    }

    if (latihanReinforcementBreakdownEl) {
      latihanReinforcementBreakdownEl.textContent = "";
      latihanReinforcementBreakdownEl.style.display = "none";
    }

    latihanReinforcementEl.classList.remove("is-calibration-active");
  }

  function showLatihanReinforcement(target) {
    if (!latihanReinforcementEl || !latihanReinforcementWordEl) {
      return;
    }

    const word = String(target || "").trim().toLowerCase();
    const breakdown = buildLatihanSyllableBreakdown(word);

    latihanReinforcementWordEl.textContent = word;

    if (
      latihanReinforcementBreakdownEl &&
      breakdown &&
      breakdown !== word
    ) {
      latihanReinforcementBreakdownEl.textContent = breakdown;
      latihanReinforcementBreakdownEl.style.display = "block";
    } else if (latihanReinforcementBreakdownEl) {
      latihanReinforcementBreakdownEl.textContent = "";
      latihanReinforcementBreakdownEl.style.display = "none";
    }

    latihanReinforcementEl.classList.add("is-visible");
    latihanReinforcementEl.setAttribute("aria-hidden", "false");
  }

  function pulseLatihanSeterusnyaHotspot() {
    const section = document.getElementById("screen-latihan");

    if (!section) {
      return;
    }

    const btn = section.querySelector('[data-hotspot="latihan_seterusnya"]');

    if (!btn) {
      return;
    }

    btn.classList.remove("is-latihan-next-glow");
    void btn.offsetWidth;
    btn.classList.add("is-latihan-next-glow");

    window.setTimeout(function () {
      btn.classList.remove("is-latihan-next-glow");
    }, 2400);
  }

  function hideLatihanCompletionOverlay() {
    if (latihanCompletionOverlayEl) {
      latihanCompletionOverlayEl.style.display = "none";
      latihanCompletionOverlayEl.setAttribute("aria-hidden", "true");
    }
  }

  function showLatihanCompletionOverlay() {
    if (!latihanCompletionOverlayEl) {
      return;
    }

    hideLatihanPersistentHint();
    hideLatihanReinforcement();
    clearLatihanFeedbackHideTimer();
    hidePronunciationFeedback(latihanFeedback);

    const titleEl = document.getElementById("latihan-completion-title");

    if (titleEl) {
      titleEl.textContent = isLatihanSusunCheckpointEligible()
        ? "Hebat! Latihan Pilih selesai ⭐"
        : "Hebat! Latihan selesai ⭐";
    }

    if (latihanCompletionSecondaryBtn) {
      latihanCompletionSecondaryBtn.textContent = isLatihanSusunCheckpointEligible()
        ? "Teruskan"
        : "Mula Cabaran";
    }

    void markCabaranLearningStep("latihan_choice");
    latihanCompletionOverlayEl.style.display = "flex";
    latihanCompletionOverlayEl.setAttribute("aria-hidden", "false");
  }

  function restartLatihanChoice() {
    hideLatihanCompletionOverlay();
    latihanChoiceQuestionNum = 1;
    latihanChoiceWrongAttempts = 0;
    latihanChoiceAnsweredCorrectly = false;
    ensureLatihanChoiceQuestionPlan(true);
    prepareLatihanChoiceScreen();
  }

  function runLatihanQuestionStartPedagogy() {
    const token = (latihanQuestionStartToken += 1);

    latihanChoiceWrongAttempts = 0;
    latihanChoiceAnsweredCorrectly = false;
    hideLatihanPersistentHint();

    showLatihanFeedbackMessage(LATIHAN_GUIDANCE_LISTEN);

    window.setTimeout(function () {
      if (token !== latihanQuestionStartToken || activeScreen !== "latihan") {
        return;
      }

      playLatihanChoiceAudio({
        silentAutoplay: true,
        onFinish: function () {
          if (token !== latihanQuestionStartToken || activeScreen !== "latihan") {
            return;
          }

          showLatihanFeedbackMessage(LATIHAN_CHOICE_GUIDANCE);
        },
      });
    }, 350);
  }

  function resetLatihanChoiceAnswerStyles() {
    latihanChoiceAnswerEls.forEach(function (btn) {
      btn.classList.remove(
        "is-selected",
        "is-correct",
        "is-wrong",
        "is-shake",
        "is-tapped",
        "is-pop"
      );
      btn.disabled = false;
    });
  }

  function speakLatihanText(text) {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      return false;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ms-MY";
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function updateLatihanChoiceProgress() {
    if (!latihanChoiceProgressEl) {
      return;
    }

    const mission = Math.min(latihanChoiceQuestionNum, LATIHAN_CHOICE_TOTAL);
    latihanChoiceProgressEl.textContent =
      "Misi " + mission + " / " + LATIHAN_CHOICE_TOTAL;

    if (latihanChoiceProgressFillEl) {
      const percent = Math.max(
        0,
        Math.min(100, (mission / LATIHAN_CHOICE_TOTAL) * 100)
      );
      latihanChoiceProgressFillEl.style.width = percent + "%";
    }
  }

  function playLatihanChoiceAudio(options) {
    const opts = options || {};
    const silentAutoplay = opts.silentAutoplay === true;
    const onFinish = typeof opts.onFinish === "function" ? opts.onFinish : null;
    const currentItem = getLatihanChoiceTargetItem();

    function notifyFinish() {
      if (onFinish) {
        onFinish();
      }
    }

    if (!currentItem) {
      notifyFinish();
      return;
    }

    if (!isBelajarAudioCheckpoint()) {
      const spoke = speakLatihanText(currentItem);

      if (!spoke && !silentAutoplay) {
        showPronunciationFeedbackMessage(latihanFeedback, "Audio belum tersedia.");
      }

      if (spoke) {
        window.setTimeout(notifyFinish, 1200);
      } else {
        notifyFinish();
      }

      return;
    }

    stopBelajarAudio();

    if (!silentAutoplay && !latihanChoiceHintVisible) {
      hidePronunciationFeedback(latihanFeedback);
    }

    const audioPath = getBelajarAudioPath(currentItem);
    const generation = belajarAudioGeneration;
    const audio = new Audio(audioPath);

    belajarAudio = audio;

    function finishPlayback() {
      if (generation !== belajarAudioGeneration) {
        return;
      }

      belajarAudio = null;
    }

    function handleLatihanAudioMissing() {
      finishPlayback();

      if (speakLatihanText(currentItem)) {
        window.setTimeout(notifyFinish, 1200);
        return;
      }

      if (!silentAutoplay) {
        showPronunciationFeedbackMessage(latihanFeedback, "Audio belum tersedia.");
      }

      notifyFinish();
    }

    audio.addEventListener("ended", function () {
      finishPlayback();
      notifyFinish();
    });
    audio.addEventListener("error", handleLatihanAudioMissing);
    audio.play().catch(function () {
      finishPlayback();

      if (speakLatihanText(currentItem)) {
        window.setTimeout(notifyFinish, 1200);
        return;
      }

      if (!silentAutoplay) {
        showPronunciationFeedbackMessage(latihanFeedback, "Audio belum tersedia.");
      }

      notifyFinish();
    });
  }

  function raiseLatihanBottomHotspots() {
    const section = document.getElementById("screen-latihan");
    if (!section) {
      return;
    }

    ["latihan_kembali", "latihan_ulang", "latihan_seterusnya"].forEach(
      function (id) {
        const btn = section.querySelector('[data-hotspot="' + id + '"]');
        if (btn) {
          btn.style.zIndex = "100";
          btn.style.pointerEvents = "auto";
          section.appendChild(btn);
        }
      }
    );
  }

  function setupLatihanChoiceScreen(section) {
    const zone = document.createElement("div");
    zone.id = "latihan-choice-zone";

    latihanChoiceInfoEl = document.createElement("div");
    latihanChoiceInfoEl.id = "latihan-choice-info";

    const progressTrack = document.createElement("div");
    progressTrack.id = "latihan-choice-progress-track";
    latihanChoiceProgressFillEl = document.createElement("div");
    latihanChoiceProgressFillEl.id = "latihan-choice-progress-fill";
    progressTrack.appendChild(latihanChoiceProgressFillEl);

    latihanChoiceProgressEl = document.createElement("p");
    latihanChoiceProgressEl.id = "latihan-choice-progress";
    latihanChoiceProgressEl.setAttribute("aria-live", "polite");

    latihanChoiceInfoEl.appendChild(progressTrack);
    latihanChoiceInfoEl.appendChild(latihanChoiceProgressEl);
    zone.appendChild(latihanChoiceInfoEl);

    latihanReinforcementEl = document.createElement("div");
    latihanReinforcementEl.id = "latihan-choice-reinforcement";
    latihanReinforcementEl.setAttribute("aria-hidden", "true");

    latihanReinforcementWordEl = document.createElement("p");
    latihanReinforcementWordEl.id = "latihan-reinforcement-word";

    latihanReinforcementBreakdownEl = document.createElement("p");
    latihanReinforcementBreakdownEl.id = "latihan-reinforcement-breakdown";

    latihanReinforcementEl.appendChild(latihanReinforcementWordEl);
    latihanReinforcementEl.appendChild(latihanReinforcementBreakdownEl);
    zone.appendChild(latihanReinforcementEl);

    const contentWrap = document.createElement("div");
    contentWrap.id = "latihan-choice-content";

    latihanChoiceQuestionEl = document.createElement("p");
    latihanChoiceQuestionEl.id = "latihan-choice-question";
    latihanChoiceQuestionEl.setAttribute("aria-live", "polite");

    contentWrap.appendChild(latihanChoiceQuestionEl);
    zone.appendChild(contentWrap);

    const answersWrap = document.createElement("div");
    answersWrap.id = "latihan-choice-answers";

    latihanChoiceAnswerEls = LATIHAN_ANSWER_KEYS.map(function (key, index) {
      const layout = LATIHAN_LAYOUT[key];
      const answerId = LATIHAN_ANSWER_IDS[index];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "latihan-choice-answer latihan-choice-answer--" + answerId;
      applyLayoutRect(btn, layout);
      btn.setAttribute("aria-label", "Jawapan " + answerId.toUpperCase());
      btn.dataset.choiceIndex = String(index);

      btn.addEventListener("pointerdown", function () {
        btn.classList.add("is-tapped");
      });

      btn.addEventListener("pointerup", function () {
        btn.classList.remove("is-tapped");
      });

      btn.addEventListener("pointercancel", function () {
        btn.classList.remove("is-tapped");
      });

      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        btn.classList.remove("is-tapped");
        selectLatihanChoiceAnswer(index);
      });

      answersWrap.appendChild(btn);
      return btn;
    });

    zone.appendChild(answersWrap);
    section.appendChild(zone);

    latihanFeedback = createPronunciationFeedbackElement(section);
    latihanFeedback.id = "latihan-feedback";
    applyLatihanFeedbackLayout();

    latihanCompletionOverlayEl = document.createElement("div");
    latihanCompletionOverlayEl.id = "latihan-completion-overlay";
    latihanCompletionOverlayEl.setAttribute("aria-hidden", "true");

    const completionTitle = document.createElement("p");
    completionTitle.id = "latihan-completion-title";
    completionTitle.textContent = "Hebat! Latihan Pilih selesai ⭐";

    const completionActions = document.createElement("div");
    completionActions.id = "latihan-completion-actions";

    const ulangBtn = document.createElement("button");
    ulangBtn.type = "button";
    ulangBtn.className = "latihan-completion-btn";
    ulangBtn.textContent = "Ulang Latihan";
    ulangBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      restartLatihanChoice();
    });

    latihanCompletionSecondaryBtn = document.createElement("button");
    latihanCompletionSecondaryBtn.type = "button";
    latihanCompletionSecondaryBtn.id = "latihan-completion-secondary-btn";
    latihanCompletionSecondaryBtn.className = "latihan-completion-btn";
    latihanCompletionSecondaryBtn.textContent = "Teruskan";
    latihanCompletionSecondaryBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      handleLatihanChoiceCompletionSecondary();
    });

    completionActions.appendChild(ulangBtn);
    completionActions.appendChild(latihanCompletionSecondaryBtn);
    latihanCompletionOverlayEl.appendChild(completionTitle);
    latihanCompletionOverlayEl.appendChild(completionActions);
    section.appendChild(latihanCompletionOverlayEl);

    applyLatihanLayout();
    setLatihanDebugLabels();
  }

  function renderLatihanChoiceRound(round) {
    if (!latihanChoiceQuestionEl) {
      return;
    }

    clearLatihanChoiceResetTimer();
    clearLatihanFeedbackHideTimer();
    latihanChoiceQuestionEl.textContent = round.question;
    latihanChoiceCorrectIndex = round.correctIndex;

    latihanChoiceAnswerEls.forEach(function (btn, index) {
      btn.textContent = round.options[index] || "";
    });

    latihanChoiceSelectedIndex = -1;
    latihanChoiceWrongAttempts = 0;
    latihanChoiceAnsweredCorrectly = false;
    resetLatihanChoiceAnswerStyles();
    updateLatihanChoiceProgress();
    hideLatihanPersistentHint();
    hideLatihanReinforcement();
    applyLatihanLayout();
    setLatihanDebugLabels();
  }

  function prepareLatihanChoiceScreen() {
    applyLatihanEasyAdjustMode();
    applyLatihanLayout();
    setLatihanDebugLabels();
    raiseLatihanBottomHotspots();
    hideLatihanCompletionOverlay();
    renderLatihanChoiceRound(buildLatihanChoiceRound());
    syncLatihanEasyAdjustPreview();
    runLatihanQuestionStartPedagogy();
  }

  function selectLatihanChoiceAnswer(index) {
    if (isLatihanAdjustActive()) {
      return;
    }

    if (
      !latihanChoiceAnswerEls.length ||
      index < 0 ||
      index >= latihanChoiceAnswerEls.length ||
      latihanChoiceAnsweredCorrectly
    ) {
      return;
    }

    clearLatihanChoiceResetTimer();
    latihanChoiceSelectedIndex = index;
    const isCorrect = index === latihanChoiceCorrectIndex;
    const selectedBtn = latihanChoiceAnswerEls[index];
    const targetWord = getLatihanChoiceTargetItem();

    latihanChoiceAnswerEls.forEach(function (btn, btnIndex) {
      btn.classList.remove(
        "is-selected",
        "is-correct",
        "is-wrong",
        "is-shake",
        "is-tapped",
        "is-pop"
      );

      if (btnIndex === index) {
        btn.classList.add(isCorrect ? "is-correct" : "is-wrong");

        if (!isCorrect) {
          btn.classList.add("is-shake");
          void btn.offsetWidth;
        }
      }
    });

    if (isCorrect) {
      latihanChoiceAnsweredCorrectly = true;
      hideLatihanPersistentHint();

      if (selectedBtn) {
        selectedBtn.classList.add("is-pop");
      }

      latihanChoiceAnswerEls.forEach(function (btn) {
        btn.disabled = true;
      });

      showLatihanFeedbackMessage("Hebat! ⭐");

      latihanChoiceResetTimer = window.setTimeout(function () {
        latihanChoiceResetTimer = null;

        if (selectedBtn) {
          selectedBtn.classList.remove("is-pop");
        }

        if (activeScreen !== "latihan") {
          return;
        }

        hidePronunciationFeedback(latihanFeedback);
        showLatihanReinforcement(targetWord);
        pulseLatihanSeterusnyaHotspot();
      }, LATIHAN_FEEDBACK_HIDE_MS);

      return;
    }

    latihanChoiceWrongAttempts += 1;
    hideLatihanPersistentHint();

    if (latihanChoiceWrongAttempts === 1) {
      showLatihanFeedbackMessage("Cuba lagi 😊");
      playLatihanChoiceAudio({ silentAutoplay: true });
    } else {
      showLatihanFeedbackMessage(buildLatihanChoiceHint(targetWord), {
        autoHide: false,
      });
    }

    latihanChoiceResetTimer = window.setTimeout(function () {
      latihanChoiceResetTimer = null;
      resetLatihanChoiceAnswerStyles();
    }, LATIHAN_FEEDBACK_HIDE_MS);
  }

  function openNextLatihanChoiceQuestion() {
    hideLatihanPersistentHint();
    hideLatihanReinforcement();
    clearLatihanFeedbackHideTimer();

    if (latihanChoiceQuestionNum >= LATIHAN_CHOICE_TOTAL) {
      if (!latihanChoiceAnsweredCorrectly) {
        showLatihanFeedbackMessage(LATIHAN_CHOICE_GUIDANCE);
        return;
      }

      showLatihanCompletionOverlay();
      return;
    }

    latihanChoiceQuestionNum += 1;
    prepareLatihanChoiceScreen();
  }

  function setupTulisScreen(section) {
    const demoZone = document.createElement("div");
    demoZone.id = "tulis-demo-zone";
    tulisDemoDisplay = document.createElement("div");
    tulisDemoDisplay.id = "tulis-demo-text";
    demoZone.appendChild(tulisDemoDisplay);

    const canvasZone = document.createElement("div");
    canvasZone.id = "tulis-canvas-zone";
    tulisCanvas = document.createElement("canvas");
    tulisCanvas.id = "tulis-writing-canvas";
    tulisCanvas.style.touchAction = "none";
    canvasZone.appendChild(tulisCanvas);
    section.appendChild(demoZone);
    section.appendChild(canvasZone);

    tulisCtx = tulisCanvas.getContext("2d");
    resizeTulisCanvas();
    window.addEventListener("resize", function () {
      resizeTulisCanvas();
    });

    tulisCanvas.addEventListener("pointerdown", handleTulisPointerDown);
    tulisCanvas.addEventListener("pointermove", handleTulisPointerMove);
    tulisCanvas.addEventListener("pointerup", stopTulisDrawing);
    tulisCanvas.addEventListener("pointercancel", stopTulisDrawing);
    tulisCanvas.addEventListener("pointerleave", stopTulisDrawing);
  }

  function prepareTulisScreen() {
    applyTulisDebugMode();
    raiseTulisBottomHotspots();
    resizeTulisCanvas();
    clearTulisCanvas();
    runTulisDemoAnimation();
    stopTulisAutoReplay();
    tulisAutoReplayTimer = window.setInterval(function () {
      if (activeScreen !== "tulis") {
        stopTulisAutoReplay();
        return;
      }

      runTulisDemoAnimation();
    }, 5000);
  }

  function openNextWritingTarget() {
    belajarNext();
    prepareTulisScreen();
  }

  function setupLoginScreen(section) {
    const loginZone = document.createElement("div");
    loginZone.id = "kmj-login-zone";

    const classField = document.createElement("div");
    classField.className = "kmj-login-field kmj-login-field--class";

    loginClassSelect = document.createElement("select");
    loginClassSelect.id = "kmj-login-class";
    loginClassSelect.className = "kmj-login-select";
    loginClassSelect.setAttribute("aria-label", "Pilih Kelas");

    const classDefault = document.createElement("option");
    classDefault.value = "";
    classDefault.textContent = "Pilih Kelas";
    loginClassSelect.appendChild(classDefault);

    const nameField = document.createElement("div");
    nameField.className = "kmj-login-field kmj-login-field--name";

    loginNameSelect = document.createElement("select");
    loginNameSelect.id = "kmj-login-name";
    loginNameSelect.className = "kmj-login-select";
    loginNameSelect.setAttribute("aria-label", "Pilih Nama Murid");
    loginNameSelect.disabled = true;

    const nameDefault = document.createElement("option");
    nameDefault.value = "";
    nameDefault.textContent = "Pilih Nama Murid";
    loginNameSelect.appendChild(nameDefault);

    loginClassSelect.addEventListener("change", function () {
      populateLoginNameDropdown(loginClassSelect.value);
    });

    classField.appendChild(loginClassSelect);
    nameField.appendChild(loginNameSelect);
    loginZone.appendChild(classField);
    loginZone.appendChild(nameField);

    loginRosterStatusEl = document.createElement("p");
    loginRosterStatusEl.id = "kmj-login-roster-status";
    loginRosterStatusEl.setAttribute("role", "alert");
    loginRosterStatusEl.style.cssText =
      "display:none;margin:0;padding:0.35em 0.5em 0;" +
      "font-family:Comic Neue,Comic Sans MS,Arial,sans-serif;" +
      "font-size:clamp(0.8rem,2.8vmin,1rem);font-weight:700;" +
      "color:#8b1a1a;text-align:center;line-height:1.25;";
    loginZone.appendChild(loginRosterStatusEl);

    section.appendChild(loginZone);
  }

  function showLoginRosterError(message) {
    if (!loginRosterStatusEl) {
      return;
    }

    if (message) {
      loginRosterStatusEl.textContent = message;
      loginRosterStatusEl.style.display = "block";
      return;
    }

    loginRosterStatusEl.textContent = "";
    loginRosterStatusEl.style.display = "none";
  }

  function getStudentHomeSchoolFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const school = String(params.get("school") || "").trim();

      return school ? school.toUpperCase() : "";
    } catch (urlError) {
      return "";
    }
  }

  function isStudentHomeAccessMode() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    return Boolean(
      engine &&
        engine.isStudentHomeAccessMode &&
        engine.isStudentHomeAccessMode()
    );
  }

  async function initStudentHomeAccessMode() {
    const schoolCode = getStudentHomeSchoolFromUrl();
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!schoolCode || !engine || !engine.enableStudentHomeSchoolCode) {
      return;
    }

    engine.enableStudentHomeSchoolCode(schoolCode);

    try {
      await engine.initDatabase();
      await engine.loadRosterForStudentHome();
      showLoginRosterError("");
    } catch (error) {
      console.error("[KMJ] Student home roster error", error);
      showLoginRosterError(STUDENT_HOME_ROSTER_ERROR_MSG);
    }
  }

  async function refreshLoginDropdowns() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!loginClassSelect || !loginNameSelect || !engine) {
      return;
    }

    let classes = [];

    try {
      await engine.initDatabase();

      if (isStudentHomeAccessMode()) {
        try {
          await engine.loadRosterForStudentHome();
          showLoginRosterError("");
        } catch (homeError) {
          console.error("[KMJ] Student home roster refresh error", homeError);
          showLoginRosterError(STUDENT_HOME_ROSTER_ERROR_MSG);
          return;
        }
      }

      classes = await engine.getRosterClasses();
    } catch (error) {
      console.error("[KMJ] Login roster error", error);

      if (isStudentHomeAccessMode()) {
        showLoginRosterError(STUDENT_HOME_ROSTER_ERROR_MSG);
      }

      return;
    }

    if (isStudentHomeAccessMode() && !classes.length) {
      showLoginRosterError(STUDENT_HOME_ROSTER_ERROR_MSG);
    } else if (!isStudentHomeAccessMode()) {
      showLoginRosterError("");
    }

    loginClassSelect.innerHTML = "";
    const classDefault = document.createElement("option");
    classDefault.value = "";
    classDefault.textContent = "Pilih Kelas";
    loginClassSelect.appendChild(classDefault);

    classes.forEach(function (classId) {
      const option = document.createElement("option");
      option.value = classId;
      option.textContent = classId;
      loginClassSelect.appendChild(option);
    });

    const savedClass = sessionStorage.getItem("kmj_class_id") || "";

    if (savedClass && classes.indexOf(savedClass) !== -1) {
      loginClassSelect.value = savedClass;
      await populateLoginNameDropdown(savedClass);
      const savedId = sessionStorage.getItem("kmj_student_id") || "";

      if (savedId) {
        loginNameSelect.value = savedId;
      }
    } else {
      loginNameSelect.disabled = true;
      loginNameSelect.innerHTML = "";
      const nameDefault = document.createElement("option");
      nameDefault.value = "";
      nameDefault.textContent = "Pilih Nama Murid";
      loginNameSelect.appendChild(nameDefault);
    }
  }

  async function populateLoginNameDropdown(classId) {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!loginNameSelect || !engine) {
      return;
    }

    loginNameSelect.innerHTML = "";
    const nameDefault = document.createElement("option");
    nameDefault.value = "";
    nameDefault.textContent = "Pilih Nama Murid";
    loginNameSelect.appendChild(nameDefault);

    if (!classId) {
      loginNameSelect.disabled = true;
      loginNameSelect.value = "";
      return;
    }

    let students = [];

    try {
      students = await engine.getStudentsByClass(classId);
    } catch (error) {
      console.error("[KMJ] Login students error", error);
      loginNameSelect.disabled = true;
      return;
    }

    students.forEach(function (student) {
      const option = document.createElement("option");
      option.value = student.studentId;
      option.textContent = student.studentName;
      option.dataset.studentName = student.studentName;
      option.dataset.classId = student.classId;
      loginNameSelect.appendChild(option);
    });

    loginNameSelect.disabled = !students.length;
    loginNameSelect.value = "";
  }

  function applyStudentLogin() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!loginClassSelect || !loginNameSelect || !engine) {
      return false;
    }

    const classId = loginClassSelect.value;
    const studentId = loginNameSelect.value;
    const selectedOption = loginNameSelect.options[loginNameSelect.selectedIndex];
    const studentName = selectedOption
      ? selectedOption.dataset.studentName || selectedOption.textContent
      : "";

    if (!classId || !studentId || !studentName) {
      window.alert("Sila pilih kelas dan nama anda.");
      return false;
    }

    engine.setStudentSession({
      classId: classId,
      studentId: studentId,
      studentName: studentName,
    });

    return true;
  }

  function clearPronunciationFeedbackTimer() {
    if (pronunciationFeedbackTimer !== null) {
      window.clearTimeout(pronunciationFeedbackTimer);
      pronunciationFeedbackTimer = null;
    }
  }

  function hidePronunciationFeedback(feedbackEl) {
    clearPronunciationFeedbackTimer();

    if (feedbackEl) {
      feedbackEl.style.opacity = "0";
    }
  }

  function hideBelajarFeedback() {
    hidePronunciationFeedback(belajarFeedback);
  }

  function showPronunciationFeedbackMessage(feedbackEl, message) {
    if (!feedbackEl) {
      return;
    }

    feedbackEl.textContent = message;
    feedbackEl.style.opacity = "1";
  }

  function showBelajarFeedback(message) {
    showPronunciationFeedbackMessage(belajarFeedback, message);
  }

  function getBelajarFeedbackElement() {
    if (belajarFeedback && belajarFeedback.isConnected) {
      return belajarFeedback;
    }

    const found = document.getElementById("belajar-feedback");

    if (found) {
      belajarFeedback = found;
      return found;
    }

    return belajarFeedback;
  }

  function showBelajarWordSebutFeedback(feedbackEl, lines) {
    const el = getBelajarFeedbackElement() || feedbackEl;

    if (!el) {
      console.warn("[Belajar Sebut] Tiada elemen #belajar-feedback untuk papar mesej.");
      return;
    }

    const parts = Array.isArray(lines) ? lines : [lines];
    const message = parts
      .filter(function (line) {
        return line != null && String(line).length > 0;
      })
      .join("\n");

    el.style.whiteSpace = "pre-line";
    el.style.textAlign = "center";
    el.style.lineHeight = "1.35";
    el.style.display = "block";
    el.style.visibility = "visible";
    el.style.zIndex = "30";
    el.setAttribute("aria-hidden", "false");
    showPronunciationFeedbackMessage(el, message);
  }

  async function persistBelajarWordAssessmentSilently() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (engine && engine.getLoggedInStudent && engine.getLoggedInStudent()) {
      if (engine.tryAutoSyncAfterAssessment) {
        try {
          await engine.tryAutoSyncAfterAssessment();
        } catch (syncError) {
          console.warn("[KMJ] Belajar word silent sync skipped", syncError);
        }
      }
    }

    await refreshStudentSyncBadge();
  }

  function resolveBelajarWordHeardTranscript(result) {
    if (!result) {
      return "";
    }

    const candidates = [
      result.transcript,
      result.rawTranscript,
      result.detectedText,
      result.googleDebug && result.googleDebug.transcript,
      result.speech && result.speech.transcript,
      result.record && result.record.transcript,
    ];

    let i;
    let value;

    for (i = 0; i < candidates.length; i += 1) {
      value = String(candidates[i] || "").trim();

      if (value) {
        return value;
      }
    }

    return "";
  }

  function isBelajarWordUnclearHearing(result, heard) {
    if (!heard) {
      return true;
    }

    if (result && result.timedOut) {
      return true;
    }

    if (result && result.googleDebug && result.googleDebug.timedOut) {
      return true;
    }

    return false;
  }

  function renderBelajarWordSebutFeedback(feedbackEl, result, checkpointId, targetText) {
    const el = getBelajarFeedbackElement() || feedbackEl;

    console.log("[Belajar Sebut]", {
      checkpointId: checkpointId,
      targetText: targetText,
      mode: result && result.mode,
      aiResult: result && result.aiResult,
      transcript: result && result.transcript,
      confidence: result && result.confidence,
      reasonKey: result && result.reasonKey,
      heard: resolveBelajarWordHeardTranscript(result),
      googleDebug: result && result.googleDebug,
    });

    if (!el) {
      return;
    }

    if (!result) {
      showBelajarWordSebutFeedback(el, [
        "Cuba lagi 😊",
        "Google tidak dapat mendengar dengan jelas",
      ]);
      return;
    }

    if (result.mode === "api_unavailable") {
      handleBelajarWordSebutApiUnavailable(el);
      return;
    }

    const heard = resolveBelajarWordHeardTranscript(result);

    if (result.mode === "ai_verified") {
      showBelajarWordSebutFeedback(el, [
        "Bagus! Sebutan betul ⭐",
        "Google dengar: " + (heard || "(kosong)"),
      ]);
      return;
    }

    if (result.mode === "ai_failed") {
      if (isBelajarWordUnclearHearing(result, heard)) {
        showBelajarWordSebutFeedback(el, [
          "Cuba lagi 😊",
          "Google tidak dapat mendengar dengan jelas",
        ]);
        return;
      }

      showBelajarWordSebutFeedback(el, [
        "Cuba lagi 😊",
        "Google dengar: " + heard,
      ]);
      return;
    }

    console.warn("[Belajar Sebut] Mod tidak dikenali, papar mesej lalai.", result.mode);
    showBelajarWordSebutFeedback(el, [
      "Cuba lagi 😊",
      isBelajarWordUnclearHearing(result, heard)
        ? "Google tidak dapat mendengar dengan jelas"
        : "Google dengar: " + (heard || "(kosong)"),
    ]);
  }

  function isStudentBrowserOffline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  async function refreshStudentSyncBadge() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!belajarStudentSyncBadge) {
      return;
    }

    if (!engine || !engine.getLoggedInStudent || !engine.getLoggedInStudent()) {
      belajarStudentSyncBadge.style.display = "none";
      belajarStudentSyncBadge.textContent = "";
      return;
    }

    if (!engine.getStudentSyncStatusSummary) {
      belajarStudentSyncBadge.style.display = "none";
      return;
    }

    try {
      await engine.initDatabase();
      const summary = await engine.getStudentSyncStatusSummary();

      if (!summary || !summary.label) {
        belajarStudentSyncBadge.style.display = "none";
        belajarStudentSyncBadge.textContent = "";
        return;
      }

      belajarStudentSyncBadge.textContent = summary.label;
      belajarStudentSyncBadge.classList.toggle(
        "is-sync-pending",
        summary.hasPending
      );
      belajarStudentSyncBadge.classList.toggle(
        "is-sync-done",
        !summary.hasPending
      );
      belajarStudentSyncBadge.style.display = "block";
    } catch (statusError) {
      console.warn("[KMJ] Student sync badge error", statusError);
      belajarStudentSyncBadge.style.display = "none";
    }
  }

  function bindStudentSyncStatusListeners() {
    if (window.__kmjStudentSyncBadgeBound) {
      return;
    }

    window.__kmjStudentSyncBadgeBound = true;

    window.addEventListener("kmj-sync-status-changed", function () {
      void refreshStudentSyncBadge();
    });

    window.addEventListener("online", function () {
      void refreshStudentSyncBadge();
    });
  }

  async function notifyStudentAssessmentSaved(feedbackEl, baseMessage) {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;
    let message = baseMessage || STUDENT_RECORD_SAVED_MSG;

    if (engine && engine.getLoggedInStudent && engine.getLoggedInStudent()) {
      if (isStudentBrowserOffline()) {
        message = STUDENT_OFFLINE_SAVED_MSG;
      } else if (engine.tryAutoSyncAfterAssessment) {
        try {
          const syncResult = await engine.tryAutoSyncAfterAssessment();

          if (syncResult && syncResult.ok && !syncResult.noPending) {
            message = baseMessage || STUDENT_RECORD_SAVED_MSG;
          } else {
            message = STUDENT_OFFLINE_SAVED_MSG;
          }
        } catch (syncError) {
          console.warn("[KMJ] Auto-sync skipped", syncError);
          message = STUDENT_OFFLINE_SAVED_MSG;
        }
      } else {
        message = STUDENT_OFFLINE_SAVED_MSG;
      }
    }

    await refreshStudentSyncBadge();

    if (feedbackEl) {
      showPronunciationFeedbackMessage(feedbackEl, message);
      return;
    }

    showBelajarFeedback(message);
  }

  function showStudentRecordSaved(feedbackEl) {
    void notifyStudentAssessmentSaved(feedbackEl, STUDENT_RECORD_SAVED_MSG);
  }

  function formatWordModeDetected(transcript, percent, suffix) {
    const display = String(transcript || "").trim() || "(kosong)";
    return "Dikesan: " + display + " — " + percent + "% " + suffix;
  }

  function showWordModePass(feedbackEl, transcript) {
    const display = String(transcript || "").trim() || "(kosong)";
    showPronunciationFeedbackMessage(
      feedbackEl,
      "Dikesan: " + display + " — AI Lulus"
    );
  }

  function showWordModeFail(feedbackEl, transcript) {
    const display = String(transcript || "").trim() || "(kosong)";
    showPronunciationFeedbackMessage(
      feedbackEl,
      "Dikesan: " + display + " — Cuba lagi."
    );
  }

  function showWordModeFailReason(feedbackEl, result) {
    if (result.failReason === "unclear") {
      showPronunciationFeedbackMessage(
        feedbackEl,
        "Sebutan kurang jelas — Cuba lagi."
      );
      return;
    }

    if (result.failReason === "malay_only") {
      showPronunciationFeedbackMessage(
        feedbackEl,
        "Sila gunakan sebutan Bahasa Melayu sepenuhnya — Cuba lagi."
      );
      return;
    }

    showWordModeFail(feedbackEl, result.transcript);
  }

  function downloadTeacherCsv() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!engine || !engine.exportAllRecordsCsv) {
      return;
    }

    engine
      .exportAllRecordsCsv()
      .then(function (csvText) {
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "kmj_lite_rekod_" + Date.now() + ".csv";
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch(function (error) {
        console.error("[KMJ] CSV export error", error);
        window.alert("Gagal eksport CSV.");
      });
  }

  function formatBackupFilenameStamp(date) {
    function pad2(value) {
      return String(value).padStart(2, "0");
    }

    return (
      date.getFullYear() +
      pad2(date.getMonth() + 1) +
      pad2(date.getDate()) +
      "_" +
      pad2(date.getHours()) +
      pad2(date.getMinutes())
    );
  }

  function downloadFullBackupJson() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!engine || !engine.exportFullBackup) {
      window.alert("Fungsi backup tidak tersedia.");
      return;
    }

    engine
      .exportFullBackup()
      .then(function (backup) {
        const jsonText = JSON.stringify(backup, null, 2);
        const blob = new Blob([jsonText], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename =
          "KMJLITE_BACKUP_" +
          formatBackupFilenameStamp(new Date()) +
          ".json";
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch(function (error) {
        console.error("[KMJ] Backup export error", error);
        window.alert("Gagal eksport backup: " + formatRosterImportError(error));
      });
  }

  function openBackupRestoreFilePicker() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!engine || !engine.restoreFullBackup) {
      window.alert("Fungsi pulih backup tidak tersedia.");
      return;
    }

    if (!window.confirm("Pulihkan semua data daripada backup?")) {
      return;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";

    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.onload = function () {
        Promise.resolve()
          .then(function () {
            const parsed = JSON.parse(String(reader.result || "{}"));
            return engine.restoreFullBackup(parsed);
          })
          .then(function () {
            return refreshTeacherDashboardList();
          })
          .then(function () {
            return refreshLoginDropdowns();
          })
          .then(function () {
            window.alert("Backup berjaya dipulihkan.");
          })
          .catch(function (error) {
            console.error("[KMJ] Backup restore error", error);
            window.alert("Gagal pulihkan backup: " + formatRosterImportError(error));
          });
      };

      reader.onerror = function () {
        const err = reader.error || new Error("Fail backup tidak dapat dibaca.");
        console.error("[KMJ] Backup file read error", err);
        window.alert("Gagal pulihkan backup: " + formatRosterImportError(err));
      };

      reader.readAsText(file);
    });

    fileInput.click();
  }

  async function resetAllAppData() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!engine || !engine.resetAllData) {
      window.alert("Fungsi reset semua data tidak tersedia.");
      return;
    }

    if (
      !window.confirm(
        "Reset SEMUA data?\n\nSenarai murid dan rekod penilaian akan dipadam."
      )
    ) {
      return;
    }

    try {
      await engine.resetAllData();
      await refreshTeacherDashboardList();
      await refreshLoginDropdowns();
      window.alert("Semua data berjaya direset.");
    } catch (error) {
      console.error("[KMJ] Reset all data error", error);
      window.alert("Reset gagal: " + formatRosterImportError(error));
    }
  }

  function isTeacherMode() {
    try {
      return sessionStorage.getItem(TEACHER_MODE_KEY) === "1";
    } catch (storageError) {
      return false;
    }
  }

  function setTeacherMode(active) {
    try {
      if (active) {
        sessionStorage.setItem(TEACHER_MODE_KEY, "1");
      } else {
        sessionStorage.removeItem(TEACHER_MODE_KEY);
      }
    } catch (storageError) {
      /* ignore */
    }

    if (!active) {
      hideTeacherDashboard();
    }
  }

  function revokeTeacherBlobUrls() {
    teacherBlobUrls.forEach(function (url) {
      URL.revokeObjectURL(url);
    });
    teacherBlobUrls = [];
  }

  function getAssessmentEngine() {
    return window.KMJ_Assessment || window.KMJ_Pronunciation || null;
  }

  function getLicenseMaxRoster(engine) {
    const activeEngine = engine || getAssessmentEngine();

    if (activeEngine && typeof activeEngine.getMaxRosterStudents === "function") {
      return activeEngine.getMaxRosterStudents();
    }

    if (activeEngine && activeEngine.MAX_ROSTER_STUDENTS) {
      return activeEngine.MAX_ROSTER_STUDENTS;
    }

    return 40;
  }

  function isSchoolLicenseActive() {
    const engine = getAssessmentEngine();

    return Boolean(engine && engine.isLicenseActive && engine.isLicenseActive());
  }

  function showMicOrSpeechSecurityAlert(error) {
    if (!error || !error.message) {
      return false;
    }

    const message = String(error.message);

    const lowerMessage = message.toLowerCase();

    if (
      message.indexOf("Akses Mic Disekat") !== -1 ||
      lowerMessage.indexOf("pengecaman suara tidak tersedia") !== -1 ||
      error.code === "insecure-mic"
    ) {
      window.alert(message);
      return true;
    }

    return false;
  }

  function createLicenseActivationOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "kmj-license-activation-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:65;display:none;" +
      "align-items:center;justify-content:center;background:rgba(0,0,0,0.55);" +
      "pointer-events:auto;";

    const panel = document.createElement("div");
    panel.style.cssText =
      "width:82%;max-width:340px;padding:1em 1.1em;background:#fff8e8;" +
      "border:2px solid #5c4a32;border-radius:14px;text-align:left;" +
      "font-family:" +
      BELAJAR_FONT +
      ";color:#2a1f14;box-shadow:0 6px 18px rgba(0,0,0,0.2);";

    const title = document.createElement("p");
    title.textContent = "Aktifkan Lesen Sekolah";
    title.style.cssText = "margin:0 0 0.5em;font-size:1rem;font-weight:700;text-align:center;";

    const statusEl = document.createElement("p");
    statusEl.style.cssText =
      "margin:0 0 0.65em;font-size:0.75rem;color:#6b3f1f;text-align:center;";

    function makeField(labelText, inputType, inputMode) {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:block;margin:0 0 0.55em;font-size:0.78rem;font-weight:700;";
      wrap.textContent = labelText;

      const input = document.createElement("input");
      input.type = inputType || "text";
      input.autocomplete = "off";
      input.style.cssText =
        "display:block;width:100%;box-sizing:border-box;margin-top:0.2em;padding:0.45em;" +
        "font-size:0.85rem;border:2px solid #5c4a32;border-radius:8px;font-family:" +
        BELAJAR_FONT +
        ";";

      if (inputMode) {
        input.inputMode = inputMode;
      }

      wrap.appendChild(input);
      return { wrap: wrap, input: input };
    }

    const schoolField = makeField("Kod Sekolah", "text");
    const emailField = makeField("Email Admin Guru", "email");
    const keyField = makeField("License Key", "text");

    const buttonRow = document.createElement("div");
    buttonRow.style.cssText =
      "display:flex;gap:0.5em;margin-top:0.75em;width:100%;";

    function makeModalBtn(label, isPrimary) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText =
        "flex:1;padding:0.45em;border:2px solid #5c4a32;border-radius:10px;" +
        "font-family:" +
        BELAJAR_FONT +
        ";font-weight:700;cursor:pointer;" +
        (isPrimary
          ? "background:#5c4a32;color:#fff8e8;"
          : "background:#fff;color:#2a1f14;");
      return btn;
    }

    const cancelBtn = makeModalBtn("Batal", false);
    const activateBtn = makeModalBtn("Aktifkan Lesen", true);

    cancelBtn.addEventListener("click", function () {
      hideLicenseActivationModal();
    });

    activateBtn.addEventListener("click", function () {
      handleLicenseActivationSubmit(
        schoolField.input.value,
        emailField.input.value,
        keyField.input.value,
        statusEl
      );
    });

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(activateBtn);
    panel.appendChild(title);
    panel.appendChild(statusEl);
    panel.appendChild(schoolField.wrap);
    panel.appendChild(emailField.wrap);
    panel.appendChild(keyField.wrap);
    panel.appendChild(buttonRow);
    overlay.appendChild(panel);
    stage.appendChild(overlay);

    return {
      overlay: overlay,
      statusEl: statusEl,
      schoolInput: schoolField.input,
      emailInput: emailField.input,
      keyInput: keyField.input,
    };
  }

  function showLicenseActivationModal() {
    if (!teacherLicenseOverlay) {
      return;
    }

    const engine = getAssessmentEngine();
    const license = engine && engine.readLicenseActivation ? engine.readLicenseActivation() : null;
    const status =
      engine && engine.getLicenseStatus ? engine.getLicenseStatus() : { active: false };

    teacherLicenseOverlay.schoolInput.value =
      (license && license.schoolCode) || "";
    teacherLicenseOverlay.emailInput.value =
      (license && license.adminEmail) || "";
    teacherLicenseOverlay.keyInput.value = "";

    if (!status.active && status.message) {
      teacherLicenseOverlay.statusEl.textContent = status.message;
    } else if (engine && engine.LICENSE_EXPIRED_OFFLINE_MSG && !navigator.onLine) {
      teacherLicenseOverlay.statusEl.textContent = engine.LICENSE_EXPIRED_OFFLINE_MSG;
    } else {
      teacherLicenseOverlay.statusEl.textContent =
        "Masukkan maklumat lesen sekolah untuk menggunakan Mod Guru.";
    }

    teacherLicenseOverlay.overlay.style.display = "flex";
    teacherLicenseOverlay.overlay.setAttribute("aria-hidden", "false");
    teacherLicenseOverlay.schoolInput.focus();
  }

  function hideLicenseActivationModal() {
    if (!teacherLicenseOverlay) {
      return;
    }

    teacherLicenseOverlay.overlay.style.display = "none";
    teacherLicenseOverlay.overlay.setAttribute("aria-hidden", "true");
  }

  async function handleLicenseActivationSubmit(schoolCode, adminEmail, licenseKey, statusEl) {
    const engine = getAssessmentEngine();

    if (!engine || !engine.activateLicense) {
      window.alert("Modul lesen tidak tersedia. Muat semula halaman (Ctrl+F5).");
      return;
    }

    const code = String(schoolCode || "").trim();
    const email = String(adminEmail || "").trim();
    const key = String(licenseKey || "").trim();

    if (!code || !email || !key) {
      if (statusEl) {
        statusEl.textContent = "Sila lengkapkan Kod Sekolah, Email Admin dan License Key.";
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = "Mengesahkan lesen...";
    }

    try {
      const activation = await engine.activateLicense(code, email, key);
      hideLicenseActivationModal();

      window.alert(
        "Lesen diaktifkan.\n\nSekolah: " +
          (activation.schoolName || activation.schoolCode) +
          "\nHad murid: " +
          (activation.maxStudents || "-") +
          "\nTamat: " +
          (activation.expiryDate || "-")
      );

      if (isTeacherMode()) {
        showTeacherDashboard();
      } else {
        showTeacherPinModal();
      }
    } catch (error) {
      const message = formatRosterImportError(error);
      if (statusEl) {
        statusEl.textContent = message;
      }
      window.alert("Pengaktifan gagal: " + message);
    }
  }

  function createTeacherPinOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "kmj-teacher-pin-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:60;display:none;" +
      "align-items:center;justify-content:center;background:rgba(0,0,0,0.55);" +
      "pointer-events:auto;";

    const panel = document.createElement("div");
    panel.style.cssText =
      "width:78%;max-width:320px;padding:1em 1.1em;background:#fff8e8;" +
      "border:2px solid #5c4a32;border-radius:14px;text-align:center;" +
      "font-family:" +
      BELAJAR_FONT +
      ";color:#2a1f14;box-shadow:0 6px 18px rgba(0,0,0,0.2);";

    const title = document.createElement("p");
    title.textContent = "Mod Guru — Masukkan PIN";
    title.style.cssText = "margin:0 0 0.65em;font-size:1rem;font-weight:700;";

    const pinInput = document.createElement("input");
    pinInput.type = "password";
    pinInput.inputMode = "numeric";
    pinInput.maxLength = 4;
    pinInput.autocomplete = "off";
    pinInput.placeholder = "••••";
    pinInput.style.cssText =
      "width:100%;box-sizing:border-box;padding:0.5em;text-align:center;" +
      "font-size:1.25rem;letter-spacing:0.35em;border:2px solid #5c4a32;border-radius:8px;";

    const buttonRow = document.createElement("div");
    buttonRow.style.cssText =
      "display:flex;gap:0.5em;margin-top:0.75em;width:100%;";

    function makeModalBtn(label, isPrimary) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText =
        "flex:1;padding:0.45em;border:2px solid #5c4a32;border-radius:10px;" +
        "font-family:" +
        BELAJAR_FONT +
        ";font-weight:700;cursor:pointer;" +
        (isPrimary
          ? "background:#5c4a32;color:#fff8e8;"
          : "background:#fff;color:#2a1f14;");
      return btn;
    }

    const cancelBtn = makeModalBtn("Batal", false);
    const okBtn = makeModalBtn("Masuk", true);

    cancelBtn.addEventListener("click", function () {
      hideTeacherPinModal();
    });

    okBtn.addEventListener("click", function () {
      if (pinInput.value === TEACHER_PIN) {
        hideTeacherPinModal();
        setTeacherMode(true);
        showTeacherDashboard();
        return;
      }

      window.alert("PIN tidak betul.");
      pinInput.value = "";
      pinInput.focus();
    });

    pinInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        okBtn.click();
      }
    });

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(okBtn);
    panel.appendChild(title);
    panel.appendChild(pinInput);
    panel.appendChild(buttonRow);
    overlay.appendChild(panel);
    stage.appendChild(overlay);

    return { overlay: overlay, input: pinInput };
  }

  function showTeacherPinModal() {
    if (!teacherPinOverlay) {
      return;
    }

    teacherPinOverlay.overlay.style.display = "flex";
    teacherPinOverlay.overlay.setAttribute("aria-hidden", "false");
    teacherPinOverlay.input.value = "";
    teacherPinOverlay.input.focus();
  }

  function hideTeacherPinModal() {
    if (!teacherPinOverlay) {
      return;
    }

    teacherPinOverlay.overlay.style.display = "none";
    teacherPinOverlay.overlay.setAttribute("aria-hidden", "true");
    teacherPinOverlay.input.value = "";
  }

  function makeTeacherTpSelectButton(label, tpLevel, onSelect, getSelected) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.dataset.tp = tpLevel;
    btn.style.cssText =
      "flex:1;min-width:0;padding:0.35em 0.25em;border:2px solid #5c4a32;" +
      "border-radius:8px;background:#fff;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.72rem;font-weight:700;color:#2a1f14;cursor:pointer;";

    function refreshStyle() {
      const selected = getSelected();

      if (selected === tpLevel) {
        btn.style.background = "#5c4a32";
        btn.style.color = "#fff8e8";
      } else {
        btn.style.background = "#fff";
        btn.style.color = "#2a1f14";
      }
    }

    btn.addEventListener("click", function () {
      onSelect(tpLevel);
      refreshStyle();
    });

    btn.refreshStyle = refreshStyle;
    return btn;
  }

  function saveTeacherTpForRecord(recordId, tpLevel) {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!engine || !isTeacherMode()) {
      return Promise.resolve();
    }

    if (!tpLevel) {
      window.alert("Sila pilih TP1–TP6 dahulu.");
      return Promise.resolve();
    }

    return engine
      .commitTeacherTP(recordId, tpLevel)
      .then(function () {
        refreshTeacherDashboardList();
      })
      .catch(function (error) {
        console.error("[KMJ] Teacher TP save error", error);
        window.alert("Gagal simpan TP. Cuba lagi.");
      });
  }

  function formatDashboardTimestamp(timestamp) {
    if (!timestamp) {
      return "Unknown";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(/\bam\b/gi, "AM")
      .replace(/\bpm\b/gi, "PM");
  }

  function buildTeacherDashboardCard(record, engine) {
    const card = document.createElement("div");
    card.style.cssText =
      "margin:0 0 0.65em;padding:0.55em 0.6em;background:#fff;" +
      "border:1px solid #5c4a32;border-radius:10px;";

    const studentName = engine.getStudentDisplayName
      ? engine.getStudentDisplayName(record)
      : record.studentName || "Unknown";
    const classLabel = engine.resolveClassId
      ? engine.resolveClassId(record)
      : record.classId || "Unknown";
    const targetLabel = record.targetText || "-";
    const displayResult = engine.getDisplayResult
      ? engine.getDisplayResult(record)
      : record.finalResult || "Menunggu TP Guru";

    let selectedTp = record.teacherTP || "";

    const nameLine = document.createElement("p");
    nameLine.style.cssText = "margin:0 0 0.2em;font-size:0.85rem;font-weight:700;";
    nameLine.textContent = "Nama: " + studentName;

    const classLine = document.createElement("p");
    classLine.style.cssText = "margin:0 0 0.35em;font-size:0.78rem;";
    classLine.textContent = "Kelas: " + classLabel;

    const targetLine = document.createElement("p");
    targetLine.style.cssText = "margin:0 0 0.4em;font-size:0.82rem;font-weight:600;";
    targetLine.textContent = "Sasaran: " + targetLabel;

    const resultLine = document.createElement("p");
    resultLine.style.cssText =
      "margin:0 0 0.45em;font-size:0.82rem;font-weight:700;color:#5c4a32;";
    resultLine.textContent = "Keputusan: " + displayResult;

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.textContent = "Main Rakaman";
    playBtn.style.cssText =
      "width:100%;padding:0.4em;border:2px solid #5c4a32;border-radius:8px;" +
      "background:#fff8e8;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.78rem;font-weight:700;color:#2a1f14;cursor:pointer;margin:0 0 0.45em;";

    playBtn.addEventListener("click", function () {
      if (!record.audioBlob) {
        window.alert("Tiada rakaman audio.");
        return;
      }

      const testUrl = URL.createObjectURL(record.audioBlob);
      teacherBlobUrls.push(testUrl);
      const testAudio = new Audio(testUrl);
      testAudio.play().catch(function () {
        window.alert("Gagal mainkan rakaman.");
      });
    });

    const tpButtons = [];
    const tpLevels = engine.TP_LEVELS || [
      "TP1",
      "TP2",
      "TP3",
      "TP4",
      "TP5",
      "TP6",
    ];

    function onSelectTp(tp) {
      selectedTp = tp;
      tpButtons.forEach(function (btn) {
        btn.refreshStyle();
      });
    }

    function getSelectedTp() {
      return selectedTp;
    }

    const tpRow1 = document.createElement("div");
    const tpRow2 = document.createElement("div");
    tpRow1.style.cssText = "display:flex;gap:0.3em;width:100%;margin-bottom:0.3em;";
    tpRow2.style.cssText = "display:flex;gap:0.3em;width:100%;margin-bottom:0.4em;";

    let i;
    let btn;

    for (i = 0; i < tpLevels.length; i += 1) {
      btn = makeTeacherTpSelectButton(
        tpLevels[i],
        tpLevels[i],
        onSelectTp,
        getSelectedTp
      );
      tpButtons.push(btn);

      if (i < 3) {
        tpRow1.appendChild(btn);
      } else {
        tpRow2.appendChild(btn);
      }
    }

    tpButtons.forEach(function (tpBtn) {
      tpBtn.refreshStyle();
    });

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Simpan TP";
    saveBtn.style.cssText =
      "width:100%;padding:0.42em;border:2px solid #5c4a32;border-radius:8px;" +
      "background:#5c4a32;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.8rem;font-weight:700;color:#fff8e8;cursor:pointer;margin:0 0 0.35em;";

    saveBtn.addEventListener("click", function () {
      saveTeacherTpForRecord(record.id, selectedTp);
    });

    const detailsWrap = document.createElement("div");
    detailsWrap.style.cssText = "display:none;margin-top:0.25em;font-size:0.68rem;opacity:0.85;";

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.textContent = "Butiran";
    detailsBtn.style.cssText =
      "padding:0.2em 0.45em;border:1px solid #5c4a32;border-radius:6px;" +
      "background:#fff;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.68rem;cursor:pointer;";

    detailsBtn.addEventListener("click", function () {
      const open = detailsWrap.style.display === "block";
      detailsWrap.style.display = open ? "none" : "block";
      detailsBtn.textContent = open ? "Butiran" : "Tutup Butiran";
    });

    detailsWrap.textContent =
      "ID: " +
      (record.id || "-") +
      " | Semak: " +
      (record.checkpointId || "-") +
      " | Transkrip: " +
      (record.transcript || "-") +
      " | Keyakinan: " +
      (record.confidence !== "" ? record.confidence : "-") +
      " | AI: " +
      (record.aiResult || "-") +
      " | Skor AI: " +
      (record.aiScore !== "" ? record.aiScore : "-") +
      " | Masa: " +
      formatDashboardTimestamp(record.timestamp);

    card.appendChild(nameLine);
    card.appendChild(classLine);
    card.appendChild(targetLine);
    card.appendChild(resultLine);
    card.appendChild(playBtn);
    card.appendChild(tpRow1);
    card.appendChild(tpRow2);
    card.appendChild(saveBtn);
    card.appendChild(detailsBtn);
    card.appendChild(detailsWrap);

    return card;
  }

  async function refreshTeacherRosterPanel() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!teacherRosterTableBody || !engine) {
      return;
    }

    teacherRosterTableBody.innerHTML = "";

    let students = [];
    let total = 0;

    try {
      await engine.initDatabase();
      students = await engine.getAllRosterStudents();
      total = students.length;
    } catch (error) {
      console.error("[KMJ] Roster load error", error);
      teacherRosterTableBody.innerHTML =
        '<tr><td colspan="3">Gagal memuatkan senarai murid.</td></tr>';
      return;
    }

    if (teacherRosterCountEl) {
      teacherRosterCountEl.textContent =
        "Jumlah murid: " + total + " / " + getLicenseMaxRoster(engine);
    }

    if (!students.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = "Tiada murid diimport.";
      cell.style.cssText = "padding:0.35em 0;font-size:0.75rem;";
      row.appendChild(cell);
      teacherRosterTableBody.appendChild(row);
      return;
    }

    students.forEach(function (student) {
      const row = document.createElement("tr");

      const classCell = document.createElement("td");
      classCell.textContent = student.classId;
      classCell.style.cssText = "padding:0.3em 0.25em;font-size:0.75rem;";

      const nameCell = document.createElement("td");
      nameCell.textContent = student.studentName;
      nameCell.style.cssText = "padding:0.3em 0.25em;font-size:0.75rem;";

      const actionCell = document.createElement("td");
      actionCell.style.cssText = "padding:0.3em 0.25em;text-align:center;";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.textContent = "Padam";
      deleteBtn.style.cssText =
        "padding:0.2em 0.45em;border:1px solid #5c4a32;border-radius:6px;" +
        "background:#fff;font-family:" +
        BELAJAR_FONT +
        ";font-size:0.68rem;font-weight:700;cursor:pointer;";

      deleteBtn.addEventListener("click", function () {
        if (
          !window.confirm(
            "Padam " + student.studentName + " (" + student.classId + ")?"
          )
        ) {
          return;
        }

        engine
          .deleteRosterStudent(student.studentId)
          .then(function () {
            refreshTeacherRosterPanel();
            refreshLoginDropdowns();
          })
          .catch(function (error) {
            console.error("[KMJ] Delete roster error", error);
            window.alert("Gagal padam murid.");
          });
      });

      actionCell.appendChild(deleteBtn);
      row.appendChild(classCell);
      row.appendChild(nameCell);
      row.appendChild(actionCell);
      teacherRosterTableBody.appendChild(row);
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

  function parseRosterImportRow(line) {
    const trimmed = String(line || "").trim();

    if (!trimmed) {
      return null;
    }

    if (isRosterImportHeaderLine(trimmed)) {
      return { header: true };
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

    return {
      classId: classId,
      studentName: studentName,
    };
  }

  function normalizeRosterImportPaste(text) {
    const lines = String(text || "").split(/\r?\n/);
    const normalized = [];
    let skipped = 0;
    let i;
    let row;

    for (i = 0; i < lines.length; i += 1) {
      const raw = String(lines[i] || "").trim();

      if (!raw) {
        continue;
      }

      row = parseRosterImportRow(lines[i]);

      if (!row) {
        skipped += 1;
        continue;
      }

      if (row.header) {
        continue;
      }

      normalized.push(row.classId + "," + row.studentName);
    }

    return {
      text: normalized.join("\n"),
      skipped: skipped,
    };
  }

  function formatRosterImportError(error) {
    if (!error) {
      return "Ralat tidak diketahui.";
    }

    if (error.message) {
      return String(error.message);
    }

    return String(error);
  }

  async function handleTeacherImportRoster() {
    const engine = getAssessmentEngine();
    const maxRoster = getLicenseMaxRoster(engine);

    if (!engine || !teacherImportTextarea) {
      window.alert("Import gagal: modul senarai murid tidak tersedia.");
      return;
    }

    if (!engine.importStudentsFromText) {
      window.alert(
        "Import gagal: fungsi import tidak dijumpai. Muat semula halaman (Ctrl+F5)."
      );
      return;
    }

    const text = teacherImportTextarea.value;

    if (!String(text || "").trim()) {
      window.alert("Tampal senarai murid dahulu. Contoh: 1P,Ali");
      return;
    }

    const prepared = normalizeRosterImportPaste(text);

    if (!String(prepared.text || "").trim()) {
      window.alert("Tiada baris murid sah untuk diimport.");
      return;
    }

    console.log("Roster import started");

    try {
      await engine.initDatabase();
      const result = await engine.importStudentsFromText(prepared.text);

      if (!result || !result.ok) {
        const failMsg = (result && result.error) || engine.ROSTER_LIMIT_MSG;
        console.error("Roster import failed:", failMsg);
        window.alert("Import gagal: " + failMsg);
        return;
      }

      const verified = await engine.getAllRosterStudents();
      const skippedTotal = (result.skipped || 0) + (prepared.skipped || 0);
      const totalCount = verified.length;

      console.log("Roster import success", {
        added: result.added,
        skipped: skippedTotal,
        total: totalCount,
      });

      teacherImportTextarea.value = "";
      window.alert(
        "Ditambah: " +
          result.added +
          ", dilangkau: " +
          skippedTotal +
          ", jumlah: " +
          totalCount +
          "/" +
          maxRoster
      );
      await refreshTeacherRosterPanel();
      refreshLoginDropdowns();
    } catch (error) {
      console.error("Roster import failed:", error);
      window.alert("Import gagal: " + formatRosterImportError(error));
    }
  }

  async function handleTeacherResetRoster() {
    const engine = getAssessmentEngine();
    const maxRoster = getLicenseMaxRoster(engine);

    if (!engine || !engine.clearAllRosterStudents) {
      window.alert(
        "Reset gagal: fungsi reset tidak dijumpai. Muat semula halaman (Ctrl+F5)."
      );
      return;
    }

    if (
      !window.confirm(
        "Padam SEMUA senarai murid?\n\nRekod rakaman/semakan murid TIDAK akan dipadam."
      )
    ) {
      return;
    }

    try {
      await engine.initDatabase();
      await engine.clearAllRosterStudents();
      await refreshTeacherRosterPanel();
      refreshLoginDropdowns();
      window.alert("Senarai murid telah direset. Jumlah: 0/" + maxRoster);
    } catch (error) {
      console.error("Roster reset failed:", error);
      window.alert("Reset gagal: " + formatRosterImportError(error));
    }
  }

  async function refreshTeacherAssessmentList() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (
      !teacherDashboardListEl ||
      !engine ||
      !engine.getTeacherDashboardRecords
    ) {
      return;
    }

    revokeTeacherBlobUrls();
    teacherDashboardListEl.innerHTML = "";

    let records = [];

    try {
      await engine.initDatabase();
      records = await engine.getTeacherDashboardRecords();
    } catch (error) {
      console.error("[KMJ] Dashboard list error", error);
      teacherDashboardListEl.textContent = "Gagal memuatkan senarai.";
      return;
    }

    function startsWithAiText(value) {
      return String(value || "")
        .trim()
        .toUpperCase()
        .indexOf("AI") === 0;
    }

    function shouldShowInPendingView(record) {
      const teacherTp = String((record && record.teacherTP) || "").trim();
      const resultSource = String((record && record.resultSource) || "")
        .trim()
        .toUpperCase();
      const finalResult = String((record && record.finalResult) || "")
        .trim()
        .toUpperCase();

      if (!teacherTp) {
        return true;
      }

      if (resultSource === "AI") {
        return true;
      }

      if (startsWithAiText(finalResult)) {
        return true;
      }

      if (resultSource === "GURU" && teacherTp) {
        return false;
      }

      return true;
    }

    const visibleRecords = teacherShowAllRecords
      ? records
      : records.filter(shouldShowInPendingView);

    if (!visibleRecords.length) {
      const empty = document.createElement("p");
      empty.textContent = teacherShowAllRecords
        ? "Tiada rekod tersedia."
        : "Tiada rekod menunggu semakan guru.";
      empty.style.cssText = "margin:0;padding:0.5em 0;text-align:center;opacity:0.85;";
      teacherDashboardListEl.appendChild(empty);
      return;
    }

    visibleRecords.forEach(function (record) {
      teacherDashboardListEl.appendChild(buildTeacherDashboardCard(record, engine));
    });
  }

  async function refreshTeacherSyncStatus() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!teacherSyncStatusEl || !engine || !engine.getSyncStatusCounts) {
      return;
    }

    try {
      await engine.initDatabase();
      const counts = await engine.getSyncStatusCounts();
      teacherSyncStatusEl.textContent =
        "Belum Sync: " +
        counts.pending +
        " rekod | Sudah Sync: " +
        counts.synced +
        " rekod";
    } catch (error) {
      console.error("[KMJ] Sync status error", error);
      teacherSyncStatusEl.textContent = "Belum Sync: - rekod | Sudah Sync: - rekod";
    }
  }

  function setTeacherSyncButtonBusy(busy) {
    if (!teacherSyncSheetBtn) {
      return;
    }

    teacherSyncSheetBtn.disabled = busy;
    teacherSyncSheetBtn.textContent = busy
      ? "Sedang sync..."
      : "Sync ke Google Sheet";
  }

  async function handleTeacherResetSyncStatus() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (!engine || !engine.resetAllSyncStatusToPending) {
      window.alert("Fungsi reset sync status tidak tersedia.");
      return;
    }

    if (
      !window.confirm(
        "Set semula status sync semua rekod? Semua rekod akan dihantar semula ke Google Sheet."
      )
    ) {
      return;
    }

    try {
      await engine.initDatabase();
      const result = await engine.resetAllSyncStatusToPending();
      await refreshTeacherSyncStatus();
      window.alert(
        "Status sync direset. Belum Sync: " + (result.reset || 0) + " rekod."
      );
    } catch (error) {
      console.error("[KMJ] Reset sync status error", error);
      window.alert(
        "Reset sync status gagal: " +
          (error && error.message ? error.message : String(error))
      );
    }
  }

  async function handleTeacherGoogleSheetSync() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (isSyncing || (engine && engine.isGoogleSheetSyncInProgress && engine.isGoogleSheetSyncInProgress())) {
      window.alert("Sync sedang berjalan...");
      return;
    }

    if (!engine || !engine.syncPendingResultsToGoogleSheet) {
      window.alert("Fungsi sync tidak tersedia.");
      return;
    }

    if (engine.isSyncEndpointConfigured && !engine.isSyncEndpointConfigured()) {
      window.alert(
        "Sila tetapkan KMJ_SYNC_ENDPOINT dalam pronunciation-verify.js."
      );
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      window.alert("Tiada internet. Data disimpan offline.");
      return;
    }

    isSyncing = true;
    setTeacherSyncButtonBusy(true);

    try {
      const result = await engine.syncPendingResultsToGoogleSheet();

      if (result && result.noPending) {
        window.alert(
          result.message ||
            "Tiada rekod baharu untuk disync. Semua rekod tempatan sudah ditandakan sebagai synced."
        );
      } else if (result && result.message) {
        window.alert(result.message);
      } else {
        window.alert(
          "Sync berjaya dihantar ke Google Sheet. Sila tunggu 5–10 saat dan refresh Google Sheet jika data belum kelihatan."
        );
      }

      await refreshTeacherSyncStatus();
    } catch (error) {
      console.error("[KMJ] Google Sheet sync error", error);
      const message =
        error && error.message
          ? error.message
          : "Sync gagal. Cuba lagi.";
      window.alert(message);
      await refreshTeacherSyncStatus();
    } finally {
      isSyncing = false;
      setTeacherSyncButtonBusy(false);
    }
  }

  async function refreshTeacherDashboardList() {
    await refreshTeacherRosterPanel();
    await refreshTeacherSyncStatus();
    await refreshTeacherAssessmentList();
  }

  function isTeacherDashboardOpen() {
    return (
      !!teacherDashboardOverlay &&
      teacherDashboardOverlay.style.display !== "none" &&
      teacherDashboardOverlay.getAttribute("aria-hidden") === "false"
    );
  }

  function createTeacherDashboardOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "kmj-teacher-dashboard";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:55;display:none;align-items:flex-start;justify-content:center;" +
      "padding:2% 3%;pointer-events:auto;background:rgba(0,0,0,0.2);";

    const panel = document.createElement("div");
    panel.style.cssText =
      "position:relative;width:100%;display:flex;flex-direction:column;max-height:80vh;" +
      "background:rgba(255,248,232,0.98);border:2px solid #5c4a32;border-radius:14px;" +
      "padding:0.65em 0.7em 0.65em;overflow:hidden;font-family:" +
      BELAJAR_FONT +
      ";color:#2a1f14;box-shadow:0 6px 16px rgba(0,0,0,0.18);";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "✕ Tutup";
    closeBtn.style.cssText =
      "position:absolute;top:0.45em;right:0.45em;z-index:99;padding:0.28em 0.5em;" +
      "border:2px solid #5c4a32;border-radius:8px;background:#fff;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.72rem;font-weight:700;cursor:pointer;";
    closeBtn.addEventListener("click", function () {
      hideTeacherDashboard();
    });

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;" +
      "gap:0.4em;margin-bottom:0.45em;flex-shrink:0;padding-right:6.2em;";

    const title = document.createElement("p");
    title.textContent = "Master Dashboard";
    title.style.cssText = "margin:0;font-size:1rem;font-weight:700;line-height:1.2;";

    const headerBtns = document.createElement("div");
    headerBtns.style.cssText =
      "display:flex;gap:0.35em;flex-shrink:0;flex-wrap:wrap;justify-content:flex-start;align-items:stretch;";

    function makeHeaderBtn(label) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText =
        "padding:0.3em 0.45em;border:2px solid #5c4a32;border-radius:8px;" +
        "background:#fff;font-family:" +
        BELAJAR_FONT +
        ";font-size:0.72rem;font-weight:700;cursor:pointer;line-height:1.2;min-height:2.1em;";
      return btn;
    }

    const refreshBtn = makeHeaderBtn("Muat semula");
    refreshBtn.addEventListener("click", function () {
      refreshTeacherDashboardList();
    });

    const exportBtn = makeHeaderBtn("Eksport CSV");
    exportBtn.addEventListener("click", function () {
      downloadTeacherCsv();
    });

    const backupBtn = makeHeaderBtn("Muat Turun Backup Penuh");
    backupBtn.addEventListener("click", function () {
      downloadFullBackupJson();
    });

    const restoreBtn = makeHeaderBtn("Pulihkan Backup");
    restoreBtn.addEventListener("click", function () {
      openBackupRestoreFilePicker();
    });

    teacherSyncSheetBtn = makeHeaderBtn("Sync ke Google Sheet");
    teacherSyncSheetBtn.addEventListener("click", function () {
      handleTeacherGoogleSheetSync();
    });

    const resetSyncStatusBtn = makeHeaderBtn("Reset Sync Status");
    resetSyncStatusBtn.addEventListener("click", function () {
      handleTeacherResetSyncStatus();
    });

    const logoutBtn = makeHeaderBtn("Log Keluar Mod Guru");
    logoutBtn.addEventListener("click", function () {
      setTeacherMode(false);
    });

    refreshBtn.style.flex = "0 1 auto";
    logoutBtn.style.flex = "1 1 12em";
    exportBtn.style.flex = "1 1 12em";
    backupBtn.style.flex = "1 1 14em";
    restoreBtn.style.flex = "1 1 12em";
    teacherSyncSheetBtn.style.flex = "1 1 14em";
    resetSyncStatusBtn.style.flex = "1 1 12em";

    headerBtns.appendChild(refreshBtn);
    headerBtns.appendChild(exportBtn);
    headerBtns.appendChild(backupBtn);
    headerBtns.appendChild(restoreBtn);
    headerBtns.appendChild(teacherSyncSheetBtn);
    headerBtns.appendChild(resetSyncStatusBtn);
    headerBtns.appendChild(logoutBtn);
    header.appendChild(title);
    header.appendChild(headerBtns);

    const scrollBody = document.createElement("div");
    scrollBody.id = "kmj-teacher-dashboard-scroll";
    scrollBody.style.cssText =
      "flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;" +
      "overscroll-behavior:contain;";

    const storageNote = document.createElement("p");
    storageNote.textContent =
      "Data murid disimpan dalam pelayar/peranti ini.";
    storageNote.style.cssText =
      "margin:0 0 0.45em;font-size:0.68rem;opacity:0.8;line-height:1.3;flex-shrink:0;";

    teacherRosterPanelEl = document.createElement("div");
    teacherRosterPanelEl.id = "kmj-teacher-roster-panel";
    teacherRosterPanelEl.style.cssText =
      "margin-bottom:0.5em;padding-bottom:0.45em;border-bottom:1px solid #5c4a32;";

    const importTitle = document.createElement("p");
    importTitle.textContent = "Import Murid";
    importTitle.style.cssText = "margin:0 0 0.35em;font-size:0.85rem;font-weight:700;";

    teacherImportTextarea = document.createElement("textarea");
    teacherImportTextarea.rows = 4;
    teacherImportTextarea.placeholder = "1P,Ali\n1P,Ahmad\n1I,Siti";
    teacherImportTextarea.style.cssText =
      "width:100%;box-sizing:border-box;padding:0.4em;border:2px solid #5c4a32;" +
      "border-radius:8px;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.72rem;resize:vertical;";

    const importBtn = document.createElement("button");
    importBtn.type = "button";
    importBtn.textContent = "Import Murid";
    importBtn.style.cssText =
      "margin:0.35em 0 0.45em;padding:0.35em 0.55em;border:2px solid #5c4a32;" +
      "border-radius:8px;background:#5c4a32;color:#fff8e8;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.75rem;font-weight:700;cursor:pointer;width:100%;";
    importBtn.addEventListener("click", function () {
      handleTeacherImportRoster();
    });

    const resetRosterBtn = document.createElement("button");
    resetRosterBtn.type = "button";
    resetRosterBtn.textContent = "Reset Senarai Murid";
    resetRosterBtn.style.cssText =
      "margin:0.35em 0 0;padding:0.35em 0.55em;border:2px solid #8b3a3a;" +
      "border-radius:8px;background:#fff;color:#5c1f1f;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.72rem;font-weight:700;cursor:pointer;width:100%;";
    resetRosterBtn.addEventListener("click", function () {
      handleTeacherResetRoster();
    });

    const resetAllBtn = document.createElement("button");
    resetAllBtn.type = "button";
    resetAllBtn.textContent = "Reset Semua Data";
    resetAllBtn.style.cssText =
      "margin:0.35em 0 0;padding:0.35em 0.55em;border:2px solid #8b3a3a;" +
      "border-radius:8px;background:#fff;color:#5c1f1f;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.72rem;font-weight:700;cursor:pointer;width:100%;";
    resetAllBtn.addEventListener("click", function () {
      resetAllAppData();
    });

    teacherRosterCountEl = document.createElement("p");
    teacherRosterCountEl.style.cssText = "margin:0 0 0.35em;font-size:0.72rem;opacity:0.85;";
    teacherRosterCountEl.textContent = "Jumlah murid: 0 / 40";

    const rosterTable = document.createElement("table");
    rosterTable.style.cssText = "width:100%;border-collapse:collapse;margin-bottom:0.35em;";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Kelas", "Nama", "Padam"].forEach(function (label) {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.cssText =
        "text-align:left;font-size:0.72rem;padding:0.25em;border-bottom:1px solid #5c4a32;";
      if (label === "Padam") {
        th.style.textAlign = "center";
      }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);

    teacherRosterTableBody = document.createElement("tbody");
    rosterTable.appendChild(thead);
    rosterTable.appendChild(teacherRosterTableBody);

    const assessTitle = document.createElement("p");
    assessTitle.textContent = "Semakan Rakaman";
    assessTitle.style.cssText = "margin:0.35em 0 0.35em;font-size:0.85rem;font-weight:700;";

    teacherRecordFilterToggleBtn = document.createElement("button");
    teacherRecordFilterToggleBtn.type = "button";
    teacherRecordFilterToggleBtn.textContent = "Tunjuk Semua Rekod";
    teacherRecordFilterToggleBtn.style.cssText =
      "margin:0 0 0.35em;padding:0.3em 0.45em;border:1px solid #5c4a32;border-radius:8px;" +
      "background:#fff;font-family:" +
      BELAJAR_FONT +
      ";font-size:0.72rem;font-weight:700;cursor:pointer;";
    teacherRecordFilterToggleBtn.addEventListener("click", function () {
      teacherShowAllRecords = !teacherShowAllRecords;
      teacherRecordFilterToggleBtn.textContent = teacherShowAllRecords
        ? "Tunjuk Rekod Belum TP Guru"
        : "Tunjuk Semua Rekod";
      refreshTeacherAssessmentList();
    });

    teacherSyncStatusEl = document.createElement("p");
    teacherSyncStatusEl.id = "kmj-teacher-sync-status";
    teacherSyncStatusEl.style.cssText =
      "margin:0 0 0.35em;font-size:0.72rem;opacity:0.85;line-height:1.3;";
    teacherSyncStatusEl.textContent = "Belum Sync: 0 rekod | Sudah Sync: 0 rekod";

    teacherRosterPanelEl.appendChild(importTitle);
    teacherRosterPanelEl.appendChild(teacherImportTextarea);
    teacherRosterPanelEl.appendChild(importBtn);
    teacherRosterPanelEl.appendChild(resetRosterBtn);
    teacherRosterPanelEl.appendChild(resetAllBtn);
    teacherRosterPanelEl.appendChild(teacherRosterCountEl);
    teacherRosterPanelEl.appendChild(rosterTable);
    teacherRosterPanelEl.appendChild(assessTitle);
    teacherRosterPanelEl.appendChild(teacherRecordFilterToggleBtn);
    teacherRosterPanelEl.appendChild(teacherSyncStatusEl);

    teacherDashboardListEl = document.createElement("div");
    teacherDashboardListEl.id = "kmj-teacher-pending-list";

    scrollBody.appendChild(teacherRosterPanelEl);
    scrollBody.appendChild(teacherDashboardListEl);

    panel.appendChild(closeBtn);
    panel.appendChild(header);
    panel.appendChild(storageNote);
    panel.appendChild(scrollBody);
    overlay.appendChild(panel);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        hideTeacherDashboard();
      }
    });

    stage.appendChild(overlay);

    return overlay;
  }

  function showTeacherDashboard() {
    if (!teacherDashboardOverlay) {
      return;
    }

    if (!isSchoolLicenseActive()) {
      setTeacherMode(false);
      hideTeacherPinModal();
      showLicenseActivationModal();
      return;
    }

    if (!isTeacherMode()) {
      return;
    }

    teacherDashboardOverlay.style.display = "flex";
    teacherDashboardOverlay.setAttribute("aria-hidden", "false");
    refreshTeacherDashboardList();
  }

  function hideTeacherDashboard() {
    if (!teacherDashboardOverlay) {
      return;
    }

    teacherDashboardOverlay.style.display = "none";
    teacherDashboardOverlay.setAttribute("aria-hidden", "true");
    revokeTeacherBlobUrls();

    if (teacherDashboardListEl) {
      teacherDashboardListEl.innerHTML = "";
    }
  }

  function openTeacherPortalEntry() {
    if (isStudentHomeAccessMode()) {
      return;
    }

    if (!isSchoolLicenseActive()) {
      hideTeacherPinModal();
      showLicenseActivationModal();
      return;
    }

    if (isTeacherMode()) {
      showTeacherDashboard();
      return;
    }

    showTeacherPinModal();
  }

  function cancelHomeLongPress() {
    if (homeLongPressTimer !== null) {
      window.clearTimeout(homeLongPressTimer);
      homeLongPressTimer = null;
    }
  }

  function getHomeScreenRect() {
    if (activeScreen !== "home") {
      return null;
    }

    const homeScreen = document.getElementById("screen-home");

    if (!homeScreen || !homeScreen.classList.contains("is-active")) {
      return null;
    }

    const rect = homeScreen.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return rect;
  }

  function isHomeTopScreenPoint(clientX, clientY) {
    const rect = getHomeScreenRect();

    if (!rect) {
      return false;
    }

    if (clientX < rect.left || clientX > rect.right) {
      return false;
    }

    if (clientY < rect.top || clientY > rect.bottom) {
      return false;
    }

    return clientY - rect.top <= rect.height * 0.3;
  }

  function getPointerClientPoint(event) {
    if (typeof event.clientX === "number" && typeof event.clientY === "number") {
      return { x: event.clientX, y: event.clientY };
    }

    const touch =
      (event.changedTouches && event.changedTouches[0]) ||
      (event.touches && event.touches[0]);

    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }

    return null;
  }

  function triggerTeacherAccess() {
    console.log("Teacher access triggered");
    cancelHomeLongPress();
    openTeacherPortalEntry();
  }

  function setupTeacherHiddenAccess() {
    function onHomeTopPointerDown(event) {
      const point = getPointerClientPoint(event);

      if (!point || !isHomeTopScreenPoint(point.x, point.y)) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      cancelHomeLongPress();
      homeLongPressPointerId =
        typeof event.pointerId === "number" ? event.pointerId : "touch";

      homeLongPressTimer = window.setTimeout(function () {
        homeLongPressTimer = null;
        homeLongPressPointerId = null;
        triggerTeacherAccess();
      }, HOME_LONG_PRESS_MS);
    }

    function onHomeTopPointerUp(event) {
      if (homeLongPressTimer === null) {
        return;
      }

      const samePointer =
        homeLongPressPointerId === null ||
        typeof event.pointerId !== "number" ||
        event.pointerId === homeLongPressPointerId;

      if (samePointer) {
        cancelHomeLongPress();
        homeLongPressPointerId = null;
      }
    }

    function onHomeTopPointerCancel() {
      cancelHomeLongPress();
      homeLongPressPointerId = null;
    }

    stage.addEventListener("pointerdown", onHomeTopPointerDown, true);
    stage.addEventListener("pointerup", onHomeTopPointerUp, true);
    stage.addEventListener("pointercancel", onHomeTopPointerCancel, true);

    stage.addEventListener(
      "touchstart",
      function (event) {
        if (window.PointerEvent) {
          return;
        }

        onHomeTopPointerDown(event);
      },
      { capture: true, passive: true }
    );

    stage.addEventListener(
      "touchend",
      function (event) {
        if (window.PointerEvent) {
          return;
        }

        onHomeTopPointerUp(event);
      },
      true
    );

    window.addEventListener(
      "keydown",
      function (event) {
        if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) {
          return;
        }

        const isTKey =
          event.code === "KeyT" ||
          String(event.key || "").toLowerCase() === "t";

        if (!isTKey) {
          return;
        }

        event.preventDefault();
        triggerTeacherAccess();
      },
      true
    );
  }

  function createTeacherPortalUi() {
    teacherLicenseOverlay = createLicenseActivationOverlay();
    teacherPinOverlay = createTeacherPinOverlay();
    teacherDashboardOverlay = createTeacherDashboardOverlay();

    setupTeacherHiddenAccess();

    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Escape" && isTeacherDashboardOpen()) {
          hideTeacherDashboard();
        }
      },
      true
    );
  }

  function initMobileEnvironment() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (engine && engine.initMobileEnvironment) {
      engine.initMobileEnvironment();
    }
  }

  function createPronunciationFeedbackElement(section) {
    const feedback = document.createElement("div");
    feedback.className = "pronunciation-feedback";
    feedback.setAttribute("aria-live", "polite");
    feedback.style.cssText =
      "position:absolute;left:50%;top:72%;transform:translateX(-50%);" +
      "padding:0.45em 0.9em;background:rgba(255,255,255,0.92);" +
      "border:2px solid #5c4a32;border-radius:12px;pointer-events:none;" +
      "font-family:" +
      BELAJAR_FONT +
      ";font-size:1rem;font-weight:700;color:#2a1f14;" +
      "text-shadow:0 1px 1px rgba(255,255,255,0.4);opacity:0;z-index:10;";
    section.appendChild(feedback);
    return feedback;
  }

  function showPronunciationVerdict(mode, spokenText, isCorrect, feedbackEl, screenName) {
    const config = PRONUNCIATION_FEEDBACK[mode] || PRONUNCIATION_FEEDBACK.belajar;
    const displaySpoken = String(spokenText || "").trim() || "(kosong)";

    if (config.showDetected) {
      showPronunciationFeedbackMessage(feedbackEl, "Dikesan: " + displaySpoken);
    } else {
      showPronunciationFeedbackMessage(
        feedbackEl,
        isCorrect ? config.correct : config.incorrect
      );
      return;
    }

    clearPronunciationFeedbackTimer();
    pronunciationFeedbackTimer = window.setTimeout(function () {
      pronunciationFeedbackTimer = null;

      if (activeScreen !== screenName) {
        return;
      }

      showPronunciationFeedbackMessage(
        feedbackEl,
        isCorrect ? config.correct : config.incorrect
      );
    }, 1400);
  }

  function stopBelajarAudio() {
    belajarAudioGeneration += 1;

    if (belajarAudio) {
      belajarAudio.pause();
      belajarAudio.currentTime = 0;
      belajarAudio = null;
    }
  }

  function getCurrentBelajarAudioText() {
    if (selectedCheckpoint === "suku_kata_kv") {
      const level = SUKU_KATA_KV_LEVELS[belajarLevelIndex];
      return level.items[belajarLevelItemIndex];
    }

    const items = getBelajarListItems();
    return items[belajarItemIndex];
  }

  function getBelajarAudioFolder() {
    return BELAJAR_AUDIO_FOLDERS[selectedCheckpoint] || selectedCheckpoint;
  }

  function getBelajarAudioPath(text) {
    return "audio/" + getBelajarAudioFolder() + "/" + text + ".mp3";
  }

  function getPronunciationCheckpoint() {
    return selectedCheckpoint;
  }

  function handleBelajarAudioFailure(audioPath) {
    window.alert("Audio belum tersedia: " + audioPath);
  }

  function isBelajarAudioCheckpoint() {
    return BELAJAR_AUDIO_CHECKPOINTS.indexOf(selectedCheckpoint) !== -1;
  }

  function playBelajarAudio() {
    if (!isBelajarAudioCheckpoint()) {
      return;
    }

    const currentItem = getCurrentBelajarAudioText();
    if (!currentItem) {
      return;
    }

    stopBelajarAudio();
    hideBelajarFeedback();

    const audioPath = getBelajarAudioPath(currentItem);
    const generation = belajarAudioGeneration;
    const audio = new Audio(audioPath);

    console.log("checkpoint:", selectedCheckpoint);
    console.log("item:", currentItem);
    console.log("audioPath:", audioPath);

    belajarAudio = audio;

    function finishPlayback() {
      if (generation !== belajarAudioGeneration) {
        return;
      }

      belajarAudio = null;
    }

    audio.addEventListener("ended", function () {
      finishPlayback();

      if (activeScreen === "belajar") {
        showBelajarFeedback("Sekarang cuba sebut!");
      }
    });

    audio.addEventListener("error", function () {
      finishPlayback();
      handleBelajarAudioFailure(audioPath);
    });

    audio.play().catch(function () {
      finishPlayback();
      handleBelajarAudioFailure(audioPath);
    });
  }

  function playBelajarDengar() {
    playBelajarAudio();
  }

  function isShortSoundBelajarCheckpoint(checkpoint) {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (engine && engine.isShortSoundCheckpoint) {
      return engine.isShortSoundCheckpoint(checkpoint);
    }

    return (
      checkpoint === "vokal" ||
      checkpoint === "konsonan" ||
      checkpoint === "suku_kata_kv"
    );
  }

  function delayMs(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function ensureBelajarSebutOverlay() {
    if (belajarSebutOverlayEl) {
      return;
    }

    const section = document.getElementById("screen-belajar");
    if (!section) {
      return;
    }

    belajarSebutOverlayEl = document.createElement("div");
    belajarSebutOverlayEl.id = "belajar-sebut-overlay";
    belajarSebutOverlayEl.setAttribute("aria-hidden", "true");

    belajarSebutOverlayMessageEl = document.createElement("p");
    belajarSebutOverlayMessageEl.id = "belajar-sebut-overlay-message";

    belajarSebutOverlayMicEl = document.createElement("div");
    belajarSebutOverlayMicEl.id = "belajar-sebut-overlay-mic";
    belajarSebutOverlayMicEl.textContent = "🎤";
    belajarSebutOverlayMicEl.setAttribute("aria-hidden", "true");

    belajarSebutOverlayEl.appendChild(belajarSebutOverlayMessageEl);
    belajarSebutOverlayEl.appendChild(belajarSebutOverlayMicEl);
    section.appendChild(belajarSebutOverlayEl);
  }

  function showBelajarSebutOverlay(message, showMic) {
    ensureBelajarSebutOverlay();

    if (!belajarSebutOverlayEl || !belajarSebutOverlayMessageEl) {
      return;
    }

    belajarSebutOverlayMessageEl.textContent = message;
    belajarSebutOverlayEl.classList.add("is-visible");
    belajarSebutOverlayEl.setAttribute("aria-hidden", "false");

    if (belajarSebutOverlayMicEl) {
      belajarSebutOverlayMicEl.classList.toggle("is-visible", !!showMic);
      belajarSebutOverlayMicEl.setAttribute(
        "aria-hidden",
        showMic ? "false" : "true"
      );
    }
  }

  function hideBelajarSebutOverlay() {
    if (!belajarSebutOverlayEl) {
      return;
    }

    belajarSebutOverlayEl.classList.remove("is-visible");
    belajarSebutOverlayEl.setAttribute("aria-hidden", "true");

    if (belajarSebutOverlayMicEl) {
      belajarSebutOverlayMicEl.classList.remove("is-visible");
      belajarSebutOverlayMicEl.setAttribute("aria-hidden", "true");
    }
  }

  function playBelajarAudioOnce() {
    return new Promise(function (resolve) {
      if (!isBelajarAudioCheckpoint()) {
        resolve();
        return;
      }

      const currentItem = getCurrentBelajarAudioText();
      if (!currentItem) {
        resolve();
        return;
      }

      stopBelajarAudio();

      const audioPath = getBelajarAudioPath(currentItem);
      const generation = belajarAudioGeneration;
      const audio = new Audio(audioPath);

      belajarAudio = audio;

      function finishPlayback() {
        if (generation !== belajarAudioGeneration) {
          resolve();
          return;
        }

        belajarAudio = null;
        resolve();
      }

      audio.addEventListener("ended", finishPlayback);
      audio.addEventListener("error", function () {
        finishPlayback();
        handleBelajarAudioFailure(audioPath);
      });

      audio.play().catch(function () {
        finishPlayback();
        handleBelajarAudioFailure(audioPath);
      });
    });
  }

  async function runShortSoundBelajarSebutFlow() {
    if (pronunciationRecordingBusy) {
      return;
    }

    pronunciationRecordingBusy = true;

    try {
      stopBelajarAudio();
      hideBelajarFeedback();

      showBelajarSebutOverlay("👂 Dengar cikgu", false);
      await playBelajarAudioOnce();

      if (activeScreen !== "belajar") {
        hideBelajarSebutOverlay();
        return;
      }

      showBelajarSebutOverlay("🎤 Giliran kamu! Ikut cikgu", true);
      await delayMs(2000);

      if (activeScreen !== "belajar") {
        hideBelajarSebutOverlay();
        return;
      }

      showBelajarSebutOverlay("⭐ Bagus! Teruskan", false);
      await delayMs(1000);
      hideBelajarSebutOverlay();
    } finally {
      pronunciationRecordingBusy = false;
    }
  }

  function stopPronunciationCapture() {
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (engine && engine.stopActiveSession) {
      engine.stopActiveSession();
    }
  }

  function isBelajarWordModeCheckpoint(checkpoint) {
    return (
      checkpoint === "perkataan_vkv" || checkpoint === "perkataan_kvkv"
    );
  }

  function mapBelajarWordSebutErrorToUnavailable(error) {
    if (!error) {
      return null;
    }

    const message = String(error.message || error);
    const lowerMessage = message.toLowerCase();

    if (
      message.indexOf("tidak disokong") !== -1 ||
      message.indexOf("Mikrofon") !== -1 ||
      message.indexOf("MediaRecorder") !== -1 ||
      lowerMessage.indexOf("pengecaman suara") !== -1 ||
      message.indexOf("Akses Mic Disekat") !== -1 ||
      error.code === "insecure-mic"
    ) {
      return {
        mode: "api_unavailable",
        reasonKey: message,
      };
    }

    return null;
  }

  function resetBelajarWordGoogleApiFailStreak() {
    belajarWordGoogleApiFailStreak = 0;
  }

  function recordBelajarWordGoogleApiFailure() {
    belajarWordGoogleApiFailStreak += 1;
    return belajarWordGoogleApiFailStreak >= BELAJAR_WORD_GOOGLE_API_FAIL_THRESHOLD;
  }

  function ensureBelajarWordAiFallbackOverlay() {
    if (belajarWordAiFallbackOverlayEl) {
      return;
    }

    const section = document.getElementById("screen-belajar");
    if (!section) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "belajar-word-ai-fallback-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:125;display:none;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:1rem;padding:1.25em;" +
      "background:rgba(255,252,245,0.94);pointer-events:auto;";

    const message = document.createElement("p");
    message.id = "belajar-word-ai-fallback-message";
    message.textContent =
      "Google API pengecaman suara tidak berfungsi sekarang.";
    message.style.cssText =
      "margin:0;color:#2a1f14;font-family:" +
      BELAJAR_FONT +
      ";font-size:clamp(1rem,4.5vmin,1.55rem);font-weight:700;" +
      "text-align:center;line-height:1.35;white-space:pre-line;max-width:18em;";

    const actions = document.createElement("div");
    actions.style.cssText =
      "display:flex;flex-wrap:wrap;justify-content:center;gap:0.75em;width:100%;max-width:22em;";

    function makeBtn(label) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText =
        "flex:1 1 9em;margin:0;padding:0.65em 1em;border:2px solid #5c4a32;" +
        "border-radius:14px;background:linear-gradient(180deg,#fff8e8 0%,#ffe7b8 100%);" +
        "color:#2a1f14;cursor:pointer;font-family:" +
        BELAJAR_FONT +
        ";font-size:clamp(0.95rem,3.8vmin,1.15rem);font-weight:700;" +
        "touch-action:manipulation;";
      return btn;
    }

    const latihanBtn = makeBtn("Buat Latihan Pilih");
    latihanBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openLatihanChoiceFromBelajarWordAiFallback();
    });

    const tulisBtn = makeBtn("Langkau Sebut & Pergi ke Tulis");
    tulisBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openTulisFromBelajarWordAiFallback();
    });

    actions.appendChild(latihanBtn);
    actions.appendChild(tulisBtn);
    overlay.appendChild(message);
    overlay.appendChild(actions);
    section.appendChild(overlay);
    belajarWordAiFallbackOverlayEl = overlay;
  }

  function showBelajarWordAiFallbackOverlay() {
    ensureBelajarWordAiFallbackOverlay();

    if (!belajarWordAiFallbackOverlayEl) {
      return;
    }

    belajarWordAiFallbackOverlayEl.style.display = "flex";
    belajarWordAiFallbackOverlayEl.setAttribute("aria-hidden", "false");
    pronunciationRecordingBusy = false;
  }

  function hideBelajarWordAiFallbackOverlay() {
    if (!belajarWordAiFallbackOverlayEl) {
      return;
    }

    belajarWordAiFallbackOverlayEl.style.display = "none";
    belajarWordAiFallbackOverlayEl.setAttribute("aria-hidden", "true");
  }

  function openLatihanChoiceFromBelajarWordAiFallback() {
    hideBelajarWordAiFallbackOverlay();
    resetBelajarWordGoogleApiFailStreak();
    pronunciationRecordingBusy = false;
    hidePronunciationFeedback(belajarFeedback);
    hideBelajarFeedback();
    latihanChoiceQuestionNum = 1;
    ensureLatihanChoiceQuestionPlan(true);
    void markCabaranLearningStep("belajar");
    showScreen("latihan");
  }

  function openTulisFromBelajarWordAiFallback() {
    hideBelajarWordAiFallbackOverlay();
    resetBelajarWordGoogleApiFailStreak();
    pronunciationRecordingBusy = false;
    hidePronunciationFeedback(belajarFeedback);
    hideBelajarFeedback();
    tulisPreviousScreen = "belajar";
    showScreen("tulis");
  }

  function handleBelajarWordSebutApiUnavailable(feedbackEl) {
    const el = getBelajarFeedbackElement() || feedbackEl;

    if (recordBelajarWordGoogleApiFailure()) {
      resetBelajarWordGoogleApiFailStreak();
      showBelajarWordAiFallbackOverlay();
      return;
    }

    showBelajarWordSebutFeedback(el, "Cuba tekan Sebut sekali lagi.");
  }

  async function runBelajarWordSebutHybrid(options) {
    const screenName = options.screenName || "belajar";
    const targetText = options.targetText;
    const checkpoint = options.checkpoint || getPronunciationCheckpoint();
    const feedbackEl = getBelajarFeedbackElement() || options.feedbackEl;
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;
    let result = null;

    showBelajarWordSebutFeedback(feedbackEl, "Dengar... Sila sebut!");

    try {
      if (!engine || !engine.runBelajarWordSebut) {
        console.error("[Belajar Sebut] runBelajarWordSebut tidak tersedia.");
        handleBelajarWordSebutApiUnavailable(feedbackEl);
        return;
      }

      result = await engine.runBelajarWordSebut({
        checkpointId: checkpoint,
        targetText: targetText,
      });
    } catch (sebutError) {
      console.error("[Belajar Sebut] Ralat semasa Sebut", sebutError);

      if (activeScreen !== screenName) {
        return;
      }

      const unavailable = mapBelajarWordSebutErrorToUnavailable(sebutError);

      if (unavailable) {
        handleBelajarWordSebutApiUnavailable(feedbackEl);
        return;
      }

      showBelajarWordSebutFeedback(feedbackEl, "Cuba tekan Sebut sekali lagi.");
      return;
    }

    if (activeScreen !== screenName) {
      return;
    }

    if (result && result.mode === "api_unavailable") {
      handleBelajarWordSebutApiUnavailable(feedbackEl);
      return;
    }

    if (result && (result.mode === "ai_verified" || result.mode === "ai_failed")) {
      resetBelajarWordGoogleApiFailStreak();
      renderBelajarWordSebutFeedback(feedbackEl, result, checkpoint, targetText);
      void persistBelajarWordAssessmentSilently();
      return;
    }

    renderBelajarWordSebutFeedback(feedbackEl, result, checkpoint, targetText);
  }

  async function runHybridSebutFlow(options) {
    const mode = options.mode || "belajar";
    const screenName = options.screenName || mode;
    const targetText = options.targetText;
    const feedbackEl = options.feedbackEl;
    const checkpoint = options.checkpoint || getPronunciationCheckpoint();
    const feedback = PRONUNCIATION_FEEDBACK[mode] || PRONUNCIATION_FEEDBACK.belajar;
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    try {
      if (!targetText) {
        console.warn("[KMJ] No target text, aborting");
        return;
      }

      if (!engine || !engine.initDatabase) {
        showPronunciationFeedbackMessage(feedbackEl, feedback.unsupported);
        return;
      }

      await engine.initDatabase();

      if (!engine.getLoggedInStudent || !engine.getLoggedInStudent()) {
        showPronunciationFeedbackMessage(
          feedbackEl,
          "Sila log masuk: Pilih Kelas dan Nama Anda."
        );
        return;
      }

      if (engine.isShortSoundCheckpoint(checkpoint)) {
        resetDeferredSebutUi(feedbackEl);
        showPronunciationFeedbackMessage(feedbackEl, "Sila sebut...");

        await engine.runDeferredCapture({
          checkpointId: checkpoint,
          targetText: targetText,
        });

        if (activeScreen !== screenName) {
          return;
        }

        hidePronunciationFeedback(feedbackEl);
        showStudentRecordSaved(feedbackEl);
        return;
      }

      if (engine.isWordModeCheckpoint(checkpoint)) {
        if (mode === "belajar" && engine.runBelajarWordSebut) {
          await runBelajarWordSebutHybrid(options);
          return;
        }

        showPronunciationFeedbackMessage(feedbackEl, "Dengar... Sila sebut!");

        const result = await engine.runAutomatedMalay({
          checkpointId: checkpoint,
          targetText: targetText,
        });

        if (activeScreen !== screenName) {
          return;
        }

        hidePronunciationFeedback(feedbackEl);

        if (result.mode === "ai_verified") {
          void notifyStudentAssessmentSaved(
            feedbackEl,
            formatWordModeDetected(
              result.transcript,
              result.similarityPercent,
              "AI Lulus"
            )
          );
          return;
        }

        if (result.mode === "ai_failed") {
          let failBase = "Rakaman disimpan.";

          if (result.failReason === "unclear") {
            failBase += " Sebutan kurang jelas — Cuba lagi.";
          } else if (result.failReason === "malay_only") {
            failBase +=
              " Sila gunakan sebutan Bahasa Melayu sepenuhnya — Cuba lagi.";
          } else {
            failBase += " Cuba lagi 😊";
          }

          void notifyStudentAssessmentSaved(feedbackEl, failBase);
          return;
        }
      }

      showPronunciationFeedbackMessage(feedbackEl, feedback.listeningError);
    } catch (error) {
      console.error("[KMJ] Hybrid flow error", error);

      if (activeScreen !== screenName) {
        return;
      }

      if (
        mode === "belajar" &&
        isBelajarWordModeCheckpoint(checkpoint) &&
        engine &&
        engine.runBelajarWordSebut
      ) {
        const unavailable = mapBelajarWordSebutErrorToUnavailable(error);

        hidePronunciationFeedback(feedbackEl);

        if (unavailable) {
          handleBelajarWordSebutApiUnavailable(feedbackEl);
          return;
        }
      }

      if (showMicOrSpeechSecurityAlert(error)) {
        hidePronunciationFeedback(feedbackEl);
        return;
      }

      if (
        error &&
        (String(error.message).indexOf("tidak disokong") !== -1 ||
          String(error.message).indexOf("MediaRecorder") !== -1 ||
          String(error.message).indexOf("Mikrofon") !== -1)
      ) {
        showPronunciationFeedbackMessage(feedbackEl, feedback.unsupported);
        return;
      }

      showPronunciationFeedbackMessage(feedbackEl, feedback.listeningError);
    } finally {
      pronunciationRecordingBusy = false;
    }
  }

  function resetDeferredSebutUi(feedbackEl) {
    hidePronunciationFeedback(feedbackEl);
    hideBelajarFeedback();
    stopPronunciationCapture();
  }

  function startPronunciationListening(options) {
    const feedbackEl = options.feedbackEl;
    const onBeforeListen = options.onBeforeListen;
    const checkpoint = options.checkpoint || getPronunciationCheckpoint();
    const engine = window.KMJ_Assessment || window.KMJ_Pronunciation;

    if (pronunciationRecordingBusy) {
      console.warn("[Sebut] Already recording, ignoring click");
      return;
    }

    try {
      if (onBeforeListen) {
        onBeforeListen();
      }

      if (engine && engine.isShortSoundCheckpoint(checkpoint)) {
        resetDeferredSebutUi(feedbackEl);
      } else {
        if (
          !(
            (options.mode || "belajar") === "belajar" &&
            isBelajarWordModeCheckpoint(checkpoint)
          )
        ) {
          hidePronunciationFeedback(feedbackEl);
        }

        stopPronunciationCapture();
      }

      pronunciationRecordingBusy = true;
      runHybridSebutFlow(options);
    } catch (error) {
      pronunciationRecordingBusy = false;
      console.error("[Sebut] startPronunciationListening error", error);

      const feedback =
        PRONUNCIATION_FEEDBACK[options.mode || "belajar"] ||
        PRONUNCIATION_FEEDBACK.belajar;
      showPronunciationFeedbackMessage(feedbackEl, feedback.listeningError);
    }
  }

  function startBelajarSebut() {
    const checkpoint = getPronunciationCheckpoint();

    if (isShortSoundBelajarCheckpoint(checkpoint)) {
      runShortSoundBelajarSebutFlow();
      return;
    }

    startPronunciationListening({
      mode: "belajar",
      screenName: "belajar",
      checkpoint: checkpoint,
      targetText: getCurrentBelajarAudioText(),
      feedbackEl: getBelajarFeedbackElement(),
      onBeforeListen: function () {
        stopBelajarAudio();
      },
    });
  }

  function startLatihanPronunciation(targetText, checkpoint) {
    startPronunciationListening({
      mode: "latihan",
      screenName: "latihan",
      checkpoint: checkpoint || getPronunciationCheckpoint(),
      targetText: targetText,
      feedbackEl: latihanFeedback,
      onBeforeListen: function () {
        hidePronunciationFeedback(latihanFeedback);
      },
    });
  }

  function startCabaranPronunciation(targetText, checkpoint) {
    startPronunciationListening({
      mode: "cabaran",
      screenName: "cabaran",
      checkpoint: checkpoint || getPronunciationCheckpoint(),
      targetText: targetText,
      feedbackEl: cabaranFeedback,
      onBeforeListen: function () {
        clearCabaranFeedback();
      },
    });
  }

  function getBelajarListItems() {
    return BELAJAR_CONTENT[selectedCheckpoint] || BELAJAR_CONTENT.vokal;
  }

  function applyBelajarTypography() {
    if (!belajarWordDisplay) {
      return;
    }

    if (belajarLevelDisplay) {
      belajarLevelDisplay.style.transform = "none";
    }

    if (selectedCheckpoint === "suku_kata_kv") {
      belajarWordDisplay.style.fontSize = "7.6rem";
      belajarWordDisplay.style.transform = "translateY(-4px)";

      if (
        belajarLevelDisplay &&
        belajarLevelDisplay.style.display !== "none"
      ) {
        belajarLevelDisplay.style.transform = "translateY(-15px)";
      }

      return;
    }

    belajarWordDisplay.style.fontSize =
      BELAJAR_FONT_SIZES[selectedCheckpoint] || BELAJAR_FONT_SIZES.vokal;
    belajarWordDisplay.style.transform = "none";
  }

  function resetBelajarSession() {
    belajarItemIndex = 0;
    belajarLevelIndex = 0;
    belajarLevelItemIndex = 0;
    updateBelajarWordDisplay();
  }

  function updateBelajarWordDisplay(options) {
    if (!belajarWordDisplay) {
      return;
    }

    const autoPlayBelajar = !options || options.autoPlay !== false;

    hideBelajarFeedback();
    stopBelajarAudio();
    stopPronunciationCapture();

    if (selectedCheckpoint === "suku_kata_kv") {
      const level = SUKU_KATA_KV_LEVELS[belajarLevelIndex];
      const item = level.items[belajarLevelItemIndex];

      if (belajarLevelDisplay) {
        belajarLevelDisplay.textContent = level.level + ": " + level.title;
        belajarLevelDisplay.style.display = "block";
      }

      belajarWordDisplay.textContent = item;
      applyBelajarTypography();

      if (autoPlayBelajar) {
        playBelajarAudio();
      }

      return;
    }

    const items = getBelajarListItems();
    const item = items[belajarItemIndex];

    if (belajarLevelDisplay) {
      belajarLevelDisplay.textContent = "";
      belajarLevelDisplay.style.display = "none";
    }

    belajarWordDisplay.textContent = item;
    applyBelajarTypography();

    if (autoPlayBelajar) {
      playBelajarAudio();
    }
  }

  function belajarNext() {
    let shouldAutoPlay = false;

    if (selectedCheckpoint === "suku_kata_kv") {
      const prevLevel = belajarLevelIndex;
      const prevItem = belajarLevelItemIndex;
      const level = SUKU_KATA_KV_LEVELS[belajarLevelIndex];

      if (belajarLevelItemIndex < level.items.length - 1) {
        belajarLevelItemIndex += 1;
      } else if (belajarLevelIndex < SUKU_KATA_KV_LEVELS.length - 1) {
        belajarLevelIndex += 1;
        belajarLevelItemIndex = 0;
      }

      if (
        belajarLevelIndex !== prevLevel ||
        belajarLevelItemIndex !== prevItem
      ) {
        shouldAutoPlay = true;
      }
    } else {
      const items = getBelajarListItems();
      if (belajarItemIndex < items.length - 1) {
        belajarItemIndex += 1;
        shouldAutoPlay = true;
      }
    }

    updateBelajarWordDisplay({ autoPlay: shouldAutoPlay });
  }

  function belajarPrev() {
    let shouldAutoPlay = false;

    if (selectedCheckpoint === "suku_kata_kv") {
      const prevLevel = belajarLevelIndex;
      const prevItem = belajarLevelItemIndex;

      if (belajarLevelItemIndex > 0) {
        belajarLevelItemIndex -= 1;
      } else if (belajarLevelIndex > 0) {
        belajarLevelIndex -= 1;
        belajarLevelItemIndex =
          SUKU_KATA_KV_LEVELS[belajarLevelIndex].items.length - 1;
      }

      if (
        belajarLevelIndex !== prevLevel ||
        belajarLevelItemIndex !== prevItem
      ) {
        shouldAutoPlay = true;
      }
    } else {
      if (belajarItemIndex > 0) {
        belajarItemIndex -= 1;
        shouldAutoPlay = true;
      }
    }

    updateBelajarWordDisplay({ autoPlay: shouldAutoPlay });
  }

  function startTransitionFlow() {
    showScreen("transition");
    transitionTimer = window.setTimeout(function () {
      transitionTimer = null;
      showScreen("belajar");
    }, TRANSITION_MS);
  }

  function onStageClick(event) {
    const btn = event.target.closest(".hotspot");
    if (!btn || !btn.dataset.action) {
      return;
    }

    event.preventDefault();

    const action = btn.dataset.action;

    if (action === "student-login" && btn.dataset.target) {
      if (applyStudentLogin()) {
        showScreen(btn.dataset.target);
      }
      return;
    }

    if (action === "go" && btn.dataset.target) {
      if (btn.dataset.target === "ujian" && !SCREENS.ujian) {
        window.alert("Ujian akan dibina selepas Latihan.");
        return;
      }

      showScreen(btn.dataset.target);
      return;
    }

    if (action === "alert" && btn.dataset.message) {
      window.alert(btn.dataset.message);
      return;
    }

    if (action === "belajar-dengar") {
      playBelajarDengar();
      return;
    }

    if (action === "belajar-sebut") {
      startBelajarSebut();
      return;
    }

    if (action === "transition") {
      if (btn.dataset.hotspot) {
        selectedCheckpoint = btn.dataset.hotspot;
      }
      startTransitionFlow();
      return;
    }

    if (action === "belajar-prev") {
      belajarPrev();
      return;
    }

    if (action === "belajar-next") {
      belajarNext();
      return;
    }

    if (action === "tulis-replay-demo") {
      runTulisDemoAnimation();
      return;
    }

    if (action === "tulis-clear") {
      clearTulisCanvas();
      return;
    }

    if (action === "tulis-next") {
      openNextWritingTarget();
      return;
    }

    if (action === "tulis-back") {
      showScreen(tulisPreviousScreen || "belajar");
      return;
    }

    if (action === "latihan-replay-audio") {
      playLatihanChoiceAudio();
      return;
    }

    if (action === "latihan-next") {
      openNextLatihanChoiceQuestion();
      return;
    }

    if (action === "latihan-back") {
      showScreen("belajar");
      return;
    }

    if (action === "latihan-susun-replay") {
      resetLatihanSusunQuestion();
      return;
    }

    if (action === "latihan-susun-next") {
      handleLatihanSusunSeterusnyaClick();
      return;
    }

    if (action === "latihan-susun-back") {
      showScreen("belajar");
      return;
    }

    if (action === "cabaran-ulang") {
      replayCabaranQuestionAudioOnly();
      return;
    }

    if (action === "cabaran-exit") {
      exitCabaranToHome();
      return;
    }

    if (action === "cabaran-submenu") {
      returnToCurrentCheckpointSubmenu();
      return;
    }
  }

  if (DEBUG_CABARAN_LAYOUT) {
    loadCabaranLayoutDebugFromStorage();
  }

  buildScreens();
  bindStudentSyncStatusListeners();
  applyDebugMode();
  applyTulisDebugMode();
  applyLatihanEasyAdjustMode();
  applyLatihanSusunAdjustMode();
  createTeacherPortalUi();
  initMobileEnvironment();

  void initStudentHomeAccessMode().then(function () {
    if (isTeacherMode()) {
      if (isStudentHomeAccessMode()) {
        setTeacherMode(false);
      } else if (isSchoolLicenseActive()) {
        showTeacherDashboard();
      } else {
        setTeacherMode(false);
      }
    }

    showScreen("home");
  });
})();
