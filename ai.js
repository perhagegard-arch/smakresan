/* ================= Smakresan – AI-lager =================
   Anropar Anthropic-API:et direkt från webbläsaren med
   användarens egen nyckel (sparas bara i localStorage). */

const AI_URL = "https://api.anthropic.com/v1/messages";

function aiReady(){
  return !!(state.settings && state.settings.apiKey) && navigator.onLine;
}

async function callClaude({model, system, messages, maxTokens=1024, schema}){
  if(!state.settings.apiKey) throw new Error("Ingen API-nyckel – lägg in den under Mästaren → Inställningar.");
  const body = {model, max_tokens:maxTokens, messages};
  if(system) body.system = system;
  if(schema) body.output_config = {format:{type:"json_schema", schema}};
  let res;
  try{
    res = await fetch(AI_URL, {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "x-api-key": state.settings.apiKey,
        "anthropic-version":"2023-06-01",
        "anthropic-dangerous-direct-browser-access":"true"
      },
      body: JSON.stringify(body)
    });
  }catch(e){
    throw new Error("Nätverksfel – är du offline?");
  }
  if(!res.ok){
    if(res.status===401) throw new Error("Fel API-nyckel – kontrollera inställningarna.");
    if(res.status===429) throw new Error("För många anrop – vänta en liten stund.");
    if(res.status===529) throw new Error("AI-tjänsten är överbelastad – prova igen strax.");
    let detail=""; try{detail=(await res.json()).error.message}catch(e){}
    throw new Error("API-fel ("+res.status+")"+(detail?": "+detail:""));
  }
  const data = await res.json();
  const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  if(!text.trim()){
    if(data.stop_reason === "max_tokens") throw new Error("AI:n tänkte för länge och fick inte plats med svaret – prova igen.");
    if(data.stop_reason === "refusal") throw new Error("AI:n avböjde frågan – formulera om den.");
    throw new Error("Tomt svar från AI – prova igen.");
  }
  return schema ? JSON.parse(text) : text;
}

/* Kompakt sammanfattning av hyllan + provningsdagboken – Mästarens minne */
function journalContext(){
  const lines = ["ANVÄNDARENS HYLLA:"];
  visibleBottles().forEach(([id, b]) => {
    lines.push("- ["+id+"] "+b.name+" · "+(b.type||"?")+" · "+(b.region||"?")+" · "+(b.abv||"?")+" % · fat: "+(b.cask||"?")+
      " · status: "+(b.status||"open")+
      (b.flavour ? " · smakkarta (ljus0-fyllig1: "+b.flavour.x+", mild0-rökig1: "+b.flavour.y+")" : ""));
  });
  lines.push("", "PROVNINGSDAGBOK:");
  let any = false;
  allTastings().forEach(t => {
    const s = state.sessions[t.n];
    if(!s) return;
    any = true;
    const gl = (s.glasses||[]).map(g => {
      const b = bottle(g.bottle);
      return (b ? b.name : g.bottle)+': doft "'+(g.nose||"–")+'", smak "'+(g.taste||"–")+'", eftersmak '+(g.finish||"–")+
        ", betyg "+(g.rating||"–")+
        (g.flavors && g.flavors.length ? ", smakord: "+g.flavors.join("/") : "");
    }).join(" | ");
    lines.push('Provning '+t.n+' ('+(s.date||"?")+') "'+t.q+'": '+gl+(s.lesson ? ' · Lärdom: "'+s.lesson+'"' : ""));
  });
  if(!any) lines.push("(Inga provningar genomförda ännu.)");
  Object.entries(state.retastes||{}).forEach(([id, r]) => {
    (r.entries||[]).forEach(e => {
      const b = bottle(id);
      if(b && (e.nose || e.taste)) lines.push((e.blind?"Blindprovning":"Omprovning")+" "+(e.date||"")+" av "+b.name+': doft "'+(e.nose||"–")+'", smak "'+(e.taste||"–")+'"');
    });
  });
  return lines.join("\n");
}

/* Snabb ping för att verifiera nyckeln */
async function testApiKey(){
  await callClaude({
    model: state.settings.modelFast,
    maxTokens: 16,
    messages:[{role:"user",content:"Svara med exakt ett ord: ok"}]
  });
}

/* Fota etikett → strukturerad flaskinfo. dataUrl = jpeg ~1024px. */
async function extractLabel(dataUrl){
  return callClaude({
    model: state.settings.modelFast,
    maxTokens: 600,
    messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:"image/jpeg",data:dataUrl.split(",")[1]}},
      {type:"text",text:"Läs etiketten på flaskan. Returnera fälten på svenska; använd null för det som inte syns. "+
        "abv som tal (t.ex. 46). region t.ex. 'Islay, Skottland' eller 'Kentucky, USA'. "+
        "type t.ex. 'Single malt', 'Bourbon', 'Rom'. cask = fattyp om den nämns."}
    ]}],
    schema:{type:"object",properties:{
      name:{type:["string","null"],description:"Flaskans namn inkl. ålder, t.ex. 'Lagavulin 16'"},
      distillery:{type:["string","null"]},
      region:{type:["string","null"]},
      type:{type:["string","null"]},
      abv:{type:["number","null"]},
      cask:{type:["string","null"]}
    },required:["name","distillery","region","type","abv","cask"],additionalProperties:false}
  });
}

/* Föreslå koordinater på smakkartan för en ny flaska */
async function suggestCoords(b){
  const examples = Object.values(BOTTLE_SEED).filter(s=>!s.hidden&&s.flavour)
    .map(s=>`${s.name} (${s.region}, ${s.cask}): x=${s.flavour.x}, y=${s.flavour.y}`).join("\n");
  return callClaude({
    model: state.settings.modelFast,
    maxTokens: 300,
    messages:[{role:"user",content:
      "Placera en flaska på en smakkarta med två axlar: x = ljus (0) till fyllig (1), "+
      "y = mild (0) till rökig (1). Exempel på placeringar:\n"+examples+
      "\n\nPlacera nu: "+(b.name||"?")+" – destilleri "+(b.distillery||"?")+
      ", region "+(b.region||"?")+", typ "+(b.type||"?")+", fat "+(b.cask||"?")+
      ". Motivera kort på svenska."},],
    schema:{type:"object",properties:{
      x:{type:"number"},y:{type:"number"},motivering:{type:"string"}
    },required:["x","y","motivering"],additionalProperties:false}
  });
}

/* Färskt musikförslag från Mästaren för kvällens glas */
async function suggestMusic(desc){
  return callClaude({
    model: state.settings.modelFast,
    maxTokens: 400,
    messages:[{role:"user",content:
      "Kvällens provning: "+desc+". Föreslå musik som förhöjer just de här smakerna – "+
      "en genre och två konkreta låtar (artist + titel) som finns på Spotify. "+
      "Var gärna oväntad men träffsäker. Motivera med en mening på svenska."}],
    schema:{type:"object",properties:{
      genre:{type:"string"},why:{type:"string"},
      tracks:{type:"array",items:{type:"object",properties:{
        artist:{type:"string"},title:{type:"string"}
      },required:["artist","title"],additionalProperties:false}}
    },required:["genre","why","tracks"],additionalProperties:false}
  });
}

/* Mästaren – chatt grundad i hyllan och provningsdagboken */
async function askMastaren(chatMessages){
  return callClaude({
    model: state.settings.modelSmart,
    maxTokens: 10000, // Sonnet 5 tänker adaptivt och tankarna räknas in – ge gott om utrymme
    system:"Du är Mästaren – en varm men rak whiskymentor i appen Smakresan. "+
      "Användaren är nybörjare som tränar sin gom med provningar hemma på helgerna. "+
      "Svara kort och konkret på svenska, max några stycken. Använd bara flaskor som finns på användarens hylla "+
      "när du föreslår provningar. Uppmuntra utan att fjäska.\n\n"+journalContext(),
    messages: chatMessages
  });
}

/* Generera en ny provning utifrån hyllan + dagboken.
   bottles begränsas med enum till riktiga flask-id:n. */
async function generateTasting(extraWish){
  const ids = visibleBottles().filter(([id,b])=>b.status!=="finished").map(([id])=>id);
  return callClaude({
    model: state.settings.modelSmart,
    maxTokens: 8000, // rymmer adaptivt tänkande + det strukturerade svaret
    system:"Du designar nästa provning i appen Smakresan. "+journalContext(),
    messages:[{role:"user",content:
      "Föreslå EN ny provning (1–3 glas) som lär användaren något nytt utifrån dagboken ovan. "+
      "Undvik att upprepa exakt samma jämförelser som redan gjorts. "+
      (extraWish?("Användarens önskemål: "+extraWish+". "):"")+
      "q = en lockande fråga som kvällens tema (svenska). why = 2–3 meningar som förklarar pedagogiken. "+
      "phaseName = kort fasnamn, t.ex. 'Fas 5 · Nya hyllan'. bottles = flaskornas id:n."}],
    schema:{type:"object",properties:{
      q:{type:"string"},why:{type:"string"},phaseName:{type:"string"},
      bottles:{type:"array",items:{type:"string",enum:ids}}
    },required:["q","why","phaseName","bottles"],additionalProperties:false}
  });
}

/* En extra mentormening till drickrådskortet (cacheas på flaskan) */
async function enrichAdvice(b){
  return callClaude({
    model: state.settings.modelFast,
    maxTokens: 200,
    messages:[{role:"user",content:
      "Ge EN mening på svenska med ett konkret, personligt tips för att få ut det mesta av "+
      b.name+" ("+(b.type||"whisky")+", "+(b.abv||"?")+" %, fat: "+(b.cask||"okänt")+"). "+
      "Inget allmänt snack – ett riktigt knep."}]
  });
}
