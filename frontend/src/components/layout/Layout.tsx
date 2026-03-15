import { Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Code2, Trophy, LogIn, LogOut } from 'lucide-react'

export default function Layout() {
  const { isAuth, username, logout } = useAuthStore()

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar */}
      <header className="h-12 flex items-center px-4 border-b border-border bg-surface flex-shrink-0 gap-4">
        <Link to="/" className="font-bold text-sm">
          <span className="text-accent">Be</span>SQL
        </Link>

        <nav className="flex items-center gap-1 ml-2">
          <NavLink to="/problems" icon={<Code2 size={14} />} label="Problems" />
          <NavLink to="/contests" icon={<Trophy size={14} />} label="Contests" />
        </nav>

        <div className="flex-1" />

        {isAuth ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-text2">{username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-text2 hover:text-text1 transition-colors"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        ) : (
          <button className="flex items-center gap-1 text-xs text-text2 hover:text-text1 transition-colors">
            <LogIn size={13} /> Sign in
          </button>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-text2 hover:text-text1 rounded hover:bg-border/40 transition-colors"
    >
      {icon} {label}
    </Link>
  )
}
