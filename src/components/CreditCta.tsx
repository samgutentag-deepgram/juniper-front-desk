import { CREDIT_CTA } from '../lib/cta'

export function CreditCta() {
  return (
    <section className="cta" aria-label="Build your own">
      <div>
        <h2>{CREDIT_CTA.headline}</h2>
        <p>{CREDIT_CTA.body}</p>
      </div>
      <a className="btn primary" href={CREDIT_CTA.url} target="_blank" rel="noreferrer">{CREDIT_CTA.label}</a>
    </section>
  )
}
