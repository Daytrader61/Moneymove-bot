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
  const open = leads.filter(l => l.status && l.status !== 'completed');
  let msg = '';
  if (pending.length) { msg += `⏳ *WARTEND (${pending.length})*\n\n`; pending.slice(0,15).forEach((l,i) => { msg += `${i+1}. ${l.name}${l.uid ? ' ('+l.uid+')' : ''}\n\n`; }); }
  if (open.length) { msg += `\n📝 *OFFEN (${open.length})*\n\n`; open.slice(0,15).forEach((l,i) => { msg += `${i+1}. ${l.name} - ${l.status}\n\n`; }); }
  if (!msg) msg = '🎉 Alles erledigt!';
  await ctx.editMessageText(msg, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🔙', 'admin_dash')]]) });
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
// USER ONBOARDING
// =====================================================================
bot.start(async (ctx) => {
  const user = ctx.from, userId = uid(ctx);
  if (!users[userId]) {
    users[userId] = { id: userId, name: user.first_name, username: user.username || 'keiner', step: 0, joined: new Date().toISOString() };
    leads.push({ id: userId, name: user.first_name, username: user.username || 'keiner', status: 'started', joined: new Date().toISOString() });
    save();
    adminNotify(`🆕 Lead: ${user.first_name}`);
  }
  await ctx.reply(`Hey ${user.first_name}! 👋\n\nWillkommen bei *MoneyMove*! 🚀\n\nIn 5 Schritten zu unseren Trading-Signalen.\n\n💰 VT Markets Partner\n📊 Gold Structure v1.1\n\nBereit?`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🚀 JA!', 'step1')],[Markup.button.callback('❓ Was ist MoneyMove?', 'about')]]) }
  );
});

bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(`*MoneyMove* - Trading-Community\n\n💎 XAUUSD Signale\n💎 Gold Structure v1.1\n💎 VT Markets Partner`, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('🚀 Starten!', 'step1')]]) });
});

bot.action('step1', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 1; updateLead(uid(ctx), 'step1'); save();
  await ctx.reply(`*SCHRITT 1/5: Partner* 🤝\n\nVT Markets – reguliert.\n✅ Schnell\n✅ Günstig\n✅ Ab 50€`, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Weiter', 'step2')]]) });
});

bot.action('step2', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 2; updateLead(uid(ctx), 'registration'); save();
  await ctx.reply(`*SCHRITT 2/5: Registrierung* 📝\n\n1️⃣ Link öffnen\n2️⃣ Code *${VT_CODE}* eingeben\n3️⃣ E-Mail bestätigen\n\n${VT_LINK}`,
    { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.url('🔗 REGISTRIEREN', VT_LINK)],[Markup.button.callback('✅ Registriert!', 'step3')]]) });
});

bot.action('step3', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 3; updateLead(uid(ctx), 'deposit'); save();
  adminNotify(`✅ Registriert: ${users[uid(ctx)].name}`);
  await ctx.reply(`*SCHRITT 3/5: Einzahlung* 💰\n\n1️⃣ ID hochladen\n2️⃣ Einzahlen (100-500€)`, { parse_mode:'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✅ Eingezahlt!', 'step4')]]) });
});

bot.action('step4', async (ctx) => {
  await ctx.answerCbQuery();
  users[uid(ctx)].step = 4; updateLead(uid(ctx), 'waiting_uid'); save();
  adminNotify(`💰 Eingezahlt: ${users[uid(ctx)].name}`);
  await ctx.reply(`*SCHRITT 4/5: UID* 🆔\n\nSchick mir deine VT Markets Account-ID (UID).\n\n👉 App → Profil → Einstellungen\n\n👇 Nur Zahlen:`, { parse_mode:'Markdown' });
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim(), userId = uid(ctx);
  if (!users[userId] || users[userId].step !== 4) return;
  if (!/^[0-9]{6,12}$/.test(text)) return ctx.reply('❌ Bitte 6-12 Zahlen.');
  users[userId].uid = text; users[userId].step = 5; users[userId].completed = true; users[userId].completedAt = new Date().toISOString();
  updateLead(userId, 'completed', { uid: text, completedAt: users[userId].completedAt }); save();
  adminNotify(`🎉 *Kunde:* ${users[userId].name} | UID: ${text}`);
  await ctx.reply(`*WILLKOMMEN!* 🎉\n\nUID *${text}* registriert.\n\nGruppen-Links folgen in Kürze.`, { parse_mode:'Markdown' });
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
