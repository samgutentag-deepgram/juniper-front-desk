# Juniper Front Desk

**Call a vet clinic's front desk from your browser, break it the ways real callers do, and hear
each fix.**

You just adopted a dog and need a vet. The front desk at Juniper Veterinary Clinic (fictional)
answers, listening with Deepgram Flux and speaking with Flux TTS, on the
[Deepgram Voice Agent API](https://developers.deepgram.com/docs/voice-agent). A guided walkthrough
takes you through three switches that break voice agents on real callers. Say a line with the
switch off, flip it, and say the line again.

Try it now, no install: <https://dg-devrel-juniper-front-desk.fly.dev>

## What it shows

| Switch | Off | On |
|---|---|---|
| Barge-in | It finishes talking no matter what, and you are not heard | It stops mid-sentence and answers your new question |
| Keyterms | "Doctor Gutentag" comes out wrong and the lookup finds nobody | The staff list goes to Flux mid-call and the name lands |
| Smart end of turn | A one-second pause ends your turn, so it answers half a sentence | Flux hears "and, um" is not finished and waits |

Then book a time and hear Flux TTS read back a booking reference and a phone number, in the voice
and tone you pick.

The page has two tabs:

- **Replay, no key.** Recorded Flux TTS audio and real Flux transcripts, made once ahead of time
  with each switch off and on. Anyone can click through it. (Takes vary, so the replay keeps the
  clearest one per switch.)
- **Live, your mic.** The real thing on your own Deepgram key, with your words showing as you
  speak.

## Run it yourself

You need [Node 22](https://nodejs.org) or newer. For the Live tab you also need a Deepgram API key;
[sign up](https://console.deepgram.com/signup) and create one in the console.

1. **Clone the repo.**

   ```bash
   git clone https://github.com/samgutentag-deepgram/juniper-front-desk.git
   cd juniper-front-desk
   ```

2. **Turn on pnpm**, which ships with Node through Corepack.

   ```bash
   corepack enable
   ```

3. **Install the dependencies.**

   ```bash
   pnpm install
   ```

4. **Start it.**

   ```bash
   pnpm dev
   ```

5. **Open <http://localhost:8080>.** The Replay tab works right away. For the Live tab, paste your
   Deepgram key, press **Start the call**, and allow the microphone. Use headphones, or the agent
   hears its own voice through your speakers.

There is no `.env` to fill in. Your key goes from your browser straight to Deepgram, and nothing
stores it.

## How it works

```
your browser ══ one websocket, your key ══▶ Deepgram Voice Agent API
                                            ├─ Flux listens
                                            ├─ Claude Haiku thinks (hosted by Deepgram, no LLM key)
                                            └─ Flux TTS speaks
```

- **The switches change the open call.** Keyterms and end of turn go out as one `UpdateListen`
  message, and voice as `UpdateSpeak`, so nothing reconnects. Barge-in off mutes your mic while
  the agent talks.
- **Live captions are a second stream.** The Voice Agent API reports what you said once your turn
  ends, so the Live tab also sends your mic to Flux speech-to-text directly and shows its partial
  transcripts as you speak.
- **The server only serves the page.** `server.js` is a few lines of Express. It holds no key and
  never sees yours.

## Make it yours

Every setting lives in one of these files:

| To change | Edit |
|---|---|
| Models, voices, the LLM | [`src/lib/agent-config.ts`](src/lib/agent-config.ts) |
| The clinic, its prompt, staff and keyterms | [`src/lib/clinic.ts`](src/lib/clinic.ts) |
| The lines you say and the replies | [`src/lib/script.ts`](src/lib/script.ts) |
| The walkthrough chapters | [`src/lib/guide.ts`](src/lib/guide.ts) |
| What each switch does and says | [`src/lib/toggles.ts`](src/lib/toggles.ts) |
| Colors and fonts | [`src/styles/packs/`](src/styles/packs/) |

Change a line in `script.ts` and the replay is out of date. Rebuild it with your own key (this
needs [ffmpeg](https://ffmpeg.org) installed):

```bash
DEEPGRAM_API_KEY=your-key pnpm exec tsx scripts/render-demo.ts
```

## Check it

```bash
pnpm check && pnpm test
```

To run every switch against the live API with a synthesized caller, no mic needed:

```bash
DEEPGRAM_API_KEY=your-key pnpm exec tsx scripts/smoke.ts
```

## Deploy your own

It runs as one small app on [Fly.io](https://fly.io), with no secrets to set.

1. **Rename the app** in `fly.toml` (`app = "your-app-name"`).
2. **Create it and deploy.**

   ```bash
   fly apps create your-app-name
   fly deploy --remote-only --ha=false
   ```

## Want the numbers?

Latency, end-of-turn confidence and the eager end-of-turn trade are in
[hold-please](https://github.com/samgutentag-deepgram/hold-please), the raw-socket version of this
demo from the Vonage Tech Week talk.

## License

MIT
