/* Röktest av Smakresan i jsdom.
   OBS: i webbläsaren delar separata <script>-taggar globalt let-scope;
   i jsdom-eval måste filerna konkateneras för samma effekt. */
const {JSDOM} = require("jsdom");
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..");

const appCode = ["data.js","ai.js","app.js"].map(f => fs.readFileSync(DIR+"/"+f,"utf8")).join("\n;\n") + `
;window.__t = {
  get state(){return state}, set state(v){state=v},
  save, renderView, switchView, setHylla, slotClick, fillSlot,
  openTasting, openRetaste, openBottleForm, openBottleDetail,
  openBlind, blindStep2, blindPick, blindStep3, goToFridge,
  get blindGuess(){return blindGuess},
  get formDraft(){return formDraft},
  set pendingSuggestion(v){pendingSuggestion=v},
  addSuggestedTasting, drinkAdvice, allTastings, closeOverlay,
  encodeShare, decodeShare, openGuestInvite, openGuestView, openGuestAnswer, openSpinner,
  journalContext,
  get BOTTLE_SEED(){return BOTTLE_SEED}, get PHASES(){return PHASES}, get TASTINGS(){return TASTINGS},
  get QUADRANTS(){return QUADRANTS}, get TONE_MAP(){return TONE_MAP}, get FLAVOR_WHEEL(){return FLAVOR_WHEEL},
  get NEW_BOTTLE_COLORS(){return NEW_BOTTLE_COLORS}, get NEW_PHASE_COLORS(){return NEW_PHASE_COLORS},
  get STOPWORDS(){return STOPWORDS}, get RETASTE_INTERVALS(){return RETASTE_INTERVALS}
};`;

const html = fs.readFileSync(DIR+"/index.html","utf8")
  .replace(/<script src=[^>]+><\/script>/g,"")
  .replace(/<link[^>]*>/g,"");

let failures = [];
function check(name, cond){
  console.log((cond?"  ✓ ":"  ✗ ")+name);
  if(!cond) failures.push(name);
}

function boot(preload, url){
  const dom = new JSDOM(html, {url:url||"http://localhost/", runScripts:"outside-only", pretendToBeVisual:true});
  const w = dom.window;
  w.scrollTo = () => {};
  w.confirm = () => true;
  w.alert = m => console.log("  [alert] "+m);
  w.matchMedia = () => ({matches:true}); // reduced motion → snurran hoppar till resultat
  if(preload) Object.entries(preload).forEach(([k,v]) => w.localStorage.setItem(k,v));
  const jsErrors = [];
  try{ w.eval(appCode); }catch(e){ jsErrors.push(e.message+"\n"+e.stack.split("\n").slice(0,3).join("\n")); }
  return {w, d:w.document, t:w.__t, jsErrors};
}
function click(w, el){ el.dispatchEvent(new w.MouseEvent("click",{bubbles:true})); }
function type(w, el, val){ el.value = val; el.dispatchEvent(new w.Event("input",{bubbles:true})); }

/* ==== Start: migrering från v1 ==== */
console.log("== Migrering & Ikväll ==");
const v1 = JSON.stringify({sessions:{1:{glasses:[
  {bottle:"ben",idx:0,nose:"honung äpple",taste:"vanilj",finish:"Medel",rating:7},
  {bottle:"bal",idx:1,nose:"russin",taste:"sherry ek",finish:"Lång",rating:8}],
  lesson:"Sherryfinish ger mer sötma", date:"2026-07-01"}}});
let {w, d, t, jsErrors} = boot({smakresa_v1:v1});
check("appen bootar utan JS-fel", jsErrors.length===0);
if(jsErrors.length){ console.log(jsErrors.join("\n")); }
check("v1-nyckeln kvar (backup)", !!w.localStorage.getItem("smakresa_v1"));
check("v2-state skapat", !!w.localStorage.getItem("smakresa_v2"));
check("session 1 migrerad", !!t.state.sessions[1]);
check("13 flaskor seedade", Object.keys(t.state.bottles).length===13);
check("progress 1 / 14", d.querySelector(".progress .row b").textContent.trim()==="1 / 14");
check("nästa provning nr 2", d.querySelector(".t-q").textContent.includes("Irland"));
check("Kvällens ton renderas", !!d.querySelector(".tone"));
check("kyl-tips syns när kylen är tom", d.body.textContent.includes("vinkylskartan"));
t.goToFridge();
check("goToFridge hoppar till kylen", d.querySelectorAll(".slot").length===12);
t.switchView("ikvall");

/* ==== Provningsflödet ==== */
console.log("== Provningsflöde ==");
click(w, d.querySelector(".tonight .btn") || {dispatchEvent:()=>{}});
// tonight-knappen har inline onclick — jsdom kör den via runScripts outside-only? Nej. Kör direkt:
t.openTasting(2);
check("overlay öppnas", d.getElementById("overlay").classList.contains("open"));
type(w, d.querySelector('input[data-i="0"][data-f="nose"]'), "krämig grädde");
click(w, d.querySelector('.chip-t[data-w="vanilj"]'));
click(w, d.querySelector('.star[data-i="0"][data-r="6"]'));
click(w, d.querySelector('.seg-btn[data-i="0"][data-v="Lång"]'));
type(w, d.getElementById("lessonField"), "Pot still är krämigare än bourbon");
type(w, d.getElementById("musicField"), "Otis Redding");
click(w, d.getElementById("saveBtn"));
check("provning 2 sparad", !!t.state.sessions[2]);
check("smakhjul-chip sparad", t.state.sessions[2].glasses[0].flavors.includes("vanilj"));
check("betyg sparat", t.state.sessions[2].glasses[0].rating===6);
check("eftersmak sparad", t.state.sessions[2].glasses[0].finish==="Lång");
check("musik sparad", t.state.sessions[2].music==="Otis Redding");
check("omprovning schemalagd (red)", !!t.state.retastes["red"]);
check("progress 2 / 14", d.querySelector(".progress .row b").textContent.trim()==="2 / 14");

/* ==== Omprovning ==== */
console.log("== Omprovning ==");
t.state.retastes["red"].due = "2020-01-01"; t.save(); t.renderView();
check("omprovningskort syns", d.body.textContent.includes("Dags att prova igen"));
t.openRetaste("red");
type(w, d.getElementById("rtNose"), "krämig honung");
click(w, d.getElementById("saveBtn")); // Visa facit
check("facit visar matchning (krämig)", d.getElementById("ovContent").textContent.includes("krämig"));
click(w, d.getElementById("saveBtn")); // Spara
const rt = t.state.retastes["red"];
check("entry sparad + nytt due-datum", rt.entries.length===1 && rt.due > "2026-01-01");

/* ==== Hyllan ==== */
console.log("== Hyllan ==");
t.switchView("hyllan"); t.setHylla("flaskor");
check("flasklistan visar 12 rader", d.querySelectorAll(".bottle-row").length===12);
check("fotoknapp syns i flasklistan", d.body.textContent.includes("📷 Fota ny flaska"));
check("växeln har kyl-ikon", d.body.textContent.includes("❄️ Kylen"));
t.setHylla("kylen");
check("kylen har 12 platser (3×4)", d.querySelectorAll(".slot").length===12);
t.fillSlot("0:0","tal");
check("Talisker placerad", d.querySelector(".slot.filled").textContent.includes("Talisker"));
t.switchView("ikvall");
check("kyl-tipset borta när kylen har innehåll", !d.body.textContent.includes("vinkylskartan"));
t.switchView("hyllan"); t.setHylla("kylen");
t.setHylla("smakkartan");
check("smakkartan har 12 prickar", d.querySelectorAll(".fmap-dot").length===12);
check("luckanalys renderas", !!d.querySelector(".fmap-gap"));

/* ==== Ny flaska ==== */
console.log("== Ny flaska ==");
t.openBottleForm(null);
type(w, d.querySelector('input[data-bf="name"]'), "Lagavulin 16");
type(w, d.querySelector('input[data-bf="abv"]'), "43");
t.formDraft.flavour.x = 0.7; t.formDraft.flavour.y = 0.95;
click(w, d.getElementById("saveBtn"));
const nb = Object.entries(t.state.bottles).find(([id,b]) => b.name==="Lagavulin 16");
check("Lagavulin 16 tillagd", !!nb);
check("abv sparat som tal (43)", nb && nb[1].abv===43);
check("status default", nb && nb[1].status==="unopened");
t.setHylla("flaskor");
check("nu 13 synliga flaskor", d.querySelectorAll(".bottle-row").length===13);
const adviceAbu = t.drinkAdvice(t.state.bottles["abu"]).map(a=>a.txt).join(" ");
check("a'Bunadh får pipett-råd", adviceAbu.includes("pipett"));
check("Laphroaig får 'sist ikväll'-råd", t.drinkAdvice(t.state.bottles["lap"]).map(a=>a.txt).join(" ").includes("sist"));

t.openBottleDetail("abu");
const det = d.getElementById("ovContent").textContent;
check("detalj visar destilleri + glasråd", det.includes("Aberlour") && det.includes("Glencairn"));
t.closeOverlay();

/* ==== Blindläge ==== */
console.log("== Blindläge ==");
t.openBlind(); t.blindStep2(); t.blindPick("lap"); t.blindStep3();
click(w, d.querySelector('.seg-btn[data-q="smoky"][data-v="ja"]'));
click(w, d.querySelector('.seg-btn[data-q="sherry"][data-v="nej"]'));
type(w, d.getElementById("blNose"), "tjära rök");
t.blindGuess.bottleId = "lap";
click(w, d.getElementById("saveBtn")); // Avslöja
const rev = d.getElementById("ovContent").textContent;
check("avslöjar Laphroaig", rev.includes("Laphroaig"));
check("3 av 3 rätt", rev.includes("3 av 3"));
check("blind-entry sparad", t.state.retastes["lap"].entries.filter(e=>e.blind).length===1);
click(w, d.getElementById("saveBtn")); // Klart

/* ==== Resan ==== */
console.log("== Resan ==");
t.switchView("resan");
check("lärdomar visas", d.body.textContent.includes("Sherryfinish ger mer sötma"));
check("smakprofil har staplar", d.querySelectorAll(".prof-row").length>=3);
check("trail visar 14 stopp", d.querySelectorAll(".stop").length===14);

/* ==== Mästaren & inställningar ==== */
console.log("== Mästaren & inställningar ==");
t.switchView("mastaren");
check("inget chatField utan nyckel", !d.getElementById("chatField"));
check("goToKeyBtn syns i stället", !!d.getElementById("goToKeyBtn"));
click(w, d.getElementById("goToKeyBtn"));
check("klick öppnar inställningarna", d.getElementById("settingsDetails").open === true);
type(w, d.getElementById("setKey"), "sk-ant-test123");
click(w, d.getElementById("saveKeyBtn"));
check("nyckel i state", t.state.settings.apiKey==="sk-ant-test123");
t.switchView("mastaren");
check("chatField skrivbart med nyckel", !!d.getElementById("chatField") && !d.getElementById("chatField").disabled);
check("goToKeyBtn borta med nyckel", !d.getElementById("goToKeyBtn"));
t.pendingSuggestion = {q:"Testfråga?", why:"Testmotivering.", phaseName:"Fas 5 · Nya hyllan", bottles:["tal","hp"]};
t.addSuggestedTasting();
check("AI-provning fick n=15", t.state.tastings[0].n===15);
check("Fas 5 skapad", t.state.phases[0].name==="Fas 5 · Nya hyllan");
check("resan är nu 15 provningar", t.allTastings().length===15);
t.switchView("ikvall");
check("progress 2 / 15", d.querySelector(".progress .row b").textContent.trim()==="2 / 15");

t.switchView("mastaren");
d.getElementById("setRows").value = 2; d.getElementById("setCols").value = 2;
click(w, d.getElementById("saveFridgeBtn"));
check("kylen 2×2, Talisker (0:0) kvar", t.state.fridge.rows===2 && t.state.fridge.cols===2 && t.state.fridge.slots["0:0"]==="tal");

/* ==== Signaturlåt ==== */
console.log("== Signaturlåt ==");
t.openBottleDetail("tal");
const talDet = d.getElementById("ovContent").innerHTML;
check("detaljvyn visar Taliskers signaturlåt", talDet.includes("Fisherman") && talDet.includes("open.spotify.com"));
t.closeOverlay();
t.openBottleForm("tal");
check("formuläret har signaturlåtsfält", !!d.querySelector('input[data-sf="artist"]'));
type(w, d.querySelector('input[data-sf="title"]'), "Whisky Trench Blues");
click(w, d.getElementById("saveBtn"));
check("ändrad låttitel sparad", t.state.bottles["tal"].song.title === "Whisky Trench Blues");
t.switchView("ikvall");
// nästa provning är nr 3 (bal/red/eli) – signaturlåtar ska listas i tonkortet
const tonHtml = d.body.innerHTML;
check("Kvällens ton listar kvällens signaturlåtar", tonHtml.includes("Whiskey in the Jar") && tonHtml.includes("Tennessee Whiskey"));
check("gäst-knappen finns på Ikväll-kortet", d.body.textContent.includes("Bjud in en gäst"));

/* ==== Fredagssnurran ==== */
console.log("== Fredagssnurran ==");
check("snurr-knappen finns", d.body.textContent.includes("Fredagssnurran"));
t.openSpinner();
const spinTxt = d.getElementById("ovContent").textContent;
check("snurran ger direkt resultat (reduced motion)", spinTxt.includes("Snurra igen") && !!d.querySelector(".spin-win"));
const winName = d.querySelector(".spin-name").textContent;
check("vinnaren är en riktig flaska (ej urdrucken)", Object.values(t.state.bottles).some(b => !b.hidden && b.status !== "finished" && b.name === winName));
t.closeOverlay();

/* ==== Gästprovning ==== */
console.log("== Gästprovning ==");
t.openGuestInvite(3);
click(w, d.getElementById("makeInviteBtn"));
const inviteLink = d.getElementById("shareLink").value;
check("gästlänk skapad med #gast=", inviteLink.includes("#gast="));
t.closeOverlay();

// Gästen öppnar länken i en egen "webbläsare" (ny jsdom, tomt localStorage)
const guestHash = "#gast=" + inviteLink.split("#gast=")[1];
const guest = boot(null, "http://localhost/" + guestHash);
check("gästen bootar utan fel", guest.jsErrors.length === 0);
if(guest.jsErrors.length) console.log(guest.jsErrors.join("\n"));
check("gästvyn öppnas från länken", guest.d.getElementById("ovContent").textContent.includes("Du är bjuden på provning"));
check("hashen rensad efter hantering", guest.w.location.hash === "");
type(guest.w, guest.d.getElementById("gName"), "Maria");
type(guest.w, guest.d.querySelector('input[data-gi="0"][data-gf="nose"]'), "sherry russin");
click(guest.w, guest.d.querySelector('.star[data-gi="0"][data-r="9"]'));
click(guest.w, guest.d.getElementById("saveBtn")); // Skapa svarslänk
const answerLink = guest.d.getElementById("shareLink").value;
check("svarslänk skapad med #svar=", answerLink.includes("#svar="));

// Värden öppnar svarslänken
const ans = t.decodeShare(answerLink.split("#svar=")[1]);
check("svaret avkodas (Maria, betyg 9)", ans.name === "Maria" && ans.glasses[0].rating === 9 && ans.glasses[0].nose === "sherry russin");
t.openGuestAnswer(ans);
const cmpTxt = d.getElementById("ovContent").textContent;
check("jämförelsen visar båda kolumnerna", cmpTxt.includes("Maria") && cmpTxt.includes("Du"));
click(w, d.getElementById("saveBtn")); // Spara gästprovningen
check("gästprovning sparad i state", t.state.guests.length === 1 && t.state.guests[0].name === "Maria");
t.switchView("resan");
check("Gästprovningar listas på Resan", d.body.textContent.includes("Gästprovningar") && d.body.textContent.includes("Maria"));

/* ==== Chatthistorik: hopfällning + rensning ==== */
console.log("== Chatthistorik ==");
t.switchView("mastaren");
for(let i=1;i<=5;i++){
  t.state.chat.push({role:"user", text:"Fråga "+i});
  t.state.chat.push({role:"ai", text:"Svar "+i});
}
t.save(); t.renderView();
check("bara 6 meddelanden visas hopfällt", d.querySelectorAll(".chat-log .msg").length===6);
check("historik-knappen visar antal dolda (4)", d.getElementById("chatMoreBtn").textContent.includes("(4)"));
click(w, d.getElementById("chatMoreBtn"));
check("expanderad visar alla 10", d.querySelectorAll(".chat-log .msg").length===10);
check("knappen blev 'Dölj tidigare'", d.getElementById("chatMoreBtn").textContent.includes("Dölj"));
click(w, d.getElementById("clearChatBtn"));
check("rensa tömmer chatten", t.state.chat.length===0);
check("hälsningsbubblan är tillbaka", d.querySelector(".chat-log .msg.ai").textContent.includes("Godkväll"));

/* ==== AI-lagrets beroenden (fångar saknade funktioner à la journalContext-buggen) ==== */
console.log("== AI-beroenden ==");
const aiSrc = fs.readFileSync(DIR+"/ai.js","utf8")
  .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,'""')   // strängar först (URL:er ser ut som //-kommentarer)
  .replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/.*$/gm,"");
const AI_BUILTINS = new Set(["if","for","while","switch","catch","function","return","throw",
  "fetch","Error","JSON","btoa","atob","encodeURIComponent","decodeURIComponent",
  "escape","unescape","String","Number","Math","Object","Array","Promise","parseInt","RegExp"]);
const aiCalled = [...aiSrc.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1])
  .filter((v,i,a) => a.indexOf(v)===i && !AI_BUILTINS.has(v));
const aiMissing = aiCalled.filter(fn => typeof w[fn] !== "function");
check("alla "+aiCalled.length+" funktioner som ai.js anropar är definierade", aiMissing.length===0);
if(aiMissing.length) console.log("    SAKNAS: "+aiMissing.join(", "));
const jc = t.journalContext();
check("journalContext innehåller hyllan", jc.includes("Talisker 10") && jc.includes("ANVÄNDARENS HYLLA"));
check("journalContext innehåller dagboken", jc.includes("Provning 2") && jc.includes("Pot still är krämigare"));
check("journalContext innehåller omprovningar", jc.includes("Omprovning") && jc.includes("krämig honung"));

/* ==== Persistens: "omladdning" med ny jsdom ==== */
console.log("== Persistens (omladdning) ==");
const saved = {};
for(let i=0;i<w.localStorage.length;i++){ const k=w.localStorage.key(i); saved[k]=w.localStorage.getItem(k); }
// Simulera gammal data utan signaturlåt på hp (som Pers riktiga mobil-state)
const oldState = JSON.parse(saved["smakresa_v2"]);
delete oldState.bottles.hp.song;
saved["smakresa_v2"] = JSON.stringify(oldState);
const second = boot(saved);
check("bootar igen utan fel", second.jsErrors.length===0);
if(second.jsErrors.length) console.log(second.jsErrors.join("\n"));
check("sessioner kvar (2 st)", Object.keys(second.t.state.sessions).length===2);
check("Lagavulin kvar", Object.values(second.t.state.bottles).some(b=>b.name==="Lagavulin 16"));
check("AI-provning kvar", second.t.state.tastings.length===1);
check("API-nyckel kvar", second.t.state.settings.apiKey==="sk-ant-test123");
check("progress 2 / 15 efter omladdning", second.d.querySelector(".progress .row b").textContent.trim()==="2 / 15");
check("gästprovning kvar efter omladdning", second.t.state.guests.length === 1);
check("saknad signaturlåt fylls på från seed (hp)", second.t.state.bottles.hp.song && second.t.state.bottles.hp.song.title === "Blue in Green");
check("egen ändrad låt rörs inte (tal)", second.t.state.bottles.tal.song.title === "Whisky Trench Blues");
check("påfyllnaden sparas till localStorage", JSON.parse(second.w.localStorage.getItem("smakresa_v2")).bottles.hp.song.title === "Blue in Green");

/* ==== Data-integritet (seed-data) ==== */
console.log("== Data-integritet (seed-data) ==");
check("BOTTLE_SEED har 13 flaskor", Object.keys(t.BOTTLE_SEED).length===13);
const seedIds = Object.keys(t.BOTTLE_SEED);
check("alla TASTINGS-flaskor finns i BOTTLE_SEED", t.TASTINGS.every(ts => ts.bottles.every(id => seedIds.includes(id))));
check("alla TASTINGS-faser finns i PHASES", t.TASTINGS.every(ts => t.PHASES.some(p=>p.id===ts.phase)));
check("14 provningar i TASTINGS", t.TASTINGS.length===14);
check("TASTINGS-nr är unika och löper 1-14", JSON.stringify(t.TASTINGS.map(x=>x.n))===JSON.stringify(Array.from({length:14},(_,i)=>i+1)));
check("4 faser i PHASES", t.PHASES.length===4);
check("alla synliga BOTTLE_SEED-flaskor har flavour+song", Object.values(t.BOTTLE_SEED).filter(b=>!b.hidden).every(b=>b.flavour && b.song && b.song.artist && b.song.title));
check("hemliga glaset 'x' saknar flavour/song (medvetet)", t.BOTTLE_SEED.x.hidden===true && !t.BOTTLE_SEED.x.flavour && !t.BOTTLE_SEED.x.song);
check("QUADRANTS täcker alla fyra hörn utan överlapp", (() => {
  const pts=[[0.25,0.25],[0.75,0.25],[0.25,0.75],[0.75,0.75]];
  const hits = pts.map(([x,y]) => Object.keys(t.QUADRANTS).filter(k=>t.QUADRANTS[k].test(x,y)).length);
  return hits.every(h=>h===1);
})());
check("TONE_MAP har alla fyra kvadranter + rom", ["ljusmild","fylligrund","ljusrokig","rikrokig","rom"].every(k=>!!t.TONE_MAP[k]));
check("varje TONE_MAP-post har minst två spår", Object.values(t.TONE_MAP).every(tn=>tn.tracks.length>=2));
check("FLAVOR_WHEEL har 8 kategorier", Object.keys(t.FLAVOR_WHEEL).length===8);
check("NEW_BOTTLE_COLORS har färger till nya flaskor", t.NEW_BOTTLE_COLORS.length>=4);
check("NEW_PHASE_COLORS har färger till nya faser", t.NEW_PHASE_COLORS.length>=4);
check("RETASTE_INTERVALS är 14/42/90 dagar", JSON.stringify(t.RETASTE_INTERVALS)===JSON.stringify([14,42,90]));

/* ==== drinkAdvice(): ABV-gränser & råd ==== */
console.log("== drinkAdvice: ABV-gränser & råd ==");
const advTxt = b => t.drinkAdvice(b).map(a=>a.txt).join(" | ");
check("ingen ABV → uppmaning att fylla i", advTxt({name:"Test",abv:null}).includes("Fyll i alkoholhalten"));
check("abv 55 exakt → fatstyrka-råd (pipett)", advTxt({name:"Test 10",abv:55}).includes("pipett"));
check("abv 54.9 → 'Hög styrka'-råd", advTxt({name:"Test 10",abv:54.9}).includes("Hög styrka"));
check("abv 50 exakt → 'Hög styrka'-råd", advTxt({name:"Test 10",abv:50}).includes("Hög styrka"));
check("abv 49.9 → 'prova först utan vatten'-råd", advTxt({name:"Test 10",abv:49.9}).includes("prova först utan vatten"));
check("abv 46 exakt → samma mellanband", advTxt({name:"Test 10",abv:46}).includes("prova först utan vatten"));
check("abv 45.9 → 'redan spädd till flaskstyrka'", advTxt({name:"Test 10",abv:45.9}).includes("redan spädd"));
check("vilotid klamras till max 20 min (ålder 46 i namnet)", advTxt({name:"Fatstyrka 46",abv:46}).includes("~20 min"));
check("vilotid klamras till min 5 min (ålder 1 i namnet)", advTxt({name:"Test 1",abv:40}).includes("~5 min"));
check("ingen ålder i namnet → default 10 min vila", advTxt({name:"Namnlös",abv:40}).includes("~10 min"));
check("rökig (y=0.45 exakt) får 'ta den sist ikväll'-råd", advTxt({name:"Test",abv:40,flavour:{x:0.5,y:0.45}}).includes("ta den sist"));
check("y=0.44 får INTE rök-rådet", !advTxt({name:"Test",abv:40,flavour:{x:0.5,y:0.44}}).includes("ta den sist"));
check("cachead aiTip visas som extra rad", advTxt({name:"Test",abv:40,aiTip:"Testtips xyz"}).includes("Testtips xyz"));

/* ==== Smakkartan: quadrantOf & toneFor ==== */
console.log("== Smakkartan: quadrantOf & toneFor ==");
check("x<0.5,y<0.5 → ljusmild", w.quadrantOf(0.2,0.2)==="ljusmild");
check("x=0.5,y<0.5 → fylligrund (gränsen tillhör fyllig)", w.quadrantOf(0.5,0.2)==="fylligrund");
check("x<0.5,y=0.5 → ljusrokig (gränsen tillhör rökig)", w.quadrantOf(0.2,0.5)==="ljusrokig");
check("x=0.5,y=0.5 → rikrokig", w.quadrantOf(0.5,0.5)==="rikrokig");
check("toneFor(['lap']) ger ljusrokig ton (Laphroaig x0.45,y0.90)", w.toneFor(["lap"]).key==="ljusrokig");
check("toneFor(['dip']) upptäcker rom via type-regex", w.toneFor(["dip"]).key==="rom");
check("toneFor(['app']) upptäcker rom (Appleton)", w.toneFor(["app"]).key==="rom");
check("toneFor(blandning rom+whisky) prioriterar rom om någon är rom", w.toneFor(["dip","tal"]).key==="rom");
check("toneFor(tom lista) faller tillbaka på ljusmild", w.toneFor([]).key==="ljusmild");
check("toneFor(['x']) (dold flaska utan flavour) faller tillbaka på ljusmild", w.toneFor(["x"]).key==="ljusmild");
check("toneFor snittar flera flaskors koordinater (uig+ben → rikrokig)", w.toneFor(["uig","ben"]).key==="rikrokig");

/* ==== esc(): XSS-skydd ==== */
console.log("== esc(): XSS-skydd ==");
check("esc() omvandlar &", w.esc("A&B")==="A&amp;B");
check("esc() omvandlar <script>", w.esc("<script>alert(1)</script>")==="&lt;script&gt;alert(1)&lt;/script&gt;");
check("esc() omvandlar citattecken", w.esc(`"'`)==="&quot;&#39;");
check("esc() hanterar null/undefined utan krasch", w.esc(null)==="" && w.esc(undefined)==="");
const xss = boot();
xss.t.openBottleForm(null);
type(xss.w, xss.d.querySelector('input[data-bf="name"]'), '<img src=x onerror=alert(1)>');
click(xss.w, xss.d.getElementById("saveBtn"));
xss.t.setHylla("flaskor");
const xssHtml = xss.d.body.innerHTML;
check("XSS-payload i flasknamn escapeas i flasklistan", xssHtml.includes("&lt;img src=x onerror=alert(1)&gt;") && !/<img src=x onerror/.test(xssHtml));
xss.t.state.chat.push({role:"user", text:"<b>hej</b>"});
xss.w.save(); xss.t.switchView("mastaren");
check("XSS i chattmeddelande escapeas", xss.d.querySelector(".chat-log").innerHTML.includes("&lt;b&gt;hej&lt;/b&gt;"));
check("XSS i gästnamn (#svar=) escapeas vid jämförelse", (() => {
  const payload = {v:1,n:1,name:"<i>Onda</i>",glasses:[{label:"Glas 1",name:null,nose:"x",taste:"y",rating:5}]};
  xss.t.openGuestAnswer(payload, true);
  return xss.d.getElementById("ovContent").innerHTML.includes("&lt;i&gt;Onda&lt;/i&gt;");
})());

/* ==== slugId(): unikt flask-id ==== */
console.log("== slugId(): unikt flask-id ==");
const sl = boot();
check("slugId: 'Lagavulin 16' → 'laga'", sl.w.slugId("Lagavulin 16")==="laga");
check("slugId: kollision ger suffix (laga → laga2)", (() => {
  sl.t.state.bottles["laga"] = {name:"Dummy"};
  return sl.w.slugId("Lagavulin 16")==="laga2";
})());
check("slugId: dubbel kollision ger laga3", (() => {
  sl.t.state.bottles["laga2"] = {name:"Dummy2"};
  return sl.w.slugId("Lagavulin 16")==="laga3";
})());
check("slugId: tomt/symbolnamn faller tillbaka på 'fl'", sl.w.slugId("!!!")==="fl");
check("slugId: å ä ö bevaras", sl.w.slugId("Åre Öl").startsWith("åre"));

/* ==== tok(): ordfrekvens-tokenizer ==== */
console.log("== tok(): ordfrekvens-tokenizer ==");
check("tok filtrerar stoppord", !w.tok("det var en aning söt").includes("det"));
check("tok filtrerar ord ≤2 tecken", w.tok("en å i på").length===0);
check("tok gemener alla ord", w.tok("VANILJ Honung")[0]==="vanilj");
check("tok splittar på skiljetecken", w.tok("honung, äpple.").includes("honung") && w.tok("honung, äpple.").includes("äpple"));
check("tok behåller riktiga smakord", w.tok("krämig vaniljdoft").includes("krämig") && w.tok("krämig vaniljdoft").includes("vaniljdoft"));
check("STOPWORDS innehåller 'och' och 'inte'", t.STOPWORDS.has("och") && t.STOPWORDS.has("inte"));

/* ==== Export / Import / Nollställ ==== */
console.log("== Export / Import / Nollställ ==");
const ex = boot();
if(!ex.w.URL.createObjectURL) ex.w.URL.createObjectURL = () => "blob:mock-url";
if(!ex.w.URL.revokeObjectURL) ex.w.URL.revokeObjectURL = () => {};
ex.t.state.settings.apiKey = "sk-ant-hemlig-nyckel";
ex.w.save();
let blobContent = null;
const OrigBlob = ex.w.Blob;
ex.w.Blob = function(parts, opts){ blobContent = parts[0]; return new OrigBlob(parts, opts); };
ex.w.exportData();
const exported = JSON.parse(blobContent);
check("export strippar API-nyckeln", exported.state.settings.apiKey === "");
check("den riktiga state-nyckeln påverkas inte av exporten", ex.t.state.settings.apiKey === "sk-ant-hemlig-nyckel");
check("exportData sätter lastExport till idag", ex.t.state.lastExport === ex.w.today());
check("export innehåller inga foton när inga finns", JSON.stringify(exported.photos) === "{}");
check("exportens version stämmer med appens (2)", exported.state.version === 2);
check("exporterad data innehåller alla 13 flaskor", Object.keys(exported.state.bottles).length === 13);

console.log("== Import: återställ säkerhetskopia ==");
const fresh = boot();
fresh.t.state.settings.apiKey = "sk-existing-key";
fresh.w.save();
fresh.w.FileReader = function(){
  return { readAsText(file){ this.result = file.__text; if(this.onload) this.onload(); } };
};
const importState = JSON.parse(JSON.stringify(exported.state));
importState.settings.apiKey = "";
importState.bottles.tal.name = "Talisker (från backup)";
const importJson = JSON.stringify({app:"smakresan", exportedAt:"2026-01-01T00:00:00.000Z", state: importState, photos:{}});
fresh.w.importData({__text: importJson});
check("import ersätter flaskdata (Taliskers namn ändrat)", fresh.t.state.bottles.tal.name === "Talisker (från backup)");
check("import med tom nyckel i backupen behåller befintlig nyckel", fresh.t.state.settings.apiKey === "sk-existing-key");
check("import med fel version rör inte nuvarande data", (() => {
  const before = JSON.stringify(fresh.t.state);
  fresh.w.importData({__text: JSON.stringify({state:{version:1}})});
  return JSON.stringify(fresh.t.state) === before;
})());
check("import med trasig JSON kraschar inte appen", (() => {
  try{ fresh.w.importData({__text: "{inte json"}); return true; }catch(e){ return false; }
})());

console.log("== Nollställ (resetAll) ==");
fresh.t.state.settings.apiKey = "sk-behåll-mig";
fresh.w.save();
fresh.w.resetAll();
check("resetAll nollställer flaskor till seed-läge", Object.keys(fresh.t.state.bottles).length===13 && fresh.t.state.bottles.tal.name==="Talisker 10");
check("resetAll behåller API-nyckeln", fresh.t.state.settings.apiKey === "sk-behåll-mig");
check("resetAll tömmer sessions/tastings/guests", Object.keys(fresh.t.state.sessions).length===0 && fresh.t.state.tastings.length===0 && fresh.t.state.guests.length===0);

/* ==== Kylen: storleksändring & orphan-platser ==== */
console.log("== Kylen: storleksändring & orphan-platser ==");
const fr = boot();
fr.t.switchView("hyllan"); fr.t.setHylla("kylen");
fr.t.fillSlot("2:3","hp");
fr.t.fillSlot("0:0","tal");
fr.t.switchView("mastaren");
fr.d.getElementById("setRows").value = 2; fr.d.getElementById("setCols").value = 2;
click(fr.w, fr.d.getElementById("saveFridgeBtn"));
check("kylen krymps till 2×2", fr.t.state.fridge.rows===2 && fr.t.state.fridge.cols===2);
check("plats utanför nya måtten (2:3) tas bort", !fr.t.state.fridge.slots["2:3"]);
check("plats inom nya måtten (0:0) behålls", fr.t.state.fridge.slots["0:0"]==="tal");
fr.t.switchView("hyllan"); fr.t.setHylla("kylen");
check("kylvyn visar 4 platser efter krympning (2×2)", fr.d.querySelectorAll(".slot").length===4);
check("Highland Park listas som 'utan plats' efter att den slängdes ur kylen", fr.d.body.textContent.includes("Utan plats") && fr.d.body.textContent.includes("Highland Park"));
fr.t.switchView("mastaren");
fr.d.getElementById("setRows").value = 999; fr.d.getElementById("setCols").value = 999;
click(fr.w, fr.d.getElementById("saveFridgeBtn"));
check("kylens mått klamras till max 10×8", fr.t.state.fridge.rows===10 && fr.t.state.fridge.cols===8);

/* ==== Omprovning: fullständig intervallprogression 14→42→90 ==== */
console.log("== Omprovning: fullständig intervallprogression 14→42→90 ==");
const rt2 = boot();
rt2.t.openTasting(1);
type(rt2.w, rt2.d.querySelector('input[data-i="0"][data-f="nose"]'), "honung");
click(rt2.w, rt2.d.querySelector('.star[data-i="0"][data-r="7"]'));
click(rt2.w, rt2.d.getElementById("saveBtn"));
check("omprovning schemalagd på 14 dagar (stage 0)", rt2.t.state.retastes.ben.due === rt2.w.addDays(rt2.w.today(),14) && rt2.t.state.retastes.ben.stage===0);
rt2.t.state.retastes.ben.due = "2000-01-01"; rt2.w.save();
rt2.t.openRetaste("ben");
type(rt2.w, rt2.d.getElementById("rtNose"), "honung");
click(rt2.w, rt2.d.getElementById("saveBtn"));
click(rt2.w, rt2.d.getElementById("saveBtn"));
check("efter första omprovningen: stage 1, nästa om 42 dagar", rt2.t.state.retastes.ben.stage===1 && rt2.t.state.retastes.ben.due === rt2.w.addDays(rt2.w.today(),42));
rt2.t.state.retastes.ben.due = "2000-01-01"; rt2.w.save();
rt2.t.openRetaste("ben");
type(rt2.w, rt2.d.getElementById("rtNose"), "honung äpple");
click(rt2.w, rt2.d.getElementById("saveBtn"));
click(rt2.w, rt2.d.getElementById("saveBtn"));
check("efter andra omprovningen: stage 2, nästa om 90 dagar", rt2.t.state.retastes.ben.stage===2 && rt2.t.state.retastes.ben.due === rt2.w.addDays(rt2.w.today(),90));
rt2.t.state.retastes.ben.due = "2000-01-01"; rt2.w.save();
rt2.t.openRetaste("ben");
type(rt2.w, rt2.d.getElementById("rtNose"), "honung äpple till");
click(rt2.w, rt2.d.getElementById("saveBtn"));
click(rt2.w, rt2.d.getElementById("saveBtn"));
check("stage klamras vid 2 (max-intervallet), går inte längre", rt2.t.state.retastes.ben.stage===2 && rt2.t.state.retastes.ben.due === rt2.w.addDays(rt2.w.today(),90));
check("tre omprovnings-entries sparade totalt", rt2.t.state.retastes.ben.entries.length===3);
check("pastNotesFor(ben) listar alla tre omprovningar + ursprungsprovningen", rt2.w.pastNotesFor("ben").length===4);

/* ==== Blindläge: gränsfall ==== */
console.log("== Blindläge: gränsfall ==");
const bl = boot();
bl.t.openBlind(); bl.t.blindStep2(); bl.t.blindPick("abu"); bl.t.blindStep3();
click(bl.w, bl.d.querySelector('.seg-btn[data-q="smoky"][data-v="ja"]'));
click(bl.w, bl.d.querySelector('.seg-btn[data-q="sherry"][data-v="ja"]'));
bl.t.blindGuess.bottleId = "lap";
click(bl.w, bl.d.getElementById("saveBtn"));
const revTxt = bl.d.getElementById("ovContent").textContent;
check("fel rök-gissning ger 'fel ✗'", revTxt.includes("fel ✗"));
check("rätt sherry-gissning ger 'rätt ✓'", revTxt.includes("rätt ✓"));
check("1 av 3 rätt (bara sherryfrågan rätt)", revTxt.includes("1 av 3"));
check("flaska-gissning felmarkerad (gissade Laphroaig, var a'Bunadh)", revTxt.includes("Laphroaig") && revTxt.includes("fel"));
check("blind-entry sparas med correct:false", bl.t.state.retastes["abu"].entries[0].correct===false);
click(bl.w, bl.d.getElementById("saveBtn"));

const bl2 = boot();
bl2.t.openBlind(); bl2.t.blindStep2(); bl2.t.blindPick("tal"); bl2.t.blindStep3();
type(bl2.w, bl2.d.getElementById("blNose"), "rök salt");
click(bl2.w, bl2.d.getElementById("saveBtn"));
const rev2 = bl2.d.getElementById("ovContent").textContent;
check("ingen gissning alls → inget träffresultat visas", !rev2.includes("rätt 🎯"));
check("dofterna visas ändå i avslöjandet", rev2.includes("rök salt"));
check("blind-entry sparas utan gissning (guess:null)", bl2.t.state.retastes["tal"].entries[0].guess===null);

/* ==== Gästprovning: blint läge & felhantering ==== */
console.log("== Gästprovning: blint läge & felhantering ==");
const gs = boot();
gs.t.openGuestInvite(5);
click(gs.w, gs.d.querySelector('.seg-btn[data-bl="1"]'));
click(gs.w, gs.d.getElementById("makeInviteBtn"));
const blindInvite = gs.d.getElementById("shareLink").value;
const blindPayload = gs.t.decodeShare(blindInvite.split("#gast=")[1]);
check("blint inbjudan döljer flasknamnen", blindPayload.glasses.every(gl => gl.name===null));
check("blint inbjudan behåller glas-etiketter", blindPayload.glasses[0].label==="Glas 1");
gs.t.closeOverlay();

const bad = boot(null, "http://localhost/#gast=inte-base64-alls!!");
check("trasig gästlänk kraschar inte appen", bad.jsErrors.length===0);
check("trasig gästlänk visar felmeddelande, ingen overlay öppnas", !bad.d.getElementById("overlay").classList.contains("open"));

const noHash = boot();
check("ingen hash i URL:en → ingen overlay öppnas automatiskt", !noHash.d.getElementById("overlay").classList.contains("open"));

const invite2 = boot();
invite2.t.openGuestInvite(5);
click(invite2.w, invite2.d.getElementById("makeInviteBtn"));
const link2 = invite2.d.getElementById("shareLink").value;
const guest2 = boot(null, "http://localhost/#gast=" + link2.split("#gast=")[1]);
type(guest2.w, guest2.d.getElementById("gName"), "Björn");
click(guest2.w, guest2.d.querySelector('.star[data-gi="0"][data-r="8"]'));
click(guest2.w, guest2.d.getElementById("saveBtn"));
const answerLink2 = guest2.d.getElementById("shareLink").value;
const host2 = boot(null, "http://localhost/#svar=" + answerLink2.split("#svar=")[1]);
check("#svar= i URL öppnar jämförelsen direkt vid sidladdning", host2.d.getElementById("ovContent").textContent.includes("Björn"));
check("#svar= hashen rensas efter hantering", host2.w.location.hash === "");

/* ==== Ny flaska: validering & redigering ==== */
console.log("== Ny flaska: validering & redigering ==");
const nf = boot();
nf.t.openBottleForm(null);
click(nf.w, nf.d.getElementById("saveBtn"));
check("tomt namn avvisas – ingen ny flaska sparas", Object.keys(nf.t.state.bottles).length===13);
type(nf.w, nf.d.querySelector('input[data-bf="name"]'), "   ");
click(nf.w, nf.d.getElementById("saveBtn"));
check("namn med bara mellanslag avvisas också", Object.keys(nf.t.state.bottles).length===13);
type(nf.w, nf.d.querySelector('input[data-bf="name"]'), "  Ny Dram  ");
click(nf.w, nf.d.getElementById("saveBtn"));
const created = Object.values(nf.t.state.bottles).find(b=>b.name==="Ny Dram");
check("namn trimmas vid spara", !!created);
check("ny flaska får status 'unopened' som default", created && created.status === "unopened");
nf.t.openBottleForm("tal");
check("redigeringsformulär förifyllt med befintligt namn", nf.d.querySelector('input[data-bf="name"]').value === "Talisker 10");
click(nf.w, nf.d.querySelector('.seg-btn[data-st="finished"]'));
click(nf.w, nf.d.getElementById("saveBtn"));
check("redigering ändrar bara status, resten av fälten oförändrade", nf.t.state.bottles.tal.status==="finished" && nf.t.state.bottles.tal.distillery==="Talisker");
check("redigering behåller flaskans befintliga id (tal)", Object.keys(nf.t.state.bottles).includes("tal"));
check("redigering behåller flaskans färg oförändrad", nf.t.state.bottles.tal.color === "#CE9440");

/* ==== Övriga hjälpfunktioner ==== */
console.log("== Övriga hjälpfunktioner ==");
check("today() returnerar ISO-datum (YYYY-MM-DD)", /^\d{4}-\d{2}-\d{2}$/.test(w.today()));
check("addDays lägger till dagar korrekt över månadsskifte", w.addDays("2026-01-31",1)==="2026-02-01");
check("addDays hanterar skottår korrekt", w.addDays("2024-02-28",1)==="2024-02-29");
check("spotify() bygger en sökbar Spotify-URL", w.spotify("Tom Waits Closing Time")==="https://open.spotify.com/search/"+encodeURIComponent("Tom Waits Closing Time"));
check("dotHtml() bäddar in flaskans färg", w.dotHtml("#ABCDEF").includes("#ABCDEF"));
check("chip() för okänt id returnerar tom sträng utan krasch", w.chip("finnsinte")==="");
check("chip() för giltigt id innehåller flasknamnet", w.chip("lap").includes("Laphroaig"));
const nb2 = boot();
check("nextTasting() pekar på provning 1 i en ny installation", nb2.w.nextTasting().n===1);
check("dueRetastes() är tom lista i en färsk installation", nb2.w.dueRetastes().length===0);
check("fridgeSlotOf() för oplacerad flaska returnerar null", nb2.w.fridgeSlotOf("tal")===null);

/* ==== Flaskdetalj: dold flaska & statiska foton ==== */
console.log("== Flaskdetalj: dold flaska & statiska foton ==");
const ph = boot();
check("bottlePhoto() ger statiskt Islay-foto för lap utan eget foto", ph.w.bottlePhoto("lap","thumb")==="images/web/lap-640.jpg");
check("bottlePhoto() ger full storlek för uig", ph.w.bottlePhoto("uig","full")==="images/web/uig-1280.jpg");
check("bottlePhoto() ger null för flaska utan foto (ej lap/uig)", ph.w.bottlePhoto("tal","thumb")===null);
ph.t.openBottleDetail("x");
check("openBottleDetail för dolda 'x' körs utan krasch", ph.d.getElementById("overlay").classList.contains("open"));
check("dold flaska visar drickråd trots saknad ABV/flavour", ph.d.getElementById("ovContent").textContent.includes("Fyll i alkoholhalten"));
ph.t.closeOverlay();
check("visibleBottles() filtrerar bort dolda 'x'", !ph.w.visibleBottles().some(([id])=>id==="x"));

/* ==== AI-lager: callClaude felhantering (async) ==== */
(async () => {
  console.log("== AI-lager: callClaude felhantering ==");

  async function callWithFetch(fetchImpl){
    const inst = boot();
    inst.t.state.settings.apiKey = "sk-ant-test";
    inst.w.fetch = fetchImpl;
    return inst;
  }

  {
    const inst = boot();
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("callClaude utan nyckel kastar tydligt fel", err === "Ingen API-nyckel – lägg in den under Mästaren → Inställningar.");
  }
  {
    const inst = await callWithFetch(async () => { throw new Error("boom"); });
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("nätverksfel ger 'Nätverksfel – är du offline?'", err === "Nätverksfel – är du offline?");
  }
  {
    const inst = await callWithFetch(async () => ({ok:false, status:401, json:async()=>({error:{message:"bad key"}})}));
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("401 ger 'Fel API-nyckel'", err === "Fel API-nyckel – kontrollera inställningarna.");
  }
  {
    const inst = await callWithFetch(async () => ({ok:false, status:429, json:async()=>({})}));
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("429 ger 'För många anrop'", err === "För många anrop – vänta en liten stund.");
  }
  {
    const inst = await callWithFetch(async () => ({ok:false, status:529, json:async()=>({})}));
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("529 ger 'överbelastad'-meddelande", err === "AI-tjänsten är överbelastad – prova igen strax.");
  }
  {
    const inst = await callWithFetch(async () => ({ok:false, status:500, json:async()=>({error:{message:"internal oops"}})}));
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("500 med API-detalj inkluderar detaljtexten", err === "API-fel (500): internal oops");
  }
  {
    const inst = await callWithFetch(async () => ({ok:true, status:200, json:async()=>({content:[], stop_reason:"end_turn"})}));
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("tomt svar ger 'Tomt svar från AI'", err === "Tomt svar från AI – prova igen.");
  }
  {
    const inst = await callWithFetch(async () => ({ok:true, status:200, json:async()=>({content:[], stop_reason:"max_tokens"})}));
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("stop_reason max_tokens ger tydligt 'tänkte för länge'-fel", err === "AI:n tänkte för länge och fick inte plats med svaret – prova igen.");
  }
  {
    const inst = await callWithFetch(async () => ({ok:true, status:200, json:async()=>({content:[], stop_reason:"refusal"})}));
    let err = null;
    try{ await inst.w.callClaude({model:"x", messages:[]}); }catch(e){ err = e.message; }
    check("stop_reason refusal ger 'avböjde frågan'-fel", err === "AI:n avböjde frågan – formulera om den.");
  }
  {
    const inst = await callWithFetch(async () => ({ok:true, status:200, json:async()=>({content:[{type:"text",text:'{"x":0.5,"y":0.2,"motivering":"test"}'}]})}));
    const res = await inst.w.callClaude({model:"x", messages:[], schema:{type:"object"}});
    check("lyckat svar med schema parsas till objekt", res.x===0.5 && res.motivering==="test");
  }
  {
    const inst = await callWithFetch(async () => ({ok:true, status:200, json:async()=>({content:[{type:"text",text:"Rakt textsvar"}]})}));
    const res = await inst.w.callClaude({model:"x", messages:[]});
    check("lyckat svar utan schema returnerar rå text", res === "Rakt textsvar");
  }

  console.log(failures.length ? "\nFAILURES ("+failures.length+"):\n  - "+failures.join("\n  - ") : "\nALLA TESTER GRÖNA");
  process.exit(failures.length ? 1 : 0);
})();
