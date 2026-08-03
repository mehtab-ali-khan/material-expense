import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [companyName, setCompanyName] = useState(null)
    const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            setLoading(false)
            return
        }
        getMe()
            .then((res) => {
                setCompanyName(res.data.company_name)
                setProfile({
                    firstName: res.data.first_name || '',
                    lastName: res.data.last_name || '',
                    phone: res.data.phone || '',
                })
            })
            .catch(() => {
                localStorage.removeItem('token')
            })
            .finally(() => setLoading(false))
    }, [])

    const loginSuccess = (token, data) => {
        localStorage.setItem('token', token)
        setCompanyName(data.company_name)
        setProfile({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            phone: data.phone || '',
        })
    }

    const updateProfile = (data) => {
        setCompanyName(data.company_name)
        setProfile({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            phone: data.phone || '',
        })
    }

    const logout = () => {
        localStorage.removeItem('token')
        setCompanyName(null)
        setProfile({ firstName: '', lastName: '', phone: '' })
    }

    return (
        <AuthContext.Provider value={{ companyName, profile, isAuthenticated: !!companyName, loading, loginSuccess, updateProfile, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}