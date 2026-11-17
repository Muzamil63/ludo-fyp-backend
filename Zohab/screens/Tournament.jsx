'use client'

// One tournament: my next match, info, join / leave / invite, the creator's controls, the bracket map,
// the schedule of every round, the drawn matches and the players.
import { Fragment, useEffect, useLayoutEffect, useState } from 'react'
import { api, listen } from '@/lib/api'
import InviteSheet from '@/components/InviteSheet'
import TournamentMatches from '@/components/TournamentMatches'
import { Avatar, Btn, Header, Icon, Pill, Spinner } from '@/components/ui'
import { formatCountdown, formatWhen, roundName, useGo, useNow, useSession } from '@/lib/lib'
import { ruleSummary } from '@/lib/rules'
import { TournamentForm } from './Tournaments'

// When a round is played: done, live, its planned time, or "right after" the round before
// (when the planned time has passed but the round is not drawn yet, because the round before ran late).
function roundWhen(round, now) {
  const first = round.matches[0]
  if (round.matches.every((m) => m.status === 'finished')) return 'Done ✓'
  if (round.matches.some((m) => m.status === 'in_progress')) return 'Live now'
  if (!first.match_id && round.round_no > 1 && first.scheduled_at && new Date(first.scheduled_at) < now) return `Right after round ${round.round_no - 1}`
  return first.scheduled_at ? formatWhen(first.scheduled_at) : '—'
}

// The whole tree in numbers, with a button to the full bracket map.
function BracketMapCard({ data, live, onOpen }) {
  const { tournament: t, participants, rounds, total_rounds, preview } = data
  const matchCount = rounds.reduce((n, r) => n + r.matches.length, 0)
  return (
    <div className={`glass mt12${live ? ' hl-gold' : ''}`}>
      <b className="card-head">🗺️ Bracket map</b>
      <div className="dim mt4 mb10">
        {preview ? `Preview for ${t.max_participants} players` : `${participants.length} players`} · {total_rounds} round{total_rounds === 1 ? '' : 's'} · {matchCount}{' '}
        match{matchCount === 1 ? '' : 'es'}
      </div>
      <Btn v="gold" size="md" icon="network" onClick={onOpen}>
        Open full bracket
      </Btn>
    </div>
  )
}

// Every round with its fixed time (round r starts (r - 1) × "time per round" after round 1).
function ScheduleCard({ rounds, totalRounds, now }) {
  return (
    <div className="glass mt12">
      <b className="card-head">🗓️ Schedule</b>
      <div className="gap8" />
      {rounds.map((r) => (
        <div key={r.round_no} className="info-row">
          <span>
            {roundName(r.round_no, totalRounds)} · {r.matches.length} match{r.matches.length === 1 ? '' : 'es'}
          </span>
          <b>{roundWhen(r, now)}</b>
        </div>
      ))}
    </div>
  )
}

function Tournament({ id }) {
  const { user } = useSession()
  const go = useGo()
  const registered = user.player_type === 'registered'
  const now = useNow()
  const [data, setData] = useState(null) // { tournament, rule_set, participants, rounds, total_rounds, preview, champion }
  const [friends, setFriends] = useState([])
  const [editing, setEditing] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Next.js keeps visited pages alive (hidden). Close the form / sheet when this page is hidden.
  useLayoutEffect(
    () => () => {
      setEditing(false)
      setInviting(false)
    },
    []
  )
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = () => api(`/tournaments/${id}`).then(setData).catch((err) => setMessage(err.message))
    load()
    if (registered) api('/friends').then(setFriends).catch(() => {})
    return listen({ 'tournament:updated': (e) => e.tournament_id === id && load() })
  }, [id, registered])

  const reload = () => api(`/tournaments/${id}`).then(setData)

  // Runs a request, shows its error (or okText), then reloads the tournament.
  function act(request, okText = '') {
    setMessage('')
    request
      .then(() => {
        setMessage(okText)
        reload()
      })
      .catch((err) => setMessage(err.message))
  }

  if (!data) {
    return (
      <>
        <Header title="Tournament" back="/tournaments" />
        <div className="scroll center-fill">{message ? <p className="error">{message}</p> : <Spinner />}</div>
      </>
    )
  }

  const { tournament: t, rule_set, participants, rounds, total_rounds, champion } = data
  const isCreator = t.creator_id === user.player_id
  const joined = participants.some((p) => p.player_id === user.player_id)
  const open = t.status === 'registration'
  const live = t.status === 'in_progress'
  const freeFriends = friends.filter((f) => !participants.some((p) => p.player_id === f.player_id))
  const startsIn = new Date(t.start_time) - now

  // `rounds` is the FULL bracket: matches not drawn yet have no match_id. Only the drawn ones can be
  // played or controlled here (the bracket map shows the rest).
  const drawn = rounds.map((r) => ({ ...r, matches: r.matches.filter((m) => m.match_id !== null) })).filter((r) => r.matches.length > 0)

  // My match that is waiting or being played.
  const myMatch = drawn
    .flatMap((r) => r.matches)
    .find((m) => (m.status === 'waiting' || m.status === 'in_progress') && m.seats.some((s) => s.player_id === user.player_id))

  if (editing) {
    return (
      <TournamentForm
        tournament={t}
        ruleSet={rule_set}
        onSaved={() => {
          setEditing(false)
          reload()
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  // [label, value, note under the row]
  const info = [
    ['Format', `${t.players_per_match === 2 ? '1 vs 1' : '4 players'} knockout`],
    ['Rules', t.rule_set_name, rule_set && ruleSummary(rule_set)],
    ['Players', `${t.participant_count} / ${t.max_participants}`],
    ['Starts', formatWhen(t.start_time)],
    open && startsIn > 0 && ['Countdown', formatCountdown(startsIn)],
    live && ['Round', roundName(t.current_round, total_rounds)],
    ['Time per round', `${t.round_break_minutes} min`],
  ].filter(Boolean)

  return (
    <>
      <Header title={t.name} sub={`by @${t.creator_username}${isCreator ? ' (you)' : ''}`} back="/tournaments" right={<Pill status={t.status} />} />
      <div className="scroll">
        {champion && (
          <div className="glass hl-gold center champion">
            <div className="big-emoji">🏆</div>
            <div className="champion-label">CHAMPION</div>
            <div className="champion-av">
              <Avatar player={champion} size={62} ring="var(--gold)" />
            </div>
            <b className="champion-name">{champion.display_name}</b>
          </div>
        )}

        {myMatch && (
          <div className={`glass ${myMatch.status === 'in_progress' ? 'hl-red' : 'hl-gold'} mb12`}>
            <div className="eyebrow-gold">YOUR MATCH · ROUND {myMatch.round_no}</div>
            <div className="my-match-time">
              {myMatch.status === 'in_progress'
                ? 'Live now!'
                : new Date(myMatch.scheduled_at) > now
                  ? formatCountdown(new Date(myMatch.scheduled_at) - now)
                  : 'Starting…'}
            </div>
            <div className="small">Enter the lobby early: the match starts as soon as everyone is there.</div>
            <div className="gap10" />
            <Btn v="gold" size="md" icon="play" onClick={() => go(`/match/${myMatch.match_id}`)}>
              Play Now
            </Btn>
          </div>
        )}

        <div className="glass">
          {t.description && <div className="desc">{t.description}</div>}
          {info.map(([label, value, note]) => (
            <Fragment key={label}>
              <div className="info-row">
                <span>{label}</span>
                <b>{value}</b>
              </div>
              {note && <div className="rules-line">{note}</div>}
            </Fragment>
          ))}
        </div>

        {open && (
          <div className="stack mt12">
            {registered && !joined && (
              <Btn v="gold" size="md" icon="check" onClick={() => act(api(`/tournaments/${id}/register`, 'POST'), 'You joined!')}>
                Join Tournament
              </Btn>
            )}
            {(isCreator || joined) && (
              <Btn size="md" icon="userPlus" onClick={() => setInviting(true)}>
                Invite Friends
              </Btn>
            )}
            {joined && (
              <Btn v="ghost" size="md" icon="logOut" onClick={() => act(api(`/tournaments/${id}/register`, 'DELETE'))}>
                Leave Tournament
              </Btn>
            )}
            {!registered && <p className="small center">Create an account to join tournaments.</p>}
          </div>
        )}

        {message && <p className="notice">{message}</p>}

        {isCreator && (open || live) && (
          <div className="glass mt12">
            <b className="gold-text">👑 Creator controls</b>
            <div className="small mt4 mb10">{open ? 'It starts by itself at the start time, or start it now.' : 'The tournament is running.'}</div>
            {open && (
              <>
                <div className="btn-row">
                  <Btn v="ghost" size="md" icon="edit" onClick={() => setEditing(true)}>
                    Edit
                  </Btn>
                  <Btn v="success" size="md" icon="zap" onClick={() => act(api(`/tournaments/${id}/start`, 'POST'))}>
                    Start now
                  </Btn>
                </div>
                <div className="gap8" />
              </>
            )}
            <Btn v="danger" size="md" icon="xCircle" onClick={() => confirm('Cancel this tournament?') && act(api(`/tournaments/${id}/cancel`, 'POST'))}>
              Cancel Tournament
            </Btn>
          </div>
        )}

        {/* the whole tree (round 1 → final) is on its own page; here: its size and every round's time */}
        {rounds.length > 0 && (
          <>
            <BracketMapCard data={data} live={live} onOpen={() => go(`/tournaments/${id}/bracket`)} />
            <ScheduleCard rounds={rounds} totalRounds={total_rounds} now={now} />
          </>
        )}

        <div className="sec">Matches</div>
        {drawn.length === 0 ? (
          <p className="dim">{open ? 'Matches are drawn when the tournament starts.' : 'No matches were played.'}</p>
        ) : (
          <TournamentMatches tournamentId={id} rounds={drawn} totalRounds={total_rounds} myId={user.player_id} isCreator={isCreator} act={act} />
        )}

        <div className="sec">Players ({participants.length})</div>
        {participants.length === 0 && <p className="dim">No players yet</p>}
        {participants.map((p) => {
          const out = p.status === 'eliminated'
          return (
            <div key={p.player_id} className="list-row">
              <Avatar player={p} size={34} ring={p.status === 'champion' ? 'var(--gold)' : undefined} dim={out} />
              <div className="grow">
                <div className="nm">
                  {p.display_name}
                  {p.player_id === user.player_id ? ' (you)' : ''}
                  {p.player_id === t.creator_id ? ' 👑' : ''}
                </div>
                <div className="un">
                  @{p.username}
                  {out && p.eliminated_round ? ` · out in round ${p.eliminated_round}` : ''}
                </div>
              </div>
              {!open && <Pill status={p.status} />}
              {open && isCreator && p.player_id !== user.player_id && (
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label={`Remove ${p.display_name}`}
                  onClick={() => confirm(`Remove ${p.display_name}?`) && act(api(`/tournaments/${id}/participants/${p.player_id}`, 'DELETE'))}
                >
                  <Icon name="x" size={22} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      {inviting && (
        <InviteSheet
          friends={freeFriends}
          onInvite={(playerId) => api(`/tournaments/${id}/invitations`, 'POST', { receiver_id: playerId })}
          onClose={() => setInviting(false)}
        />
      )}
    </>
  )
}

export default Tournament
