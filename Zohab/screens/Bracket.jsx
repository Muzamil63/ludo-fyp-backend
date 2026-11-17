'use client'

// Full-screen bracket map of a tournament: every round from round 1 to the final. It updates live as
// matches start and finish; clicking your own open match opens the board.
import { useEffect, useState } from 'react'
import { api, listen } from '@/lib/api'
import BracketTree from '@/components/BracketTree'
import { Empty, Header, Spinner } from '@/components/ui'
import { useGo, useSession } from '@/lib/lib'

function Bracket({ id }) {
  const { user } = useSession()
  const go = useGo()
  const [data, setData] = useState(null) // the same data as the tournament page (GET /tournaments/:id)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () => api(`/tournaments/${id}`).then(setData).catch((err) => setError(err.message))
    load()
    // Redraw when a match starts / ends or the next round is drawn
    return listen({ 'tournament:updated': (e) => e.tournament_id === id && load() })
  }, [id])

  if (!data) {
    return (
      <>
        <Header title="Bracket" back={`/tournaments/${id}`} />
        <div className="scroll center-fill">{error ? <p className="error">{error}</p> : <Spinner />}</div>
      </>
    )
  }

  const { tournament: t, rounds, preview, participants } = data
  const matchCount = rounds.reduce((n, r) => n + r.matches.length, 0)
  const sub = preview
    ? `${t.name} · preview for ${t.max_participants} players`
    : `${t.name} · ${participants.length} players · ${rounds.length} rounds · ${matchCount} matches`

  return (
    <>
      <Header title="Bracket" sub={sub} back={`/tournaments/${id}`} />
      <p className="bracket-legend">
        {preview && 'Players who joined so far are shown — the final random draw is at the start. '}
        Times are the planned schedule. Winners move right → 👑 champion. <b className="gold-text">Gold</b> = your matches.
      </p>
      {rounds.length > 0 ? (
        <BracketTree rounds={rounds} myId={user.player_id} preview={preview} onOpen={(matchId) => go(`/match/${matchId}`)} />
      ) : (
        <Empty emoji="🗺️">No bracket: this tournament was cancelled before it started.</Empty>
      )}
    </>
  )
}

export default Bracket
