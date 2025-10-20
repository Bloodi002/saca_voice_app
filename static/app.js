(function(){
  const PREF_KEY='sacaPrefs', LS_KEY='sacaHistory', AUTH_KEY='sacaAuth';
  const qs = s=>document.querySelector(s);
  const STR = window.STR;

  const heroIntro = qs('#heroIntro');
  const micButton = qs('#micHome');
  const micText = micButton?.querySelector('.mic-text');
  const showGuidedBtn = qs('#showGuided');
  const getStartedBtn = qs('#getStartedBtn');
  const howToBtn = qs('#howToBtn');
  const howToModal = qs('#howToModal');
  const howToClose = qs('#dismissHowTo');
  const howToBackdrop = qs('#closeHowTo');
  const guidedBox = qs('#guidedBox');
  const guidedActions = qs('#guidedActions');
  const questionText = qs('#questionText');
  const questionHeading = qs('#questionHeading');
  const questionProgress = qs('#questionProgress');
  const entryProgress = qs('#entryProgress');
  const answerInput  = qs('#answerInput');
  const answerInputWrap = answerInput?.closest('.pill-input') || null;
  const questionActions = answerInputWrap?.closest('.question-actions') || qs('.question-actions');
  const nextBtn      = qs('#nextQuestion');
  const analysisCard = qs('#sacaResult');
  const analysisCondition = qs('#analysisCondition');
  const analysisSeverity = qs('#analysisSeverity');
  const analysisAdvice = qs('#analysisAdvice');
  const analysisTimestamp = qs('#analysisTimestamp');
  const severityRow = qs('#severityRow');
  const entryChoice = qs('#entryChoice');
  const entrySpeakBtn = qs('#entrySpeak');
  const entryTypeBtn = qs('#entryType');
  const entryTextWrap = qs('#entryTextWrap');
  const entryText = qs('#entryText');
  const entryTextSubmit = qs('#entryTextSubmit');
  const entryTextCancel = qs('#entryTextCancel');
  const entryPresetContainer = qs('#entrySymptomOptions');
  const entryPresetButtons = entryPresetContainer ? Array.from(entryPresetContainer.querySelectorAll('.entry-choice-card')) : [];
  const refreshBtn = qs('#resetExperience');
  const historyCard = qs('#historyCard');
  const homeCards = qs('#homeCards');
  const historyContent = qs('#historyContent');
  const historyLocked = qs('#historyLocked');
  const histCards = qs('#histCards');
  const histEmpty = qs('#histEmpty');
  const historyTrigger = qs('#historyTrigger');
  const historyModal = qs('#historyModal');
  const historyBackdrop = qs('#closeHistory');
  const historyDismiss = qs('#dismissHistory');
  const openAuth = qs('#openAuth');
  const logoutBtn = qs('#logoutBtn');
  const loginEmail = qs('#loginEmail');
  const loginPass = qs('#loginPass');
  const authEls = document.querySelectorAll('[data-requires-auth]');
  const authModal = qs('#authModal');
  const authBackdrop = qs('#closeAuth');
  const authDismiss = qs('#dismissAuth');
  const authTabs = Array.from(document.querySelectorAll('.auth-tab'));
  const loginForm = qs('#loginForm');
  const signupForm = qs('#signupForm');
  const signupEmail = qs('#signupEmail');
  const signupPass = qs('#signupPass');
  const signupConfirm = qs('#signupConfirm');
  const authMessage = qs('#authMessage');
  const langToggle = qs('#langToggle');
  const langLabel = qs('#langLabel');

  const DEFAULT_CONDITION = "We'll share the likely condition once we review your details.";
  const DEFAULT_SEVERITY = "We're still gauging how serious things are.";
  const DEFAULT_ADVICE = "Next steps will appear here as soon as we have a recommendation.";
  const DEFAULT_TIMESTAMP = "Waiting for your check-in.";
  const SEVERITY_CLASSES = ['severity-unknown','severity-mild','severity-moderate','severity-severe'];
  const MIC_COPY = {
    idle: { key:'home.mic', fallback:'Tap to speak' },
    listening: { key:'home.micListening', fallback:'Listening...' },
    submitting: { key:'home.micSubmitting', fallback:'Processing...' }
  };
  const USERS_KEY = 'sacaUsers';
  const MIN_PASSWORD_LENGTH = 6;

  const prefs = JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
  let auth = null;
  try{ auth = JSON.parse(localStorage.getItem(AUTH_KEY)||'null'); }
  catch(err){ auth = null; }
  if(!prefs.lang || !['en','ae'].includes(prefs.lang)) prefs.lang = 'en';
  const LANGUAGE_SEQUENCE = ['en','ae'];
  const LANGUAGE_META = {
    en:{ labelKey:'languageEn', toggleKey:'switchToAe', next:'ae' },
    ae:{ labelKey:'languageAe', toggleKey:'switchToEnglish', next:'en' }
  };
  const langSelect = qs('#langSelect');
  const themeSelect = qs('#themeSelect');
  const contrastToggle = qs('#contrastToggle');
  const easyToggle = qs('#easyToggle');

  const questions = [
    { text: "How are you feeling today?", type: "text" },
    { text: "How long have you been feeling this?", type: "choice", options: ["A few hours","A day","2-3 days","A week or more"] },
    { text: "How bad is the issue?", type: "choice", options: ["Light","Medium","Severe"] },
    { text: "Have you noticed any other symptoms?", type: "choice", options: ["Fever","Nausea or vomiting","Cough or breathing difficulty","Diarrhea","Chest pain","Dizziness or fatigue"] }
  ];
  const BASE_QUESTION_COUNT = questions.length;

  let currentQuestion = 0;
  let currentAnswers = [];
  let guidedStarted = false;

  let mediaRecorder = null;
  let audioChunks = [];
  let micStream = null;
  let recordingState = 'idle';
  let activeMicButton = micButton;
  let entryFlowMode = null;
  let pendingNormalizedText = "";
  let sessionHistory = [];

  const ICONS = {
    clock: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="clockGlow" cx="48%" cy="32%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"/>
      <stop offset="45%" stop-color="#ffe3bc" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff9a4c"/>
    </radialGradient>
    <linearGradient id="clockFace" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff7ec"/>
      <stop offset="55%" stop-color="#ffdaba"/>
      <stop offset="100%" stop-color="#ffa565"/>
    </linearGradient>
    <linearGradient id="clockHand" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffcf6d"/>
      <stop offset="100%" stop-color="#ff6b3b"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#clockGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#803113" opacity="0.18"/>
    <circle cx="36" cy="36" r="18" fill="url(#clockFace)" stroke="#ffb36d" stroke-width="3"/>
    <path d="M36 22v14l10 6" stroke="url(#clockHand)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="36" cy="36" r="3.5" fill="#ffffff" stroke="#ff7b3d" stroke-width="1.5"/>
    <circle cx="36" cy="24" r="2.4" fill="#fff1e2" opacity="0.7"/>
    <circle cx="26" cy="36" r="2" fill="#fff1e2" opacity="0.6"/>
    <circle cx="36" cy="46" r="2" fill="#fff1e2" opacity="0.6"/>
  </g>
</svg>`,
    calendarDay: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="calDayGlow" cx="50%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"/>
      <stop offset="45%" stop-color="#dff7ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#4db6ff"/>
    </radialGradient>
    <linearGradient id="calDayBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f4fbff"/>
      <stop offset="55%" stop-color="#cfeeef"/>
      <stop offset="100%" stop-color="#6fd0ff"/>
    </linearGradient>
    <linearGradient id="calDayClip" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#7dd8ff"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#calDayGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#1b4d71" opacity="0.2"/>
    <rect x="22" y="18" width="36" height="44" rx="10" fill="url(#calDayBody)" stroke="#8adfff" stroke-width="2.6"/>
    <rect x="28" y="14" width="24" height="12" rx="6" fill="url(#calDayClip)" stroke="#9ce3ff" stroke-width="2"/>
    <path d="M28 30h24" stroke="#4fbaff" stroke-width="4" stroke-linecap="round"/>
    <rect x="34" y="38" width="12" height="12" rx="4" fill="#ffffff" stroke="#3aa3ef" stroke-width="2.4"/>
    <path d="M38 44h6" stroke="#37a2f2" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`,
    calendarRange: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="calRangeGlow" cx="48%" cy="28%" r="74%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#ffe0ef" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff6fae"/>
    </radialGradient>
    <linearGradient id="calRangeBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff3fa"/>
      <stop offset="60%" stop-color="#ffd0e7"/>
      <stop offset="100%" stop-color="#ff85c1"/>
    </linearGradient>
    <linearGradient id="calRangeHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe6f3"/>
      <stop offset="100%" stop-color="#ff7fb9"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#calRangeGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#7c2450" opacity="0.18"/>
    <rect x="22" y="18" width="36" height="44" rx="10" fill="url(#calRangeBody)" stroke="#ffa1cc" stroke-width="2.6"/>
    <rect x="28" y="14" width="24" height="12" rx="6" fill="url(#calRangeHighlight)" stroke="#ffb7d8" stroke-width="2"/>
    <path d="M28 30h24" stroke="#ff8dc3" stroke-width="4" stroke-linecap="round"/>
    <rect x="30" y="38" width="10" height="12" rx="4" fill="#ffffff" stroke="#ff7fb9" stroke-width="2.4"/>
    <rect x="40" y="38" width="14" height="12" rx="4" fill="#ffffff" stroke="#ff7fb9" stroke-width="2.4"/>
    <path d="M32 44h6M42 44h10" stroke="#ff73b3" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`,
    calendarWeek: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="calWeekGlow" cx="52%" cy="30%" r="74%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.94"/>
      <stop offset="45%" stop-color="#dff8d1" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#63d07b"/>
    </radialGradient>
    <linearGradient id="calWeekBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#effff0"/>
      <stop offset="55%" stop-color="#cbf4d3"/>
      <stop offset="100%" stop-color="#7ae39f"/>
    </linearGradient>
    <linearGradient id="calWeekClip" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#83e5a0"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#calWeekGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#1b6a32" opacity="0.18"/>
    <rect x="22" y="18" width="36" height="44" rx="10" fill="url(#calWeekBody)" stroke="#8deeab" stroke-width="2.6"/>
    <rect x="28" y="14" width="24" height="12" rx="6" fill="url(#calWeekClip)" stroke="#95f0b3" stroke-width="2"/>
    <path d="M28 30h24" stroke="#62d684" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 40h24" stroke="#51cf77" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 48h24" stroke="#46c76c" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`,
    severityLight: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="sevLightGlow" cx="50%" cy="35%" r="72%">
      <stop offset="0%" stop-color="#f5fbff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#d0ecff" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#4b9dff"/>
    </radialGradient>
    <linearGradient id="sevLightWave" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e6f5ff"/>
      <stop offset="60%" stop-color="#9cd1ff"/>
      <stop offset="100%" stop-color="#4b9dff"/>
    </linearGradient>
    <linearGradient id="sevLightMeter" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#7ab6ff" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#sevLightGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#1a4f8f" opacity="0.18"/>
    <path d="M20 48c4-12 20-20 32-12" stroke="url(#sevLightWave)" stroke-width="8" stroke-linecap="round" opacity="0.4"/>
    <path d="M28 50c3-7 14-12 20-8" stroke="url(#sevLightWave)" stroke-width="9" stroke-linecap="round"/>
    <circle cx="48" cy="42" r="9" fill="url(#sevLightMeter)" stroke="#3b89ef" stroke-width="2.6"/>
    <path d="M48 36v6" stroke="#3b89ef" stroke-width="3" stroke-linecap="round"/>
    <circle cx="48" cy="44" r="2.6" fill="#ffffff" opacity="0.85"/>
  </g>
</svg>`,
    severityModerate: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="sevModGlow" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#fff9e8" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#ffe6a8" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffb629"/>
    </radialGradient>
    <linearGradient id="sevModBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff7d0"/>
      <stop offset="60%" stop-color="#ffe087"/>
      <stop offset="100%" stop-color="#ffb629"/>
    </linearGradient>
    <linearGradient id="sevModMark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff0c2"/>
      <stop offset="100%" stop-color="#ff8f0f"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#sevModGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#91601b" opacity="0.2"/>
    <path d="M40 18 61 56a4 4 0 0 1-3.5 6H22.5a4 4 0 0 1-3.5-6Z" fill="url(#sevModBody)" stroke="#ffbe42" stroke-width="3"/>
    <path d="M40 28v14" stroke="url(#sevModMark)" stroke-width="6" stroke-linecap="round"/>
    <circle cx="40" cy="48" r="3.6" fill="#ff8f0f" stroke="#fff1c9" stroke-width="2"/>
  </g>
</svg>`,
    severitySevere: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="sevSevereGlow" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#ffe6ec" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#ff9aa9" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff394f"/>
    </radialGradient>
    <linearGradient id="sevSevereBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffe3e9"/>
      <stop offset="55%" stop-color="#ff7887"/>
      <stop offset="100%" stop-color="#ff1f3d"/>
    </linearGradient>
    <linearGradient id="sevSevereLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff8d99" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#sevSevereGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#6f1322" opacity="0.22"/>
    <rect x="26" y="18" width="28" height="32" rx="8" fill="url(#sevSevereBody)" stroke="#ff4459" stroke-width="3"/>
    <path d="M26 38h28" stroke="#ff8d99" stroke-width="4" opacity="0.45"/>
    <circle cx="40" cy="52" r="12" fill="#2b0a13" opacity="0.35"/>
    <path d="M30 22c3 6 10 6 10 6s7 0 10-6" stroke="url(#sevSevereLight)" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
    <path d="M40 30v10" stroke="#fff0f2" stroke-width="5" stroke-linecap="round"/>
    <path d="M40 44v8" stroke="#ffb0ba" stroke-width="5" stroke-linecap="round"/>
    <circle cx="40" cy="56" r="4.5" fill="#ffffff" stroke="#ff3c55" stroke-width="2"/>
  </g>
</svg>`,
    thermo: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="thermoGlow" cx="48%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#ffe2df" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff5f7f"/>
    </radialGradient>
    <linearGradient id="thermoBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff3f4"/>
      <stop offset="55%" stop-color="#ffd1d7"/>
      <stop offset="100%" stop-color="#ff6d86"/>
    </linearGradient>
    <linearGradient id="thermoMercury" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff9fb1"/>
      <stop offset="100%" stop-color="#ff275a"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#thermoGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#741f33" opacity="0.18"/>
    <rect x="30" y="18" width="12" height="34" rx="6" fill="url(#thermoBody)" stroke="#ff8da4" stroke-width="2.4"/>
    <circle cx="36" cy="55" r="11" fill="url(#thermoMercury)" stroke="#ff476c" stroke-width="3"/>
    <rect x="34" y="22" width="4.5" height="24" rx="2.2" fill="#ff275a" opacity="0.8"/>
    <path d="M38 28h6" stroke="#ff9fb1" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <path d="M38 36h6" stroke="#ff9fb1" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
    <path d="M38 44h6" stroke="#ff9fb1" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
  </g>
</svg>`,
    lungs: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="lungsGlow" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#e0f7ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#66c7ff"/>
    </radialGradient>
    <linearGradient id="lungsLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f3fbff"/>
      <stop offset="100%" stop-color="#7dd4ff"/>
    </linearGradient>
    <linearGradient id="lungsRight" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f3fbff"/>
      <stop offset="100%" stop-color="#5fc3ff"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#lungsGlow)"/>
    <ellipse cx="40" cy="63" rx="18" ry="6" fill="#154a71" opacity="0.2"/>
    <path d="M38 20c1.2 0 2 1 2 2v16c0 6-3 14-12 18-6 2.7-10-1-10-5V37c0-6 5-11 10-9 4 1.6 10-3 10-8Z" fill="url(#lungsLeft)" stroke="#8ad9ff" stroke-width="2.6"/>
    <path d="M42 20c-1.2 0-2 1-2 2v16c0 6 3 14 12 18 6 2.7 10-1 10-5V37c0-6-5-11-10-9-4 1.6-10-3-10-8Z" fill="url(#lungsRight)" stroke="#6fcbff" stroke-width="2.6"/>
    <path d="M40 16v16" stroke="#4db1ff" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 36c4 1 7 4 8 8" stroke="#53b5ff" stroke-width="3" stroke-linecap="round"/>
    <path d="M52 36c-4 1-7 4-8 8" stroke="#53b5ff" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`,
    heart: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="heartGlow" cx="48%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.94"/>
      <stop offset="45%" stop-color="#ffe2f0" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff5f8b"/>
    </radialGradient>
    <linearGradient id="heartBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff0f6"/>
      <stop offset="60%" stop-color="#ff9fba"/>
      <stop offset="100%" stop-color="#ff4f7a"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#heartGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#771732" opacity="0.2"/>
    <path d="M40 56C28 47 22 41 20 34c-2-6 2-13 9-15 4-1 8 1 11 4 3-3 7-5 11-4 7 2 11 9 9 15-2 7-8 13-20 22Z" fill="url(#heartBody)" stroke="#ff6f98" stroke-width="3"/>
    <path d="M30 25c3-2 7-1 9 3" stroke="#fff5f8" stroke-width="3.2" stroke-linecap="round" opacity="0.8"/>
  </g>
</svg>`,
    stomach: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="stomachGlow" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#e9ffeb" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#64d690"/>
    </radialGradient>
    <linearGradient id="stomachBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f2fff5"/>
      <stop offset="60%" stop-color="#baffca"/>
      <stop offset="100%" stop-color="#56c880"/>
    </linearGradient>
    <linearGradient id="stomachHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#8ef4ae" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#stomachGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#1d6b3a" opacity="0.2"/>
    <path d="M44 20c0 10 4 14 7 18 4 4 5 10 1 15-5 7-16 11-24 7-7-3-10-12-6-20 4-8 4-11 3-17" fill="url(#stomachBody)" stroke="#80e5a5" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M33 28c2 4 0 8-3 13" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.65"/>
    <path d="M40 30c2 3 5 4 8 3" stroke="url(#stomachHighlight)" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  </g>
</svg>`,
    dizzy: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="dizzyGlow" cx="50%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#ffe6e0" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#ff6a6a"/>
    </radialGradient>
    <linearGradient id="dizzySwirl" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="#ffd0c7"/>
      <stop offset="100%" stop-color="#ff856e"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#dizzyGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#821f1f" opacity="0.2"/>
    <path d="M26 32c3-8 14-11 21-5 6 5 2 13-5 15-7 2-9 9-4 12 5 3 12 1 14-4" stroke="url(#dizzySwirl)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <g stroke="#ff9a8f" stroke-width="4" stroke-linecap="round">
      <path d="M28 22l6 6"/>
      <path d="M52 22l-6 6"/>
      <path d="M28 50l6-6"/>
      <path d="M52 50l-6-6"/>
    </g>
    <circle cx="40" cy="36" r="3.6" fill="#ffffff" opacity="0.85"/>
  </g>
</svg>`,
    rest: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="restGlow" cx="50%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#e0ecff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#638cff"/>
    </radialGradient>
    <linearGradient id="restBed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f6f8ff"/>
      <stop offset="60%" stop-color="#d0dcff"/>
      <stop offset="100%" stop-color="#6c88ff"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#restGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#21367d" opacity="0.2"/>
    <rect x="22" y="30" width="36" height="22" rx="6" fill="url(#restBed)" stroke="#7b92ff" stroke-width="3"/>
    <circle cx="30" cy="34" r="6" fill="#ffffff" stroke="#7b92ff" stroke-width="2.4"/>
    <path d="M26 44h24" stroke="#506ffc" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`,
    walk: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="walkGlow" cx="50%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#e8f7ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#4fd0ff"/>
    </radialGradient>
    <linearGradient id="walkBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5fbff"/>
      <stop offset="60%" stop-color="#a8e6ff"/>
      <stop offset="100%" stop-color="#4fc7ff"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#walkGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#14617c" opacity="0.22"/>
    <path d="M38 20c2 0 4 1.4 4 3.4 0 3-4 4-4 6.6" stroke="#4fc7ff" stroke-width="4" stroke-linecap="round"/>
    <path d="M34 32c-3 4-7 7-10 7" stroke="#69d8ff" stroke-width="4" stroke-linecap="round"/>
    <path d="m40 34 8 4-4 8" stroke="#2a9ed4" stroke-width="4" stroke-linecap="round"/>
    <path d="m36 38-2 6" stroke="#2a9ed4" stroke-width="4" stroke-linecap="round"/>
    <path d="M36 44c-2 5-4 12-4 16" stroke="#2a9ed4" stroke-width="4" stroke-linecap="round"/>
    <path d="M48 40c0 4-2 10-2 14" stroke="#2a9ed4" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 60h10" stroke="#2a9ed4" stroke-width="4" stroke-linecap="round"/>
    <path d="M44 60h8" stroke="#2a9ed4" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`,
    swirl: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="swirlGlow" cx="50%" cy="30%" r="74%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#f2e6ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#9d6bff"/>
    </radialGradient>
    <linearGradient id="swirlBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f9f3ff"/>
      <stop offset="55%" stop-color="#d8c5ff"/>
      <stop offset="100%" stop-color="#8057ff"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#swirlGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#37237a" opacity="0.2"/>
    <path d="M32 28c5-8 18-10 24 0 5 8-1 18-10 18-9 0-11 10-2 12 7 2 12-4 12-9" stroke="url(#swirlBody)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="28" r="4" fill="#ffffff" opacity="0.7"/>
    <circle cx="54" cy="38" r="3.5" fill="#ffffff" opacity="0.65"/>
  </g>
</svg>`,
    question: `<svg viewBox="0 0 80 80" focusable="false" role="presentation">
  <defs>
    <radialGradient id="questionGlow" cx="50%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#e7edff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#5e78ff"/>
    </radialGradient>
    <linearGradient id="questionBubble" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f6f8ff"/>
      <stop offset="60%" stop-color="#d1d9ff"/>
      <stop offset="100%" stop-color="#7088ff"/>
    </linearGradient>
  </defs>
  <g fill="none">
    <circle cx="40" cy="40" r="34" fill="url(#questionGlow)"/>
    <ellipse cx="40" cy="62" rx="18" ry="6" fill="#1d2c7a" opacity="0.18"/>
    <path d="M28 28c0-6 5-10 12-10 7 0 12 4 12 10 0 4-2 7-6 9-3 1.5-4 3-4 6" fill="none" stroke="url(#questionBubble)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="40" cy="58" r="4.5" fill="url(#questionBubble)" stroke="#6a82ff" stroke-width="2"/>
  </g>
</svg>`
  };

  function getChoiceIcon(option){
    const text = (option||'').toLowerCase();
    if(text.includes('hour')) return ICONS.clock;
    if(text.includes('2-3') || text.includes('few days') || text.includes('couple of days')) return ICONS.calendarRange;
    if(text.includes('week')) return ICONS.calendarWeek;
    if(text.includes('day')) return ICONS.calendarDay;
    if(text.includes('light')) return ICONS.severityLight;
    if(text.includes('medium')) return ICONS.severityModerate;
    if(text.includes('severe')) return ICONS.severitySevere;
    if(text.includes('fever')) return ICONS.thermo;
    if(text.includes('nausea') || text.includes('vomit')) return ICONS.stomach;
    if(text.includes('cough') || text.includes('breath')) return ICONS.lungs;
    if(text.includes('diarr')) return ICONS.swirl;
    if(text.includes('chest')) return ICONS.heart;
    if(text.includes('dizziness') || text.includes('fatigue')) return ICONS.dizzy;
    if(text.includes('none')) return ICONS.question;
    if(text.includes('rest')) return ICONS.rest;
    if(text.includes('moving') || text.includes('standing')) return ICONS.walk;
  if(text.includes('random')) return ICONS.swirl;
  if(text.includes('sure')) return ICONS.question;
  return ICONS.question;
}

  function setupEntryPresetOptions(){
    if(!entryPresetButtons.length) return;
    entryPresetButtons.forEach(btn=>{
      const value = btn.dataset.option || btn.textContent.trim();
      const iconSlot = btn.querySelector('.choice-icon');
      if(iconSlot){
        iconSlot.innerHTML = getChoiceIcon(value);
      }
      btn.addEventListener('click', ()=>{
        if(!value) return;
        openGuidedFlow({ prefill:value, startIndex:1, autoFocus:false });
      });
    });
  }

  function savePrefs(){ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }
  function applyTheme(){ document.documentElement.setAttribute('data-theme', prefs.theme||'auto'); }
  function applyContrast(){ document.documentElement.setAttribute('data-contrast', prefs.contrast==='high'?'high':'normal'); }
  function applyEasy(){ document.body.classList.toggle('easy-read', !!prefs.easy); }

  function getAvailableLanguages(){
    if(langSelect){
      const opts = Array.from(langSelect.options||[]).map(opt=>opt.value).filter(Boolean);
      if(opts.length) return opts;
    }
    return LANGUAGE_SEQUENCE;
  }
  function labelForLanguage(lang){
    const meta = LANGUAGE_META[lang] || LANGUAGE_META.en;
    const currentStrings = STR?.[prefs.lang||'en']?.ui;
    const fallbackStrings = STR?.en?.ui;
    if(meta){
      if(currentStrings && currentStrings[meta.labelKey]) return currentStrings[meta.labelKey];
      if(fallbackStrings && fallbackStrings[meta.labelKey]) return fallbackStrings[meta.labelKey];
    }
    return lang?.toUpperCase?.()||'EN';
  }
  function toggleCopyForLanguage(lang){
    const meta = LANGUAGE_META[lang] || LANGUAGE_META.en;
    const strings = STR?.[lang]?.ui;
    const fallbackStrings = STR?.en?.ui;
    if(meta){
      if(strings && strings[meta.toggleKey]) return strings[meta.toggleKey];
      if(fallbackStrings && fallbackStrings[meta.toggleKey]) return fallbackStrings[meta.toggleKey];
    }
    return 'Switch language';
  }
  function updateLanguageToggleUI(){
    if(langLabel){
      langLabel.textContent = labelForLanguage(prefs.lang||'en');
    }
    if(langToggle){
      langToggle.setAttribute('aria-label', toggleCopyForLanguage(prefs.lang||'en'));
      langToggle.setAttribute('data-lang', prefs.lang||'en');
    }
  }
  function nextLanguage(current){
    const available = getAvailableLanguages();
    const currentLang = available.includes(current) ? current : available[0] || 'en';
    const metaNext = LANGUAGE_META[currentLang]?.next;
    if(metaNext && available.includes(metaNext)) return metaNext;
    if(available.length < 2) return currentLang;
    const idx = available.indexOf(currentLang);
    return available[(idx+1)%available.length];
  }

  function t(path){
    const parts = path.split('.'); let cur = STR?.[prefs.lang||'en']||STR?.en||{};
    for(const p of parts) if(cur && p in cur) cur = cur[p]; else return null;
    return cur;
  }
  function applyStrings(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n'); const val = t(key);
      if(val!=null) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder'); const val = t(key);
      if(val!=null) el.setAttribute('placeholder', val);
    });
    updateLanguageToggleUI();
  }
  function isAuthed(){ return !!(auth && auth.email); }
  function persistAuth(){ if(isAuthed()){ localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } else { localStorage.removeItem(AUTH_KEY); }}
  function setAuth(next){
    auth = (next && next.email) ? { email: next.email.toLowerCase() } : null;
    persistAuth();
    if(isAuthed()){
      if(sessionHistory.length){
        const merged = [...sessionHistory, ...readHist()].slice(0,4);
        writeHist(merged);
        sessionHistory = [];
      }
    }
    updateAuthUI();
  }
  function guardProtectedLink(evt){
    if(isAuthed()) return;
    evt?.preventDefault();
    showAuthModal('login');
    showAuthMessage('Please log in to view your history.', 'error');
  }
  function initPrefsUI(){
    if(langSelect) langSelect.value = prefs.lang||'en';
    if(themeSelect) themeSelect.value = prefs.theme||'auto';
    if(contrastToggle) contrastToggle.checked = prefs.contrast==='high';
    if(easyToggle) easyToggle.checked = !!prefs.easy;
    applyTheme(); applyContrast(); applyEasy(); applyStrings();
  }

  function normalizeDisplay(text){
    if(!text) return '';
    try{ return text.normalize('NFKD').replace(/[^A-Za-z0-9.,()%+\-\/\s']/g,' ').replace(/\s+/g,' ').trim(); }
    catch(err){ return String(text).replace(/[^A-Za-z0-9.,()%+\-\/\s']/g,' ').replace(/\s+/g,' ').trim(); }
  }
  function clipText(text, max=160){
    if(!text) return '';
    return text.length<=max ? text : `${text.slice(0,max-1)}...`;
  }
  function toTitleCase(text){
    if(!text) return '';
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(word=>{
        if(!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ')
      .replace(/\b(I|Ii|Iii|Iv|V|Vi|Vii|Viii|Ix|X)\b/g, match=>match.toUpperCase());
  }
  function readUsers(){
    try{ return JSON.parse(localStorage.getItem(USERS_KEY)||'{}'); }
    catch(err){ return {}; }
  }
  function saveUsers(users){
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function showAuthMessage(text, type='info'){
    if(!authMessage) return;
    authMessage.textContent = text;
    authMessage.classList.remove('is-hidden','is-error','is-success');
    if(type==='error') authMessage.classList.add('is-error');
    else if(type==='success') authMessage.classList.add('is-success');
  }
  function clearAuthMessage(){
    if(!authMessage) return;
    authMessage.textContent = '';
    authMessage.classList.add('is-hidden');
    authMessage.classList.remove('is-error','is-success');
  }
  function switchAuthMode(mode){
    authTabs.forEach(tab=>{
      const isActive = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    loginForm?.classList.toggle('is-hidden', mode!=='login');
    signupForm?.classList.toggle('is-hidden', mode!=='signup');
    clearAuthMessage();
    setTimeout(()=>{
      if(mode==='login'){ loginEmail?.focus(); }
      else { signupEmail?.focus(); }
    }, 50);
  }
  function resetAuthForms(){
    loginForm?.reset();
    signupForm?.reset();
    if(loginEmail && auth?.email) loginEmail.value = auth.email;
  }
  function showAuthModal(mode='login'){
    if(!authModal) return;
    resetAuthForms();
    switchAuthMode(mode);
    if(isAuthed()){
      showAuthMessage(`Logged in as ${auth.email}`, 'success');
    } else {
      clearAuthMessage();
    }
    authModal.classList.remove('is-hidden');
    document.body.classList.add('modal-open');
    if(mode==='login' && !isAuthed()){ loginEmail?.focus(); }
    if(mode==='signup'){ signupEmail?.focus(); }
  }
  function hideAuthModal(){
    if(!authModal) return;
    authModal.classList.add('is-hidden');
    document.body.classList.remove('modal-open');
    clearAuthMessage();
    resetAuthForms();
    switchAuthMode('login');
  }
  function updateProgressDisplay(index){
    const total = Math.max(1, BASE_QUESTION_COUNT);
    let label;
    if(index >= total){
      label = "All questions complete";
    } else {
      const step = Math.max(1, index + 1);
      const clampedStep = Math.min(total, step);
      label = `Question ${clampedStep} of ${total}`;
    }
    if(questionProgress) questionProgress.textContent = label;
    if(entryProgress) entryProgress.textContent = label;
  }
  function setEntryChoiceDefault(){
    if(entrySpeakBtn){
      entrySpeakBtn.disabled = false;
      entrySpeakBtn.classList.remove('is-listening');
      const textEl = entrySpeakBtn.querySelector('.question-btn-label, .entry-label, .mic-text');
      if(textEl) textEl.textContent = MIC_COPY.idle.fallback;
    }
    if(entryTypeBtn){
      entryTypeBtn.disabled = false;
    }
    entryTextWrap?.classList.add('is-hidden');
    if(entryText) entryText.value='';
    updateProgressDisplay(currentQuestion);
  }
  function handleLogin(evt){
    evt?.preventDefault();
    const email = (loginEmail?.value||'').trim().toLowerCase();
    const pass = (loginPass?.value||'').trim();
    if(!email || !pass){
      showAuthMessage('Please enter your email and password.', 'error');
      return;
    }
    const users = readUsers();
    const record = users[email];
    if(!record){
      showAuthMessage('No account found with that email. Try signing up.', 'error');
      return;
    }
    if(record.password !== pass){
      showAuthMessage('Incorrect password. Please try again.', 'error');
      return;
    }
    setAuth({ email });
    hideAuthModal();
    renderHistory();
  }
  function handleSignup(evt){
    evt?.preventDefault();
    const email = (signupEmail?.value||'').trim().toLowerCase();
    const pass = (signupPass?.value||'').trim();
    const confirm = (signupConfirm?.value||'').trim();
    if(!email || !pass || !confirm){
      showAuthMessage('Please complete all fields.', 'error');
      return;
    }
    if(pass.length < MIN_PASSWORD_LENGTH){
      showAuthMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 'error');
      return;
    }
    if(pass !== confirm){
      showAuthMessage('Passwords do not match.', 'error');
      return;
    }
    const users = readUsers();
    if(users[email]){
      showAuthMessage('That email is already registered. Try logging in.', 'error');
      return;
    }
    users[email] = { password: pass };
    saveUsers(users);
    setAuth({ email });
    hideAuthModal();
    renderHistory();
  }
  function openHowToModal(){
    if(!howToModal) return;
    howToModal.classList.remove('is-hidden');
    document.body.classList.add('modal-open');
  }
  function closeHowToModal(){
    if(!howToModal) return;
    howToModal.classList.add('is-hidden');
    if(!document.querySelector('.modal:not(.is-hidden)')){
      document.body.classList.remove('modal-open');
    }
  }
  function severityBadgeFromText(text){
    const lower = (text||'').toLowerCase();
    if(lower.includes('severe')) return 'badge badge-severe';
    if(lower.includes('moderate')) return 'badge badge-moderate';
    if(lower.includes('mild')) return 'badge badge-mild';
    return 'badge badge-neutral';
  }
  function severityLevelFromText(text){
    const lower = (text||'').toLowerCase();
    if(!lower) return 'unknown';
    if(lower.includes('severe') || lower.includes('emergency') || lower.includes('critical')) return 'severe';
    if(lower.includes('moderate') || lower.includes('medium') || lower.includes('watch')) return 'moderate';
    if(lower.includes('mild') || lower.includes('low') || lower.includes('stable') || lower.includes('light')) return 'mild';
    if(lower.includes('unknown') || lower.includes('undetermined') || lower.includes('not assessed')) return 'unknown';
    return 'unknown';
  }
  function applySeverityTheme(text){
    const level = severityLevelFromText(text);
    if(analysisCard){
      analysisCard.classList.remove(...SEVERITY_CLASSES);
      analysisCard.classList.add(`severity-${level}`);
    }
    if(severityRow){
      severityRow.dataset.severity = level;
    }
    return level;
  }
  function renderHistory(){
    if(!histCards || !histEmpty) return;
    histCards.innerHTML = '';
    if(!isAuthed()){
      histEmpty.textContent = 'Log in to see your recent check-ins.';
      histEmpty.classList.remove('is-hidden');
      return;
    }
    const entries = readHist().slice(0,4);
    if(!entries.length){
      histEmpty.textContent = 'No saved check-ins yet. Your next check-in will appear here.';
      histEmpty.classList.remove('is-hidden');
      return;
    }
    histEmpty.classList.add('is-hidden');
    entries.forEach(entry=>{
      const card = document.createElement('article');
      const date = new Date(entry.ts||Date.now());
      const severityLabel = normalizeDisplay(entry.severity) || 'Not rated';
      const severityLevel = severityLevelFromText(severityLabel);
      const severityChipText = severityLevel === 'unknown' ? 'Reviewing' : toTitleCase(severityLevel);
      const severityDescription = severityLabel ? severityLabel.split('(')[0].trim() : 'Not rated';
      const conditionLabel = normalizeDisplay(entry.condition) || 'General check-in';
      const preview = clipText(normalizeDisplay(entry.transcript)|| 'No transcript captured.');
      const adviceText = normalizeDisplay(entry.advice);
      const formattedTime = date.toLocaleString([], { dateStyle:'medium', timeStyle:'short' });
      card.className = `history-card history-card--${severityLevel}`;
      card.innerHTML = `
        <header class="history-card-head">
          <span class=\"history-chip history-chip--${severityLevel}\">${severityChipText}</span>
          <time class=\"history-time\" datetime=\"${date.toISOString()}\">${formattedTime}</time>
        </header>
        <h3 class=\"history-condition\">${conditionLabel}</h3>
        <p class=\"history-severity\">${severityDescription}</p>
        <p class=\"history-snippet\">${preview}</p>
        ${adviceText ? `<div class=\"history-advice\"><span>Next steps</span><p>${adviceText}</p></div>` : ''}
      `;
      histCards.appendChild(card);
    });
  }
  function readHistMap(){
    try{
      const parsed = JSON.parse(localStorage.getItem(LS_KEY)||'{}');
      if(!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {};
      return parsed;
    } catch(err){
      return {};
    }
  }
  function readHist(){
    if(!isAuthed()) return [];
    const map = readHistMap();
    return map[auth.email] || [];
  }
  function writeHist(entries){
    if(!isAuthed()) return;
    const map = readHistMap();
    map[auth.email] = entries.slice(0,4);
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  }
  function showHistoryModal(){
    if(!isAuthed()){
      showAuthModal('login');
      showAuthMessage('Please log in to view your history.', 'error');
      return;
    }
    renderHistory();
    historyModal?.classList.remove('is-hidden');
    document.body.classList.add('modal-open');
  }
  function hideHistoryModal(){
    historyModal?.classList.add('is-hidden');
    if(!document.querySelector('.modal:not(.is-hidden)')){
      document.body.classList.remove('modal-open');
    }
  }
  function logHistoryEntry(data){
    const record = {
      ts: Date.now(),
      transcript: normalizeDisplay(data?.transcript)||null,
      condition: normalizeDisplay(data?.condition)||null,
      severity: normalizeDisplay(data?.severity)||null,
      advice: normalizeDisplay(data?.advice)||null
    };
    if(isAuthed()){
      const entries = readHist();
      writeHist([record, ...entries].slice(0,4));
      renderHistory();
      sessionHistory = [];
    } else {
      sessionHistory = [record, ...sessionHistory].slice(0,4);
    }
  }

  function resetAnalysisView(){
    setAnalysisText(analysisCondition, null, DEFAULT_CONDITION);
    setAnalysisText(analysisSeverity, null, DEFAULT_SEVERITY);
    setAnalysisText(analysisAdvice, null, DEFAULT_ADVICE);
    if(analysisTimestamp) analysisTimestamp.textContent = DEFAULT_TIMESTAMP;
    analysisCard?.classList.add('is-hidden');
    refreshBtn?.classList.add('is-hidden');
    applySeverityTheme('unknown');
  }
  function resetFlow(){
    currentQuestion = 0;
    currentAnswers = [];
    questionText && (questionText.textContent = "");
    document.querySelector('#choicesContainer')?.remove();
    if(answerInput){
      answerInput.value='';
      answerInput.style.display='block';
    }
    if(answerInputWrap) answerInputWrap.style.display='block';
    if(questionActions) questionActions.style.display='flex';
    if(nextBtn) nextBtn.style.display='inline-block';
    updateProgressDisplay(0);
  }
  function openGuidedFlow(options={}){
    heroIntro?.classList.add('is-hidden');
    closeHowToModal();
    entryChoice?.classList.add('is-hidden');
    setEntryChoiceDefault();
    entryFlowMode = null;
    activeMicButton = micButton;
    guidedBox?.classList.remove('is-hidden');
    guidedActions?.classList.remove('is-hidden');
    if(!guidedStarted) guidedStarted = true;
    resetFlow();
    if(options.prefill){
      currentAnswers.push(options.prefill);
      if(answerInput){
        answerInput.value = options.prefill;
        answerInput.style.display='none';
      }
    }
    currentQuestion = options.startIndex ?? currentAnswers.length;
    showQuestion(currentQuestion);
    if(options.autoFocus !== false && answerInput && answerInput.style.display !== 'none'){
      answerInput.focus();
    }
  }
  function saveAnswer(answer){ if(answer) currentAnswers.push(answer); }
  function showQuestion(index){
    updateProgressDisplay(index);
    document.querySelector('#choicesContainer')?.remove();
    if(index >= questions.length){
      questionText && (questionText.textContent = "Thanks! Your responses have been recorded.");
      if(answerInput) answerInput.style.display='none';
      if(answerInputWrap) answerInputWrap.style.display='none';
      if(questionActions) questionActions.style.display='none';
      if(nextBtn) nextBtn.style.display='none';
      submitSACA(null,{fromFlow:true, mode:'predict'});
      return;
    }
    const q = questions[index];
    if(questionHeading) questionHeading.textContent = q.text;
    if(questionText){
      if(q.type === 'choice'){
        questionText.textContent = "Choose the option that fits best.";
      } else {
        questionText.textContent = "Type a quick response below.";
      }
    }
    if(q.type === 'text'){
      if(answerInput){
        answerInput.style.display='block';
        if(currentAnswers.length){ answerInput.value = currentAnswers[0]; }
        else answerInput.value='';
      }
      if(answerInputWrap) answerInputWrap.style.display='block';
      if(questionActions) questionActions.style.display='flex';
      if(nextBtn) nextBtn.style.display='inline-block';
    } else if(q.type === 'choice'){
      if(answerInput) answerInput.style.display='none';
      if(answerInputWrap) answerInputWrap.style.display='none';
      if(nextBtn) nextBtn.style.display='none';
      if(questionActions) questionActions.style.display='none';
      const choicesDiv = document.createElement('div');
      choicesDiv.id = 'choicesContainer';
      choicesDiv.className = 'choice-grid';
      const optionCount = q.options.length;
      choicesDiv.dataset.count = optionCount;
      if(optionCount === 3){
        choicesDiv.classList.add('choice-grid--wide');
      }
      if(optionCount >= 6){
        choicesDiv.classList.add('choice-grid--cols3');
      }
      q.options.forEach(opt=>{
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choiceBtn choice-card';
        btn.innerHTML = `<span class="choice-icon">${getChoiceIcon(opt)}</span><span class="choice-label">${opt}</span>`;
        btn.addEventListener('click',()=>{
          saveAnswer(opt);
          currentQuestion++;
          showQuestion(currentQuestion);
        });
        choicesDiv.appendChild(btn);
      });
      questionText?.insertAdjacentElement('afterend', choicesDiv);
    }
  }

  function setAnalysisText(node, text, fallback){
    if(!node) return;
    if(text && text !== fallback){
      node.textContent = text;
      node.classList.remove('muted');
    } else {
      node.textContent = fallback;
      node.classList.add('muted');
    }
  }
  function parseAnalysis(raw){
    const result = { condition:null, conditionConfidence:null, severity:null, severityConfidence:null, advice:null };
    if(!raw) return result;
    raw.split('\n').forEach(line=>{
      const clean = normalizeDisplay(line);
      if(!clean) return;
      const conditionMatch = clean.match(/predicted disease\:?\s*(.+?)(?:\s*\(confidence\:?\s*([0-9.]+)\))?$/i);
      if(conditionMatch){
        result.condition = conditionMatch[1];
        result.conditionConfidence = conditionMatch[2] ? parseFloat(conditionMatch[2]) : null;
        return;
      }
      const severityMatch = clean.match(/severity level\:?\s*(.+?)(?:\s*\(confidence\:?\s*([0-9.]+)\))?$/i);
      if(severityMatch){
        result.severity = severityMatch[1];
        result.severityConfidence = severityMatch[2] ? parseFloat(severityMatch[2]) : null;
        return;
      }
      const adviceMatch = clean.match(/advice\:?\s*(.+)/i);
      if(adviceMatch){ result.advice = adviceMatch[1]; }
    });
    return result;
  }
  function setMicLabel(state){
    recordingState = state;
    const copy = MIC_COPY[state] || MIC_COPY.idle;
    if(micText){ micText.setAttribute('data-i18n', copy.key); }
    micButton?.classList.toggle('is-listening', state==='listening');
    const activeButton = activeMicButton && activeMicButton !== micButton ? activeMicButton : micButton;
    if(activeButton && activeButton !== micButton){
      const textEl = activeButton.querySelector('.question-btn-label, .entry-label, .mic-text');
      if(textEl) textEl.textContent = copy.fallback;
      activeButton.classList.toggle('is-listening', state==='listening');
    }
    applyStrings();
  }
  async function startRecording(){
    if(recordingState==='submitting') return;
    if(!navigator.mediaDevices?.getUserMedia){ alert('Audio recording is not supported in this browser.'); return; }
    const button = activeMicButton || micButton;
    try{
      if(button) button.disabled = true;
      if(button && button!==micButton) button.classList.add('is-listening');
      micStream = await navigator.mediaDevices.getUserMedia({ audio:true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(micStream);
      mediaRecorder.ondataavailable = e=>{ if(e.data?.size) audioChunks.push(e.data); };
      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();
      setMicLabel('listening');
    } catch(err){
      console.error(err);
      alert('Could not access the microphone. Please check permissions.');
      setMicLabel('idle');
    } finally {
      if(button){
        button.disabled = false;
        if(recordingState!=='listening'){
          button.classList.remove('is-listening');
        }
      }
    }
  }
  function stopRecording(){
    if(recordingState!=='listening') return;
    setMicLabel('submitting');
    const button = activeMicButton || micButton;
    if(button) button.disabled = true;
    try{ mediaRecorder?.stop(); }
    catch(err){ console.error(err); handleStop(); }
  }
  async function handleStop(){
    const button = activeMicButton || micButton;
    const blob = audioChunks.length ? new Blob(audioChunks,{type:'audio/wav'}) : null;
    if(micStream){ micStream.getTracks().forEach(track=>track.stop()); micStream=null; }
    audioChunks = [];
    mediaRecorder = null;
    if(blob && blob.size){
      try{
        const data = await submitSACA(blob,{ allowEmpty:true, mode:'transcribe' });
        const transcriptText =
          normalizeDisplay(data.normalized_text) ||
          normalizeDisplay(data.transcription) ||
          normalizeDisplay(data.raw_text) ||
          normalizeDisplay(data.transcript) || '';
        pendingNormalizedText = transcriptText;
        resetAnalysisView();
        currentAnswers = [];
        guidedStarted = false;
        if(transcriptText){
          openGuidedFlow({ prefill: transcriptText, startIndex:1, autoFocus:false });
        } else {
          openGuidedFlow({ startIndex:1, autoFocus:true });
        }
        setMicLabel('idle');
      } catch(err){
        alert('Audio submission failed.');
        console.error(err);
        setMicLabel('idle');
      }
    } else {
      alert('No audio captured. Please try again.');
      setMicLabel('idle');
    }
    if(button){
      button.disabled = false;
      button.classList.remove('is-listening');
    }
    if(entryTypeBtn) entryTypeBtn.disabled = false;
    entryFlowMode = null;
    activeMicButton = micButton;
    if(recordingState!=='listening') setMicLabel('idle');
  }

  async function submitSACA(audioBlob=null, options={}){
    const mode = options.mode || (options.fromFlow ? 'predict' : 'predict');
    const allowEmpty = !!options.allowEmpty || !!audioBlob || mode === 'transcribe';
    if(!allowEmpty && currentAnswers.length === 0){
      alert(t('home.needAnswers') || 'Please answer all questions before submitting.');
      return null;
    }

    const answersForSend = currentAnswers.length ? [...currentAnswers] : [];
    const formData = new FormData();
    if(audioBlob) formData.append('file', audioBlob, 'user_audio.wav');
    formData.append('answers', JSON.stringify({ answers: answersForSend }));
    formData.append('mode', mode);
    if(mode === 'predict' && pendingNormalizedText){
      formData.append('normalized_audio', pendingNormalizedText);
    }

    try {
      const res = await fetch('/upload-audio', { method:'POST', body: formData });
      if(!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      if(mode === 'transcribe'){
        return data;
      }

      const transcriptText = normalizeDisplay(data.raw_text || data.transcription || data.transcript || data.nlp_text || answersForSend[0]);

      const parsed = parseAnalysis(data.result || '');

      // === 🧠 Smarter language formatting for model results ===
      // 🩺 Predicted condition: Title-cased, clean
let conditionSource = normalizeDisplay(parsed.condition) || normalizeDisplay(data.condition);
if(conditionSource){
  conditionSource = conditionSource.replace(/\(.*?\)/g,'').trim();
}
let conditionDisplay = conditionSource
  ? toTitleCase(conditionSource)
  : DEFAULT_CONDITION;

// 🎚️ Severity: Natural, human phrasing
let severitySource = normalizeDisplay(parsed.severity) || normalizeDisplay(data.severity) || '';
let severityText = severitySource
  .replace(/severity\s*(level)?\s*:?\s*/i, '')
  .replace(/\(.*?\)/g, '')
  .trim();

if (severityText) {
  const lower = severityText.toLowerCase();
  if (lower.includes('severe')) {
    severityDisplay = "This condition appears severe.";
  } else if (lower.includes('moderate')) {
    severityDisplay = "This condition appears moderate.";
  } else if (lower.includes('mild') || lower.includes('light')) {
    severityDisplay = "This condition appears mild.";
  } else {
    severityDisplay = `Current severity: ${toTitleCase(severityText)}.`;
  }
} else {
  severityDisplay = DEFAULT_SEVERITY;
}


let adviceDisplay = normalizeDisplay(parsed.advice) || normalizeDisplay(data.advice) || DEFAULT_ADVICE;
if (adviceDisplay !== DEFAULT_ADVICE) {
  // Remove stray letters or symbols
  adviceDisplay = adviceDisplay
    .replace(/^u\s*/i, '') // removes “U ” or “u ”
    .replace(/^\s*a\s*/i, '') // removes leading "a "
    .replace(/\s+/g, ' ')
    .trim();

  // Ensure capitalization and full stop
  if (adviceDisplay && !/^[A-Z]/.test(adviceDisplay)) {
    adviceDisplay = adviceDisplay.charAt(0).toUpperCase() + adviceDisplay.slice(1);
  }
  if (adviceDisplay && !/[.!?]$/.test(adviceDisplay)) {
    adviceDisplay += '.';
  }
}


      // ✅ Apply updated outputs
      setAnalysisText(analysisCondition, conditionDisplay, DEFAULT_CONDITION);
      setAnalysisText(analysisSeverity, severityDisplay, DEFAULT_SEVERITY);
      setAnalysisText(analysisAdvice, adviceDisplay, DEFAULT_ADVICE);
      applySeverityTheme(severitySource || severityDisplay);
      if(analysisTimestamp){
        const now = new Date();
        analysisTimestamp.textContent = `Updated ${now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}`;
      }

      analysisCard?.classList.remove('is-hidden');
      refreshBtn?.classList.remove('is-hidden');
      micButton?.classList.add('is-hidden');
      showGuidedBtn?.classList.add('is-hidden');
      guidedBox?.classList.add('is-hidden');
      guidedActions?.classList?.add('is-hidden');
      heroIntro?.classList.add('is-hidden');

      logHistoryEntry({ transcript: transcriptText, condition: conditionDisplay, severity: severityDisplay, advice: adviceDisplay });

      currentAnswers = [];
      guidedStarted = false;
      pendingNormalizedText = "";

      setMicLabel('idle');
      return data;
    } catch(err){
      console.error(err);
      if(!options.silent){ alert('Upload failed'); }
      setMicLabel('idle');
      throw err;
    }
  }

  function resetExperience(){
    setMicLabel('idle');
    currentAnswers = [];
    currentQuestion = 0;
    guidedStarted = false;
    hideHistoryModal();
    pendingNormalizedText = "";
    heroIntro?.classList.remove('is-hidden');
    micButton?.classList.remove('is-hidden','is-listening');
    micButton && (micButton.disabled = false);
    showGuidedBtn?.classList.remove('is-hidden');
    refreshBtn?.classList.add('is-hidden');
    guidedBox?.classList.add('is-hidden');
    guidedActions?.classList?.add('is-hidden');
    entryChoice?.classList.add('is-hidden');
    setEntryChoiceDefault();
    activeMicButton = micButton;
    entryFlowMode = null;
    updateProgressDisplay(0);
    closeHowToModal();
    document.querySelector('#choicesContainer')?.remove();
    resetAnalysisView();
  }

  function updateAuthUI(){
    const authed = isAuthed();
    if(openAuth){
      openAuth.removeAttribute('data-i18n');
      openAuth.textContent = authed ? 'Account' : 'Login';
      openAuth.setAttribute('aria-label', authed ? 'View account options' : 'Login to SACA');
    }
    logoutBtn?.classList.toggle('is-hidden', !authed);
    if(historyCard){
      historyCard.setAttribute('href', authed ? '#history' : '#');
      if(!authed) historyCard.setAttribute('aria-disabled','true'); else historyCard.removeAttribute('aria-disabled');
    }
    if(historyTrigger){
      historyTrigger.classList.toggle('is-hidden', !authed);
      historyTrigger.disabled = !authed;
    }
    homeCards?.classList.toggle('is-hidden', !authed);
    historyLocked?.classList.toggle('is-hidden', authed);
    historyContent?.classList.toggle('is-hidden', !authed);
    renderHistory();
    if(!authed){ hideHistoryModal(); }
    applyStrings();
  }

  loginForm?.addEventListener('submit', handleLogin);
  signupForm?.addEventListener('submit', handleSignup);
  authTabs.forEach(tab=>tab.addEventListener('click', ()=>switchAuthMode(tab.dataset.mode||'login')));
  openAuth?.addEventListener('click', ()=>showAuthModal(isAuthed() ? 'login' : 'login'));
  authBackdrop?.addEventListener('click', hideAuthModal);
  authDismiss?.addEventListener('click', hideAuthModal);
  logoutBtn?.addEventListener('click', ()=>{
    hideAuthModal();
    setAuth(null);
    resetExperience();
    window.location.hash = '#home';
  });

  historyTrigger?.addEventListener('click', showHistoryModal);
  historyBackdrop?.addEventListener('click', hideHistoryModal);
  historyDismiss?.addEventListener('click', hideHistoryModal);

  authEls.forEach(el=>el.addEventListener('click', guardProtectedLink));
  langToggle?.addEventListener('click', ()=>{
    const current = prefs.lang || 'en';
    const next = nextLanguage(current);
    if(next === current) return;
    prefs.lang = next;
    savePrefs();
    if(langSelect) langSelect.value = next;
    applyStrings();
  });
  langSelect?.addEventListener('change', ()=>{ prefs.lang=langSelect.value; savePrefs(); applyStrings(); });
  themeSelect?.addEventListener('change', ()=>{ prefs.theme=themeSelect.value; savePrefs(); applyTheme(); });
  contrastToggle?.addEventListener('change', ()=>{ prefs.contrast=contrastToggle.checked?'high':'normal'; savePrefs(); applyContrast(); });
  easyToggle?.addEventListener('change', ()=>{ prefs.easy=!!easyToggle.checked; savePrefs(); applyEasy(); });

  nextBtn?.addEventListener('click', ()=>{
    const ans = (answerInput?.value||'').trim();
    if(ans){ saveAnswer(ans); currentQuestion++; showQuestion(currentQuestion); }
    else alert('Please add your answer before continuing.');
  });
  answerInput?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); nextBtn?.click(); } });
  showGuidedBtn?.addEventListener('click', ()=>openGuidedFlow({ autoFocus:true }));
  getStartedBtn?.addEventListener('click', ()=>{
    heroIntro?.classList.add('is-hidden');
    guidedBox?.classList.add('is-hidden');
    guidedActions?.classList.add('is-hidden');
    closeHowToModal();
    resetFlow();
    setEntryChoiceDefault();
    entryChoice?.classList.remove('is-hidden');
    entryFlowMode = null;
    activeMicButton = micButton;
  });
  howToBtn?.addEventListener('click', openHowToModal);
  howToClose?.addEventListener('click', closeHowToModal);
  howToBackdrop?.addEventListener('click', closeHowToModal);
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape'){
      if(!howToModal?.classList.contains('is-hidden')) closeHowToModal();
      if(!authModal?.classList.contains('is-hidden')) hideAuthModal();
    }
  });
  entryTypeBtn?.addEventListener('click', ()=>{
    entryFlowMode = 'type';
    entryTextWrap?.classList.remove('is-hidden');
    entryText?.focus();
  });
  entryTextCancel?.addEventListener('click', ()=>{
    entryFlowMode = null;
    if(entryText) entryText.value='';
    entryTextWrap?.classList.add('is-hidden');
  });
  entryTextSubmit?.addEventListener('click', ()=>{
    const value = (entryText?.value||'').trim();
    if(!value){
      entryText?.focus();
      return;
    }
    entryFlowMode = 'type';
    entryTextWrap?.classList.add('is-hidden');
    entryText?.blur();
    openGuidedFlow({ prefill:value, startIndex:1, autoFocus:true });
  });
  entrySpeakBtn?.addEventListener('click', async ()=>{
    if(recordingState==='submitting') return;
    if(recordingState==='listening'){
      stopRecording();
      return;
    }
    entryFlowMode = 'speak';
    activeMicButton = entrySpeakBtn;
    if(entryTypeBtn) entryTypeBtn.disabled = true;
    await startRecording();
    if(recordingState!=='listening'){
      if(entryTypeBtn) entryTypeBtn.disabled = false;
      setEntryChoiceDefault();
      activeMicButton = micButton;
      entryFlowMode = null;
    }
  });
  refreshBtn?.addEventListener('click', resetExperience);

  micButton?.addEventListener('click', ()=>{
    activeMicButton = micButton;
    entryFlowMode = null;
    if(recordingState==='listening'){ stopRecording(); }
    else if(recordingState!=='submitting'){ startRecording(); }
  });

  function readInitialAuth(){
    try{ auth = JSON.parse(localStorage.getItem(AUTH_KEY)||'null'); }
    catch(err){ auth = null; }
  }

  initPrefsUI();
  readInitialAuth();
  renderHistory();
  updateAuthUI();
  resetExperience();
  setupEntryPresetOptions();
  applyStrings();
})();
