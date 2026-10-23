import { CREDIT_CTA, HOLD_PLEASE_URL, signupUrl } from '../lib/cta'

export function CreditCta() {
  return (
    <section className="cta" aria-label="Build your own">
      <div>
        <h2>{CREDIT_CTA.headline}</h2>
        <p>
          {CREDIT_CTA.body} Latency numbers: <a href={HOLD_PLEASE_URL} target="_blank" rel="noreferrer">build it on raw sockets with hold-please</a>.
          {' '}<span className="muted">Juniper is fictional; live calls bill to your project.</span>
        </p>
      </div>
      <a className="btn primary" href={signupUrl('cta-band')} target="_blank" rel="noreferrer">{CREDIT_CTA.label}</a>
    </section>
  )
}
