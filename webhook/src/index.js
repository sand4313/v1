/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TradingView → Telegram Relay  (Cloudflare Worker)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  HOW TO SET THIS UP (step-by-step, no coding experience needed)
 *  ──────────────────────────────────────────────────────────────
 *
 *  STEP 1 — Install Node.js
 *    Download and install Node.js from https://nodejs.org  (choose "LTS")
 *
 *  STEP 2 — Install Wrangler (Cloudflare's deploy tool)
 *    Open a terminal (Command Prompt on Windows, Terminal on Mac) and run:
 *      npm install -g wrangler
 *
 *  STEP 3 — Log in to Cloudflare
 *    Run:  wrangler login
 *    A browser window will open — sign in (free account is fine).
 *
 *  STEP 4 — Install this project's dependencies
 *    In your terminal, navigate to the webhook/ folder and run:
 *      npm install
 *
 *  STEP 5 — Deploy the Worker
 *    Run:  npm run deploy
 *    After it finishes, Wrangler will print a URL like:
 *      https://tv-telegram-relay.<your-subdomain>.workers.dev
 *    Copy that URL — you will need it in TradingView.
 *
 *  STEP 6 — Add your Telegram bot token as a secret
 *    Run:  npx wrangler secret put TELEGRAM_BOT_TOKEN
 *    When prompted, paste:  8730465217:AAH5E2JnbyVpehwoTP8mPJpsY3dyCv5hC-A
 *    Press Enter.
 *
 *  STEP 7 — Find your personal Telegram chat ID
 *    a) Open Telegram and start a chat with your bot (@V1sandtrading_bot)
 *       — send it any message (e.g. "/start")
 *    b) Open this URL in your browser (replace TOKEN with your actual token):
 *       https://api.telegram.org/bot8730465217:AAH5E2JnbyVpehwoTP8mPJpsY3dyCv5hC-A/getUpdates
 *    c) Look for  "chat":{"id": 123456789}  — that number is your chat ID.
 *       (If the result is empty, send another message to the bot and refresh.)
 *
 *  STEP 8 — Add your chat ID as a secret
 *    Run:  npx wrangler secret put TELEGRAM_CHAT_ID
 *    When prompted, paste the number you found in Step 7.
 *    Press Enter.
 *
 *  STEP 9 — Set up the alert in TradingView
 *    a) Add the strategy to a 15m or 1H chart.
 *    b) Right-click the chart → "Add Alert..."
 *    c) Condition: pick "TJR (Public Model)..." → "BSL Sweep"  (or "SSL Sweep")
 *    d) In the "Notifications" tab → enable "Webhook URL"
 *    e) Paste the Worker URL from Step 5 into the Webhook URL field.
 *    f) Leave the message as-is (it auto-fills from alertcondition()).
 *    g) Click "Create".  Repeat for the other sweep alert.
 *
 *  That's it! When a BSL or SSL sweep fires, TradingView will POST the
 *  alert message to your Worker, which instantly forwards it to Telegram.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export default {
  async fetch(request, env) {
    // Only accept POST requests (TradingView sends POST)
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Read the alert message TradingView sent
    const text = await request.text();

    // Only forward SW sweep alerts — ignore anything else
    const isSweepAlert =
      text.includes('SW↑') ||
      text.includes('SW↓') ||
      text.includes('BSL Sweep') ||
      text.includes('SSL Sweep');

    if (!isSweepAlert) {
      return new Response('Ignored: not a sweep alert', { status: 200 });
    }

    // Build Telegram API URL using the bot token stored as a secret
    const telegramUrl =
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    // Send the message to your Telegram chat
    const res = await fetch(telegramUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    env.TELEGRAM_CHAT_ID,
        text:       text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status:  res.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
