import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Users, Clock, Calendar, DollarSign, TrendingUp, Building2, Activity, BarChart3, Shield, Zap, FileText, Settings } from 'lucide-react'
import apiClient from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import { Skeleton } from '../components/ui/skeleton'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts'
import { useAuthStore } from '../store/auth'
import { FeaturesSectionWithHoverEffects } from '../components/ui/feature-section-with-hover-effects'

/**
 * Dashboard page component
 */
export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = ['admin', 'hr'].includes(user?.role)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats')
      setStats(response.data?.data || response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back!</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Calculate employee-specific stats
  const employeeAttendanceRate = stats?.attendanceLast7Days && stats.attendanceLast7Days.length > 0
    ? Math.round(
        (stats.attendanceLast7Days.reduce((sum, day) => sum + (day.present > 0 ? 1 : 0), 0) /
          stats.attendanceLast7Days.length) * 100
      )
    : 0

  const statCards = isAdmin
    ? [
        {
          title: 'Total Employees',
          value: stats?.totalEmployees || 0,
          icon: Users,
          description: 'Active employees',
          trend: '+12%',
        },
        {
          title: 'Present Today',
          value: stats?.presentToday || 0,
          icon: Clock,
          description: 'Employees at work',
          trend: '+5%',
        },
        {
          title: 'Pending Leaves',
          value: stats?.pendingLeaves || 0,
          icon: Calendar,
          description: 'Awaiting approval',
          trend: '-3%',
        },
        {
          title: 'Last Payrun',
          value: stats?.lastPayrunAmount
            ? formatCurrency(stats.lastPayrunAmount)
            : '-',
          icon: DollarSign,
          description: stats?.lastPayrunDate
            ? formatDate(stats.lastPayrunDate)
            : 'No payrun yet',
          trend: '+8%',
        },
      ]
    : [
        {
          title: 'My Attendance Rate',
          value: `${employeeAttendanceRate}%`,
          icon: Activity,
          description: 'Last 7 days',
          trend: '+5%',
        },
        {
          title: 'Present Today',
          value: stats?.presentToday || 0,
          icon: Clock,
          description: stats?.presentToday > 0 ? 'Checked in' : 'Not checked in',
          trend: '+5%',
        },
        {
          title: 'Pending Leaves',
          value: stats?.pendingLeaves || 0,
          icon: Calendar,
          description: 'Awaiting approval',
          trend: '-3%',
        },
        {
          title: 'Total Leaves',
          value: stats?.leaveStats
            ? stats.leaveStats.reduce((sum, stat) => sum + stat.count, 0)
            : 0,
          icon: Calendar,
          description: 'All time',
          trend: '+2%',
        },
      ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {stat.trend} from last month
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

   

      {/* Charts and Analytics Section */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          {isAdmin ? (
            <>
              {/* Admin Charts */}
              {/* Attendance Trend - Last 7 Days */}
              {stats.attendanceLast7Days && stats.attendanceLast7Days.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Trend</CardTitle>
                    <CardDescription>Last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.attendanceLast7Days}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill="#22c55e" name="Present" />
                        <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                        <Bar dataKey="late" fill="#f59e0b" name="Late" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Department Distribution */}
              {stats.departmentStats && stats.departmentStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Department Distribution</CardTitle>
                    <CardDescription>Employee count by department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.departmentStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ department, count }) => `${department}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {stats.departmentStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Monthly Attendance Trend */}
              {stats.monthlyAttendance && stats.monthlyAttendance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Attendance</CardTitle>
                    <CardDescription>Last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.monthlyAttendance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Attendance Count" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Leave Statistics */}
              {stats.leaveStats && stats.leaveStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Statistics</CardTitle>
                    <CardDescription>Leave status distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.leaveStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8b5cf6" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              {/* Employee Charts */}
              {/* My Attendance Trend - Last 7 Days */}
              {stats.attendanceLast7Days && stats.attendanceLast7Days.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>My Attendance Trend</CardTitle>
                    <CardDescription>Last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.attendanceLast7Days}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill="#22c55e" name="Present" />
                        <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                        <Bar dataKey="late" fill="#f59e0b" name="Late" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Attendance Rate Circle */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Rate</CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadialBarChart
                        innerRadius="60%"
                        outerRadius="90%"
                        data={[
                          {
                            name: 'Attendance',
                            value: employeeAttendanceRate,
                            fill: employeeAttendanceRate >= 80 ? '#22c55e' : employeeAttendanceRate >= 60 ? '#f59e0b' : '#ef4444',
                          },
                        ]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          minAngle={15}
                          background
                          clockWise
                          dataKey="value"
                        />
                        <Tooltip
                          formatter={(value) => [`${value}%`, 'Attendance Rate']}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{employeeAttendanceRate}%</div>
                        <div className="text-sm text-muted-foreground mt-1">Attendance</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Attendance Trend */}
              {stats.monthlyAttendance && stats.monthlyAttendance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>My Monthly Attendance</CardTitle>
                    <CardDescription>Last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.monthlyAttendance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Attendance Count" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Leave Status Pie Chart */}
              {stats.leaveStats && stats.leaveStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>My Leave Status</CardTitle>
                    <CardDescription>Leave distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.leaveStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ status, count }) => `${status}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {stats.leaveStats.map((entry, index) => {
                            const colors = {
                              approved: '#22c55e',
                              pending: '#f59e0b',
                              rejected: '#ef4444',
                              cancelled: '#6b7280',
                            }
                            return (
                              <Cell key={`cell-${index}`} fill={colors[entry.status] || '#3b82f6'} />
                            )
                          })}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Additional Analytics Cards - Admin Only */}
      {isAdmin && stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.departmentStats?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Active departments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalEmployees > 0
                  ? Math.round((stats.presentToday / stats.totalEmployees) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Today's attendance rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leave Approval Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.leaveStats && stats.leaveStats.length > 0
                  ? Math.round(
                      ((stats.leaveStats.find((s) => s.status === 'approved')?.count || 0) /
                        stats.leaveStats.reduce((sum, s) => sum + s.count, 0)) *
                        100
                    )
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Overall approval rate</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

