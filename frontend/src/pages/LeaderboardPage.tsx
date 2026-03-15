import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { contestsApi } from '../services/besqlApi'
import type { LeaderboardEntry } from '../types'
import * as signalR from '@microsoft/signalr'
import { Trophy } from 'lucide-react'

export default function LeaderboardPage() {
  const { id } = useParams<{ id: string }>()
  const [title,   setTitle]   = useState('')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const hubRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    if (!id) return

    // Initial load
    contestsApi.leaderboard(id).then(({ data }) => {
      setTitle(data.contestTitle)
      setEntries(data.entries)
      setLoading(false)
    })

    // Real-time updates via SignalR
    const hub = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/contest')
      .withAutomaticReconnect()
      .build()

    hub.on('LeaderboardUpdate', (data: { contestTitle: string; entries: LeaderboardEntry[] }) => {
      setTitle(data.contestTitle)
      setEntries(data.entries)
    })

    hub.start().then(() => hub.invoke('JoinContest', id))
    hubRef.current = hub

    return () => { hub.stop() }
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full gap-2 text-text2 text-sm">
      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      Loading…
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <Trophy size={20} className="text-yellow-400" /> {title}
      </h1>
      <p className="text-text2 text-sm mb-6">Live Leaderboard</p>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface text-text2 text-xs uppercase">
              <th className="px-4 py-2 text-left w-12">#</th>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-right">Score</th>
              <th className="px-4 py-2 text-right">Solved</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.username} className="border-t border-border hover:bg-surface/50 transition-colors">
                <td className="px-4 py-2 font-mono text-text2">{e.rank}</td>
                <td className="px-4 py-2 font-medium text-text1">
                  {e.rank === 1 && <span className="mr-1">🥇</span>}
                  {e.rank === 2 && <span className="mr-1">🥈</span>}
                  {e.rank === 3 && <span className="mr-1">🥉</span>}
                  {e.username}
                </td>
                <td className="px-4 py-2 text-right font-mono text-accent">{e.totalScore}</td>
                <td className="px-4 py-2 text-right font-mono text-green">{e.solvedCount}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text2 text-sm">
                  No participants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
