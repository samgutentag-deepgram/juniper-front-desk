# Juniper Front Desk

**Call a vet clinic's front desk from your browser, then break it four ways and watch it hold.**

You just adopted a dog and need a vet. The front desk at Juniper Veterinary Clinic (fictional)
answers, listening with Deepgram Flux and speaking with Flux TTS, on the Deepgram Voice Agent API.
Bring your own Deepgram key; there is nothing else to install and no LLM key.

## What to try

1. **Talk over it.** Ask what happens at a first wellness exam and cut in mid-answer. It stops and
   answers what you actually asked.
2. **Say a name it has never heard.** Ask for Doctor Gutentag with clinic vocabulary off, and watch
   the transcript. Flip keyterms on mid-call and say it again. No reconnect.
3. **Book a time.** It reads back a booking reference like `JV-7Q3K` and a phone number, spoken the
   way a person reads them.
4. **Change the voice and tone.** Swap Flux TTS voices live, and pick calm, default or animated
   delivery.

## Run it locally

```bash
make install
pnpm dev
```

Open <http://localhost:8080>, paste a Deepgram API key, and press **Start the call**. Headphones
help: the agent can hear your speakers.

## How it works

```
browser ══ one websocket, your key, Voice Agent API ══▶ Flux (listen)
                                                       Claude Haiku, hosted by Deepgram (think)
                                                       Flux TTS (speak)
```

The server only serves the page. It holds no key and never sees yours. Every setting lives in
[`src/lib/agent-config.ts`](src/lib/agent-config.ts); fork that file to build your own.

## Deploy

Fly.io, one app: `fly deploy`. No secrets to set.

## License

MIT

## Smoke test without a microphone

`DEEPGRAM_API_KEY=... pnpm exec tsx scripts/smoke.ts` synthesizes a caller with Flux TTS and runs
all four beats against the live API.
