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
  const langSelect = qs('#langSelect');
  const themeSelect = qs('#themeSelect');
  const contrastToggle = qs('#contrastToggle');
  const easyToggle = qs('#easyToggle');

  const questions = [
    { text: "How are you feeling today?", type: "text" },
    { text: "How long have you been feeling this?", type: "choice", options: ["A few hours","A day","2-3 days","A week or more"] },
    { text: "How bad is the issue?", type: "choice", options: ["Light","Medium","Severe"] },
    { text: "Have you noticed any other symptoms?", type: "choice", options: ["Fever","Nausea or vomiting","Cough or breathing difficulty","Diarrhea","Chest pain or tightness","Dizziness or fatigue","None of these"] }
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
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M7 14h2v2H7zM11 14h2v2h-2zM15 14h2v2h-2z"/></svg>`,
    gauge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 19a8.5 8.5 0 1 1 13 0Z"/><path d="M12 12l3.5 3.5"/><path d="M7 12h.01M12 7v.01M17 12h.01M12 17h.01"/></svg>`,
    thermo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76A3 3 0 1 1 10 14V5a2 2 0 1 1 4 0z"/><path d="M10 11h4"/></svg>`,
    lungs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v8M12 11c-1.5-2-4-3-6-2V19c2 0 3.5-.5 5-2m1-6c1.5-2 4-3 6-2V19c-2 0-3.5-.5-5-2"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-6.5-4.35-8.5-8.04C1.5 8.58 3.5 5 6.75 5c2.07 0 3.25 1.32 3.25 1.32S11.93 5 14 5c3.25 0 5.25 3.58 3.5 6.96C18.5 15.65 12 20 12 20Z"/></svg>`,
    stomach: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3v4a4 4 0 0 1-4 4H9.5c-2.5 0-4.5 2-4.5 5a6 6 0 0 0 12 0c0-1.6-.7-3.05-1.8-4"/></svg>`,
    dizzy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="m9 9 1.5 1.5M15 15l-1.5-1.5M15 9l-1.5 1.5M9 15l1.5-1.5M9.75 18.5c.7-.3 1.5-.5 2.25-.5s1.55.2 2.25.5"/></svg>`,
    rest: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 14h16M5 7v11M19 7v11"/><path d="M9.5 11a1.5 1.5 0 1 0 0-3"/></svg>`,
    walk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="5" r="1.5"/><path d="M9 21l1-4 3-3m3 7-1-5-2-2m1-3-2-1-2 1-1.5 2M16 13l2-2"/></svg>`,
    swirl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4a7 7 0 1 1 4 13c-3 0-4-3-2-4 3-2 1-6-2-6-4 0-6 5-3 8"/></svg>`,
    question: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7a3 3 0 1 1 6 0c0 2-3 3-3 5"/><path d="M12 17h.01"/></svg>`
  };

  function getChoiceIcon(option){
    const text = (option||'').toLowerCase();
    if(text.includes('hour')) return ICONS.clock;
    if(text.includes('day') || text.includes('week')) return ICONS.calendar;
    if(text.includes('light')) return ICONS.sun;
    if(text.includes('medium')) return ICONS.gauge;
    if(text.includes('severe')) return ICONS.dizzy;
    if(text.includes('fever')) return ICONS.thermo;
    if(text.includes('nausea') || text.includes('vomit')) return ICONS.stomach;
    if(text.includes('cough') || text.includes('breath')) return ICONS.lungs;
    if(text.includes('diarr')) return ICONS.swirl;
    if(text.includes('chest')) return ICONS.heart;
    if(text.includes('dizziness') || text.includes('fatigue')) return ICONS.dizzy;
    if(text.includes('none')) return ICONS.question;
    if(text.includes('eat')) return ICONS.stomach;
    if(text.includes('rest')) return ICONS.rest;
    if(text.includes('moving') || text.includes('standing')) return ICONS.walk;
    if(text.includes('random')) return ICONS.swirl;
    if(text.includes('sure')) return ICONS.question;
    return ICONS.question;
  }

  function savePrefs(){ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }
  function applyTheme(){ document.documentElement.setAttribute('data-theme', prefs.theme||'auto'); }
  function applyContrast(){ document.documentElement.setAttribute('data-contrast', prefs.contrast==='high'?'high':'normal'); }
  function applyEasy(){ document.body.classList.toggle('easy-read', !!prefs.easy); }

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
  applyStrings();
})();
