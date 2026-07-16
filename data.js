/* ================= Smakresan – seed-data =================
   Statiskt innehåll. Användarens flaskor bor i localStorage
   (seedas härifrån vid första start). */

const BOTTLE_SEED = {
  ben:{name:"Benriach 10", color:"#DCB25E", distillery:"Benriach", region:"Speyside, Skottland",
       type:"Single malt", abv:43, cask:"Bourbon, sherry & ny ek", price:null,
       flavour:{x:0.35,y:0.10}, song:{artist:"Van Morrison",title:"Sweet Thing"}},
  bal:{name:"Balvenie 12", color:"#DCA84E", distillery:"The Balvenie", region:"Speyside, Skottland",
       type:"Single malt", abv:40, cask:"Bourbon + sherryfinish (DoubleWood)", price:null,
       flavour:{x:0.50,y:0.05}, song:{artist:"Bill Evans",title:"Peace Piece"}},
  red:{name:"Redbreast 12", color:"#B8762E", distillery:"Midleton", region:"Irland",
       type:"Single pot still", abv:40, cask:"Bourbon & oloroso-sherry", price:null,
       flavour:{x:0.60,y:0.05}, song:{artist:"The Dubliners",title:"Whiskey in the Jar"}},
  eli:{name:"Elijah Craig", color:"#9A4E1E", distillery:"Heaven Hill", region:"Kentucky, USA",
       type:"Bourbon", abv:47, cask:"Ny kolad amerikansk ek", price:null,
       flavour:{x:0.55,y:0.10}, song:{artist:"Chris Stapleton",title:"Tennessee Whiskey"}},
  tal:{name:"Talisker 10", color:"#CE9440", distillery:"Talisker", region:"Isle of Skye, Skottland",
       type:"Single malt", abv:45.8, cask:"Ex-bourbon", price:null,
       flavour:{x:0.55,y:0.55}, song:{artist:"The Waterboys",title:"Fisherman's Blues"}},
  lap:{name:"Laphroaig 10", color:"#C08A38", distillery:"Laphroaig", region:"Islay, Skottland",
       type:"Single malt", abv:40, cask:"Ex-bourbon", price:null,
       flavour:{x:0.45,y:0.90}, song:{artist:"Tom Waits",title:"16 Shells from a Thirty-Ought-Six"}},
  smo:{name:"Smögen 9", color:"#E0B45C", distillery:"Smögen", region:"Bohuslän, Sverige",
       type:"Single malt", abv:57, cask:"Bourbon (kolla din flaska)", price:null,
       flavour:{x:0.50,y:0.80}, song:{artist:"Kent",title:"Utan dina andetag"}},
  uig:{name:"Uigeadail", color:"#C87E2E", distillery:"Ardbeg", region:"Islay, Skottland",
       type:"Single malt", abv:54.2, cask:"Bourbon + oloroso-sherry", price:null,
       flavour:{x:0.75,y:0.95}, song:{artist:"Nick Cave & The Bad Seeds",title:"Red Right Hand"}},
  abu:{name:"a'Bunadh", color:"#7A3A1C", distillery:"Aberlour", region:"Speyside, Skottland",
       type:"Single malt, fatstyrka", abv:60.5, cask:"Oloroso-sherry (batchstyrka varierar)", price:null,
       flavour:{x:0.90,y:0.10}, song:{artist:"Muddy Waters",title:"Mannish Boy"}},
  hp:{name:"Highland Park 18", color:"#B06A28", distillery:"Highland Park", region:"Orkney, Skottland",
       type:"Single malt", abv:43, cask:"Sherrymättad europeisk & amerikansk ek", price:null,
       flavour:{x:0.65,y:0.35}, song:{artist:"Miles Davis",title:"Blue in Green"}},
  dip:{name:"Diplomático", color:"#8A4A20", distillery:"Diplomático (DUSA)", region:"Venezuela",
       type:"Rom", abv:40, cask:"Bourbon- & maltwhiskyfat", price:null,
       flavour:{x:0.80,y:0.05}, song:{artist:"Buena Vista Social Club",title:"Dos Gardenias"}},
  app:{name:"Appleton 12", color:"#6E3A16", distillery:"Appleton Estate", region:"Jamaica",
       type:"Rom", abv:43, cask:"Amerikansk ek", price:null,
       flavour:{x:0.55,y:0.10}, song:{artist:"Bob Marley & The Wailers",title:"Stir It Up"}},
  x:{name:"Hemligt glas", color:"#555049", hidden:true}
};

const PHASES = [
  {id:1,name:"Fas 1 · Grunden",color:"var(--f1)"},
  {id:2,name:"Fas 2 · Röken",color:"var(--f2)"},
  {id:3,name:"Fas 3 · Sherryn & djupet",color:"var(--f3)"},
  {id:4,name:"Fas 4 · Mästarklassen",color:"var(--f4)"}
];

const TASTINGS = [
  {n:1,phase:1,q:"Vad gör faten med samma stil?",bottles:["ben","bal"],
   why:"Två mjuka Speysides sida vid sida. Benriach har ny ek i mixen, Balvenie sherryfinish. Liten skillnad – perfekt för att träna näsan från start."},
  {n:2,phase:1,q:"Irland mot Kentucky – vem vinner din gom?",bottles:["red","eli"],
   why:"Irländsk pot still (krämig, kryddig) mot amerikansk bourbon (kolad ek, choklad). Största kontrasten hittills."},
  {n:3,phase:1,q:"Tre länder, tre själar – hör du skillnaden blint?",bottles:["bal","red","eli"],
   why:"Trippel! Skottland, Irland, USA. Be Maria hälla upp utan att säga vilket glas som är vilket."},
  {n:4,phase:2,q:"Vad gör röken, egentligen?",bottles:["ben","tal"],
   why:"Din norska semesterflaska mot Talisker. Samma mjuka bas – men Talisker adderar peppar, salt och rök. Nu börjar rökresan."},
  {n:5,phase:2,q:"Halv rök eller full rök – var trivs du?",bottles:["tal","lap"],
   why:"Talisker viskar rök, Laphroaig ropar. Efter ikväll vet du exakt var på rökskalan ditt hjärta bor."},
  {n:6,phase:2,q:"Kan Sverige utmana Islay?",bottles:["smo","lap"],
   why:"Hunnebostrand mot Skottlands västkust. Smögen är fruktigare bakom röken – men slår den favoriten?"},
  {n:7,phase:2,q:"Rökens två ansikten – torr eller söt?",bottles:["lap","uig"],
   why:"Båda Islay, båda rökiga. Men Laphroaig är torr och medicinsk, Uigeadail söt av sherry. Samma ö, två världar."},
  {n:8,phase:3,q:"Vad gör röken med en sherrybomb?",bottles:["abu","uig"],
   why:"Sherrymuskler i båda glasen – med och utan rök. Kör vattentestet: smaka båda före och efter några droppar."},
  {n:9,phase:3,q:"Sherrybomb mot sherryfinish – dos eller finess?",bottles:["abu","bal"],
   why:"a'Bunadh är 100 % sherryfat i fatstyrka, Balvenie bara några månaders finish. Hur mycket sherry är lagom?"},
  {n:10,phase:3,q:"Vad gör vattnet? Samma whisky, två glas.",bottles:["uig","uig"],
   why:"Häll upp Uigeadail i två glas. Vatten i det ena, inget i det andra. Vänta fem minuter. Jämför. Detta är kvällen du lär dig vattnets magi."},
  {n:11,phase:4,q:"Rommens två poler – smekning eller utmaning?",bottles:["dip","app"],
   why:"Diplomáticos sötma mot Appletons torra marmelad. Rom har samma spännvidd som whisky – ikväll bevisar du det."},
  {n:12,phase:4,q:"Fatens språk – talar bourbon och rom samma dialekt?",bottles:["app","eli"],
   why:"Båda lagrade på kolad amerikansk ek, olika råvara. Hör du fatet genom sockerröret och majsen?"},
  {n:13,phase:4,q:"Blindprovningen – känner du igen dina egna flaskor?",bottles:["x","x","x"],
   why:"Maria väljer tre flaskor i hemlighet och häller upp. Du gissar. Använd gärna Blindläget under Hyllan – eller skriv gissningarna i anteckningarna."},
  {n:14,phase:4,q:"Examen – är kronjuvelen värd sitt namn?",bottles:["hp"],
   why:"Highland Park 18, solo, efter fjorton veckors tränad gom. Avsluta med att kora din topp tre – har favoriterna skiftat sen resan började?"}
];

/* Smakhjul – kategorier med ordförråd (WSET-inspirerat, på svenska) */
const FLAVOR_WHEEL = {
  "Frukt":["äpple","päron","citrus","tropisk frukt","röda bär"],
  "Sädighet":["malt","kex","nybakat bröd","müsli"],
  "Rök":["torv","aska","tjära","grillrök","medicinsk"],
  "Sherry & torkad frukt":["russin","fikon","plommon","nötter","läder"],
  "Vanilj & ek":["vanilj","kokos","karamell","honung","ek"],
  "Krydda":["peppar","kanel","ingefära","muskot","lakrits"],
  "Blommigt":["ljung","blommor","gräs","hö"],
  "Marint":["salt","tång","havsluft"]
};

/* Kvadranter på smakkartan (x: ljus→fyllig, y: mild→rökig) */
const QUADRANTS = {
  ljusmild:  {name:"Ljus & mild",   test:(x,y)=>x<0.5&&y<0.5},
  fylligrund:{name:"Fyllig & rund", test:(x,y)=>x>=0.5&&y<0.5},
  ljusrokig: {name:"Ljus & rökig",  test:(x,y)=>x<0.5&&y>=0.5},
  rikrokig:  {name:"Rik & rökig",   test:(x,y)=>x>=0.5&&y>=0.5}
};

/* Kvällens ton – musik per smakkvadrant + rom-spår */
const TONE_MAP = {
  ljusmild:{genre:"Nordisk jazz & visa",
    why:"Lätta, eleganta drammar möter luftiga, stilla toner.",
    tracks:[{artist:"Jan Johansson",title:"Visa från Utanmyra"},
            {artist:"Esbjörn Svensson Trio",title:"From Gagarin's Point of View"}]},
  fylligrund:{genre:"Soul & klassisk blues",
    why:"Sherrysötma och fyllighet vill ha varma, mjuka röster.",
    tracks:[{artist:"Otis Redding",title:"These Arms of Mine"},
            {artist:"Bill Withers",title:"Ain't No Sunshine"}]},
  ljusrokig:{genre:"Kustnära folk & blues",
    why:"Salt, peppar och lätt rök – som en kväll vid havet.",
    tracks:[{artist:"John Martyn",title:"Solid Air"},
            {artist:"Mark Knopfler",title:"Sailing to Philadelphia"}]},
  rikrokig:{genre:"Dark jazz & långsam americana",
    why:"Tung rök och sherrydjup kräver mörka, långsamma klanger.",
    tracks:[{artist:"Bohren & der Club of Gore",title:"Midnight Radio"},
            {artist:"Tom Waits",title:"Way Down in the Hole"}]},
  rom:{genre:"Latin & reggae",
    why:"Rommens hemtrakter – Karibien rakt in i högtalarna.",
    tracks:[{artist:"Buena Vista Social Club",title:"Chan Chan"},
            {artist:"Toots & The Maytals",title:"Pressure Drop"}]}
};

/* Färger till nya flaskor och faser */
const NEW_BOTTLE_COLORS = ["#D9A441","#C27A35","#A65D2B","#8F4A3A","#C99A5B","#B4632F","#7A5A2E","#996633"];
const NEW_PHASE_COLORS = ["#7A6AA0","#4E7A8A","#8A7A4E","#6A8A9E"];
