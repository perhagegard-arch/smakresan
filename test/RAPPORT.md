# Testrapport – Pers whiskeyresa

Utökning av röktestsviten från 91 till **222 kontroller** (`test/smoke.js`), kört med jsdom. Mål: täcka in allt som byggts/ändrats på sistone (Kustlinjen-omgörningen, Excisstämpeln-loggan, gästprovning, Fredagssnurran, signaturlåtar, Mästaren-UX-fixen) och leta upp sådant som kan ha missats.

**Resultat: alla 222 kontroller gröna. Inga buggar hittades.**

Kör själv: `cd test && node smoke.js`

## Vad som testades (nya avsnitt, ~131 nya kontroller)

| Avsnitt | Vad det täcker |
|---|---|
| Data-integritet (seed-data) | Att `BOTTLE_SEED`/`TASTINGS`/`PHASES`/`QUADRANTS`/`TONE_MAP`/`FLAVOR_WHEEL` hänger ihop – alla flask-id i provningarna finns, alla fas-id finns, kvadranterna täcker smakkartans fyra hörn utan lucka eller överlapp |
| `drinkAdvice()` – ABV-gränser | Alla brytpunkter i vattenrådet (46/50/55 %), vilotidens klamring (5–20 min), rök-tröskeln (y ≥ 0.45) på exakta gränsvärden, inte bara "typiska" värden |
| Smakkartan – `quadrantOf`/`toneFor` | Kvadrantgränser vid exakt x=0.5/y=0.5, rom-detektion via typtext, snittberäkning över flera flaskor, fallback för dolda/tomma val |
| `esc()` – XSS-skydd | Att `&<>"'` escapas korrekt, och att skadlig text i flasknamn, chattmeddelanden och gästnamn faktiskt renderas oskadliggjord i verklig HTML (inte bara att `esc()` som funktion fungerar isolerat) |
| `slugId()` | Kollisionshantering (samma namn två gånger → `laga`, `laga2`, `laga3`), specialtecken, å/ä/ö |
| `tok()` / ordfrekvens | Stoppordsfiltrering, korta ord, gemener, skiljetecken |
| Export / Import / Nollställ | Att API-nyckeln verkligen strippas ur den exporterade filen (inte bara att koden *ser ut* att göra det), att en importerad backup med tom nyckel inte skriver över en befintlig nyckel, felaktig version/trasig JSON kraschar inte, `resetAll()` behåller nyckeln men nollställer allt annat |
| Kylen – storleksändring | Att platser utanför nya måtten städas bort vid krympning, att kvarvarande platser behålls, att gränserna (max 10×8) klamras |
| Omprovning – full intervallprogression | Hela kedjan 14 → 42 → 90 dagar över tre omprovningar, plus att stadiet stannar på 90 dagar därefter i stället för att fortsätta öka |
| Blindläge – gränsfall | Fel gissning på rök/sherry/flaska (inte bara "allt rätt"-fallet som redan fanns), inget svar alls, att träffresultat inte visas när inget gissats |
| Gästprovning – blint läge & felhantering | Att blint läge verkligen döljer flasknamnen i länken, att en trasig/manipulerad gästlänk inte kraschar appen, att `#svar=`-länkar (inte bara `#gast=`) öppnas korrekt direkt vid sidladdning |
| Ny flaska – validering | Tomt namn och namn med bara mellanslag avvisas, namn trimmas, redigering av en befintlig flaska ändrar bara det man faktiskt rör (id, färg, övriga fält orörda) |
| Övriga hjälpfunktioner | `today()`, `addDays()` (inkl. månads-/skottårsskifte), `spotify()`, `dotHtml()`, `chip()`, `fridgeSlotOf()` m.fl. |
| Flaskdetalj – dold flaska & statiska foton | Att det hemliga glaset "x" (utan ABV/smakkarta) kan öppnas utan krasch, att Laphroaig/Uigeadail får sina inbyggda Islay-foton som fallback |
| AI-lager – `callClaude()` felhantering | Samtliga felgrenar: ingen nyckel, nätverksfel, 401/429/529, generiskt API-fel med detaljtext, tomt svar, `stop_reason` = `max_tokens`/`refusal`, samt lyckade svar med och utan schema |

## Vad som redan täcktes sen tidigare (91 ursprungliga kontroller, oförändrade)

Migrering v1→v2, hela provningsflödet, omprovning (grundfall), Hyllan/flasklista/kyl/smakkarta, ny flaska (grundfall), blindläge (allt rätt-fallet), Resan, Mästaren & inställningar (inkl. den nya `goToKeyBtn`-UX:en), signaturlåtar, Fredagssnurran, gästprovning (grundfall), chatthistorik (hopfällning/rensning), att alla funktioner `ai.js` anropar faktiskt existerar, samt persistens efter omladdning (inkl. att saknade signaturlåtar fylls på från seed utan att skriva över egna ändringar).

## Medvetna begränsningar

- **Foto-uppladdning (`resizeImage`/`handlePhoto`)** testas inte end-to-end – de bygger på `createImageBitmap`/`<canvas>` som saknas i jsdom. Detta är känt sen tidigare och inte nytt för den här rundan.
- **Fredagssnurrans viktning** (flaskor som inte smakats på länge får högre chans) testas bara strukturellt (att resultatet blir en giltig, ej urdrucken flaska) – själva sannolikhetsfördelningen är inte statistiskt testad.
- Inga riktiga nätverksanrop görs mot Anthropics API – `callClaude()`-testerna mockar `fetch` för att testa felhanteringen deterministiskt.

## Slutsats

Ingen bugg hittades under arbetet – varje ny kontroll bekräftade att koden redan gjorde rätt, även i gränsfall som inte testats tidigare (exakta ABV/rök-brytpunkter, XSS i faktisk rendering, full omprovningsprogression, felaktiga gästlänkar, alla AI-felgrenar). De 222 kontrollerna ger ett betydligt bredare skyddsnät inför framtida ändringar.
