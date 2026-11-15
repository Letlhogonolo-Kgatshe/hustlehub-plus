import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import BrowsePage from './pages/BrowsePage'
import GigDetailPage from './pages/GigDetailPage'
import MyBookingsPage from './pages/MyBookingsPage'
import MyGigs from './pages/Mygigs'
import IncomePage from './pages/IncomePage'
import ForbiddenPage from './pages/ForbiddenPage'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/" element={<Home />} />

        <Route element={<ProtectedRoute allowedRoles={['client', 'admin']} />}>
          <Route path="/browse" element={<BrowsePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['client']} />}>
          <Route path="/gigs/:id" element={<GigDetailPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['freelancer']} />}>
          <Route path="/my-gigs" element={<MyGigs />} />
          <Route path="/income" element={<IncomePage />} />
        </Route>
      </Route>
    </Routes>
  )
}