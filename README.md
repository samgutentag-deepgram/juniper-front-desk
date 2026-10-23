# Juniper Front Desk

**Call a vet clinic's front desk from your browser, then break it four ways and watch it hold.**

You just adopted a dog and need a vet. The front desk at Juniper Veterinary Clinic (fictional)
answers, listening with Deepgram Flux and speaking with Flux TTS, on the Deepgram Voice Agent API.
Bring your own Deepgram key; there is nothing else to install and no LLM key.

## What to try

A guided walkthrough, one chapter per switch, each an A/B: say the chapter's lines with its switch
off, the guide asks you to flip it, then say them again with it on. Flip back and forth as often as
you like; the transcript marks each run "off" or "on".

| Switch | Off | On |
|---|---|---|
| Barge-in | It finishes talking no matter what, and you are not heard | It stops mid-sentence and answers your new question |
| Keyterms | "Doctor Gutentag" comes out wrong and the lookup finds nobody | The staff list goes to Flux mid-call and the name lands |
| Smart end of turn | A one-second pause ends your turn, so it answers half a sentence | Flux hears "and, um" is not finished and waits |

Then book a time and hear Flux TTS read back a booking reference and a phone number in the voice and
tone you pick.

**No key?** The default tab is a click-through replay. Every line was voiced with Flux TTS and every
caller line transcribed by Flux, once with each switch off and once on, so the before and after are
real output. They are also chosen: TTS takes vary, and for the end-of-turn pair the renderer keeps
the first take where the timer splits the sentence and Flux does not. The first render came out the
other way round. Try the line live before quoting the replay as typical. `scripts/render-demo.ts`
regenerates it.

**Want the numbers?** Latency, end-of-turn confidence and the eager end-of-turn trade live in
[hold-please](https://github.com/samgutentag-deepgram/hold-please), the raw-socket version of this
demo from the Vonage Tech Week talk.

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

Fly.io, one app, `dg-devrel-juniper-front-desk`: `fly deploy`. No secrets to set. Live at
<https://dg-devrel-juniper-front-desk.fly.dev>.

## License

MIT

## Regenerate the replay

```bash
DEEPGRAM_API_KEY=... pnpm exec tsx scripts/render-demo.ts
```

Needs ffmpeg at render time only. Writes `public/demo/*.mp3` and `src/lib/demo-manifest.json`.

## Smoke test without a microphone

`DEEPGRAM_API_KEY=... pnpm exec tsx scripts/smoke.ts` synthesizes a caller with Flux TTS and runs
all four beats against the live API.
