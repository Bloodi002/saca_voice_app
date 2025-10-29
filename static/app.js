(function(){
  const PREF_KEY='sacaPrefs', LS_KEY='sacaHistory', AUTH_KEY='sacaAuth';
  const qs = s=>document.querySelector(s);
  const STR = window.STR;
  const FALLBACK_ANALYSIS = {
    condition:"We'll share the likely condition once we review your details.",
    severity:"We're still gauging how serious things are.",
    advice:"Next steps will appear here as soon as we have a recommendation.",
    timestamp:"Waiting for your check-in."
  };
  const FALLBACK_ERRORS = {
    mediaUnsupported:"Audio recording is not supported in this browser.",
    microphone:"Could not access the microphone. Please check permissions.",
    audioSubmit:"Audio submission failed.",
    noAudio:"No audio captured. Please try again.",
    uploadFailed:"Upload failed"
  };

  function translate(path, fallback = ""){
    const value = t(path);
    if(value === null || value === undefined || value === ""){
      return fallback;
    }
    return value;
  }

  function formatTemplate(template, replacements = {}){
    if(typeof template !== 'string') return template || '';
    return Object.entries(replacements).reduce((acc,[key,val])=>{
      const pattern = new RegExp(`\\{${key}\\}`, 'g');
      return acc.replace(pattern, val);
    }, template);
  }

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
  const severityPointer = qs('#severityPointer');
  const severityDetail = qs('#severityDetail');
  const severityDetailIcon = qs('#severityDetailIcon');
  const severityDetailTitle = qs('#severityDetailTitle');
  const severityDetailSummary = qs('#severityDetailSummary');
  const entryChoice = qs('#entryChoice');
  const entrySpeakBtn = qs('#entrySpeak');
  const entryTypeBtn = qs('#entryType');
  const entryTextWrap = qs('#entryTextWrap');
  const entryText = qs('#entryText');
  const entryTextSubmit = qs('#entryTextSubmit');
  const entryTextCancel = qs('#entryTextCancel');
  const entryPresetContainer = qs('#entrySymptomOptions');
  const entryPresetButtons = entryPresetContainer ? Array.from(entryPresetContainer.querySelectorAll('.entry-choice-card')) : [];
  const entryPresetButtonMap = new Map(entryPresetButtons.map(btn=>{
    const key = (btn.dataset.option || btn.textContent || '').trim().toLowerCase();
    return [key, btn];
  }));
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

  const SEVERITY_CLASSES = ['severity-unknown','severity-mild','severity-moderate','severity-severe'];
  const SEVERITY_ICON_MAP = {
    unknown:'❔',
    mild:'🙂',
    moderate:'😟',
    severe:'🚨'
  };
  const SEVERITY_DETAIL_CONTENT = {
    unknown:{ titleKey:null, titleFallback:"Severity detail", descKey:null, descFallback:"We'll highlight the severity once your check-in is complete." },
    mild:{ titleKey:'analysis.severityLevel.mild.title', titleFallback:"Mild", descKey:'analysis.severityLevel.mild.desc', descFallback:"Symptoms are light and manageable at home." },
    moderate:{ titleKey:'analysis.severityLevel.moderate.title', titleFallback:"Moderate", descKey:'analysis.severityLevel.moderate.desc', descFallback:"Things are getting worse - consider medical advice soon." },
    severe:{ titleKey:'analysis.severityLevel.severe.title', titleFallback:"Severe", descKey:'analysis.severityLevel.severe.desc', descFallback:"Serious symptoms - seek urgent medical help." }
  };
  const MODEL_TEXT_TRANSLATIONS = {
    pit:{
      'things are getting worse - consider medical advice soon':"Ngura alatji wiya, ngangkaṟi kutjupa alatjitu kanyini.",
      'serious symptoms - seek urgent medical help':"Nyangatja ngura ngaranyi tjitji palumpa – ngalkulari papa wiru alatji medical tjungu alatji.",
      'consider consulting a healthcare professional within 24 hours':"Pakatjara wiru kutjupa ngayuku ngura kanyini kunpu wangka tjungu 24 awa tjungu.",
      'seek immediate medical attention':"Tjara ngayuku mukuringanyi wiru alatjitu."
    }
  };
  const MIC_COPY = {
    idle: { key:'home.mic', fallback:'Tap to speak' },
    listening: { key:'home.micListening', fallback:'Listening... tap to stop' },
    submitting: { key:'home.micSubmitting', fallback:'Submitting...' }
  };
  const USERS_KEY = 'sacaUsers';
  const MIN_PASSWORD_LENGTH = 6;

  const prefs = JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
  let auth = null;
  try{ auth = JSON.parse(localStorage.getItem(AUTH_KEY)||'null'); }
  catch(err){ auth = null; }
  if(!prefs.lang || !['en','ae','pit'].includes(prefs.lang)) prefs.lang = 'en';
  const LANGUAGE_SEQUENCE = ['en','ae','pit'];
  const LANGUAGE_META = {
    en:{ labelKey:'languageEn' },
    ae:{ labelKey:'languageAe' },
    pit:{ labelKey:'languagePit' }
  };
  const langSelect = qs('#langSelect');
  const themeSelect = qs('#themeSelect');
  const contrastToggle = qs('#contrastToggle');
  const easyToggle = qs('#easyToggle');

  function normalizeModelString(text){
    return text
      .normalize('NFKD')
      .replace(/[^a-z0-9\s]/gi,'')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }
  function translateModelText(text){
    if(!text) return null;
    const lang = prefs.lang || 'en';
    const langMap = MODEL_TEXT_TRANSLATIONS[lang];
    if(!langMap) return null;
    const key = normalizeModelString(text);
    const normalizedEntries = [];
    for(const [source, translated] of Object.entries(langMap)){
      const normalizedSource = normalizeModelString(source);
      if(!normalizedSource) continue;
      normalizedEntries.push([normalizedSource, translated]);
      if(normalizedSource === key){
        return translated;
      }
    }
    for(const [normalizedSource, translated] of normalizedEntries){
      if(key.includes(normalizedSource) || normalizedSource.includes(key)){
        return translated;
      }
    }
    return null;
  }

  const questions = [
    { textKey: "flow.questions.q1", fallback: "How are you feeling today?", type: "text" },
    {
      textKey: "flow.questions.q2",
      fallback: "How long have you been feeling this?",
      type: "choice",
      allowMultiple: false,
      options: [
        { value: "A few hours", labelKey: "flow.questions.duration.fewHours" },
        { value: "A day", labelKey: "flow.questions.duration.day" },
        { value: "2-3 days", labelKey: "flow.questions.duration.fewDays" },
        { value: "A week or more", labelKey: "flow.questions.duration.weekPlus" }
      ]
    },
    {
      textKey: "flow.questions.q3",
      fallback: "How bad is the issue?",
      type: "choice",
      options: [
        { value: "Light", labelKey: "flow.questions.severity.light" },
        { value: "Medium", labelKey: "flow.questions.severity.medium" },
        { value: "Severe", labelKey: "flow.questions.severity.severe" }
      ]
    },
    {
      textKey: "flow.questions.q4",
      fallback: "Have you noticed any other symptoms?",
      type: "choice",
      useEntryIcons: true,
      allowMultiple: true,
      options: [
        { value: "Fever", labelKey: "entry.options.fever" },
        { value: "Nausea or vomiting", labelKey: "entry.options.nausea" },
        { value: "Cough or breathing difficulty", labelKey: "entry.options.breathing" },
        { value: "Diarrhea", labelKey: "entry.options.diarrhea" },
        { value: "Chest pain", labelKey: "entry.options.chest" },
        { value: "Dizziness or fatigue", labelKey: "entry.options.dizzy" }
      ]
    }
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
  let multiChoiceSelections = new Set();

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
    const key = meta?.labelKey;
    if(key){
      if(currentStrings && currentStrings[key]) return currentStrings[key];
      if(fallbackStrings && fallbackStrings[key]) return fallbackStrings[key];
    }
    return lang?.toUpperCase?.()||'EN';
  }
  function updateLanguageToggleUI(){
    if(!langSelect) return;
    const options = Array.from(langSelect.options);
    options.forEach(opt=>{
      opt.textContent = labelForLanguage(opt.value);
    });
    const available = options.map(opt=>opt.value);
    if(!available.includes(prefs.lang)){
      const fallback = available[0] || LANGUAGE_SEQUENCE[0] || 'en';
      prefs.lang = fallback;
      savePrefs();
    }
    langSelect.value = prefs.lang || options[0]?.value || 'en';
  }

  function t(path){
    const parts = path.split('.'); let cur = STR?.[prefs.lang||'en']||STR?.en||{};
    for(const p of parts) if(cur && p in cur) cur = cur[p]; else return null;
    return cur;
  }
  function applyStrings(){
    const lang = prefs.lang || 'en';
    if(document.documentElement){
      document.documentElement.setAttribute('lang', lang);
    }
    const titleCopy = translate('meta.title', document.title);
    if(titleCopy) document.title = titleCopy;

    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(!key) return;
      const fallback = el.getAttribute('data-i18n-fallback') || el.textContent;
      const argsAttr = el.getAttribute('data-i18n-args');
      let val = translate(key, fallback);
      if(argsAttr){
        try{
          const args = JSON.parse(argsAttr);
          val = formatTemplate(val, args);
        }catch(err){}
      }
      if(val!=null) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el=>{
      const key = el.getAttribute('data-i18n-html');
      if(!key) return;
      const fallback = el.getAttribute('data-i18n-fallback') || el.innerHTML;
      const val = translate(key, fallback);
      if(val!=null) el.innerHTML = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder');
      if(!key) return;
      const fallback = el.getAttribute('placeholder') || '';
      const val = translate(key, fallback);
      if(val!=null) el.setAttribute('placeholder', val);
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(el=>{
      const mapping = el.getAttribute('data-i18n-attr');
      if(!mapping) return;
      mapping.split(';').forEach(entry=>{
        const [attr, key] = entry.split(':').map(part=>part && part.trim());
        if(!attr || !key) return;
        const fallback = el.getAttribute(attr) || '';
        const val = translate(key, fallback);
        if(val!=null) el.setAttribute(attr, val);
      });
    });

    updateLanguageToggleUI();
    updateProgressDisplay(currentQuestion);
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
    showAuthMessage(translate('history.loginPrompt', 'Please log in to view your history.'), 'error');
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
    if(questionProgress){
      if(index >= total){
        questionProgress.setAttribute('data-i18n', 'flow.progressComplete');
        questionProgress.removeAttribute('data-i18n-args');
        questionProgress.textContent = translate('flow.progressComplete', 'All questions complete');
      } else {
        const step = Math.max(1, index + 1);
        const clampedStep = Math.min(total, step);
        questionProgress.setAttribute('data-i18n', 'flow.progress');
        const args = { current: clampedStep, total };
        questionProgress.setAttribute('data-i18n-args', JSON.stringify(args));
        const template = translate('flow.progress', 'Question {current} of {total}');
        questionProgress.textContent = formatTemplate(template, args);
      }
    }
    if(entryProgress){
      if(index >= total){
        entryProgress.setAttribute('data-i18n', 'flow.progressComplete');
        entryProgress.removeAttribute('data-i18n-args');
        entryProgress.textContent = translate('flow.progressComplete', 'All questions complete');
      } else {
        const step = Math.max(1, index + 1);
        const clampedStep = Math.min(total, step);
        entryProgress.setAttribute('data-i18n', 'flow.progress');
        const args = { current: clampedStep, total };
        entryProgress.setAttribute('data-i18n-args', JSON.stringify(args));
        const template = translate('flow.progress', 'Question {current} of {total}');
        entryProgress.textContent = formatTemplate(template, args);
      }
    }
  }
  function setEntryChoiceDefault(){
    if(entrySpeakBtn){
      entrySpeakBtn.disabled = false;
      entrySpeakBtn.classList.remove('is-listening');
      const textEl = entrySpeakBtn.querySelector('.question-btn-label, .entry-label, .mic-text');
      if(textEl){
        textEl.setAttribute('data-i18n', MIC_COPY.idle.key);
        textEl.textContent = translate(MIC_COPY.idle.key, MIC_COPY.idle.fallback);
      }
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
    if(severityPointer){
      severityPointer.dataset.level = level;
    }
    if(severityDetail){
      severityDetail.dataset.level = level;
      severityDetail.classList.toggle('is-unknown', !level || level === 'unknown');
    }
    if(severityDetailIcon){
      severityDetailIcon.textContent = SEVERITY_ICON_MAP[level] || SEVERITY_ICON_MAP.unknown;
    }
    const detailCopy = SEVERITY_DETAIL_CONTENT[level] || SEVERITY_DETAIL_CONTENT.unknown;
    if(severityDetailTitle){
      const titleText = detailCopy.titleKey ? translate(detailCopy.titleKey, detailCopy.titleFallback) : detailCopy.titleFallback;
      severityDetailTitle.textContent = titleText;
      if(detailCopy.titleKey){
        severityDetailTitle.setAttribute('data-i18n', detailCopy.titleKey);
        severityDetailTitle.setAttribute('data-i18n-fallback', detailCopy.titleFallback);
      }else{
        severityDetailTitle.removeAttribute('data-i18n');
        severityDetailTitle.removeAttribute('data-i18n-fallback');
      }
    }
    if(severityDetailSummary){
      const summaryText = detailCopy.descKey ? translate(detailCopy.descKey, detailCopy.descFallback) : detailCopy.descFallback;
      severityDetailSummary.textContent = summaryText;
      if(detailCopy.descKey){
        severityDetailSummary.setAttribute('data-i18n', detailCopy.descKey);
        severityDetailSummary.setAttribute('data-i18n-fallback', detailCopy.descFallback);
      }else{
        severityDetailSummary.removeAttribute('data-i18n');
        severityDetailSummary.removeAttribute('data-i18n-fallback');
      }
    }
    return level;
  }
function renderHistory(){
    if(!histCards || !histEmpty) return;
    histCards.innerHTML = '';
    if(!isAuthed()){
      if(histEmpty){
        histEmpty.setAttribute('data-i18n', 'history.loginPrompt');
        histEmpty.setAttribute('data-i18n-fallback', 'Log in to see your recent check-ins.');
        histEmpty.textContent = translate('history.loginPrompt', 'Log in to see your recent check-ins.');
        histEmpty.classList.remove('is-hidden');
      }
      return;
    }
    const entries = readHist().slice(0,4);
    if(!entries.length){
      if(histEmpty){
        histEmpty.setAttribute('data-i18n', 'history.emptyModal');
        histEmpty.setAttribute('data-i18n-fallback', 'No saved check-ins yet. Your next check-in will appear here.');
        histEmpty.textContent = translate('history.emptyModal', 'No saved check-ins yet. Your next check-in will appear here.');
        histEmpty.classList.remove('is-hidden');
      }
      return;
    }
    histEmpty.classList.add('is-hidden');
    entries.forEach(entry=>{
      const card = document.createElement('article');
      const date = new Date(entry.ts||Date.now());
      const severityLabelRaw = normalizeDisplay(entry.severity) || '';
      const severityLevel = severityLevelFromText(severityLabelRaw);
      const severityKey = severityLevel && severityLevel !== 'unknown'
        ? `history.severity.${severityLevel}`
        : 'history.severity.none';
      const severityChipText = severityLevel === 'unknown'
        ? translate('history.reviewing', 'Reviewing')
        : translate(severityKey, toTitleCase(severityLevel || 'none'));
      const severityDescription = severityLabelRaw
        ? severityLabelRaw.split('(')[0].trim()
        : translate('history.severity.none', 'No severity');
      const usedSeverityFallback = !severityLabelRaw;

      const conditionRaw = normalizeDisplay(entry.condition);
      const usedConditionFallback = !conditionRaw;
      const conditionLabel = conditionRaw || translate('history.unknownCondition', 'General check-in');

      const transcriptRaw = normalizeDisplay(entry.transcript);
      const snippetFallback = translate('history.noText', 'No symptoms captured.');
      const previewSource = transcriptRaw || snippetFallback;
      const previewText = clipText(previewSource);
      const previewUsesFallback = !transcriptRaw;

      const adviceText = normalizeDisplay(entry.advice);
      const adviceHeading = translate('analysis.adviceTitle', 'Suggested next steps');

      const formattedTime = date.toLocaleString([], { dateStyle:'medium', timeStyle:'short' });
      card.className = `history-card history-card--${severityLevel}`;
      card.innerHTML = `
        <header class="history-card-head">
          <span class="history-chip history-chip--${severityLevel}">${severityChipText}</span>
          <time class="history-time" datetime="${date.toISOString()}">${formattedTime}</time>
        </header>
        <h3 class="history-condition">${conditionLabel}</h3>
        <p class="history-severity">${severityDescription}</p>
        <p class="history-snippet">${previewText}</p>
        ${adviceText ? `<div class="history-advice"><span data-i18n="analysis.adviceTitle">${adviceHeading}</span><p>${adviceText}</p></div>` : ''}
      `;
      const chipEl = card.querySelector('.history-chip');
      if(chipEl){
        if(severityLevel === 'unknown'){
          chipEl.setAttribute('data-i18n', 'history.reviewing');
        } else if(severityLevel){
          chipEl.setAttribute('data-i18n', severityKey);
        }
      }
      if(usedConditionFallback){
        card.querySelector('.history-condition')?.setAttribute('data-i18n', 'history.unknownCondition');
      }
      if(usedSeverityFallback){
        card.querySelector('.history-severity')?.setAttribute('data-i18n', 'history.severity.none');
      }
      if(previewUsesFallback){
        card.querySelector('.history-snippet')?.setAttribute('data-i18n', 'history.noText');
      }
      if(adviceText){
        const adviceLabel = card.querySelector('.history-advice span');
        adviceLabel?.setAttribute('data-i18n', 'analysis.adviceTitle');
        adviceLabel?.setAttribute('data-i18n-fallback', adviceHeading);
      }
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
    showAuthMessage(translate('history.loginPrompt', 'Please log in to view your history.'), 'error');
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
    const fallbackCondition = translate('analysis.defaultCondition', FALLBACK_ANALYSIS.condition);
    const fallbackSeverity = translate('analysis.defaultSeverity', FALLBACK_ANALYSIS.severity);
    const fallbackAdvice = translate('analysis.defaultAdvice', FALLBACK_ANALYSIS.advice);
    setAnalysisText(analysisCondition, null, 'analysis.defaultCondition', fallbackCondition);
    setAnalysisText(analysisSeverity, null, 'analysis.defaultSeverity', fallbackSeverity);
    setAnalysisText(analysisAdvice, null, 'analysis.defaultAdvice', fallbackAdvice);
    if(analysisTimestamp){
      analysisTimestamp.setAttribute('data-i18n', 'analysis.timestamp');
      analysisTimestamp.setAttribute('data-i18n-fallback', FALLBACK_ANALYSIS.timestamp);
      analysisTimestamp.removeAttribute('data-i18n-args');
      analysisTimestamp.textContent = translate('analysis.timestamp', FALLBACK_ANALYSIS.timestamp);
    }
    analysisCard?.classList.add('is-hidden');
    refreshBtn?.classList.add('is-hidden');
    applySeverityTheme('unknown');
  }
  function resetFlow(){
    currentQuestion = 0;
    currentAnswers = [];
    multiChoiceSelections.clear();
    questionText && (questionText.textContent = "");
    document.querySelector('#choicesContainer')?.remove();
    document.querySelector('#multiChoiceActions')?.remove();
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
    document.querySelector('#multiChoiceActions')?.remove();
    if(index >= questions.length){
      if(questionText){
        questionText.setAttribute('data-i18n', 'flow.thanks');
        questionText.setAttribute('data-i18n-fallback', 'Thanks! Your responses have been recorded.');
        questionText.textContent = translate('flow.thanks', 'Thanks! Your responses have been recorded.');
      }
      if(answerInput) answerInput.style.display='none';
      if(answerInputWrap) answerInputWrap.style.display='none';
      if(questionActions) questionActions.style.display='none';
      if(nextBtn) nextBtn.style.display='none';
      submitSACA(null,{fromFlow:true, mode:'predict'});
      return;
    }
    const q = questions[index];
    const isChoice = q.type === 'choice';
    const allowMultiple = isChoice && !!q.allowMultiple;
    if(questionHeading){
      if(q.textKey) questionHeading.setAttribute('data-i18n', q.textKey);
      if(q.fallback) questionHeading.setAttribute('data-i18n-fallback', q.fallback);
      questionHeading.textContent = translate(q.textKey, q.fallback || '');
    }
    if(questionText){
      if(isChoice){
        if(allowMultiple){
          questionText.setAttribute('data-i18n', 'flow.multiChoiceHint');
          questionText.setAttribute('data-i18n-fallback', 'Select all that apply.');
          questionText.textContent = translate('flow.multiChoiceHint', 'Select all that apply.');
        } else {
          questionText.setAttribute('data-i18n', 'flow.choiceHint');
          questionText.setAttribute('data-i18n-fallback', 'Choose the option that fits best.');
          questionText.textContent = translate('flow.choiceHint', 'Choose the option that fits best.');
        }
      } else {
        questionText.setAttribute('data-i18n', 'flow.textHint');
        questionText.setAttribute('data-i18n-fallback', 'Type a quick response below.');
        questionText.textContent = translate('flow.textHint', 'Type a quick response below.');
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
      if(q.useEntryIcons){
        choicesDiv.classList.add('entry-choice-options');
      }
      if(allowMultiple){
        multiChoiceSelections.clear();
      }
      q.options.forEach(opt=>{
        const resolvedValue = opt.value || opt.label || opt;
        const normalizedValue = typeof resolvedValue === 'string' ? resolvedValue.trim().toLowerCase() : '';
        const value = resolvedValue;
        let templateBtn = null;
        if(q.useEntryIcons){
          templateBtn = entryPresetButtonMap.get(normalizedValue) || null;
          if(!templateBtn){
            templateBtn = entryPresetButtons.find(preset=>{
              const presetValue = (preset.dataset.option || preset.textContent || '').trim().toLowerCase();
              return presetValue === normalizedValue;
            }) || null;
          }
        }
        let btn;
        let iconSpan;
        let labelSpan;
        if(templateBtn){
          btn = templateBtn.cloneNode(true);
          btn.type = 'button';
          btn.classList.remove('is-selected');
          btn.removeAttribute('aria-pressed');
          iconSpan = btn.querySelector('.choice-icon');
          labelSpan = btn.querySelector('.choice-label');
          const templateIcon = templateBtn.querySelector('.choice-icon');
          const iconMarkup = templateIcon ? templateIcon.innerHTML : getChoiceIcon(resolvedValue);
          if(iconSpan){
            iconSpan.innerHTML = iconMarkup;
          } else {
            iconSpan = document.createElement('span');
            iconSpan.className = 'choice-icon';
            iconSpan.innerHTML = iconMarkup;
            btn.insertBefore(iconSpan, btn.firstChild);
          }
          if(!labelSpan){
            labelSpan = document.createElement('span');
            labelSpan.className = 'choice-label';
            btn.appendChild(labelSpan);
          }
        } else {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'choiceBtn choice-card';
          if(q.useEntryIcons){
            btn.classList.add('entry-choice-card');
          }
          iconSpan = document.createElement('span');
          iconSpan.className = 'choice-icon';
          iconSpan.innerHTML = getChoiceIcon(resolvedValue);
          labelSpan = document.createElement('span');
          labelSpan.className = 'choice-label';
          btn.append(iconSpan, labelSpan);
        }
        btn.dataset.value = value;
        if(q.useEntryIcons){
          btn.dataset.option = value;
        }
        if(opt.labelKey) labelSpan.setAttribute('data-i18n', opt.labelKey);
        const fallbackLabel = typeof opt === 'string' ? opt : (resolvedValue || '');
        if(opt.labelKey) labelSpan.setAttribute('data-i18n-fallback', fallbackLabel);
        labelSpan.textContent = translate(opt.labelKey, fallbackLabel);
        if(allowMultiple){
          btn.classList.add('choice-card--toggle');
          btn.setAttribute('aria-pressed', 'false');
          btn.addEventListener('click',()=>{
            const isSelected = !btn.classList.contains('is-selected');
            btn.classList.toggle('is-selected', isSelected);
            btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            if(isSelected){
              multiChoiceSelections.add(value);
            } else {
              multiChoiceSelections.delete(value);
            }
          });
        } else {
          btn.addEventListener('click',()=>{
            saveAnswer(value);
            currentQuestion++;
            showQuestion(currentQuestion);
          });
        }
        choicesDiv.appendChild(btn);
      });
      questionText?.insertAdjacentElement('afterend', choicesDiv);
      if(allowMultiple){
        const actionsWrap = document.createElement('div');
        actionsWrap.id = 'multiChoiceActions';
        actionsWrap.className = 'question-actions multi-choice-actions';
        const continueBtn = document.createElement('button');
        continueBtn.type = 'button';
        continueBtn.className = 'question-btn question-btn--primary';
        continueBtn.setAttribute('data-i18n', 'flow.next');
        continueBtn.setAttribute('data-i18n-fallback', 'Next');
        continueBtn.textContent = translate('flow.next', 'Next');
        continueBtn.addEventListener('click', ()=>{
          if(!multiChoiceSelections.size){
            alert(translate('flow.requireAnswer', 'Please add your answer before continuing.'));
            return;
          }
          const combinedAnswer = Array.from(multiChoiceSelections).join(', ');
          saveAnswer(combinedAnswer);
          multiChoiceSelections.clear();
          currentQuestion++;
          showQuestion(currentQuestion);
        });
        actionsWrap.appendChild(continueBtn);
        choicesDiv.insertAdjacentElement('afterend', actionsWrap);
      }
    }
  }

  function setAnalysisText(node, text, key, fallback){
    if(!node) return;
    if(text && text.trim()){
      node.textContent = text;
      node.classList.remove('muted');
      if(key){
        node.removeAttribute('data-i18n');
        node.removeAttribute('data-i18n-fallback');
      }
    } else {
      if(key){
        node.setAttribute('data-i18n', key);
        if(fallback) node.setAttribute('data-i18n-fallback', fallback);
      }
      node.textContent = translate(key, fallback || '');
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
    if(micText){
      micText.setAttribute('data-i18n', copy.key);
      micText.setAttribute('data-i18n-fallback', copy.fallback);
      micText.textContent = translate(copy.key, copy.fallback);
    }
    micButton?.classList.toggle('is-listening', state==='listening');
    const activeButton = activeMicButton && activeMicButton !== micButton ? activeMicButton : micButton;
    if(activeButton && activeButton !== micButton){
      const textEl = activeButton.querySelector('.question-btn-label, .entry-label, .mic-text');
      if(textEl){
        textEl.setAttribute('data-i18n', copy.key);
        textEl.setAttribute('data-i18n-fallback', copy.fallback);
        textEl.textContent = translate(copy.key, copy.fallback);
      }
      activeButton.classList.toggle('is-listening', state==='listening');
    }
    applyStrings();
  }
  async function startRecording(){
    if(recordingState==='submitting') return;
    if(!navigator.mediaDevices?.getUserMedia){ alert(translate('errors.mediaUnsupported', FALLBACK_ERRORS.mediaUnsupported)); return; }
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
      alert(translate('errors.microphone', FALLBACK_ERRORS.microphone));
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
        alert(translate('errors.audioSubmit', FALLBACK_ERRORS.audioSubmit));
        console.error(err);
        setMicLabel('idle');
      }
    } else {
      alert(translate('errors.noAudio', FALLBACK_ERRORS.noAudio));
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
    formData.append('language', prefs.lang || 'en');
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
      const defaultConditionText = translate('analysis.defaultCondition', FALLBACK_ANALYSIS.condition);
      const defaultSeverityText = translate('analysis.defaultSeverity', FALLBACK_ANALYSIS.severity);
      const defaultAdviceText = translate('analysis.defaultAdvice', FALLBACK_ANALYSIS.advice);

      // === 🧠 Smarter language formatting for model results ===
      // 🩺 Predicted condition: Title-cased, clean
      let conditionSource = normalizeDisplay(parsed.condition) || normalizeDisplay(data.condition);
      if (conditionSource) {
        conditionSource = conditionSource
          .replace(/^["']+|["']+$/g, '') // strip surrounding quotes
          .replace(/\(.*?\)/g, '') // drop parenthetical extras
          .trim();
      }
      let conditionDisplay = conditionSource
        ? toTitleCase(conditionSource)
        : defaultConditionText;

// 🎚️ Severity: Natural, human phrasing
let severitySource = normalizeDisplay(parsed.severity) || normalizeDisplay(data.severity) || '';
let severityText = severitySource
  .replace(/severity\s*(level)?\s*:?\s*/i, '')
  .replace(/\(.*?\)/g, '')
  .trim();

let severityDisplay = defaultSeverityText;
if (severityText) {
  const lower = severityText.toLowerCase();
  if (lower.includes('severe')) {
    severityDisplay = translate('analysis.severitySevere', 'This condition appears severe.');
  } else if (lower.includes('moderate')) {
    severityDisplay = translate('analysis.severityModerate', 'This condition appears moderate.');
  } else if (lower.includes('mild') || lower.includes('light')) {
    severityDisplay = translate('analysis.severityMild', 'This condition appears mild.');
  } else {
    const severityTemplate = translate('analysis.severityGeneric', 'Current severity: {severity}.');
    severityDisplay = formatTemplate(severityTemplate, { severity: toTitleCase(severityText) });
  }
}

let adviceDisplay = normalizeDisplay(parsed.advice) || normalizeDisplay(data.advice) || defaultAdviceText;
if (adviceDisplay !== defaultAdviceText) {
  const localizedAdvice = translateModelText(adviceDisplay);
  if(localizedAdvice){
    adviceDisplay = localizedAdvice;
  } else {
    adviceDisplay = adviceDisplay
      .replace(/^u\s*/i, '')
      .replace(/^\s*a\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (adviceDisplay && !/^[A-Z]/.test(adviceDisplay)) {
      adviceDisplay = adviceDisplay.charAt(0).toUpperCase() + adviceDisplay.slice(1);
    }
    if (adviceDisplay && !/[.!?]$/.test(adviceDisplay)) {
      adviceDisplay += '.';
    }
    const cleanedLocalizedAdvice = translateModelText(adviceDisplay);
    if(cleanedLocalizedAdvice){
      adviceDisplay = cleanedLocalizedAdvice;
    }
  }
}


      // ✅ Apply updated outputs
      setAnalysisText(analysisCondition, conditionDisplay, 'analysis.defaultCondition', defaultConditionText);
      setAnalysisText(analysisSeverity, severityDisplay, 'analysis.defaultSeverity', defaultSeverityText);
      setAnalysisText(analysisAdvice, adviceDisplay, 'analysis.defaultAdvice', defaultAdviceText);
      applySeverityTheme(severitySource || severityDisplay);
      if(analysisTimestamp){
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
        const updatedTemplate = translate('analysis.updated', 'Updated {time}');
        analysisTimestamp.setAttribute('data-i18n', 'analysis.updated');
        analysisTimestamp.setAttribute('data-i18n-fallback', 'Updated {time}');
        analysisTimestamp.setAttribute('data-i18n-args', JSON.stringify({ time: timeString }));
        analysisTimestamp.textContent = formatTemplate(updatedTemplate, { time: timeString });
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
      if(!options.silent){ alert(translate('errors.uploadFailed', FALLBACK_ERRORS.uploadFailed)); }
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
  langSelect?.addEventListener('change', ()=>{ prefs.lang=langSelect.value; savePrefs(); applyStrings(); });
  themeSelect?.addEventListener('change', ()=>{ prefs.theme=themeSelect.value; savePrefs(); applyTheme(); });
  contrastToggle?.addEventListener('change', ()=>{ prefs.contrast=contrastToggle.checked?'high':'normal'; savePrefs(); applyContrast(); });
  easyToggle?.addEventListener('change', ()=>{ prefs.easy=!!easyToggle.checked; savePrefs(); applyEasy(); });

  nextBtn?.addEventListener('click', ()=>{
    const ans = (answerInput?.value||'').trim();
    if(ans){ saveAnswer(ans); currentQuestion++; showQuestion(currentQuestion); }
    else alert(translate('flow.requireAnswer', 'Please add your answer before continuing.'));
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
