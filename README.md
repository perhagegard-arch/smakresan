# Pers whiskeyresa 🥃

En personlig whisky-lärapp. 14 kurerade provningar, en fråga i taget – och verktygen för att träna gommen på riktigt: omprovningar utan facit, blindprovningar, smakkarta, kylkarta och en AI-mentor.

Allt sparas lokalt i webbläsaren. Ingen server, inget konto, inget socialt.

## Kom igång

1. Öppna `index.html` i en webbläsare (funkar direkt från disk, inget byggsteg).
2. **Valfritt – AI:** skapa en API-nyckel på [console.anthropic.com](https://console.anthropic.com), klistra in under **Mästaren → ⚙️ Inställningar** och tryck *Testa nyckeln*. Nyckeln sparas bara i din webbläsare. Utan nyckel funkar allt utom AI-funktionerna.
3. Ställ in vinkylens hyllor/platser under samma inställningar.
4. Gör en **export** när du provat lite – all data bor i webbläsarens localStorage.

På mobilen: öppna samma fil (eller lägg den bakom en enkel statisk host) – flikraden och kameran är byggda för telefon.

## Flikarna

### 🥃 Ikväll
Kvällens startpunkt.
- **Progress** – genomförda provningar av resans totala.
- **Nästa provning** – nästa steg i resan, med pedagogisk motivering.
- **Dags att prova igen** – när en flaska är schemalagd för omprovning (se nedan).
- **👥 Bjud in en gäst** – skapa en gästlänk för kvällens provning (välj om gästen ser flasknamnen eller provar blint). Gästen öppnar länken på sin mobil, antecknar och skickar tillbaka en svarslänk – era intryck visas sida vid sida och sparas under Resan. Helt serverlöst: all data reser i själva länken.
- **🎡 Fredagssnurran** – kan du inte välja dram? Viktat lyckohjul bland dina flaskor, där de du inte rört på länge har större chans.
- **Kvällens ton** – kvällens flaskors **signaturlåtar** visas först (varje flaska kan ha en egen låt – sätt själv eller låt Mästaren välja), följt av genre-förslag per smakkvadrant. Allt med klickbara Spotify-länkar.

### 🗺️ Resan
- **Tidslinjen** – alla provningar grupperade per fas. Klicka på ett stopp för att göra eller redigera provningen. AI-genererade provningar dyker upp som Fas 5+.
- **Din smakprofil** – snittbetyg per flaska, plus dina vanligaste smakord ("honung ×6").
- **Kvällarnas lärdomar** – en mening per kväll.

### 🍾 Hyllan
Tre undervyer:
- **Flaskor** – biblioteket med foto, metadata och status (oöppnad/öppen/urdrucken). *+ Lägg till flaska*: fota etiketten så läser AI av namn, destilleri, ABV, region och fattyp och förifyller formuläret – du bekräftar alltid själv innan det sparas. Varje flaska har ett **"Så dricker du den"-kort**: vattenråd styrt av alkoholhalten (fatstyrka → pipett!), glasval, vilotid och rökordning.
- **Kylen** – karta över vinkylen. Tryck på en tom plats för att lägga in en flaska; från flaskdetaljen hittar du "Visa i kylen" som pekar ut platsen.
- **Smakkartan** – dina flaskor plottade på axlarna *ljus ↔ fyllig* och *mild ↔ rökig* (Diageos Flavour Map-modell). Luckanalysen visar vilka smakhörn du saknar – en inköpsguide. Härifrån startas också **blindprovningen**: medhjälparen väljer flaska i hemlighet, du quizzas (rökig? sherry? vilken flaska?) och får sedan facit mot dina egna gamla anteckningar.

### 🎩 Mästaren
- **AI-chatt** grundad i hela din hylla och provningsdagbok: "vad ska jag prova ikväll?", "varför känner jag vanilj i bourbon?". Chatten visar de 6 senaste meddelandena — äldre ligger bakom "📜 Visa tidigare frågor", och "Rensa chatten" tömmer historiken (rör inte provningar/flaskor). Max 40 meddelanden sparas; de 20 senaste skickas med som minne.
- **✨ Föreslå ny provning** – Mästaren designar nästa provning utifrån vad du redan lärt dig, med bara flaskor du faktiskt äger. Godkänn så läggs den till i resan. Så förblir resan levande när hyllan växer.
- **⚙️ Inställningar** – API-nyckel, kylens mått, export/import av säkerhetskopia, nollställning.

## Lärande-mekanikerna

- **Provningsformuläret** – snabbt 3-ordsformat för doft/smak, plus valfria fördjupningar: smakhjul med kategoriserade chips (frukt, rök, sherry, vanilj/ek…), vattentest (före/efter droppar) och "Lyssnade på".
- **Omprovningar (spaced repetition)** – varje betygsatt flaska schemaläggs för omprovning efter 14, sedan 42, sedan 90 dagar. Du skriver tre dofter *ur minnet* innan gamla anteckningar visas, och appen räknar hur många ord som matchade din gamla näsa.
- **Blindläge** – strukturerad blindprovning i tre steg med medhjälpare, med diff mot både sanningen och dina historiska anteckningar.

## Teknik

| | |
|---|---|
| Arkitektur | Statisk enkelsides-app, vanilla JS, inga beroenden, inget byggsteg |
| Filer | `index.html` (skal) · `styles.css` · `data.js` (seed-data) · `ai.js` (Anthropic-anrop) · `app.js` (state, vyer, flöden) |
| Lagring | localStorage: `smakresa_v2` (all data) + `smakresa_photos_v1` (foton, 512 px JPEG, separat så fulla foton aldrig kan korrupta huvuddatat). Gamla `smakresa_v1` raderas aldrig – den är backup. |
| AI | Anthropic-API direkt från webbläsaren med din egen nyckel. Haiku 4.5 för etikettläsning, kartkoordinater och musik; Sonnet 5 för Mästaren och provningsförslag. Strukturerade svar via JSON-schema; flaskförslag låses med enum till riktiga flask-id:n så AI aldrig kan hitta på flaskor. |
| Offline | Allt utom AI funkar helt offline. AI-knappar inaktiveras utan nyckel/nät. |

### Datamodell (localStorage `smakresa_v2`)

```
state = {
  version: 2,
  sessions: { [n]: {glasses:[{bottle, nose, taste, finish, rating,
                              flavors[], noseWater, tasteWater}], lesson, music, date} },
  bottles:  { [id]: {name, color, distillery, region, type, abv, cask, price,
                     status, flavour:{x,y}, song:{artist,title}?, aiTip?, addedAt, source} },
  tastings: [ {n, phase, q, bottles[], why, source:"ai"} ],   // bara nya/AI-provningar
  phases:   [ {id, name, color} ],                            // Fas 5+
  fridge:   { rows, cols, slots: {"rad:kolumn": flaskId} },
  retastes: { [id]: {due, stage, entries:[{date, nose, taste, blind, guess?, correct?}]} },
  guests:   [ {date, name, n, glasses:[{label, nose, taste, rating}]} ],
  chat:     [ {role, text} ],
  settings: { apiKey, modelSmart, modelFast },
  lastExport
}
```

De 14 kurerade provningarna och seed-flaskorna bor i `data.js`; `allTastings()` = kurerade + användarens/AI:ns tillägg.

### Säkerhetskopia

Export ger en JSON-fil (`pers-whiskeyresa-backup-ÅÅÅÅ-MM-DD.json`) med allt utom API-nyckeln – **nyckeln exporteras aldrig**. Foton är valfria i exporten. Import ersätter all data efter bekräftelse. Ikväll-fliken påminner om senaste exporten är äldre än 30 dagar.

### Utveckling & test

Röktestet ligger i `test/smoke.js` (~86 kontroller, se `test/README.md`):

```sh
cd test && npm install jsdom && node smoke.js   # ska sluta med ALL TESTS PASSED
```

Deployas via GitHub Pages: `git push` räcker, live på
`perhagegard-arch.github.io/pers-whiskeyresa` efter ~1 min (CDN kan cachea några min till).

Viktiga konventioner i koden:
- **Svenskt UI** överallt.
- **`esc()` på all data** som inte är författad i `data.js` – användarinput och AI-svar renderas alltid escapade.
- **Vanliga `<script src>`-taggar**, inte ES-moduler – appen ska fungera från `file://`.
- **Full re-render per vy** (`renderView()`) – enkelt och snabbt i den här skalan.
- Skicka aldrig `temperature` till Sonnet 5 (ger 400).

Idéer och framtida funktioner: se [IDEER.md](IDEER.md).
