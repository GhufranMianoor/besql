import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="mb-6">
        <span className="text-5xl font-bold">
          <span className="text-accent">Be</span>SQL
        </span>
      </div>
      <p className="text-text2 text-lg mb-8 max-w-xl mx-auto">
        Enterprise-grade SQL online judge for company hiring and competitive programming.
        Write SQL, get judged, climb the leaderboard.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          to="/problems"
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-md font-medium hover:bg-accent/90 transition-colors"
        >
          <Zap size={16} /> Start Solving
        </Link>
      </div>
    </div>
  )
}
