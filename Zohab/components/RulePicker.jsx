'use client'

// Rules for a new game: Classic by default. "Customise" opens the Custom rules page, where any rule can change.
// Used by vs Computer, Create Room and the tournament form. value = { rule_set_id } or { custom_rules },
// and it is sent to the server as it is.
import { useLayoutEffect, useState } from 'react'
import { useRuleSets } from '@/lib/lib'
import { CLASSIC_ID, CLASSIC_RULES, ruleSummary, rulesOf, sameRules } from '@/lib/rules'
import CustomRules from './CustomRules.jsx'
import { Icon } from './ui.jsx'

function RulePicker({ value, onChange }) {
  const presets = useRuleSets()
  const [editing, setEditing] = useState(false)

  // Next.js keeps visited pages alive (hidden). Close the Custom rules page when this page is hidden.
  useLayoutEffect(() => () => setEditing(false), [])

  // Classic's values come from the server (so a changed Classic row shows right), with a local fallback
  const classicRow = presets.find((p) => p.rule_set_id === CLASSIC_ID)
  const classic = classicRow ? rulesOf(classicRow) : CLASSIC_RULES
  const custom = value.custom_rules || null
  const preset = presets.find((p) => p.rule_set_id === value.rule_set_id)
  const shown = custom || (preset ? rulesOf(preset) : classic)

  // Rules equal to Classic simply use the Classic preset (no extra "Custom" row on the server).
  function save(rules) {
    setEditing(false)
    onChange(sameRules(rules, classic) ? { rule_set_id: CLASSIC_ID } : { custom_rules: rules })
  }

  return (
    <>
      <div className="lbl">Rules</div>
      <button type="button" className={`rule-card${custom ? ' custom' : ''}`} onClick={() => setEditing(true)}>
        <span className="grow">
          <b>{custom ? '⚙️ Custom rules' : `📜 ${preset?.name || 'Classic'} rules`}</b>
          <span className="rule-sum">{ruleSummary(shown)}</span>
        </span>
        <span className="rule-edit">
          <Icon name="settings" size={16} />
          {custom ? 'Edit' : 'Customise'}
        </span>
      </button>
      {editing && <CustomRules initial={shown} onSave={save} onClose={() => setEditing(false)} />}
    </>
  )
}

export default RulePicker
