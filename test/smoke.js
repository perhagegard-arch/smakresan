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
  journalContext
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
check("chattfält inaktiverat utan nyckel", d.getElementById("chatField").disabled);
type(w, d.getElementById("setKey"), "sk-ant-test123");
click(w, d.getElementById("saveKeyBtn"));
check("nyckel i state", t.state.settings.apiKey==="sk-ant-test123");
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

console.log(failures.length ? "\nFAILURES:\n  - "+failures.join("\n  - ") : "\nALL TESTS PASSED");
process.exit(failures.length ? 1 : 0);
