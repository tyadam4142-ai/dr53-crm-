# Dynamic Robotics 53 — Native Phone Mode v0.4.0

A local-first CRM that uses the apps you already have on your Mac. The primary contact screen opens the native Phone/FaceTime call handler, Mac Messages, or WhatsApp. There are no ElevenLabs or Twilio credentials required for this mode and no npm packages to install.

## Quick start (Mac)
1. Install Node.js 18+ from https://nodejs.org/en/download.
2. Extract the ZIP.
3. Open Terminal and enter the extracted folder, for example `cd ~/Desktop/dr53-v01`.
4. Run `chmod +x setup.sh scripts/start.sh scripts/health-check.sh && ./setup.sh`.
5. Run `./scripts/start.sh` and open http://127.0.0.1:3053.
6. Keep Terminal open. Press Control+C to stop. Next time, run `./scripts/start.sh` or double-click `Launch DR53 Command Centre.command`.

## Calling and messaging
- **Call using Mac Phone:** enter a customer number and click the button. The app opens `tel:` using macOS. You confirm the call and speak to the customer. On macOS Tahoe 26 the Phone app is available; older setups may use FaceTime or another configured handler.
- **AI call script:** if Ollama is running locally with `qwen2.5:3b`, the app can draft an accurate script from the locally stored catalogue. You speak yourself. It does not hear, interpret, or speak into the live phone call.
- **WhatsApp:** opens a prefilled WhatsApp chat. Review and press Send there.
- **Mac Messages:** copies the message and opens a Messages link; if the app doesn't open directly to the recipient, start a chat to that number, paste the copied text, review it, and press Send.
- **No automatic sending:** opening a call/chat is not proof that a call connected or a message was sent. Call and SMS charges may still apply under your existing mobile plan/carrier. iMessage/WhatsApp may use internet data.

## Set up Mac + iPhone calling
On your iPhone, go to Settings > Apps > Phone > Calls on Other Devices and enable your Mac. Keep Wi-Fi enabled, sign into the same Apple Account on both devices, and make sure FaceTime is configured. Apple reference: https://support.apple.com/en-us/102405

For SMS/MMS/RCS through Messages, set up Text Message Forwarding on the iPhone and sign into Messages on the Mac with the same Apple Account. Apple guide: https://support.apple.com/en-in/guide/messages/ichte16154fb/mac

## Optional local AI drafting
Install Ollama from https://ollama.com/download, then run:

```bash
ollama pull qwen2.5:3b
ollama serve
```

Ollama is optional. Native calls and manually composed messages still work if the local AI is offline.

## Data and testing
- CRM data is saved locally under `data/` as JSON. Keep the folder private; it is not encrypted.
- The local dashboard binds only to `127.0.0.1`, not for public hosting.
- Run `npm test` to run the automated suite. Tests do not make live calls or send messages.
- Only contact customers who have agreed to the follow-up. Follow applicable carrier and commercial communication rules, and stop when anyone opts out.

## Important limitation
Apple's native Phone app relays a cellular call from your iPhone/carrier. It does not expose the call as an AI agent connection. This no-provider version will not autonomously talk to customers. Fully automated live AI speech requires a different integration and audio setup; there is no official free API that turns the Mac Phone app into an autonomous AI caller.
