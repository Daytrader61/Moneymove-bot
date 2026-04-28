const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

// === CONFIG ===
const TOKEN = '8377672944:AAFYLtXlG8AKT39nCmmew5RihH76KuYSMO8';
const VT_LINK = 'https://www.vtmarkets.net/trade-now/?affid=22205599';
const VT_CODE = 'xqUAu3YW';
const ADMIN_IDS = ['7549484475'];
const DB_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const LEADS_FILE = path.join(DB_DIR, 'leads.json');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const load = p => { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e) { const d = p.endsWith('users.json') ? {} : []; fs.writeFileSync(p, JSON.stringify(d)); return d; } };
let users = load(USERS_FILE), leads = load(LEADS_FILE);
const save = () => { fs.writeFileSync(USERS_FILE, JSON.stringify(users,null,2)); fs.writeFileSync(LEADS_FILE, JSON.stringify(leads,null,2)); };
// Immer frische Daten von Disk laden (nach jedem Befehl)
const fresh = () => { users = load(USERS_FILE); leads = load(LEADS_FILE); };

const bot = new Telegraf(TOKEN);
const isAdmin = id => ADMIN_IDS.includes(id.toString());
const uid = ctx => ctx.from.id.toString();
const adminNotify = async msg => { for (const a of ADMIN_IDS) try { await bot.telegram.sendMessage(a, msg, {parse_mode:'Markdown'}); } catch(e){} };

// =====================================================================
// ADMIN DASHBOARD
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
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👥 Alle Leads', 'admin_list')],
        [Markup.button.callback('✅ Verifizieren', 'admin_verify')],
        [Markup.button.callback('⏳ Wartende', 'admin_pending')],
        [Markup.button.callback('📤 Export', 'admin_export')],
        [Markup.button.callback('🔄 Aktualisieren', 'admin_dash')]
      ])
    }
  );
});

// Dashboard refreshen – neue Nachricht statt bot.commands.get
bot.action('admin_dash', async (ctx) => {
  await ctx.answerCbQuery('🔄');
  fresh();
  // Sende komplett neues Dashboard
  const totalLeads = leads.length;
  const completed = leads.filter(l => l.status === 'completed');
  const verified = leads.filter(l => l.verified);
  const pending = leads.filter(l => l.status === 'completed' && !l.verified);
  const open = leads.filter(l => l.status && l.status !== 'completed');
  const today = new Date().toDateString();
  const todayLeads = leads.filter(l => l.joined && new Date(l.joined).toDateString() === today);
  const todayCompleted = completed.filter(l => l.completedAt && new Date(l.completedAt).toDateString() === today);

  await ctx.editMessageText(
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
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('👥 Alle Leads', 'admin_list')],
        [Markup.button.callback('✅ Verifizieren', 'admin_verify')],
        [Markup.button.callback('⏳ Wartende', 'admin_pending')],
        [Markup.button.callback('📤 Export', 'admin_export')],
        [Markup.button.callback('🔄 Aktualisieren', 'admin_dash')]
      ])
    }
  );
});

// =====================================================================
// ALLE LEADS ANZEIGEN – einfach, ohne Paginierung
// =====================================================================
bot.action('admin_list', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  
  if (leads.length === 0) {
    return ctx.editMessageText('❌ Noch keine Leads.', { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Zurück', 'admin_dash')]]) });
  }
  
  let msg = `👥 *ALLE LEADS (${leads.length})*\n\n`;
  const sorted = [...leads].reverse();
  sorted.slice(0, 20).forEach((l, i) => {
    const s = l.verified ? '✅' : l.status === 'completed' ? '⏳' : '📝';
    msg += `${i+1}. ${s} ${l.name}`;
    if (l.username) msg += ` @${l.username}`;
    if (l.uid) msg += `\n   🆔 \`${l.uid}\``;
    msg += `\n   📍 ${l.status || 'started'} | ${new Date(l.joined).toLocaleDateString('de-DE')}\n\n`;
  });
  if (sorted.length > 20) msg += `... und ${sorted.length - 20} weitere\n`;
  
  await ctx.editMessageText(msg, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Dashboard', 'admin_dash')]])
  });
});

// =====================================================================
// VERIFIZIEREN
// =====================================================================
bot.action('admin_verify', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  
  // Nur fertige, noch nicht verifizierte
  const pending = leads.filter(l => l.status === 'completed' && !l.verified);
  
  if (pending.length === 0) {
    return ctx.editMessageText('✅ Alle fertigen Kunden sind bereits verifiziert!', {
      parse_mode:'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Dashboard', 'admin_dash')]])
    });
  }
  
  let msg = `✅ *ZU VERIFIZIEREN (${pending.length})*\n\n`;
  msg += `Tippe: \`/verify name, uid oder @username\`\n\n`;
  
  pending.forEach((l, i) => {
    msg += `${i+1}. ${l.name}`;
    if (l.username) msg += ` (@${l.username})`;
    if (l.uid) msg += `\n   🆔 VT: \`${l.uid}\``;
    msg += `\n   🆔 TG: \`${l.id}\`\n\n`;
  });
  
  // Buttons für die ersten 5
  const buttons = pending.slice(0, 5).map(l => {
    const label = `✅ ${l.name}${l.uid ? ' ('+l.uid+')' : ''}`;
    return [Markup.button.callback(label, `v_${l.id}`)];
  });
  buttons.push([Markup.button.callback('🔙 Dashboard', 'admin_dash')]);
  
  await ctx.editMessageText(msg, { parse_mode:'Markdown', ...Markup.inlineKeyboard(buttons) });
});

// Verify per Button
bot.action(/v_(.+)/, async (ctx) => {
  await ctx.answerCbQuery('✅ Verifiziere...');
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  const userId = ctx.match[1];
  const user = users[userId];
  if (!user) return ctx.editMessageText('❌ User nicht gefunden.', { ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_verify')]]) });
  
  if (user.verified) {
    return ctx.editMessageText(`⚠️ ${user.name} @${user.username} ist bereits verifiziert.`, { ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Zu Verifizieren', 'admin_verify')]]) });
  }
  
  user.verified = true;
  user.verifiedAt = new Date().toISOString();
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) { leads[idx].verified = true; leads[idx].verifiedAt = user.verifiedAt; leads[idx].uid = user.uid; }
  save();
  
  await ctx.editMessageText(
    `✅ *VERIFIZIERT!*\n\n👤 ${user.name}\n📱 @${user.username}\n🆔 VT: \`${user.uid || '-'}\``,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Zu Verifizieren', 'admin_verify')]]) }
  );
  
  // User benachrichtigen
  try { await bot.telegram.sendMessage(userId, `🎉 *VERIFIZIERT!* Du bist offiziell im Team! Gruppen-Links folgen in Kürze.`, {parse_mode:'Markdown'}); } catch(e){}
});

// Verify per Command
bot.command('verify', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const args = ctx.message.text.split(' ').slice(1);
  if (args.length === 0) return ctx.reply('Tippe: /verify <name, uid, @username>');
  
  const q = args[0].replace('@','');
  let userId = Object.keys(users).find(id => users[id].uid === q);
  if (!userId) userId = Object.keys(users).find(id => users[id].username === q);
  if (!userId && users[q]) userId = q;
  
  if (!userId || !users[userId]) return ctx.reply('❌ Nicht gefunden.');
  
  if (users[userId].verified) return ctx.reply(`⚠️ ${users[userId].name} ist bereits verifiziert.`);
  
  users[userId].verified = true;
  users[userId].verifiedAt = new Date().toISOString();
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) { leads[idx].verified = true; leads[idx].verifiedAt = users[userId].verifiedAt; leads[idx].uid = users[userId].uid; }
  save();
  
  await ctx.reply(`✅ *${users[userId].name} verifiziert!*`, { parse_mode:'Markdown' });
  try { await bot.telegram.sendMessage(userId, `🎉 *VERIFIZIERT!* Du bist offiziell im Team!`, {parse_mode:'Markdown'}); } catch(e){}
});

// =====================================================================
// WARTENDE ANZEIGEN
// =====================================================================
bot.action('admin_pending', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();
  const pending = leads.filter(l => l.status === 'completed' && !l.verified);
  const open = leads.filter(l => l.status && l.status !== 'completed');
  
  let msg = '';
  if (pending.length) {
    msg += `⏳ *WARTEND AUF VERIFIZIERUNG (${pending.length})*\n\n`;
    pending.slice(0, 15).forEach((l,i) => {
      msg += `${i+1}. ${l.name}`;
      if (l.username) msg += ` @${l.username}`;
      if (l.uid) msg += `\n   🆔 \`${l.uid}\``;
      msg += '\n\n';
    });
  }
  if (open.length) {
    msg += `\n📝 *IN BEARBEITUNG (${open.length})*\n\n`;
    open.slice(0, 15).forEach((l,i) => {
      msg += `${i+1}. ${l.name} @${l.username}\n   📍 ${l.status}\n\n`;
    });
  }
  if (!msg) msg = '🎉 Alles erledigt!';
  
  await ctx.editMessageText(msg, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Dashboard', 'admin_dash')]]) });
});

// =====================================================================
// EXPORT
// =====================================================================
bot.action('admin_export', async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) return;
  fresh();  
  const v = leads.filter(l => l.verified);
  if (v.length === 0) return ctx.editMessageText('Noch keine verifizierten Kunden.', { ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_dash')]]) });
  
  let csv = 'Name,Username,VT_UID,Telegram_ID,Verified_At\n';
  v.forEach(l => { csv += `"${l.name}","${l.username}","${l.uid || ''}","${l.id}","${l.verifiedAt || ''}"\n`; });
  
  const file = path.join(DB_DIR, `export_${Date.now()}.csv`);
  fs.writeFileSync(file, csv);
  await ctx.replyWithDocument({ source: file }, { caption: `📁 ${v.length} Kunden exportiert` });
});

// =====================================================================
// SEARCH
// =====================================================================
bot.command('search', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  const q = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
  if (!q) return ctx.reply('Tippe: /search <name, uid, username>');
  
  const results = leads.filter(l => 
    l.name?.toLowerCase().includes(q) || 
    l.username?.toLowerCase().includes(q) || 
    l.uid?.includes(q) ||
    l.id?.includes(q)
  );
  
  if (!results.length) return ctx.reply('❌ Nichts gefunden.');
  
  let msg = `🔍 *GEFUNDEN (${results.length})*\n\n`;
  results.slice(0, 20).forEach((l, i) => {
    const s = l.verified ? '✅' : '📝';
    msg += `${i+1}. ${s} ${l.name} @${l.username}\n`;
    if (l.uid) msg += `   🆔 \`${l.uid}\`\n`;
    msg += `   📍 ${l.status}\n\n`;
  });
  
  await ctx.reply(msg, { parse_mode:'Markdown' });
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
    adminNotify(`🆕 *Neuer Lead:* ${user.first_name}`);
  }

  await ctx.reply(
    `Hey ${user.first_name}! 👋\n\nWillkommen bei *MoneyMove*! 🚀\n\nIn 5 Schritten bekommst du Zugang zu unseren exklusiven Trading-Signalen.\n\n💰 Partner: VT Markets\n📊 Indikator: Gold Structure v1.1\n\nBereit?`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.callback('🚀 JA, LOS GEHTS!', 'step1')],
      [Markup.button.callback('❓ Was ist MoneyMove?', 'about')]
    ])}
  );
});

bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `*MoneyMove* - High-Performance Trading-Community\n\n💎 Präzise XAUUSD Signale\n💎 Gold Structure v1.1 Indikator\n💎 VT Markets Partner\n\nIn 5 Schritten dabei! 🚀`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🚀 Starten!', 'step1')]]) }
  );
});

bot.action('step1', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 1; updateLead(uid(ctx), 'step1'); save();
  await ctx.reply(
    `*SCHRITT 1/5: Partner* 🤝\n\nVT Markets – regulierter Broker.\n✅ Schnelle Execution\n✅ Geringe Spreads\n✅ Einzahlung ab 50€`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Weiter', 'step2')]]) }
  );
});

bot.action('step2', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 2; updateLead(uid(ctx), 'registration'); save();
  
  await ctx.reply(
    `*SCHRITT 2/5: Registrierung* 📝\n\n1️⃣ Link öffnen\n2️⃣ Daten eingeben\n3️⃣ Code *${VT_CODE}* eingeben\n4️⃣ E-Mail bestätigen\n\n${VT_LINK}`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([
      [Markup.button.url('🔗 REGISTRIEREN', VT_LINK)],
      [Markup.button.callback('✅ Registriert!', 'step3')]
    ])}
  );
});

bot.action('step3', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 3; updateLead(uid(ctx), 'deposit'); save();
  adminNotify(`✅ Registriert: ${users[uid(ctx)].name}`);
  
  await ctx.reply(
    `*SCHRITT 3/5: Einzahlung* 💰\n\n1️⃣ Verifizierung (ID) hochladen\n2️⃣ Einzahlen (100-500€ empfohlen)\n\n✅ Danach unten klicken!`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Geld eingezahlt!', 'step4')]]) }
  );
});

bot.action('step4', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 4; updateLead(uid(ctx), 'waiting_uid'); save();
  adminNotify(`💰 Eingezahlt: ${users[uid(ctx)].name}`);
  
  await ctx.reply(
    `*SCHRITT 4/5: UID* 🆔\n\nSchick mir deine VT Markets Account-ID (UID).\n\n👉 App → Profil → Einstellungen\n\n👇 Antworte nur mit der Nummer:`,
    { parse_mode:'Markdown' }
  );
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim(), userId = uid(ctx);
  if (!users[userId] || users[userId].step !== 4) return;
  if (!/^[0-9]{6,12}$/.test(text)) return ctx.reply('❌ Bitte gib nur 6-12 Zahlen ein.');
  
  users[userId].uid = text;
  users[userId].step = 5;
  users[userId].completed = true;
  users[userId].completedAt = new Date().toISOString();
  updateLead(userId, 'completed', { uid: text, completedAt: users[userId].completedAt });
  save();
  
  adminNotify(`🎉 *Neuer Kunde:* ${users[userId].name} | UID: ${text}`);
  
  await ctx.reply(
    `*WILLKOMMEN!* 🎉🚀\n\nUID *${text}* registriert.\n\nWir prüfen die Daten & schicken dir in Kürze die Gruppen-Links.`,
    { parse_mode:'Markdown' }
  );
});

function updateLead(userId, status, extra = {}) {
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) leads[idx] = { ...leads[idx], status, ...extra, updatedAt: new Date().toISOString() };
}

bot.catch((err) => console.error('Bot Error:', err.message));
console.log('🤖 MoneyMove Bot läuft...');
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
