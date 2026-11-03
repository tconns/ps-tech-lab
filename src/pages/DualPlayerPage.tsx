import { PlayerPane } from '../components/PlayerPane'
import { STREAMS } from '../streams'

export function DualPlayerPage() {
  return (
    <main className="dual">
      <PlayerPane src={STREAMS.left} />
      <PlayerPane src={STREAMS.right} />
    </main>
  )
}
