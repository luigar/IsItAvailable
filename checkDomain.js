require('dotenv').config();
const whois = require('whois-json');
const axios = require('axios');

const DOMAIN = process.env.DOMAIN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '10');

// Debug print of environment variables (omit token in production logs)
console.log(`[INIT] Domain: ${DOMAIN}`);
console.log(`[INIT] Telegram Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`[INIT] Interval: ${CHECK_INTERVAL_MINUTES} minute(s)`);
console.log(`[INIT] Telegram Bot Token (partial): ${TELEGRAM_BOT_TOKEN?.slice(0, 10)}...`);

async function checkDomain() {
  try {
    console.log(`[CHECK] Checking domain: ${DOMAIN}`);
    const data = await whois(DOMAIN);

    const domainIsAvailable =
      Object.keys(data).length === 0 ||
      /No match|NOT FOUND|Available|Status: free/i.test(JSON.stringify(data));

    if (domainIsAvailable) {
      const message = `🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`;
      console.log(`[${new Date().toLocaleString()}] ✅ ${message}`);

      const response = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
        }
      );

      console.log(`[TELEGRAM] Sent successfully:`, response.data);
      process.exit(0);
    } else {
      console.log(`[${new Date().toLocaleString()}] ❌ Domain still taken.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] ⚠️ Error occurred:`);
    if (error.response) {
      console.error(`[HTTP ${error.response.status}]`, error.response.data);
    } else if (error.request) {
      console.error(`[NO RESPONSE]`, error.request);
    } else {
      console.error(`[ERROR MESSAGE]`, error.message);
    }
  }
}

checkDomain();
setInterval(checkDomain, CHECK_INTERVAL_MINUTES * 60 * 1000);
