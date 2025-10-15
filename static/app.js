(function(){
  const PREF_KEY='sacaPrefs', LS_KEY='sacaHistory', AUTH_KEY='sacaAuth';
  const qs = s=>document.querySelector(s);
  const STR = window.STR;

  const heroIntro = qs('#heroIntro');
  const micButton = qs('#micHome');
  const micText = micButton?.querySelector('.mic-text');
  const showGuidedBtn = qs('#showGuided');
  const guidedBox = qs('#guidedBox');
  const guidedActions = qs('#guidedActions');
  const questionText = qs('#questionText');
  const answerInput  = qs('#answerInput');
  const nextBtn      = qs('#nextQuestion');
  const analysisCard = qs('#sacaResult');
  const analysisCondition = qs('#analysisCondition');
  const analysisSeverity = qs('#analysisSeverity');
  const analysisAdvice = qs('#analysisAdvice');
  const analysisTimestamp = qs('#analysisTimestamp');
  const refreshBtn = qs('#resetExperience');
  const historyCard = qs('#historyCard');
  const homeCards = qs('#homeCards');
  const historyContent = qs('#historyContent');
  const historyLocked = qs('#historyLocked');
  const histCards = qs('#histCards');
  const histEmpty = qs('#histEmpty');
  const openAuth = qs('#openAuth');
  const logoutBtn = qs('#logoutBtn');
  const loginEmail = qs('#loginEmail');
  const loginPass = qs('#loginPass');
  const loginBtn = qs('#doLogin');
  const loginOk = qs('#loginOk');
  const authEls = document.querySelectorAll('[data-requires-auth]');

  const DEFAULT_CONDITION = "No condition predicted yet.";
  const DEFAULT_SEVERITY = "Severity will appear once we have enough detail.";
  const DEFAULT_ADVICE = "We'll share guidance once an assessment is complete.";
  const DEFAULT_TIMESTAMP = "Awaiting input...";

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
    { text: "Have you noticed any other symptoms?", type: "choice", options: ["Fever","Nausea or vomiting","Cough or breathing difficulty","Diarrhea","Chest pain or tightness","Dizziness or fatigue","None of these"] },
    { text: "Does it get better or worse after any of these?", type: "choice", options: ["After eating","When resting","When moving or standing","Changes randomly","Not sure"] }
  ];

  let currentQuestion = 0;
  let currentAnswers = [];
  let guidedStarted = false;

  let mediaRecorder = null;
  let audioChunks = [];
  let micStream = null;
  let recordingState = 'idle';

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
  function setAuth(next){ auth = (next && next.email) ? { email: next.email } : null; persistAuth(); updateAuthUI(); }
  function guardProtectedLink(evt){ if(isAuthed()) return; evt?.preventDefault(); alert(t('history.lockedPrompt') || 'Please log in to view your history.'); window.location.hash = '#auth'; }
  function initPrefsUI(){
    if(langSelect) langSelect.value = prefs.lang||'en';
    if(themeSelect) themeSelect.value = prefs.theme||'auto';
    if(contrastToggle) contrastToggle.checked = prefs.contrast==='high';
    if(easyToggle) easyToggle.checked = !!prefs.easy;
    applyTheme(); applyContrast(); applyEasy(); applyStrings();
  }

  function normalizeDisplay(text){
    if(!text) return '';
    try{ return text.normalize('NFKD').replace(/[^A-Za-z0-9.,()%+\-\/\s]/g,' ').replace(/\s+/g,' ').trim(); }
    catch(err){ return String(text).replace(/[^A-Za-z0-9.,()%+\-\/\s]/g,' ').replace(/\s+/g,' ').trim(); }
  }
  function clipText(text, max=160){
    if(!text) return '';
    return text.length<=max ? text : `${text.slice(0,max-1)}...`;
  }
  function severityBadgeFromText(text){
    const lower = (text||'').toLowerCase();
    if(lower.includes('severe')) return 'badge badge-severe';
    if(lower.includes('moderate')) return 'badge badge-moderate';
    if(lower.includes('mild')) return 'badge badge-mild';
    return 'badge badge-neutral';
  }
  function renderHistory(){
    if(!histCards || !histEmpty) return;
    if(!isAuthed()){
      histCards.innerHTML='';
      histEmpty.classList.add('is-hidden');
      return;
    }
    const entries = readHist().slice(0,4);
    histCards.innerHTML='';
    if(!entries.length){
      histEmpty.textContent = t('history.empty') || 'Your latest check-ins will appear here.';
      histEmpty.classList.remove('is-hidden');
      return;
    }
    histEmpty.classList.add('is-hidden');
    entries.forEach(entry=>{
      const card = document.createElement('article'); card.className='hist-card';
      const date = new Date(entry.ts||Date.now());
      const timeEl = document.createElement('time');
      timeEl.dateTime = date.toISOString();
      timeEl.textContent = date.toLocaleString();

      const preview = document.createElement('p');
      preview.className='hist-preview';
      preview.textContent = clipText(normalizeDisplay(entry.transcript)||t('history.noText')||'No transcript captured.');

      const meta = document.createElement('div'); meta.className='hist-meta';
      const severityLabel = normalizeDisplay(entry.severity) || t('history.severity.none') || 'Not rated';
      const severityBadge = document.createElement('span'); severityBadge.className = severityBadgeFromText(severityLabel); severityBadge.textContent = severityLabel.split('(')[0].trim() || severityLabel;
      const conditionLabel = normalizeDisplay(entry.condition) || t('history.unknownCondition') || 'General check-in';
      const conditionTag = document.createElement('span'); conditionTag.className='condition-tag'; conditionTag.textContent = conditionLabel;
      meta.append(severityBadge, conditionTag);

      card.append(timeEl, preview, meta);

      const adviceText = normalizeDisplay(entry.advice);
      if(adviceText){ const adviceEl = document.createElement('p'); adviceEl.className='hist-advice'; adviceEl.textContent = adviceText; card.appendChild(adviceEl); }

      histCards.appendChild(card);
    });
  }
  function readHist(){ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }
  function writeHist(entries){ localStorage.setItem(LS_KEY, JSON.stringify(entries)); }
  function logHistoryEntry(data){
    if(!isAuthed()) return;
    const entries = readHist();
    const record = {
      ts: Date.now(),
      transcript: normalizeDisplay(data?.transcript)||null,
      condition: normalizeDisplay(data?.condition)||null,
      severity: normalizeDisplay(data?.severity)||null,
      advice: normalizeDisplay(data?.advice)||null
    };
    writeHist([record, ...entries].slice(0,4));
    renderHistory();
  }

  function resetAnalysisView(){
    setAnalysisText(analysisCondition, DEFAULT_CONDITION, DEFAULT_CONDITION);
    setAnalysisText(analysisSeverity, DEFAULT_SEVERITY, DEFAULT_SEVERITY);
    setAnalysisText(analysisAdvice, DEFAULT_ADVICE, DEFAULT_ADVICE);
    if(analysisTimestamp) analysisTimestamp.textContent = DEFAULT_TIMESTAMP;
    analysisCard?.classList.add('is-hidden');
    refreshBtn?.classList.add('is-hidden');
  }
  function resetFlow(){
    currentQuestion = 0;
    currentAnswers = [];
    questionText && (questionText.textContent = "");
    document.querySelector('#choicesContainer')?.remove();
    if(answerInput){ answerInput.value=''; answerInput.style.display='block'; }
    if(nextBtn) nextBtn.style.display='inline-block';
  }
  function openGuidedFlow(options={}){
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
    document.querySelector('#choicesContainer')?.remove();
    if(index >= questions.length){
      questionText && (questionText.textContent = "Thanks! Your responses have been recorded.");
      if(answerInput) answerInput.style.display='none';
      if(nextBtn) nextBtn.style.display='none';
      submitSACA(null,{fromFlow:true});
      return;
    }
    const q = questions[index];
    questionText && (questionText.textContent = q.text);
    if(q.type === 'text'){
      if(answerInput){
        answerInput.style.display='block';
        if(currentAnswers.length){ answerInput.value = currentAnswers[0]; }
        else answerInput.value='';
      }
      if(nextBtn) nextBtn.style.display='inline-block';
    } else if(q.type === 'choice'){
      if(answerInput) answerInput.style.display='none';
      if(nextBtn) nextBtn.style.display='none';
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
    if(text){ node.textContent = text; node.classList.remove('muted'); }
    else { node.textContent = fallback; node.classList.add('muted'); }
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
  function formatWithConfidence(label, confidence){
    if(!label) return null;
    if(typeof confidence === 'number' && !Number.isNaN(confidence)){
      const pct = Math.round(confidence*100);
      return `${label} (${pct}% confidence)`;
    }
    return label;
  }

  function setMicLabel(state){
    recordingState = state;
    if(!micButton) return;
    const map = { listening:'home.micListening', submitting:'home.micSubmitting' };
    const key = map[state] || 'home.mic';
    if(micText){ micText.setAttribute('data-i18n', key); }
    micButton.classList.toggle('is-listening', state==='listening');
    applyStrings();
  }
  async function startRecording(){
    if(recordingState==='submitting') return;
    if(!navigator.mediaDevices?.getUserMedia){ alert('Audio recording is not supported in this browser.'); return; }
    try{
      micButton && (micButton.disabled = true);
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
      if(micButton) micButton.disabled = false;
    }
  }
  function stopRecording(){
    if(recordingState!=='listening') return;
    setMicLabel('submitting');
    if(micButton) micButton.disabled = true;
    try{ mediaRecorder?.stop(); }
    catch(err){ console.error(err); handleStop(); }
  }
  async function handleStop(){
    const blob = audioChunks.length ? new Blob(audioChunks,{type:'audio/wav'}) : null;
    if(micStream){ micStream.getTracks().forEach(track=>track.stop()); micStream=null; }
    audioChunks = [];
    mediaRecorder = null;
    if(blob && blob.size){
      try{ await submitSACA(blob,{allowEmpty:true, fromAudio:true}); }
      catch(err){ alert('Audio submission failed.'); console.error(err); }
    } else {
      alert('No audio captured. Please try again.');
      setMicLabel('idle');
    }
    if(micButton){ micButton.disabled = false; if(recordingState!=='listening') setMicLabel('idle'); }
  }

  async function submitSACA(audioBlob=null, options={}){
    const allowEmpty = !!options.allowEmpty || !!audioBlob;
    const fromFlow = !!options.fromFlow;
    const fromAudio = !!options.fromAudio;
    if(!allowEmpty && currentAnswers.length === 0){
      alert(t('home.needAnswers') || 'Please answer all questions before submitting.');
      return null;
    }

    const answersForSend = currentAnswers.length ? [...currentAnswers] : [];
    const formData = new FormData();
    if(audioBlob) formData.append('file', audioBlob, 'user_audio.wav');
    formData.append('answers', JSON.stringify({ answers: answersForSend }));

    try {
      const res = await fetch('/upload-audio', { method:'POST', body: formData });
      if(!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      const transcriptText = normalizeDisplay(data.transcription || data.transcript || data.nlp_text || answersForSend[0]);

      if(fromAudio){
        resetAnalysisView();
        currentAnswers = [];
        guidedStarted = false;
        if(transcriptText){
          openGuidedFlow({ prefill: transcriptText, autoFocus:false });
        } else {
          openGuidedFlow({ autoFocus:true });
        }
        setMicLabel('idle');
        return data;
      }

      const parsed = parseAnalysis(data.result || '');
      const conditionDisplay = normalizeDisplay(formatWithConfidence(parsed.condition, parsed.conditionConfidence)) || DEFAULT_CONDITION;
      const severityDisplay = normalizeDisplay(formatWithConfidence(parsed.severity, parsed.severityConfidence) || data.severity) || DEFAULT_SEVERITY;
      const adviceDisplay = normalizeDisplay(parsed.advice || data.advice) || DEFAULT_ADVICE;

      setAnalysisText(analysisCondition, conditionDisplay, DEFAULT_CONDITION);
      setAnalysisText(analysisSeverity, severityDisplay, DEFAULT_SEVERITY);
      setAnalysisText(analysisAdvice, adviceDisplay, DEFAULT_ADVICE);
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

      if(fromAudio && transcriptText){
        currentAnswers = [];
        guidedStarted = false;
        openGuidedFlow({ prefill: transcriptText, autoFocus:false });
      } else {
        currentAnswers = [];
        guidedStarted = false;
      }

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
    heroIntro?.classList.remove('is-hidden');
    micButton?.classList.remove('is-hidden','is-listening');
    micButton && (micButton.disabled = false);
    showGuidedBtn?.classList.remove('is-hidden');
    refreshBtn?.classList.add('is-hidden');
    guidedBox?.classList.add('is-hidden');
    guidedActions?.classList?.add('is-hidden');
    document.querySelector('#choicesContainer')?.remove();
    resetAnalysisView();
  }

  function updateAuthUI(){
    const authed = isAuthed();
    if(openAuth){
      openAuth.setAttribute('data-i18n', authed ? 'ui.account' : 'ui.login');
      openAuth.setAttribute('href', '#auth');
    }
    logoutBtn?.classList.toggle('is-hidden', !authed);
    if(historyCard){
      historyCard.setAttribute('href', authed ? '#history' : '#auth');
      if(!authed) historyCard.setAttribute('aria-disabled','true'); else historyCard.removeAttribute('aria-disabled');
    }
    homeCards?.classList.toggle('is-hidden', !authed);
    historyLocked?.classList.toggle('is-hidden', authed);
    historyContent?.classList.toggle('is-hidden', !authed);
    if(!authed){
      histCards?.replaceChildren();
      histEmpty?.classList.add('is-hidden');
    } else {
      renderHistory();
    }
    applyStrings();
  }

  loginBtn?.addEventListener('click', ()=>{
    const email = (loginEmail?.value||'').trim();
    const pass = (loginPass?.value||'').trim();
    if(!email || !pass){ alert(t('auth.requireFields') || 'Enter email and password to continue.'); return; }
    setAuth({ email });
    if(loginPass) loginPass.value='';
    if(loginOk){ loginOk.style.display='inline'; setTimeout(()=>{ loginOk.style.display='none'; }, 2400); }
    window.location.hash = '#home';
  });
  logoutBtn?.addEventListener('click', ()=>{ setAuth(null); resetExperience(); if(loginOk) loginOk.style.display='none'; window.location.hash='#home'; });

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
  refreshBtn?.addEventListener('click', resetExperience);

  micButton?.addEventListener('click', ()=>{
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
