const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Configuration
const BOT_TOKEN = '8377672944:AAFYLtXlG8AKT39nCmmew5RihH76KuYSMO8';
const VT_LINK = 'https://www.vtmarkets.net/trade-now/?affid=22205599';
const VT_CODE = 'xqUAu3YW';
const ADMIN_IDS = ['7549484475'];

// Setup data directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database files
const DB_FILE = path.join(dataDir, 'users.json');
const LEADS_FILE = path.join(dataDir, 'leads.json');

// Initialize if not exist
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}', 'utf8');
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf8');

// Load databases
let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
let leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));

// Save functions
function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function saveLeads() {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

// Bot
const bot = new Telegraf(BOT_TOKEN);

// Notify admins
function notifyAdmins(msg) {
  ADMIN_IDS.forEach(id => {
    bot.telegram.sendMessage(id, msg, { parse_mode: 'Markdown' }).catch(() => {});
  });
}

// Start command
bot.start(async (ctx) => {
  const user = ctx.from;
  const userId = user.id.toString();
  
  if (!db[userId]) {
    db[userId] = {
      id: userId,
      name: user.first_name,
      username: user.username,
      step: 0,
      joined: new Date().toISOString()
    };
    saveDb();
    
    leads.push({
      id: userId,
      name: user.first_name,
      username: user.username,
      status: 'started',
      joined: new Date().toISOString()
    });
    saveLeads();
    
    notifyAdmins(`🆕 Neuer Lead: ${user.first_name}`);
  }
  
  await ctx.reply(
    `Hey ${user.first_name}! 👋\n\nWillkommen bei MoneyMove! 🚀\n\nIch begleite dich durch 5 Schritte zum Trading-Erfolg.\n\nBereit?`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Ja, los gehts!', 'step1')]
    ])
  );
});

// Step 1
bot.action('step1', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  
  db[userId].step = 1;
  saveDb();
  
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) leads[idx].status = 'step1';
  saveLeads();
  
  await ctx.reply(
    `*Schritt 1/5: Unser Partner* 🤝\n\nWir arbeiten mit VT Markets - einem regulierten Broker.\n\n✅ Schnelle Trades\n✅ Geringe Spreads\n✅ Gute App\n\nAlles klar?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Weiter zu Schritt 2', 'step2')]
      ])
    }
  );
});

// Step 2
bot.action('step2', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  
  db[userId].step = 2;
  saveDb();
  
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) leads[idx].status = 'step2';
  saveLeads();
  
  await ctx.reply(
    `*Schritt 2/5: Registrierung* 📝\n\n1. Link öffnen\n2. Code: *${VT_CODE}* eingeben\n3. Daten eingeben\n4. E-Mail bestätigen\n\n${VT_LINK}`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('🔗 REGISTRIEREN', VT_LINK)],
        [Markup.button.callback('✅ Fertig registriert!', 'step3')]
      ])
    }
  );
});

// Step 3
bot.action('step3', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  
  db[userId].step = 3;
  saveDb();
  
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) {
    leads[idx].status = 'step3';
    saveLeads();
  }
  
  notifyAdmins(`✅ Registriert: ${db[userId].name}`);
  
  await ctx.reply(
    `*Schritt 3/5: Verifizierung* ✅\n\n1. Verifizieren (ID hochladen)\n2. Einzahlen (100-500€)\n3. Warten bis Geld da ist\n\nSobald das Geld da ist, klick unten!`,
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ Geld ist eingezahlt!', 'step4')]
    ])
  );
});

// Step 4 - UID request
bot.action('step4', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  
  db[userId].step = 4;
  saveDb();
  
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) {
    leads[idx].status = 'step4';
    saveLeads();
  }
  
  notifyAdmins(`💰 Eingezahlt: ${db[userId].name}`);
  
  await ctx.reply(
    `*Schritt 4/5: Deine Account-ID* 🆔\n\nFast geschafft! 💪\n\nSchick mir jetzt deine VT Markets Account-ID (UID).\n\nDie findest du in den Einstellungen deiner App.\n\n👇 Antworte einfach mit der Nummer:`
  );
});

// Handle UID input
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id.toString();
  
  if (!db[userId] || db[userId].step !== 4) {
    return;
  }
  
  // Validate UID
  if (!/^[0-9]{6,12}$/.test(text)) {
    return ctx.reply('Das ist keine gültige UID. Bitte gib nur 6-12 Zahlen ein.');
  }
  
  db[userId].uid = text;
  db[userId].step = 5;
  db[userId].completed = true;
  db[userId].completedAt = new Date().toISOString();
  saveDb();
  
  const idx = leads.findIndex(l => l.id === userId);
  if (idx >= 0) {
    leads[idx].status = 'completed';
    leads[idx].uid = text;
    leads[idx].completedAt = new Date().toISOString();
    saveLeads();
  }
  
  notifyAdmins(
    `🎉 KUNDE FERTIG!\n\nName: ${db[userId].name}\nUsername: @${db[userId].username}\nUID: ${text}\n\n✅ Bereit für Gruppen-Link!`
  );
  
  await ctx.reply(
    `*Perfekt!* 🎉\n\nDeine UID: ${text}\n\n✅ Wir haben deine Daten erhalten!\n\nWir schicken dir die Gruppen-Links in 1-2 Stunden.\n\nWillkommen im Team! 🚀💪`,
    {
      parse_mode: 'Markdown'
    }
  );
});

// Admin commands
bot.command('leads', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id.toString())) return;
  
  const completed = leads.filter(l => l.status === 'completed');
  const active = leads.filter(l => l.status && l.status !== 'completed');
  
  await ctx.reply(
    `📊 Übersicht:\n\n` +
    `✅ Fertig: ${completed.length}\n` +
    `⏳ In Bearbeitung: ${active.length}\n` +
    `📈 Gesamt: ${leads.length}\n\n` +
    `/list - Fertige Kunden\n` +
    `/active - Aktive Leads`
  );
});

bot.command('list', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id.toString())) return;
  
  const completed = leads.filter(l => l.status === 'completed');
  
  if (completed.length === 0) {
    return ctx.reply('Noch keine fertigen Kunden.');
  }
  
  const sorted = completed.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  
  let msg = `✅ FERTIGE KUNDEN (${completed.length}):\n\n`;
  sorted.slice(0, 10).forEach((l, i) => {
    msg += `${i + 1}. ${l.name} (@${l.username})\n   UID: ${l.uid}\n\n`;
  });
  
  await ctx.reply(msg);
});

bot.command('active', async (ctx) => {
  if (!ADMIN_IDS.includes(ctx.from.id.toString())) return;
  
  const active = leads.filter(l => l.status && l.status !== 'completed');
  
  if (active.length === 0) {
    return ctx.reply('Keine aktiven Leads.');
  }
  
  let msg = `⏳ AKTIVE LEADS (${active.length}):\n\n`;
  active.slice(-10).forEach((l, i) => {
    msg += `${i + 1}. ${l.name} (@${l.username})\n   Status: ${l.status}\n\n`;
  });
  
  await ctx.reply(msg);
});

// Error handling
bot.catch((err) => console.error('Bot error:', err));

// Start
console.log('🤖 MoneyMove Bot läuft...');
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
