import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import apiClient from '../lib/api'
import { setTokens, clearTokens } from '../lib/auth'
import { toast } from 'sonner'


const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (loginId, password) => {
        set({ isLoading: true })
        try {
          const response = await apiClient.post('/auth/login', {
            loginId,
            password,
          })

          const { accessToken, refreshToken, user } = response.data

          setTokens(accessToken, refreshToken)
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })

          toast.success('Login successful!')
          return true
        } catch (error) {
          set({ isLoading: false })
          const message =
            error.response?.data?.message || 'Login failed. Please try again.'
          toast.error(message)
          return false
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout', {refreshToken: get().user?.refreshToken})
        } catch (error) {
          // Ignore logout errors
        } finally {
          clearTokens()
          set({
            user: null,
            isAuthenticated: false,
          })
          toast.success('Logged out successfully')
        }
      },

      fetchUser: async () => {
        set({ isLoading: true })
        try {
          const response = await apiClient.get('/auth/me')
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          clearTokens()
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }))
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export { useAuthStore }
export default useAuthStore

