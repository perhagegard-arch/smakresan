/* ================= Pers whiskyresa – facit =================
   Expertfacit som låses upp EFTER att en provning sparats.
   Först provar du – sen berättar proffset vad du borde ha känt.
   FACIT_BOTTLES skrivs en gång per flaska och återanvänds av
   alla provningar som häller den. FACIT_TASTINGS.glasses är
   index-parallell med TASTINGS[n].bottles. */

const FACIT_BOTTLES = {
  ben:{
    history:"Aberlour grundades 1879 av James Fleming vid bäcken Lour i hjärtat av Speyside – namnet betyder ungefär 'mynningen av den mumlande bäcken'. 12-åringen (Double Cask Matured) är destilleriets folkliga ansikte utåt och har länge varit en av Frankrikes mest sålda single malter.",
    style:"Två fat vattnas samman till en whisky: amerikansk ex-bourbonek ger vanilj och lätthet, spansk oloroso-sherry ger nötighet och torkad frukt – en varm, lättillgänglig Speyside-klassiker vid 40 %.",
    fun:"Samma destilleri gör också a'Bunadh, som du möter längre fram i resan (provning 8–9) – en helt obehandlad fatstyrkeversion av samma sherrykaraktär, för den som vill ha samma smak i mycket större format."},
  bal:{
    history:"The Balvenie byggdes 1892 av William Grant, vägg i vägg med Glenfiddich i Dufftown, och ägs än idag av familjen Grant. Det är ett av få destillerier som fortfarande gör nästan allt själva: odlar eget korn, mältar på golv och har både egen tunnbindare och egen kopparslagare.",
    style:"Honung, vanilj och mjuk sherryfrukt. DoubleWood 12 är själva definitionen av 'finish': först bourbonfat i många år, sedan cirka nio månader i oloroso-sherryfat.",
    fun:"Malt mastern David C. Stewart började på destilleriet 1962 och räknas som fatfinishens uppfinnare – DoubleWood från 1993 var en av de allra första."},
  red:{
    history:"Redbreast görs på Midleton-destilleriet i grevskapet Cork och är den stora klassikern inom irländsk single pot still – stilen där mäsken blandar mältat och omältat korn och destilleras tre gånger. Namnet, 'rödhaken', föddes 1912 hos vinhandlaren Gilbey's som då lagrade och buteljerade whiskyn åt destilleriet.",
    style:"Krämig, nästan oljig munkänsla med kryddighet från det omältade kornet och torkad frukt från oloroso-faten – pot still-stilens signum.",
    fun:"Det omältade kornet var från början ett sätt att slippa engelsk skatt på mältat korn – ett skattetrick som råkade bli en hel smakstil."},
  eli:{
    history:"Heaven Hill i Kentucky grundades 1935 av familjen Shapira, direkt efter förbudstidens slut, och är fortfarande familjeägt. Elijah Craig är döpt efter en baptistpredikant från 1700-talet som enligt legenden var först med att lagra bourbon på kolade ekfat – därav smeknamnet 'the father of bourbon'.",
    style:"Klassisk bourbonprofil: vanilj, karamell, rostad ek och lite mörk choklad, med 47 % som ger tuggmotstånd.",
    fun:"Legenden säger att Craigs fat kolades av misstag i en brand i ladan. Historikerna tvivlar – men historien var för bra för att inte hamna på etiketten."},
  tal:{
    history:"Talisker grundades 1830 av bröderna MacAskill och var länge det enda destilleriet på Isle of Skye. Det ligger vid stranden av Loch Harport, och havet har blivit hela varumärket: 'made by the sea'.",
    style:"Signaturen är svartpeppar och salt havsluft ovanpå en mjuk, fruktig bas – rökig, men långt ifrån Islay-nivå (malten torkas vid runt 18–22 ppm fenoler).",
    fun:"Talisker kyler fortfarande ångan i gammaldags 'worm tubs' – kopparspiraler i stora utomhuskar – vilket ger en tyngre karaktär som destilleriet vägrar modernisera bort. Robert Louis Stevenson hyllade dessutom Talisker på vers redan 1880."},
  lap:{
    history:"Laphroaig grundades 1815 av bröderna Johnston på Islays sydkust. Destilleriet mältar fortfarande en del av kornet på egna golv och torkar det över torveld – därav den medicinska röken. Bessie Williamson, som drev Laphroaig från 1954, var en av Skottlands första kvinnliga destillerichefer.",
    style:"Den mest kompromisslösa Islay-stilen: tjära, jod, rök och salt – 'medicinsk' är ordet som alltid återkommer. Malten ligger runt 40–45 ppm fenoler.",
    fun:"Under USA:s förbudstid såldes Laphroaig lagligt som 'medicin' – smaken ansågs vara bevis nog. Och sedan 1994 är destilleriet kunglig hovleverantör."},
  smo:{
    history:"Smögen Whisky startades 2010 av Pär Caldenby – advokat, whiskyförfattare och egenbyggare – i Hunnebostrand på Bohuskusten. Det är ett av Sveriges minsta destillerier, med en årsproduktion som stora skotska destillerier närmast spiller.",
    style:"Kraftigt rökig men med tydlig fruktighet bakom röken, ofta buteljerad vid hög styrka utan färgning eller kylfiltrering. Beviset på att svensk whisky kan tävla med Islay.",
    fun:"Caldenby skrev boken 'Enjoying Malt Whisky' och ritade sedan destilleriet själv – först teorin, sedan praktiken."},
  uig:{
    history:"Ardbeg grundades 1815 men var nära döden flera gånger – under 80- och 90-talen stod det mest stilla, tills Glenmorangie köpte och återstartade det 1997. Uigeadail, lanserad 2003, är döpt efter sjön som ger destilleriet sitt vatten – gaeliska för ungefär 'den mörka, mystiska platsen'.",
    style:"Ardbegs tunga rök (malt kring 50–55 ppm) möter söta oloroso-sherryfat i fatstyrka. 'Rökig russinbomb' är en fullt rimlig sammanfattning.",
    fun:"Whiskyskribenten Jim Murray utsåg Uigeadail till årets whisky i världen 2009, och flaskan har varit kultförklarad sedan dess."},
  abu:{
    history:"Aberlour grundades 1879 av James Fleming i hjärtat av Speyside. a'Bunadh – gaeliska för 'ursprunget' – lanserades i slutet av 90-talet som en hyllning till 1800-talets stil: obehandlad, i fatstyrka och helt lagrad på spanska oloroso-fat.",
    style:"Sherrybomb i renkultur: russin, fikon, apelsinmarmelad, mörk choklad och kryddor i batchstyrka kring 59–61 %. Varje batch är numrerad och lite olika.",
    fun:"Enligt destilleriets egen legend föddes idén när en gömd flaska från 1898 hittades vid en renovering – a'Bunadh gjordes för att återskapa det som fanns i den."},
  hp:{
    history:"Highland Park på Orkney har bränt whisky sedan 1798 och grundades enligt legenden av Magnus Eunson – kyrkvärd om dagen, spritsmugglare om natten. Destilleriet mältar än idag en del av kornet på egna golv och torkar det över orkadisk ljungtorv från Hobbister-mossen.",
    style:"Balansens mästare: honungssötma, sherryfrukt och en mjuk, aromatisk ljungrök – aldrig medicinsk som Islay. 18-åringen lagras enbart på sherrymättade fat och har i decennier räknats till världens bästa whiskies.",
    fun:"Orkney är nästan trädlöst, så torven består av tusenårig ljung i stället för skog – därför doftar röken mer parfym än tjära."},
  dip:{
    history:"Diplomático görs av DUSA i norra Venezuela, vid Andernas fot. Reserva Exclusiva byggs på 'sockerrörshonung' – koncentrerad sockerrörssaft – och destilleras delvis i gamla kopparpannor innan den lagras länge i bourbon- och whiskyfat.",
    style:"Dessertrommens portalfigur: mjuk, rund och tydligt söt med kola, choklad och mogen frukt. Sötman kommer inte bara från faten – den venezuelanska stilen tillåter tillsatt socker.",
    fun:"Herren med monokel på etiketten är 'Don Juancho', en 1800-talsfigur som enligt varumärket bjöd sina diplomatvänner på det bästa ur källaren – därav namnet."},
  app:{
    history:"Appleton Estate i Nassau Valley på Jamaica har gjort rom sedan 1749 och är öns äldsta verksamma destilleri. Master blendern Joy Spence blev 1997 spritvärldens första kvinnliga master blender – och det är fortfarande hon som gör blandningarna.",
    style:"Jamaicansk stil utan tillsatt socker: torr, estrig och fruktig med husets signum – apelsinskal och marmelad. Åldern på etiketten är alltid den YNGSTA rommen i blenden.",
    fun:"Rom åldras snabbare i tropisk värme – tolv år på Jamaica brukar jämföras med det dubbla i Skottland. 'Änglarnas andel' som avdunstar är hela sex procent om året."}
};

const FACIT_TASTINGS = {
  1:{
    lesson:"Två Speysides, samma familj av fat – men olika dos. Aberlour mognar parallellt i både bourbon- och sherryfat hela lagringstiden, Balvenie tillbringar bara några månader i sherryfat på slutet som finish. Kvällens poäng: sherrykaraktär handlar lika mycket om HUR LÄNGE och HUR som OM fatet användes alls. Kändes det ena helgjutet sherrigt och det andra mer kryddat på toppen?",
    glasses:[
      "Aberlour 12: honung, äpple och vanilj från bourbonfaten vävs ihop med nötig sherrysötma och lite russin – sherryn är med genom hela smaken, inte bara på slutet.",
      "Balvenie 12: malt och honung i botten, med sherryns russin och nötighet som en kort, varm eftersmak sist i glaset – finishen märks, men tar aldrig över kärnan."],
    science:"Sherryfat av spansk/europeisk ek har dragit åt sig oxiderat vin: nötter, torkad frukt och en mörkare strävhet av garvsyra. Hur mycket som hamnar i glaset styrs av kontakttid: Aberlour ligger i sherryfat parallellt med bourbonfaten hela sin livstid och blandas sedan ihop ('double cask'), medan Balvenies sprit bara flyttas över till sherryfat de sista månaderna som en snabb ytbehandling – en finish. Samma fatsort, helt olika dos.",
    next:"Nästa gång byter vi land helt. Men minns skalan 'lite sherry mot mycket sherry' – i provning 9 möter Balvenie sin motpol: Aberlours syskon a'Bunadh, ren fatstyrke-sherry utan spädning."},
  2:{
    lesson:"Kvällens kontrast sitter i både råvara och fat: irländsk pot still mot amerikansk bourbon. Det här är förmodligen den största smakskillnad du kan få mellan två ljusa, orökta glas.",
    glasses:[
      "Redbreast 12: krämig, nästan oljig i munkänslan – det är pot still-stilens kännetecken. Kryddor (ingefära, peppar), rött äpple och sherryfrukt, med lång mjuk eftersmak.",
      "Elijah Craig: sötare och rostigare – vanilj, karamell, kola och en tydlig kolad ekton, ungefär som doften i en nyöppnad kaffepåse. 47 % ger också mer bett på tungan än Redbreasts 40."],
    science:"Redbreasts krämighet kommer från omältat korn i mäsken och trippeldestillering. Elijah Craigs sötma kommer från majsen (minst 51 % i bourbon) och från lagen som kräver nya, kraftigt kolade ekfat – kolningen karamelliserar träets socker och ger kola- och vaniljtonerna. Samma fatprincip som i provning 1, men uppskruvad till max.",
    next:"I provning 3 kommer båda tillbaka – blint. Memorera munkänslan: krämig = Irland, söt och rostad = USA."},
  3:{
    lesson:"Första blindtestet! Tre länder, tre tillverkningsfilosofier. Facit i korthet: Skottland = malt och honung, Irland = krämig krydda, USA = söt kolad ek. Gissade du rätt på minst en har du redan ett fungerande smakminne.",
    glasses:[
      "Balvenie 12: den maltiga, honungssöta – ofta den 'snällaste' av de tre. Sherryfruktens russinton är det som skiljer den från de andra.",
      "Redbreast 12: avslöjas av munkänslan – tjockare, krämigare och mer krydda än sötma.",
      "Elijah Craig: lättast att peka ut – vaniljen och den rostade eken skriker Kentucky, och den högre styrkan känns redan i näsan."],
    science:"Att blindprova är att gå från 'smakar gott' till 'känner igen'. Hjärnan luras lätt av etiketter och förväntningar – utan dem tvingas du använda de riktiga ledtrådarna: munkänsla, sötma, kryddighet och eftersmakens längd. Försök har visat att även proffs påverkas kraftigt av vad de TROR att de dricker.",
    next:"Nu sitter grunden. Härnäst börjar rökresan – och rök är den lättaste av alla smaker att känna igen, så unna dig att ha rätt ofta ett tag."},
  4:{
    lesson:"Samma mjuka grundstil – men Talisker lägger till rök, peppar och salt. Ikväll handlar det om att isolera vad 'rök' egentligen är: känn hur den lägger sig ovanpå frukten utan att ta bort den.",
    glasses:[
      "Aberlour 12: din referenspunkt från provning 1 – honung, äpple och nötig sherrysötma. Notera hur mjuk och rund den känns bredvid Taliskers peppar och rök.",
      "Talisker 10: först frukt och malt, sedan rullar röken in – grillrök snarare än tjära – och allra sist husets varumärke: en pepprig sting i eftersmaken som kallas 'the Talisker catch'."],
    science:"Rök i whisky skapas vid mältningen: kornet torkas över brinnande torv och rökens fenoler fastnar på kornet. Mängden mäts i ppm fenoler – Talisker ligger kring 18–22 ppm, att jämföra med Islay-malt på 40–55. Pepparn tros komma från den korta, intensiva destillationen och den gammaldags kylningen i worm tubs.",
    next:"Nästa provning skruvar upp röken rejält. Lägg Taliskers nivå på minnet – den blir din mittpunkt på rökskalan."},
  5:{
    lesson:"Rökskalans två steg: Talisker viskar (~20 ppm), Laphroaig ropar (~40–45 ppm). Men lägg märke till att skillnaden inte bara är mängd – det är också en annan SORTS rök: grillrök mot sjukhuskorridor.",
    glasses:[
      "Talisker 10: efter Laphroaig känns den nästan mild – peppar, salt och diskret rök. Därför ska den provas först!",
      "Laphroaig 10: tjära, jod, förbandslåda, aska och salt tång. Men bakom rökväggen gömmer sig en förvånansvärt söt vaniljkärna från bourbonfaten – att hitta den är kvällens svåraste övning."],
    science:"Olika torv ger olika rök. Fenolerna är en hel familj av ämnen: guaiakol drar åt rökt och grillat, kresolerna åt tjära och medicinskåp. Laphroaigs egen golvmältning och Islay-torven – mer mossa och tång, mindre trä – ger just den medicinska profilen. Ppm mäts dessutom på malten; mycket försvinner på vägen, så siffran är en fingervisning snarare än facit.",
    next:"Nu vet du var på rökskalan du bor. Nästa gång utmanar Sverige – samma rökklass som Laphroaig, men en annan frukt bakom röken."},
  6:{
    lesson:"David mot Goliat: ett svenskt mikrodestilleri från 2010 mot tvåhundra år av Islay-tradition. Poängen: rökig whisky är inte en plats utan en metod. Smögen är rakare och fruktigare bakom röken, Laphroaig bredare och mer medicinsk.",
    glasses:[
      "Smögen 9: ung, intensiv och kompromisslös – rök och eldig frukt (citrus, gröna äpplen) vid hela 57 %. Kör gärna vattentestet: några droppar öppnar den rejält.",
      "Laphroaig 10: mjukare än Smögen trots all sin rök – 40 % och tio år har rundat av kanterna. Notera hur olika 'gamla' de två känns i munnen."],
    science:"Smögen använder kraftigt torvrökt malt (kring 45 ppm) men små pannor och långsam destillation, vilket bevarar mycket av spritens fruktestrar. Yngre whisky har dessutom kvar mer av sin egen frukt – fatet har inte hunnit runda av den. Styrkan spelar också in: 57 % bär aromerna hårdare mot näsan än 40 %.",
    next:"Rökfasens final ställer torr rök mot söt rök – ta med dig Laphroaigs 'torrhet' som referens."},
  7:{
    lesson:"Samma ö, två världar: Laphroaig är torr, medicinsk rök – Uigeadail är rök inbäddad i sherrysötma. Kvällens läxa: rök och sötma tar inte ut varandra, de förstärker varandra. Som salt i kola.",
    glasses:[
      "Laphroaig 10: nu är den din referens för torr rök – jod, aska, salt och väldigt lite sötma i jämförelse.",
      "Ardbeg Uigeadail: mer rök på pappret (~50–55 ppm) men den UPPLEVS rundare – russin, mörk choklad, tjära och bål. Fatstyrkan 54,2 % gör den enorm i munnen; vatten är både tillåtet och rekommenderat."],
    science:"Sherryfatens frukt och oxiderade sötma bäddar in rökfenolerna – kombinationen ger den klassiska 'rökt julgodis'-profilen. Att Uigeadail upplevs sötare och rundare trots FLER fenoler än Laphroaig visar en nyckelläxa: uppmätt intensitet och upplevd intensitet är två olika saker. Balans slår styrka.",
    next:"Rökfasen är avklarad! Nästa fas handlar om sherryn – och Uigeadail följer med som brygga rakt in i den."},
  8:{
    lesson:"Två sherrybomber – en ren (a'Bunadh) och en rökt (Uigeadail). Kvällens fråga: vad gör röken med sherryfrukten? Svar: den ger mörker och rymd. Som skillnaden mellan russin i solsken och russin vid lägereld.",
    glasses:[
      "a'Bunadh: sherry i renkultur – russin, fikon, apelsinmarmelad, valnöt och mörk choklad. Styrkan kring 60 % bränner utan vatten, så kör vattentestet på allvar: före och efter är två olika whiskies.",
      "Uigeadail: samma mörka frukt i botten, men nu med tjära och rök ovanpå. Jämför eftersmakerna – sherryn klingar av, röken hänger kvar."],
    science:"Båda bygger på oloroso-fat: europeisk ek som mättats med sherryvinets oxiderade nöt- och fruktkaraktär. Fatstyrka betyder ospädd styrka direkt från fatet – och vatten är inte fusk utan ett verktyg som frigör aromämnen (särskilt fruktestrar) ur alkoholen. Rökfenoler är dessutom fettlösliga och dröjer sig därför kvar längre på tungan än sherryns sötma.",
    next:"Nästa gång: hur mycket sherry är lagom? a'Bunadhs maximalism möter Balvenies diskreta finish – dos mot finess."},
  9:{
    lesson:"Sherryskalans ytterligheter: a'Bunadh är 100 % sherryfat i fatstyrka, Balvenie fick nio månaders finish vid 40 %. Ingen av dem är 'rättare' – ikväll bestämmer du var på skalan din smak bor, och det är en åsikt värd att äga.",
    glasses:[
      "a'Bunadh: allt på max – frukt, styrka och garvsyra. Känn strävheten på tungan, som starkt te. Det är den europeiska ekens tanniner.",
      "Balvenie 12: bredvid a'Bunadh framstår den nästan som blyg – men notera elegansen: honung och malt först, sherryn bara som en varm avslutning. Finish är kryddan, inte huvudrätten."],
    science:"Tid och fatandel styr dosen: nio månader i sherryfat sätter en ton, flera år i enbart sherryfat byter ut hela profilen. Fler variabler: förstagångsfyllda fat ger mer än återanvända, europeisk ek ger mer tannin än amerikansk, och hög styrka bär mer smak per klunk. Samma krydda – helt olika dosering.",
    next:"Nu kan du fat. Nästa provning är resans mest lärorika enkla trick: samma whisky i två glas, och bara vattnet skiljer."},
  10:{
    lesson:"Kvällens läxa är resans billigaste superkraft: några droppar vatten förändrar en whisky mer än många hundralappar i prisskillnad. Kände du skillnaden ikväll kommer du aldrig mer servera fatstyrka utan pipett på bordet.",
    glasses:[
      "Utan vatten: Uigeadail rå – tät, het och nästan stum i doften. Alkoholen står som en vägg framför aromerna; känn hur det sticker i näsan.",
      "Med vatten och fem minuters tålamod: doften öppnar sig – mer frukt, mer choklad, mjukare rök – och munkänslan blir rundare. Samma vätska, ny whisky."],
    science:"Alkohol och vatten binder aromämnen olika hårt. Vid hög styrka håller etanolen kvar fettlösliga aromer nere i vätskan; när du späder trycks ämnen som guaiakol (rök) och fruktestrarna upp mot ytan där näsan når dem. Forskare har till och med visat det i molekylsimuleringar: vid lägre styrka samlas guaiakol i ytskiktet. Därför doftar utspädd whisky MER, inte mindre.",
    next:"Fas 4 väntar: rom. Ta med dig vattentricket – det fungerar där också. Och fundera på var sötman egentligen kommer ifrån."},
  11:{
    lesson:"Rommens två poler: Diplomático är dessert, Appleton är torr jamaicansk funk. Läxan: ordet 'rom' säger lika lite om smaken som ordet 'whisky' – spannet är minst lika brett, och sötman är ofta ett val i fabriken, inte i fatet.",
    glasses:[
      "Diplomático: kola, choklad, banan och vanilj – rund och uppenbart söt, nästan likörartad i jämförelse. Lätt att gilla, svår att dricka mycket av.",
      "Appleton 12: torr, estrig och 'funkig' – övermogen banan, apelsinskal, marmelad, ek och en pepprig avslutning. Sötman du känner här är fatens, inte tillsatt."],
    science:"Venezuelansk tradition tillåter tillsatt socker – Diplomático brukar mätas till uppåt 40 gram per liter – medan jamaicansk stil inte tillsätter något. Jamaicas signum är i stället estrar: fruktiga aromämnen från lång, vild jäsning, ibland förstärkta med 'dunder', jäsrester som sparas mellan satserna. Det är estrarna som ger den övermogna tropiska frukten – 'funken'.",
    next:"Sista jämförelsen knyter ihop rommen med bourbonen från provning 2 – lyssna efter fatet BAKOM råvaran."},
  12:{
    lesson:"Samma fatspråk, olika modersmål: kolad amerikansk ek bakom både sockerrör och majs. Hör du vaniljen och kolan i BÅDA glasen har du knäckt resans viktigaste kod – fatet är en egen röst som går igen tvärs över alla kategorier.",
    glasses:[
      "Appleton 12: leta förbi apelsinen och estern – där bakom finns vanilj, kola och rostad ek. Låter det bekant?",
      "Elijah Craig: samma ekröst, men nu som huvudnummer. Bourbonens majssötma plus ny kolad ek är fatets språk utan dialekt."],
    science:"Kolningen bryter ner ekens vedämnen: lignin blir vanillin (vanilj), hemicellulosans socker karamelliseras (kola) och kollagret filtrerar bort osmakligheter. Appleton lagras på begagnade bourbonfat – samma ämnen i andra generationen, i mildare dos – medan bourbon enligt lag alltid får nya fat. Därför är ektonen råare i Elijah Craig och mer inbakad i Appleton.",
    next:"Teorin är klar. Nästa provning är den stora blindprovningen – repetera gärna anteckningarna från provning 3, 5 och 9 innan."},
  13:{
    lesson:"Det stora provet: känner du igen dina egna flaskor utan etikett? Facit ikväll är inte flasknamnen – det är metoden. En systematisk gissning som blir fel är värd mer än en turträff.",
    glasses:[],
    science:"Proffsens blindmetod är ett beslutsträd. Ett: rök – ja eller nej? Det halverar hyllan direkt. Två: sherry – russin och nötter, eller är sötman bourbonfatets vanilj? Tre: munkänsla och styrka – bränner den? Krämig eller stram? Först därefter gissar du flaska. Kom också ihåg att näsan tröttnar snabbt: lukta i korta drag, vila den mot handryggen, och lita på förstaintrycket – det är oftast rätt.",
    next:"En provning kvar: examen. Highland Park 18, solo – allt du tränat på, i ett enda glas."},
  14:{
    lesson:"Examen. Highland Park 18 är vald med flit: den innehåller ALLT du tränat på – sherryfrukt (provning 8–9), rök i diskret dos (4–7), honungssötma (1) och en lång, balanserad eftersmak. Kan du bocka av varje del i glaset har du gått från 'gott' till att kunna LÄSA en whisky. Grattis.",
    glasses:[
      "Highland Park 18: ta doften i lugn och ro – honung, torkad frukt, apelsin, vax och en svag, parfymerad ljungrök. I smaken: sherryfrukt först, sedan mjuk rök, till sist lång honungssöt eftersmak med lite ek. Lägg märke till hur delarna turas om i stället för att trängas – det är det som menas med balans."],
    science:"Orkneys torv är nästan trädlös och består till stor del av urgammal ljung – röken blir därför blommig och aromatisk i stället för tjärig, och den doseras lågt. Lägg till arton år i sherrymättade fat av både europeisk och amerikansk ek, och du får en whisky där ingen enskild komponent vinner. Precis därför fungerar den som examensprov: allt finns där, men bara för den som letar.",
    next:"Resan är slut – men gommen är färskvara. Kora din topp tre, ta omprovningarna när appen påminner, och våga dig sedan på flaskor utanför hyllan. Du har verktygen nu."}
};
