/* ================= Smakresan – applikation ================= */

const KEY = "smakresa_v2";
const V1KEY = "smakresa_v1";
const PHOTO_KEY = "smakresa_photos_v1";
const RETASTE_INTERVALS = [14, 42, 90]; // dagar

/* ===== State & migrering ===== */
function seedBottles(){
  const out = {};
  Object.entries(BOTTLE_SEED).forEach(([id, b]) => {
    out[id] = Object.assign({}, b, {
      flavour: b.flavour ? {x:b.flavour.x, y:b.flavour.y} : undefined,
      song: b.song ? {artist:b.song.artist, title:b.song.title} : undefined,
      status: b.hidden ? undefined : "open",
      source: "seed"
    });
  });
  return out;
}
function defaultState(){
  return {
    version: 2,
    sessions: {},
    bottles: seedBottles(),
    tastings: [],
    phases: [],
    fridge: {rows:3, cols:4, slots:{}},
    retastes: {},
    guests: [],
    chat: [],
    lastExport: null,
    settings: {apiKey:"", modelSmart:"claude-sonnet-5", modelFast:"claude-haiku-4-5"}
  };
}
function fillDefaults(st){
  const d = defaultState();
  Object.keys(d).forEach(k => { if(st[k] === undefined) st[k] = d[k]; });
  st.settings = Object.assign({}, d.settings, st.settings || {});
  st.fridge = Object.assign({rows:3, cols:4, slots:{}}, st.fridge || {});
  return st;
}
function load(){
  try{
    const v2 = localStorage.getItem(KEY);
    if(v2) return fillDefaults(JSON.parse(v2));
    const st = defaultState();
    const v1 = localStorage.getItem(V1KEY); // v1 raderas aldrig – den är backup
    if(v1){ try{ st.sessions = JSON.parse(v1).sessions || {}; }catch(e){} }
    try{ localStorage.setItem(KEY, JSON.stringify(st)); }catch(e){}
    return st;
  }catch(e){ return defaultState(); }
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }
  catch(e){ alert("Kunde inte spara – lagringen kan vara full. Exportera en säkerhetskopia under Mästaren → Inställningar."); }
}
function loadPhotos(){
  try{ const r = localStorage.getItem(PHOTO_KEY); return r ? JSON.parse(r) : {}; }
  catch(e){ return {}; }
}
function savePhotos(){
  try{ localStorage.setItem(PHOTO_KEY, JSON.stringify(photos)); }
  catch(e){ alert("Lagringen är full – fotot kunde inte sparas. Exportera en säkerhetskopia och ta bort gamla foton."); }
}

let state = load();
let photos = loadPhotos();

/* ===== Hjälpare ===== */
const $ = id => document.getElementById(id);
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function light(hex){
  const n = parseInt(hex.slice(1), 16);
  return "rgb("+Math.min(255,(n>>16)+60)+","+Math.min(255,((n>>8)&255)+45)+","+Math.min(255,(n&255)+30)+")";
}
function bottle(id){ return state.bottles[id]; }
function allTastings(){ return TASTINGS.concat(state.tastings); }
function allPhases(){ return PHASES.concat(state.phases); }
function visibleBottles(){ return Object.entries(state.bottles).filter(([id,b]) => !b.hidden); }
function today(){ return new Date().toISOString().slice(0,10); }
function addDays(iso, days){
  const d = new Date(iso+"T12:00:00");
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function dotHtml(color, size){
  const s = size||20;
  return '<span class="b-dot" style="width:'+s+'px;height:'+s+'px;background:radial-gradient(circle at 32% 28%,'+light(color)+','+color+' 65%)"></span>';
}
function chip(id){
  const b = bottle(id);
  if(!b) return "";
  return '<span class="b-chip">'+dotHtml(b.color)+esc(b.name)+'</span>';
}
function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove("show"), 2200);
}
function slugId(name){
  let base = name.toLowerCase().replace(/[^a-z0-9åäö]/g, "").slice(0,4) || "fl";
  let id = base, i = 2;
  while(state.bottles[id]){ id = base + i; i++; }
  return id;
}
const STOPWORDS = new Set(["och","med","som","det","den","lite","mer","inte","att","har","var","för","men","utan","är","aning","hint","ton"]);
function tok(s){
  return String(s||"").toLowerCase().split(/[^a-zåäöé]+/).filter(w => w.length>2 && !STOPWORDS.has(w));
}
function spotify(q){ return "https://open.spotify.com/search/"+encodeURIComponent(q); }

/* ===== Drickråd ===== */
function drinkAdvice(b){
  const rows = [];
  const abv = Number(b.abv);
  if(!abv) rows.push({ic:"💧", txt:"Fyll i alkoholhalten så får du vattenråd anpassade efter styrkan."});
  else if(abv >= 55) rows.push({ic:"💧", txt:"Fatstyrka ("+abv+" %). Smaka alltid först utan vatten – droppa sen med pipett eller sked, och smaka mellan varje droppe. Vattnet öppnar dofterna dramatiskt."});
  else if(abv >= 50) rows.push({ic:"💧", txt:"Hög styrka ("+abv+" %). Några droppar vatten öppnar den nästan alltid – prova före och efter."});
  else if(abv >= 46) rows.push({ic:"💧", txt:abv+" % – prova först utan vatten. En enda droppe kan lyfta doften, men den behöver sällan mer."});
  else rows.push({ic:"💧", txt:abv+" % – redan spädd till flaskstyrka. Drick som den är."});
  rows.push({ic:"🥃", txt:"Glencairn eller tulpanglas. Häll till glasets bredaste punkt (ca 4 cl) så samlas doften."});
  const age = parseInt((b.name||"").match(/\b(\d{1,2})\b/)?.[1]) || 10;
  rows.push({ic:"⏱️", txt:"Låt den vila ~"+Math.max(5, Math.min(20, age))+" min i glaset innan första doften – tumregeln är en minut per fatår."});
  if(b.flavour && b.flavour.y >= 0.45) rows.push({ic:"🔥", txt:"Rökig – ta den sist ikväll, annars dövar röken de mildare glasen."});
  if(b.aiTip) rows.push({ic:"🎩", txt:b.aiTip});
  return rows;
}

/* ===== Smakkartan ===== */
function quadrantOf(x, y){
  return Object.keys(QUADRANTS).find(k => QUADRANTS[k].test(x, y)) || "ljusmild";
}
function toneFor(ids){
  const bs = ids.map(bottle).filter(b => b && !b.hidden);
  if(!bs.length) return {key:"ljusmild", tone:TONE_MAP.ljusmild};
  if(bs.some(b => /rom/i.test(b.type||""))) return {key:"rom", tone:TONE_MAP.rom};
  const withF = bs.filter(b => b.flavour);
  const ax = withF.length ? withF.reduce((a,b)=>a+b.flavour.x,0)/withF.length : 0.5;
  const ay = withF.length ? withF.reduce((a,b)=>a+b.flavour.y,0)/withF.length : 0.5;
  const key = quadrantOf(ax, ay);
  return {key, tone:TONE_MAP[key]};
}

/* ===== Router ===== */
const ui = {view:"ikvall", hylla:"flaskor", hl:null};
function switchView(v){
  ui.view = v;
  ui.hl = null;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === v));
  renderView();
  window.scrollTo(0,0);
}
function renderView(){
  const root = $("viewRoot");
  if(ui.view === "ikvall") root.innerHTML = renderIkvall();
  else if(ui.view === "resan") root.innerHTML = renderResan();
  else if(ui.view === "hyllan") root.innerHTML = renderHyllan();
  else root.innerHTML = renderMastaren();
  bindView();
}

/* ===== Vy: Ikväll ===== */
let aiTone = null; // {sig, data} – AI-musikförslag för kvällen

function nextTasting(){ return allTastings().find(t => !state.sessions[t.n]); }
function dueRetastes(){
  const t = today();
  return Object.entries(state.retastes).filter(([id, r]) => {
    const b = bottle(id);
    return b && !b.hidden && b.status !== "finished" && r.due && r.due <= t;
  });
}

function renderIkvall(){
  const all = allTastings();
  const doneCount = all.filter(t => state.sessions[t.n]).length;
  let h = '<div class="progress"><div class="row"><span>Genomförda provningar</span><b>'+doneCount+' / '+all.length+'</b></div>'+
    '<div class="pbar"><div style="width:'+(all.length?doneCount/all.length*100:0)+'%"></div></div></div>';

  // Backup-påminnelse
  if(doneCount > 0 && (!state.lastExport || addDays(state.lastExport,30) < today())){
    h += '<div class="notice">💾 Allt sparas bara i den här webbläsaren. Gör en säkerhetskopia under Mästaren → Inställningar.</div>';
  }

  // Kyl-tips tills första flaskan fått en plats
  if(Object.keys(state.fridge.slots).length === 0){
    h += '<div class="notice">❄️ Håll koll på var flaskorna står: lägg in dem i vinkylskartan. '+
      '<a href="#" onclick="goToFridge();return false" style="color:var(--gold);font-weight:600">Öppna kylen →</a></div>';
  }

  const next = nextTasting();
  h += '<div class="sec-label">Nästa provning</div>';
  if(next){
    const ph = allPhases().find(p => p.id === next.phase) || {name:"", color:"var(--gold)"};
    h += '<div class="tonight" style="--phase:'+ph.color+'">'+
      '<div class="t-phase">'+esc(ph.name)+' · Provning '+next.n+'</div>'+
      '<div class="t-q">'+esc(next.q)+'</div>'+
      '<div class="t-bottles">'+next.bottles.map(chip).join("")+'</div>'+
      '<p class="t-why">'+esc(next.why)+'</p>'+
      '<button class="btn" onclick="openTasting('+next.n+')">Starta provningen</button>'+
      '<button class="btn ghost" onclick="openGuestInvite('+next.n+')">👥 Bjud in en gäst</button></div>';
  } else {
    h += '<div class="tonight"><div class="t-q">Resan är genomförd! 🥃</div>'+
      '<p class="t-why">Alla provningar avklarade. Be Mästaren föreslå en ny provning – eller lägg till fler flaskor på hyllan.</p>'+
      '<button class="btn ghost" onclick="switchView(\'mastaren\')">Fråga Mästaren</button></div>';
  }

  // Omprovning (spaced repetition)
  const due = dueRetastes();
  if(due.length){
    const [id] = due[0];
    const b = bottle(id);
    h += '<div class="sec-label">Dags att prova igen</div>'+
      '<div class="card"><h3>'+dotHtml(b.color)+' '+esc(b.name)+'</h3>'+
      '<p class="muted">Prova igen utan facit: skriv tre dofter innan du får se dina gamla anteckningar. Så tränas minnet i näsan.</p>'+
      '<button class="btn ghost" onclick="openRetaste(\''+id+'\')">Omprovning utan facit</button></div>';
  }

  // Fredagssnurran
  if(visibleBottles().filter(([id,b]) => b.status !== "finished").length >= 2){
    h += '<div class="sec-label">Kan inte välja?</div>'+
      '<button class="btn ghost" style="margin-top:0" onclick="openSpinner()">🎡 Fredagssnurran – låt ödet välja dram</button>';
  }

  // Kvällens ton
  const toneIds = next ? next.bottles : (due.length ? [due[0][0]] : []);
  if(toneIds.length){
    const sig = next ? "t"+next.n : "r"+toneIds[0];
    const custom = aiTone && aiTone.sig === sig ? aiTone.data : null;
    const {tone} = toneFor(toneIds);
    const t = custom || tone;
    // Kvällens flaskors signaturlåtar först
    let sigRows = "";
    [...new Set(toneIds)].forEach(id => {
      const b = bottle(id);
      if(b && !b.hidden && b.song && (b.song.artist || b.song.title)){
        sigRows += '<div class="track">'+dotHtml(b.color,14)+' <span class="muted" style="font-size:13px">'+esc(b.name)+'</span> → '+
          '<a href="'+spotify((b.song.artist||"")+" "+(b.song.title||""))+'" target="_blank" rel="noopener">'+esc(b.song.artist)+' – '+esc(b.song.title)+'</a></div>';
      }
    });
    h += '<div class="sec-label">Kvällens ton</div><div class="tone">'+
      '<div class="mono">🎵 Musik till glasen'+(custom?" · från Mästaren":"")+'</div>'+
      (sigRows ? '<div style="margin:8px 0 12px">'+sigRows+'</div><div class="mono">Och för hela kvällen:</div>' : '')+
      '<div class="t-genre">'+esc(t.genre)+'</div>'+
      '<p class="muted">'+esc(t.why)+'</p>'+
      t.tracks.map(tr => '<div class="track">▶ <a href="'+spotify(tr.artist+" "+tr.title)+'" target="_blank" rel="noopener">'+esc(tr.artist)+' – '+esc(tr.title)+'</a></div>').join("")+
      (aiReady() ? '<button class="btn ghost small" style="margin-top:12px" id="aiToneBtn" data-sig="'+sig+'">🎲 Nytt förslag från Mästaren</button>' : '')+
      '</div>';
  }
  return h;
}

/* ===== Vy: Resan ===== */
function renderResan(){
  const next = nextTasting();
  let h = '<div class="sec-label">Hela resan</div><div class="trail">';
  allPhases().forEach(ph => {
    const ts = allTastings().filter(t => t.phase === ph.id);
    if(!ts.length) return;
    h += '<div class="phase-h" style="color:'+ph.color+'">'+esc(ph.name)+'</div>';
    ts.forEach(t => {
      const s = state.sessions[t.n];
      h += '<button class="stop'+(s?" done":(next&&t.n===next.n?" next":""))+'" onclick="openTasting('+t.n+')">'+
        '<div class="s-title">'+t.n+'. '+esc(t.q)+'</div>'+
        '<div class="s-meta">'+t.bottles.map(id => { const b=bottle(id); return b?esc(b.name):id; }).join(" · ")+'</div>'+
        (s?'<span class="s-score">✓</span>':"")+'</button>';
    });
  });
  h += '</div>';

  // Smakprofil
  const scores = {};
  Object.values(state.sessions).forEach(sess => {
    (sess.glasses||[]).forEach(g => {
      if(g.rating > 0 && g.bottle !== "x"){ (scores[g.bottle] = scores[g.bottle]||[]).push(g.rating); }
    });
  });
  const entries = Object.entries(scores)
    .filter(([id]) => bottle(id))
    .map(([id, arr]) => ({id, avg:arr.reduce((a,c)=>a+c,0)/arr.length}))
    .sort((a,c) => c.avg - a.avg);
  h += '<div class="sec-label">Din smakprofil</div><div class="prof">';
  if(!entries.length) h += '<div class="prof-empty">Profilen byggs när du sparat din första provning.</div>';
  else h += entries.map(e =>
    '<div class="prof-row"><span>'+esc(bottle(e.id).name)+'</span>'+
    '<div class="prof-bar"><div style="width:'+(e.avg*10)+'%"></div></div>'+
    '<span class="prof-val">'+e.avg.toFixed(1)+'</span></div>').join("");

  // Ordfrekvens
  const freq = {};
  Object.values(state.sessions).forEach(sess => (sess.glasses||[]).forEach(g => {
    tok(g.nose).concat(tok(g.taste), g.flavors||[]).forEach(w => freq[w]=(freq[w]||0)+1);
  }));
  Object.values(state.retastes).forEach(r => (r.entries||[]).forEach(e => {
    tok(e.nose).concat(tok(e.taste)).forEach(w => freq[w]=(freq[w]||0)+1);
  }));
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).filter(([,n])=>n>=2);
  if(top.length) h += '<div class="freq-chips">'+top.map(([w,n])=>'<span>'+esc(w)+' <b>×'+n+'</b></span>').join("")+'</div>';
  h += '</div>';

  // Lärdomar
  h += '<div class="sec-label">Kvällarnas lärdomar</div>';
  const done = allTastings().filter(t => state.sessions[t.n] && state.sessions[t.n].lesson);
  h += done.length ? done.map(t =>
    '<div class="note-hist"><div class="nh-t">'+t.n+'. '+esc(t.q)+'</div>'+
    '<div class="nh-l">«'+esc(state.sessions[t.n].lesson)+'»</div></div>').join("")
    : '<div class="prof-empty" style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px">Här samlas en mening per kväll – vad du lärde dig.</div>';

  // Gästprovningar
  if(state.guests && state.guests.length){
    h += '<div class="sec-label">Gästprovningar</div>'+
      state.guests.map((g,i) =>
        '<button class="bottle-row" onclick="openSavedGuest('+i+')">'+
        '<span style="font-size:26px;flex:none">👥</span>'+
        '<div class="b-info"><div class="b-name">'+esc(g.name)+' · Provning '+g.n+'</div>'+
        '<div class="b-meta">'+esc(g.date||"")+'</div></div></button>').join("");
  }
  return h;
}

/* ===== Vy: Hyllan ===== */
function renderHyllan(){
  let h = '<div class="seg-toggle">'+
    ["flaskor","kylen","smakkartan"].map(k =>
      '<button class="'+(ui.hylla===k?"on":"")+'" onclick="setHylla(\''+k+'\')">'+({flaskor:"🍾 Flaskor",kylen:"❄️ Kylen",smakkartan:"🗺️ Smakkartan"}[k])+'</button>').join("")+
    '</div>';
  if(ui.hylla === "flaskor") h += renderBottleList();
  else if(ui.hylla === "kylen") h += renderFridge();
  else h += renderFlavourMap();
  return h;
}
function setHylla(k){ ui.hylla = k; renderView(); }

function renderBottleList(){
  const order = {open:0, unopened:1, finished:2};
  const list = visibleBottles().sort((a,b) => (order[a[1].status]||0)-(order[b[1].status]||0) || a[1].name.localeCompare(b[1].name,"sv"));
  let h = '<div style="display:flex;gap:8px">'+
    '<button class="btn" style="margin-top:0" onclick="openBottleForm(null,{camera:true})">📷 Fota ny flaska</button>'+
    '<button class="btn ghost" style="margin-top:0;width:auto;padding:14px 18px" onclick="openBottleForm(null)">+ Lägg till</button>'+
    '</div><div style="height:14px"></div>';
  h += list.map(([id, b]) => {
    const img = photos[id] ? '<img class="bottle-thumb" src="'+photos[id]+'" alt="">' : dotHtml(b.color, 30);
    const meta = [b.type, b.region, b.abv ? b.abv+" %" : null].filter(Boolean).join(" · ");
    const st = b.status||"open";
    const stName = {open:"Öppen", unopened:"Oöppnad", finished:"Urdrucken"}[st];
    return '<button class="bottle-row" onclick="openBottleDetail(\''+id+'\')">'+img+
      '<div class="b-info"><div class="b-name">'+esc(b.name)+'</div><div class="b-meta">'+esc(meta||"—")+'</div></div>'+
      '<span class="badge '+st+'">'+stName+'</span></button>';
  }).join("");
  return h;
}

/* --- Kylen --- */
function fridgeSlotOf(id){
  return Object.keys(state.fridge.slots).find(k => state.fridge.slots[k] === id) || null;
}
function renderFridge(){
  const f = state.fridge;
  let h = '<p class="muted" style="margin-bottom:10px">Tryck på en tom plats för att lägga in en flaska. Ändra kylens mått under Mästaren → Inställningar.</p>';
  h += '<div class="fridge" style="grid-template-columns:repeat('+f.cols+',1fr)">';
  for(let r=0; r<f.rows; r++) for(let c=0; c<f.cols; c++){
    const id = f.slots[r+":"+c];
    const b = id ? bottle(id) : null;
    if(b) h += '<button class="slot filled'+(ui.hl===id?" hl":"")+'" onclick="slotClick('+r+','+c+')">'+dotHtml(b.color,22)+'<span>'+esc(b.name)+'</span></button>';
    else h += '<button class="slot" onclick="slotClick('+r+','+c+')">+</button>';
  }
  h += '</div>';
  const unplaced = visibleBottles().filter(([id,b]) => b.status !== "finished" && !fridgeSlotOf(id));
  if(unplaced.length){
    h += '<div class="sec-label">Utan plats</div><div class="t-bottles">'+unplaced.map(([id])=>chip(id)).join("")+'</div>';
  }
  return h;
}
function slotClick(r, c){
  const key = r+":"+c;
  const id = state.fridge.slots[key];
  if(id){
    const b = bottle(id);
    openOverlay(ovTop("Plats "+(r+1)+":"+(c+1))+
      '<div class="card"><h3>'+dotHtml(b.color)+' '+esc(b.name)+'</h3>'+
      '<button class="btn ghost" onclick="closeOverlay();openBottleDetail(\''+id+'\')">Öppna flaskan</button>'+
      '<button class="btn ghost" onclick="clearSlot(\''+key+'\')">Ta ur kylen</button></div>');
  } else {
    const free = visibleBottles().filter(([bid,b]) => b.status !== "finished" && !fridgeSlotOf(bid));
    openOverlay(ovTop("Välj flaska till platsen")+
      (free.length ? free.map(([bid,b]) =>
        '<button class="bottle-row" onclick="fillSlot(\''+key+'\',\''+bid+'\')">'+dotHtml(b.color,30)+
        '<div class="b-info"><div class="b-name">'+esc(b.name)+'</div></div></button>').join("")
      : '<p class="muted">Alla flaskor har redan en plats.</p>'));
  }
}
function fillSlot(key, id){ state.fridge.slots[key] = id; save(); closeOverlay(); renderView(); }
function clearSlot(key){ delete state.fridge.slots[key]; save(); closeOverlay(); renderView(); }
function goToFridge(){
  ui.view = "hyllan"; ui.hylla = "kylen";
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === "hyllan"));
  renderView();
  window.scrollTo(0,0);
}
function showInFridge(id){
  closeOverlay();
  ui.view = "hyllan"; ui.hylla = "kylen"; ui.hl = id;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === "hyllan"));
  renderView();
  setTimeout(() => { ui.hl = null; }, 4000);
}

/* --- Smakkartan --- */
function renderFlavourMap(){
  let h = '<div class="fmap-box">'+
    '<span class="fmap-label" style="top:8px;left:50%;transform:translateX(-50%)">Rökig</span>'+
    '<span class="fmap-label" style="bottom:8px;left:50%;transform:translateX(-50%)">Mild</span>'+
    '<span class="fmap-label" style="left:8px;top:50%;transform:translateY(-50%) rotate(-90deg);transform-origin:left center">Ljus</span>'+
    '<span class="fmap-label" style="right:8px;top:50%;transform:translateY(-50%) rotate(90deg);transform-origin:right center">Fyllig</span>';
  const placed = visibleBottles().filter(([id,b]) => b.flavour && b.status !== "finished");
  placed.forEach(([id, b]) => {
    h += '<button class="fmap-dot" style="left:'+(8+b.flavour.x*84)+'%;top:'+(8+(1-b.flavour.y)*84)+'%" onclick="openBottleDetail(\''+id+'\')">'+
      dotHtml(b.color,22)+'<span>'+esc(b.name.split(" ").slice(0,2).join(" "))+'</span></button>';
  });
  h += '</div>';
  // Luckanalys
  const counts = {};
  Object.keys(QUADRANTS).forEach(k => counts[k]=0);
  placed.forEach(([,b]) => counts[quadrantOf(b.flavour.x, b.flavour.y)]++);
  const gaps = Object.keys(QUADRANTS).filter(k => counts[k] === 0);
  if(gaps.length) h += '<div class="fmap-gap">🧭 Lucka på kartan: du har inget i hörnet <b>'+gaps.map(k=>QUADRANTS[k].name).join("</b> eller <b>")+'</b>. Något att utforska vid nästa köp!</div>';
  else h += '<div class="fmap-gap">🏆 Alla fyra smakhörn är täckta – en komplett hylla för att träna gommen.</div>';
  h += '<button class="btn ghost" style="margin-top:12px" onclick="openBlind()">🙈 Blindprovning – testa dig själv</button>';
  return h;
}

/* ===== Vy: Mästaren ===== */
let chatBusy = false;
let pendingSuggestion = null;

function renderMastaren(){
  let h = '<div class="sec-label">Mästaren</div>';
  if(!state.settings.apiKey){
    h += '<div class="notice">🎩 Mästaren är en AI-mentor som kan hela din hylla och dagbok. Lägg in en Anthropic API-nyckel i inställningarna nedan för att väcka honom.</div>';
  }
  h += '<div class="chat-log">';
  if(!state.chat.length && state.settings.apiKey){
    h += '<div class="msg ai">Godkväll! Jag är Mästaren. Fråga mig vad du vill om dina flaskor – eller be mig föreslå nästa provning. 🥃</div>';
  }
  state.chat.forEach(m => { h += '<div class="msg '+(m.role==="user"?"user":"ai")+'">'+esc(m.text)+'</div>'; });
  if(chatBusy) h += '<div class="msg thinking">Mästaren funderar …</div>';
  h += '</div>';

  if(pendingSuggestion){
    const s = pendingSuggestion;
    h += '<div class="card suggestion"><div class="t-phase" style="color:var(--gold)">Förslag på ny provning</div>'+
      '<div class="t-q" style="font-size:20px">'+esc(s.q)+'</div>'+
      '<div class="t-bottles">'+s.bottles.map(chip).join("")+'</div>'+
      '<p class="t-why">'+esc(s.why)+'</p>'+
      '<button class="btn" onclick="addSuggestedTasting()">Lägg till i resan</button>'+
      '<button class="btn ghost" onclick="dismissSuggestion()">Nej tack</button></div>';
  }

  h += '<div class="chat-input"><textarea id="chatField" placeholder="Fråga Mästaren …" '+(state.settings.apiKey?"":"disabled")+'></textarea>'+
    '<button id="chatSend" '+(state.settings.apiKey&&!chatBusy?"":"disabled")+'>➤</button></div>';
  h += '<button class="btn ghost" style="margin-top:12px" id="suggestBtn" '+(state.settings.apiKey&&!chatBusy?"":"disabled")+'>✨ Föreslå ny provning utifrån min dagbok</button>';

  // Inställningar
  const f = state.fridge;
  h += '<div class="settings-box"><details><summary>⚙️ Inställningar</summary><div class="inner-set">'+
    '<div class="field"><label>Anthropic API-nyckel</label><input type="password" id="setKey" value="'+esc(state.settings.apiKey)+'" placeholder="sk-ant-…" autocomplete="off">'+
    '<div class="hint">Nyckeln sparas bara i din webbläsare och skickas aldrig någon annanstans än till Anthropic. Skapa en på console.anthropic.com.</div></div>'+
    '<div class="set-row"><button class="btn small" id="saveKeyBtn">Spara</button><button class="btn ghost small" id="testKeyBtn">Testa nyckeln</button></div>'+
    '<div style="height:18px"></div>'+
    '<div class="set-row"><div class="field"><label>Kylen: hyllor</label><input type="number" id="setRows" min="1" max="10" value="'+f.rows+'"></div>'+
    '<div class="field"><label>Platser per hylla</label><input type="number" id="setCols" min="1" max="8" value="'+f.cols+'"></div>'+
    '<button class="btn small" id="saveFridgeBtn">Spara</button></div>'+
    '<div style="height:18px"></div>'+
    '<div class="set-row"><button class="btn ghost small" id="exportBtn">⬇ Exportera säkerhetskopia</button>'+
    '<button class="btn ghost small" id="importBtn">⬆ Importera</button></div>'+
    '<input type="file" id="importFile" accept="application/json" hidden>'+
    '<div class="hint">'+(state.lastExport?"Senaste export: "+state.lastExport:"Ingen säkerhetskopia gjord ännu.")+'</div>'+
    '<div class="danger"><button id="resetBtn">Nollställ all data</button></div>'+
    '</div></details></div>';
  return h;
}

async function sendChat(){
  const field = $("chatField");
  const text = field.value.trim();
  if(!text || chatBusy) return;
  state.chat.push({role:"user", text});
  state.chat = state.chat.slice(-40);
  save();
  chatBusy = true;
  renderView();
  try{
    const messages = state.chat.slice(-20).map(m => ({role:m.role==="user"?"user":"assistant", content:m.text}));
    const reply = await askMastaren(messages);
    state.chat.push({role:"ai", text:reply});
    state.chat = state.chat.slice(-40);
    save();
  }catch(e){ toast(e.message); }
  chatBusy = false;
  renderView();
}

async function suggestTastingFlow(){
  if(chatBusy) return;
  const wish = $("chatField") ? $("chatField").value.trim() : "";
  chatBusy = true;
  renderView();
  try{
    pendingSuggestion = await generateTasting(wish);
    if(!pendingSuggestion.bottles || !pendingSuggestion.bottles.length) throw new Error("Mästaren hittade inget förslag – prova igen.");
  }catch(e){ toast(e.message); pendingSuggestion = null; }
  chatBusy = false;
  renderView();
}
function addSuggestedTasting(){
  const s = pendingSuggestion;
  if(!s) return;
  let ph = state.phases.find(p => p.name === s.phaseName);
  if(!ph){
    const maxId = allPhases().reduce((m,p) => Math.max(m,p.id), 0);
    ph = {id:maxId+1, name:s.phaseName, color:NEW_PHASE_COLORS[state.phases.length % NEW_PHASE_COLORS.length]};
    state.phases.push(ph);
  }
  const maxN = allTastings().reduce((m,t) => Math.max(m,t.n), 0);
  state.tastings.push({n:maxN+1, phase:ph.id, q:s.q, why:s.why, bottles:s.bottles, source:"ai"});
  pendingSuggestion = null;
  save();
  toast("Tillagd i resan!");
  renderView();
}
function dismissSuggestion(){ pendingSuggestion = null; renderView(); }

/* ===== Export / Import / Nollställ ===== */
function exportData(){
  const includePhotos = Object.keys(photos).length ? confirm("Ta med flaskfoton i säkerhetskopian? (Filen blir större.)") : false;
  const st = JSON.parse(JSON.stringify(state));
  st.settings.apiKey = ""; // nyckeln exporteras aldrig
  const blob = new Blob([JSON.stringify({app:"smakresan", exportedAt:new Date().toISOString(), state:st, photos:includePhotos?photos:{}}, null, 1)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "smakresan-backup-"+today()+".json";
  a.click();
  URL.revokeObjectURL(a.href);
  state.lastExport = today();
  save();
  renderView();
}
function importData(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!data.state || data.state.version !== 2) throw new Error("bad");
      if(!confirm("Ersätta ALL nuvarande data med säkerhetskopian från "+(data.exportedAt||"okänt datum").slice(0,10)+"?")) return;
      const key = state.settings.apiKey;
      state = fillDefaults(data.state);
      if(!state.settings.apiKey) state.settings.apiKey = key;
      photos = data.photos || {};
      save(); savePhotos();
      toast("Säkerhetskopian är återställd!");
      renderView();
    }catch(e){ alert("Filen gick inte att läsa – är det en Smakresan-backup?"); }
  };
  reader.readAsText(file);
}
function resetAll(){
  if(!confirm("Radera alla provningar, flaskor, foton och anteckningar? Detta går inte att ångra.")) return;
  const key = state.settings.apiKey;
  state = defaultState();
  state.settings.apiKey = key;
  photos = {};
  save(); savePhotos();
  toast("Allt nollställt.");
  renderView();
}

/* ===== Overlay-system ===== */
let ovSave = null;
function ovTop(title){
  return '<div class="ov-top"><button class="back" onclick="closeOverlay()">← Tillbaka</button></div>'+
    (title ? '<h2 style="font-family:Libre Caslon Text,serif;font-size:24px;line-height:1.25;margin:0 0 16px">'+esc(title)+'</h2>' : '');
}
function openOverlay(html, opts){
  opts = opts || {};
  $("ovContent").innerHTML = html;
  if(opts.saveLabel){
    $("ovSavebar").style.display = "block";
    $("saveBtn").textContent = opts.saveLabel;
    ovSave = opts.onSave || null;
  } else {
    $("ovSavebar").style.display = "none";
    ovSave = null;
  }
  $("overlay").classList.add("open");
  window.scrollTo(0,0);
}
function closeOverlay(){
  $("overlay").classList.remove("open");
  ovSave = null;
}

/* ===== Provningsflödet ===== */
let current = null, draft = null;

function openTasting(n){
  current = allTastings().find(t => t.n === n);
  if(!current) return;
  const existing = state.sessions[n];
  draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    glasses: current.bottles.map((b,i) => ({bottle:b, idx:i, nose:"", taste:"", finish:"", rating:0, flavors:[], noseWater:"", tasteWater:""})),
    lesson:"", music:"", date:null
  };
  draft.glasses.forEach(g => { if(!g.flavors) g.flavors=[]; if(g.noseWater===undefined) g.noseWater=""; if(g.tasteWater===undefined) g.tasteWater=""; });
  if(draft.music === undefined) draft.music = "";

  const ph = allPhases().find(p => p.id === current.phase) || {name:"",color:"var(--gold)"};
  let html = '<div class="ov-top"><button class="back" onclick="closeOverlay()">← Tillbaka</button></div>'+
    '<div class="t-phase" style="color:'+ph.color+'">'+esc(ph.name)+' · Provning '+current.n+'</div>'+
    '<h2 style="font-family:Libre Caslon Text,serif;font-size:24px;line-height:1.25;margin:8px 0 6px">'+esc(current.q)+'</h2>'+
    '<p style="font-size:14px;color:var(--paper-dim);margin-bottom:18px">'+esc(current.why)+'</p>';

  draft.glasses.forEach((g, i) => {
    const b = bottle(g.bottle) || {name:g.bottle, color:"#555049"};
    html += '<div class="glass-card">'+
      '<h3>'+dotHtml(b.color,24)+'Glas '+(i+1)+' · '+esc(b.name)+'</h3>'+
      '<div class="field"><label>Doft – tre ord</label><input type="text" data-i="'+i+'" data-f="nose" value="'+esc(g.nose)+'" placeholder="t.ex. honung, äpple, vanilj"></div>'+
      '<div class="field"><label>Smak – tre ord</label><input type="text" data-i="'+i+'" data-f="taste" value="'+esc(g.taste)+'" placeholder="t.ex. päron, ek, peppar"></div>'+
      '<div class="wheel"><details'+(g.flavors.length?" open":"")+'><summary>Smakhjul – tryck på det du känner ▾</summary>'+
      Object.entries(FLAVOR_WHEEL).map(([cat, words]) =>
        '<div class="mono" style="margin-top:6px">'+esc(cat)+'</div><div class="chips">'+
        words.map(w => '<button class="chip-t'+(g.flavors.includes(w)?" on":"")+'" data-i="'+i+'" data-w="'+esc(w)+'">'+esc(w)+'</button>').join("")+
        '</div>').join("")+
      '</details></div>'+
      '<div class="wheel"><details'+((g.noseWater||g.tasteWater)?" open":"")+'><summary>💧 Vattentest – före & efter droppar ▾</summary>'+
      '<div class="field" style="margin-top:8px"><label>Doft efter vatten</label><input type="text" data-i="'+i+'" data-f="noseWater" value="'+esc(g.noseWater)+'" placeholder="vad öppnade sig?"></div>'+
      '<div class="field"><label>Smak efter vatten</label><input type="text" data-i="'+i+'" data-f="tasteWater" value="'+esc(g.tasteWater)+'" placeholder="mjukare? sötare?"></div>'+
      '</details></div>'+
      '<div class="field"><label>Eftersmak</label><div class="seg-row">'+
        ["Kort","Medel","Lång"].map(v => '<button class="seg-btn'+(g.finish===v?" on":"")+'" data-i="'+i+'" data-v="'+v+'">'+v+'</button>').join("")+
      '</div></div>'+
      '<div class="field"><label>Betyg</label><div class="stars">'+
        Array.from({length:10},(_,k) => '<button class="star'+(g.rating>=k+1?" on":"")+'" data-i="'+i+'" data-r="'+(k+1)+'">'+(k+1)+'</button>').join("")+
      '</div></div></div>';
  });

  html += '<div class="lesson"><h3>Kvällens lärdom</h3>'+
    '<div class="field"><label>En mening – vad lärde du dig?</label>'+
    '<textarea id="lessonField" placeholder="t.ex. Jag gillar rök mer när den har sötma bakom sig …">'+esc(draft.lesson)+'</textarea></div>'+
    '<div class="field"><label>🎵 Lyssnade på</label><input type="text" id="musicField" value="'+esc(draft.music)+'" placeholder="t.ex. Tom Waits – Closing Time"></div></div>';

  openOverlay(html, {saveLabel:"Spara provningen", onSave:saveTasting});
  bindTastingOverlay();
}

function bindTastingOverlay(){
  const root = $("ovContent");
  root.querySelectorAll("input[type=text][data-f]").forEach(inp => {
    inp.addEventListener("input", () => { draft.glasses[+inp.dataset.i][inp.dataset.f] = inp.value; });
  });
  root.querySelectorAll(".seg-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      draft.glasses[+btn.dataset.i].finish = btn.dataset.v;
      btn.parentElement.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("on"));
      btn.classList.add("on");
    });
  });
  root.querySelectorAll(".star").forEach(st => {
    st.addEventListener("click", () => {
      const i = +st.dataset.i, r = +st.dataset.r;
      draft.glasses[i].rating = r;
      st.parentElement.querySelectorAll(".star").forEach(x => x.classList.toggle("on", +x.dataset.r <= r));
    });
  });
  root.querySelectorAll(".chip-t").forEach(ch => {
    ch.addEventListener("click", () => {
      const g = draft.glasses[+ch.dataset.i], w = ch.dataset.w;
      const ix = g.flavors.indexOf(w);
      if(ix >= 0) g.flavors.splice(ix,1); else g.flavors.push(w);
      ch.classList.toggle("on", ix < 0);
    });
  });
  $("lessonField").addEventListener("input", e => { draft.lesson = e.target.value; });
  $("musicField").addEventListener("input", e => { draft.music = e.target.value; });
}

function saveTasting(){
  if(!current) return;
  draft.date = today();
  state.sessions[current.n] = draft;
  scheduleRetastes(draft.glasses);
  save();
  closeOverlay();
  current = null;
  renderView();
  toast("Provning sparad!");
}

/* ===== Omprovningar (spaced repetition) ===== */
function scheduleRetastes(glasses){
  glasses.forEach(g => {
    if(g.bottle === "x" || !g.rating) return;
    if(!state.retastes[g.bottle]){
      state.retastes[g.bottle] = {due:addDays(today(), RETASTE_INTERVALS[0]), stage:0, entries:[]};
    }
  });
}
function pastNotesFor(id){
  const notes = [];
  allTastings().forEach(t => {
    const s = state.sessions[t.n];
    if(!s) return;
    (s.glasses||[]).forEach(g => {
      if(g.bottle === id && (g.nose || g.taste)) notes.push({date:s.date, nose:g.nose, taste:g.taste, label:"Provning "+t.n});
    });
  });
  const r = state.retastes[id];
  if(r) (r.entries||[]).forEach(e => {
    if(e.nose || e.taste) notes.push({date:e.date, nose:e.nose, taste:e.taste, label:e.blind?"Blindprovning":"Omprovning"});
  });
  return notes;
}

let retasteId = null, retasteDraft = null;
function openRetaste(id){
  retasteId = id;
  retasteDraft = {nose:"", taste:""};
  const b = bottle(id);
  openOverlay(ovTop("Omprovning · "+b.name)+
    '<div class="card"><p class="muted">Häll upp ett litet glas. Skriv vad du känner – <b>utan</b> att titta på gamla anteckningar. Sen jämför vi.</p></div>'+
    '<div class="glass-card"><h3>'+dotHtml(b.color,24)+esc(b.name)+'</h3>'+
    '<div class="field"><label>Doft – tre ord, ur minnet</label><input type="text" id="rtNose" placeholder="lita på näsan …"></div>'+
    '<div class="field"><label>Smak – tre ord</label><input type="text" id="rtTaste" placeholder="…och på gommen"></div></div>',
    {saveLabel:"Visa facit ➜", onSave:revealRetaste});
  $("rtNose").addEventListener("input", e => retasteDraft.nose = e.target.value);
  $("rtTaste").addEventListener("input", e => retasteDraft.taste = e.target.value);
}
function revealRetaste(){
  const id = retasteId, b = bottle(id);
  const past = pastNotesFor(id);
  const oldWords = new Set();
  past.forEach(n => tok(n.nose).concat(tok(n.taste)).forEach(w => oldWords.add(w)));
  const newWords = tok(retasteDraft.nose).concat(tok(retasteDraft.taste));
  const matched = [...new Set(newWords.filter(w => oldWords.has(w)))];
  let verdict;
  if(!newWords.length) verdict = "Du skrev inga ord – men själva provningen räknas ändå!";
  else if(!oldWords.size) verdict = "Första anteckningen för den här flaskan – nu finns ett facit till nästa gång.";
  else if(matched.length) verdict = matched.length+" av "+newWords.length+" ord matchade din gamla näsa 👃 ("+matched.join(", ")+")";
  else verdict = "Inga ord matchade – spännande! Antingen har gommen utvecklats, eller så upptäckte du nya sidor.";

  let html = ovTop("Facit · "+b.name)+
    '<div class="card"><h3>Ikväll skrev du</h3><p>Doft: <i>'+esc(retasteDraft.nose||"–")+'</i><br>Smak: <i>'+esc(retasteDraft.taste||"–")+'</i></p>'+
    '<div class="notice">'+esc(verdict)+'</div></div>'+
    '<div class="sec-label">Dina tidigare anteckningar</div>'+
    (past.length ? past.map(n => '<div class="note-hist"><div class="nh-t">'+esc(n.label)+' · '+esc(n.date||"")+'</div>'+
      '<div class="nh-l">Doft: '+esc(n.nose||"–")+' · Smak: '+esc(n.taste||"–")+'</div></div>').join("") :
      '<p class="muted">Inga tidigare anteckningar.</p>');
  openOverlay(html, {saveLabel:"Spara omprovningen", onSave:saveRetaste});
}
function saveRetaste(){
  const r = state.retastes[retasteId] || (state.retastes[retasteId] = {stage:0, entries:[]});
  r.entries = r.entries || [];
  r.entries.push({date:today(), nose:retasteDraft.nose, taste:retasteDraft.taste, blind:false});
  r.stage = Math.min((r.stage||0)+1, RETASTE_INTERVALS.length-1);
  r.due = addDays(today(), RETASTE_INTERVALS[r.stage]);
  save();
  closeOverlay();
  renderView();
  toast("Omprovning sparad – nästa gång om "+RETASTE_INTERVALS[r.stage]+" dagar.");
}

/* ===== Blindläge ===== */
let blindSecret = null, blindGuess = null;
function openBlind(){
  blindSecret = null;
  blindGuess = {smoky:null, sherry:null, bottleId:null, nose:""};
  openOverlay(ovTop("Blindprovning")+
    '<div class="card"><h3>🙈 Så funkar det</h3>'+
    '<p class="muted">1. Lämna över telefonen till din medhjälpare.<br>2. Hen väljer en flaska i hemlighet och häller upp.<br>3. Du får tillbaka telefonen och gissar.</p>'+
    '<button class="btn" onclick="blindStep2()">Jag är medhjälparen – välj flaska</button></div>');
}
function blindStep2(){
  const list = visibleBottles().filter(([id,b]) => b.status !== "finished");
  openOverlay(ovTop("Medhjälparen väljer")+
    '<p class="muted" style="margin-bottom:12px">Välj flaskan i hemlighet – visa inte skärmen!</p>'+
    list.map(([id,b]) => '<button class="bottle-row" onclick="blindPick(\''+id+'\')">'+dotHtml(b.color,30)+
      '<div class="b-info"><div class="b-name">'+esc(b.name)+'</div></div></button>').join(""));
}
function blindPick(id){
  blindSecret = id;
  openOverlay(ovTop("Häll upp!")+
    '<div class="card"><h3>🤫 Vald.</h3><p class="muted">Häll upp ett glas (ca 2 cl räcker), lämna tillbaka telefonen till provaren – utan att avslöja något.</p>'+
    '<button class="btn" onclick="blindStep3()">Jag är provaren – börja gissa</button></div>');
}
function blindStep3(){
  const list = visibleBottles().filter(([id,b]) => b.status !== "finished");
  openOverlay(ovTop("Din gissning")+
    '<div class="glass-card">'+
    '<div class="field"><label>Rökig?</label><div class="seg-row">'+
      '<button class="seg-btn" data-q="smoky" data-v="ja">Ja</button><button class="seg-btn" data-q="smoky" data-v="nej">Nej</button></div></div>'+
    '<div class="field"><label>Sherryfat?</label><div class="seg-row">'+
      '<button class="seg-btn" data-q="sherry" data-v="ja">Ja</button><button class="seg-btn" data-q="sherry" data-v="nej">Nej</button></div></div>'+
    '<div class="field"><label>Tre dofter du känner</label><input type="text" id="blNose" placeholder="skriv innan du gissar flaska"></div>'+
    '<div class="field"><label>Vilken flaska är det?</label><div class="chips">'+
      list.map(([id,b]) => '<button class="chip-t" data-b="'+id+'">'+esc(b.name)+'</button>').join("")+
    '</div></div></div>',
    {saveLabel:"Avslöja!", onSave:blindReveal});
  const root = $("ovContent");
  root.querySelectorAll(".seg-btn").forEach(btn => btn.addEventListener("click", () => {
    blindGuess[btn.dataset.q === "smoky" ? "smoky" : "sherry"] = btn.dataset.v;
    btn.parentElement.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("on"));
    btn.classList.add("on");
  }));
  root.querySelectorAll(".chip-t").forEach(ch => ch.addEventListener("click", () => {
    blindGuess.bottleId = ch.dataset.b;
    root.querySelectorAll(".chip-t").forEach(x => x.classList.remove("on"));
    ch.classList.add("on");
  }));
  $("blNose").addEventListener("input", e => blindGuess.nose = e.target.value);
}
function blindReveal(){
  const b = bottle(blindSecret);
  const truthSmoky = !!(b.flavour && b.flavour.y >= 0.45);
  const truthSherry = /sherry|oloroso/i.test(b.cask||"");
  const rows = [];
  if(blindGuess.smoky) rows.push({q:"Rökig?", you:blindGuess.smoky, right:(blindGuess.smoky==="ja")===truthSmoky});
  if(blindGuess.sherry) rows.push({q:"Sherryfat?", you:blindGuess.sherry, right:(blindGuess.sherry==="ja")===truthSherry});
  const bottleRight = blindGuess.bottleId === blindSecret;
  const hits = rows.filter(r=>r.right).length + (blindGuess.bottleId ? (bottleRight?1:0) : 0);
  const total = rows.length + (blindGuess.bottleId?1:0);

  // Spara direkt som blind anteckning
  const r = state.retastes[blindSecret] || (state.retastes[blindSecret] = {stage:0, due:addDays(today(),RETASTE_INTERVALS[0]), entries:[]});
  r.entries = r.entries || [];
  r.entries.push({date:today(), nose:blindGuess.nose, taste:"", blind:true,
    guess:blindGuess.bottleId ? (bottle(blindGuess.bottleId)||{}).name : null, correct:bottleRight});
  save();

  const past = pastNotesFor(blindSecret).filter(n => n.label !== "Blindprovning" || n.date !== today());
  let html = ovTop("Avslöjandet")+
    '<div class="card"><h3>'+dotHtml(b.color,24)+' Det var '+esc(b.name)+'!</h3>'+
    (total ? '<div class="notice">'+hits+' av '+total+' rätt 🎯</div>' : '')+
    rows.map(rw => '<p>'+esc(rw.q)+' Du sa <b>'+esc(rw.you)+'</b> – '+(rw.right?"rätt ✓":"fel ✗")+'</p>').join("")+
    (blindGuess.bottleId ? '<p>Flaskan: du gissade <b>'+esc((bottle(blindGuess.bottleId)||{}).name||"?")+'</b> – '+(bottleRight?"rätt ✓":"fel ✗")+'</p>' : '')+
    (blindGuess.nose ? '<p>Dina dofter blint: <i>'+esc(blindGuess.nose)+'</i></p>' : '')+
    '</div>';
  if(past.length){
    html += '<div class="sec-label">Så beskrev du den tidigare</div>'+
      past.map(n => '<div class="note-hist"><div class="nh-t">'+esc(n.label)+' · '+esc(n.date||"")+'</div>'+
        '<div class="nh-l">Doft: '+esc(n.nose||"–")+' · Smak: '+esc(n.taste||"–")+'</div></div>').join("");
  }
  openOverlay(html, {saveLabel:"Klart!", onSave:() => { closeOverlay(); renderView(); }});
}

/* ===== Gästprovning (serverlös – all data reser i länken) ===== */
function encodeShare(obj){
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decodeShare(s){
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length % 4) s += "=";
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}
function appUrl(){ return location.origin + location.pathname; }

function shareBlock(link){
  return '<div class="field" style="margin-top:12px"><label>Länk</label><textarea id="shareLink" readonly style="min-height:84px;font-size:12px">'+esc(link)+'</textarea></div>'+
    '<div class="seg-row">'+
    (navigator.share ? '<button class="seg-btn" id="shareBtn">📤 Dela</button>' : '')+
    '<button class="seg-btn" id="copyBtn">📋 Kopiera</button></div>';
}
function bindShare(link, title){
  const sb = $("shareBtn");
  if(sb) sb.addEventListener("click", () => { navigator.share({title:title, url:link}).catch(()=>{}); });
  $("copyBtn").addEventListener("click", async () => {
    try{ await navigator.clipboard.writeText(link); toast("Länk kopierad!"); }
    catch(e){ $("shareLink").select(); toast("Markerad – kopiera manuellt."); }
  });
}

function openGuestInvite(n){
  const t = allTastings().find(x => x.n === n);
  if(!t) return;
  openOverlay(ovTop("Bjud in en gäst")+
    '<div class="card"><h3>👥 '+esc(t.q)+'</h3>'+
    '<p class="muted">Gästen får en länk, antecknar på sin egen mobil och skickar tillbaka en svarslänk – sen jämför ni era intryck sida vid sida. Ingen app eller inloggning behövs.</p>'+
    '<div class="field" style="margin-top:12px"><label>Vad ska gästen se?</label><div class="seg-row">'+
    '<button class="seg-btn on" data-bl="0">Flasknamnen</button>'+
    '<button class="seg-btn" data-bl="1">Blint (bara Glas 1, 2 …)</button></div></div>'+
    '<button class="btn" id="makeInviteBtn">Skapa gästlänk</button>'+
    '<div id="inviteResult"></div></div>');
  let blind = false;
  document.querySelectorAll(".seg-btn[data-bl]").forEach(b => b.addEventListener("click", () => {
    blind = b.dataset.bl === "1";
    document.querySelectorAll(".seg-btn[data-bl]").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
  }));
  $("makeInviteBtn").addEventListener("click", () => {
    const payload = {v:1, n:t.n, q:t.q, host:"Per", glasses:t.bottles.map((id,i) => {
      const b = bottle(id);
      return {label:"Glas "+(i+1), name:(!blind && b && !b.hidden) ? b.name : null};
    })};
    const link = appUrl()+"#gast="+encodeShare(payload);
    $("inviteResult").innerHTML = shareBlock(link)+'<p class="hint">Skicka länken till gästen – sms, WhatsApp, vad som helst.</p>';
    bindShare(link, "Du är bjuden på whiskyprovning! 🥃");
  });
}

let guestDraft = null;
function openGuestView(inv){
  guestDraft = {v:1, n:inv.n, name:"", glasses:(inv.glasses||[]).map(g => ({label:g.label, name:g.name||null, nose:"", taste:"", rating:0}))};
  let html = '<div class="ov-top"><span class="mono">Smakresan · Gästprovning</span></div>'+
    '<h2 style="font-family:Libre Caslon Text,serif;font-size:24px;line-height:1.25;margin:0 0 6px">🥃 Du är bjuden på provning!</h2>'+
    '<p class="muted" style="margin-bottom:16px">'+esc(inv.host||"Värden")+' undrar: «'+esc(inv.q||"")+'» — skriv vad du känner, utan att snegla på värdens anteckningar.</p>'+
    '<div class="field"><label>Ditt namn</label><input type="text" id="gName" placeholder="t.ex. Maria"></div>';
  guestDraft.glasses.forEach((g,i) => {
    html += '<div class="glass-card"><h3>'+esc(g.label||("Glas "+(i+1)))+(g.name?' · '+esc(g.name):'')+'</h3>'+
      '<div class="field"><label>Doft – tre ord</label><input type="text" data-gi="'+i+'" data-gf="nose" placeholder="vad känner du?"></div>'+
      '<div class="field"><label>Smak – tre ord</label><input type="text" data-gi="'+i+'" data-gf="taste" placeholder="…och i munnen?"></div>'+
      '<div class="field"><label>Betyg</label><div class="stars">'+
      Array.from({length:10},(_,k)=>'<button class="star" data-gi="'+i+'" data-r="'+(k+1)+'">'+(k+1)+'</button>').join("")+
      '</div></div></div>';
  });
  openOverlay(html, {saveLabel:"Skapa svarslänk", onSave:makeGuestAnswerLink});
  const root = $("ovContent");
  $("gName").addEventListener("input", e => { guestDraft.name = e.target.value; });
  root.querySelectorAll("input[data-gf]").forEach(inp => inp.addEventListener("input", () => {
    guestDraft.glasses[+inp.dataset.gi][inp.dataset.gf] = inp.value;
  }));
  root.querySelectorAll(".star[data-gi]").forEach(st => st.addEventListener("click", () => {
    const i = +st.dataset.gi, r = +st.dataset.r;
    guestDraft.glasses[i].rating = r;
    st.parentElement.querySelectorAll(".star").forEach(x => x.classList.toggle("on", +x.dataset.r <= r));
  }));
}
function makeGuestAnswerLink(){
  guestDraft.date = today();
  const link = appUrl()+"#svar="+encodeShare(guestDraft);
  openOverlay(ovTop("Tack för ikväll!")+
    '<div class="card"><h3>🎉 Dina svar är klara</h3>'+
    '<p class="muted">Skicka tillbaka länken till värden, så jämför ni era intryck sida vid sida.</p>'+
    shareBlock(link)+'</div>');
  bindShare(link, "Mina provningssvar 🥃");
}

function openGuestAnswer(ans, viewOnly){
  const t = allTastings().find(x => x.n === ans.n);
  const mySession = state.sessions[ans.n];
  let html = ovTop("Gästprovning · "+(ans.name||"Gäst"));
  if(t) html += '<p class="muted" style="margin-bottom:14px">«'+esc(t.q)+'»'+(ans.date?' · '+esc(ans.date):'')+'</p>';
  (ans.glasses||[]).forEach((g,i) => {
    const mine = mySession && mySession.glasses && mySession.glasses[i];
    const myBottle = t && t.bottles && t.bottles[i] ? bottle(t.bottles[i]) : null;
    html += '<div class="glass-card"><h3>'+(myBottle&&!myBottle.hidden?dotHtml(myBottle.color,20)+' ':'')+esc(g.label||("Glas "+(i+1)))+(myBottle&&!myBottle.hidden?' · '+esc(myBottle.name):'')+'</h3>'+
      '<div class="cmp"><div><div class="mono">'+esc(ans.name||"Gästen")+'</div>'+
      '<p>Doft: <i>'+esc(g.nose||"–")+'</i><br>Smak: <i>'+esc(g.taste||"–")+'</i><br>Betyg: <b>'+(g.rating||"–")+'</b></p></div>'+
      '<div><div class="mono">Du</div>'+
      (mine ? '<p>Doft: <i>'+esc(mine.nose||"–")+'</i><br>Smak: <i>'+esc(mine.taste||"–")+'</i><br>Betyg: <b>'+(mine.rating||"–")+'</b></p>' : '<p class="muted">Ingen egen anteckning ännu – gör provningen så fylls den i här.</p>')+
      '</div></div></div>';
  });
  if(viewOnly){ openOverlay(html); return; }
  openOverlay(html, {saveLabel:"Spara gästprovningen", onSave:() => {
    state.guests.push({date:ans.date||today(), name:ans.name||"Gäst", n:ans.n, glasses:ans.glasses});
    save(); closeOverlay(); renderView(); toast("Gästprovning sparad!");
  }});
}
function openSavedGuest(i){ const g = state.guests[i]; if(g) openGuestAnswer(g, true); }

function handleHash(){
  const h = location.hash || "";
  if(!h.startsWith("#gast=") && !h.startsWith("#svar=")) return;
  try{
    if(h.startsWith("#gast=")) openGuestView(decodeShare(h.slice(6)));
    else openGuestAnswer(decodeShare(h.slice(6)));
  }catch(e){ toast("Länken gick inte att läsa – be om en ny."); }
  history.replaceState(null, "", location.pathname + location.search);
}

/* ===== Fredagssnurran ===== */
function lastNotedDate(id){
  let d = null;
  Object.values(state.sessions).forEach(s => (s.glasses||[]).forEach(g => {
    if(g.bottle === id && s.date && (!d || s.date > d)) d = s.date;
  }));
  const r = state.retastes[id];
  if(r) (r.entries||[]).forEach(e => { if(e.date && (!d || e.date > d)) d = e.date; });
  return d;
}
function openSpinner(){
  const cands = visibleBottles().filter(([id,b]) => b.status !== "finished");
  if(cands.length < 2){ toast("Behövs minst två flaskor att välja bland."); return; }
  // Viktad slump: längre sedan senaste anteckning = större chans
  const t = today();
  const weights = cands.map(([id]) => {
    const d = lastNotedDate(id);
    if(!d) return 400;
    const days = Math.max(1, Math.round((new Date(t) - new Date(d)) / 86400000));
    return Math.min(365, days) + 1;
  });
  let r = Math.random() * weights.reduce((a,b) => a+b, 0);
  let winIx = cands.length - 1;
  for(let i = 0; i < weights.length; i++){ r -= weights[i]; if(r <= 0){ winIx = i; break; } }

  openOverlay(ovTop("Fredagssnurran")+
    '<div class="card" style="text-align:center"><p class="muted">Ödet väljer bland '+cands.length+' flaskor – de du inte rört på länge har större chans.</p>'+
    '<div class="spin-stage" id="spinStage"></div>'+
    '<div id="spinResult"></div></div>');

  const stage = $("spinStage");
  const showFrame = ix => {
    const [, b] = cands[ix];
    stage.innerHTML = dotHtml(b.color, 34)+'<div class="spin-name">'+esc(b.name)+'</div>';
  };
  const finish = () => {
    const [id, b] = cands[winIx];
    stage.innerHTML = dotHtml(b.color, 44)+'<div class="spin-name spin-win">'+esc(b.name)+'</div>';
    const adv = drinkAdvice(b)[0];
    $("spinResult").innerHTML = (adv ? '<div class="notice" style="text-align:left">'+adv.ic+' '+esc(adv.txt)+'</div>' : '')+
      '<button class="btn" onclick="openBottleDetail(\''+id+'\')">Visa flaskan</button>'+
      '<button class="btn ghost" onclick="openSpinner()">🎡 Snurra igen</button>';
  };
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced){ finish(); return; }
  const steps = 18 + Math.floor(Math.random()*6);
  let i = 0, ix = Math.floor(Math.random()*cands.length);
  const tick = () => {
    if(!document.getElementById("spinStage")) return; // overlay stängd
    showFrame(ix % cands.length);
    i++;
    if(i >= steps && ix % cands.length === winIx){ finish(); return; }
    if(i > steps + 3*cands.length){ finish(); return; }
    ix++;
    setTimeout(tick, 50 + Math.pow(i, 1.7) * 3);
  };
  tick();
}

/* ===== Flaskdetalj & formulär ===== */
function openBottleDetail(id){
  const b = bottle(id);
  if(!b) return;
  const slotKey = fridgeSlotOf(id);
  const notes = pastNotesFor(id);
  let html = ovTop(b.name);
  if(photos[id]) html += '<img class="detail-photo" src="'+photos[id]+'" alt="'+esc(b.name)+'">';
  html += '<dl class="kv">'+
    (b.distillery?'<dt>Destilleri</dt><dd>'+esc(b.distillery)+'</dd>':"")+
    (b.region?'<dt>Region</dt><dd>'+esc(b.region)+'</dd>':"")+
    (b.type?'<dt>Typ</dt><dd>'+esc(b.type)+'</dd>':"")+
    (b.abv?'<dt>Styrka</dt><dd>'+b.abv+' %</dd>':"")+
    (b.cask?'<dt>Fat</dt><dd>'+esc(b.cask)+'</dd>':"")+
    (b.price?'<dt>Pris</dt><dd>'+b.price+' kr</dd>':"")+
    (b.song&&(b.song.artist||b.song.title)?'<dt>Signaturlåt</dt><dd>🎵 <a href="'+spotify((b.song.artist||"")+" "+(b.song.title||""))+'" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:none;font-weight:600">'+esc(b.song.artist)+' – '+esc(b.song.title)+'</a></dd>':"")+
    '<dt>Status</dt><dd>'+({open:"Öppen",unopened:"Oöppnad",finished:"Urdrucken"}[b.status]||"Öppen")+'</dd>'+
    (slotKey?'<dt>I kylen</dt><dd>Hylla '+(+slotKey.split(":")[0]+1)+', plats '+(+slotKey.split(":")[1]+1)+'</dd>':"")+
    '</dl>';
  html += '<div class="sec-label">Så dricker du den</div><div class="advice">'+
    drinkAdvice(b).map(a => '<div class="a-row"><span class="a-ic">'+a.ic+'</span><span>'+esc(a.txt)+'</span></div>').join("")+'</div>';
  if(aiReady() && !b.aiTip) html += '<button class="btn ghost small" id="aiTipBtn" data-id="'+id+'">🎩 Be Mästaren om ett extra tips</button><div style="height:8px"></div>';
  if(slotKey) html += '<button class="btn ghost" onclick="showInFridge(\''+id+'\')">📍 Visa i kylen</button>';
  html += '<button class="btn ghost" onclick="openBottleForm(\''+id+'\')">✏️ Redigera flaskan</button>';
  if(notes.length){
    html += '<div class="sec-label">Dina anteckningar</div>'+
      notes.map(n => '<div class="note-hist"><div class="nh-t">'+esc(n.label)+' · '+esc(n.date||"")+'</div>'+
        '<div class="nh-l">Doft: '+esc(n.nose||"–")+' · Smak: '+esc(n.taste||"–")+'</div></div>').join("");
  }
  openOverlay(html);
  const tipBtn = $("aiTipBtn");
  if(tipBtn) tipBtn.addEventListener("click", async () => {
    tipBtn.disabled = true; tipBtn.textContent = "Mästaren funderar …";
    try{
      b.aiTip = (await enrichAdvice(b)).trim();
      save();
      openBottleDetail(id);
    }catch(e){ toast(e.message); tipBtn.disabled = false; tipBtn.textContent = "🎩 Be Mästaren om ett extra tips"; }
  });
}

let formDraft = null, pendingPhoto = null;
function openBottleForm(id, opts){
  opts = opts || {};
  const b = id ? bottle(id) : null;
  formDraft = b ? JSON.parse(JSON.stringify(b)) : {name:"", distillery:"", region:"", type:"", abv:"", cask:"", price:"", status:"unopened", flavour:{x:0.5, y:0.5}};
  if(!formDraft.flavour) formDraft.flavour = {x:0.5, y:0.5};
  if(!formDraft.song) formDraft.song = {artist:"", title:""};
  formDraft.id = id || null;
  pendingPhoto = null;

  const fields = [
    ["name","Namn *","t.ex. Lagavulin 16"],
    ["distillery","Destilleri",""],
    ["region","Region / land","t.ex. Islay, Skottland"],
    ["type","Typ","Single malt / Bourbon / Rom …"],
    ["abv","Alkoholhalt (%)","46"],
    ["cask","Fattyp","t.ex. oloroso-sherry"],
    ["price","Pris (kr)",""]
  ];
  let html = ovTop(id ? "Redigera flaska" : "Ny flaska");
  html += '<div class="glass-card">';
  html += '<img class="photo-preview" id="photoPreview" src="'+(photos[id]||"")+'" alt="" style="'+(photos[id]?"":"display:none")+'">';
  html += '<div class="seg-row" style="margin-bottom:14px">'+
    '<button class="seg-btn" id="photoBtn" type="button">📷 Fota flaskan'+(aiReady()?" (AI läser etiketten)":"")+'</button></div>'+
    '<input type="file" id="photoInput" accept="image/*" capture="environment" hidden>'+
    '<div class="hint" id="aiStatus" style="margin-bottom:12px;display:none"></div>';
  fields.forEach(([f, label, ph]) => {
    html += '<div class="field"><label>'+label+'</label><input type="'+((f==="abv"||f==="price")?"number":"text")+'" '+
      (f==="abv"?'step="0.1" ':"")+'data-bf="'+f+'" value="'+esc(formDraft[f]==null?"":formDraft[f])+'" placeholder="'+ph+'"></div>';
  });
  html += '<div class="field"><label>🎵 Signaturlåt – artist</label><input type="text" data-sf="artist" value="'+esc(formDraft.song.artist)+'" placeholder="t.ex. Tom Waits"></div>'+
    '<div class="field"><label>🎵 Signaturlåt – titel</label><input type="text" data-sf="title" value="'+esc(formDraft.song.title)+'" placeholder="t.ex. Closing Time"></div>';
  if(aiReady()) html += '<button class="btn ghost small" id="aiSongBtn" type="button" style="margin-bottom:14px">🎵 Låt Mästaren välja låt</button>';
  html += '<div class="field"><label>Status</label><div class="seg-row">'+
    [["unopened","Oöppnad"],["open","Öppen"],["finished","Urdrucken"]].map(([v,n]) =>
      '<button class="seg-btn'+(formDraft.status===v?" on":"")+'" data-st="'+v+'">'+n+'</button>').join("")+'</div></div>';
  html += '<div class="field"><label>Smakkartan: Ljus ↔ Fyllig ('+formDraft.flavour.x.toFixed(2)+')</label>'+
    '<input type="range" id="fx" min="0" max="1" step="0.05" value="'+formDraft.flavour.x+'"></div>'+
    '<div class="field"><label>Smakkartan: Mild ↔ Rökig ('+formDraft.flavour.y.toFixed(2)+')</label>'+
    '<input type="range" id="fy" min="0" max="1" step="0.05" value="'+formDraft.flavour.y+'"></div>';
  if(aiReady()) html += '<button class="btn ghost small" id="aiCoordBtn" type="button">✨ Låt AI föreslå plats på kartan</button>';
  html += '</div>';

  openOverlay(html, {saveLabel:"Spara flaskan", onSave:saveBottleForm});
  bindBottleForm();
  if(opts.camera) $("photoInput").click(); // öppnar kameran direkt på mobilen
}

function bindBottleForm(){
  const root = $("ovContent");
  root.querySelectorAll("input[data-bf]").forEach(inp => {
    inp.addEventListener("input", () => { formDraft[inp.dataset.bf] = inp.value; });
  });
  root.querySelectorAll("input[data-sf]").forEach(inp => {
    inp.addEventListener("input", () => { formDraft.song[inp.dataset.sf] = inp.value; });
  });
  const sb = $("aiSongBtn");
  if(sb) sb.addEventListener("click", async () => {
    sb.disabled = true; sb.textContent = "Mästaren lyssnar …";
    try{
      const res = await suggestMusic((formDraft.name||"en whisky")+" ("+(formDraft.type||"whisky")+", "+(formDraft.cask||"okänt fat")+") – välj EN signaturlåt som fångar just den här flaskans karaktär");
      const tr = res.tracks && res.tracks[0];
      if(tr){
        formDraft.song = {artist:tr.artist, title:tr.title};
        root.querySelector('input[data-sf="artist"]').value = tr.artist;
        root.querySelector('input[data-sf="title"]').value = tr.title;
        toast(res.why);
      }
    }catch(e){ toast(e.message); }
    sb.disabled = false; sb.textContent = "🎵 Låt Mästaren välja låt";
  });
  root.querySelectorAll(".seg-btn[data-st]").forEach(btn => btn.addEventListener("click", () => {
    formDraft.status = btn.dataset.st;
    root.querySelectorAll(".seg-btn[data-st]").forEach(x => x.classList.remove("on"));
    btn.classList.add("on");
  }));
  $("fx").addEventListener("input", e => { formDraft.flavour.x = +e.target.value; });
  $("fy").addEventListener("input", e => { formDraft.flavour.y = +e.target.value; });
  $("photoBtn").addEventListener("click", () => $("photoInput").click());
  $("photoInput").addEventListener("change", handlePhoto);
  const cb = $("aiCoordBtn");
  if(cb) cb.addEventListener("click", async () => {
    cb.disabled = true; cb.textContent = "AI funderar …";
    try{
      const res = await suggestCoords(formDraft);
      formDraft.flavour.x = Math.min(1, Math.max(0, res.x));
      formDraft.flavour.y = Math.min(1, Math.max(0, res.y));
      $("fx").value = formDraft.flavour.x;
      $("fy").value = formDraft.flavour.y;
      toast(res.motivering);
    }catch(e){ toast(e.message); }
    cb.disabled = false; cb.textContent = "✨ Låt AI föreslå plats på kartan";
  });
}

async function handlePhoto(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const status = $("aiStatus");
  try{
    pendingPhoto = await resizeImage(file, 512, 0.72);
    const prev = $("photoPreview");
    prev.src = pendingPhoto;
    prev.style.display = "block";
  }catch(err){ toast("Kunde inte läsa bilden."); return; }
  if(aiReady()){
    status.style.display = "block";
    status.textContent = "🔍 AI läser etiketten …";
    try{
      const big = await resizeImage(file, 1024, 0.8);
      const info = await extractLabel(big);
      ["name","distillery","region","type","abv","cask"].forEach(f => {
        if(info[f] != null && info[f] !== ""){
          formDraft[f] = info[f];
          const inp = document.querySelector('input[data-bf="'+f+'"]');
          if(inp) inp.value = info[f];
        }
      });
      status.textContent = "✓ Etiketten läst – kontrollera och rätta fälten innan du sparar.";
    }catch(err){ status.textContent = "AI kunde inte läsa etiketten ("+err.message+") – fyll i för hand."; }
  }
}

function resizeImage(file, maxDim, quality){
  return createImageBitmap(file).then(bmp => {
    const s = Math.min(1, maxDim/Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width*s));
    c.height = Math.max(1, Math.round(bmp.height*s));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  });
}

function saveBottleForm(){
  const d = formDraft;
  if(!String(d.name||"").trim()){ toast("Ge flaskan ett namn."); return; }
  let id = d.id;
  if(!id){
    id = slugId(d.name);
    d.color = NEW_BOTTLE_COLORS[visibleBottles().length % NEW_BOTTLE_COLORS.length];
    d.addedAt = today();
    d.source = pendingPhoto ? "photo" : "manual";
  }
  const prev = state.bottles[id] || {};
  state.bottles[id] = Object.assign({}, prev, {
    name: String(d.name).trim(),
    color: d.color || prev.color || NEW_BOTTLE_COLORS[0],
    distillery: d.distillery || "",
    region: d.region || "",
    type: d.type || "",
    abv: d.abv ? +d.abv : null,
    cask: d.cask || "",
    price: d.price ? +d.price : null,
    status: d.status || "open",
    song: (d.song && ((d.song.artist||"").trim() || (d.song.title||"").trim())) ? {artist:(d.song.artist||"").trim(), title:(d.song.title||"").trim()} : null,
    flavour: {x:d.flavour.x, y:d.flavour.y},
    addedAt: d.addedAt || prev.addedAt,
    source: d.source || prev.source || "manual"
  });
  if(pendingPhoto){ photos[id] = pendingPhoto; savePhotos(); }
  save();
  closeOverlay();
  if(ui.view !== "hyllan"){ ui.view = "hyllan"; ui.hylla = "flaskor"; document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === "hyllan")); }
  renderView();
  toast("Flaskan sparad!");
}

/* ===== Vy-bindningar ===== */
function bindView(){
  const aiToneBtn = $("aiToneBtn");
  if(aiToneBtn) aiToneBtn.addEventListener("click", async () => {
    aiToneBtn.disabled = true; aiToneBtn.textContent = "Mästaren lyssnar inåt …";
    try{
      const next = nextTasting();
      const ids = next ? next.bottles : dueRetastes().map(([id])=>id).slice(0,1);
      const desc = ids.map(id => { const b = bottle(id); return b ? b.name+" ("+(b.type||"whisky")+", "+(b.cask||"")+")" : ""; }).filter(Boolean).join(" + ");
      aiTone = {sig:aiToneBtn.dataset.sig, data:await suggestMusic(desc)};
      renderView();
    }catch(e){ toast(e.message); aiToneBtn.disabled = false; aiToneBtn.textContent = "🎲 Nytt förslag från Mästaren"; }
  });

  const send = $("chatSend");
  if(send){
    send.addEventListener("click", sendChat);
    $("chatField").addEventListener("keydown", e => {
      if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); sendChat(); }
    });
  }
  const sug = $("suggestBtn");
  if(sug) sug.addEventListener("click", suggestTastingFlow);

  const saveKey = $("saveKeyBtn");
  if(saveKey){
    saveKey.addEventListener("click", () => {
      state.settings.apiKey = $("setKey").value.trim();
      save(); toast(state.settings.apiKey ? "Nyckel sparad!" : "Nyckel borttagen.");
      renderView();
    });
    $("testKeyBtn").addEventListener("click", async () => {
      state.settings.apiKey = $("setKey").value.trim();
      save();
      const btn = $("testKeyBtn");
      btn.disabled = true; btn.textContent = "Testar …";
      try{ await testApiKey(); toast("✓ Nyckeln fungerar!"); }
      catch(e){ toast(e.message); }
      btn.disabled = false; btn.textContent = "Testa nyckeln";
    });
    $("saveFridgeBtn").addEventListener("click", () => {
      const rows = Math.max(1, Math.min(10, +$("setRows").value || 3));
      const cols = Math.max(1, Math.min(8, +$("setCols").value || 4));
      state.fridge.rows = rows; state.fridge.cols = cols;
      Object.keys(state.fridge.slots).forEach(k => {
        const [r, c] = k.split(":").map(Number);
        if(r >= rows || c >= cols) delete state.fridge.slots[k];
      });
      save(); toast("Kylen uppdaterad!");
    });
    $("exportBtn").addEventListener("click", exportData);
    $("importBtn").addEventListener("click", () => $("importFile").click());
    $("importFile").addEventListener("change", e => { if(e.target.files[0]) importData(e.target.files[0]); e.target.value=""; });
    $("resetBtn").addEventListener("click", resetAll);
  }
}

/* ===== Init ===== */
$("saveBtn").addEventListener("click", () => { if(ovSave) ovSave(); });
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchView(t.dataset.v)));
renderView();
handleHash(); // gäst- eller svarslänk?
