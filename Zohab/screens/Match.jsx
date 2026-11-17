'use client'

// One match: the room lobby, the tournament lobby, the game board and the result.
// Every socket event reloads the match state from the server, so the screen always matches the DB
// (a few fields are also changed at once, so the dice and the tokens can't be clicked twice).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api, emit, listen } from '@/lib/api'
import Board from '@/components/Board'
import InviteSheet from '@/components/InviteSheet'
import { Avatar, Btn, Chips, Dialog, Dice, Header, Spinner } from '@/components/ui'
import { formatClock, formatCountdown, LUDO, useGo, useNow, useSession } from '@/lib/lib'
import { ruleSummary } from '@/lib/rules'

const SEATS = { 2: [1, 3], 3: [1, 2, 3], 4: [1, 2, 3, 4] }
const SEAT_COLOR = { 1: 'red', 2: 'green', 3: 'yellow', 4: 'blue' }
const ORDER = ['red', 'green', 'yellow', 'blue'] // clockwise around the board
const CORNERS = ['bl', 'tl', 'tr', 'br'] // my colour is turned to bottom-left, the others follow clockwise
const PLACE = ['1st', '2nd', '3rd', '4th']
const MEDAL = ['🥇', '🥈', '🥉', '🎖️']

const cornerOf = (color, mine) => CORNERS[(ORDER.indexOf(color) - ORDER.indexOf(mine) + 4) % 4]

// Which of my tokens can move with this dice (same rules as the backend; the server still checks).
function movableTokens(tokens, seatNo, dice, rules) {
  return tokens
    .filter((t) => t.seat_no === seatNo)
    .filter((t) => (t.position === -1 ? dice === 6 || (!rules.six_to_unlock && dice === 1) : t.position + dice <= 56))
    .map((t) => t.token_id)
}

// One player card next to the board.
function Panel({ seat, isMe, active, meta, roll, timer, right, dim }) {
  if (!seat) return <div className="panel empty" />
  const c = LUDO[seat.color]
  return (
    <div
      className={`panel${right ? ' right' : ''}`}
      style={active ? { borderColor: c.light, background: `${c.main}33`, boxShadow: `0 0 14px ${c.main}77` } : undefined}
    >
      <Avatar player={seat} size={34} ring={c.main} dim={dim} />
      <div className="info">
        <div className="nm">{isMe ? 'You' : seat.display_name}</div>
        <div className="meta">
          <i className="cd" style={{ background: c.main }} />
          {meta}
          {roll ? <span className="roll">🎲 {roll}</span> : null}
        </div>
        {active && timer !== null && (
          <div className="timer">
            <i style={{ width: `${timer * 100}%`, background: timer < 0.3 ? 'var(--danger)' : c.light }} />
          </div>
        )}
      </div>
    </div>
  )
}

function Match({ id }) {
  const { user } = useSession()
  const go = useGo()
  const registered = user.player_type === 'registered'
  const [data, setData] = useState(null) // { match, seats, tokens, turn_deadline }
  // Last game:rolled event + a counter n (every roll tumbles the dice) + current: still this turn's roll?
  const [lastRoll, setLastRoll] = useState(null)
  const [rolls, setRolls] = useState({}) // last dice value of every seat
  const [rolling, setRolling] = useState(false)
  const rollingRef = useRef(false) // a roll is waiting for the server (stops a fast double click)
  const movingRef = useRef(false) // a move is waiting for the server (stops a fast double click)
  const [present, setPresent] = useState([])
  const [moves, setMoves] = useState(null)
  const [friends, setFriends] = useState([])
  const [inviting, setInviting] = useState(false)
  const [fillBots, setFillBots] = useState(true)
  const [showResult, setShowResult] = useState(true)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const now = useNow(500)

  // Next.js keeps visited pages alive (hidden). Close the invite sheet when this page is hidden.
  useLayoutEffect(() => () => setInviting(false), [])

  useEffect(() => {
    let latest = 0
    // Only the newest answer is shown (answers can arrive out of order).
    const show = (request) => {
      const n = ++latest
      request.then((d) => n === latest && setData(d)).catch((err) => setError(err.message))
    }
    const refresh = () => show(api(`/matches/${id}`))
    // Changes a few fields of the shown match at once; the full state from the server follows right after.
    const patch = (fields) => setData((d) => d && { ...d, match: { ...d.match, ...fields } })
    // A new turn, a move or a full state: the last roll stays on the dice, but it is no longer "this turn's
    // roll" (the app's turnSeq idea), so an old roll can never come back as the current one.
    const rollIsOld = () => setLastRoll((r) => r && { ...r, current: false })
    // A full state (reconnect, match:state): forget a roll / move still waiting for its answer.
    // An answer lost when the connection dropped would otherwise keep the dice spinning for ever.
    const fullState = () => {
      rollingRef.current = false
      movingRef.current = false
      setRolling(false)
      rollIsOld()
    }
    const join = () => show(emit('match:join', { match_id: id }))
    const forThisMatch = (fn) => (e) => e.match_id === id && fn(e)

    join()
    if (registered) api('/friends').then(setFriends).catch(() => {})
    return listen({
      // socket reconnected → join the match room again and take its full state
      connect: () => {
        fullState()
        join()
      },
      'match:state': forThisMatch(() => {
        fullState()
        refresh()
      }),
      'game:turn': forThisMatch((e) => {
        rollIsOld()
        patch({ current_seat: e.seat_no, dice_value: null })
        refresh()
      }),
      'game:rolled': forThisMatch((e) => {
        setLastRoll((prev) => ({ ...e, n: (prev?.n || 0) + 1, current: true }))
        setRolls((prev) => ({ ...prev, [e.seat_no]: e.dice_value }))
        // No valid move: the turn is already passing on the server (no current seat until game:turn).
        // Otherwise the dice waits for a move, so it can't be rolled twice.
        const missed = e.valid_token_ids.length === 0
        patch(missed ? { dice_value: null, current_seat: null } : { dice_value: e.dice_value })
        refresh()
      }),
      'game:moved': forThisMatch(() => {
        rollIsOld()
        patch({ dice_value: null }) // the dice is used up: no glowing tokens until the next roll
        refresh()
      }),
      'match:finished': forThisMatch(refresh),
      'match:cancelled': forThisMatch(refresh),
      'room:updated': forThisMatch(refresh),
      'tournament:lobby': forThisMatch((e) => setPresent(e.present_player_ids)),
    })
  }, [id, registered])

  // Move summary once the match is over
  const finished = data?.match.status === 'finished'
  useEffect(() => {
    if (finished) api(`/matches/${id}/moves`).then(setMoves).catch(() => {})
  }, [finished, id])

  function act(request, okText = '') {
    setMessage('')
    request.then(() => setMessage(okText)).catch((err) => setMessage(err.message))
  }

  // The server sends game:rolled / game:moved before it answers, so by the time the ref is free again
  // the dice and the glowing tokens are already switched off (see patch above).
  function roll() {
    if (rollingRef.current) return // a fast double click must not send two rolls
    rollingRef.current = true
    setMessage('')
    setRolling(true)
    emit('game:roll', { match_id: id })
      .catch((err) => setMessage(err.message))
      .finally(() => {
        rollingRef.current = false
        setRolling(false)
      })
  }

  function move(tokenId) {
    if (movingRef.current) return // a fast double click must not send two moves
    movingRef.current = true
    setMessage('')
    emit('game:move', { match_id: id, token_id: tokenId })
      .catch((err) => setMessage(err.message))
      .finally(() => {
        movingRef.current = false
      })
  }

  if (!data) {
    return (
      <>
        <Header title="Match" back="/" />
        <div className="scroll center-fill">
          {error ? (
            <div className="glass center">
              <p className="error">{error}</p>
              <div className="gap12" />
              <Btn v="gold" icon="home" onClick={() => go('/')}>
                Back Home
              </Btn>
            </div>
          ) : (
            <Spinner />
          )}
        </div>
      </>
    )
  }

  const { match, seats } = data
  const tokens = data.tokens || []
  const me = seats.find((s) => s.player_id === user.player_id)
  const myColor = me?.color || 'red'
  const isRoom = match.match_type === 'room'
  const backPath = match.tournament_id ? `/tournaments/${match.tournament_id}` : '/'
  const rules = match.rule_set
  const rulesText = rules ? `${rules.name} rules · ${rules.tokens_to_win} token${rules.tokens_to_win > 1 ? 's' : ''} home to win` : ''
  const byCorner = {}
  for (const s of seats) byCorner[cornerOf(s.color, myColor)] = s

  // ---------- closed ----------
  if (match.status === 'cancelled') {
    return (
      <>
        <Header title={isRoom ? 'Room closed' : 'Match cancelled'} back={backPath} />
        <div className="scroll center-fill">
          <div className="glass center">
            <div className="big-emoji">🚪</div>
            <b>{isRoom ? 'This room was closed' : 'This match was cancelled'}</b>
            <div className="gap16" />
            <Btn v="gold" icon={match.tournament_id ? 'trophy' : 'home'} onClick={() => go(backPath)}>
              {match.tournament_id ? 'View Tournament' : 'Back Home'}
            </Btn>
          </div>
        </div>
      </>
    )
  }

  // ---------- room lobby ----------
  if (match.status === 'waiting' && isRoom) {
    const isHost = match.host_id === user.player_id
    const freeFriends = friends.filter((f) => !seats.some((s) => s.player_id === f.player_id))
    const empty = match.max_players - seats.length

    const copy = () =>
      navigator.clipboard
        ?.writeText(match.room_code)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
        .catch(() => {})

    return (
      <>
        <Header title="Room Lobby" sub={`${rules?.name || ''} rules · ${match.game_mode === '2v2' ? '2 vs 2' : 'Free for all'}`} back="/" />
        <div className="scroll">
          <div className="glass hl-gold code-card">
            <div className="code-label">ROOM CODE</div>
            <div className="room-code">{match.room_code}</div>
            {rules && <div className="rules-line">{ruleSummary(rules)}</div>}
            <Btn v="ghost" size="sm" icon={copied ? 'check' : 'copy'} onClick={copy}>
              {copied ? 'Copied!' : 'Copy code'}
            </Btn>
          </div>

          <div className="sec">
            Players ({seats.length}/{match.max_players})
          </div>
          <div className="seats">
            {SEATS[match.max_players].map((no) => {
              const seat = seats.find((s) => s.seat_no === no)
              const color = LUDO[SEAT_COLOR[no]].main
              return (
                <div key={no} className="seat" style={{ borderColor: color }}>
                  {seat ? (
                    <>
                      <Avatar player={seat} size={40} ring={color} />
                      <div className="nm">{seat.player_id === user.player_id ? 'You' : seat.display_name}</div>
                      {seat.player_id === match.host_id && <div className="host">HOST</div>}
                    </>
                  ) : (
                    <>
                      <div className="seat-free" style={{ borderColor: color }}>
                        ?
                      </div>
                      <div className="nm muted">Waiting…</div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {isHost ? (
            <div className="glass mt12">
              {empty > 0 && (
                <Chips
                  label={`${empty} empty seat${empty > 1 ? 's' : ''}`}
                  value={fillBots}
                  options={[[true, '🤖 Fill with bots'], [false, 'Leave empty']]}
                  onChange={setFillBots}
                />
              )}
              {registered && (
                <>
                  <Btn v="ghost" size="md" icon="userPlus" onClick={() => setInviting(true)}>
                    Invite Friends
                  </Btn>
                  <div className="gap8" />
                </>
              )}
              <Btn v="gold" size="md" icon="play" onClick={() => act(api(`/rooms/${id}/start`, 'POST', { fill_with_bots: fillBots }))}>
                Start Game
              </Btn>
            </div>
          ) : (
            <div className="glass center mt12">
              <Spinner />
              <p className="dim mt6">Waiting for the host to start…</p>
            </div>
          )}
          {message && <p className="notice">{message}</p>}
          <div className="gap12" />
          <Btn v="ghost" size="md" icon="logOut" onClick={() => api(`/rooms/${id}/leave`, 'POST').then(() => go('/')).catch((e) => setMessage(e.message))}>
            Leave Room
          </Btn>
        </div>
        {inviting && (
          <InviteSheet
            friends={freeFriends}
            onInvite={(playerId) => api(`/rooms/${id}/invitations`, 'POST', { receiver_id: playerId })}
            onClose={() => setInviting(false)}
          />
        )}
      </>
    )
  }

  // ---------- tournament lobby ----------
  if (match.status === 'waiting') {
    const here = (s) => s.player_id === user.player_id || present.includes(s.player_id)
    const lobbyTokens = tokens.length
      ? tokens
      : seats.flatMap((s) => [1, 2, 3, 4].map((n) => ({ token_id: `${s.seat_no}-${n}`, color: s.color, token_no: n, position: -1 })))
    const left = match.scheduled_at ? new Date(match.scheduled_at) - now : 0
    const lobbyPanel = (corner, right = false) => {
      const s = byCorner[corner]
      return <Panel seat={s} isMe={s?.player_id === user.player_id} meta={s && (here(s) ? 'Ready' : 'Not here yet')} right={right} dim={s && !here(s)} />
    }

    return (
      <div className="game">
        <Header compact title={`Round ${match.round_no} · Match ${match.match_no}`} sub={rulesText} back={backPath} />
        <div className="game-row">
          {lobbyPanel('tl')}
          {lobbyPanel('tr', true)}
        </div>
        <div className="board-area">
          <Board tokens={lobbyTokens} me={myColor} />
          <div className="lobby-cover">
            <div className="glass hl-gold lobby-card">
              <div className="gold-label">
                🏆 Round {match.round_no} · Match {match.match_no}
              </div>
              <div className="lobby-count">{left > 0 ? formatCountdown(left) : 'Starting…'}</div>
              {match.scheduled_at && <div className="dim xs">Starts at {formatClock(match.scheduled_at)} — or as soon as everyone is here</div>}
              <div className="lobby-people">
                {seats.map((s) => (
                  <div key={s.seat_no}>
                    <Avatar player={s} size={42} ring={LUDO[s.color].main} dim={!here(s)} />
                    <div className="nm">{s.player_id === user.player_id ? 'You' : s.display_name}</div>
                    <div className={here(s) ? 'ready' : 'away'}>{here(s) ? '● Ready' : '○ Waiting'}</div>
                  </div>
                ))}
              </div>
              <div className="small">Stay on this screen. Absent players are auto-played.</div>
            </div>
          </div>
        </div>
        <div className="game-status">Waiting for the match to start…</div>
        <div className="game-row bottom">
          {lobbyPanel('bl')}
          <div className="dice-slot">
            <Dice value={6} />
          </div>
          {lobbyPanel('br', true)}
        </div>
      </div>
    )
  }

  // ---------- game ----------
  const current = seats.find((s) => s.seat_no === match.current_seat)
  const myTurn = match.status === 'in_progress' && me && match.current_seat === me.seat_no
  const validIds = myTurn && match.dice_value ? movableTokens(tokens, me.seat_no, match.dice_value, rules) : []
  const secondsLeft = data.turn_deadline ? Math.min(rules.turn_seconds, Math.max(0, Math.ceil((data.turn_deadline - now) / 1000))) : null
  const timer = secondsLeft !== null ? secondsLeft / rules.turn_seconds : null
  const turnRoll = lastRoll?.current ? lastRoll : null // the roll made in this turn (see rollIsOld)
  // This turn's roll, else the dice the server is waiting on (e.g. after a reconnect), else the last roll.
  const diceValue = turnRoll?.dice_value ?? match.dice_value ?? lastRoll?.dice_value ?? 6
  const ranking = [...seats].sort((a, b) => (a.finish_position || 9) - (b.finish_position || 9))
  const won = me?.finish_position === 1
  const title = { bot: 'vs Computer', online: 'Online Match', room: `Room ${match.room_code}`, tournament: `Round ${match.round_no} · Match ${match.match_no}` }[match.match_type] || 'Match'

  let status = ''
  if (current) status = `${current.display_name} ${current.bot_id ? 'is thinking…' : 'is playing…'}`
  // A roll with no valid move of THIS turn: shown until the next turn starts (the turn passes after it).
  if (turnRoll && turnRoll.valid_token_ids.length === 0) {
    const roller = seats.find((s) => s.seat_no === turnRoll.seat_no)
    const who = roller?.player_id === user.player_id ? 'You' : roller?.display_name
    status = `${who} rolled ${turnRoll.dice_value} — no move`
  }
  if (myTurn) status = match.dice_value ? (validIds.length ? 'Tap a glowing token to move it' : `You rolled ${match.dice_value} — no move`) : 'Your turn — tap the dice to roll'

  const panel = (corner, right = false) => {
    const s = byCorner[corner]
    if (!s) return <Panel />
    const active = match.status === 'in_progress' && match.current_seat === s.seat_no
    const place = s.finish_position ? `${MEDAL[s.finish_position - 1]} ${PLACE[s.finish_position - 1]}` : '—'
    const meta = finished ? place : s.team_no ? `Team ${s.team_no}` : s.bot_id ? 'Computer' : 'Player'
    return <Panel seat={s} isMe={s.player_id === user.player_id} active={active} meta={meta} roll={rolls[s.seat_no]} timer={active ? timer : null} right={right} />
  }

  return (
    <div className="game">
      <Header compact title={title} sub={rulesText} back={backPath} />
      <div className="game-row">
        {panel('tl')}
        {panel('tr', true)}
      </div>
      <div className="board-area">
        <Board
          tokens={tokens}
          me={myColor}
          active={match.status === 'in_progress' ? current?.color : null}
          validIds={validIds}
          onMove={move}
        />
      </div>
      {finished ? (
        <div className="game-status">
          <button type="button" className="link" onClick={() => setShowResult(true)}>
            Game over — show results
          </button>
        </div>
      ) : (
        <div className={`game-status${myTurn ? ' me' : ''}`}>
          {status}
          {message && <div className="error xs">{message}</div>}
        </div>
      )}
      <div className="game-row bottom">
        {panel('bl')}
        <div className="dice-slot">
          <Dice
            value={diceValue}
            glow={current ? LUDO[current.color].main : '#FFC93C'}
            rollKey={lastRoll?.n || 0}
            spinning={rolling}
            onRoll={myTurn && !match.dice_value && !rolling ? roll : null}
          />
        </div>
        {panel('br', true)}
      </div>

      {finished && showResult && (
        <Dialog onClose={() => setShowResult(false)}>
          <div className={`result-card${won ? ' win' : ''}`}>
            <div className="result-emoji">{won ? '🏆' : '🎲'}</div>
            <div className="result-title">{won ? 'You win!' : `${ranking[0]?.display_name} wins!`}</div>
            {match.tournament_id && <div className="result-sub">{won ? 'You go through — check the bracket for your next match.' : 'Thanks for playing in this cup.'}</div>}
            <div className="result-list">
              {ranking.map((s) => (
                <div key={s.seat_no} className={`result-row${s.player_id === user.player_id ? ' me' : ''}`}>
                  <span className="medal">{s.finish_position ? MEDAL[s.finish_position - 1] : '—'}</span>
                  <i className="cd" style={{ background: LUDO[s.color].main }} />
                  <b className="grow">
                    {s.display_name}
                    {s.player_id === user.player_id ? ' (You)' : ''}
                  </b>
                  <b>{s.finish_position ? PLACE[s.finish_position - 1] : ''}</b>
                </div>
              ))}
            </div>
            {moves && (
              <div className="result-meta">
                {moves.length} moves · {moves.filter((m) => m.captured_token_id).length} captures
              </div>
            )}
            {match.tournament_id ? (
              <Btn icon="trophy" onClick={() => go(`/tournaments/${match.tournament_id}`)}>
                View Tournament
              </Btn>
            ) : (
              <Btn icon="play" onClick={() => go(match.match_type === 'bot' ? '/play/bot' : '/')}>
                Play Again
              </Btn>
            )}
            <div className="gap10" />
            <Btn v="ghost" icon="home" onClick={() => go('/')}>
              Home
            </Btn>
            <button type="button" className="link result-close" onClick={() => setShowResult(false)}>
              View board
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

export default Match
