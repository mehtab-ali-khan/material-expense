import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PurchasePage from './pages/PurchasePage'
import SalePage from './pages/SalePage'
import StockPage from './pages/StockPage'
import ProfitPage from './pages/ProfitPage'
import AccountPage from './pages/AccountPage'
import PageLoader from './components/PageLoader'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <PageLoader />
  return isAuthenticated ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/purchase" /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/purchase" element={<PrivateRoute><PurchasePage /></PrivateRoute>} />
      <Route path="/sale" element={<PrivateRoute><SalePage /></PrivateRoute>} />
      <Route path="/stock" element={<PrivateRoute><StockPage /></PrivateRoute>} />
      <Route path="/profit" element={<PrivateRoute><ProfitPage /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
