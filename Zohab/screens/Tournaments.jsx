'use client'

// Tournaments tab (Browse / Mine / Matches) and the create / edit form
// (rules, size up to 64, time per round, and friends to invite straight away).
import { useEffect, useState } from 'react'
import { api, listen } from '@/lib/api'
import RulePicker from '@/components/RulePicker'
import { Btn, Chips, Empty, Field, Header, Icon, Pill, Spinner } from '@/components/ui'
import { formatClock, formatCountdown, formatWhen, useGo, useNow, useSession, useToast } from '@/lib/lib'
import { CLASSIC_ID, rulesOf } from '@/lib/rules'

// Date → value for <input type="datetime-local"> (local time, no seconds).
function toInput(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// How many knockout rounds until one champion is left.
function roundsNeeded(players, perMatch) {
  let left = players
  let rounds = 0
  while (left > 1) {
    left = Math.ceil(left / perMatch)
    rounds += 1
  }
  return rounds
}

const SIZES = [2, 4, 8, 16, 32, 64]
const ROUND_MINUTES = [5, 10, 15, 30] // time for each round: round 2 starts this long after round 1, and so on

// Rules shown in the form: editing keeps the tournament's own (custom rules are edited as custom rules).
function startRules(tournament, ruleSet) {
  if (!tournament) return { rule_set_id: CLASSIC_ID }
  return ruleSet?.is_custom ? { custom_rules: rulesOf(ruleSet) } : { rule_set_id: tournament.rule_set_id }
}

// Creates the tournament, then invites the chosen friends (each gets a live alert and can accept from
// Invitations). Resolves with the tournament and how many invitations were sent.
async function createAndInvite(body, friendIds) {
  const t = await api('/tournaments', 'POST', body)
  const sent = await Promise.all(
    friendIds.map((id) => api(`/tournaments/${t.tournament_id}/invitations`, 'POST', { receiver_id: id }).then(() => true, () => false))
  )
  return { t, invited: sent.filter(Boolean).length }
}

// Used for creating (no tournament) and editing (tournament + its rule set given). A full screen with its own header.
export function TournamentForm({ tournament, ruleSet, onSaved, onCancel }) {
  const toast = useToast()
  const editing = !!tournament
  const [form, setForm] = useState(() => ({
    name: tournament?.name || '',
    description: tournament?.description || '',
    max_participants: tournament?.max_participants || 8,
    players_per_match: tournament?.players_per_match || 2,
    start_time: toInput(tournament ? tournament.start_time : Date.now() + 15 * 60000),
    round_break_minutes: tournament?.round_break_minutes || 10,
    join: true,
  }))
  const [rules, setRules] = useState(() => startRules(tournament, ruleSet)) // { rule_set_id } or { custom_rules }
  const [friends, setFriends] = useState([])
  const [invited, setInvited] = useState([]) // friends to invite when the tournament is created
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Friends can be picked only when creating (the tournament page has "Invite Friends" later).
  useEffect(() => {
    if (!editing) api('/friends').then(setFriends).catch(() => {})
  }, [editing])

  const set = (field) => (value) => setForm({ ...form, [field]: value })
  const toggleFriend = (id) => setInvited(invited.includes(id) ? invited.filter((x) => x !== id) : [...invited, id])
  const rounds = roundsNeeded(form.max_participants, form.players_per_match)
  // An older tournament may use a time that is not in the list: show it too
  const minutes = ROUND_MINUTES.includes(form.round_break_minutes) ? ROUND_MINUTES : [...ROUND_MINUTES, form.round_break_minutes].sort((a, b) => a - b)

  function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const body = { ...form, ...rules, description: form.description.trim() || null }
    const fail = (err) => {
      setError(err.message)
      setBusy(false)
    }
    if (editing) {
      api(`/tournaments/${tournament.tournament_id}`, 'PUT', body).then(onSaved).catch(fail)
      return
    }
    createAndInvite(body, invited)
      .then(({ t, invited: count }) => {
        toast({ emoji: '🏆', title: 'Tournament created!', text: count ? `${count} friend${count > 1 ? 's' : ''} invited` : 'Now invite your friends' })
        onSaved(t)
      })
      .catch(fail)
  }

  return (
    <>
      <Header title={tournament ? 'Edit Tournament' : 'New Tournament'} sub={tournament ? tournament.name : 'You are the organiser'} back={onCancel} />
      <form className="scroll" onSubmit={submit}>
        <div className="glass">
          <Field label="Name" icon="trophy" value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={100} placeholder="Friday Night Cup" required />
          <Field label="Description" icon="file" value={form.description} onChange={(e) => set('description')(e.target.value)} maxLength={255} placeholder="Optional" />
          <Chips label="Players" value={form.max_participants} options={SIZES.map((n) => [n, String(n)])} onChange={set('max_participants')} />
          <Chips
            label="Match format"
            value={form.players_per_match}
            options={[[2, '1 vs 1', 'classic knockout'], [4, '4 players', 'winner advances']]}
            onChange={set('players_per_match')}
          />
          <div className="hint-gold">
            ≈ {rounds} round{rounds === 1 ? '' : 's'} to crown a champion
          </div>
          <RulePicker value={rules} onChange={setRules} />
          <label className="field">
            <span className="lbl">Start time</span>
            <span className="input">
              <Icon name="calendar" size={20} />
              <input type="datetime-local" value={form.start_time} onChange={(e) => set('start_time')(e.target.value)} required />
            </span>
          </label>
          <div className="quick">
            {[[5, '+5 min'], [15, '+15 min'], [60, '+1 hour']].map(([min, label]) => (
              <Btn key={min} v="ghost" size="sm" onClick={() => set('start_time')(toInput(Date.now() + min * 60000))}>
                {label}
              </Btn>
            ))}
          </div>
          <Chips label="Time for each round" value={form.round_break_minutes} options={minutes.map((m) => [m, `${m} min`])} onChange={set('round_break_minutes')} />
          <div className="hint-gold">
            Round 2 starts {form.round_break_minutes} min after round 1, and so on — or earlier when both players are ready.
          </div>
          {!editing && <Chips label="Your role" value={form.join} options={[[true, '🎲 Play too'], [false, '📋 Organise only']]} onChange={set('join')} />}
          {!editing && friends.length > 0 && (
            <>
              <div className="lbl">Invite friends ({invited.length} selected)</div>
              <div className="friend-pills">
                {friends.map((f) => {
                  const on = invited.includes(f.player_id)
                  return (
                    <button key={f.player_id} type="button" className={`friend-pill${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleFriend(f.player_id)}>
                      {on ? '✓ ' : ''}
                      {f.display_name}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {error && <p className="error">{error}</p>}
          <Btn type="submit" v="gold" icon="save" disabled={busy}>
            {editing ? 'Save Changes' : 'Create Tournament'}
          </Btn>
        </div>
      </form>
    </>
  )
}

// The /tournaments/new screen.
export function NewTournament() {
  const go = useGo()
  return <TournamentForm onSaved={(t) => go(`/tournaments/${t.tournament_id}`)} onCancel={() => go('/tournaments')} />
}

// One tournament card in the list.
function TCard({ t, now }) {
  const go = useGo()
  const live = t.status === 'in_progress'
  const start = new Date(t.start_time)
  const when = t.status === 'registration' && start > now ? `Starts in ${formatCountdown(start - now)}` : formatWhen(t.start_time)
  return (
    <button type="button" className={`glass tcard${live ? ' hl-red' : ''}`} onClick={() => go(`/tournaments/${t.tournament_id}`)}>
      <div className="row">
        <span className="cup">🏆</span>
        <div className="grow">
          <b className="card-title">{t.name}</b>
          <div className="small">by @{t.creator_username}</div>
        </div>
        <Pill status={t.status} label={live && t.current_round ? `Live · R${t.current_round}` : undefined} />
      </div>
      <div className="tmeta">
        <div className="row dim">
          <Icon name="swords" size={15} />
          {t.players_per_match === 2 ? '1 vs 1' : '4 players'} · {t.rule_set_name}
        </div>
        <div className="row dim">
          <Icon name="calendar" size={15} />
          {when}
        </div>
      </div>
      <div className="row">
        <Icon name="users" size={15} color="var(--gold)" />
        <div className="mini-bar">
          <i style={{ width: `${(t.participant_count / t.max_participants) * 100}%` }} />
        </div>
        <b className="count">
          {t.participant_count}/{t.max_participants}
        </b>
      </div>
    </button>
  )
}

function Tournaments() {
  const { user } = useSession()
  const go = useGo()
  const registered = user.player_type === 'registered'
  const now = useNow()
  const [tab, setTab] = useState('browse')
  const [all, setAll] = useState(null)
  const [mine, setMine] = useState(null)
  const [matches, setMatches] = useState([])

  useEffect(() => {
    const load = () => {
      api('/tournaments').then(setAll).catch(() => setAll([]))
      if (registered) {
        api('/tournaments/mine').then(setMine).catch(() => setMine([]))
        api('/tournaments/my-matches').then(setMatches).catch(() => {})
      }
    }
    load()
    return listen({ 'tournament:updated': load, 'tournament:match_ready': load, 'tournament:match_started': load })
  }, [registered])

  // Browse = open and live cups, live ones first.
  const browse = all
    ?.filter((t) => t.status === 'registration' || t.status === 'in_progress')
    .sort((a, b) => (a.status === 'in_progress' ? 0 : 1) - (b.status === 'in_progress' ? 0 : 1) || new Date(a.start_time) - new Date(b.start_time))
  const list = tab === 'mine' ? mine : browse

  return (
    <>
      <Header
        title="Tournaments"
        right={
          registered && (
            <Btn v="gold" size="sm" icon="plus" onClick={() => go('/tournaments/new')}>
              Create
            </Btn>
          )
        }
      />
      {registered && (
        <div className="tabs">
          <Chips
            value={tab}
            options={[['browse', 'Browse'], ['mine', 'Mine'], ['matches', `Matches${matches.length ? ` (${matches.length})` : ''}`]]}
            onChange={setTab}
          />
        </div>
      )}
      <div className="scroll">
        {tab === 'matches' ? (
          matches.length === 0 ? (
            <Empty emoji="⚔️">No tournament matches waiting for you.</Empty>
          ) : (
            matches.map((m) => {
              const live = m.status === 'in_progress'
              const left = new Date(m.scheduled_at) - now
              return (
                <button key={m.match_id} type="button" className={`glass tcard ${live ? 'hl-red' : 'hl-gold'}`} onClick={() => go(`/match/${m.match_id}`)}>
                  <div className="row">
                    <b className="grow card-title">{m.tournament_name}</b>
                    <Pill status={live ? 'in_progress' : 'waiting'} />
                  </div>
                  <div className="gold-label mt6">
                    Round {m.round_no} · Match {m.match_no}
                  </div>
                  <div className="dim mt4">
                    {live ? 'Playing now — tap to join!' : left > 0 ? `Starts in ${formatCountdown(left)} (${formatClock(m.scheduled_at)})` : 'Starting now — tap to join!'}
                  </div>
                </button>
              )
            })
          )
        ) : !list ? (
          <Spinner />
        ) : list.length === 0 ? (
          <Empty emoji="🏆">{tab === 'mine' ? 'You have not joined or created a tournament yet.' : 'No open tournaments right now.'}</Empty>
        ) : (
          list.map((t) => <TCard key={t.tournament_id} t={t} now={now} />)
        )}
        {!registered && <p className="small center mt12">Create an account to join or create tournaments.</p>}
      </div>
    </>
  )
}

export default Tournaments
