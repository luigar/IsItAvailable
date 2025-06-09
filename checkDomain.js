require('dotenv').config();
const whois = require('whois-json');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOMAIN = process.env.DOMAIN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '10');

const STATE_FILE = path.resolve(__dirname, 'domain-status.json');

function saveStatus(status) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ status, timestamp: Date.now() }));
}

function loadStatus() {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function sendTelegramMessage(text) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
    });
    console.log('[✅] Telegram notification sent successfully.');
  } catch (err) {
    console.error('[❌] Telegram notification error:', err.message);
  }
}

async function checkDomain() {
  try {
    console.log(`[CHECK] Checking domain: ${DOMAIN}`);
    const rawWhois = await whois(DOMAIN);

    // Convert WHOIS object to raw text for regex searching
    const whoisText = JSON.stringify(rawWhois, null, 2);

    // Determine domain status from WHOIS output
    let currentStatus = 'taken'; // default

    if (/pendingDelete/i.test(whoisText)) {
      currentStatus = 'pendingDelete';
    } else if (/No match|NOT FOUND|Domain not found|Status:\s*free/i.test(whoisText)) {
      currentStatus = 'available';
    }

    console.log(`[WHOIS] Current status: ${currentStatus}`);

    const previous = loadStatus();

    if (!previous) {
      // First run: save current status but don't notify
      saveStatus(currentStatus);
      console.log('[INIT] Saved initial domain status.');
      return;
    }

    if (previous.status !== currentStatus) {
      // Status changed!
      if (currentStatus === 'pendingDelete') {
        await sendTelegramMessage(`⚠️ Domain is now in PENDING DELETE status: ${DOMAIN}\nKeep monitoring closely.`);
      } else if (currentStatus === 'available') {
        await sendTelegramMessage(`🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`);
      } else if (currentStatus === 'taken') {
        await sendTelegramMessage(`ℹ️ Domain is now registered/taken again: ${DOMAIN}`);
      }

      saveStatus(currentStatus);
    } else {
      console.log('[INFO] No status change detected.');
    }
  } catch (error) {
    console.error(`[⚠️] Error occurred: ${error.message}`);
  }
}

console.log(`[INIT] Domain: ${DOMAIN}`);
console.log(`[INIT] Telegram Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`[INIT] Interval: ${CHECK_INTERVAL_MINUTES} minute(s)`);
console.log(`[INIT] Telegram Bot Token (partial): ${TELEGRAM_BOT_TOKEN?.slice(0, 10)}...`);

checkDomain();
setInterval(checkDomain, CHECK_INTERVAL_MINUTES * 60 * 1000);
