const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\Hacer\\.openclaw\\workspace\\trading-bot\\bot.js', 'utf8');

const edits = [
  {
    old: 'Willkommen bei *MoneyMove*! \u{1F680}\\n\\nIn 5 Schritten bekommst du Zugang zu unseren exklusiven Trading-Signalen.\\n\\n\u{1F4B0} Partner: VT Markets\\n\u{1F4CA} Indikator: Gold Structure v1.1\\n\\nBereit?',
    new: 'Willkommen bei *MoneyMove*! \u{1F680}\\n\\n*Das bekommst du KOSTENLOS:*\\n\\n\u{1F4CA} *Gold Structure v1.1* Indikator (FREE)\\n\u{1F4E1} *Taegliche XAUUSD Signale* (FREE)\\n\u{1F3A5} *Livestreams* + Community (FREE)\\n\\nIn 5 Schritten bist du drin!\\n\\nBereit?'
  },
  {
    old: '*MoneyMove* - High-Performance Trading-Community\\n\\n\u{1F48E} Pr\u00e4zise XAUUSD Signale\\n\u{1F48E} Gold Structure v1.1 Indikator\\n\u{1F48E} VT Markets Partner\\n\\nIn 5 Schritten dabei! \u{1F680}',
    new: '*MoneyMove* - Deutschlands wachsende Trading-Community \u{1F4C8}\\n\\n\u{1F48E} *Gold Structure v1.1* Indikator (FREE)\\n\u{1F48E} *Taegliche XAUUSD Signale* (FREE)\\n\u{1F48E} *Livestreams* mit Live-Trading (FREE)\\n\u{1F48E} *Community* mit 500+ Tradern (FREE)\\n\\nAlles kostenlos. Keine versteckten Kosten.\\n\\nIn 5 Schritten dabei! \u{1F680}'
  },
  {
    old: '*SCHRITT 1/5: Partner* \u{1F91D}\\n\\nVT Markets \u2013 regulierter Broker.\\n\u2705 Schnelle Execution\\n\u2705 Geringe Spreads\\n\u2705 Einzahlung ab 50\u20AC',
    new: '*SCHRITT 1/5: Deine Vorteile* \u{1F381}\\n\\n*KOSTENLOS fuer dich:*\\n\\n\u{1F4CA} *Gold Structure v1.1* Indikator\\n   Markiert Order Blocks, Liquidity & Struktur.\\n   Sonst kostenpflichtig - bei uns FREE!\\n\\n\u{1F4E1} *Taegliche XAUUSD Signale*\\n   Entry, SL, TP - fertig zum Traden.\\n\\n\u{1F3A5} *Livestreams*\\n   Schau mir live beim Traden zu.\\n\\n\u{1F465} *Community* mit 500+ Tradern\\n\\nDas einzige was du brauchst: Ein kostenloses VT Markets Konto (5 Minuten).'
  },
  {
    old: '*SCHRITT 2/5: Registrierung* \u{1F4DD}\\n\\n1\uFE0F\u20E3 Link \u00f6ffnen\\n2\uFE0F\u20E3 Daten eingeben\\n3\uFE0F\u20E3 Code *${VT_CODE}* eingeben\\n4\uFE0F\u20E3 E-Mail best\u00e4tigen\\n\\n${VT_LINK}',
    new: '*SCHRITT 2/5: Konto erstellen* \u{1F4DD}\\n\\n1\uFE0F\u20E3 Link oeffnen\\n2\uFE0F\u20E3 Registrieren (Daten eingeben)\\n3\uFE0F\u20E3 Code *${VT_CODE}* eingeben\\n4\uFE0F\u20E3 E-Mail bestaetigen\\n\\nDanach freigeschaltet:\\n\u2705 Gold Structure v1.1 Indikator (FREE)\\n\u2705 Taegliche Signale (FREE)\\n\u2705 Livestreams (FREE)\\n\\n${VT_LINK}'
  },
  {
    old: '*SCHRITT 3/5: Einzahlung* \u{1F4B0}\\n\\n1\uFE0F\u20E3 Verifizierung (ID) hochladen\\n2\uFE0F\u20E3 Einzahlen (100-500\u20AC empfohlen)\\n\\n\u2705 Danach unten klicken!',
    new: '*SCHRITT 3/5: Freischaltung* \u2705\\n\\n1\uFE0F\u20E3 ID hochladen bei VT Markets\\n2\uFE0F\u20E3 Erste Einzahlung (100-500\u20AC empfohlen)\\n\\nSobald das Geld da ist, schalte ich dich frei fuer:\\n\u{1F4CA} Gold Structure v1.1 (FREE)\\n\u{1F4E1} Exklusive Signal-Gruppe (FREE)\\n\u{1F3A5} Livestream-Zugang (FREE)\\n\\n\u{1F447} Klick wenn eingezahlt'
  },
  {
    old: '*SCHRITT 4/5: UID* \u{1F194}\\n\\nSchick mir deine VT Markets Account-ID (UID).\\n\\n\u{1F449} App \u2192 Profil \u2192 Einstellungen\\n\\n\u{1F447} Antworte nur mit der Nummer:',
    new: '*SCHRITT 4/5: Fast geschafft!* \u{1F194}\\n\\nSchick mir deine VT Markets Account-ID (UID).\\n\\n\u{1F449} App \u2192 Profil \u2192 Einstellungen\\n\\nDanach schalte ich dich frei:\\n\\n\u{1F4CA} Gold Structure v1.1 (FREE)\\n\u{1F4E1} Taegliche Signale (FREE)\\n\u{1F3A5} Livestreams (FREE)\\n\u{1F465} Community (FREE)\\n\\n\u{1F447} Antworte nur mit der Nummer:'
  },
  {
    old: '*WILLKOMMEN!* \u{1F389}\u{1F680}\\n\\nUID *${text}* registriert.\\n\\nWir pr\u00fcfen die Daten & schicken dir in K\u00fcrze die Gruppen-Links.',
    new: '*WILLKOMMEN IM TEAM!* \u{1F389}\u{1F680}\\n\\nUID *${text}* registriert.\\n\\n*DEINE KOSTENLOSEN VORTEILE:*\\n\\n\u{1F4CA} Gold Structure v1.1 Indikator\\n\u{1F4E1} Taegliche Signale in der Gruppe\\n\u{1F3A5} Livestream-Zugang\\n\u{1F465} Community mit 500+ Tradern\\n\\nWir schalten dich in 1-2 Stunden frei!\\n\\nWillkommen bei MoneyMove! \u{1F525}'
  }
];

let count = 0;
for (const e of edits) {
  if (c.includes(e.old)) {
    c = c.replace(e.old, e.new);
    count++;
    console.log('OK: ' + e.new.substring(0, 40));
  } else {
    console.log('FAIL: Text not found (edit ' + (count+1) + ')');
  }
}

fs.writeFileSync('C:\\Users\\Hacer\\.openclaw\\workspace\\trading-bot\\bot.js', c, 'utf8');
console.log('\n' + count + '/7 Texte ersetzt');
