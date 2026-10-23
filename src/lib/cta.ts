// The call to action. One place, so the promo link, its copy and its attribution change without
// touching the UI.

export const SIGNUP_BASE = 'https://console.deepgram.com/signup'

// Every signup that starts on this page is credited to this page, whatever brought the visitor
// here. Marketing ops owns the allowed values (the dpgr.am shortener validates them), so replace
// these with the approved set rather than inventing new ones. The shape follows the DevRel
// convention: source is the specific thing, medium the category, content the spot on the page.
export const SIGNUP_UTM = {
  utm_source: 'juniper-front-desk',
  utm_medium: 'demo',
  utm_campaign: 'flux-tts-credit',
}

/** Where on the page a signup link sits. Sent as utm_content, so each placement counts on its own. */
export type SignupPlacement = 'cta-band' | 'key-entry'

export function signupUrl(placement: SignupPlacement): string {
  const url = new URL(SIGNUP_BASE)
  for (const [k, v] of Object.entries(SIGNUP_UTM)) url.searchParams.set(k, v)
  url.searchParams.set('utm_content', placement)
  return url.toString()
}

export const CREDIT_CTA = {
  headline: '$500 in Flux TTS credit to build your own',
  body: 'Sign up, grab a key, and run this front desk live in under a minute.',
  label: 'Claim your credit',
}

/** The talk demo on raw Flux sockets, with the latency and end-of-turn stats this page leaves out. */
export const HOLD_PLEASE_URL = 'https://github.com/samgutentag-deepgram/hold-please'
