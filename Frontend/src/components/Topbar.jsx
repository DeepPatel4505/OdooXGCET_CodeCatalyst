import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { Button } from './ui/button'
import {
  Bell,
  User,
  LogOut,
  Settings,
  Menu,
  LogIn,
  Lock,
} from 'lucide-react'
import apiClient from '../lib/api'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'

/**
 * Topbar component - Top navigation bar
 */
export default function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)

  const isEmployee = user?.role === 'employee'

  useEffect(() => {
    if (isEmployee) {
      fetchTodayAttendance()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee])

  const fetchTodayAttendance = async () => {
    try {
      const response = await apiClient.get('/attendance/today')
      // Backend returns { status: 'success', data: {...} } 
      const attendanceData = response.data?.data || response.data
      setTodayAttendance(attendanceData)
    } catch (error) {
      if (error.response?.status === 404) {
        setTodayAttendance(null)
      } else {
        console.error('Failed to fetch today attendance:', error)
      }
    }
  }

  const handleCheckIn = async () => {
    setIsLoadingAttendance(true)
    try {
      const response = await apiClient.post('/attendance/check-in')
      toast.success(response.data?.message || 'Checked in successfully')
      await fetchTodayAttendance()
    } catch (error) {
      console.error('Failed to check in:', error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to check in. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoadingAttendance(false)
    }
  }

  const handleCheckOut = async () => {
    setIsLoadingAttendance(true)
    try {
      const response = await apiClient.post('/attendance/check-out')
      toast.success(response.data?.message || 'Checked out successfully')
      await fetchTodayAttendance()
    } catch (error) {
      console.error('Failed to check out:', error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to check out. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsLoadingAttendance(false)
    }
  }

  const getCheckInTime = () => {
    if (!todayAttendance?.checkIn) return null
    const date = new Date(todayAttendance.checkIn)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')
    return `${displayHours.toString().padStart(2, '0')}:${displayMinutes}${ampm}`
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      hr: 'HR Manager',
      payroll: 'Payroll Officer',
      employee: 'Employee',
    }
    return labels[role] || role
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold lg:hidden">WorkZen</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Check In/Out Buttons - Only for employees */}
          {isEmployee && (
            <div className="flex items-center space-x-2">
              {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
                <>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Since {getCheckInTime()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheckOut}
                    disabled={isLoadingAttendance}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Check Out
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCheckIn}
                  disabled={isLoadingAttendance}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Check In
                </Button>
              )}
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            {/* <Bell className="h-5 w-5" /> */}
            {/* <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            <span className="sr-only">Notifications</span> */}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.firstName}
                      className="h-full w-full rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

