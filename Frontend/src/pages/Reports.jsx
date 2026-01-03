import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Printer, Download } from 'lucide-react'
import apiClient from '../lib/api'
import { formatCurrency, formatDate } from '../lib/format'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const reportSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  year: z.string().min(1, 'Year is required'),
})

/**
 * Reports page component
 * Accessible only to Admin and Payroll Officer
 */
export default function Reports() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [reportData, setReportData] = useState(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      year: new Date().getFullYear().toString(),
    },
  })

  const employeeId = watch('employeeId')
  const year = watch('year')

  useEffect(() => {
    fetchEmployees()
    // Set the default year in the form
    setValue('year', new Date().getFullYear().toString())
  }, [setValue])

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees')
      setEmployees(response.data)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const response = await apiClient.get(
        `/reports/salary-statement?employeeId=${data.employeeId}&year=${data.year}`
      )
      setReportData(response.data)
      setSelectedEmployee(
        employees.find((emp) => emp.id === data.employeeId)
      )
      setIsViewerOpen(true)
      toast.success('Report generated successfully')
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    if (!employeeId || !year) {
      toast.error('Please select employee and year first')
      return
    }
    try {
      const response = await apiClient.get(
        `/reports/salary-statement/download?employeeId=${employeeId}&year=${year}`,
        {
          responseType: 'blob',
        }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `salary-statement-${selectedEmployee?.employeeId}-${year}.pdf`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Report downloaded successfully')
    } catch (error) {
      console.error('Failed to download report:', error)
      toast.error('Failed to download report')
    }
  }

  // Generate years list (current year and past 5 years)
  const years = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return year.toString()
  })

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            The Reports menu is accessible only to users with Admin or Payroll
            Officer access rights
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            To print the Salary Statement report, select the employee and the
            year for which you want to generate the report
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>
              Select report type, employee, and year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select defaultValue="salary-statement">
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary-statement">
                        Salary Statement Report
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="employeeId">Employee Name</Label>
                  <Select
                    value={employeeId || ''}
                    onValueChange={(value) => {
                      setValue('employeeId', value)
                      setSelectedEmployee(
                        employees.find((emp) => emp.id === value)
                      )
                    }}
                    aria-invalid={errors.employeeId ? 'true' : 'false'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} (
                          {employee.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.employeeId && (
                    <p className="text-sm text-destructive">
                      {errors.employeeId.message}
                    </p>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select
                    value={year || ''}
                    onValueChange={(value) => {
                      setValue('year', value)
                      setSelectedYear(value)
                    }}
                    aria-invalid={errors.year ? 'true' : 'false'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.year && (
                    <p className="text-sm text-destructive">
                      {errors.year.message}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={loading}>
                  <Printer className="mr-2 h-4 w-4" />
                  {loading ? 'Generating...' : 'Print'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Salary Statement Report Viewer */}
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:overflow-visible">
            <DialogHeader>
              <DialogTitle>Salary Statement Report Print</DialogTitle>
              <DialogDescription>
                Review and print the salary statement report
              </DialogDescription>
            </DialogHeader>
            {reportData && selectedEmployee && (
              <div className="space-y-4 print:p-8">
                <div className="flex justify-end gap-2 print:hidden">
                  {/* <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button> */}
                  <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>

                <Card className="print:border-0 print:shadow-none" id="salary-statement-report">
                  <CardHeader className="border-b print:border-b-2">
                    <div className="text-center">
                      <CardTitle className="text-2xl mb-2">
                        [Company]
                      </CardTitle>
                      <p className="text-lg font-semibold">
                        Salary Statement Report
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-6">
                    {/* Employee Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Employee Name
                        </Label>
                        <p className="font-semibold">
                          {selectedEmployee.firstName}{' '}
                          {selectedEmployee.lastName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Designation
                        </Label>
                        <p className="font-semibold">
                          {selectedEmployee.position}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Date Of Joining
                        </Label>
                        <p className="font-semibold">
                          {formatDate(selectedEmployee.hireDate)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          Salary Effective From
                        </Label>
                        <p className="font-semibold">
                          {formatDate(selectedEmployee.hireDate)}
                        </p>
                      </div>
                    </div>

                    {/* Salary Components Table */}
                    <div>
                      <h3 className="font-semibold mb-4">Salary Components</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-semibold">
                                Salary Components
                              </th>
                              <th className="text-right p-3 font-semibold">
                                Monthly Amount
                              </th>
                              <th className="text-right p-3 font-semibold">
                                Yearly Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Earnings */}
                            <tr>
                              <td
                                colSpan="3"
                                className="p-2 font-semibold bg-muted/50"
                              >
                                Earnings
                              </td>
                            </tr>
                            {reportData.earnings?.map((earning, index) => (
                              <tr key={index} className="border-t">
                                <td className="p-3">{earning.name}</td>
                                <td className="p-3 text-right">
                                  {formatCurrency(earning.monthlyAmount)}
                                </td>
                                <td className="p-3 text-right">
                                  {formatCurrency(earning.yearlyAmount)}
                                </td>
                              </tr>
                            ))}
                            {/* Deductions */}
                            <tr>
                              <td
                                colSpan="3"
                                className="p-2 font-semibold bg-muted/50 border-t"
                              >
                                Deduction
                              </td>
                            </tr>
                            {reportData.deductions?.map((deduction, index) => (
                              <tr key={index} className="border-t">
                                <td className="p-3">{deduction.name}</td>
                                <td className="p-3 text-right">
                                  {formatCurrency(deduction.monthlyAmount)}
                                </td>
                                <td className="p-3 text-right">
                                  {formatCurrency(deduction.yearlyAmount)}
                                </td>
                              </tr>
                            ))}
                            {/* Net Salary */}
                            <tr className="border-t-2 font-semibold">
                              <td className="p-3">Net Salary</td>
                              <td className="p-3 text-right">
                                {formatCurrency(reportData.netSalary?.monthly || 0)}
                              </td>
                              <td className="p-3 text-right">
                                {formatCurrency(reportData.netSalary?.yearly || 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  )
}

