import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'

export default function ContestPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Contest</h1>
      <Link
        to={`/contests/${id}/leaderboard`}
        className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
      >
        <Trophy size={14} /> View Leaderboard
      </Link>
    </div>
  )
}
