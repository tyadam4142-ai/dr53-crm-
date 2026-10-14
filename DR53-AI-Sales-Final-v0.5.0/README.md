# Dynamic Robotics 53 — AI Sales Agent v0.5.0

A local-first Mac CRM with a typed sales assistant, practical CRM actions, free native Mac calling/message handoff, and an **experimental** live voice companion mode. No npm dependencies, ElevenLabs account, Twilio account, or paid API key is required.

## Quick start

1. Install Node.js 18+ from https://nodejs.org/en/download.
2. Extract this ZIP. From Terminal, `cd` into the extracted `dr53-v05` folder.
3. Run `chmod +x setup.sh scripts/start.sh scripts/health-check.sh && ./setup.sh`.
4. Run `./scripts/start.sh`.
5. Open http://127.0.0.1:3053. The AI Sales Agent is the first screen.
6. Keep Terminal open while using it; press Control+C to stop.

## Enable the local AI

Install Ollama from https://ollama.com/download, then run in Terminal:

```bash
ollama pull qwen2.5:3b
ollama serve
```

If `ollama serve` says a server is already running, that's fine. Refresh the dashboard. The text assistant still replies using a limited catalogue-aware fallback if Ollama is unavailable; open-ended reasoning and voice responses need the local model.

## What the agent can do

- Answer typed questions and draft scripts/messages from the product catalogue.
- `call +919876543210 about Tap Tag Sticker` opens the native Mac call handler after you confirm contact permission in the Agent panel. The Phone app still requires you to place/confirm the call.
- `create follow-up: Call customer about Tap Tag Sticker` saves a task in Follow-ups.
- “Draft a WhatsApp message for Tap Tag Sticker” produces a draft. The WhatsApp action opens a prefilled chat, but you must review and press Send.
- Use the left panel to pick a saved customer, open the native call handler, and draft a call script/message.

## Experimental AI Voice Assist (free; not guaranteed)

This mode is a no-provider experiment: it uses the browser's speech-recognition interface for listening, local Ollama for response text, and the browser/OS speech synthesizer for talking. It attempts to use the Mac's speaker and microphone as an acoustic bridge to a native call. Apple does not expose a supported direct API for an external AI assistant to join the Phone app's cellular audio stream. The Mac's echo cancellation/audio routing can prevent the other party from hearing the synthesized voice or the browser from hearing them. So this is **not a reliable production phone agent**, and the app cannot detect that the call was answered.

To test it without risking a customer interaction:

1. Use a second phone that you control and can answer.
2. On the Mac, use built-in speakers and built-in microphone; do not use headphones/AirPods for the test. Make sure Mac Phone input/output are set to the built-in devices if those controls are available.
3. In the Agent panel, enter your own second-phone number and tick the contact-permission checkbox. Click **Open Mac Phone / dial customer**, place/confirm the call, and answer it on the second phone.
4. Return to Chrome while leaving the call connected. Tick the browser speech privacy acknowledgement, then click **Start AI Voice Assist (experimental)**. The assistant identifies itself as AI and asks permission to continue. Say “yes” on the test phone.
5. Check whether the test phone hears the synthesized greeting and whether the agent responds to your spoken answer. If either direction fails, stop the voice assist; the Mac Phone audio path does not support this free workaround reliably.
6. Click **Stop voice assist** when finished and end the phone call in Mac Phone.

Chrome's speech recognition may use online processing for microphone audio. This is clearly noted in the app before starting voice mode. The language model remains local through Ollama; no Gemini/online LLM is required. Do not use the experimental mode with customers unless you have tested both-way audio, disclosed that the speaker is AI, obtained permission to continue, and checked applicable calling/privacy requirements.

## Why there is no “fully automatic free call” toggle

A language model can compose and speak a reply, but it cannot dial or hear a normal cellular call unless the call audio is bridged to it. The built-in Mac Phone app has no supported AI-agent/telephony audio endpoint. A reliable autonomous agent needs a supported telephony/SIP provider or a separate, explicitly configured audio bridge; that may involve charges or additional hardware/software. A free LLM alone does not solve that telephony problem.

## Safety, privacy, and data

- The server listens only on `127.0.0.1`; do not expose it to the internet.
- CRM records are stored locally as JSON in `data/` and are not encrypted. Keep the folder private.
- Contact only people you have permission to contact. The AI must identify itself, honor “stop/no” immediately, and not invent product claims, discounts, or prices.
- Use call/message actions as drafts/hand-offs; this app does not falsely mark a message as sent because WhatsApp/Messages opened.

## Tests

Run `npm test`. The tests use mocked providers/local endpoints and do not make live calls. The voice path requires a real Mac/browser/microphone and must be tested manually on a number you control.
