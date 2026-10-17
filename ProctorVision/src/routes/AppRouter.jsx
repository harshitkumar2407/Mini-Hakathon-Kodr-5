import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute.jsx'
import AuthPage from '../pages/AuthPage.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Exam from '../pages/Exam.jsx'
import Home from '../pages/Home.jsx'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login/:role" element={<AuthPage mode="login" />} />
      <Route path="/register/:role" element={<AuthPage mode="register" />} />
      <Route
        path="/exam"
        element={<ProtectedRoute role="student"><Exam /></ProtectedRoute>}
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute role="teacher"><Dashboard /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRouter
