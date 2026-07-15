# Idéer & framtid 💡

Levande dokument – lägg till fritt. Idéerna kommer dels från benchmarken mot andra appar (Vivino, InVintory, Distiller, Whiskybase, Untappd, WSET, Beanconqueror), dels från egna infall.

## Nära till hands (bygger på det som redan finns)

- [ ] **Omprovnings-statistik** – graf över hur ordmatchningen förbättras över tid per flaska. "Din näsa har blivit 40 % säkrare på Talisker."
- [ ] **Jämförelsevy A mot B** – välj två valfria flaskor och se dina anteckningar sida vid sida (idag jämförs bara inom en provning).
- [ ] **Smakkartan: min egen prick** – räkna ut var *din smak* ligger på kartan (viktat på betyg) och visa den som en stjärna. "Du bor i Rik & rökig-hörnet."
- [ ] **Provningshistorik per flaska som graf** – betyg över tid; ser man att a'Bunadh växer med van gom?
- [ ] **Dela en provning som bild** – generera ett snyggt "kvällskort" (canvas → PNG) att skicka till en kompis. Inget socialt konto, bara en bild.
- [ ] **Färdigdrucken-flöde** – när en flaska markeras urdrucken: liten "dödsruna" med snittbetyg, bästa citat ur anteckningarna, och frågan "köpa igen?" (sparas som inköpslista).
- [ ] **Inköpslista** – flaskor att köpa, gärna matade från smakkartans luckanalys och "köpa igen".

## AI-funktioner (kräver nyckel, allt är förberett i `ai.js`)

- [ ] **Veckans läxa** – Mästaren genererar en mikrolektion (2 min läsning) baserat på nästa provning: "Ikväll handlar det om fatstyrka – här är vad som händer kemiskt när du droppar vatten."
- [ ] **Anteckningscoach** – efter sparad provning kan Mästaren kommentera dina tre ord: "Du skrev 'sött' – kan du precisera? Honung, karamell eller frukt?" Tränar ordförrådet.
- [ ] **Rösten** – diktera anteckningar med Web Speech API i stället för att skriva (händerna är ju upptagna med glaset).
- [ ] **Kvitto-/hyllfoto** – fota hela hyllan eller ett Systembolagskvitto och låt AI lägga in flera flaskor på en gång.
- [ ] **Blindprovnings-AI-domare** – efter avslöjandet får du en mening om *varför* det var lätt/svårt att känna igen just den flaskan.
- [ ] **Matparning** – "vad ska jag ha till osten ikväll?" utifrån hyllan. Regelbaserad grund + AI-krydda, samma mönster som Kvällens ton.

## Musik ("Kvällens ton" 2.0)

- [ ] **Hel spellista per provning** – inte bara två låtar utan en 30-minuterslista som följer provningens dramaturgi (mildaste glaset först).
- [ ] **Spara vad som faktiskt spelades** – "Lyssnade på"-fältet finns redan; visa statistik: "Du dricker mest rök till Tom Waits."
- [ ] **Omvänd parning** – "jag är på Neil Young-humör ikväll, vilken dram passar?"

## Större saker (kräver mer arbete/annan arkitektur)

- [ ] **PWA** – manifest + service worker så appen kan installeras på hemskärmen och funkar garanterat offline. Naturligt nästa steg.
- [ ] **Synk mellan enheter** – t.ex. export/import via fil räcker länge, men en enkel synk (Dropbox/fil i molnet) skulle ta bort backup-oron.
- [ ] **Doftträning med Aroma Academy-kit** – checklista i provningen kopplad till referensdofter ur ett nosningskit ("vilka av kvällens dofter kände du igen från vialerna?").
- [ ] **Streckkod/etikett-databas** – slå upp mot Whiskybase för exakta buteljeringar (batch, fatnummer). Kräver API-tillgång.
- [ ] **Flera resenärer** – profil för Maria också, med jämförelse: "ni är oense om Laphroaig med 4 poäng."
- [ ] **Vertikalprovning** – stöd för teman som "samma destilleri, tre åldrar" med särskild jämförelsevy.

## Skrotade idéer (och varför)

- **Sociala funktioner / delning med konton** – hela poängen är privat lärande (Beanconqueror-filosofin). En bild att skicka räcker.
- **Betyg på 100-skala** – 1–10 räcker för att se mönster; mer precision är fejkad precision för en nybörjargom.
- **Automatisk lagersaldo (cl kvar i flaskan)** – för mycket bokföring för för lite lärande. Status oöppnad/öppen/urdrucken räcker.
