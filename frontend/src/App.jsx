import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import PurchasePage from './pages/PurchasePage'
import SalePage from './pages/SalePage'
import StockPage from './pages/StockPage'
import ProfitPage from './pages/ProfitPage'
import ProfilePage from './pages/ProfilePage'
import ContactPage from './pages/ContactPage'
import QuotationPage from './pages/QuotationPage'
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
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/contact" element={<PrivateRoute><ContactPage /></PrivateRoute>} />
      <Route path="/quotation" element={<PrivateRoute><QuotationPage /></PrivateRoute>} />
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