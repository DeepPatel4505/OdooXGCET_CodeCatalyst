import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Save } from 'lucide-react'
import apiClient from '../lib/api'
import { toast } from 'sonner'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuthStore } from '../store/auth'


export default function UserSettings() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [modules] = useState([
    'Employees',
    'Attendance',
    'Time Off',
    'Payroll',
    'Reports',
  ])
  const [userRoles, setUserRoles] = useState({}) // { module: role }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchUserRoles(selectedUser.id)
    }
  }, [selectedUser])

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/employees')
      // Get unique users from employees
      const userMap = new Map()
      response.data.forEach((emp) => {
        if (emp.user && !userMap.has(emp.user.id)) {
          userMap.set(emp.user.id, {
            id: emp.user.id,
            firstName: emp.user.firstName,
            lastName: emp.user.lastName,
            email: emp.user.email,
            employeeId: emp.user.employeeId,
            role: emp.user.role,
          })
        }
      })
      const usersList = Array.from(userMap.values())
      setUsers(usersList)
      if (usersList.length > 0 && !selectedUser) {
        setSelectedUser(usersList[0])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRoles = async (userId) => {
    try {
      const response = await apiClient.get(`/user-settings/roles/${userId}`)
      setUserRoles(response.data || {})
    } catch (error) {
      console.error('Failed to fetch user roles:', error)
      // Initialize with empty roles if endpoint doesn't exist yet
      setUserRoles({})
    }
  }

  const handleRoleChange = (module, role) => {
    setUserRoles((prev) => ({
      ...prev,
      [module]: role,
    }))
  }

  const handleSave = async () => {
    if (!selectedUser) {
      toast.error('Please select a user first')
      return
    }

    try {
      await apiClient.put(`/user-settings/roles/${selectedUser.id}`, {
        moduleRoles: userRoles,
      })
      toast.success('User access rights updated successfully')
    } catch (error) {
      console.error('Failed to save user roles:', error)
      toast.error('Failed to save user access rights')
    }
  }

  const getRoleForModule = (module) => {
    return userRoles[module] || selectedUser?.role || 'employee'
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Setting</h1>
          <p className="text-muted-foreground mt-2">
            In the Admin Settings, the administrator can assign user access
            rights based on each user's role.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Access rights can be configured on a module basis, allowing specific
            permissions for each module.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Access Rights</CardTitle>
            <CardDescription>
              Select user access rights as per their role and responsibilities.
              These access rights define what users are allowed to access and
              what they are restricted from accessing.
            </CardDescription>
            <CardDescription className="mt-2 font-medium">
              Employee / Admin / HR Officer / Payroll Officer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* User Selection */}
              <div className="mb-6">
                <Label htmlFor="user-select" className="mb-2 block">
                  Select User
                </Label>
                <Select
                  value={selectedUser?.id || ''}
                  onValueChange={(userId) => {
                    const user = users.find((u) => u.id === userId)
                    setSelectedUser(user)
                  }}
                >
                  <SelectTrigger id="user-select" className="w-full max-w-md">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <>
                  {/* User Information */}
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          User Name
                        </Label>
                        <p className="font-semibold">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Login ID
                        </Label>
                        <p className="font-semibold">
                          {selectedUser.employeeId || selectedUser.email}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Email
                        </Label>
                        <p className="font-semibold">{selectedUser.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Role
                        </Label>
                        <p className="font-semibold capitalize">
                          {selectedUser.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Module Access Rights Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-48">Module</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modules.map((module) => (
                          <TableRow key={module}>
                            <TableCell className="font-medium">
                              {module}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={getRoleForModule(module)}
                                onValueChange={(value) =>
                                  handleRoleChange(module, value)
                                }
                              >
                                <SelectTrigger className="w-full max-w-xs">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="employee">
                                    Employee
                                  </SelectItem>
                                  <SelectItem value="hr">HR Officer</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="none">No Access</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </>
              )}

              {!selectedUser && users.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found. Please create users first.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}

