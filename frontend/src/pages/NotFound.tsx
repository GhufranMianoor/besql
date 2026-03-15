import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-6xl font-bold text-border">404</p>
      <p className="text-text2">Page not found.</p>
      <Link to="/" className="text-accent hover:underline text-sm">← Back to home</Link>
    </div>
  )
}
