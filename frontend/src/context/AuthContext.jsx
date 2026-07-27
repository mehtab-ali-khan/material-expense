import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [companyName, setCompanyName] = useState(localStorage.getItem('companyName'))

    const loginSuccess = (token, name) => {
        localStorage.setItem('token', token)
        localStorage.setItem('companyName', name)
        setCompanyName(name)
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('companyName')
        setCompanyName(null)
    }

    return (
        <AuthContext.Provider value={{ companyName, isAuthenticated: !!companyName, loginSuccess, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}