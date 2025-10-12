(function(){
  const PREF_KEY='sacaPrefs', LS_KEY='sacaHistory', CHAT_KEY='sacaChat';
  const qs = s=>document.querySelector(s);
  const STR = window.STR;

  // ---------------------- Preferences ----------------------
  const prefs = JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
  const langSelect = qs('#langSelect'), themeSelect = qs('#themeSelect');
  const contrastToggle = qs('#contrastToggle'), easyToggle = qs('#easyToggle');

  function savePrefs(){ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }
  function applyTheme(){ document.documentElement.setAttribute('data-theme', prefs.theme||'auto'); }
  function applyContrast(){ document.documentElement.setAttribute('data-contrast', prefs.contrast==='high'?'high':'normal'); }
  function applyEasy(){ document.body.classList.toggle('easy-read', !!prefs.easy); }

  function t(path){
    const parts = path.split('.'); let cur = STR[prefs.lang||'en']||STR.en;
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
  function initPrefsUI(){
    langSelect.value = prefs.lang||'en';
    themeSelect.value = prefs.theme||'auto';
    contrastToggle.checked = prefs.contrast==='high';
    easyToggle.checked = !!prefs.easy;
    applyTheme(); applyContrast(); applyEasy(); applyStrings();
  }
  langSelect.addEventListener('change', ()=>{ prefs.lang=langSelect.value; savePrefs(); applyStrings(); });
  themeSelect.addEventListener('change', ()=>{ prefs.theme=themeSelect.value; savePrefs(); applyTheme(); });
  contrastToggle.addEventListener('change', ()=>{ prefs.contrast=contrastToggle.checked?'high':'normal'; savePrefs(); applyContrast(); });
  easyToggle.addEventListener('change', ()=>{ prefs.easy=!!easyToggle.checked; savePrefs(); applyEasy(); });
  window.addEventListener('load', initPrefsUI);

  // ---------------------- NLP / Triage ----------------------
  const RULES = {
    categories: [
      {key:'breathing',terms:['trouble breathing','shortness of breath','wheeze','asthma','can’t breathe','cant breathe','breathless']},
      {key:'chest',terms:['chest pain','tight chest','pressure chest']},
      {key:'belly',terms:['stomach pain','abdominal pain','vomit','diarrhoea','diarrhea','nausea','belly ache']},
      {key:'skin',terms:['rash','hives','itchy','skin','swelling lips','swelling tongue']},
      {key:'fever',terms:['fever','temperature','high temp','chills']},
      {key:'injury',terms:['injury','bleeding','fracture','head injury','burn','cut','wound']}
    ],
    severe:['severe','unconscious','not breathing','stopped breathing','blue lips','heavy bleeding','spurting blood','chest pain','shortness of breath','can’t breathe','cant breathe','numbness','weakness one side','stroke','anaphylaxis','allergic reaction','seizure','fitting'],
    moderate:['moderate','worsening','high fever','persistent','vomiting','dehydration','pain 7/10','blood in','wheeze','asthma flare']
  };

  function processNLP(text){ return (text||'').trim().replace(/\s+/g,' ').toLowerCase(); }
  function assessSeverity(text){
    const tt = processNLP(text);
    if(!tt) return {level:'none', category:null, advice:'Start'};
    let cat=null; for(const c of RULES.categories) if(c.terms.some(term=>tt.includes(term))){ cat=c.key; break; }
    const sev = RULES.severe.some(x=>tt.includes(x)) ? 'severe' : RULES.moderate.some(x=>tt.includes(x)) ? 'moderate' : 'mild';
    let advice = "Rest, hydrate, and monitor. If symptoms persist, see GP.";
    if(sev==='moderate') advice = "Same-day GP / urgent care recommended.";
    if(sev==='severe') advice = "Emergency! Call 000 now or go to nearest hospital.";
    return {level:sev, category:cat, advice};
  }

  // ---------------------- History ----------------------
  function readHist(){ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }
  function writeHist(a){ localStorage.setItem(LS_KEY,JSON.stringify(a)); }
  function addHistory(raw,nlp){ if(!raw && !nlp) return; const a=readHist(); a.unshift({ts:Date.now(),raw,nlp}); writeHist(a); renderHistory(); }
  function renderHistory(){
    const tbody = qs('#histTable tbody'); if(!tbody) return;
    const rows = readHist(); tbody.innerHTML='';
    if(!rows.length){ qs('#histTable').style.display='none'; return; } qs('#histTable').style.display='table';
    rows.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${new Date(r.ts).toLocaleString()}</td><td class="mono">${r.raw}</td><td class="mono">${r.nlp}</td>`; tbody.appendChild(tr); });
  }
  qs('#saveFromHome')?.addEventListener('click',()=>{ addHistory(qs('#answerInput')?.value||'', processNLP(qs('#answerInput')?.value||'')); });
  qs('#clearHistory')?.addEventListener('click',()=>{ if(confirm('Clear all saved entries?')){ writeHist([]); renderHistory(); } });
  qs('#seedHistory')?.addEventListener('click',()=>{ const seed=[{ts:Date.now()-86400000,raw:'chest pain',nlp:processNLP('chest pain')}]; writeHist([...seed,...readHist()]); renderHistory(); });
  window.addEventListener('load', renderHistory);

  // ---------------------- Question Flow ----------------------
  const questions = [
    { text: "1️⃣ How are you feeling today?", type: "text" },
    { text: "2️⃣ How long have you been feeling this?", type: "choice", options: ["A few hours","A day","2–3 days","A week or more"] },
    { text: "3️⃣ How bad is the issue?", type: "choice", options: ["Light","Medium","Severe"] },
    { text: "4️⃣ Have you noticed other symptoms?", type: "choice", options: ["Fever","Nausea","Cough","Diarrhea","Chest pain","Dizziness","None"] }
  ];
  let currentQuestion = 0;
  const questionText = qs('#questionText'), answerInput = qs('#answerInput'), nextBtn = qs('#nextQuestion');

  let currentAnswers = []; // NEW: only answers for current question flow

function saveAnswer(answer){
    if(!answer) return;

    // Add to current session answers
    currentAnswers.push(answer);

    // Optionally, also store in local history
    const historyArr = JSON.parse(localStorage.getItem('sacaHistory')||'[]');
    historyArr.push({ ts: Date.now(), answer });
    localStorage.setItem('sacaHistory', JSON.stringify(historyArr));
    renderHistory();
}



  function showQuestion(index){
    if(index >= questions.length){
      questionText.textContent = "✅ Thank you! Your responses have been recorded.";
      answerInput.style.display = "none"; nextBtn.style.display = "none";
      const oldChoices = qs('#choicesContainer'); if(oldChoices) oldChoices.remove();
      submitSACA();
      return;
    }
    const q = questions[index];
    questionText.textContent = q.text;
    const oldChoices = qs('#choicesContainer'); if(oldChoices) oldChoices.remove();
    if(q.type==='text'){
      answerInput.style.display='block'; answerInput.value=''; nextBtn.style.display='inline-block';
    } else if(q.type==='choice'){
      answerInput.style.display='none'; nextBtn.style.display='none';
      const choicesDiv = document.createElement('div'); choicesDiv.id='choicesContainer';
      q.options.forEach(opt=>{
        const btn = document.createElement('button'); btn.textContent=opt; btn.classList.add('choiceBtn');
        btn.addEventListener('click',()=>{ saveAnswer(opt); currentQuestion++; showQuestion(currentQuestion); });
        choicesDiv.appendChild(btn);
      });
      questionText.insertAdjacentElement('afterend', choicesDiv);
    }
  }

  nextBtn.addEventListener('click', ()=>{
    const ans = answerInput.value.trim();
    if(ans){ saveAnswer(ans); currentQuestion++; showQuestion(currentQuestion); } else alert('Enter answer first.');
  });
  answerInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); nextBtn.click(); } });
  showQuestion(currentQuestion);

  // ---------------------- Audio ----------------------
  let mediaRecorder, audioChunks = [];
  const recordBtn = qs("#recordBtn"), stopBtn = qs("#stopBtn"), uploadBtn = qs("#uploadBtn"), audioPreview = qs("#audioPreview");

  recordBtn.addEventListener("click", async ()=>{
    audioChunks=[]; const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
    mediaRecorder = new MediaRecorder(stream); mediaRecorder.start();
    recordBtn.disabled=true; stopBtn.disabled=false;
    mediaRecorder.ondataavailable = e=>audioChunks.push(e.data);
    mediaRecorder.onstop = ()=>{ audioPreview.src=URL.createObjectURL(new Blob(audioChunks,{type:'audio/wav'})); uploadBtn.disabled=false; };
  });
  stopBtn.addEventListener("click", ()=>{ mediaRecorder.stop(); recordBtn.disabled=false; stopBtn.disabled=true; });

  // ---------------------- Submit ----------------------
 window.submitSACA = async function(audioBlob=null){
    if(currentAnswers.length === 0){
        alert("Please answer all questions before submitting.");
        return;
    }

    // Only include the current session's answers
    const normalizedText = currentAnswers.join(",\n        ");

    const formData = new FormData();
    if(audioBlob) formData.append("file", audioBlob, "user_audio.wav");
    formData.append("answers", JSON.stringify({ text: normalizedText }));

    try {
        const res = await fetch("/upload-audio", { method:"POST", body: formData });
        if(!res.ok){ alert("Upload failed"); return; }
        const data = await res.json();
        console.log("SACA Response:", data);

        // Display results
        const sacaResultDiv = document.querySelector("#sacaResult");
        const sacaText = document.querySelector("#sacaText");

        sacaText.textContent =
          `Normalized Text:\n${normalizedText}\n\n` +
          `SACA Result:\n${data.result}\n\n` +
          `Download Audio: ${data.download || "No audio submitted"}`;

        sacaResultDiv.style.display = "block";

        // Clear session answers after submit if needed
        currentAnswers = [];
    } catch(err){
        console.error(err);
        alert("Upload failed");
    }
};




  uploadBtn.addEventListener("click", ()=>{ if(audioChunks.length>0) submitSACA(new Blob(audioChunks,{type:'audio/wav'})); else submitSACA(); });

})();
