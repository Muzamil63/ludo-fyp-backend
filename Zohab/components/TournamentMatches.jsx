'use client'

// The DRAWN matches of a tournament (they have an id): one column per round, one card per match with its
// players, winner, time and status. Players get "Play now" on their match; the creator can change the time
// of a waiting match or start it now. (The whole tree, with the rounds still to come, is the bracket map.)
import { useState } from 'react'
import { api } from '@/lib/api'
import { formatWhen, LUDO, roundName, useGo } from '@/lib/lib'
import { Btn, Icon, Pill } from './ui.jsx'

// rounds = only drawn matches. act(request, okText) runs a request and reloads the tournament.
function TournamentMatches({ tournamentId, rounds, totalRounds, myId, isCreator, act }) {
  const go = useGo()
  const [times, setTimes] = useState({}) // new start times typed by the creator, per match

  return (
    <div className="bracket">
      {rounds.map((round) => (
        <div key={round.round_no} className="bcol">
          <h4>{roundName(round.round_no, totalRounds)}</h4>
          {round.matches.map((m) => {
            const mine = m.seats.some((s) => s.player_id === myId)
            const done = m.status === 'finished'
            return (
              <div key={m.match_id} className={`glass bmatch${m.status === 'in_progress' ? ' hl-gold' : ''}`}>
                <div className="row">
                  <b className="grow">Match {m.match_no}</b>
                  <Pill status={m.status} />
                </div>
                {m.scheduled_at && (
                  <div className="small row when">
                    <Icon name="clock" size={13} />
                    {formatWhen(m.scheduled_at)}
                  </div>
                )}
                {m.seats.map((s) => {
                  const winner = m.winner_id !== null && m.winner_id === s.player_id
                  return (
                    <div key={s.seat_no} className={`bseat${winner ? ' win' : done ? ' lost' : ''}`}>
                      <i className="cd" style={{ background: LUDO[s.color].main }} />
                      <span className={`grow${s.player_id === myId ? ' gold-text' : ''}`}>{s.player_id === myId ? 'You' : s.display_name}</span>
                      {winner && <Icon name="crown" size={16} color="var(--gold)" />}
                    </div>
                  )
                })}
                {mine && m.status !== 'cancelled' && (
                  <Btn v={done ? 'ghost' : 'gold'} size="sm" icon={done ? 'chevronRight' : 'play'} className="mt8" onClick={() => go(`/match/${m.match_id}`)}>
                    {done ? 'View' : 'Play now'}
                  </Btn>
                )}
                {isCreator && m.status === 'waiting' && (
                  <div className="creator-match">
                    <span className="input sm">
                      <input
                        type="datetime-local"
                        value={times[m.match_id] || ''}
                        onChange={(e) => setTimes({ ...times, [m.match_id]: e.target.value })}
                        aria-label={`New time for match ${m.match_no}`}
                      />
                    </span>
                    <div className="btn-row">
                      <Btn
                        v="ghost"
                        size="sm"
                        disabled={!times[m.match_id]}
                        onClick={() => act(api(`/tournaments/${tournamentId}/matches/${m.match_id}/schedule`, 'PUT', { scheduled_at: times[m.match_id] }), 'Time changed')}
                      >
                        Set time
                      </Btn>
                      <Btn v="success" size="sm" onClick={() => act(api(`/tournaments/${tournamentId}/matches/${m.match_id}/start`, 'POST'))}>
                        Start
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default TournamentMatches
