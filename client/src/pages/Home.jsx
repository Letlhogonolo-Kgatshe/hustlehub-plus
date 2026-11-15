import { Navigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import WelcomePage from './WelcomePage'
import BrowsePage from './BrowsePage'

export default function Home() {
  const { user } = useAuth()
  if (!user) return <WelcomePage />
  if (user.role === 'freelancer') return <Navigate to="/my-gigs" replace />
  return <BrowsePage />
}