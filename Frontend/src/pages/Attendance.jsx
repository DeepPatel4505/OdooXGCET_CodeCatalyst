import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import DataTable from '../components/DataTable'
import { LogIn, LogOut, Calendar, ChevronLeft, ChevronRight, Search, User, X, ChevronDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import apiClient from '../lib/api'
import { formatDate, formatTime } from '../lib/format'
import { toast } from 'sonner'
import { useAuthStore } from '../store/auth'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import weekOfYear from 'dayjs/plugin/weekOfYear'

dayjs.extend(weekday)
dayjs.extend(weekOfYear)

/**
 * Attendance page component
 * Role-based views:
 * - Admin/HR/Payroll Officer: See all employees' attendance for selected day
 * - Employee: See own attendance for selected month with summary metrics
 */
export default function Attendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const { user } = useAuthStore()

  // Admin view state
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Employee view state
  const [employeeSelectedMonth, setEmployeeSelectedMonth] = useState(new Date())
  const [employeeSelectedDate, setEmployeeSelectedDate] = useState(new Date())
  const [employeeViewMode, setEmployeeViewMode] = useState('month') // 'day' or 'month'
  const [monthSummary, setMonthSummary] = useState(null)
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('')

  const isAdmin = ['admin', 'hr'].includes(user?.role)

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees()
      fetchAttendanceForDate(selectedDate, selectedEmployeeId, selectedDepartment)
    } else {
      fetchTodayAttendance()
      if (employeeViewMode === 'day') {
        fetchAttendanceForDate(employeeSelectedDate)
      } else {
        fetchAttendanceForMonth(employeeSelectedMonth)
        fetchMonthSummary(employeeSelectedMonth)
      }
    }
  }, [isAdmin, selectedDate, selectedEmployeeId, selectedDepartment, employeeSelectedMonth, employeeSelectedDate, employeeViewMode])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees')
      const employeesData = response.data?.data || response.data || []
      setEmployees(Array.isArray(employeesData) ? employeesData : [])
      
      // Extract unique departments
      const uniqueDepartments = [...new Set(employeesData.map(emp => emp.department).filter(Boolean))]
      setDepartments(uniqueDepartments.sort())
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setEmployees([])
      setDepartments([])
    }
  }

  const fetchAttendanceForDate = async (date, employeeId = null, department = null) => {
    try {
      setLoading(true)
      // Use local date to avoid timezone issues
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dateStr = dayjs(localDate).format('YYYY-MM-DD')
      let url = `/attendance?date=${dateStr}`
      if (employeeId) {
        url += `&employeeId=${employeeId}`
      }
      const response = await apiClient.get(url)
      // Backend returns { status: 'success', data: [...] }
      let attendanceData = response.data?.data || response.data || []
      
      // Filter by department on frontend if needed
      if (department && department !== 'all') {
        attendanceData = attendanceData.filter(att => {
          const emp = employees.find(e => e.id === att.employeeId || e.employeeId === att.employeeId)
          return emp && emp.department === department
        })
      }
      
      setAttendance(Array.isArray(attendanceData) ? attendanceData : [])
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceForMonth = async (month, employeeId = null) => {
    try {
      setLoading(true)
      const startDate = dayjs(month).startOf('month').format('YYYY-MM-DD')
      const endDate = dayjs(month).endOf('month').format('YYYY-MM-DD')
      let url = `/attendance?startDate=${startDate}&endDate=${endDate}`
      if (employeeId) {
        url += `&employeeId=${employeeId}`
      }
      const response = await apiClient.get(url)
      // Backend returns { status: 'success', data: [...] }
      const attendanceData = response.data?.data || response.data || []
      setAttendance(Array.isArray(attendanceData) ? attendanceData : [])
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTodayAttendance = async () => {
    try {
      const response = await apiClient.get('/attendance/today')
      // Backend returns { status: 'success', data: {...} }
      const attendanceData = response.data?.data || response.data
      setTodayAttendance(attendanceData)
    } catch (error) {
      console.error('Failed to fetch today attendance:', error)
      // If 404, it means no attendance record for today (not an error)
      if (error.response?.status === 404) {
        setTodayAttendance(null)
      }
    }
  }

  const fetchMonthSummary = async (month) => {
    try {
      const monthStr = dayjs(month).format('YYYY-MM')
      const response = await apiClient.get(`/attendance/summary?month=${monthStr}`)
      setMonthSummary(response.data)
    } catch (error) {
      console.error('Failed to fetch month summary:', error)
    }
  }

  const handleCheckIn = async () => {
    try {
      const response = await apiClient.post('/attendance/check-in')
      const message = response.data?.message || 'Checked in successfully'
      toast.success(message)
      await fetchTodayAttendance()
      if (employeeViewMode === 'day') {
        fetchAttendanceForDate(employeeSelectedDate)
      } else {
        fetchAttendanceForMonth(employeeSelectedMonth)
        fetchMonthSummary(employeeSelectedMonth)
      }
    } catch (error) {
      console.error('Failed to check in:', error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to check in. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleCheckOut = async () => {
    try {
      const response = await apiClient.post('/attendance/check-out')
      const message = response.data?.message || 'Checked out successfully'
      toast.success(message)
      await fetchTodayAttendance()
      if (employeeViewMode === 'day') {
        fetchAttendanceForDate(employeeSelectedDate)
      } else {
        fetchAttendanceForMonth(employeeSelectedMonth)
        fetchMonthSummary(employeeSelectedMonth)
      }
    } catch (error) {
      console.error('Failed to check out:', error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to check out. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleDateChange = (direction) => {
    const newDate = dayjs(selectedDate)
      .add(direction === 'next' ? 1 : -1, 'day')
      .toDate()
    // Ensure we use local date to avoid timezone issues
    const localDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
    
    // Prevent navigation to future dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newDateNormalized = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
    
    if (newDateNormalized > today) {
      return // Don't allow navigation to future dates
    }
    
    setSelectedDate(localDate)
  }


  const handleEmployeeMonthChange = (direction) => {
    const newMonth = dayjs(employeeSelectedMonth)
      .add(direction === 'next' ? 1 : -1, 'month')
      .toDate()
    setEmployeeSelectedMonth(newMonth)
  }

  // Admin view columns
  const adminColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => formatDate(row.date, 'DD/MM/YYYY'),
      className: 'text-left',
      cellClassName: 'text-left',
    },
    {
      header: 'Employee',
      accessor: 'employeeName',
      cell: (row) => row.employeeName || `${row.firstName || ''} ${row.lastName || ''}` || row.employeeId || '-',
      className: 'text-left',
      cellClassName: 'text-left',
    },
    {
      header: 'Login ID',
      accessor: 'loginId',
      cell: (row) => {
        // Try to get login ID from employee data
        const emp = employees.find(e => e.id === row.employeeId || e.employeeId === row.employeeId)
        return emp?.user?.employeeId || emp?.user?.email || row.employeeId || '-'
      },
      className: 'text-left',
      cellClassName: 'text-left',
    },
    {
      header: 'Check In',
      accessor: 'checkIn',
      cell: (row) => (row.checkIn ? formatTime(row.checkIn) : '-'),
      className: 'text-left',
      cellClassName: 'text-left',
    },
    {
      header: 'Check Out',
      accessor: 'checkOut',
      cell: (row) => (row.checkOut ? formatTime(row.checkOut) : '-'),
      className: 'text-left',
      cellClassName: 'text-left',
    },
    {
      header: 'Work Hours',
      accessor: 'hoursWorked',
      cell: (row) => {
        if (!row.hoursWorked) return '-'
        const hours = Math.floor(row.hoursWorked)
        const minutes = Math.floor((row.hoursWorked - hours) * 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      },
      className: 'text-center',
      cellClassName: 'text-center',
    },
    // {
    //   header: 'Extra hours',
    //   accessor: 'extraHours',
    //   cell: (row) => {
    //     if (!row.extraHours) return '-'
    //     const hours = Math.floor(row.extraHours)
    //     const minutes = Math.floor((row.extraHours - hours) * 60)
    //     return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    //   },
    //   className: 'text-center',
    //   cellClassName: 'text-center',
    // },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={`px-2 py-1 rounded text-xs ${
          row.status === 'present' ? 'bg-green-100 text-green-800' :
          row.status === 'absent' ? 'bg-red-100 text-red-800' :
          row.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {row.status || '-'}
        </span>
      ),
      className: 'text-center',
      cellClassName: 'text-center',
    },
  ]

  // Employee view columns
  const employeeColumns = [
    {
      header: 'Date',
      accessor: 'date',
      cell: (row) => formatDate(row.date, 'DD/MM/YYYY'),
    },
    {
      header: 'Check In',
      accessor: 'checkIn',
      cell: (row) => (row.checkIn ? formatTime(row.checkIn) : '-'),
    },
    {
      header: 'Check Out',
      accessor: 'checkOut',
      cell: (row) => (row.checkOut ? formatTime(row.checkOut) : '-'),
    },
    {
      header: 'Work Hours',
      accessor: 'hoursWorked',
      cell: (row) => {
        if (!row.hoursWorked) return '-'
        const hours = Math.floor(row.hoursWorked)
        const minutes = Math.floor((row.hoursWorked - hours) * 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      },
    },
    {
      header: 'Extra hours',
      accessor: 'extraHours',
      cell: (row) => {
        if (!row.extraHours) return '-'
        const hours = Math.floor(row.extraHours)
        const minutes = Math.floor((row.extraHours - hours) * 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      },
    },
  ]

  // Filter attendance based on search and department
  const filteredAttendance = isAdmin
    ? attendance.filter((record) => {
        // Search filter
        const matchesSearch = !searchTerm || 
          (record.employeeName || `${record.firstName || ''} ${record.lastName || ''}`)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          record.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.email?.toLowerCase().includes(searchTerm.toLowerCase())
        
        // Department filter
        const matchesDepartment = !selectedDepartment || selectedDepartment === 'all' || (() => {
          const emp = employees.find(e => e.id === record.employeeId || e.employeeId === record.employeeId)
          return emp && emp.department === selectedDepartment
        })()
        
        return matchesSearch && matchesDepartment
      })
    : attendance.filter((record) => {
        // Employee search filter
        const matchesSearch = !employeeSearchTerm || 
          (record.employeeName || `${record.firstName || ''} ${record.lastName || ''}`)
            .toLowerCase()
            .includes(employeeSearchTerm.toLowerCase()) ||
          record.employeeId?.toLowerCase().includes(employeeSearchTerm.toLowerCase())
        
        return matchesSearch
      })

  return (
    <div className="space-y-6">
      {/* NOTE Box */}
      {/* <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">NOTE</p>
            <p>
              If the employee's working source is based on the assigned
              attendance.
            </p>
            <p>
              On the Attendance page, users should see a day-wise attendance of
              themselves by default for ongoing month, displaying details based
              on their working time, including breaks.
            </p>
            <p>
              For Admins/Time off officers: They can see attendance of all the
              employees present on the current day.
            </p>
            <p>
              Attendance data serves as the basis for payslip generation.
            </p>
            <p>
              The system should use the generated attendance records to determine
              the total number of payable days for each employee.
            </p>
            <p>
              Any unpaid leave or missing attendance days should automatically
              reduce the number of payable days during payslip computation.
            </p>
          </div>
        </CardContent>
      </Card> */}

      {isAdmin ? (
        /* Admin/HR/Payroll Officer View */
        <Card>
          <CardHeader>
            <CardTitle>Attendances List view For Admin/HR Officer</CardTitle>
            <CardDescription>
              View attendance of all employees for selected day or month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Searchable Employee Dropdown and Department Filter */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 relative min-w-[300px]" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder={selectedEmployeeId ? `${employees.find(e => e.id === selectedEmployeeId)?.firstName || ''} ${employees.find(e => e.id === selectedEmployeeId)?.lastName || ''}` : "Search or select employee..."}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setIsDropdownOpen(true)
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="pl-10 pr-10"
                  />
                  {selectedEmployeeId && (
                    <X
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEmployeeId(null)
                        setSearchTerm('')
                      }}
                    />
                  )}
                </div>
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-auto">
                    <div
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-accent border-b"
                      onClick={() => {
                        setSelectedEmployeeId(null)
                        setSearchTerm('')
                        setIsDropdownOpen(false)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${!selectedEmployeeId ? 'bg-primary border-primary' : 'border-input'}`}>
                          {!selectedEmployeeId && (
                            <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                          )}
                        </div>
                        <span className="font-medium">All Employees</span>
                      </div>
                    </div>
                    {employees
                      .filter((emp) => {
                        if (!searchTerm) return true
                        const searchLower = searchTerm.toLowerCase()
                        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
                        return (
                          fullName.includes(searchLower) ||
                          emp.employeeId?.toLowerCase().includes(searchLower) ||
                          emp.email?.toLowerCase().includes(searchLower)
                        )
                      })
                      .map((emp) => (
                        <div
                          key={emp.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                          onClick={() => {
                            setSelectedEmployeeId(emp.id)
                            setSearchTerm('')
                            setIsDropdownOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${selectedEmployeeId === emp.id ? 'bg-primary border-primary' : 'border-input'}`}>
                              {selectedEmployeeId === emp.id && (
                                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {emp.employeeId} {emp.email && `• ${emp.email}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    {employees.filter((emp) => {
                      if (!searchTerm) return false
                      const searchLower = searchTerm.toLowerCase()
                      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
                      return (
                        fullName.includes(searchLower) ||
                        emp.employeeId?.toLowerCase().includes(searchLower) ||
                        emp.email?.toLowerCase().includes(searchLower)
                      )
                    }).length === 0 && searchTerm && (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No employees found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Select value={selectedDepartment || 'all'} onValueChange={(value) => setSelectedDepartment(value === 'all' ? null : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateChange('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={dayjs(selectedDate).format('YYYY-MM-DD')}
                max={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => {
                  const dateValue = e.target.value
                  if (dateValue) {
                    // Create date in local timezone to avoid timezone shift
                    const [year, month, day] = dateValue.split('-').map(Number)
                    const localDate = new Date(year, month - 1, day)
                    
                    // Prevent selecting future dates
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const selectedDateNormalized = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
                    
                    if (selectedDateNormalized <= today) {
                      setSelectedDate(localDate)
                    }
                  }
                }}
                className="w-40"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateChange('next')}
                disabled={(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const selectedDateNormalized = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
                  return selectedDateNormalized >= today
                })()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <p className="text-sm text-muted-foreground ml-4">
                {dayjs(selectedDate).format('DD, MMMM YYYY')}
              </p>
            </div>

            {/* Table View */}
            <DataTable
              data={filteredAttendance}
              columns={adminColumns}
              searchable={false}
              paginated={false}
            />
          </CardContent>
        </Card>
      ) : (
        /* Employee View */
        <>
          {/* Today's Attendance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Today's Attendance
              </CardTitle>
              <CardDescription>
                Mark your attendance for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayAttendance ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Check In</p>
                      <p className="text-lg font-semibold">
                        {todayAttendance.checkIn
                          ? formatTime(todayAttendance.checkIn)
                          : 'Not checked in'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Check Out</p>
                      <p className="text-lg font-semibold">
                        {todayAttendance.checkOut
                          ? formatTime(todayAttendance.checkOut)
                          : 'Not checked out'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!todayAttendance.checkIn && (
                      <Button onClick={handleCheckIn}>
                        <LogIn className="mr-2 h-4 w-4" />
                        Mark In
                      </Button>
                    )}
                    {todayAttendance.checkIn && !todayAttendance.checkOut && (
                      <Button onClick={handleCheckOut} variant="destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Mark Out
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Button onClick={handleCheckIn}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Mark In
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Employee Attendance View */}
          <Card>
            <CardHeader>
              <CardTitle>My Attendance</CardTitle>
              <CardDescription>
                View your attendance day-wise or month-wise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* View Mode Toggle and Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant={employeeViewMode === 'day' ? 'default' : 'outline'}
                    onClick={() => setEmployeeViewMode('day')}
                  >
                    Day
                  </Button>
                  <Button
                    variant={employeeViewMode === 'month' ? 'default' : 'outline'}
                    onClick={() => setEmployeeViewMode('month')}
                  >
                    Month
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search attendance..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Day View */}
              {employeeViewMode === 'day' ? (
                <>
                  {/* Date Navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newDate = new Date(employeeSelectedDate)
                        newDate.setDate(newDate.getDate() - 1)
                        setEmployeeSelectedDate(newDate)
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input
                      type="date"
                      value={dayjs(employeeSelectedDate).format('YYYY-MM-DD')}
                      max={dayjs().format('YYYY-MM-DD')}
                      onChange={(e) => {
                        const dateValue = e.target.value
                        if (dateValue) {
                          // Create date in local timezone to avoid timezone shift
                          const [year, month, day] = dateValue.split('-').map(Number)
                          const localDate = new Date(year, month - 1, day)
                          
                          // Prevent selecting future dates
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const selectedDateNormalized = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
                          
                          if (selectedDateNormalized <= today) {
                            setEmployeeSelectedDate(localDate)
                          }
                        }
                      }}
                      className="w-40"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newDate = new Date(employeeSelectedDate)
                        newDate.setDate(newDate.getDate() + 1)
                        
                        // Prevent navigation to future dates
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const newDateNormalized = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate())
                        
                        if (newDateNormalized <= today) {
                          setEmployeeSelectedDate(newDate)
                        }
                      }}
                      disabled={(() => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const selectedDateNormalized = new Date(employeeSelectedDate.getFullYear(), employeeSelectedDate.getMonth(), employeeSelectedDate.getDate())
                        return selectedDateNormalized >= today
                      })()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <p className="text-sm text-muted-foreground ml-4">
                      {dayjs(employeeSelectedDate).format('DD, MMMM YYYY')}
                    </p>
                  </div>

                  {/* Day Attendance Table */}
                  <DataTable
                    data={attendance}
                    columns={employeeColumns}
                    searchable={false}
                    paginated={false}
                  />
                </>
              ) : (
                <>
                  {/* Month Navigation */}
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newMonth = new Date(employeeSelectedMonth)
                        newMonth.setMonth(newMonth.getMonth() - 1)
                        setEmployeeSelectedMonth(newMonth)
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input
                      type="month"
                      value={dayjs(employeeSelectedMonth).format('YYYY-MM')}
                      max={dayjs().format('YYYY-MM')}
                      onChange={(e) => {
                        const monthValue = e.target.value
                        if (monthValue) {
                          const [year, month] = monthValue.split('-').map(Number)
                          const selectedMonth = new Date(year, month - 1, 1)
                          
                          // Prevent selecting future months
                          const today = new Date()
                          const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                          
                          if (selectedMonth <= currentMonth) {
                            setEmployeeSelectedMonth(selectedMonth)
                          }
                        }
                      }}
                      className="w-40"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newMonth = new Date(employeeSelectedMonth)
                        newMonth.setMonth(newMonth.getMonth() + 1)
                        
                        // Prevent navigation to future months
                        const today = new Date()
                        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                        const newMonthNormalized = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1)
                        
                        if (newMonthNormalized <= currentMonth) {
                          setEmployeeSelectedMonth(newMonth)
                        }
                      }}
                      disabled={(() => {
                        const today = new Date()
                        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                        const selectedMonthNormalized = new Date(employeeSelectedMonth.getFullYear(), employeeSelectedMonth.getMonth(), 1)
                        return selectedMonthNormalized >= currentMonth
                      })()}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Summary Metrics */}
                  {monthSummary && (
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">
                            Count of days present
                          </p>
                          <p className="text-2xl font-bold">
                            {monthSummary.daysPresent || 0}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">
                            Leaves count
                          </p>
                          <p className="text-2xl font-bold">
                            {monthSummary.leavesCount || 0}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">
                            Total working days
                          </p>
                          <p className="text-2xl font-bold">
                            {monthSummary.totalWorkingDays || 0}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {dayjs(employeeSelectedMonth).format('MMMM YYYY')}
                  </p>

                  {/* Month Attendance Calendar */}
                  <AttendanceCalendar
                    month={employeeSelectedMonth}
                    attendance={attendance}
                    selectedEmployeeId={null}
                    employees={[]}
                    searchTerm=""
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/**
 * Attendance Calendar Component
 * Displays a month calendar with attendance status for each day
 */
function AttendanceCalendar({ month, attendance, selectedEmployeeId, employees, searchTerm }) {
  // Get the first day of the month and the number of days
  const startOfMonth = dayjs(month).startOf('month')
  const endOfMonth = dayjs(month).endOf('month')
  const daysInMonth = endOfMonth.date()
  
  // Get the first day of the week (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = startOfMonth.day()
  
  // Filter attendance based on search term if provided
  const filteredAttendance = searchTerm
    ? attendance.filter((att) => {
        const searchLower = searchTerm.toLowerCase()
        const employeeName = att.employeeName || `${att.firstName || ''} ${att.lastName || ''}` || ''
        return (
          employeeName.toLowerCase().includes(searchLower) ||
          att.employeeId?.toLowerCase().includes(searchLower) ||
          att.email?.toLowerCase().includes(searchLower)
        )
      })
    : attendance
  
  // Create a map of attendance by date
  // If multiple employees match search, group by date
  const attendanceByDate = {}
  filteredAttendance.forEach((att) => {
    const dateStr = dayjs(att.date).format('YYYY-MM-DD')
    if (!attendanceByDate[dateStr]) {
      attendanceByDate[dateStr] = []
    }
    attendanceByDate[dateStr].push(att)
  })
  
  // Get selected employee name
  const selectedEmployee = selectedEmployeeId 
    ? employees.find(emp => emp.id === selectedEmployeeId)
    : null
  
  // Generate calendar days
  const calendarDays = []
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null)
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = startOfMonth.date(day)
    const dateStr = date.format('YYYY-MM-DD')
    const atts = attendanceByDate[dateStr] || []
    // If multiple employees match, show the first one or aggregate
    // For now, show the first matching employee's attendance
    const att = atts.length > 0 ? atts[0] : null
    calendarDays.push({
      day,
      date: date.toDate(),
      dateStr,
      attendance: att,
      allAttendance: atts, // Store all matching attendance for this date
    })
  }
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'half_day':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-50 text-gray-500 border-gray-200'
    }
  }
  
  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'present':
        return 'Present'
      case 'absent':
        return 'Absent'
      case 'late':
        return 'Late'
      case 'half_day':
        return 'Half Day'
      default:
        return 'No Record'
    }
  }
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  return (
    <div className="space-y-2">
      {(selectedEmployee || searchTerm) && (
        <div className="text-[10px] text-muted-foreground">
          {selectedEmployee ? (
            <>Showing attendance for: <span className="font-semibold">{selectedEmployee.firstName} {selectedEmployee.lastName}</span></>
          ) : searchTerm ? (
            <>Showing results for: <span className="font-semibold">"{searchTerm}"</span> ({filteredAttendance.length} records)</>
          ) : null}
        </div>
      )}
      <div className="border rounded-lg overflow-hidden max-w-3xl">
        <div className="grid grid-cols-7 bg-muted">
          {weekDays.map((day) => (
            <div key={day} className="p-1 text-center text-[10px] font-semibold border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((dayData, index) => {
            if (!dayData) {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square border-r border-b last:border-r-0 bg-gray-50 min-h-[45px]"
                />
              )
            }
            
            const { day, dateStr, attendance: att, allAttendance } = dayData
            const isToday = dayjs(dateStr).isSame(dayjs(), 'day')
            const status = att?.status || null
            const hasMultipleMatches = allAttendance && allAttendance.length > 1
            
            return (
              <div
                key={dateStr}
                className={`aspect-square border-r border-b last:border-r-0 p-1 flex flex-col min-h-[45px] ${
                  isToday ? 'ring-1 ring-primary' : ''
                } ${status ? getStatusColor(status) : 'bg-white hover:bg-gray-50'}`}
                title={hasMultipleMatches ? `${allAttendance.length} employees match` : att?.employeeName || ''}
              >
                <div className={`text-[10px] font-semibold mb-0.5 ${isToday ? 'text-primary' : ''}`}>
                  {day}
                </div>
                {att && (
                  <div className="flex-1 flex flex-col justify-center">
                    <div className={`text-[8px] font-medium leading-tight ${status ? '' : 'text-gray-500'}`}>
                      {getStatusLabel(status)}
                    </div>
                    {hasMultipleMatches && (
                      <div className="text-[7px] text-muted-foreground mt-0.5 leading-tight">
                        +{allAttendance.length - 1} more
                      </div>
                    )}
                    {att.checkIn && (
                      <div className="text-[7px] text-muted-foreground mt-0.5 leading-tight">
                        {formatTime(att.checkIn)}
                      </div>
                    )}
                    {att.checkOut && (
                      <div className="text-[7px] text-muted-foreground leading-tight">
                        {formatTime(att.checkOut)}
                      </div>
                    )}
                    {att.hoursWorked && (
                      <div className="text-[7px] text-muted-foreground mt-0.5 leading-tight">
                        {Math.floor(att.hoursWorked)}h {Math.floor((att.hoursWorked % 1) * 60)}m
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300"></div>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300"></div>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300"></div>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-orange-100 border border-orange-300"></div>
          <span>Half Day</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-gray-50 border border-gray-200"></div>
          <span>No Record</span>
        </div>
      </div>
    </div>
  )
}
