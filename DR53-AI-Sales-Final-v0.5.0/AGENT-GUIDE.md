# DR53 Agent quick guide

- **Start server:** `./scripts/start.sh`
- **Dashboard:** http://127.0.0.1:3053
- **Start local AI:** `ollama serve` (another Terminal tab); one time: `ollama pull qwen2.5:3b`

Examples you can type:

- `What is the price of Tap Tag Sticker?`
- `Draft a WhatsApp message for Tap Tag Sticker`
- `Write a 30-second sales call script for Tap Tag Card`
- `call +919876543210 about Tap Tag Sticker` — opens native Mac Phone only; consent checkbox must be ticked.
- `create follow-up: Call the customer about the website enquiry` — saves a follow-up task.

For the experimental voice mode, call your own second phone first, return to Chrome after it answers, tick the speech privacy checkbox, and click Start AI Voice Assist. The first line discloses that the speaker is an AI and asks permission to continue. Use Mac speakers/microphone, not headphones. If the test phone cannot hear the AI, stop: Mac Phone does not provide a supported direct voice-agent bridge.
