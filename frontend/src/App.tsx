import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import ProblemSolver from './pages/ProblemSolver'
import ContestPage from './pages/ContestPage'
import LeaderboardPage from './pages/LeaderboardPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="problems/:slug" element={<ProblemSolver />} />
        <Route path="contests/:id" element={<ContestPage />} />
        <Route path="contests/:id/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
