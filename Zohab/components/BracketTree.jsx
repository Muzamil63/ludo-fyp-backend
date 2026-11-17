'use client'

// The whole knockout tree, round 1 → final: match cards joined by lines (the winner moves to the right).
// It scrolls both ways, so 64 players (32 first-round matches) fit. Each later match is drawn halfway
// between the matches that feed it (the server sends those as `feeders`). The round chips jump to a round.
import { Fragment, useRef } from 'react'
import { formatClock, LUDO, roundName } from '@/lib/lib'
import { Icon } from './ui.jsx'

// Sizes in pixels. Every card is placed at an exact x / y, so the lines can join them.
const CARD_W = 172
const COL_GAP = 34 // space between two rounds, where the lines run
const ROW_GAP = 14 // space between two first-round cards
const HEAD_H = 36 // round name above each column
const TOP_H = 26 // "M3 · 18:05" row inside a card
const SEAT_H = 22 // one player row inside a card
const PAD = 16 // empty space around the tree

// The state shown on a card: live, done, its time (blue = drawn and waiting, grey = planned), or upcoming.
function matchState(m) {
  if (m.status === 'in_progress') return ['● LIVE', 'var(--danger)']
  if (m.status === 'finished') return ['Done', 'var(--muted)']
  if (m.status === 'cancelled') return ['Cancelled', 'var(--muted)']
  if (m.scheduled_at) return [formatClock(m.scheduled_at), m.status === 'waiting' ? 'var(--info)' : 'var(--muted)']
  return ['Upcoming', 'var(--muted)']
}

// Places without a player yet: a later round waits for the winners of its feeder matches;
// in round 1 the places after the players who joined so far are still open.
function placeholdersOf(m, preview) {
  if (m.feeders.length) return m.seats.length ? [] : m.feeders.map((f) => `Winner of R${m.round_no - 1} M${f}`)
  return Array.from({ length: m.slots - m.seats.length }, () => (preview ? 'Open slot' : 'TBD'))
}

// One match: number + state, then its players (or who will play there). My open match opens the board.
function MatchCard({ match: m, myId, preview, onOpen, style }) {
  const mine = m.seats.some((s) => s.player_id === myId)
  const canOpen = mine && m.match_id !== null && (m.status === 'waiting' || m.status === 'in_progress')
  const [stateText, stateColor] = matchState(m)
  const Card = canOpen ? 'button' : 'div'

  return (
    <Card
      className={`bcard${mine ? ' mine' : ''}${m.status === 'in_progress' ? ' live' : ''}`}
      style={style}
      onClick={canOpen ? () => onOpen(m.match_id) : undefined}
    >
      <div className="bcard-top">
        <b>M{m.match_no}</b>
        <span style={{ color: stateColor }}>{stateText}</span>
      </div>
      {m.seats.map((s) => {
        const winner = m.winner_id !== null && s.player_id === m.winner_id
        const lost = m.status === 'finished' && !winner
        return (
          <div key={s.seat_no} className={`bcard-seat${winner ? ' win' : ''}`}>
            <i className="cd" style={{ background: LUDO[s.color].main }} />
            <span className={`nm${lost ? ' lost' : ''}${s.player_id === myId ? ' me' : ''}`}>{s.player_id === myId ? 'You' : s.display_name}</span>
            {winner && <Icon name="crown" size={13} color="var(--gold)" />}
          </div>
        )
      })}
      {placeholdersOf(m, preview).map((text, k) => (
        <div key={`open-${k}`} className="bcard-seat">
          <i className="cd open" />
          <span className="ph">{text}</span>
        </div>
      ))}
    </Card>
  )
}

// rounds = the full bracket from the server, myId = my player_id, preview = before the start.
function BracketTree({ rounds, myId, preview, onOpen }) {
  const box = useRef(null) // the scroll box (the round chips scroll it)
  const maxSlots = Math.max(...rounds.flatMap((r) => r.matches.map((m) => m.slots)))
  const cardH = TOP_H + maxSlots * SEAT_H + 10
  const x = (r) => PAD + r * (CARD_W + COL_GAP) // left edge of round r's column

  // Vertical centre of every card. Round 1 cards are stacked; a later card sits between its first and last feeder.
  const centers = []
  rounds.forEach((round, r) => {
    centers[r] = round.matches.map((m, i) => {
      if (r === 0) return PAD + HEAD_H + i * (cardH + ROW_GAP) + cardH / 2
      const first = centers[r - 1][m.feeders[0] - 1]
      const last = centers[r - 1][m.feeders[m.feeders.length - 1] - 1]
      return (first + last) / 2
    })
  })
  const width = x(rounds.length) - COL_GAP + PAD
  const height = PAD + HEAD_H + rounds[0].matches.length * (cardH + ROW_GAP) - ROW_GAP + PAD

  // One elbow line from each feeder card to the card it feeds (gold once that feeder match has a winner).
  const lines = rounds.slice(1).flatMap((round, k) => {
    const r = k + 1
    return round.matches.flatMap((m, i) =>
      m.feeders.map((f) => {
        const x1 = x(r - 1) + CARD_W
        const xm = x1 + COL_GAP / 2
        return {
          key: `${r}-${i}-${f}`,
          d: `M${x1} ${centers[r - 1][f - 1]} H${xm} V${centers[r][i]} H${x(r)}`,
          done: rounds[r - 1].matches[f - 1].winner_id !== null,
        }
      })
    )
  })

  // Scrolls so the round's column and its first match are on screen.
  function jumpTo(r) {
    box.current?.scrollTo({ left: Math.max(0, x(r) - PAD), top: Math.max(0, centers[r][0] - cardH), behavior: 'smooth' })
  }

  return (
    <div className="btree-wrap">
      <div className="btree-chips">
        {rounds.map((round, r) => (
          <button key={round.round_no} type="button" className="round-chip" onClick={() => jumpTo(r)}>
            {roundName(round.round_no, rounds.length)}
          </button>
        ))}
      </div>
      <div className="btree-scroll" ref={box}>
        <div className="btree" style={{ width, height }}>
          <svg className="btree-lines" width={width} height={height} aria-hidden="true">
            {lines.map((l) => (
              <path key={l.key} d={l.d} className={l.done ? 'done' : undefined} />
            ))}
          </svg>
          {rounds.map((round, r) => (
            <Fragment key={round.round_no}>
              <div className="btree-round" style={{ left: x(r), top: PAD }}>
                {roundName(round.round_no, rounds.length)}
              </div>
              {round.matches.map((m, i) => (
                <MatchCard
                  key={m.match_no}
                  match={m}
                  myId={myId}
                  preview={preview}
                  onOpen={onOpen}
                  style={{ left: x(r), top: centers[r][i] - cardH / 2, height: cardH }}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BracketTree
