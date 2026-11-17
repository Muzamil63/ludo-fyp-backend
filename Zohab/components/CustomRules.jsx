'use client'

// "Custom rules" page: the player sets every rule for one game (or tournament), then taps "Use these rules".
// Opened by the Rules card (RulePicker). It covers the whole phone screen, like a page, and hands the rules
// back with onSave(rules); the back button closes it without saving.
import { useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { OverlayContext } from '@/lib/lib'
import { CLASSIC_RULES, ruleSummary } from '@/lib/rules'
import { Btn, Chips, Header } from './ui.jsx'

const ON_OFF = [[1, 'On'], [0, 'Off']] // the server stores on / off as 1 / 0

function CustomRules({ initial, onSave, onClose }) {
  const root = useContext(OverlayContext)
  const [rules, setRules] = useState(initial)
  const set = (field) => (value) => setRules({ ...rules, [field]: value })

  if (!root) return null
  return createPortal(
    <div className="full-panel" role="dialog" aria-modal="true" aria-label="Custom rules">
      <Header title="Custom rules" sub="Set every rule for this game" back={onClose} />
      <div className="scroll">
        <div className="glass">
          <div className="rules-sec">Start &amp; finish</div>
          <Chips label="A token leaves the base on" value={rules.six_to_unlock} options={[[1, 'A 6 only'], [0, 'A 1 or a 6']]} onChange={set('six_to_unlock')} />
          <Chips label="Tokens home to win" value={rules.tokens_to_win} options={[1, 2, 3, 4].map((n) => [n, String(n)])} onChange={set('tokens_to_win')} />
          <Chips label="Time per turn" value={rules.turn_seconds} options={[10, 20, 30, 60].map((s) => [s, `${s}s`])} onChange={set('turn_seconds')} />
        </div>

        <div className="glass mt12">
          <div className="rules-sec">Captures &amp; extra turns</div>
          <Chips label="Capturing" value={rules.capture_enabled} options={ON_OFF} onChange={set('capture_enabled')} />
          <Chips label="Extra turn on a 6" value={rules.extra_turn_on_six} options={ON_OFF} onChange={set('extra_turn_on_six')} />
          <Chips label="Extra turn after a capture" value={rules.extra_turn_on_capture} options={ON_OFF} onChange={set('extra_turn_on_capture')} />
          <Chips label="Extra turn when a token gets home" value={rules.extra_turn_on_home} options={ON_OFF} onChange={set('extra_turn_on_home')} />
        </div>

        <div className="glass mt12">
          <div className="rules-sec">Dice help</div>
          {/* While all my tokens are in base, the N-th try (counted over my own turns) is always a 6; 0 = off */}
          <Chips
            label="A 6 is guaranteed by try (while all tokens are in base)"
            value={rules.tries_when_all_home}
            options={[[3, '3'], [4, '4'], [5, '5'], [0, 'Off']]}
            onChange={set('tries_when_all_home')}
          />
          {/* Lucky-6 on = a 6 gets more likely after 6 rolls without one; off (0) = a completely fair dice */}
          <Chips
            label="Lucky-6 help (no very long waits for a 6)"
            value={rules.six_boost_after ? 1 : 0}
            options={ON_OFF}
            onChange={(on) => set('six_boost_after')(on ? 6 : 0)}
          />
        </div>

        <div className="rules-summary">
          <div className="lbl">Your rules</div>
          <b>{ruleSummary(rules)}</b>
        </div>
        <Btn v="gold" icon="check" onClick={() => onSave(rules)}>
          Use these rules
        </Btn>
        <div className="gap10" />
        <Btn v="ghost" size="md" icon="rotateCcw" onClick={() => setRules(CLASSIC_RULES)}>
          Reset to Classic
        </Btn>
      </div>
    </div>,
    root
  )
}

export default CustomRules
