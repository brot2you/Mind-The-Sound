/* Mind the Sound! — Beatbox City V2
 * Static educational web app. Speech playback uses device TTS; voice recordings
 * stay in browser memory, never sent to any service. Not an automatic speech scorer.
 */
(() => {
'use strict';
const CODES = window.SOUND_CODES || [];
const FAMILIES = window.SOUND_FAMILIES || [];
const app = document.getElementById('app');
const toast = document.getElementById('toast');
const STORE_KEY = 'mind-the-sound-v2';
const OLD_KEY = 'mind-the-sound-v1';
const asset = file => `assets/${file}`;
const districtData = {
  vowels: { title:'Vowel Street',sub:'Voyelles & diphtongues',img:'vowels-scene.webp',range:'P01–P10',accent:'#ff60aa',description:'Distingue les sons qui changent le sens des mots.'},
  consonants: {title:'Consonant Corner',sub:'Consonnes & articulation',img:'consonants-scene.webp',range:'P11–P20',accent:'#46e9ff',description:'Découvre le placement de ta langue, de tes lèvres et de ta voix.'},
  endings: {title:'Rhythm Square',sub:'Terminaisons -ED & -S',img:'endings-scene.webp',range:'P21–P26',accent:'#ffd14d',description:'Déchiffre les terminaisons parlées, pas seulement écrites.'},
  rhythm: {title:'Intonation Avenue',sub:'Rythme & intonation',img:'rhythm-scene.webp',range:'P27–P32',accent:'#b78cff',description:'Donne le bon rythme et la bonne mélodie à tes phrases.'}
};
const badgeSpecs = [
['01-first-steps.png','First Steps','Terminer une première mission',s=>s.complete>=1],
['02-good-listener.png','Good Listener','Terminer 3 missions',s=>s.complete>=3],
['03-sound-detective.png','Sound Detective','Terminer 5 missions',s=>s.complete>=5],
['04-th-master.png','TH Master','Terminer P11 et P12',s=>s.has('P11')&&s.has('P12')],
['05-vowel-expert.png','Vowel Expert','Terminer 5 missions de voyelles',s=>s.family.vowels>=5],
['06-consonant-champ.png','Consonant Champ','Terminer 5 missions de consonnes',s=>s.family.consonants>=5],
['07-rhythm-hero.png','Rhythm Hero','Terminer 3 missions de rythme',s=>s.family.rhythm>=3],
['08-intonation-star.png','Intonation Star','Terminer P30 et P31',s=>s.has('P30')&&s.has('P31')],
['09-perfect-streak.png','Perfect Streak','Réussir 3 défis sans erreur',s=>s.perfect>=3],
['10-big-progress.png','Big Progress','Terminer 10 missions',s=>s.complete>=10],
['11-challenge-master.png','Challenge Master','Terminer 15 missions',s=>s.complete>=15],
['12-speak-like-a-pro.png','Speak Like a Pro','Terminer 20 missions',s=>s.complete>=20],
['13-sound-explorer.png','Sound Explorer','Découvrir les 4 quartiers',s=>Object.values(s.family).every(x=>x>=1)],
['14-audio-creator.png','Audio Creator','S’enregistrer dans 3 missions',s=>s.recorded>=3],
['15-beatbox-legend.png','Beatbox Legend','Terminer 25 missions',s=>s.complete>=25],
['16-pronunciation-master.png','Pronunciation Master','Terminer les 32 missions',s=>s.complete===CODES.length]
];
const stepNames=['Listen','Discover','Understand','Practise','Record'];
const stepIcons=['listen-symbol.png','discover-rule-symbol.png','discover-rule-symbol.png','practice-symbol.png','record-symbol.png'];
let toastTimer, recording=null, mediaStream=null, recordedURL=null, voices=[];
let session=null;
let store = {items:{},xp:0,recorded:{}};
function readSaved(){
  for(const key of [STORE_KEY, OLD_KEY]){
    try{
      const data=JSON.parse(localStorage.getItem(key)||'null');
      if(data&&typeof data==='object'&&data.items&&typeof data.items==='object'){
        store={items:data.items,xp:Number(data.xp)||0,recorded:data.recorded||{}};
        break;
      }
    }catch(e){}
  }
}
readSaved();
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(store));}catch(e){notify('Progression non sauvegardée : stockage du navigateur indisponible.');}}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function idFrom(value){const match=String(value||'').trim().toUpperCase().match(/^(?:P)?0*(\d{1,2})$/);return match?'P'+String(Number(match[1])).padStart(2,'0'):String(value||'').trim().toUpperCase();}
function getCode(id){return CODES.find(c=>c.id===idFrom(id));}
function item(id){return store.items[id]||null;}
function complete(id){const r=item(id);return Boolean(r?.completed || r?.phase>=4);}
function allComplete(){return CODES.filter(c=>complete(c.id));}
function dateISO(days=0){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function upcoming(){return allComplete().filter(c=>item(c.id)?.due && item(c.id).due<=dateISO());}
function formatDate(iso){return iso ? new Date(iso+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'}):'—';}
function notify(t){toast.textContent=t;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3300);}
function routeLink(code){return location.href.split('#')[0]+'#'+code;}
function loadVoices(){if('speechSynthesis' in window)voices=window.speechSynthesis.getVoices();}
function speak(text){
 if(!('speechSynthesis' in window)){notify('Cette fonction audio n’est pas disponible dans ce navigateur.');return;}
 try{
   window.speechSynthesis.cancel();loadVoices();
   const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=.78;u.pitch=1;
   u.voice=voices.find(v=>/^en[-_]GB/i.test(v.lang) && /Natural|Google|Microsoft|English/i.test(v.name))||voices.find(v=>/^en[-_]GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
   window.speechSynthesis.speak(u);
 }catch(e){notify('Lecture impossible : vérifie les voix installées sur ton appareil.');}
}
function resetAudio(){
 try{if(recording?.state==='recording')recording.stop();}catch(e){}
 if(mediaStream){mediaStream.getTracks().forEach(track=>track.stop());mediaStream=null;}
 if(recordedURL){URL.revokeObjectURL(recordedURL);recordedURL=null;}
 recording=null;
 try{window.speechSynthesis?.cancel();}catch(e){}
}
function newSession(c){resetAudio();session={id:c.id,step:0,guess:null,inductionCorrect:false,trial:0,targets:shuffle([0,1,Math.random()<.5?0:1]),wrong:false,score:0,heard:0,playedRound:false,hypothesis:'',localRecorded:false,completed:false};}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function nav(view){for(const key of ['home','journal','teacher'])document.getElementById('nav-'+key)?.classList.toggle('active',key===view);const badge=document.getElementById('due-pill');const n=upcoming().length;if(badge){badge.hidden=!n;badge.textContent=n;}}
function stats(){return `<div class="statstrip">
  <div class="stat"><span class="ico">♫</span><div><strong>${allComplete().length}/${CODES.length}</strong><small>Missions terminées</small></div></div>
  <div class="stat"><span class="ico">★</span><div><strong>${store.xp}</strong><small>Points d'expérience</small></div></div>
  <div class="stat"><span class="ico">↺</span><div><strong>${upcoming().length}</strong><small>À revoir aujourd'hui</small></div></div>
 </div>`;}
function renderHome(){
 nav('home');app.innerHTML=`
 <section class="hero" aria-labelledby="hero-title">
  <div class="hero-copy"><div class="eyebrow">● Welcome to Beatbox City</div><h1 id="hero-title">Hear it.<br><b>Say it.</b><br>Own it.</h1>
   <p>Un code de prononciation sur ta copie ? Parcours la ville, repère ce qui change dans les sons et entraîne-toi à le corriger !</p>
   <div class="hero-actions"><button class="btn yellow" data-action="jump-code">⌕ &nbsp;Entrer mon code</button><button class="btn ghost" data-action="open-code" data-code="P11">Découvrir P11 →</button></div>
  </div>
  <div class="hero-sign" aria-hidden="true">BEATBOX CITY</div><div class="sound-ring"></div><div class="hero-characters" aria-hidden="true"><img class="girl" src="${asset('characters/echo-girl.png')}" alt=""><img class="pet" src="${asset('characters/echo-pet.png')}" alt=""></div>
 </section>
 <div class="quickbar" id="quickbar"><div class="quickbar-label"><strong>🎯 Le prof t'a donné un code ?</strong><div class="hint">P01 à P32 · Accède directement au bon entraînement.</div></div>
  <label class="screenreader" for="quick-code">Saisir un code de prononciation</label><input id="quick-code" class="code-input" maxlength="3" placeholder="P11" autocomplete="off" inputmode="text"><button class="btn cyan" data-action="open-quick">C'est parti →</button>
 </div>
 ${stats()}
 <section aria-labelledby="district-heading"><div class="section-title"><div><div class="eyebrow">The city map</div><h2 id="district-heading">Explore les 4 quartiers</h2><p>Chaque quartier rassemble des erreurs de prononciation. La ville se découvre à ton rythme.</p></div><button class="btn dark small" data-action="go-journal">★ Mes badges</button></div>
 <div class="district-grid">${Object.entries(districtData).map(([key,d])=>`<button class="district-card" data-action="district" data-family="${key}" style="--accent:${d.accent}">
 <span class="district-image" aria-hidden="true" style="background-image:url('${asset('districts/'+d.img)}')"></span>
 <span class="district-copy"><span class="district-name">${d.title}</span><br><span class="district-code">${d.range}</span><p>${d.description}</p><span class="district-n">${CODES.filter(c=>c.cat===key).length} missions →</span></span></button>`).join('')}</div></section>
 <section id="missions" aria-labelledby="missions-heading"><div class="section-title"><div><div class="eyebrow">Choose your mission</div><h2 id="missions-heading">Les 32 codes de prononciation</h2><p>Choisis une erreur pour écouter, découvrir la règle, t'exercer et t'enregistrer.</p></div></div>
 <div class="toolbar"><label class="screenreader" for="search">Rechercher</label><input class="search" id="search" placeholder="Rechercher : P11, TH, ship…" autocomplete="off">
 <label class="screenreader" for="category">Choisir le quartier</label><select id="category"><option value="all">Tous les quartiers</option>${Object.keys(districtData).map(k=>`<option value="${k}">${districtData[k].title}</option>`).join('')}</select>
 <label class="screenreader" for="level">Choisir le niveau</label><select id="level"><option value="all">Tous niveaux</option><option>A1</option><option>A2</option><option>B1</option></select></div>
 <div class="code-grid" id="code-grid"></div></section>`;
 drawCodes();
}
function drawCodes(){
 const grid=document.getElementById('code-grid');if(!grid)return;
 const q=(document.getElementById('search')?.value||'').toLocaleLowerCase('fr');
 const cat=document.getElementById('category')?.value||'all';const lv=document.getElementById('level')?.value||'all';
 const found=CODES.filter(c=>(cat==='all'||c.cat===cat)&&(lv==='all'||c.level===lv)&&(!q||[c.id,c.name,...c.pair,c.ipa.join(' '),districtData[c.cat].title].join(' ').toLocaleLowerCase('fr').includes(q)));
 grid.innerHTML=found.length?found.map(c=>{const d=districtData[c.cat];const r=item(c.id);return `<button class="code-card" data-action="open-code" data-code="${c.id}"><div class="topline"><span class="code-tag">${c.id}</span><span class="tag" style="color:${d.accent}">${c.level}</span></div><h3>${esc(c.name)}</h3><span class="words">${esc(c.pair.join(' / '))}</span><div class="bottomline"><small>${esc(d.title)}</small><b>${complete(c.id)?'✓ Mission terminée':'Découvrir →'}</b></div><div class="progress"><span style="width:${complete(c.id)?100:(r?.phase||0)*20}%"></span></div></button>`;}).join(''):'<div class="empty"><h3>Aucune mission trouvée</h3><p>Vérifie le code ou choisis une autre famille.</p><button class="btn cyan" data-action="reset-filters">Tout afficher</button></div>';
}
function lessonHeader(c){
 const d=districtData[c.cat];return `<div class="lesson-hero"><div><span class="lesson-code">${c.id} · ${c.level}</span>
 <h1>${esc(c.name)}</h1><p>${esc(d.title)} · Un parcours pour écouter, observer, comprendre, s'entraîner et comparer tes essais.</p></div><img loading="lazy" src="${asset('characters/echo-pet.png')}" alt="Mascotte Echo"></div>
 <div class="stepper" aria-label="Les étapes de la mission">${stepNames.map((n,i)=>`<span class="step ${i===session.step?'active':i<session.step?'done':''}"><img src="${asset('actions/'+stepIcons[i])}" alt="">${i<session.step?'✓':i+1} <small>${n}</small></span>`).join('')}</div>`;
}
function soundCard(text,ipa,i,showIPA=false){return `<div class="sound-card ${i?'b':''}"><div class="letter">SON ${i?'B':'A'}</div><strong>${esc(text)}</strong><div class="ipa">${showIPA?esc(ipa):'&nbsp;'}</div>
 <div class="wave" aria-hidden="true">${'<i></i>'.repeat(7)}</div><button class="btn ${i?'primary':'cyan'}" data-action="speak" data-text="${esc(text)}" aria-label="Écouter ${esc(text)}">▶ Écouter</button></div>`;}
function stepListen(c){
 return `<div class="overline">Étape 1 · Écouter</div><h2>Ouvre grand tes oreilles !</h2>
 <p>${esc(c.notice)} Observe d'abord les sons sans lire leur explication.</p>
 <div class="sound-grid">${soundCard(c.pair[0],c.ipa[0],0)}${soundCard(c.pair[1],c.ipa[1],1)}</div>
 ${c.id==='P11'?`<div class="minipairs"><strong>À comparer aussi :</strong>${[['thin','sin'],['thank','sank']].map(([x,y])=>`<button class="minipair" data-action="speak" data-text="${x}">${x} ▶</button><button class="minipair" data-action="speak" data-text="${y}">${y} ▶</button>`).join('')}</div>`:''}
 <div class="speaker-note">👂 <b>Observe :</b> quel son démarre différemment ? Essaie de sentir ce qui change dans la bouche, sans chercher une règle écrite tout de suite.</div>
 <div class="stage-actions"><button class="btn ghost" data-action="go-home">← Retour en ville</button><button class="btn yellow" data-action="next-step">J'ai comparé →</button></div>`;
}
function stepDiscover(c){
 let answered=session.guess!==null,correct=session.inductionCorrect;
 return `<div class="overline">Étape 2 · Discover</div><h2>À toi de mener l'enquête !</h2>
 <p>${c.id==='P11'?'Écoute à nouveau think et sink. Essaie de sentir où la langue se place avant de répondre.':esc(c.notice)}</p>
 <div class="minipairs"><button class="minipair" data-action="speak" data-text="${esc(c.pair[0])}">▶ ${esc(c.pair[0])}</button><button class="minipair" data-action="speak" data-text="${esc(c.pair[1])}">▶ ${esc(c.pair[1])}</button></div>
 <div class="speaker-note">🔎 <b>${esc(c.q)}</b></div>
 <div class="options">${c.opts.map((option,i)=>`<button class="option ${answered&&session.guess===i?(correct?'correct':'wrong'):''}" data-action="guess" data-index="${i}" ${correct?'disabled':''}><span class="option-letter">${'ABC'[i]}</span><span>${esc(option)}</span></button>`).join('')}</div>
 ${answered?`<div class="feedback ${correct?'ok':'no'}">${correct?'✔ Bien vu ! Tu as repéré un indice important. Formule maintenant ta règle avant de la découvrir.':'Pas encore. Réécoute les exemples : la réponse se trouve dans la différence que tu entends ou dans le geste articulatoire.'}</div>`:''}
 <label for="hypothesis" class="overline" style="display:block;margin-top:16px">Mon hypothèse (facultatif)</label><textarea class="hypothesis-field" id="hypothesis" rows="2" placeholder="Je remarque que…">${esc(session.hypothesis)}</textarea><div class="stage-actions"><button class="btn ghost" data-action="previous-step">← Réécouter</button><button class="btn yellow" data-action="next-step" ${correct?'':'disabled'}>Je vérifie mon hypothèse →</button></div>`;
}
function stepUnderstand(c){
 const icon=c.id==='P11'?'mouth-th.png':c.id==='P12'?'phoneme-eth.png':'listening-ear.png';
 return `<div class="overline">Étape 3 · Understand</div><h2>Découvre le secret du son</h2>
 <p>Voici l'explication. Compare-la avec l'hypothèse que tu viens de construire.</p>${session.hypothesis?`<div class="speaker-note"><b>Mon hypothèse :</b> ${esc(session.hypothesis)}</div>`:''}
 <div class="rulebox"><h3>💡 La règle à retenir</h3><p>${esc(c.rule)}</p></div>
 <div class="articulation"><img src="${asset('sounds/'+icon)}" alt="Illustration de la phonologie"><div><h3>La technique d'Echo 🎧</h3><p>${esc(c.tip)}</p></div></div>
 <div class="sound-grid">${soundCard(c.pair[0],c.ipa[0],0,true)}${soundCard(c.pair[1],c.ipa[1],1,true)}</div>
 ${c.id==='P11'?'<div class="tipline">👅 <b>Astuce TH /θ/ :</b> approche doucement la pointe de la langue des dents, laisse passer l’air sans faire vibrer la voix ; compare avec /s/, produit derrière les dents.</div>':''}
 ${['P05','P30','P31'].includes(c.id)?'<div class="speaker-note">🎙️ La synthèse vocale peut ne pas rendre toutes les différences d’accent ou d’intonation. Si un contraste te semble peu net, fais-le aussi écouter par ton professeur.</div>':''}
 <div class="stage-actions"><button class="btn ghost" data-action="previous-step">← Retour</button><button class="btn yellow" data-action="next-step">Passer au défi →</button></div>`;
}
function stepPractise(c){
 const isP30=c.id==='P30';const questions=['Tu veux corriger la COULEUR du stylo.','Tu veux corriger le NOM de l’objet.','Tu veux insister sur la COULEUR, pas sur l’objet.'];
 const last=session.trial>=3;
 return `<div class="overline">Étape 4 · Practise</div><h2>${isP30?'Place l’accent au bon endroit':'Sound Detective'}</h2>
 <p>${isP30?'Dans cet exercice, choisis le mot à accentuer en fonction de l’intention du locuteur.':'Écoute le mot caché puis choisis celui que tu as entendu. Tu peux réécouter autant que nécessaire.'}</p>
 ${last?`<div class="success"><h2>3 / 3 !</h2><p>Bien joué : tu as terminé le défi ${session.score===3&&!session.wrongEver?'sans erreur':'en persévérant'}.</p><div class="stage-actions"><button class="btn ghost" data-action="previous-step">← Revoir la règle</button><button class="btn yellow" data-action="next-step">Passer au micro →</button></div></div>`:
 `<div class="challenge-panel"><div class="counter">Défi ${session.trial+1} / 3</div>
 ${isP30?`<div class="speaker-note"><b>${esc(questions[session.trial])}</b><br>« I wanted the red pen. »</div>`:
 `<button class="hearbtn" data-action="hear-challenge" aria-label="Écouter le mot mystère">▶</button><p class="small-hint">Appuie sur ▶ pour entendre le mot mystère.</p>`}
 <div class="challenge-choices">${(isP30?['RED','PEN']:c.pair).map((w,i)=>`<button class="option" data-action="challenge-choice" data-index="${i}" ${!isP30&&('speechSynthesis' in window)&&!session.playedRound?'disabled':''}><span>${esc(w)}</span></button>`).join('')}</div>
 ${session.wrong?'<div class="feedback no">Essaie encore ! Réécoute et repère le détail important. La mission n’avance pas tant que tu n’as pas trouvé.</div>':''}
 </div><div class="stage-actions"><button class="btn ghost" data-action="previous-step">← Revoir la règle</button><span class="pill">${session.trial} / 3 réponses validées</span></div>`}
 <p class="small-hint">Ce défi vérifie ta discrimination auditive ou ta compréhension du rythme, pas automatiquement la qualité de ta propre prononciation.</p>`;
}
function stepRecord(c){
 return `<div class="overline">Étape 5 · Record</div><h2>À toi de faire entendre ta voix !</h2>
 <p>Écoute le modèle, prononce les mots ou la phrase et, si tu le souhaites, enregistre un essai pour le réécouter. <strong>L’application ne donne pas de note automatique à ta voix.</strong></p>
 <div class="sound-grid">${soundCard(c.pair[0],c.ipa[0],0,true)}${soundCard(c.pair[1],c.ipa[1],1,true)}</div>
 <div class="recording-box" id="recording-box"><strong><span id="recording-dot" class="recording-light"></span><span id="recording-label">Ton studio vocal</span></strong>
 <p class="small-hint" style="margin-top:7px">Autorise le micro seulement si tu souhaites t'enregistrer ; aucun audio n'est téléversé.</p>
 <div class="recorder-actions"><button id="record-button" class="btn primary" data-action="toggle-record">● Enregistrer</button><button class="btn ghost" data-action="speak" data-text="${esc(c.pair.join(' … '))}">▶ Modèle</button></div><div id="playback-holder"></div></div>
 <div class="rulebox"><h3>💭 Fais le point</h3><p>Qu'est-ce que tu as changé ? Écoute la position de ta langue, la voyelle ou l'accentuation. Tu peux recommencer autant que tu le veux.</p></div>
 <div class="stage-actions"><button class="btn ghost" data-action="previous-step">← Revenir au défi</button><button class="btn yellow" data-action="finish-mission">✓ Terminer la mission</button></div>`;
}
function lessonSide(c){
 return `<aside class="sidebar-card"><img src="${asset('characters/echo-boy.png')}" alt="Coach musical"><h3>Ton coach sonore</h3><p>Chaque mission te fait écouter, déduire et pratiquer avant de vérifier tes progrès.</p><div class="sidebar-tip"><b>🎯 Mission ${c.id}</b><br>${esc(c.name)}<br><br>Tu peux noter ce code sur ta fiche orale.</div><button class="btn dark small" data-action="copy-link" data-code="${c.id}" style="width:100%;margin-top:16px">⛓ Copier le lien</button><button class="btn ghost small" data-action="go-home" style="width:100%;margin-top:10px">⌂ Retour à la ville</button></aside>`;
}
function renderLesson(){
 const c=getCode(session?.id);if(!c)return;nav('');
 let html=session.step===0?stepListen(c):session.step===1?stepDiscover(c):session.step===2?stepUnderstand(c):session.step===3?stepPractise(c):stepRecord(c);
 app.innerHTML=`${lessonHeader(c)}<div class="lesson-layout"><section class="stage-card" aria-label="Exercice ${esc(c.id)}">${html}</section>${lessonSide(c)}</div>`;
 if(session.step===4){const holder=document.getElementById('playback-holder');if(holder&&recordedURL){holder.innerHTML=`<audio controls src="${recordedURL}" aria-label="Écouter mon essai"></audio>`;}}
}
function badgeStats(){const done=allComplete();const family={vowels:0,consonants:0,endings:0,rhythm:0};for(const c of done)family[c.cat]++;
 return{complete:done.length,family,has:id=>complete(id),perfect:done.filter(c=>item(c.id)?.perfect).length,recorded:Object.keys(store.recorded||{}).filter(k=>store.recorded[k]).length};}
function badgeCards(){const s=badgeStats();return badgeSpecs.map(([img,title,desc,condition])=>{const unlocked=condition(s);return `<div class="badge-card ${unlocked?'':'locked'}" title="${esc(desc)}"><img loading="lazy" src="${asset('badges/'+img)}" alt=""><strong>${esc(title)}</strong><small>${unlocked?'✓ Débloqué':esc(desc)}</small></div>`;}).join('');}
function renderJournal(){
 nav('journal');const done=allComplete();const urgent=upcoming().sort((a,b)=>item(a.id).due.localeCompare(item(b.id).due));const later=done.filter(c=>!urgent.includes(c)).sort((a,b)=>String(item(a.id).due||'').localeCompare(String(item(b.id).due||'')));
 const reviewHTML=(c)=>`<div class="review-item"><div><strong><span style="color:var(--cyan)">${c.id}</span> ${esc(c.name)}</strong><small>${item(c.id)?.due<=dateISO()?'À revoir maintenant':'Prochaine révision : '+formatDate(item(c.id)?.due)}</small></div><button class="btn small ${item(c.id)?.due<=dateISO()?'yellow':'dark'}" data-action="open-code" data-code="${c.id}">Réviser →</button></div>`;
 app.innerHTML=`<div class="page-title"><div><div class="breadcrumb">My sound journal</div><h1>Ma progression</h1><p>La pratique régulière est plus efficace qu'un entraînement isolé. Ton carnet reste sur cet appareil.</p></div><button class="btn ghost" data-action="go-home">← Retour en ville</button></div>
 ${stats()}
 <section class="panel"><div class="panel-head"><div><div class="eyebrow">Daily review</div><h2>À réviser aujourd'hui</h2></div><span class="pill">${urgent.length} code(s)</span></div>
 ${urgent.length?`<div class="journal-grid">${urgent.map(reviewHTML).join('')}</div>`:'<p>Aucun rappel pour le moment. Continue d’explorer la ville !</p>'}</section>
 <section class="panel"><div class="panel-head"><div><div class="eyebrow">Achievement collection</div><h2>Mes 16 badges</h2></div><span class="pill">${badgeSpecs.filter(b=>b[3](badgeStats())).length} / 16</span></div><p>Chaque badge récompense une étape de ton parcours, pas une évaluation automatique de ton accent.</p><div class="badge-grid" style="margin-top:19px">${badgeCards()}</div></section>
 <section class="panel"><h2>Mes missions déjà terminées</h2><p style="margin-bottom:16px">Révisions espacées : après la première mission, puis à J+1, J+3 et J+7.</p>${later.length?`<div class="journal-grid">${later.map(reviewHTML).join('')}</div>`:"<p>Les prochaines missions s’afficheront ici après tes premiers défis.</p>"}</section>`;
}
function renderTeacher(){
 nav('teacher');app.innerHTML=`<div class="page-title"><div><div class="breadcrumb">Teacher's Sound Desk</div><h1>Codes professeur</h1><p>32 codes courts à noter sur une production orale. L’élève saisit P11, découvre la règle par induction et s'entraîne en autonomie.</p></div><button class="btn ghost" data-action="go-home">← Retour en ville</button></div>
 <section class="panel"><div class="panel-head"><div><h2>Teacher's Codebook</h2><p>Rechercher, ouvrir, copier un code ou partager son lien direct.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark small" data-action="print">⎙ Imprimer</button><button class="btn cyan small" data-action="export-csv">↓ Exporter CSV</button></div></div>
 <div class="speaker-note"><b>Exemple :</b> « Le début de <i>think</i> ressemble à <i>sink</i>. → P11 ». La remédiation est ciblée : écoute, question inductive, explication, défi puis essai vocal. L'appli ne juge pas automatiquement l'enregistrement.</div>
 <div class="toolbar"><label class="screenreader" for="teacher-search">Rechercher un code</label><input class="search" id="teacher-search" placeholder="Code, phénomène, mot…" autocomplete="off"></div>
 <div class="table-wrap"><table class="teacher-table"><thead><tr><th>Code</th><th>Famille</th><th>Erreur ciblée</th><th>Exemples</th><th>Niveau</th><th>Actions</th></tr></thead><tbody id="teacher-body"></tbody></table></div></section>
 <section class="panel"><h2>Mode d'emploi</h2><p>Indique un ou deux codes prioritaires sur la fiche orale ; l’élève suit la mission correspondante et revient sur son carnet pour revoir les sons. Les progrès sont stockés localement : il n'existe pas de tableau de bord des élèves partagé avec le professeur dans cette version. Les codes P01 à P32 sont des repères pédagogiques, <b>pas des mots de passe</b>.</p></section>`;drawTeacher();
}
function drawTeacher(){const t=document.getElementById('teacher-body');if(!t)return;const q=(document.getElementById('teacher-search')?.value||'').toLocaleLowerCase('fr');const arr=CODES.filter(c=>!q||[c.id,c.name,...c.pair,districtData[c.cat].sub].join(' ').toLocaleLowerCase('fr').includes(q));
 t.innerHTML=arr.map(c=>`<tr><td><strong>${c.id}</strong></td><td>${esc(districtData[c.cat].sub)}</td><td>${esc(c.name)}</td><td>${esc(c.pair.join(' / '))}</td><td>${c.level}</td><td><span class="table-buttons"><button data-action="open-code" data-code="${c.id}">Ouvrir</button><button data-action="copy-code" data-code="${c.id}">Code</button><button data-action="copy-link" data-code="${c.id}">Lien</button></span></td></tr>`).join('');
}
function finishMission(){
 const c=getCode(session.id);if(!c)return;
 resetAudio();const prev=item(c.id)||{};const wasComplete=complete(c.id);const reviewN=wasComplete?(Number(prev.reviewN)||0)+1:0;
 const days=[1,3,7,14,30];const schedule=days[Math.min(reviewN,days.length-1)];
 const perfect=session.score===3&&!session.wrongEver;
 store.items[c.id]={...prev,phase:4,completed:true,reviewN,due:dateISO(schedule),perfect:Boolean(prev.perfect||perfect),lastPractised:dateISO()};
 store.xp+=wasComplete?15:60;if(session.localRecorded)store.recorded[c.id]=true;save();session.completed=true;nav('');
 const unlocked=badgeSpecs.filter(b=>b[3](badgeStats())).length;
 app.innerHTML=`<div class="stage-card success" style="margin-top:30px;max-width:810px;margin-left:auto;margin-right:auto"><div class="eyebrow">MISSION COMPLETE</div><h2>Nice work!</h2><img src="${asset('badges/01-first-steps.png')}" alt="Médaille First Steps"><h3>${c.id} · ${esc(c.name)}</h3><p>Tu as terminé ton parcours : la différence doit maintenant être réutilisée à l'oral.</p><div class="review-promo">★ <strong>+${wasComplete?15:60} XP</strong> · ${unlocked} badge(s) débloqué(s).<br>↺ Prochaine révision : <strong>${formatDate(dateISO(schedule))}</strong></div><p class="small-hint">C'est une validation d'activité, pas une note automatique de prononciation.</p>
 <div class="finish-actions"><button class="btn yellow" data-action="go-journal">★ Mon carnet</button><button class="btn cyan" data-action="go-home">⌂ Explorer la ville</button><button class="btn ghost" data-action="redo" data-code="${c.id}">↺ Refaire ${c.id}</button></div></div>`;
 window.scrollTo({top:0,behavior:'instant'});
}
async function toggleRecord(){
 const btn=document.getElementById('record-button');if(!btn)return;
 if(recording?.state==='recording'){try{recording.stop();}catch(e){} btn.disabled=true;return;}
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){notify('Micro indisponible ici. Sur GitHub Pages, utilise un navigateur récent avec HTTPS.');return;}
 resetAudio();
 try{
  mediaStream=await navigator.mediaDevices.getUserMedia({audio:true});
  if(!session||session.step!==4){mediaStream.getTracks().forEach(t=>t.stop());return;}
  const chunks=[];recording=new MediaRecorder(mediaStream);const currentRecorder=recording;const capturedSession=session;
  recording.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  recording.onerror=()=>notify('Un problème est survenu pendant l’enregistrement.');
  recording.onstop=()=>{
    if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null;}
    if(!session||session!==capturedSession||session.step!==4)return;
    if(chunks.length){if(recordedURL)URL.revokeObjectURL(recordedURL);recordedURL=URL.createObjectURL(new Blob(chunks,{type:currentRecorder.mimeType||'audio/webm'}));session.localRecorded=true;
      const h=document.getElementById('playback-holder');if(h)h.innerHTML=`<audio controls src="${recordedURL}" aria-label="Écouter mon enregistrement"></audio>`;
    }
    const label=document.getElementById('recording-label');if(label)label.textContent='Essai enregistré · réécoute-toi';
    const dot=document.getElementById('recording-dot');dot?.classList.remove('live');
    const b=document.getElementById('record-button');if(b){b.disabled=false;b.textContent='● Recommencer';}const finish=document.querySelector('[data-action="finish-mission"]');if(finish)finish.disabled=false;
  };
  recording.start();btn.textContent='■ Arrêter l’enregistrement';const finish=document.querySelector('[data-action="finish-mission"]');if(finish)finish.disabled=true;
  document.getElementById('recording-label').textContent='Enregistrement en cours…';
  document.getElementById('recording-dot')?.classList.add('live');
 }catch(e){notify(e?.name==='NotAllowedError'?'Micro refusé : tu peux quand même terminer la mission.':'Impossible de démarrer le micro sur cet appareil.');}
}
function copy(text){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>notify('Copié !')).catch(()=>fallbackCopy(text));}else fallbackCopy(text);}
function fallbackCopy(text){const tmp=document.createElement('textarea');tmp.value=text;tmp.style.cssText='position:fixed;opacity:0';document.body.appendChild(tmp);tmp.select();try{document.execCommand('copy');notify('Copié !');}catch(e){notify('Copie impossible : '+text);}tmp.remove();}
function exportCSV(){
 const rows=[['Code','Famille','Niveau','Erreur','Exemple A','Exemple B','Repérage','Question inductive','Règle','Conseil'],...CODES.map(c=>[c.id,districtData[c.cat].sub,c.level,c.name,...c.pair,c.notice,c.q,c.rule,c.tip])];
 const csv='\ufeff'+rows.map(r=>r.map(s=>'"'+String(s).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Mind-the-Sound-Beatbox-City-Codes-P01-P32.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
}
function route(){
 let page='home';try{page=decodeURIComponent(location.hash.slice(1))||'home';}catch(e){}
 const c=getCode(page);
 if(c){if(!session||session.id!==c.id||session.completed)newSession(c);renderLesson();}
 else{resetAudio();session=null;if(page==='journal')renderJournal();else if(page==='teacher')renderTeacher();else renderHome();}
 window.scrollTo({top:0,behavior:'instant'});
}
function goto(page){if(location.hash==='#'+page)route();else location.hash=page;}
function moveStep(delta){if(!session)return;if(session.step===1 && delta>0 && !session.inductionCorrect)return;if(session.step===3&&delta>0&&session.trial<3)return;
 if(session.step===4 && delta<0)resetAudio();session.step=Math.max(0,Math.min(4,session.step+delta));renderLesson();window.scrollTo({top:0,behavior:'smooth'});
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;
 const a=btn.dataset.action;
 if(a==='go-home')return goto('home');
 if(a==='go-journal')return goto('journal');
 if(a==='go-teacher')return goto('teacher');
 if(a==='open-code')return goto(btn.dataset.code);
 if(a==='redo'){const c=getCode(btn.dataset.code);if(c){newSession(c);renderLesson();}return;}
 if(a==='jump-code'){document.getElementById('quickbar')?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>document.getElementById('quick-code')?.focus({preventScroll:true}),320);return;}
 if(a==='open-quick'){const c=getCode(document.getElementById('quick-code')?.value);if(c)goto(c.id);else notify('Ce code n’existe pas. Essaie par exemple P11.');return;}
 if(a==='district'){const filt=document.getElementById('category');if(filt)filt.value=btn.dataset.family;document.getElementById('search').value='';drawCodes();document.getElementById('missions')?.scrollIntoView({behavior:'smooth'});return;}
 if(a==='reset-filters'){document.getElementById('category').value='all';document.getElementById('level').value='all';document.getElementById('search').value='';drawCodes();return;}
 if(a==='speak'){if(session)session.heard++;return speak(btn.dataset.text);}
 if(a==='hear-challenge'){const c=getCode(session?.id);if(c){session.heard++;session.playedRound=true;speak(c.pair[session.targets[session.trial]]);renderLesson();}return;}
 if(a==='previous-step')return moveStep(-1);
 if(a==='next-step')return moveStep(1);
 if(a==='guess'){const c=getCode(session?.id);if(!c||session.step!==1)return;session.guess=Number(btn.dataset.index);session.inductionCorrect=session.guess===c.ans;renderLesson();return;}
 if(a==='challenge-choice'){
  const c=getCode(session?.id);if(!c||session.step!==3||session.trial>=3)return;
  const correct=c.id==='P30'?[0,1,0][session.trial]:session.targets[session.trial];
  if(Number(btn.dataset.index)===correct){session.score++;session.trial++;session.wrong=false;session.playedRound=false;notify('Bonne réponse ! 🎧');}
  else{session.wrong=true;session.wrongEver=true;}
  renderLesson();return;
 }
 if(a==='toggle-record')return toggleRecord();
 if(a==='finish-mission')return finishMission();
 if(a==='copy-link')return copy(routeLink(btn.dataset.code));
 if(a==='copy-code')return copy(btn.dataset.code);
 if(a==='print')return window.print();
 if(a==='export-csv')return exportCSV();
});
document.addEventListener('input',e=>{if(e.target.id==='search')drawCodes();if(e.target.id==='teacher-search')drawTeacher();if(e.target.id==='hypothesis'&&session)session.hypothesis=e.target.value.slice(0,380);if(e.target.id==='quick-code')e.target.value=e.target.value.replace(/[^pP0-9]/g,'').toUpperCase();});
document.addEventListener('change',e=>{if(e.target.id==='category'||e.target.id==='level')drawCodes();});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='quick-code'){e.preventDefault();document.querySelector('[data-action="open-quick"]')?.click();}});
window.addEventListener('hashchange',route);
window.addEventListener('beforeunload',resetAudio);
if('speechSynthesis' in window){loadVoices();window.speechSynthesis.addEventListener?.('voiceschanged',loadVoices);}
route();
})();
