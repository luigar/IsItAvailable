require('dotenv').config();
const whois = require('whois-json');
const axios = require('axios');

const DOMAIN = process.env.DOMAIN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '10');

let previousStatus = null;

async function sendTelegramMessage(text) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
    });
    console.log('[✅] Telegram notification sent successfully.');
  } catch (error) {
    console.error('[⚠️] Telegram send error:', error.response?.data || error.message);
  }
}

async function checkDomain() {
  try {
    console.log(`[CHECK] Checking domain: ${DOMAIN}`);
    const data = await whois(DOMAIN);

    // Example: check domain availability by presence of certain strings or empty response
    const rawWhois = JSON.stringify(data);
    console.log('[WHOIS] Raw WHOIS output:', rawWhois);

    const domainIsAvailable =
      Object.keys(data).length === 0 ||
      /No match|NOT FOUND|Available|Status: free|pendingDelete/i.test(rawWhois);

    const currentStatus = domainIsAvailable ? 'available' : 'taken';
    console.log(`[WHOIS] Current status: ${currentStatus}`);

    if (previousStatus === null) {
      console.log('[INIT] Saved initial domain status.');
      await sendTelegramMessage(`ℹ️ Domain status check started for ${DOMAIN}. Current status: ${currentStatus}`);
      previousStatus = currentStatus;
      return;
    }

    if (previousStatus !== currentStatus) {
      if (currentStatus === 'available') {
        await sendTelegramMessage(`🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`);
      } else {
        await sendTelegramMessage(`ℹ️ Domain status changed to TAKEN: ${DOMAIN}`);
      }
      previousStatus = currentStatus;
    } else {
      console.log(`[STATUS] No change, domain still ${currentStatus}.`);
    }
  } catch (error) {
    console.error(`[⚠️] Error occurred:`, error.message);
  }
}

console.log(`[INIT] Domain: ${DOMAIN}`);
console.log(`[INIT] Telegram Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`[INIT] Interval: ${CHECK_INTERVAL_MINUTES} minute(s)`);
console.log(`[INIT] Telegram Bot Token (partial): ${TELEGRAM_BOT_TOKEN?.slice(0, 10)}...`);

checkDomain();
setInterval(checkDomain, CHECK_INTERVAL_MINUTES * 60 * 1000);
