require('dotenv').config();
const whois = require('whois-json');
const axios = require('axios');

const DOMAIN = process.env.DOMAIN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '10');

async function checkDomain() {
  try {
    const data = await whois(DOMAIN);
    const domainIsAvailable =
      Object.keys(data).length === 0 ||
      /No match|NOT FOUND|Available|Status: free/i.test(JSON.stringify(data));

    if (domainIsAvailable) {
      console.log(`[${new Date().toLocaleString()}] ✅ Domain is AVAILABLE: ${DOMAIN}`);

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: `🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`,
      });

      process.exit(0);
    } else {
      console.log(`[${new Date().toLocaleString()}] ❌ Domain still taken.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] ⚠️ Error:`, error.message);
  }
}

checkDomain();
setInterval(checkDomain, CHECK_INTERVAL_MINUTES * 60 * 1000);