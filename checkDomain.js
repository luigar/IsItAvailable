const { exec } = require('child_process');
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

function rawWhois(domain) {
  return new Promise((resolve, reject) => {
    exec(`whois ${domain}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.toString());
      }
    });
  });
}

async function checkDomain() {
  console.log(`[CHECK] Checking domain: ${DOMAIN}`);
  try {
    const whoisText = await rawWhois(DOMAIN);
    console.log(`[WHOIS] Raw WHOIS output:\n${whoisText}`);

    const domainIsAvailable = /no match|not found|no data found|available|status: free/i.test(whoisText);

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
