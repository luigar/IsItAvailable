require('dotenv').config();
const { exec } = require('child_process');
const axios = require('axios');

const DOMAIN = process.env.DOMAIN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '10');

async function sendTelegramMessage(text) {
  try {
    const res = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
    });
    console.log('[✅] Telegram notification sent successfully.');
  } catch (err) {
    console.error('[⚠️] Telegram send error:', err.response?.data || err.message);
  }
}

function checkDomainStatus() {
  console.log(`[CHECK] Checking domain: ${DOMAIN}`);

  exec(`whois ${DOMAIN}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[ERROR] WHOIS command failed: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[ERROR] WHOIS stderr: ${stderr}`);
    }

    const whoisOutput = stdout.toLowerCase();

    // Common patterns indicating domain is available
    const availablePatterns = [
      'no match',
      'not found',
      'status: free',
      'status: available',
      'no data found',
      'domain status: available',
      'status: pendingdelete', // Sometimes domains in pending delete are considered available to register soon
      'domain not found',
    ];

    // Check if any availability pattern matches
    const isAvailable = availablePatterns.some((pattern) => whoisOutput.includes(pattern));

    console.log('[WHOIS] Raw WHOIS output:\n', stdout);

    if (isAvailable) {
      console.log(`[${new Date().toLocaleString()}] ✅ 🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`);
      sendTelegramMessage(`🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`).then(() => {
        process.exit(0); // Exit after notifying
      });
    } else {
      console.log(`[${new Date().toLocaleString()}] ❌ Domain is taken or status unknown.`);
    }
  });
}

console.log(`[INIT] Domain: ${DOMAIN}`);
console.log(`[INIT] Telegram Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`[INIT] Interval: ${CHECK_INTERVAL_MINUTES} minute(s)`);
console.log(`[INIT] Telegram Bot Token (partial): ${TELEGRAM_BOT_TOKEN?.slice(0, 10)}...`);

checkDomainStatus();
setInterval(checkDomainStatus, CHECK_INTERVAL_MINUTES * 60 * 1000);
