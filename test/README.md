# Röktest

Bootar hela appen i jsdom och kör ~86 kontroller: v1-migrering, provningsflödet,
omprovningar, blindläget, kylen, smakkartan, gästprovningen (två simulerade
webbläsare), Fredagssnurran, chatthistoriken, signaturlåtarna och en
beroendecheck som verifierar att varje funktion `ai.js` anropar är definierad.

```sh
cd test
npm install jsdom   # första gången
node smoke.js       # ska sluta med ALL TESTS PASSED
```

Kör alltid före commit av ändringar i app.js/ai.js/data.js.
OBS: riktiga AI-anrop testas inte (kräver nyckel) – därav beroendechecken.
