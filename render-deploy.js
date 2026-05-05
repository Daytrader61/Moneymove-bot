const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fs = require('fs');
const path = require('path');

// === CONFIG ===
const TOKEN = process.env.BOT_TOKEN || '8377672944:AAFYLtXlG8AKT39nCmmew5RihH76KuYSMO8';
const VT_LINK = process.env.VT_LINK || 'https://www.vtmarkets.net/trade-now/?affid=22205599';
const VT_CODE = process.env.VT_CODE || 'xqUAu3YW';
const PORT = process.env.PORT || 3000;
const ADMIN_IDS = (process.env.ADMIN_IDS || '7549484475').split(',');

const DB_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const LEADS_FILE = path.join(DB_DIR, 'leads.json');

// Daten-Verzeichnis erstellen
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const load = p => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e) { const d = p.endsWith('users.json') ? {} : []; fs.writeFileSync(p, JSON.stringify(d)); return d; } };
let users = load(USERS_FILE), leads = load(LEADS_FILE);
const save = () => { fs.writeFileSync(USERS_FILE, JSON.stringify(users,null,2)); fs.writeFileSync(LEADS_FILE, JSON.stringify(leads,null,2)); };
const fresh = () => { users = load(USERS_FILE); leads = load(LEADS_FILE); };

// === BOT ===
const bot = new Telegraf(TOKEN);
const isAdmin = id => ADMIN_IDS.includes(id.toString());
const uid = ctx => ctx.from.id.toString();
const adminNotify = async msg => { for (const a of ADMIN_IDS) try { await bot.telegram.sendMessage(a, msg, {parse_mode:'Markdown'}); } catch(e){} };

// =====================================================================
// ADMIN PANEL
// =====================================================================
bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  const totalLeads = leads.length;
  const completed = leads.filter(l => l.status === 'completed');
  const verified = leads.filter(l => l.verified);
  const pending = leads.filter(l => l.status === 'completed' && !l.verified);
  const open = leads.filter(l => l.status && l.status !== 'completed');
  const today = new Date().toDateString();
  const todayLeads = leads.filter(l => l.joined && new Date(l.joined).toDateString() === today);
  const todayCompleted = completed.filter(l => l.completedAt && new Date(l.completedAt).toDateString() === today);

  await ctx.reply(
    `📊 *MONEYMOVE DASHBOARD*\n\n` +
    `📅 ${new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}\n\n` +
    `👥 Leads gesamt: ${totalLeads}\n` +
    `➕ Heute neu: ${todayLeads.length}\n` +
    `✅ Fertig: ${completed.length} (heute: ${todayCompleted.length})\n` +
    `🔒 Verifiziert: ${verified.length}\n` +
    `⏳ Wartend: ${pending.length}\n` +
    `📝 In Bearbeitung: ${open.length}\n` +
    `📈 Conversion: ${totalLeads ? Math.round(verified.length/totalLeads*100) : 0}%\n\n` +
    `Wähle eine Aktion:`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('👥 Alle Leads', 'admin_list')],
      [Markup.button.callback('✅ Verifizieren', 'admin_verify')],
      [Markup.button.callback('⏳ Wartende', 'admin_pending')],
      [Markup.button.callback('📤 Export', 'admin_export')],
      [Markup.button.callback('🔄 Aktualisieren', 'admin_dash')]
    ])}
  );
});

bot.action('admin_dash', async (ctx) => {
  await ctx.answerCbQuery('🔄');
  fresh();
  const totalLeads = leads.length;
  const completed = leads.filter(l => l.status === 'completed');
  const verified = leads.filter(l => l.verified);
  const pending = leads.filter(l => l.status === 'completed' && !l.verified);
  const open = leads.filter(l => l.status && l.status !== 'completed');
  const today = new Date().toDateString();
  const todayLeads = leads.filter(l => l.joined && new Date(l.joined).toDateString() === today);
  const todayCompleted = completed.filter(l => l.completedAt && new Date(l.completedAt).toDateString() === today);

  await ctx.editMessageText(
    `📊 *MONEYMOVE DASHBOARD*\n\n📅 ${new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}\n\n` +
    `👥 Leads: ${totalLeads} | Heute neu: ${todayLeads.length}\n✅ Fertig: ${completed.length} (heute: ${todayCompleted.length})\n🔒 Verifiziert: ${verified.length}\n⏳ Wartend: ${pending.length}\n📝 Offen: ${open.length}\n📈 Conversion: ${totalLeads ? Math.round(verified.length/totalLeads*100) : 0}%`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔄 Refresh', 'admin_dash')]]) }
  );
});

bot.action('admin_list', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  if (!leads.length) return ctx.editMessageText('❌ Keine Leads.', { ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_dash')]]) });
  let msg = `👥 *ALLE LEADS (${leads.length})*\n\n`;
  [...leads].reverse().slice(0,20).forEach((l,i) => {
    const s = l.verified ? '✅' : l.status === 'completed' ? '⏳' : '📝';
    msg += `${i+1}. ${s} ${l.name}${l.username ? ' @'+l.username : ''}${l.uid ? '\n   🆔 '+l.uid : ''}\n   📍 ${l.status} | ${new Date(l.joined).toLocaleDateString('de-DE')}\n\n`;
  });
  await ctx.editMessageText(msg, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_dash')]]) });
});

bot.action('admin_verify', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  const pending = leads.filter(l => l.status === 'completed' && !l.verified);
  if (!pending.length) return ctx.editMessageText('✅ Alle verifiziert!', { ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_dash')]]) });
  let msg = `✅ *ZU VERIFIZIEREN (${pending.length})*\n\nTippe: /verify name/uid\n\n`;
  pending.forEach((l,i) => { msg += `${i+1}. ${l.name}${l.uid ? ' ('+l.uid+')' : ''}\n   🆔 TG: \`${l.id}\`\n\n`; });
  const btns = pending.slice(0,5).map(l => [Markup.button.callback(`✅ ${l.name}`, `v_${l.id}`)]);
  btns.push([Markup.button.callback('🔙', 'admin_dash')]);
  await ctx.editMessageText(msg, { parse_mode:'Markdown', ...Markup.inlineKeyboard(btns) });
});

bot.action(/v_(.+)/, async (ctx) => {
  await ctx.answerCbQuery('✅');
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  const userId = ctx.match[1], user = users[userId];
  if (!user) return;
  if (user.verified) return ctx.editMessageText(`⚠️ Bereits verifiziert.`, { ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_verify')]]) });
  user.verified = true; user.verifiedAt = new Date().toISOString();
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) { leads[idx].verified = true; leads[idx].verifiedAt = user.verifiedAt; }
  save();
  await ctx.editMessageText(`✅ *${user.name} verifiziert!*`, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_verify')]]) });
  try { await bot.telegram.sendMessage(userId, `🎉 *Verifiziert!* Gruppen-Links folgen.`, {parse_mode:'Markdown'}); } catch(e){}
});

bot.command('verify', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const args = ctx.message.text.split(' ').slice(1);
  if (!args.length) return ctx.reply('/verify <uid/username>');
  const q = args[0].replace('@','');
  let userId = Object.keys(users).find(id => users[id].uid === q) || Object.keys(users).find(id => users[id].username === q) || (users[q] ? q : null);
  if (!userId || !users[userId]) return ctx.reply('❌ Nicht gefunden.');
  if (users[userId].verified) return ctx.reply(`⚠️ Bereits verifiziert.`);
  users[userId].verified = true; users[userId].verifiedAt = new Date().toISOString();
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) { leads[idx].verified = true; leads[idx].verifiedAt = users[userId].verifiedAt; }
  save();
  await ctx.reply(`✅ *${users[userId].name} verifiziert!*`, { parse_mode:'Markdown' });
  try { await bot.telegram.sendMessage(userId, `🎉 *Verifiziert!*`, {parse_mode:'Markdown'}); } catch(e){}
});

bot.action('admin_pending', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  const pending = leads.filter(l => l.status === 'completed' && !l.verified);
  const offen = leads.filter(l => l.status && l.status !== 'completed');
  
  const messages = [
    'Hey! Hast du Probleme bei der Registrierung? Brauchst du Hilfe?',
    'Hab ich dich nicht ganz ueberzeugt? Was kann ich dir noch zeigen?',
    'Kleiner Reminder: Dein Zugang wartet auf dich! Noch Fragen?',
    'Hey, mochtest du weitermachen wo wir aufgehoert haben?',
    'Kein Druck! Aber falls du Hilfe brauchst, ich bin da.',
    'Hast du fragen zum Indikator oder zu VT Markets?',
    'Dein Platz in der Gruppe ist reserviert. Fehlt nur noch ein Schritt!',
    'Soll ich dir nochmal zeigen was dich erwartet?'
  ];
  
  let gesendet = 0;
  for (const l of offen) {
    try {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      await bot.telegram.sendMessage(l.id, msg);
      gesendet++;
      await new Promise(r => setTimeout(r, 1000));
    } catch(e) {}
  }
  
  let antwort = `📬 *NACHRICHTEN GESENDET*\n\n`;
  antwort += `${gesendet} von ${offen.length} offenen Leads benachrichtigt.\n\n`;
  if (pending.length) antwort += `${pending.length} warten auf Verifizierung (sind fertig).`;
  
  await ctx.editMessageText(antwort, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Dashboard', 'admin_dash')]]) });
});

bot.action('admin_export', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  const v = leads.filter(l => l.verified);
  if (!v.length) return ctx.editMessageText('Keine verifizierten.');
  let csv = 'Name,Username,VT_UID,Telegram_ID,Verified_At\n';
  v.forEach(l => { csv += `"${l.name}","${l.username}","${l.uid || ''}","${l.id}","${l.verifiedAt || ''}"\n`; });
  const file = path.join(DB_DIR, `export_${Date.now()}.csv`);
  fs.writeFileSync(file, csv);
  await ctx.replyWithDocument({ source: file }, { caption: `📁 ${v.length} Kunden` });
});

// =====================================================================
// ADMIN NACHRICHT AN LEAD
// =====================================================================
bot.command('msg', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) return ctx.reply('Nutze: /msg <telegram_id> <nachricht>');
  
  const targetId = args[0];
  const msg = args.slice(1).join(' ');
  
  try {
    await bot.telegram.sendMessage(targetId, `💬 *MoneyMove*\n\n${msg}`, { parse_mode: 'Markdown' });
    await ctx.reply(`✅ Nachricht gesendet an ${targetId}`);
  } catch(e) {
    await ctx.reply(`❌ Konnte nicht senden. User hat Bot blockiert oder ID falsch: ${e.message}`);
  }
});

// =====================================================================
// USER ONBOARDING
// =====================================================================
bot.start(async (ctx) => {
  const user = ctx.from, userId = uid(ctx);
  if (!users[userId]) {
    users[userId] = { id: userId, name: user.first_name, username: user.username || 'keiner', step: 0, joined: new Date().toISOString() };
    leads.push({ id: userId, name: user.first_name, username: user.username || 'keiner', status: 'started', joined: new Date().toISOString() });
    save();
    adminNotify(`🆕 Neuer Lead: ${user.first_name} (@${user.username || 'keiner'})
🆔 ID: ${userId}
💬 Schreib ihm direkt: /msg ${userId} Hallo`);
  }
  await ctx.reply(`Hey ${user.first_name}! 👋

Stell dir vor, du oeffnest den Chart und siehst sofort wo der Kurs als naechstes hingeht.

Kein Raten. Kein Bauchgefuehl. Nur klare Zonen.

Hier bei MoneyMove bekommst du genau das - und zwar komplett kostenlos.

Soll ich dir zeigen wie?`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🚀 Zeig mir!', 'step1')],[Markup.button.callback('❓ Erstmal verstehen', 'about')]]) }
  );
});

bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(`Weisst du warum 90% der Trader Geld verlieren?

Nicht weil sie schlecht sind. Sondern weil ihnen die richtigen Werkzeuge fehlen.

MoneyMove gibt dir genau das:

🚀 Einen Indikator, der dir zeigt WO die Institutionen einsteigen
🎯 Signale mit klaren Zielen - kein Interpretationsspielraum
👥 Eine Community die den gleichen Weg geht

Das alles kostenlos. Klingt gut?

Dann lass uns loslegen!`, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🚀 Ja, los!', 'step1')]]) });
});

bot.action('step1', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 1; updateLead(uid(ctx), 'step1'); save();
  await ctx.reply(`Ich zeig dir kurz was dich erwartet.

Die meisten Trader haben 10 Indikatoren offen und wissen trotzdem nicht wann sie kaufen sollen.

Wir machen es anders:

📊 EIN Indikator - Gold Structure v1.1 - der dir genau zeigt:
• Wo die Institutionen ihre Aufträge platzieren
• Wo die Liquidität liegt (da geht der Kurs hin)
• Wo dein Stop-Loss sein MUSS

📡 Taeglich bekommst du fertige Signale:
• Einstiegskurs
• Stop-Loss
• 2 Take-Profit Ziele

🎥 Und das beste: Du siehst uns live im Trade.
Jeden Fehler. Jeden Gewinn. Nichts wird versteckt.

Alles kostenlos. Wir wollen nur eins: Dass du lernst.

Klingt fair?`, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Absolut fair!', 'step2')]]) });
});

bot.action('step2', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 2; updateLead(uid(ctx), 'registration'); save();
  await ctx.reply(`Fast geschafft! Nur noch ein Schritt bevor ich dich freischalte.

Wir arbeiten mit VT Markets zusammen - einem der top regulierten Broker.

Wichtig: Du musst DIESEN Link nutzen und unten den Code eingeben, sonst landest du nicht in unserem System:

Code: *${VT_CODE}*

${VT_LINK}

Nach der Registrierung gehts direkt weiter zu Schritt 3!`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('🔗 JETZT REGISTRIEREN', VT_LINK)],[Markup.button.callback('✅ Bin registriert!', 'step3')]]) });
});

bot.action('step3', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 3; updateLead(uid(ctx), 'deposit'); save();
  adminNotify(`✅ Registriert: ${users[uid(ctx)].name}`);
  await ctx.reply(`Jetzt kommt der wichtigste Schritt.

VT Markets muss wissen dass du echt bist. Deshalb:

1️⃣ Lade deinen Ausweis hoch (Verifizierung)
2️⃣ Zahl 100$ ein (mehr geht immer, aber 100$ reichen zum Start)

Sobald das Geld auf deinem Konto ist, schalte ich dich frei:
✅ Gold Structure v1.1 Indikator
✅ Signal-Gruppe
✅ Livestreams
✅ Community

Melde dich einfach wenns erledigt ist!`, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Geld ist drauf!', 'step4')]]) });
});

bot.action('step4', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 4; updateLead(uid(ctx), 'waiting_uid'); save();
  adminNotify(`💰 Eingezahlt: ${users[uid(ctx)].name}`);
  await ctx.reply(`Du bist fast drin! 🎉

Jetzt brauche ich noch deine VT Markets Account-ID (UID).

👉 Oeffne die VT Markets App
👉 Gehe zu Profil -> Einstellungen
👉 Dort siehst du deine 8-stellige UID

Schick sie mir einfach als Nachricht.

Sobald ich sie habe, schalte ich dich komplett frei!`, { parse_mode:'Markdown' });
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim(), userId = uid(ctx);
  
  // Wenn ein Lead schreibt (aber nicht in Schritt 4), leite an Admin weiter
  if (!users[userId] || users[userId].step !== 4) {
    if (users[userId] && !isAdmin(userId)) {
      for (const a of ADMIN_IDS) {
        try {
          await bot.telegram.sendMessage(a, 
            `💬 *${users[userId].name}* (@${users[userId].username || 'keiner'}):\n${text.substring(0, 500)}\n\nAntworte mit: /msg ${userId} ...`,
            { parse_mode: 'Markdown' }
          );
        } catch(e) {}
      }
    }
    return;
  }
  
  if (!/^[0-9]{6,12}$/.test(text)) return ctx.reply('❌ Bitte 6-12 Zahlen.');
  users[userId].uid = text; users[userId].step = 5; users[userId].completed = true; users[userId].completedAt = new Date().toISOString();
  updateLead(userId, 'completed', { uid: text, completedAt: users[userId].completedAt }); save();
  adminNotify(`🎉 *Kunde:* ${users[userId].name} | UID: ${text}`);
  await ctx.reply(`🔥 DU BIST DRIN! 🎉🎉🎉

UID *${text}* ist registriert und wird in Kuerze freigeschaltet.

Hier nochmal was dich erwartet:

📊 Gold Structure v1.1 - Dein persoenlicher Indikator
📡 Taegliche Signale mit Entry, SL, TP
🎥 Livestreams - schau uns live zu
👥 Community mit gleichgesinnten Tradern

Ich melde mich bei dir sobald alles freigeschaltet ist.

Bis gleich und herzlich willkommen im Team! 🔥`, { parse_mode:'Markdown' });
});

function updateLead(userId, status, extra = {}) {
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) leads[idx] = { ...leads[idx], status, ...extra, updatedAt: new Date().toISOString() };
}

bot.catch((err) => console.error('Bot Error:', err.message));

// === HTTP SERVER für Render ===
const app = express();
app.get('/', (req, res) => res.send('✅ MoneyMove Bot läuft'));
app.get('/health', (req, res) => res.json({ status: 'ok', leads: leads.length, uptime: process.uptime() }));

// Gemeinsamer Start
bot.launch();
app.listen(PORT, () => {
  console.log(`🤖 MoneyMove Bot läuft auf Port ${PORT}`);
  console.log(`📊 Daten: ${Object.keys(users).length} User, ${leads.length} Leads`);
});

process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(0); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });
