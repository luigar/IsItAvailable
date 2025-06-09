require('dotenv').config();
const whois = require('whois-json');
const axios = require('axios');

const DOMAIN = process.env.DOMAIN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || '10');

console.log(`[INIT] Domain: ${DOMAIN}`);
console.log(`[INIT] Telegram Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`[INIT] Interval: ${CHECK_INTERVAL_MINUTES} minute(s)`);
console.log(`[INIT] Telegram Bot Token (partial): ${TELEGRAM_BOT_TOKEN?.slice(0, 10)}...`);

let interval = null;

async function checkDomain() {
  console.log(`[CHECK] Checking domain: ${DOMAIN}`);
  try {
    const data = await whois(DOMAIN);
    console.log(`[WHOIS] Raw WHOIS data:\n`, data);

    const whoisText = JSON.stringify(data).toLowerCase();
    const domainIsAvailable =
      whoisText.includes("no match for") ||
      whoisText.includes("not found") ||
      whoisText.includes("no data found") ||
      whoisText.includes("available") ||
      whoisText.includes("status: free");

    if (domainIsAvailable) {
      const message = `🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`;
      console.log(`[${new Date().toLocaleString()}] ✅ ${message}`);

      const response = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      });

      if (response.data.ok) {
        console.log(`[✅] Telegram notification sent successfully.`);
      } else {
        console.log(`[❌] Telegram failed:`, response.data);
      }

      clearInterval(interval);
    } else {
      console.log(`[${new Date().toLocaleString()}] ❌ Domain still taken.`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] ⚠️ Error occurred:`);
    if (error.response) {
      console.error(`[HTTP ${error.response.status}]`, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

checkDomain();
interval = setInterval(checkDomain, CHECK_INTERVAL_MINUTES * 60 * 1000);
