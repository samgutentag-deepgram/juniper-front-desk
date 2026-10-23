import * as Switch from '@radix-ui/react-switch'
import { TOGGLE_CARDS, TOGGLE_ORDER, type ToggleName, type Toggles } from '../lib/toggles'

const SHORT: Record<ToggleName, string> = { bargeIn: 'Barge-in', keyterms: 'Keyterms', smartEot: 'Turn end' }

/** Phones only: the three switches pinned to the top, so you can flip one and say the line again
 *  without scrolling. The full cards with the before and after sit below the conversation. */
export function SwitchBar({ toggles, current, onChange }: {
  toggles: Toggles
  current: ToggleName | undefined
  onChange: (name: ToggleName, on: boolean) => void
}) {
  return (
    <div className="switch-bar phone-only" role="group" aria-label="Switches">
      {TOGGLE_ORDER.map((name) => (
        <label key={name} className={`chip-switch ${toggles[name] ? 'on' : 'off'}${current === name ? ' current' : ''}`}>
          <span>{SHORT[name]}</span>
          <Switch.Root className="switch small" checked={toggles[name]} onCheckedChange={(on) => onChange(name, on)}
            aria-label={TOGGLE_CARDS[name].title}>
            <Switch.Thumb className="thumb" />
          </Switch.Root>
        </label>
      ))}
    </div>
  )
}
