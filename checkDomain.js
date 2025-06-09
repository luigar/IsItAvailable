const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const DOMAIN = process.env.DOMAIN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const INTERVAL_MINUTES = parseInt(process.env.CHECK_INTERVAL_MINUTES || "10", 10);

const WHOIS_COMMAND = `whois ${DOMAIN}`;
const WHOIS_FILE = "./whois_last_status.txt";

console.log(`[INIT] Domain: ${DOMAIN}`);
console.log(`[INIT] Telegram Chat ID: ${TELEGRAM_CHAT_ID}`);
console.log(`[INIT] Interval: ${INTERVAL_MINUTES} minute(s)`);
console.log(`[INIT] Telegram Bot Token (partial): ${TELEGRAM_BOT_TOKEN.slice(0, 8)}...`);

function parseDomainAvailability(output) {
    const lower = output.toLowerCase();
    
    // Check for phrases that indicate it's NOT available
    if (
        lower.includes("creation date") ||
        lower.includes("expiry date") ||
        lower.includes("pendingdelete") ||
        lower.includes("clienthold") ||
        lower.includes("registrar:")
    ) {
        return false;
    }

    // Check for clear "not found" messages
    return /no match|not found|no data found|available/i.test(lower);
}

function getLastStatus() {
    try {
        return fs.readFileSync(WHOIS_FILE, "utf8").trim();
    } catch {
        return null;
    }
}

function saveLastStatus(status) {
    fs.writeFileSync(WHOIS_FILE, status, "utf8");
}

async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
    };

    try {
        const res = await axios.post(url, payload);
        if (res.status === 200) {
            console.log(`[✅] Telegram notification sent successfully.`);
        } else {
            console.error(`[❌] Telegram send failed.`, res.data);
        }
    } catch (error) {
        console.error("[❌] Telegram send error:", error.message);
    }
}

function checkDomain() {
    console.log(`[CHECK] Checking domain: ${DOMAIN}`);
    exec(WHOIS_COMMAND, async (error, stdout, stderr) => {
        if (error) {
            console.error(`[ERROR] WHOIS command failed: ${error.message}`);
            return;
        }

        const rawOutput = stdout || stderr;
        console.log(`[WHOIS] Raw WHOIS output:\n${rawOutput}`);

        const isAvailable = parseDomainAvailability(rawOutput);
        const previousStatus = getLastStatus();
        const currentStatus = isAvailable ? "available" : "taken";

        if (currentStatus !== previousStatus) {
            saveLastStatus(currentStatus);
            if (isAvailable) {
                console.log(`[🚨] Domain is NOW AVAILABLE: ${DOMAIN}`);
                await sendTelegramMessage(`✅ 🚨 Domain AVAILABLE: ${DOMAIN}\nRegister ASAP!`);
            } else {
                console.log(`[ℹ️] Domain is now marked as taken: ${DOMAIN}`);
                await sendTelegramMessage(`❌ Domain ${DOMAIN} is now marked as taken.`);
            }
        } else {
            console.log(`[✓] No change in domain status (${currentStatus}).`);
        }
    });
}

// Initial check and interval setup
checkDomain();
setInterval(checkDomain, INTERVAL_MINUTES * 60 * 1000);
