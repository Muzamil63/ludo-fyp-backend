// /tournaments/[id]/bracket — the full bracket map of one tournament (round 1 → final).
import { Suspense } from 'react'
import { Spinner } from '@/components/ui'
import Bracket from '@/screens/Bracket'

export const metadata = { title: 'Bracket' }

// Every screen needs the login saved in this browser, so the server can't pre-render it:
// opt out of Next.js "instant navigation" checks (navigation is still client-side and fast).
export const instant = false

// The tournament id is only known when the page is opened, so it is read inside <Suspense>.
export default function Page({ params }) {
  return <Suspense fallback={<Spinner />}>{params.then(({ id }) => <Bracket key={id} id={Number(id)} />)}</Suspense>
}
